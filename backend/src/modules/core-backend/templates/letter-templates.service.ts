import { createReadStream } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import type { PenggunaAktif } from '@jdih/shared';
import {
  skemaKeputusanTemplate,
  skemaHapusTemplate,
  skemaBuatVersiTemplate,
  skemaDaftarTemplateAuthorized,
  skemaDaftarTemplatePublik,
  skemaUnggahTemplateAwal,
  skemaCariTemplate,
  skemaAntreanTemplate,
} from '@jdih/shared';
import {
  cekBacaPanel,
  cekIzin,
  cekPemilikAtauSuperadmin,
  cekSuperadmin,
} from '../../identity/security.js';
import { AuditService } from '../../identity/audit.service.js';
import { CoreBackendRepository } from '../core-backend.repository.js';
import { StorageService } from '../storage/storage.service.js';
import {
  bisaDipratinjau,
  safeOriginalName,
  validateIncomingFile,
} from '../storage/file-validation.js';
import type { KonfigurasiApp } from '../../../config/configuration.js';

interface IncomingFile {
  path: string;
  originalname: string;
}
interface TemplateFile extends RowDataPacket {
  storage_key: string;
  nama_asli: string;
  mime_type: string;
  size_bytes: string;
  checksum: Buffer;
  tingkat_akses: 'PUBLIK' | 'INTERNAL';
  id: string;
  template_surat_id: string;
}

export type TemplateDownloadTerotorisasi = TemplateFile;

@Injectable()
export class LetterTemplatesService {
  constructor(
    private readonly repo: CoreBackendRepository,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
    private readonly config: ConfigService<KonfigurasiApp, true>,
  ) {}

  private async validate(incoming: IncomingFile) {
    return validateIncomingFile(
      incoming.path,
      incoming.originalname,
      'template',
      this.config.get('penyimpanan', { infer: true }).ukuranMaksimumBita,
    );
  }

  private cekPengelola(actor: PenggunaAktif) {
    if (!actor.peran.some((peran) => peran === 'ADMIN' || peran === 'SUPERADMIN'))
      throw new ForbiddenException();
    cekIzin(actor, ['templates.manage']);
  }

  async create(actor: PenggunaAktif, incoming: IncomingFile, raw: unknown) {
    this.cekPengelola(actor);
    const b = skemaUnggahTemplateAwal.parse(raw);
    const valid = await this.validate(incoming);
    const staged = await this.storage.stage(createReadStream(incoming.path));
    try {
      return await this.repo.transaction(async (db) => {
        let slug = b.slug;
        // UNIQUE menjadi penentu akhir, termasuk untuk unggahan serentak dan slug
        // format yang sudah dihapus. Alamat lama tidak dialihkan ke format baru.
        for (let attempt = 0; attempt < 5; attempt++) {
          try {
            await this.repo.write(
              db,
              'INSERT INTO template_surat(slug,nama,deskripsi,created_by,aktif) VALUES(?,?,?,?,?)',
              [slug, b.nama, b.deskripsi ?? null, actor.id, 0],
            );
            break;
          } catch (error) {
            const duplicate = error as { code?: string; sqlMessage?: string } | null;
            if (duplicate?.code !== 'ER_DUP_ENTRY' || !/\buq_template_slug\b/.test(duplicate.sqlMessage ?? ''))
              throw error;
            if (b.modeSlug === 'manual')
              throw new ConflictException('Alamat format sudah digunakan. Ganti Slug pada bagian Alamat dan deskripsi, atau pilih Ikuti nama lagi.');
            if (attempt === 4)
              throw new ConflictException('Alamat otomatis belum dapat dibuat. Coba unggah kembali.');
            slug = `${b.slug.slice(0, 154).replace(/-+$/, '')}-${randomUUID()}`;
          }
        }
        const templateId = await this.repo.id(db);
        const status = 'PENDING_REVIEW' as const;
        const versionId = await this.insertVersion(
          db,
          templateId,
          1,
          b.tingkatAkses,
          status,
          valid,
          staged,
          actor.id,
        );
        await this.audit.recordDomain(
          {
            module: 'letter-templates',
            action: 'CREATE',
            entityType: 'template_surat',
            entityId: templateId,
            actorId: actor.id,
            after: { slug, nama: b.nama, status: 'PENDING_REVIEW' as const },
          },
          db,
        );
        await this.audit.recordDomain(
          {
            module: 'letter-templates',
            action: 'CREATE_VERSION',
            entityType: 'template_surat_versi',
            entityId: versionId,
            actorId: actor.id,
            after: { nomorVersi: 1, tingkatAkses: b.tingkatAkses, status },
          },
          db,
        );
        await this.storage.finalize(staged);
        return { id: templateId, versionId, slug, nomorVersi: 1, status };
      });
    } catch (error) {
      await this.storage.discard(staged);
      throw error;
    } finally {
      await rm(incoming.path, { force: true });
    }
  }

