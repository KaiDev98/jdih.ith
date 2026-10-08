import { Injectable } from '@nestjs/common';
import type { RowDataPacket } from 'mysql2/promise';
import type { PenggunaAktif } from '@jdih/shared';
import {
  skemaCariDokumen,
  skemaHasilCariAnonim,
  skemaHasilCariAuthorized,
  skemaTanggapanCariAnonim,
  skemaTanggapanCariAuthorized,
  skemaTahunTersedia,
} from '@jdih/shared';
import { CoreBackendRepository } from '../core-backend.repository.js';

interface Filter { where: string[]; values: (string | number)[] }
const like = (value: string) => `%${value.replaceAll('!', '!!').replaceAll('%', '!%').replaceAll('_', '!_')}%`;

@Injectable()
export class SearchService {
  constructor(private readonly repo: CoreBackendRepository) {}

  private filters(query: ReturnType<typeof skemaCariDokumen.parse>): Filter {
    const where = [
      'd.deleted_at IS NULL',
      "v.status_workflow='TERBIT'",
      'd.current_published_version_id=v.id',
    ];
    const values: (string | number)[] = [];
    if (query.jenisDokumenId) {
      where.push('d.jenis_dokumen_id=?');
      values.push(query.jenisDokumenId);
    }
    if (query.tahun) {
      where.push('v.tahun=?');
      values.push(query.tahun);
    }
    if (query.unitKerjaId) {
      where.push('v.unit_kerja_id=?');
      values.push(query.unitKerjaId);
    }
    if (query.kategoriId) {
      where.push('EXISTS(SELECT 1 FROM dokumen_versi_kategori fvk WHERE fvk.dokumen_versi_id=v.id AND fvk.kategori_id=?)');
      values.push(query.kategoriId);
    }
    if (query.statusHukum) {
      where.push('d.status_hukum=?');
      values.push(query.statusHukum);
    }
    if (query.q) {
      const pattern = like(query.q);
      where.push(`(
        v.judul LIKE ? ESCAPE '!' OR v.nomor LIKE ? ESCAPE '!' OR CAST(v.tahun AS CHAR) LIKE ? ESCAPE '!'
        OR EXISTS(SELECT 1 FROM jenis_dokumen jk WHERE jk.id=d.jenis_dokumen_id AND jk.nama LIKE ? ESCAPE '!')
        OR EXISTS(SELECT 1 FROM dokumen_versi_kategori fvk JOIN kategori k ON k.id=fvk.kategori_id WHERE fvk.dokumen_versi_id=v.id AND k.nama LIKE ? ESCAPE '!')
        OR EXISTS(SELECT 1 FROM dokumen_versi_tag fvt JOIN tag t ON t.id=fvt.tag_id WHERE fvt.dokumen_versi_id=v.id AND t.nama LIKE ? ESCAPE '!')
      )`);
      values.push(pattern, pattern, pattern, pattern, pattern, pattern);
    }
    return { where, values };
  }

