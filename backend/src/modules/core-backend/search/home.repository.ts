import { Injectable } from '@nestjs/common';
import { CoreBackendRepository } from '../core-backend.repository.js';

@Injectable()
export class HomeRepository {
  constructor(private readonly repo: CoreBackendRepository) {}
  /** Window function menghasilkan hitungan dan versi terbaru pada satu pemindaian. */
  latestByType() {
    return this.repo.rows(this.repo.pool, `WITH ranked AS (
      SELECT d.jenis_dokumen_id,CAST(d.id AS CHAR) id,d.slug,v.judul,v.nomor,v.tahun,
        v.tanggal_penetapan tanggalPenetapan,d.status_hukum statusHukum,
        ROW_NUMBER() OVER(PARTITION BY d.jenis_dokumen_id ORDER BY v.published_at DESC,v.id DESC) rn,
        COUNT(*) OVER(PARTITION BY d.jenis_dokumen_id) jumlah
      FROM dokumen d JOIN dokumen_versi v ON v.id=d.current_published_version_id
      WHERE d.deleted_at IS NULL AND d.peruntukan IS NULL AND v.status_workflow='TERBIT' AND v.tingkat_akses='publik'
    ) SELECT CAST(j.id AS CHAR) jenisId,j.kode,j.nama,r.id,r.slug,r.judul,r.nomor,r.tahun,
      r.tanggalPenetapan,r.statusHukum,COALESCE(r.jumlah,0) jumlah,COALESCE(st.jumlah_lihat,0) dilihat
      FROM jenis_dokumen j LEFT JOIN ranked r ON r.jenis_dokumen_id=j.id AND r.rn=1
      LEFT JOIN dokumen_statistik st ON st.dokumen_id=r.id
      WHERE j.aktif=1 ORDER BY j.urutan,j.nama`);
  }
  categories(sopTypeId: string | null) {
    return this.repo.rows(this.repo.pool, `SELECT CAST(k.id AS CHAR) id,k.kode,k.nama,COALESCE(c.jumlah,0) jumlah
      FROM kategori k LEFT JOIN (
        SELECT vk.kategori_id,COUNT(*) jumlah FROM dokumen d
        JOIN dokumen_versi v ON v.id=d.current_published_version_id
        JOIN dokumen_versi_kategori vk ON vk.dokumen_versi_id=v.id
        WHERE d.deleted_at IS NULL AND d.peruntukan IS NULL AND v.status_workflow='TERBIT' AND v.tingkat_akses='publik'
          AND d.jenis_dokumen_id=?
        GROUP BY vk.kategori_id
      ) c ON c.kategori_id=k.id WHERE k.aktif=1 ORDER BY k.nama`, [sopTypeId]);
  }
  years() {
    return this.repo.rows(this.repo.pool, `SELECT DISTINCT v.tahun FROM dokumen d
      JOIN dokumen_versi v ON v.id=d.current_published_version_id
      WHERE d.deleted_at IS NULL AND d.peruntukan IS NULL AND v.status_workflow='TERBIT' AND v.tingkat_akses='publik'
        AND v.tahun IS NOT NULL ORDER BY v.tahun DESC`);
  }
}
