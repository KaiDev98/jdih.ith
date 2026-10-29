import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import type { PenggunaAktif } from '@jdih/shared';
import { cekIzin, cekSuperadmin } from '../../identity/security.js';
import { AuditService } from '../../identity/audit.service.js';
import { CoreBackendRepository } from '../core-backend.repository.js';
import { StorageService } from '../storage/storage.service.js';

interface BarisDokumen extends RowDataPacket {
  id: string;
  kode_dokumen: string;
  slug: string;
  status_hukum: 'BERLAKU' | 'DIUBAH' | 'DICABUT';
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
        'SELECT CAST(id AS CHAR) id,kode_dokumen,slug,status_hukum FROM dokumen WHERE id=? AND deleted_at IS NULL FOR UPDATE',
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
  async hapusPermanen(actor: PenggunaAktif, id: string) {
    cekSuperadmin(actor);
    cekIzin(actor, ['documents.delete']);
    const kunciBerkas = await this.repo.transaction(async (db) => {
      const d = await this.kunci(db, id);
      const versi = await this.repo.rows<RowDataPacket & { id: string; judul: string }>(
        db,
        'SELECT CAST(id AS CHAR) id,judul FROM dokumen_versi WHERE dokumen_id=? ORDER BY nomor_versi DESC FOR UPDATE',
        [id],
      );
      const ids = versi.map((v) => v.id);
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
      await this.repo.write(db, 'DELETE FROM dokumen_status_hukum_riwayat WHERE dokumen_id=?', [
        id,
      ]);
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
            kodeDokumen: d.kode_dokumen,
            slug: d.slug,
            judul: versi[0]?.judul ?? null,
            jumlahVersi: ids.length,
            jumlahBerkas: berkas.length,
            relasiMasukDihapus: relasiMasuk.affectedRows,
          },
        },
        db,
      );
      return berkas;
    });
    // Berkas fisik dihapus setelah transaksi berhasil. Kegagalan di sini tidak
    // memunculkan dokumen kembali; berkasnya hanya tertinggal tanpa pemilik.
    for (const kunci of kunciBerkas)
      await this.storage.delete(kunci).catch((e: unknown) => {
        this.log.warn(
          `Berkas ${kunci} gagal dihapus: ${e instanceof Error ? e.message : String(e)}`,
        );
      });
    return { id, dihapus: true };
  }
}
