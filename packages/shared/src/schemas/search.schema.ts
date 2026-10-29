import { z } from 'zod';
import { skemaPeruntukanDokumen } from './dokumen.schema.js';
import { skemaStatusHukum, skemaStatusWorkflow, skemaTingkatAkses } from '../enums.js';
import { URUTAN_DOKUMEN } from '../api.js';
import {
  skemaId,
  skemaSlug,
  skemaTahun,
  skemaTanggal,
  skemaHalaman,
  teksWajib,
  skemaTanggapanHalaman,
  skemaKataKunci,
} from './common.schema.js';
const tahunKueri = z.union([
  skemaTahun,
  z
    .string()
    .regex(/^[0-9]{4}$/)
    .transform(Number)
    .pipe(skemaTahun),
]);
/** q searches metadata only: title, number, year, type, category, tags. */
export const skemaCariDokumen = skemaHalaman.extend({
  q: z.string().trim().max(200).optional(),
  jenisDokumenId: skemaId.optional(),
  tahun: tahunKueri.optional(),
  unitKerjaId: skemaId.optional(),
  kategoriId: skemaId.optional(),
  statusHukum: skemaStatusHukum.optional(),
  urut: z.enum(URUTAN_DOKUMEN).default('relevansi'),
});
export const skemaCariDokumenAdmin = skemaCariDokumen.extend({
  statusWorkflow: skemaStatusWorkflow.optional(),
  tingkatAkses: skemaTingkatAkses.optional(),
});
/** Filter koleksi panel diterapkan sebelum hitung total dan pagination. */
export const skemaDaftarDokumenPanel = z.strictObject({
  halaman: skemaHalaman.shape.halaman,
  perHalaman: skemaHalaman.shape.perHalaman,
  q: skemaKataKunci,
  statusWorkflow: z
    .enum(['DRAF', 'DIAJUKAN', 'REVISI', 'DISETUJUI', 'TERBIT', 'DIGANTI', 'DITARIK'])
    .optional(),
  peruntukan: skemaPeruntukanDokumen.optional(),
  kelompok: z.enum(['PRODUK_HUKUM', 'SOP']).optional(),
  cakupan: z.enum(['TERVERIFIKASI', 'PENGAJUAN']).default('TERVERIFIKASI'),
});
const ringkasan = {
  id: skemaId,
  slug: skemaSlug,
  tipe: teksWajib(150, 'Tipe'),
  judul: teksWajib(500, 'Judul'),
  nomor: teksWajib(100, 'Nomor'),
  tahun: skemaTahun.nullable(),
  tanggalPenetapan: skemaTanggal,
  statusHukum: skemaStatusHukum,
  /** Jumlah orang yang telah melihat dokumen ini. */
  dilihat: z.number().int().min(0),
};
/**
 * Hasil cari untuk yang TIDAK berhak melihat dokumen Internal (pengunjung anonim
 * maupun akun yang belum aktif). Hanya dokumen publik, dan sengaja tanpa label
 * atau tingkat akses apa pun: publik tidak boleh tahu ada dokumen Internal,
 * dan label "PUBLIK" pun sudah menyiratkan adanya tingkat lain.
 */
export const skemaHasilCariPublik = z.strictObject({ ...ringkasan });
export const skemaHasilCariAnonim = skemaHasilCariPublik;
export const skemaTanggapanCariAnonim = skemaTanggapanHalaman(skemaHasilCariAnonim);
/**
 * Tahun penetapan yang memiliki sekurang-kurangnya satu dokumen PUBLIK terbit,
 * terurut menurun. Dipakai menu "Berdasarkan Tahun" dan pilihan tahun di beranda.
 * Sengaja tidak menghitung dokumen Internal, agar tahun yang hanya berisi dokumen
 * Internal tidak membocorkan keberadaannya.
 */
export const skemaTahunTersedia = z.array(skemaTahun);
/** Only for an authenticated channel AFTER backend policy filtering. */
export const skemaHasilCariAuthorized = z.strictObject({
  ...ringkasan,
  tingkatAkses: skemaTingkatAkses,
});
export const skemaTanggapanCariAuthorized = skemaTanggapanHalaman(skemaHasilCariAuthorized);
/**
 * Jumlah hasil per jenis dokumen untuk penyaring yang sama (tanpa penyaring
 * jenis). Mengikuti aturan akses pencarian: yang tidak berhak hanya menghitung
 * dokumen publik.
 */
export const skemaFasetCari = z.strictObject({
  total: z.number().int().min(0),
  perJenis: z.array(z.strictObject({ jenisDokumenId: skemaId, jumlah: z.number().int().min(0) })),
});
export type FasetCari = z.infer<typeof skemaFasetCari>;
export type KueriCariDokumen = z.infer<typeof skemaCariDokumen>;
export type KueriCariDokumenAdmin = z.infer<typeof skemaCariDokumenAdmin>;
export type HasilCariAnonim = z.infer<typeof skemaHasilCariAnonim>;
export type HasilCariAuthorized = z.infer<typeof skemaHasilCariAuthorized>;
export type TahunTersedia = z.infer<typeof skemaTahunTersedia>;

/** Satu snapshot beranda; hanya dokumen PUBLIK yang sedang TERBIT. */
export const skemaBerandaPublik = z.strictObject({
  jenis: z.array(
    z.strictObject({
      id: skemaId,
      kode: z.string(),
      nama: teksWajib(150, 'Jenis'),
      jumlah: z.number().int().min(0),
      dokumen: skemaHasilCariAnonim.nullable(),
    }),
  ),
  kategori: z.array(
    z.strictObject({
      id: skemaId,
      kode: z.string(),
      nama: teksWajib(150, 'Kategori'),
      jumlah: z.number().int().min(0),
    }),
  ),
  tahun: skemaTahunTersedia,
});
export type BerandaPublik = z.infer<typeof skemaBerandaPublik>;
