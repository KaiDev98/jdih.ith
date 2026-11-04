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
    return this.repo.transaction(async (db) => {
      const target = await this.requests.resource(db, sumber, resourceId);
      if (!target) throw new NotFoundException();
      cekPemilikAtauSuperadmin(actor, target.createdBy);
      if (!target.versionId) throw new ConflictException('Dokumen belum mempunyai versi.');
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
    // Izin keputusan diperiksa kembali di server sesuai tindakan dan koleksinya.
    cekIzin(actor, [
      initial.sumber === 'TEMPLATE'
        ? 'templates.manage'
        : initial.jenis === 'WITHDRAW'
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
        (target?.versionId !== request.versionId ||
          (request.jenis === 'WITHDRAW' && !target.currentId))
      )
        throw new ConflictException(
          'Versi dokumen telah berubah atau tidak tersedia. Tolak permintaan ini dan minta Admin mengajukan ulang.',
        );
      const status = data.keputusan === 'APPROVE' ? 'APPROVED' : 'DECLINED';
      await this.requests.decide(db, id, actor.id, status, data.catatan);
      let files: string[] = [];
      if (data.keputusan === 'APPROVE') {
        if (request.sumber === 'DOCUMENT') {
          if (request.jenis === 'WITHDRAW')
            await this.core.withdrawInTransaction(db, actor, request.resourceId, data.catatan);
          else files = await this.documents.hapusDalamTransaksi(db, actor, request.resourceId);
        } else if (request.jenis === 'WITHDRAW')
          await this.templates.withdrawInTransaction(db, actor, request.resourceId, data.catatan);
        else await this.templates.removeInTransaction(db, actor, request.resourceId);
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
