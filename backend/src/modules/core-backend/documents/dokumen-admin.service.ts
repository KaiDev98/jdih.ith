import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import type { PenggunaAktif } from '@jdih/shared';
import {
  cekBacaPanel,
  cekIzin,
  cekPemilikAtauSuperadmin,
  cekSuperadmin,
} from '../../identity/security.js';
import { AuditService } from '../../identity/audit.service.js';
import { CoreBackendRepository } from '../core-backend.repository.js';
import { StorageService } from '../storage/storage.service.js';

interface BarisDokumen extends RowDataPacket {
  id: string;
  kode_dokumen: string;
  slug: string;
  status_hukum: 'BERLAKU' | 'DIUBAH' | 'DICABUT';
  created_by: string;
}

/** `IN (?,?,…)` untuk daftar id; daftar kosong tidak pernah cocok. */
const tempat = (ids: readonly string[]) => (ids.length ? ids.map(() => '?').join(',') : 'NULL');

/**
 * Tindakan Admin di luar alur workflow: menghapus dokumen secara permanen.
 * Status hukum (Diubah/Dicabut) tidak diubah langsung; ia berubah otomatis saat
 * dokumen pengubah/pencabutnya terbit (lihat CoreBackendService.publish).
 */
@Injectable()
export class DokumenAdminService {
  private readonly log = new Logger(DokumenAdminService.name);
  constructor(
    private readonly repo: CoreBackendRepository,
    private readonly audit: AuditService,
    private readonly storage: StorageService,
  ) {}

  private async kunci(db: PoolConnection, id: string) {
    const row = (
      await this.repo.rows<BarisDokumen>(
        db,
        'SELECT CAST(id AS CHAR) id,kode_dokumen,slug,status_hukum,CAST(created_by AS CHAR) created_by FROM dokumen WHERE id=? AND deleted_at IS NULL FOR UPDATE',
        [id],
      )
    )[0];
    if (!row) throw new NotFoundException();
    return row;
  }

  /**
   * Menghapus dokumen beserta seluruh versi, berkas, riwayat workflow, relasi,
   * dan grant Rahasia. Relasi dari dokumen lain yang menunjuk dokumen ini ikut
   * dihapus; riwayat status dokumen lain yang bersumber dari versinya tetap ada
   * tanpa tautan sumber. Jejak penghapusan tersimpan di audit_log.
   */
  async hapusPermanen(actor: PenggunaAktif, id: string, versionId: string) {
    cekSuperadmin(actor);
    cekIzin(actor, ['documents.delete']);
    const kunciBerkas = await this.repo.transaction((db) =>
      this.hapusDalamTransaksi(db, actor, id, versionId),
    );
    await this.bersihkanBerkas(kunciBerkas);
    return { id, dihapus: true };
  }