  async newVersion(actor: PenggunaAktif, templateId: string, incoming: IncomingFile, raw: unknown) {
    this.cekPengelola(actor);
    const b = skemaBuatVersiTemplate.parse(raw);
    const valid = await this.validate(incoming);
    const staged = await this.storage.stage(createReadStream(incoming.path));
    try {
      return await this.repo.transaction(async (db) => {
        const template = (
          await this.repo.rows<
            RowDataPacket & { id: string; created_by: string; current_version_id: string | null }
          >(
            db,
            'SELECT id,created_by,current_version_id FROM template_surat WHERE id=? AND deleted_at IS NULL FOR UPDATE',
            [templateId],
          )
        )[0];
        if (!template) throw new NotFoundException();
        cekPemilikAtauSuperadmin(actor, template.created_by);
        const pending = (
          await this.repo.rows<RowDataPacket & { id: string; nomor_versi: number; status: string }>(
            db,
            "SELECT id,nomor_versi,status FROM template_surat_versi WHERE template_surat_id=? AND status IN ('PENDING_REVIEW','APPROVED') FOR UPDATE",
            [templateId],
          )
        )[0];
        if (pending?.status === 'APPROVED' && !actor.peran.includes('SUPERADMIN'))
          throw new ConflictException(
            'Versi yang sudah disetujui dikunci sampai diterbitkan Superadmin',
          );
        const old = template.current_version_id
          ? (
              await this.repo.rows<RowDataPacket & { id: string; nomor_versi: number }>(
                db,
                "SELECT id,nomor_versi FROM template_surat_versi WHERE id=? AND template_surat_id=? AND status='ACTIVE' FOR UPDATE",
                [template.current_version_id, templateId],
              )
            )[0]
          : undefined;
        const [lastVersion] = await this.repo.rows<RowDataPacket & { number: string }>(
          db,
          'SELECT CAST(COALESCE(MAX(nomor_versi),0) AS CHAR) number FROM template_surat_versi WHERE template_surat_id=?',
          [templateId],
        );
        const number = Number(lastVersion?.number ?? 0) + 1;
        const status = 'PENDING_REVIEW' as const;
        if (pending) {
          await this.repo.write(
            db,
            "UPDATE template_surat_versi SET status='ARCHIVED',archived_at=UTC_TIMESTAMP(6) WHERE id=?",
            [pending.id],
          );
          await this.audit.recordDomain(
            {
              module: 'letter-templates',
              action: 'SUPERSEDE_PENDING_VERSION',
              entityType: 'template_surat_versi',
              entityId: pending.id,
              actorId: actor.id,
              before: { status: pending.status, nomorVersi: Number(pending.nomor_versi) },
              after: { status: 'ARCHIVED', templateSuratId: templateId },
            },
            db,
          );
        }
        const versionId = await this.insertVersion(
          db,
          templateId,
          number,
          b.tingkatAkses,
          status,
          valid,
          staged,
          actor.id,
        );
        await this.audit.recordDomain(
          {
            module: 'letter-templates',
            action: 'CREATE_VERSION',
            entityType: 'template_surat_versi',
            entityId: versionId,
            actorId: actor.id,
            before: old ? { nomorVersi: Number(old.nomor_versi) } : undefined,
            after: { nomorVersi: number, tingkatAkses: b.tingkatAkses, status },
          },
          db,
        );
        await this.storage.finalize(staged);
        return { id: versionId, templateSuratId: templateId, nomorVersi: number, status };
      });
    } catch (error) {
      await this.storage.discard(staged);
      throw error;
    } finally {
      await rm(incoming.path, { force: true });
    }
  }

