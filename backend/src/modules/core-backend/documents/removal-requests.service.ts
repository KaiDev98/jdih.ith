import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  skemaDaftarPermintaanPenghapusan,
  skemaKeputusanPenghapusan,
  skemaPermintaanPenghapusan,
  type PenggunaAktif,
  type SumberPermintaanPenghapusan,
} from '@jdih/shared';
import {
  cekBacaPanel,
  cekIzin,
  cekPemilikAtauSuperadmin,
  cekSuperadmin,
} from '../../identity/security.js';
import { AuditService } from '../../identity/audit.service.js';
import { CoreBackendRepository } from '../core-backend.repository.js';
import { CoreBackendService } from '../core-backend.service.js';
import { LetterTemplatesService } from '../templates/letter-templates.service.js';
import { DokumenAdminService } from './dokumen-admin.service.js';
import { RemovalRequestsRepository } from './removal-requests.repository.js';

@Injectable()
export class RemovalRequestsService {
  constructor(
    private readonly repo: CoreBackendRepository,
    private readonly requests: RemovalRequestsRepository,
    private readonly audit: AuditService,
    private readonly documents: DokumenAdminService,
    private readonly core: CoreBackendService,
    private readonly templates: LetterTemplatesService,
  ) {}

  list(actor: PenggunaAktif, raw: unknown) {
    cekBacaPanel(actor, 'documents.read_admin');
    return this.requests.list(
      actor.peran.includes('SUPERADMIN') ? null : actor.id,
      skemaDaftarPermintaanPenghapusan.parse(raw),
    );
  }
  async create(
    actor: PenggunaAktif,
    sumber: SumberPermintaanPenghapusan,
    resourceId: string,
    raw: unknown,
  ) {
    cekBacaPanel(actor, 'documents.read_admin');
    // Pengelola tertinggi memakai tindakan langsung yang sudah memiliki konfirmasi.
    if (!actor.peran.includes('ADMIN') || actor.peran.includes('SUPERADMIN'))
      throw new ForbiddenException('Permintaan ini khusus Admin pemilik.');
    cekIzin(actor, [sumber === 'DOCUMENT' ? 'documents.edit' : 'templates.manage']);
    const data = skemaPermintaanPenghapusan.parse(raw);
    if (sumber === 'TEMPLATE' && data.jenis !== 'DELETE')
      throw new ConflictException('Format Persuratan hanya dapat dimintakan penghapusan. Muat ulang halaman.');
    if (data.jenis === 'WITHDRAW')
      throw new ConflictException('Gunakan Minta Pencabutan. Muat ulang halaman.');
    return this.repo.transaction(async (db) => {
      const target = await this.requests.resource(db, sumber, resourceId);
      if (!target) throw new NotFoundException();
      cekPemilikAtauSuperadmin(actor, target.createdBy);
      if (!target.versionId) throw new ConflictException('Dokumen belum mempunyai versi.');
      if (data.jenis === 'DELETE_VERSION') {
        const version = await this.documents.versiLama(db, resourceId, data.versionId!);
        cekPemilikAtauSuperadmin(actor, version.created_by);
        target.versionId = String(version.id);
        target.judul = `${version.judul} · Versi ${String(version.nomor_versi)}`;
      }
      if (data.jenis === 'REVOKE' && (!target.currentId || target.currentStatus !== (sumber === 'TEMPLATE' ? 'ACTIVE' : 'TERBIT') || target.statusHukum === 'DICABUT'))
        throw new ConflictException('Hanya dokumen atau format terbit yang belum dicabut dapat dimintakan pencabutan.');
      if (data.jenis === 'WITHDRAW' && !target.currentId)
        throw new ConflictException('Dokumen tidak sedang terbit.');
      if (await this.requests.pending(db, sumber, resourceId))
        throw new ConflictException('Masih ada permintaan yang menunggu keputusan Superadmin.');
      const id = await this.requests.create(db, actor.id, sumber, target, data.jenis, data.alasan);
      await this.audit.recordDomain(
        {
          module: 'documents',
          action: 'REQUEST_REMOVAL',
          entityType: 'permintaan_penghapusan',
          entityId: id,
          actorId: actor.id,
          after: { targetId: resourceId, jalur: sumber, status: data.jenis, reason: data.alasan },
        },
        db,
      );
      return { id, status: 'PENDING' };
    });
  }
  async decide(actor: PenggunaAktif, id: string, raw: unknown) {
    cekSuperadmin(actor);
    const data = skemaKeputusanPenghapusan.parse(raw);
    const initial = await this.requests.get(id);
    if (!initial) throw new NotFoundException();
    if (initial.sumber === 'TEMPLATE' && initial.jenis === 'DELETE_VERSION')
      throw new ConflictException('Penghapusan versi lama hanya tersedia untuk dokumen hukum dan SOP.');
    // Izin keputusan diperiksa kembali di server sesuai tindakan dan koleksinya.
    cekIzin(actor, [
      initial.sumber === 'TEMPLATE'
        ? 'templates.manage'
        : !['DELETE', 'DELETE_VERSION'].includes(initial.jenis)
          ? 'workflow.withdraw'
          : 'documents.delete',
    ]);
    const result = await this.repo.transaction(async (db) => {
      // Induk selalu dikunci lebih dulu, seperti unggah, publish dan hapus langsung.
      const target = await this.requests.resource(db, initial.sumber, initial.resourceId);
      const request = await this.requests.get(id, db);
      if (!request) throw new NotFoundException();
      if (request.status !== 'PENDING') throw new ConflictException('Permintaan sudah diproses.');
      if (
        data.keputusan === 'APPROVE' &&
        request.jenis !== 'DELETE_VERSION' &&
        (target?.versionId !== request.versionId ||
          (request.jenis !== 'DELETE' && !target.currentId))
      )
        throw new ConflictException(
          'Versi dokumen telah berubah atau tidak tersedia. Tolak permintaan ini dan minta Admin mengajukan ulang.',
        );
      const status = data.keputusan === 'APPROVE' ? 'APPROVED' : 'DECLINED';
      await this.requests.decide(db, id, actor.id, status, data.catatan);
      let files: string[] = [];
      if (data.keputusan === 'APPROVE') {
        if (request.sumber === 'DOCUMENT') {
          if (request.jenis === 'REVOKE')
            await this.core.revokeInTransaction(db, actor, request.resourceId, request.versionId!, data.catatan || request.alasan, id);
          else if (request.jenis === 'WITHDRAW')
            await this.core.withdrawInTransaction(db, actor, request.resourceId, data.catatan || request.alasan, id);
          else if (request.jenis === 'DELETE_VERSION')
            files = await this.documents.hapusVersiLamaDalamTransaksi(db, actor, request.resourceId, request.versionId!, id);
          else files = await this.documents.hapusDalamTransaksi(db, actor, request.resourceId, request.versionId!, id);
        } else if (request.jenis === 'REVOKE')
          await this.templates.revokeInTransaction(db, actor, request.resourceId, request.versionId!, data.catatan || request.alasan, id);
        else if (request.jenis === 'WITHDRAW')
          await this.templates.withdrawInTransaction(db, actor, request.resourceId, data.catatan || request.alasan, id);
        else await this.templates.removeInTransaction(db, actor, request.resourceId, id);
      }
      await this.audit.recordDomain(
        {
          module: 'documents',
          action: `REMOVAL_${status}`,
          entityType: 'permintaan_penghapusan',
          entityId: id,
          actorId: actor.id,
          before: { status: 'PENDING' },
          after: { status, targetId: request.resourceId, reason: data.catatan },
        },
        db,
      );
      return { files, status };
    });
    await this.documents.bersihkanBerkas(result.files);
    return { id, status: result.status };
  }
}