  /** Dipakai keputusan permintaan dalam transaksi yang sama dengan audit keputusan. */
  async hapusDalamTransaksi(db: PoolConnection, actor: PenggunaAktif, id: string, versionId: string, requestId?: string) {
    cekSuperadmin(actor);
    cekIzin(actor, ['documents.delete']);
    const d = await this.kunci(db, id);
    const versi = await this.repo.rows<RowDataPacket & { id: string; judul: string }>(
      db,
      'SELECT CAST(id AS CHAR) id,judul FROM dokumen_versi WHERE dokumen_id=? ORDER BY nomor_versi DESC FOR UPDATE',
      [id],
    );
    const ids = versi.map((v) => v.id);
    // Parent is already locked, serializing this check with revision creation and publication.
    // A stale page/request must never remove revisions created after its target version.
    if (!versionId || String(versi[0]?.id) !== versionId)
      throw new ConflictException(
        'Penghapusan dibatalkan karena dokumen memiliki versi yang lebih baru. Buka versi terbaru untuk meninjau seluruh dokumen. Riwayat versi lama tidak dihapus terpisah.',
      );
    const di = tempat(ids);
    const berkas = (
      await this.repo.rows<RowDataPacket & { storage_key: string }>(
        db,
        `SELECT storage_key FROM dokumen_berkas WHERE dokumen_versi_id IN (${di})`,
        ids,
      )
    ).map((b) => b.storage_key);
    await this.repo.write(db, 'UPDATE dokumen SET current_published_version_id=NULL WHERE id=?', [
      id,
    ]);
    await this.repo.write(
      db,
      `UPDATE dokumen_status_hukum_riwayat SET source_version_id=NULL WHERE dokumen_id<>? AND source_version_id IN (${di})`,
      [id, ...ids],
    );
    await this.repo.write(db, 'DELETE FROM dokumen_status_hukum_riwayat WHERE dokumen_id=?', [id]);
    const relasiMasuk = await this.repo.write(
      db,
      'DELETE FROM dokumen_relasi WHERE target_document_id=?',
      [id],
    );
    for (const sasaran of [
      'dokumen_relasi WHERE source_version_id',
      'dokumen_versi_kategori WHERE dokumen_versi_id',
      'dokumen_versi_tag WHERE dokumen_versi_id',
      'dokumen_berkas WHERE dokumen_versi_id',
      'dokumen_workflow WHERE dokumen_versi_id',
    ])
      await this.repo.write(db, `DELETE FROM ${sasaran} IN (${di})`, ids);
    await this.repo.write(db, 'DELETE FROM dokumen_akses_rahasia WHERE dokumen_id=?', [id]);
    await this.repo.write(db, 'DELETE FROM dokumen_versi WHERE dokumen_id=?', [id]);
    await this.repo.write(db, 'DELETE FROM dokumen_statistik WHERE dokumen_id=?', [id]);
    await this.repo.write(db, 'DELETE FROM dokumen WHERE id=?', [id]);
    await this.audit.recordDomain(
      {
        module: 'documents',
        action: 'DELETE_PERMANENT',
        entityType: 'dokumen',
        entityId: id,
        actorId: actor.id,
        before: {
          ownerId: String(d.created_by),
          kodeDokumen: d.kode_dokumen,
          slug: d.slug,
          judul: versi[0]?.judul ?? null,
          jumlahVersi: ids.length,
          versionId,
          jumlahBerkas: berkas.length,
          relasiMasukDihapus: relasiMasuk.affectedRows,
        },
        ...(requestId ? { after: { requestId } } : {}),
      },
      db,
    );
    await this.repo.write(
      db,
      "UPDATE permintaan_penghapusan SET status='OBSOLETE',catatan='Dokumen sudah dihapus melalui tindakan Superadmin.',decided_by=?,decided_at=UTC_TIMESTAMP(6) WHERE sumber='DOCUMENT' AND resource_id=? AND status='PENDING'",
      [actor.id, id],
    );
    return berkas;
  }

  async bersihkanBerkas(kunciBerkas: string[]) {
    // Berkas fisik dihapus setelah transaksi berhasil. Kegagalan di sini tidak
    // memunculkan dokumen kembali; berkasnya hanya tertinggal tanpa pemilik.
    for (const kunci of kunciBerkas)
      await this.storage.delete(kunci).catch((e: unknown) => {
        this.log.warn(
          `Berkas ${kunci} gagal dihapus: ${e instanceof Error ? e.message : String(e)}`,
        );
      });
  }

  /** Called with the parent locked; only a superseded version with a published replacement qualifies. */
  async versiLama(db: PoolConnection, id: string, versionId: string) {
    const [version] = await this.repo.rows<RowDataPacket & { id: string; judul: string; nomor_versi: number; created_by: string }>(db,
      `SELECT CAST(v.id AS CHAR) id,v.judul,v.nomor_versi,CAST(v.created_by AS CHAR) created_by
       FROM dokumen_versi v JOIN dokumen d ON d.id=v.dokumen_id AND d.deleted_at IS NULL
       JOIN dokumen_versi active_version ON active_version.id=d.current_published_version_id AND active_version.dokumen_id=d.id
       WHERE d.id=? AND v.id=? AND v.status_workflow IN ('TERBIT','DITARIK')
       AND active_version.status_workflow='TERBIT' AND active_version.nomor_versi>v.nomor_versi FOR UPDATE`, [id, versionId]);
    if (!version) throw new ConflictException('Versi ini tidak dapat dihapus. Revisi pengganti harus sudah terbit; versi aktif dan draf tetap dilindungi.');
    return version;
  }

