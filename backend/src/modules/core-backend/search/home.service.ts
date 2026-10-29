import { Injectable } from '@nestjs/common';
import { macamJenis, skemaBerandaPublik, type BerandaPublik } from '@jdih/shared';
import { HomeRepository } from './home.repository.js';

@Injectable()
export class HomeService {
  constructor(private readonly repo: HomeRepository) {}
  private pending?: Promise<BerandaPublik>;
  /** Gabungkan permintaan serentak saja. Hasil tidak disimpan setelah selesai,
   * sehingga terbit/tarik/perubahan akses langsung dibaca pada permintaan berikut. */
  snapshot() {
    if (this.pending) return this.pending;
    this.pending = this.load().finally(() => { this.pending = undefined; });
    return this.pending;
  }
  private async load() {
    const [types, years] = await Promise.all([this.repo.latestByType(), this.repo.years()]);
    const sop = types.find(r => macamJenis(String(r.kode), String(r.nama)) === 'sop');
    const categories = await this.repo.categories(sop ? String(sop.jenisId) : null);
    return skemaBerandaPublik.parse({
      jenis: types.map(r => ({
        id: String(r.jenisId), kode: String(r.kode), nama: String(r.nama), jumlah: Number(r.jumlah),
        dokumen: r.id == null ? null : {
          id: String(r.id), slug: String(r.slug), tipe: String(r.nama), judul: String(r.judul),
          nomor: String(r.nomor), tahun: r.tahun == null ? null : Number(r.tahun),
          tanggalPenetapan: String(r.tanggalPenetapan), statusHukum: String(r.statusHukum), dilihat: Number(r.dilihat),
        },
      })),
      kategori: categories.map(r => ({ id: String(r.id), kode: String(r.kode), nama: String(r.nama), jumlah: Number(r.jumlah) })),
      tahun: years.map(r => Number(r.tahun)),
    });
  }
}