  private async insertVersion(
    db: PoolConnection,
    templateId: string,
    number: number,
    access: 'PUBLIK' | 'INTERNAL',
    status: 'PENDING_REVIEW',
    valid: Awaited<ReturnType<LetterTemplatesService['validate']>>,
    staged: Awaited<ReturnType<StorageService['stage']>>,
    actorId: string,
  ) {
    await this.repo.write(
      db,
      "INSERT INTO template_surat_versi(template_surat_id,nomor_versi,tingkat_akses,status,storage_key,nama_asli,mime_type,size_bytes,checksum,created_by,activated_at) VALUES(?,?,?,?,?,?,?,?,?,?,IF(?='ACTIVE',UTC_TIMESTAMP(6),NULL))",
      [
        templateId,
        number,
        access,
        status,
        staged.storageKey,
        valid.originalName,
        valid.mimeType,
        staged.byte,
        staged.checksum,
        actorId,
        status,
      ],
    );
    return this.repo.id(db);
  }

  private async lockTemplate(db: PoolConnection, templateId: string) {
    const [template] = await this.repo.rows<
      RowDataPacket & { id: string; current_version_id: string | null }
    >(
      db,
      'SELECT id,current_version_id FROM template_surat WHERE id=? AND deleted_at IS NULL FOR UPDATE',
      [templateId],
    );
    if (!template) throw new NotFoundException();
    return template;
  }

  private async version(db: PoolConnection, templateId: string, versionId: string) {
    const [version] = await this.repo.rows<
      TemplateFile & {
        status: string;
        nomor_versi: number;
        verified_by: string | null;
        approved_at: string | null;
      }
    >(db, 'SELECT * FROM template_surat_versi WHERE id=? AND template_surat_id=? FOR UPDATE', [
      versionId,
      templateId,
    ]);
    if (!version) throw new NotFoundException();
    return version;
  }

  private async assertFile(version: TemplateFile) {
    if (
      !(await this.storage.verify(
        version.storage_key,
        Number(version.size_bytes),
        version.checksum,
      ))
    )
      throw new UnprocessableEntityException('Berkas format tidak tersedia atau checksum berubah');
  }

  /** Persetujuan tidak mengaktifkan file maupun mengganti pointer versi terbit. */
  async verify(actor: PenggunaAktif, templateId: string, versionId: string, raw: unknown) {
    cekSuperadmin(actor);
    cekIzin(actor, ['templates.manage']);
    skemaKeputusanTemplate.parse(raw);
    return this.repo.transaction(async (db) => {
      await this.lockTemplate(db, templateId);
      const version = await this.version(db, templateId, versionId);
      if (version.status !== 'PENDING_REVIEW')
        throw new ConflictException('Versi format tidak lagi menunggu persetujuan');
      await this.assertFile(version);
      await this.repo.write(
        db,
        "UPDATE template_surat_versi SET status='APPROVED',verified_by=?,approved_at=UTC_TIMESTAMP(6) WHERE id=?",
        [actor.id, versionId],
      );
      await this.audit.recordDomain(
        {
          module: 'letter-templates',
          action: 'APPROVE_VERSION',
          entityType: 'template_surat_versi',
          entityId: versionId,
          actorId: actor.id,
          before: { status: 'PENDING_REVIEW' },
          after: { status: 'APPROVED', nomorVersi: Number(version.nomor_versi) },
        },
        db,
      );
      return {
        id: versionId,
        templateSuratId: templateId,
        nomorVersi: Number(version.nomor_versi),
        status: 'APPROVED' as const,
      };
    });
  }

