import { createReadStream } from 'node:fs';
import { rm } from 'node:fs/promises';
import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import type { PenggunaAktif } from '@jdih/shared';
import { skemaMetaBerkas, skemaHasilUnggahBerkas } from '@jdih/shared';
import { cekIzin } from '../../identity/security.js';
import { AuditService } from '../../identity/audit.service.js';
import { DocumentPolicyService } from '../../identity/document-policy.service.js';
import { CoreBackendRepository } from '../core-backend.repository.js';
import { StorageService, type BerkasDisimpanSementara } from '../storage/storage.service.js';
import { safeOriginalName, validateIncomingFile } from '../storage/file-validation.js';
import type { KonfigurasiApp } from '../../../config/configuration.js';

interface IncomingFile {
  path: string;
  originalname: string;
}
interface FileRow extends RowDataPacket {
  id: string;
  dokumen_versi_id: string;
  jenis_berkas: 'UTAMA' | 'LAMPIRAN';
  judul: string | null;
  storage_key: string;
  nama_asli: string;
  mime_type: string;
  size_bytes: string;
  checksum: Buffer;
  urutan: number;
}

export interface BerkasDownloadTerotorisasi extends FileRow {
  dokumen_id: string;
  tingkat_akses: 'publik' | 'internal' | 'rahasia';
  current: number;
  deleted: number;
}

@Injectable()
export class DocumentFilesService {
  constructor(
    private readonly repo: CoreBackendRepository,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
    private readonly policy: DocumentPolicyService,
    private readonly config: ConfigService<KonfigurasiApp, true>,
  ) {}

  async upload(actor: PenggunaAktif, versionId: string, incoming: IncomingFile, rawMetadata: unknown) {
    cekIzin(actor, ['documents.upload']);
    let staged: BerkasDisimpanSementara | undefined;
    try {
      const metadata = skemaMetaBerkas.parse(rawMetadata);
      const maxBytes = this.config.get('penyimpanan', { infer: true }).ukuranMaksimumBita;
      const valid = await validateIncomingFile(incoming.path, incoming.originalname, 'dokumen', maxBytes);
      staged = await this.storage.stage(createReadStream(incoming.path));
      const object = staged;
      if (object.byte !== valid.size) throw new UnprocessableEntityException('Ukuran berkas berubah saat diproses');
      const created = await this.repo.transaction(async (db) => {
        const version = (
          await this.repo.rows(
            db,
            'SELECT id,status_workflow FROM dokumen_versi WHERE id=? FOR UPDATE',
            [versionId],
          )
        )[0] as (RowDataPacket & { id: string; status_workflow: string }) | undefined;
        if (!version) throw new NotFoundException();
        if (!['DRAF', 'REVISI'].includes(version.status_workflow))
          throw new UnprocessableEntityException('File hanya dapat ditambahkan pada draf/revisi');
        await this.repo.write(
          db,
          'INSERT INTO dokumen_berkas(dokumen_versi_id,jenis_berkas,judul,storage_key,nama_asli,mime_type,size_bytes,checksum,urutan) VALUES(?,?,?,?,?,?,?,?,?)',
          [
            versionId,
            metadata.jenisBerkas,
            metadata.judul ?? null,
            object.storageKey,
            valid.originalName,
            valid.mimeType,
            object.byte,
            object.checksum,
            metadata.urutan,
          ],
        );
        const id = await this.repo.id(db);
        await this.audit.recordDomain(
          {
            module: 'documents',
            action: metadata.jenisBerkas === 'UTAMA' ? 'UPLOAD_MAIN_FILE' : 'UPLOAD_ATTACHMENT',
            entityType: 'dokumen_berkas',
            entityId: id,
            actorId: actor.id,
            after: { status: metadata.jenisBerkas },
          },
          db,
        );
        // Finalize while the transaction is open; any failure rolls back DB and removes the object.
        await this.storage.finalize(object);
        return skemaHasilUnggahBerkas.parse({
          id,
          jenisBerkas: metadata.jenisBerkas,
          namaAsli: valid.originalName,
          mimeType: valid.mimeType,
          sizeBytes: String(object.byte),
          checksum: object.checksum.toString('hex'),
        });
      });
      return created;
    } catch (error) {
      if (staged) await this.storage.discard(staged);
      throw error;
    } finally {
      // Controller temp upload is always private and short-lived.
      await rm(incoming.path, { force: true });
    }
  }

  async assertPublishReady(db: PoolConnection, versionId: string) {
    const file = (
      await this.repo.rows<FileRow>(
        db,
        "SELECT id,storage_key,size_bytes,checksum FROM dokumen_berkas WHERE dokumen_versi_id=? AND jenis_berkas='UTAMA' LIMIT 1 FOR UPDATE",
        [versionId],
      )
    )[0];
    if (!file) throw new UnprocessableEntityException('Metadata file UTAMA wajib tersedia');
    if (!(await this.storage.verify(file.storage_key, Number(file.size_bytes), file.checksum)))
      throw new UnprocessableEntityException('File UTAMA tidak tersedia atau checksum berubah');
  }

  async authorizeCurrent(slug: string, fileId: string, actor?: PenggunaAktif) {
    const file = (
      await this.repo.rows<BerkasDownloadTerotorisasi>(
        this.repo.pool,
        "SELECT CAST(d.id AS CHAR) dokumen_id,CAST(v.id AS CHAR) dokumen_versi_id,v.tingkat_akses,IF(d.current_published_version_id=v.id,1,0) current,IF(d.deleted_at IS NULL,0,1) deleted,f.* FROM dokumen d JOIN dokumen_versi v ON v.id=d.current_published_version_id JOIN dokumen_berkas f ON f.dokumen_versi_id=v.id WHERE d.slug=? AND f.id=? AND v.status_workflow='TERBIT' AND d.deleted_at IS NULL",
        [slug, fileId],
      )
    )[0];
    if (!file) throw new NotFoundException();
    await this.policy.assertRead(
      {
        id: file.dokumen_id,
        tingkatAkses: file.tingkat_akses,
        published: true,
        current: Number(file.current) === 1,
        deleted: Number(file.deleted) === 1,
      },
      actor,
    );
    return file;
  }

  async openAuthorized(file: BerkasDownloadTerotorisasi) {
    const object = await this.storage.open(file.storage_key);
    if (object.size !== Number(file.size_bytes)) throw new NotFoundException();
    return {
      stream: object.stream,
      size: object.size,
      mimeType: file.mime_type,
      originalName: safeOriginalName(file.nama_asli),
    };
  }

  async openCurrent(slug: string, fileId: string, actor?: PenggunaAktif) {
    return this.openAuthorized(await this.authorizeCurrent(slug, fileId, actor));
  }
}
