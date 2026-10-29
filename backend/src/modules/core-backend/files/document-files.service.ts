import { createReadStream } from 'node:fs';
import { rm } from 'node:fs/promises';
import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import type { PenggunaAktif } from '@jdih/shared';
import { skemaMetaBerkas, skemaHasilUnggahBerkas } from '@jdih/shared';
import { cekBacaPanel, cekIzin, cekPemilikAtauSuperadmin, cekPeruntukanPanel } from '../../identity/security.js';
import { AuditService } from '../../identity/audit.service.js';
import { DocumentPolicyService } from '../../identity/document-policy.service.js';
import { CoreBackendRepository } from '../core-backend.repository.js';
import { StorageService, type BerkasDisimpanSementara, type RentangByte } from '../storage/storage.service.js';
import { safeOriginalName, validateIncomingFile } from '../storage/file-validation.js';
import type { KonfigurasiApp } from '../../../config/configuration.js';

interface IncomingFile {
  path: string;
  originalname: string;
}
interface FileRow extends RowDataPacket {
  id: string;
  dokumen_versi_id: string;
  uploaded_by: string;
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
  tingkat_akses: 'publik' | 'internal';
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
      if (metadata.jenisBerkas !== 'UTAMA')
        throw new UnprocessableEntityException('Setiap pengajuan hanya boleh memiliki satu file dokumen utama; gabungkan lampiran ke dalam file tersebut');
      const maxBytes = this.config.get('penyimpanan', { infer: true }).ukuranMaksimumBita;
      const valid = await validateIncomingFile(incoming.path, incoming.originalname, 'dokumen', maxBytes);
      staged = await this.storage.stage(createReadStream(incoming.path));
      const object = staged;
      if (object.byte !== valid.size) throw new UnprocessableEntityException('Ukuran berkas berubah saat diproses');
      const created = await this.repo.transaction(async (db) => {
        const version = (
          await this.repo.rows(
            db,
            'SELECT v.id,v.status_workflow,v.created_by version_created_by,d.created_by document_created_by,d.peruntukan FROM dokumen_versi v JOIN dokumen d ON d.id=v.dokumen_id AND d.deleted_at IS NULL WHERE v.id=? FOR UPDATE',
            [versionId],
          )
        )[0] as (RowDataPacket & { id: string; status_workflow: string; version_created_by: string; document_created_by: string; peruntukan: string | null }) | undefined;
        if (!version) throw new NotFoundException();
        cekPeruntukanPanel(actor, version.peruntukan);
        cekPemilikAtauSuperadmin(actor, version.document_created_by);
        if (
          !actor.peran.includes('SUPERADMIN') &&
          String(version.version_created_by) !== actor.id
        )
          throw new NotFoundException();
        if (!['DRAF', 'REVISI'].includes(version.status_workflow))
          throw new UnprocessableEntityException('File hanya dapat ditambahkan pada draf/revisi');
        if (metadata.jenisBerkas === 'UTAMA') {
          const ada = await this.repo.rows(
            db,
            // The existing parent version is already locked above. A locking
            // read of an empty file range takes shared index-gap locks across
            // unrelated versions and deadlocks concurrent first uploads.
            'SELECT id FROM dokumen_berkas WHERE dokumen_versi_id=? LIMIT 1',
            [versionId],
          );
          if (ada.length)
            throw new ConflictException(
              'Setiap pengajuan hanya boleh memiliki satu file; hapus berkas draf lama sebelum menggantinya',
            );
        }
        await this.repo.write(
          db,
          'INSERT INTO dokumen_berkas(dokumen_versi_id,uploaded_by,jenis_berkas,judul,storage_key,nama_asli,mime_type,size_bytes,checksum,urutan) VALUES(?,?,?,?,?,?,?,?,?,?)',
          [
            versionId,
            actor.id,
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

  /** Berkas sebuah versi untuk halaman ubah draf di panel admin. */
  async listForVersion(actor: PenggunaAktif, versionId: string) {
    cekBacaPanel(actor, 'documents.read_admin');
    const ownOnly = !actor.peran.includes('SUPERADMIN');
    return this.repo.rows<
      RowDataPacket & {
        id: string;
        jenisBerkas: 'UTAMA' | 'LAMPIRAN';
        judul: string | null;
        namaAsli: string;
        sizeBytes: string;
        bolehHapus: boolean | number;
      }
    >(
      this.repo.pool,
      `SELECT CAST(f.id AS CHAR) id,f.jenis_berkas jenisBerkas,f.judul,f.nama_asli namaAsli,f.mime_type mimeType,CAST(f.size_bytes AS CHAR) sizeBytes,
         IF(?=1 OR f.uploaded_by=?,TRUE,FALSE) bolehHapus
       FROM dokumen_berkas f JOIN dokumen_versi v ON v.id=f.dokumen_versi_id JOIN dokumen d ON d.id=v.dokumen_id AND d.deleted_at IS NULL
       WHERE f.dokumen_versi_id=?${ownOnly ? ' AND d.peruntukan IS NULL' : ''}
       ORDER BY f.jenis_berkas='LAMPIRAN',f.urutan,f.id`,
      [ownOnly ? 0 : 1, actor.id, versionId],
    );
  }

  /** Hapus berkas yang salah unggah; hanya selama versi masih draf/revisi. */
  async removeFromDraft(actor: PenggunaAktif, versionId: string, fileId: string) {
    cekIzin(actor, ['documents.upload']);
    const kunci = await this.repo.transaction(async (db) => {
      const version = (
        await this.repo.rows(db, 'SELECT v.status_workflow,v.created_by version_created_by,d.created_by document_created_by,d.peruntukan FROM dokumen_versi v JOIN dokumen d ON d.id=v.dokumen_id AND d.deleted_at IS NULL WHERE v.id=? FOR UPDATE', [versionId])
      )[0] as (RowDataPacket & { status_workflow: string; version_created_by: string; document_created_by: string; peruntukan: string | null }) | undefined;
      if (!version) throw new NotFoundException();
      cekPeruntukanPanel(actor, version.peruntukan);
      cekPemilikAtauSuperadmin(actor, version.document_created_by);
      if (
        !actor.peran.includes('SUPERADMIN') &&
        String(version.version_created_by) !== actor.id
      )
        throw new NotFoundException();
      if (!['DRAF', 'REVISI'].includes(version.status_workflow))
        throw new UnprocessableEntityException('Berkas hanya dapat dihapus pada draf/revisi');
      const file = (
        await this.repo.rows(
          db,
          'SELECT storage_key,jenis_berkas,uploaded_by FROM dokumen_berkas WHERE id=? AND dokumen_versi_id=? FOR UPDATE',
          [fileId, versionId],
        )
      )[0] as (RowDataPacket & { storage_key: string; jenis_berkas: string; uploaded_by: string }) | undefined;
      if (!file) throw new NotFoundException();
      cekPemilikAtauSuperadmin(actor, file.uploaded_by);
      await this.repo.write(db, 'DELETE FROM dokumen_berkas WHERE id=?', [fileId]);
      await this.audit.recordDomain(
        {
          module: 'documents',
          action: 'DELETE_FILE',
          entityType: 'dokumen_berkas',
          entityId: fileId,
          actorId: actor.id,
          before: { status: file.jenis_berkas },
        },
        db,
      );
      return file.storage_key;
    });
    await this.storage.delete(kunci).catch(() => undefined);
    return { id: fileId, dihapus: true };
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

  async assertSubmissionReady(db: PoolConnection, versionId: string) {
    const files = await this.repo.rows<FileRow>(db,
      'SELECT id,jenis_berkas FROM dokumen_berkas WHERE dokumen_versi_id=? FOR UPDATE', [versionId]);
    if (files.length !== 1 || files[0]?.jenis_berkas !== 'UTAMA')
      throw new UnprocessableEntityException('Pengajuan wajib memiliki tepat satu file dokumen utama. Gabungkan lampiran dalam file utama');
    await this.assertPublishReady(db, versionId);
  }

  /** Akses panel untuk file versi yang belum terbit; hak akses dicek pada setiap permintaan. */
  async authorizeVersion(actor: PenggunaAktif, versionId: string, fileId: string) {
    cekBacaPanel(actor, 'documents.read_admin');
    const file = (await this.repo.rows<BerkasDownloadTerotorisasi>(this.repo.pool,
      `SELECT f.*,CAST(d.id AS CHAR) dokumen_id,v.tingkat_akses,d.created_by document_created_by,d.peruntukan
       FROM dokumen_berkas f JOIN dokumen_versi v ON v.id=f.dokumen_versi_id
       JOIN dokumen d ON d.id=v.dokumen_id
       WHERE f.id=? AND v.id=? AND d.deleted_at IS NULL`, [fileId, versionId]))[0];
    if (!file) throw new NotFoundException();
    cekPeruntukanPanel(actor, file.peruntukan);
    if (String(file.tingkat_akses) === 'rahasia') {
      cekPemilikAtauSuperadmin(actor, file.document_created_by);
      await this.audit.recordDomain({ module: 'documents', action: 'REVIEW_SECRET_FILE',
        entityType: 'dokumen_berkas', entityId: fileId, actorId: actor.id });
    }
    return file;
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
    this.policy.assertRead(
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

  async openAuthorized(file: BerkasDownloadTerotorisasi, range?: RentangByte) {
    const object = range ? await this.storage.open(file.storage_key, range) : await this.storage.open(file.storage_key);
    if (object.size !== Number(file.size_bytes)) {
      object.stream.destroy();
      throw new NotFoundException();
    }
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