  /** Hanya penerbitan yang mengarsip versi lama dan memindah pointer secara atomik. */
  async publish(actor: PenggunaAktif, templateId: string, versionId: string, raw: unknown) {
    cekSuperadmin(actor);
    cekIzin(actor, ['templates.manage']);
    skemaKeputusanTemplate.parse(raw);
    return this.repo.transaction(async (db) => {
      const template = await this.lockTemplate(db, templateId);
      const version = await this.version(db, templateId, versionId);
      if (version.status !== 'APPROVED' || !version.verified_by || !version.approved_at)
        throw new ConflictException('Setujui versi format terlebih dahulu sebelum menerbitkan');
      await this.assertFile(version);
      if (template.current_version_id) {
        const previous = await this.version(db, templateId, template.current_version_id);
        if (previous.status !== 'ACTIVE')
          throw new ConflictException('Versi terbit sebelumnya tidak valid');
        await this.repo.write(
          db,
          "UPDATE template_surat_versi SET status='ARCHIVED',archived_at=GREATEST(UTC_TIMESTAMP(6),activated_at) WHERE id=?",
          [previous.id],
        );
      }
      await this.repo.write(
        db,
        "UPDATE template_surat_versi SET status='ACTIVE',activated_at=UTC_TIMESTAMP(6) WHERE id=?",
        [versionId],
      );
      await this.repo.write(
        db,
        'UPDATE template_surat SET current_version_id=?,aktif=1 WHERE id=?',
        [versionId, templateId],
      );
      await this.audit.recordDomain(
        {
          module: 'letter-templates',
          action: 'PUBLISH_VERSION',
          entityType: 'template_surat_versi',
          entityId: versionId,
          actorId: actor.id,
          before: { status: 'APPROVED' },
          after: { status: 'ACTIVE', nomorVersi: Number(version.nomor_versi) },
        },
        db,
      );
      return {
        id: versionId,
        templateSuratId: templateId,
        nomorVersi: Number(version.nomor_versi),
        status: 'ACTIVE' as const,
      };
    });
  }

  /** File belum terbit hanya melalui rute panel terautorisasi untuk tinjauan. */
  async review(
    actor: PenggunaAktif,
    templateId: string,
    versionId: string,
    options: { queue?: boolean; preview?: boolean } = {},
  ) {
    cekBacaPanel(actor, 'templates.manage');
    const [version] = await this.repo.rows<TemplateFile>(
      this.repo.pool,
      `SELECT v.* FROM template_surat_versi v JOIN template_surat t ON t.id=v.template_surat_id WHERE v.id=? AND t.id=? AND t.deleted_at IS NULL${options.queue ? " AND v.status IN ('PENDING_REVIEW','APPROVED')" : actor.peran.includes('SUPERADMIN') ? '' : ' AND t.created_by=?'}`,
      options.queue || actor.peran.includes('SUPERADMIN')
        ? [versionId, templateId]
        : [versionId, templateId, actor.id],
    );
    if (!version) throw new NotFoundException();
    if (options.preview && !bisaDipratinjau(version.mime_type))
      throw new UnsupportedMediaTypeException(
        'Jenis berkas ini belum mendukung pratinjau. Silakan unduh berkas.',
      );
    await this.audit.recordDomain({
      module: 'letter-templates',
      action: 'REVIEW_VERSION',
      entityType: 'template_surat_versi',
      entityId: versionId,
      actorId: actor.id,
    });
    return this.openAuthorized(version, actor);
  }

  async remove(actor: PenggunaAktif, templateId: string, raw: unknown) {
    this.cekPengelola(actor);
    skemaHapusTemplate.parse(raw ?? {});
    return this.repo.transaction((db) => this.removeInTransaction(db, actor, templateId));
  }

