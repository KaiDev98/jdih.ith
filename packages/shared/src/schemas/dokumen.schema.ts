import { z } from 'zod';
import {
  skemaTingkatAkses,
  skemaStatusWorkflow,
  skemaStatusHukum,
  skemaJenisBerkas,
} from '../enums.js';
import {
  skemaId,
  skemaSlug,
  skemaTanggal,
  skemaTahun,
  skemaNomorVersi,
  teksWajib,
  skemaTanggapan,
} from './common.schema.js';

/** Kemampuan atas dokumen/versi dari backend; izin tindakan dan workflow tetap diperiksa. */
export const skemaKemampuanDokumenAdmin = z.strictObject({
  bolehUbah: z.boolean(),
  bolehRevisi: z.boolean(),
  bolehSetujuiLangsung: z.boolean().default(false),
  bolehJadiTargetRelasi: z.boolean().default(false),
});
export type KemampuanDokumenAdmin = z.infer<typeof skemaKemampuanDokumenAdmin>;

/** Teks bebas opsional: kosong disimpan sebagai NULL. */
function teksBebasOpsional(maksimum: number, label: string) {
  return z
    .string()
    .trim()
    .max(maksimum, `${label} paling banyak ${String(maksimum)} karakter`)
    .transform((nilai) => nilai || null)
    .nullable()
    .optional();
}
const metadataVersi = {
  judul: teksWajib(500, 'Judul'),
  /** Ringkasan isi dokumen untuk pembaca; opsional. */
  deskripsi: teksBebasOpsional(1000, 'Deskripsi'),
  nomor: teksWajib(100, 'Nomor').nullable().optional(),
  tahun: skemaTahun.nullable().optional(),
  pic: teksWajib(255, 'PIC').nullable().optional(),
  tanggalPenetapan: skemaTanggal.nullable().optional(),
  tingkatAkses: skemaTingkatAkses,
  unitKerjaId: skemaId.nullable().optional(),
  kategoriId: z.array(skemaId).optional(),
  tagId: z.array(skemaId).optional(),
};
/** Creation/status/actor/pointer/version numbering are assigned by the backend. */
export const skemaBuatVersiDokumen = z.strictObject(metadataVersi);
/**
 * Peruntukan khusus sebuah dokumen di portal, di luar daftar produk hukum
 * biasa. PERMOHONAN_SK: SOP yang tampil di halaman "SOP Permohonan SK" dan
 * dikelola dari menu tersendiri di panel admin. Hanya untuk jenis SOP.
 */
