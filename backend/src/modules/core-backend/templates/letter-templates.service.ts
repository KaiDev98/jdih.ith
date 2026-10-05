import { createReadStream } from 'node:fs';
import { rm } from 'node:fs/promises';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import type { PenggunaAktif } from '@jdih/shared';
import {
  skemaArsipTemplate,
  skemaBuatVersiTemplate,
  skemaDaftarTemplateAuthorized,
  skemaDaftarTemplatePublik,
  skemaUnggahTemplateAwal,
} from '@jdih/shared';
import { cekIzin } from '../../identity/security.js';
import { AuditService } from '../../identity/audit.service.js';
import { CoreBackendRepository } from '../core-backend.repository.js';
import { StorageService } from '../storage/storage.service.js';
import { safeOriginalName, validateIncomingFile } from '../storage/file-validation.js';
import type { KonfigurasiApp } from '../../../config/configuration.js';

interface IncomingFile { path: string; originalname: string }
interface TemplateFile extends RowDataPacket {
  storage_key: string;
  nama_asli: string;
  mime_type: string;
  size_bytes: string;
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

  async create(actor: PenggunaAktif, incoming: IncomingFile, raw: unknown) {
    cekIzin(actor, ['templates.manage']);
    const b = skemaUnggahTemplateAwal.parse(raw);
    const valid = await this.validate(incoming);
    const staged = await this.storage.stage(createReadStream(incoming.path));
    try {
      return await this.repo.transaction(async (db) => {
        await this.repo.write(
          db,
          'INSERT INTO template_surat(slug,nama,deskripsi,created_by) VALUES(?,?,?,?)',
          [b.slug, b.nama, b.deskripsi ?? null, actor.id],
        );
        const templateId = await this.repo.id(db);
        const versionId = await this.insertVersion(db, templateId, 1, b.tingkatAkses, valid, staged, actor.id);
        await this.repo.write(db, 'UPDATE template_surat SET current_version_id=? WHERE id=?', [versionId, templateId]);
        await this.audit.recordDomain({
          module: 'letter-templates', action: 'CREATE', entityType: 'template_surat', entityId: templateId, actorId: actor.id,
          after: { slug: b.slug, nama: b.nama },
        }, db);
        await this.audit.recordDomain({
          module: 'letter-templates', action: 'CREATE_VERSION', entityType: 'template_surat_versi', entityId: versionId, actorId: actor.id,
          after: { nomorVersi: 1, tingkatAkses: b.tingkatAkses },
        }, db);
        await this.storage.finalize(staged);
        return { id: templateId, versionId, slug: b.slug, nomorVersi: 1, status: 'ACTIVE' as const };
      });
    } catch (error) {
      await this.storage.discard(staged);
      throw error;
    } finally {
      await rm(incoming.path, { force: true });
    }
  }