  async removeInTransaction(db: PoolConnection, actor: PenggunaAktif, templateId: string, requestId?: string) {
    this.cekPengelola(actor);
    const template = (
      await this.repo.rows<
        RowDataPacket & {
          id: string;
          nama: string;
          current_version_id: string | null;
          aktif: number;
          created_by: string;
        }
      >(
        db,
        'SELECT id,nama,created_by,current_version_id,aktif FROM template_surat WHERE id=? AND deleted_at IS NULL FOR UPDATE',
        [templateId],
      )
    )[0];
    if (!template) throw new NotFoundException();
    cekPemilikAtauSuperadmin(actor, template.created_by);
    if (!actor.peran.includes('SUPERADMIN')) {
      const approved = await this.repo.rows(
        db,
        "SELECT id FROM template_surat_versi WHERE template_surat_id=? AND (status='APPROVED' OR activated_at IS NOT NULL) FOR UPDATE",
        [templateId],
      );
      if (template.current_version_id || approved.length)
        throw new ConflictException(
          'Format yang sudah disetujui atau terbit hanya dapat dihapus Superadmin',
        );
    }
    // Semua tindakan versi mengunci induk yang sama. Setelah dihapus, unggah,
    // persetujuan, penerbitan dan unduhan tidak dapat menghidupkannya kembali.
    // Riwayat versi/berkas dipertahankan, tanpa mengubahnya menjadi arsip.
    await this.repo.write(
      db,
      'UPDATE template_surat SET current_version_id=NULL,aktif=0,deleted_at=UTC_TIMESTAMP(6) WHERE id=?',
      [templateId],
    );
    await this.audit.recordDomain(
      {
        module: 'letter-templates',
        action: 'DELETE',
        entityType: 'template_surat',
        entityId: templateId,
        actorId: actor.id,
        before: {
          nama: template.nama,
          aktif: Boolean(template.aktif),
          currentVersionId: template.current_version_id,
        },
        after: { deleted: true, ...(requestId ? { requestId } : {}) },
      },
      db,
    );
    await this.repo.write(db,
      "UPDATE permintaan_penghapusan SET status='OBSOLETE',catatan='Format sudah dihapus melalui pengelolaan.',decided_by=?,decided_at=UTC_TIMESTAMP(6) WHERE sumber='TEMPLATE' AND resource_id=? AND status='PENDING'",
      [actor.id, templateId]);
    return { id: templateId, deleted: true };
  }

  async withdrawInTransaction(db: PoolConnection, actor: PenggunaAktif, templateId: string, reason: string, requestId?: string) {
    cekSuperadmin(actor);
    cekIzin(actor, ['templates.manage']);
    const template = await this.lockTemplate(db, templateId);
    if (!template.current_version_id) throw new ConflictException('Format tidak lagi terbit.');
    const versionId = String(template.current_version_id);
    await this.repo.write(db, "UPDATE template_surat_versi SET status='ARCHIVED',archived_at=UTC_TIMESTAMP(6) WHERE id=? AND status='ACTIVE'", [versionId]);
    await this.repo.write(db, 'UPDATE template_surat SET current_version_id=NULL,aktif=0 WHERE id=?', [templateId]);
    await this.audit.recordDomain({ module: 'letter-templates', action: 'WITHDRAW', entityType: 'template_surat', entityId: templateId,
      actorId: actor.id, before: { status: 'ACTIVE' }, after: { status: 'WITHDRAWN', reason, ...(requestId ? { requestId } : {}) } }, db);
  }