  async search(rawQuery: unknown, actor?: PenggunaAktif) {
    const query = skemaCariDokumen.parse(rawQuery);
    const filter = this.filters(query);
    const authorized = Boolean(actor?.status === 'AKTIF' && (
      actor.peran.includes('DOSEN_STAF') || actor.izin.includes('documents.read_admin')
    ));
    const anonymous = !authorized;
    // Yang tidak berhak hanya melihat dokumen publik — dokumen Internal tidak
    // muncul, tidak dihitung, dan tidak disiratkan dalam bentuk apa pun.
    const visibility = anonymous
      ? "v.tingkat_akses='publik'"
      : "v.tingkat_akses IN ('publik','internal')";
    const accessValues: (string | number)[] = [];
    const where = [...filter.where, visibility].join(' AND ');
    const [countRows] = await this.repo.rows<RowDataPacket & { total: string }>(
      this.repo.pool,
      `SELECT COUNT(*) total FROM dokumen d JOIN dokumen_versi v ON v.id=d.current_published_version_id WHERE ${where}`,
      [...filter.values, ...accessValues],
    );
    const offset = (query.halaman - 1) * query.perHalaman;
    const order: Record<(typeof query)['urut'], string> = {
      relevansi: 'v.published_at DESC,v.id DESC',
      terbaru: 'v.published_at DESC,v.id DESC',
      terlama: 'v.published_at ASC,v.id ASC',
      tahun_turun: 'v.tahun DESC,v.published_at DESC',
      tahun_naik: 'v.tahun ASC,v.published_at DESC',
      judul: 'v.judul ASC,v.id DESC',
    };
    const relevance = query.urut === 'relevansi' && query.q
      ? `CASE
           WHEN v.judul LIKE ? ESCAPE '!' THEN 0
           WHEN v.nomor LIKE ? ESCAPE '!' THEN 1
           WHEN CAST(v.tahun AS CHAR) LIKE ? ESCAPE '!' THEN 2
           WHEN EXISTS(SELECT 1 FROM jenis_dokumen jr WHERE jr.id=d.jenis_dokumen_id AND jr.nama LIKE ? ESCAPE '!') THEN 3
           WHEN EXISTS(SELECT 1 FROM dokumen_versi_kategori kvr JOIN kategori kr ON kr.id=kvr.kategori_id WHERE kvr.dokumen_versi_id=v.id AND kr.nama LIKE ? ESCAPE '!') THEN 4
           WHEN EXISTS(SELECT 1 FROM dokumen_versi_tag tvr JOIN tag tr ON tr.id=tvr.tag_id WHERE tvr.dokumen_versi_id=v.id AND tr.nama LIKE ? ESCAPE '!') THEN 5
           ELSE 6 END,v.published_at DESC,v.id DESC`
      : order[query.urut];
    const relevanceQuery = query.q;
    const relevanceValues = query.urut === 'relevansi' && relevanceQuery
      ? Array.from({ length: 6 }, () => like(relevanceQuery))
      : [];
    const rows = await this.repo.rows(
      this.repo.pool,
      `SELECT CAST(d.id AS CHAR) id,d.slug,j.nama tipe,v.judul,v.nomor,v.tahun,v.tanggal_penetapan tanggalPenetapan,d.status_hukum statusHukum,v.tingkat_akses tingkatAkses,COALESCE(st.jumlah_lihat,0) dilihat
       FROM dokumen d JOIN dokumen_versi v ON v.id=d.current_published_version_id JOIN jenis_dokumen j ON j.id=d.jenis_dokumen_id LEFT JOIN dokumen_statistik st ON st.dokumen_id=d.id
       WHERE ${where} ORDER BY ${relevance} LIMIT ? OFFSET ?`,
      [...filter.values, ...accessValues, ...relevanceValues, query.perHalaman, offset],
    );
    const data = anonymous
      ? rows.map((r) =>
          skemaHasilCariAnonim.parse({
            id: String(r.id),
            slug: String(r.slug),
            tipe: String(r.tipe),
            judul: String(r.judul),
            nomor: r.nomor == null ? null : String(r.nomor),
            tahun: r.tahun == null ? null : Number(r.tahun),
            tanggalPenetapan: r.tanggalPenetapan == null ? null : String(r.tanggalPenetapan),
            statusHukum: String(r.statusHukum),
            dilihat: Number(r.dilihat),
          }),
        )
      : rows.map((r) =>
          skemaHasilCariAuthorized.parse({
            id: String(r.id),
            slug: String(r.slug),
            tipe: String(r.tipe),
            judul: String(r.judul),
            nomor: r.nomor == null ? null : String(r.nomor),
            tahun: r.tahun == null ? null : Number(r.tahun),
            tanggalPenetapan: r.tanggalPenetapan == null ? null : String(r.tanggalPenetapan),
            statusHukum: String(r.statusHukum),
            dilihat: Number(r.dilihat),
            tingkatAkses: String(r.tingkatAkses),
          }),
        );
    const total = Number(countRows?.total ?? 0);
    const response = {
      sukses: true as const,
      data,
      meta: {
        halaman: query.halaman,
        perHalaman: query.perHalaman,
        totalButir: total,
        totalHalaman: Math.ceil(total / query.perHalaman),
        adaSebelumnya: query.halaman > 1,
        adaBerikutnya: offset + data.length < total,
      },
    };
    return anonymous
      ? skemaTanggapanCariAnonim.parse(response)
      : skemaTanggapanCariAuthorized.parse(response);
  }

  async publicList(rawQuery: unknown) {
    const query = skemaCariDokumen.parse(rawQuery);
    const filter = this.filters(query);
    const where = [...filter.where, "v.tingkat_akses='publik'"].join(' AND ');
    const [countRows] = await this.repo.rows<RowDataPacket & { total: string }>(
      this.repo.pool,
      `SELECT COUNT(*) total FROM dokumen d JOIN dokumen_versi v ON v.id=d.current_published_version_id WHERE ${where}`,
      filter.values,
    );
    const offset = (query.halaman - 1) * query.perHalaman;
    const rows = await this.repo.rows(
      this.repo.pool,
      `SELECT CAST(d.id AS CHAR) id,d.slug,j.nama tipe,v.judul,v.nomor,v.tahun,v.tanggal_penetapan tanggalPenetapan,d.status_hukum statusHukum,COALESCE(st.jumlah_lihat,0) dilihat
       FROM dokumen d JOIN dokumen_versi v ON v.id=d.current_published_version_id JOIN jenis_dokumen j ON j.id=d.jenis_dokumen_id LEFT JOIN dokumen_statistik st ON st.dokumen_id=d.id
       WHERE ${where} ORDER BY v.published_at DESC,v.id DESC LIMIT ? OFFSET ?`,
      [...filter.values, query.perHalaman, offset],
    );
    const data = rows.map((row) =>
      skemaHasilCariAnonim.parse({ ...row, dilihat: Number(row.dilihat) }),
    );
    const total = Number(countRows?.total ?? 0);
    return skemaTanggapanCariAnonim.parse({
      sukses: true,
      data,
      meta: {
        halaman: query.halaman,
        perHalaman: query.perHalaman,
        totalButir: total,
        totalHalaman: Math.ceil(total / query.perHalaman),
        adaSebelumnya: query.halaman > 1,
        adaBerikutnya: offset + data.length < total,
      },
    });
  }

  /** Tahun yang memiliki dokumen publik terbit; tidak pernah menghitung Internal/Rahasia. */
  async publicYears() {
    const rows = await this.repo.rows<RowDataPacket & { tahun: number | string }>(
      this.repo.pool,
      `SELECT DISTINCT v.tahun FROM dokumen d JOIN dokumen_versi v ON v.id=d.current_published_version_id
       WHERE d.deleted_at IS NULL AND v.status_workflow='TERBIT' AND v.tingkat_akses='publik' AND v.tahun IS NOT NULL
       ORDER BY v.tahun DESC`,
    );
    return skemaTahunTersedia.parse(rows.map((row) => Number(row.tahun)));
  }

  async latestPublic() {
    const page = await this.publicList({ halaman: 1, perHalaman: 1 });
    return page.data[0] ?? null;
  }
}