export const skemaPeruntukanDokumen = z.enum(['PERMOHONAN_SK']);
export const skemaUbahVersiDokumen = skemaBuatVersiDokumen
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Perubahan tidak boleh kosong');
export const skemaBuatDokumen = z.strictObject({
  kodeDokumen: teksWajib(64, 'Kode'),
  slug: skemaSlug,
  jenisDokumenId: skemaId,
  peruntukan: skemaPeruntukanDokumen.nullable().optional(),
  versi: skemaBuatVersiDokumen,
});
export const skemaUbahDokumen = z
  .strictObject({
    kodeDokumen: teksWajib(64, 'Kode').optional(),
    slug: skemaSlug.optional(),
    jenisDokumenId: skemaId.optional(),
    /** null melepas dokumen dari peruntukan khususnya. */
    peruntukan: skemaPeruntukanDokumen.nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Perubahan tidak boleh kosong');
/** Validate persisted version metadata; the backend separately checks UTAMA metadata and storage readiness. */
export const skemaKesiapanPublikasi = skemaBuatVersiDokumen.extend({
  nomor: teksWajib(100, 'Nomor'),
  pic: teksWajib(255, 'PIC'),
  tanggalPenetapan: skemaTanggal,
});
/** Pengajuan hanya diterima setelah seluruh metadata dan satu berkas lengkap. */
export const skemaKesiapanPengajuan = skemaKesiapanPublikasi.extend({
  deskripsi: teksWajib(1000, 'Deskripsi'),
  tahun: skemaTahun,
  kategoriId: z.array(skemaId).min(1, 'Kategori wajib dipilih'),
});
/** Pesan kelengkapan yang sama untuk panel dan API, tanpa rincian tipe internal Zod. */
export function pesanKekuranganPengajuan(issues: readonly { path: readonly PropertyKey[] }[]) {
  const label: Record<string, string> = {
    judul: 'Judul', deskripsi: 'Deskripsi', nomor: 'Nomor', tahun: 'Tahun', pic: 'PIC',
    tanggalPenetapan: 'Tanggal penetapan', tingkatAkses: 'Tingkat akses', kategoriId: 'Kategori',
  };
  return [...new Set(issues.map((i) => `${label[String(i.path[0])] ?? 'Data pengajuan'} wajib diisi dengan benar`))];
}
export const skemaDokumenAdmin = z.strictObject({
  id: skemaId,
  kodeDokumen: teksWajib(64, 'Kode'),
  slug: skemaSlug,
  jenisDokumenId: skemaId,
  statusHukum: skemaStatusHukum,
  currentPublishedVersionId: skemaId.nullable(),
});
export const skemaVersiDokumenAdmin = z.strictObject({
  ...metadataVersi,
  id: skemaId,
  dokumenId: skemaId,
  nomorVersi: skemaNomorVersi,
  statusWorkflow: skemaStatusWorkflow,
});
/**
 * Jenis berkas yang diterima (Produk Hukum maupun Format Persuratan): PDF dan
 * dokumen Office Open XML tanpa makro. Backend mengenali jenisnya dari isi berkas.
 */
export const skemaMimeBerkas = z.enum([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);
export const skemaMetaBerkas = z.strictObject({
  jenisBerkas: skemaJenisBerkas,
  judul: z.string().trim().max(255).optional(),
  urutan: z.number().int().min(0).max(4294967295).default(0),
});
export const skemaHasilUnggahBerkas = z.strictObject({
  id: skemaId,
  jenisBerkas: skemaJenisBerkas,
  namaAsli: teksWajib(255, 'Nama berkas'),
  mimeType: skemaMimeBerkas,
  sizeBytes: skemaId,
  checksum: z.string().regex(/^[a-f0-9]{64}$/),
});
const berkasAuthorized = {
  id: skemaId,
  namaAsli: teksWajib(255, 'Nama berkas'),
  /** Pratinjau di peramban hanya untuk PDF; jenis lain cukup diunduh. */
  kemampuan: z.strictObject({ preview: z.boolean(), download: z.literal(true) }),
};
export const skemaBerkasUtama = z.strictObject({
  ...berkasAuthorized,
  jenisBerkas: z.literal('UTAMA'),
});
export const skemaBerkasLampiran = z.strictObject({
  ...berkasAuthorized,
  jenisBerkas: z.literal('LAMPIRAN'),
});
/**
 * Keterangan untuk dokumen berstatus Diubah/Dicabut. `sumber` hanya diisi bila
 * dokumen pengubah/pencabut boleh dibaca peminta; bila tidak, `alasan` juga
 * dikosongkan agar isi dokumen tertutup tidak terbaca lewat keterangan ini.
 */
export const skemaKeteranganStatus = z.strictObject({
  tanggal: skemaTanggal,
  alasan: z.string().nullable(),
  sumber: z
    .strictObject({
      judul: teksWajib(500, 'Judul'),
      slug: skemaSlug,
      nomor: z.string().nullable(),
    })
    .nullable(),
});
/**
 * Satu baris "Status Peraturan" pada halaman dokumen, seperti JDIH BPK:
 * - DICABUT_DENGAN / DIUBAH_DENGAN: dokumen lain (sudah terbit) yang mencabut
 *   atau mengubah dokumen ini;
 * - MENCABUT / MENGUBAH: dokumen yang dicabut atau diubah oleh dokumen ini.
 * Hanya dokumen yang boleh dibaca peminta yang disebut.
 */
export const skemaJenisStatusPeraturan = z.enum([
  'DICABUT_DENGAN',
  'DIUBAH_DENGAN',
  'MENCABUT',
  'MENGUBAH',
]);
export const skemaStatusPeraturan = z.strictObject({
  jenis: skemaJenisStatusPeraturan,
  dokumen: z.strictObject({
    id: skemaId,
    slug: skemaSlug,
    tipe: teksWajib(150, 'Tipe'),
    judul: teksWajib(500, 'Judul'),
    nomor: z.string().nullable(),
    tahun: z.number().int().nullable(),
  }),
});
/** Jumlah orang (bukan klik) yang melihat dan mengunduh sebuah dokumen. */
export const skemaStatistikDokumen = z.strictObject({
  dilihat: z.number().int().min(0),
  diunduh: z.number().int().min(0),
});
const detail = {
  id: skemaId,
  slug: skemaSlug,
  tipe: teksWajib(150, 'Tipe'),
  judul: teksWajib(500, 'Judul'),
  deskripsi: z.string().nullable(),
  nomor: teksWajib(100, 'Nomor'),
  tanggalPenetapan: skemaTanggal,
  statusHukum: skemaStatusHukum,
  pic: teksWajib(255, 'PIC'),
  keteranganStatus: skemaKeteranganStatus.nullable(),
  statusPeraturan: z.array(skemaStatusPeraturan),
  statistik: skemaStatistikDokumen,
  berkasUtama: skemaBerkasUtama,
  lampiran: z.array(skemaBerkasLampiran),
};
/** Explicit projections after policy checks; never spread raw DB rows into responses. */
/** Untuk yang tidak berhak tahu ada tingkat akses lain: tanpa `tingkatAkses`. */
export const skemaDetailDokumenPublik = z.strictObject({
  ...detail,
});
export const skemaDetailDokumenAuthorized = z.strictObject({
  ...detail,
  tingkatAkses: skemaTingkatAkses,
});
export const skemaTanggapanDetailDokumenPublik = skemaTanggapan(skemaDetailDokumenPublik);
export const skemaTanggapanDetailDokumenAuthorized = skemaTanggapan(skemaDetailDokumenAuthorized);
export type MuatanBuatDokumen = z.infer<typeof skemaBuatDokumen>;
export type MuatanUbahDokumen = z.infer<typeof skemaUbahDokumen>;
export type PeruntukanDokumen = z.infer<typeof skemaPeruntukanDokumen>;
export type MuatanBuatVersiDokumen = z.infer<typeof skemaBuatVersiDokumen>;
export type MuatanUbahVersiDokumen = z.infer<typeof skemaUbahVersiDokumen>;
export type KesiapanPublikasi = z.infer<typeof skemaKesiapanPublikasi>;
export type DokumenAdmin = z.infer<typeof skemaDokumenAdmin>;
export type VersiDokumenAdmin = z.infer<typeof skemaVersiDokumenAdmin>;
export type MuatanMetaBerkas = z.infer<typeof skemaMetaBerkas>;
export type MimeBerkas = z.infer<typeof skemaMimeBerkas>;
export type DetailDokumenPublik = z.infer<typeof skemaDetailDokumenPublik>;
export type DetailDokumenAuthorized = z.infer<typeof skemaDetailDokumenAuthorized>;
export type KeteranganStatus = z.infer<typeof skemaKeteranganStatus>;
export type StatusPeraturan = z.infer<typeof skemaStatusPeraturan>;
export type StatistikDokumen = z.infer<typeof skemaStatistikDokumen>;