  async newVersion(actor: PenggunaAktif, templateId: string, incoming: IncomingFile, raw: unknown) {
    cekIzin(actor, ['templates.manage']);
    const b = skemaBuatVersiTemplate.parse(raw);
    const valid = await this.validate(incoming);
    const staged = await this.storage.stage(createReadStream(incoming.path));
    try {
      return await this.repo.transaction(async (db) => {
        const template = (
          await this.repo.rows<RowDataPacket & { id: string; current_version_id: string | null }>(
            db,
            'SELECT id,current_version_id FROM template_surat WHERE id=? AND deleted_at IS NULL FOR UPDATE',
            [templateId],
          )
        )[0];
        if (!template) throw new NotFoundException();
        const old = template.current_version_id
          ? (await this.repo.rows<RowDataPacket & { id: string; nomor_versi: number }>(
              db,
              "SELECT id,nomor_versi FROM template_surat_versi WHERE id=? AND template_surat_id=? AND status='ACTIVE' FOR UPDATE",
              [template.current_version_id, templateId],
            ))[0]
          : undefined;
        const [lastVersion] = await this.repo.rows<RowDataPacket & { number: string }>(
          db,
          'SELECT CAST(COALESCE(MAX(nomor_versi),0) AS CHAR) number FROM template_surat_versi WHERE template_surat_id=?',
          [templateId],
        );
        const number = Number(lastVersion?.number ?? 0) + 1;
        if (old)
          await this.repo.write(
            db,
            "UPDATE template_surat_versi SET status='ARCHIVED',archived_at=GREATEST(UTC_TIMESTAMP(6),activated_at) WHERE id=?",
            [old.id],
          );
        const versionId = await this.insertVersion(db, templateId, number, b.tingkatAkses, valid, staged, actor.id);
        await this.repo.write(db, 'UPDATE template_surat SET current_version_id=?,aktif=1 WHERE id=?', [versionId, templateId]);
        await this.audit.recordDomain({
          module: 'letter-templates', action: 'CREATE_VERSION', entityType: 'template_surat_versi', entityId: versionId, actorId: actor.id,
          before: old ? { nomorVersi: Number(old.nomor_versi) } : undefined,
          after: { nomorVersi: number, tingkatAkses: b.tingkatAkses, status: 'ACTIVE' },
        }, db);
        await this.storage.finalize(staged);
        return { id: versionId, templateSuratId: templateId, nomorVersi: number, status: 'ACTIVE' as const };
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
    valid: Awaited<ReturnType<LetterTemplatesService['validate']>>,
    staged: Awaited<ReturnType<StorageService['stage']>>,
    actorId: string,
  ) {
    await this.repo.write(
      db,
      "INSERT INTO template_surat_versi(template_surat_id,nomor_versi,tingkat_akses,status,storage_key,nama_asli,mime_type,size_bytes,checksum,created_by,activated_at) VALUES(?,?,?,'ACTIVE',?,?,?,?,?,?,UTC_TIMESTAMP(6))",
      [templateId, number, access, staged.storageKey, valid.originalName, valid.mimeType, staged.byte, staged.checksum, actorId],
    );
    return this.repo.id(db);
  }

  async archive(actor: PenggunaAktif, templateId: string, raw: unknown) {
    cekIzin(actor, ['templates.manage']);
    skemaArsipTemplate.parse(raw);
    return this.repo.transaction(async (db) => {
      const template = (
        await this.repo.rows<RowDataPacket & { id: string; current_version_id: string | null; aktif: number }>(
          db,
          'SELECT id,current_version_id,aktif FROM template_surat WHERE id=? AND deleted_at IS NULL FOR UPDATE',
          [templateId],
        )
      )[0];
      if (!template) throw new NotFoundException();
      if (!template.current_version_id) throw new ConflictException('Template tidak memiliki versi aktif');
      const version = (
        await this.repo.rows<RowDataPacket & { id: string }>(db, "SELECT id FROM template_surat_versi WHERE id=? AND status='ACTIVE' FOR UPDATE", [template.current_version_id])
      )[0];
      if (!version) throw new ConflictException('Versi aktif template tidak ditemukan');
      await this.repo.write(db, "UPDATE template_surat_versi SET status='ARCHIVED',archived_at=GREATEST(UTC_TIMESTAMP(6),activated_at) WHERE id=?", [version.id]);
      await this.repo.write(db, 'UPDATE template_surat SET current_version_id=NULL,aktif=0 WHERE id=?', [templateId]);
      await this.audit.recordDomain({
        module: 'letter-templates', action: 'ARCHIVE', entityType: 'template_surat', entityId: templateId, actorId: actor.id,
        before: { status: 'ACTIVE' }, after: { status: 'ARCHIVED' },
      }, db);
      return { id: templateId, archived: true };
    });
  }

  async list(rawQuery: unknown, actor?: PenggunaAktif) {
    const page = parseTemplatePage(rawQuery);
    const includeInternal = actor?.status === 'AKTIF' && actor.peran.includes('DOSEN_STAF');
    const visible = includeInternal ? "v.tingkat_akses IN ('PUBLIK','INTERNAL')" : "v.tingkat_akses='PUBLIK'";
    const [count] = await this.repo.rows<RowDataPacket & { total: string }>(
      this.repo.pool,
      `SELECT COUNT(*) total FROM template_surat t JOIN template_surat_versi v ON v.id=t.current_version_id WHERE t.aktif=1 AND t.deleted_at IS NULL AND v.status='ACTIVE' AND ${visible}`,
    );
    const offset = (page.halaman - 1) * page.perHalaman;
    const rows = await this.repo.rows(
      this.repo.pool,
      `SELECT CAST(t.id AS CHAR) id,t.slug,t.nama,v.tingkat_akses tingkatAkses FROM template_surat t JOIN template_surat_versi v ON v.id=t.current_version_id WHERE t.aktif=1 AND t.deleted_at IS NULL AND v.status='ACTIVE' AND ${visible} ORDER BY t.nama,t.id LIMIT ? OFFSET ?`,
      [page.perHalaman, offset],
    );
    const data = rows.map((row) => ({ ...row, kemampuan: { download: true as const } }));
    const total = Number(count?.total ?? 0);
    const response = {
      sukses: true as const, data,
      meta: { halaman: page.halaman, perHalaman: page.perHalaman, totalButir: total, totalHalaman: Math.ceil(total / page.perHalaman), adaSebelumnya: page.halaman > 1, adaBerikutnya: offset + data.length < total },
    };
    return includeInternal ? skemaDaftarTemplateAuthorized.parse(response) : skemaDaftarTemplatePublik.parse(response);
  }

  async adminList(actor: PenggunaAktif) {
    cekIzin(actor, ['templates.manage']);
    return this.repo.rows(
      this.repo.pool,
      'SELECT CAST(t.id AS CHAR) id,t.slug,t.nama,t.aktif,CAST(t.current_version_id AS CHAR) currentVersionId,CAST(v.nomor_versi AS UNSIGNED) nomorVersi,v.tingkat_akses tingkatAkses,v.status FROM template_surat t LEFT JOIN template_surat_versi v ON v.id=t.current_version_id WHERE t.deleted_at IS NULL ORDER BY t.updated_at DESC',
    );
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
    if (file.tingkat_akses === 'INTERNAL' && !(actor?.status === 'AKTIF' && actor.peran.includes('DOSEN_STAF')))
      throw new NotFoundException();
    return file;
  }

  async openAuthorized(file: TemplateDownloadTerotorisasi, actor?: PenggunaAktif) {
    const object = await this.storage.open(file.storage_key);
    if (object.size !== Number(file.size_bytes)) throw new NotFoundException();
    if (file.tingkat_akses === 'INTERNAL' && actor)
      await this.audit.recordDomain({
        module: 'letter-templates', action: 'DOWNLOAD_INTERNAL', entityType: 'template_surat_versi', entityId: file.id, actorId: actor.id,
      });
    return { stream: object.stream, size: object.size, mimeType: file.mime_type, originalName: safeOriginalName(file.nama_asli) };
  }

  async open(slug: string, actor?: PenggunaAktif) {
    return this.openAuthorized(await this.authorizeOpen(slug, actor), actor);
  }
}

function parseTemplatePage(raw: unknown) {
  const value = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const halaman = Number(value.halaman ?? 1);
  const perHalaman = Number(value.perHalaman ?? 20);
  if (!Number.isSafeInteger(halaman) || halaman < 1 || !Number.isSafeInteger(perHalaman) || perHalaman < 1 || perHalaman > 100)
    throw new ConflictException('Parameter halaman tidak sah');
  return { halaman, perHalaman };
}