  /** Explicit approved version deletion; never deletes the parent, current pointer, grants or newer versions. */
  async hapusVersiLamaDalamTransaksi(db: PoolConnection, actor: PenggunaAktif, id: string, versionId: string, requestId: string) {
    cekSuperadmin(actor);
    cekIzin(actor, ['documents.delete']);
    const parent = await this.kunci(db, id);
    const version = await this.versiLama(db, id, versionId);
    const files = await this.repo.rows<RowDataPacket & { storage_key: string }>(db,
      'SELECT storage_key FROM dokumen_berkas WHERE dokumen_versi_id=?', [versionId]);
    // Keep legal effects but detach their historical source link, just as permanent deletion does.
    await this.repo.write(db, 'UPDATE dokumen_status_hukum_riwayat SET source_version_id=NULL WHERE source_version_id=?', [versionId]);
    for (const target of [
      'dokumen_relasi WHERE source_version_id', 'dokumen_versi_kategori WHERE dokumen_versi_id',
      'dokumen_versi_tag WHERE dokumen_versi_id', 'dokumen_berkas WHERE dokumen_versi_id', 'dokumen_workflow WHERE dokumen_versi_id',
    ]) await this.repo.write(db, `DELETE FROM ${target}=?`, [versionId]);
    await this.repo.write(db, 'DELETE FROM dokumen_versi WHERE id=? AND dokumen_id=?', [versionId, id]);
    await this.audit.recordDomain({ module: 'documents', action: 'DELETE_VERSION', entityType: 'dokumen_versi', entityId: versionId,
      actorId: actor.id, before: { ownerId: String(parent.created_by), judul: version.judul, nomorVersi: version.nomor_versi },
      after: { requestId, targetId: id } }, db);
    // Physical cleanup is allowed only after the object has no remaining metadata reference.
    const unused: string[] = [];
    for (const file of files) {
      const remaining = await this.repo.rows(db, 'SELECT id FROM dokumen_berkas WHERE storage_key=? LIMIT 1', [file.storage_key]);
      if (!remaining.length) unused.push(file.storage_key);
    }
    return unused;
  }

  /** Hanya draf/revisi yang dibatalkan, tanpa menyentuh versi terbit/historis. */
  async hapusDraf(actor: PenggunaAktif, id: string, versionId: string) {
    cekBacaPanel(actor, 'documents.read_admin');
    cekIzin(actor, ['documents.edit']);
    const keys = await this.repo.transaction(async (db) => {
      const [parent] = await this.repo.rows<
        RowDataPacket & { created_by: string; current_published_version_id: string | null }
      >(
        db,
        'SELECT created_by,current_published_version_id FROM dokumen WHERE id=? AND deleted_at IS NULL FOR UPDATE',
        [id],
      );
      if (!parent) throw new NotFoundException();
      cekPemilikAtauSuperadmin(actor, parent.created_by);
      const [version] = await this.repo.rows<
        RowDataPacket & { created_by: string; status_workflow: string; judul: string }
      >(
        db,
        'SELECT created_by,status_workflow,judul FROM dokumen_versi WHERE dokumen_id=? AND id=? FOR UPDATE',
        [id, versionId],
      );
      if (!version) throw new NotFoundException();
      cekPemilikAtauSuperadmin(actor, version.created_by);
      if (
        !['DRAF', 'REVISI'].includes(version.status_workflow) ||
        String(parent.current_published_version_id) === versionId
      )
        throw new ConflictException(
          'Hanya versi Draf atau Revisi yang belum disetujui dapat dihapus.',
        );
      const files = await this.repo.rows<RowDataPacket & { storage_key: string }>(
        db,
        'SELECT storage_key FROM dokumen_berkas WHERE dokumen_versi_id=?',
        [versionId],
      );
      for (const target of [
        'dokumen_relasi WHERE source_version_id',
        'dokumen_versi_kategori WHERE dokumen_versi_id',
        'dokumen_versi_tag WHERE dokumen_versi_id',
        'dokumen_berkas WHERE dokumen_versi_id',
        'dokumen_workflow WHERE dokumen_versi_id',
      ])
        await this.repo.write(db, `DELETE FROM ${target}=?`, [versionId]);
      await this.repo.write(db, 'DELETE FROM dokumen_versi WHERE id=?', [versionId]);
      await this.repo.write(
        db,
        'UPDATE dokumen SET deleted_at=UTC_TIMESTAMP(6) WHERE id=? AND NOT EXISTS (SELECT 1 FROM dokumen_versi WHERE dokumen_id=?)',
        [id, id],
      );
      await this.audit.recordDomain(
        {
          module: 'documents',
          action: 'DELETE_DRAFT',
          entityType: 'dokumen_versi',
          entityId: versionId,
          actorId: actor.id,
          before: { judul: version.judul, status: version.status_workflow, ownerId: String(parent.created_by) },
          after: { targetId: id },
        },
        db,
      );
      return files.map((file) => file.storage_key);
    });
    await this.bersihkanBerkas(keys);
    return { id, versionId, dihapus: true };
  }
}
