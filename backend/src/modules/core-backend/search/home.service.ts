import { Injectable } from '@nestjs/common';
import {
  macamJenis,
  skemaBerandaPublik,
  type BerandaPublik,
  type PenggunaAktif,
} from '@jdih/shared';
import { HomeRepository } from './home.repository.js';
import { bolehBacaInternal } from '../../identity/security.js';

@Injectable()
export class HomeService {
  constructor(private readonly repo: HomeRepository) {}
  private readonly pending = new Map<boolean, Promise<BerandaPublik>>();
  /** Gabungkan permintaan serentak saja. Hasil tidak disimpan setelah selesai,
   * sehingga terbit/tarik/perubahan akses langsung dibaca pada permintaan berikut. */
  snapshot(actor?: PenggunaAktif) {
    const internal = bolehBacaInternal(actor);
    const pending = this.pending.get(internal);
    if (pending) return pending;
    // Hanya gabungkan request dengan cakupan sama; data Internal tidak boleh
    // dibagikan ke request anonim/pending yang datang bersamaan.
    const request = this.load(internal).finally(() => {
      this.pending.delete(internal);
    });
    this.pending.set(internal, request);
    return request;
  }
  private async load(internal: boolean) {
    const [types, years] = await Promise.all([
      this.repo.latestByType(internal),
      this.repo.years(internal),
    ]);
    const sop = types.find((r) => macamJenis(String(r.kode), String(r.nama)) === 'sop');
    const categories = await this.repo.categories(sop ? String(sop.jenisId) : null, internal);
    return skemaBerandaPublik.parse({
      jenis: types.map((r) => ({
        id: String(r.jenisId),
        kode: String(r.kode),
        nama: String(r.nama),
        jumlah: Number(r.jumlah),
        dokumen:
          r.id == null
            ? null
            : {
                id: String(r.id),
                slug: String(r.slug),
                tipe: String(r.nama),
                judul: String(r.judul),
                nomor: String(r.nomor),
                tahun: r.tahun == null ? null : Number(r.tahun),
                tanggalPenetapan: String(r.tanggalPenetapan),
                statusHukum: String(r.statusHukum),
                dilihat: Number(r.dilihat),
              },
      })),
      kategori: categories.map((r) => ({
        id: String(r.id),
        kode: String(r.kode),
        nama: String(r.nama),
        jumlah: Number(r.jumlah),
      })),
      tahun: years.map((r) => Number(r.tahun)),
    });
  }
}