  async list(rawQuery: unknown, actor?: PenggunaAktif) {
    const page = { ...parseTemplatePage(rawQuery), q: skemaCariTemplate.parse(rawQuery ?? {}).q };
    const includeInternal = actor?.status === 'AKTIF' && actor.peran.includes('DOSEN_STAF');
    const visible = includeInternal
      ? "v.tingkat_akses IN ('PUBLIK','INTERNAL')"
      : "v.tingkat_akses='PUBLIK'";
    const search = page.q ? " AND t.nama LIKE ? ESCAPE '!'" : '';
    const values = page.q
      ? [`%${page.q.replaceAll('!', '!!').replaceAll('%', '!%').replaceAll('_', '!_')}%`]
      : [];
    const [count] = await this.repo.rows<RowDataPacket & { total: string }>(
      this.repo.pool,
      `SELECT COUNT(*) total FROM template_surat t JOIN template_surat_versi v ON v.id=t.current_version_id WHERE t.aktif=1 AND t.deleted_at IS NULL AND v.status='ACTIVE' AND ${visible}${search}`,
      values,
    );
    const offset = (page.halaman - 1) * page.perHalaman;
    const rows = await this.repo.rows<
      RowDataPacket & {
        id: string;
        slug: string;
        nama: string;
        tingkatAkses: 'PUBLIK' | 'INTERNAL';
        mimeType?: string;
      }
    >(
      this.repo.pool,
      `SELECT CAST(t.id AS CHAR) id,t.slug,t.nama,v.tingkat_akses tingkatAkses,v.mime_type mimeType FROM template_surat t JOIN template_surat_versi v ON v.id=t.current_version_id WHERE t.aktif=1 AND t.deleted_at IS NULL AND v.status='ACTIVE' AND ${visible}${search} ORDER BY t.nama,t.id LIMIT ? OFFSET ?`,
      [...values, page.perHalaman, offset],
    );
    // Pengunjung anonim tidak menerima `tingkatAkses`: keberadaan format
    // Internal tidak boleh tersirat dari bentuk tanggapan publik.
    const data = rows.map(({ tingkatAkses, mimeType, ...row }) => ({
      ...row,
      ...(includeInternal ? { tingkatAkses } : {}),
      kemampuan: { download: true as const, preview: !!mimeType && bisaDipratinjau(mimeType) },
    }));
    const total = Number(count?.total ?? 0);
    const response = {
      sukses: true as const,
      data,
      meta: {
        halaman: page.halaman,
        perHalaman: page.perHalaman,
        totalButir: total,
        totalHalaman: Math.ceil(total / page.perHalaman),
        adaSebelumnya: page.halaman > 1,
        adaBerikutnya: offset + data.length < total,
      },
    };
    return includeInternal
      ? skemaDaftarTemplateAuthorized.parse(response)
      : skemaDaftarTemplatePublik.parse(response);
  }

  async adminList(actor: PenggunaAktif) {
    cekBacaPanel(actor, 'templates.manage');
    const superadmin = actor.peran.includes('SUPERADMIN');
    return this.repo.rows(
      this.repo.pool,
      `SELECT CAST(t.id AS CHAR) id,CAST(t.created_by AS CHAR) createdBy,t.slug,t.nama,t.aktif,EXISTS(SELECT 1 FROM template_surat_versi h WHERE h.template_surat_id=t.id AND h.activated_at IS NOT NULL) pernahTerbit,CAST(t.current_version_id AS CHAR) currentVersionId,CAST(v.nomor_versi AS UNSIGNED) nomorVersi,v.tingkat_akses tingkatAkses,v.status,v.mime_type mimeType,v.nama_asli namaAsli,CAST(p.id AS CHAR) pendingVersionId,CAST(p.nomor_versi AS UNSIGNED) pendingNomorVersi,p.tingkat_akses pendingTingkatAkses,p.status pendingStatus,p.mime_type pendingMimeType,p.nama_asli pendingNamaAsli FROM template_surat t LEFT JOIN template_surat_versi v ON v.id=t.current_version_id LEFT JOIN template_surat_versi p ON p.template_surat_id=t.id AND p.status IN ('PENDING_REVIEW','APPROVED') WHERE t.deleted_at IS NULL${superadmin ? '' : ' AND t.created_by=?'} ORDER BY t.updated_at DESC`,
      superadmin ? [] : [actor.id],
    );
  }

  async verificationQueue(actor: PenggunaAktif, rawQuery: unknown) {
    cekBacaPanel(actor, 'templates.manage');
    const page = skemaCariTemplate.parse(rawQuery ?? {});
    const values: (string | number)[] = [];
    const where = ['t.deleted_at IS NULL', "v.status IN ('PENDING_REVIEW','APPROVED')"];
    if (page.q) {
      where.push("t.nama LIKE ? ESCAPE '!'");
      values.push(`%${page.q.replaceAll('!', '!!').replaceAll('%', '!%').replaceAll('_', '!_')}%`);
    }
    const from = `FROM template_surat t JOIN template_surat_versi v ON v.template_surat_id=t.id JOIN pengguna u ON u.id=v.created_by WHERE ${where.join(' AND ')}`;
    const [count] = await this.repo.rows<RowDataPacket & { total: string }>(
      this.repo.pool,
      `SELECT COUNT(*) total ${from}`,
      values,
    );
    const offset = (page.halaman - 1) * page.perHalaman;
    const data = await this.repo.rows(
      this.repo.pool,
      `SELECT CAST(v.id AS CHAR) id,CAST(t.id AS CHAR) templateSuratId,t.nama,v.nomor_versi nomorVersi,v.tingkat_akses tingkatAkses,v.status,v.mime_type mimeType,v.nama_asli namaAsli,u.nama pengunggah,CAST(v.created_at AS CHAR) diajukanPada ${from} ORDER BY v.created_at,v.id LIMIT ? OFFSET ?`,
      [...values, page.perHalaman, offset],
    );
    const total = Number(count?.total ?? 0);
    return skemaAntreanTemplate.parse({
      sukses: true,
      data,
      meta: {
        halaman: page.halaman,
        perHalaman: page.perHalaman,
        totalButir: total,
        totalHalaman: Math.ceil(total / page.perHalaman),
        adaSebelumnya: page.halaman > 1,
        adaBerikutnya: offset + data.length < total,
      },
    });
  }

  async authorizeOpen(slug: string, actor?: PenggunaAktif) {
    const file = (
      await this.repo.rows<TemplateFile>(
        this.repo.pool,
        "SELECT CAST(t.id AS CHAR) template_surat_id,CAST(v.id AS CHAR) id,v.storage_key,v.nama_asli,v.mime_type,v.size_bytes,v.tingkat_akses FROM template_surat t JOIN template_surat_versi v ON v.id=t.current_version_id WHERE t.slug=? AND t.aktif=1 AND t.deleted_at IS NULL AND v.status='ACTIVE'",
        [slug],
      )
    )[0];
    if (!file) throw new NotFoundException();
    if (
      file.tingkat_akses === 'INTERNAL' &&
      !(actor?.status === 'AKTIF' && actor.peran.includes('DOSEN_STAF'))
    )
      throw new NotFoundException();
    return file;
  }

  async openAuthorized(file: TemplateDownloadTerotorisasi, actor?: PenggunaAktif, preview = false) {
    if (preview && !bisaDipratinjau(file.mime_type))
      throw new UnsupportedMediaTypeException(
        'Jenis berkas ini belum mendukung pratinjau. Silakan unduh berkas.',
      );
    const object = await this.storage.open(file.storage_key);
    if (object.size !== Number(file.size_bytes)) {
      object.stream.destroy();
      throw new NotFoundException();
    }
    if (file.tingkat_akses === 'INTERNAL' && actor)
      await this.audit.recordDomain({
        module: 'letter-templates',
        action: 'DOWNLOAD_INTERNAL',
        entityType: 'template_surat_versi',
        entityId: file.id,
        actorId: actor.id,
      });
    return {
      stream: object.stream,
      size: object.size,
      mimeType: file.mime_type,
      originalName: safeOriginalName(file.nama_asli),
    };
  }

  async open(slug: string, actor?: PenggunaAktif) {
    return this.openAuthorized(await this.authorizeOpen(slug, actor), actor);
  }
}

function parseTemplatePage(raw: unknown) {
  const value = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const halaman = Number(value.halaman ?? 1);
  const perHalaman = Number(value.perHalaman ?? 20);
  if (
    !Number.isSafeInteger(halaman) ||
    halaman < 1 ||
    !Number.isSafeInteger(perHalaman) ||
    perHalaman < 1 ||
    perHalaman > 100
  )
    throw new ConflictException('Parameter halaman tidak sah');
  return { halaman, perHalaman };
}
