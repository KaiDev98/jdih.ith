/**
 * Skema pencarian dan pengelolaan dokumen hukum.
 *
 * Rujukan:
 *   - Pencarian delapan dimensi  : docs/06-fitur-dan-menu.md fitur F-10, F-11
 *   - Metadata standar JDIHN     : docs/01-analisis-kebutuhan.md § A.8
 *   - Aturan bisnis penomoran    : docs/01-analisis-kebutuhan.md § BR-01, BR-02
 */

import { z } from 'zod';
import {
  JENIS_BERKAS,
  JENIS_RELASI,
  LINGKUP_DOKUMEN,
  STATUS_KEBERLAKUAN,
  STATUS_PUBLIKASI,
  SUBJEK_AKSES,
  IZIN_BERKAS,
  TINGKAT_AKSES,
} from '../enums.js';
import { URUTAN_DOKUMEN } from '../api.js';
import {
  daftarIdTerpisahKoma,
  daftarTeksTerpisahKoma,
  skemaHalaman,
  skemaTahun,
  skemaTanggal,
  teksOpsional,
  teksWajib,
} from './common.schema.js';

/* ══════════════════════════════════════════════════════════════════════════
   PENCARIAN
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Kueri pencarian dokumen — delapan dimensi penyaring sebagaimana disyaratkan
 * pada ketentuan sistem: judul/isi, nomor, jenis peraturan, tahun, unit kerja,
 * kategori, status, dan kata kunci; ditambah bidang hukum dan penandatangan.
 *
 * Seluruh penyaring bersifat opsional dan dapat digabungkan. Karena nilainya
 * datang sebagai parameter kueri berupa teks, penguraiannya eksplisit melalui
 * `daftarIdTerpisahKoma` dan `z.coerce`.
 */
export const skemaCariDokumen = skemaHalaman.extend({
  /** Kata kunci bebas: menjangkau judul, nomor, abstrak, kata kunci, dan isi naskah. */
  q: z.string().trim().max(200).optional(),

  /** Pencarian khusus pada nomor peraturan. */
  nomor: z.string().trim().max(100).optional(),

  jenisPeraturanId: daftarIdTerpisahKoma.optional(),
  unitKerjaId: daftarIdTerpisahKoma.optional(),
  kategoriId: daftarIdTerpisahKoma.optional(),
  bidangHukumId: daftarIdTerpisahKoma.optional(),
  tagId: daftarIdTerpisahKoma.optional(),

  tahun: daftarIdTerpisahKoma.optional(),
  tahunDari: skemaTahun.optional(),
  tahunSampai: skemaTahun.optional(),

  tanggalPenetapanDari: skemaTanggal.optional(),
  tanggalPenetapanSampai: skemaTanggal.optional(),

  statusKeberlakuan: daftarTeksTerpisahKoma.pipe(z.array(z.enum(STATUS_KEBERLAKUAN))).optional(),

  penandatangan: z.string().trim().max(150).optional(),
  lingkup: z.enum(LINGKUP_DOKUMEN).optional(),

  /**
   * Hanya bermakna di panel administrasi. Pada kanal publik, penyaring ini
   * diabaikan dan status selalu dipaksa menjadi 'terbit' di sisi peladen —
   * penyaring dari peramban tidak pernah menjadi dasar keputusan keamanan.
   */
  statusPublikasi: daftarTeksTerpisahKoma.pipe(z.array(z.enum(STATUS_PUBLIKASI))).optional(),
  tingkatAkses: daftarTeksTerpisahKoma.pipe(z.array(z.enum(TINGKAT_AKSES))).optional(),

  urut: z.enum(URUTAN_DOKUMEN).default('relevansi'),

  /** Menyertakan hitungan per nilai penyaring pada tanggapan (fitur F-12). */
  denganAspek: z.coerce.boolean().default(false),
});
export type KueriCariDokumen = z.infer<typeof skemaCariDokumen>;

/* ══════════════════════════════════════════════════════════════════════════
   PENGINPUTAN DOKUMEN — EMPAT LANGKAH
   ══════════════════════════════════════════════════════════════════════════ */

/** Langkah 1 — Identitas dokumen. */
export const skemaDokumenIdentitas = z.object({
  jenisPeraturanId: z.coerce.number().int().positive({ message: 'Jenis peraturan wajib dipilih' }),
  nomor: teksWajib(100, 'Nomor peraturan'),
  tahun: skemaTahun,
  judul: teksWajib(500, 'Judul peraturan'),
  /** Tajuk Entri Utama. Disusun otomatis oleh peladen bila dibiarkan kosong. */
  teu: teksOpsional(255),
  tempatPenetapan: teksOpsional(100),
  tanggalPenetapan: skemaTanggal,
  tanggalBerlaku: skemaTanggal.optional(),
  tanggalPengundangan: skemaTanggal.optional(),
  penandatangan: teksOpsional(150),
  jabatanPenandatangan: teksOpsional(150),
  unitKerjaId: z.coerce.number().int().positive({ message: 'Unit kerja wajib dipilih' }),
  lingkup: z.enum(LINGKUP_DOKUMEN).default('internal'),
});

/** Langkah 2 — Klasifikasi. */
export const skemaDokumenKlasifikasi = z.object({
  bidangHukumId: z.coerce.number().int().positive().optional(),
  kategoriId: z.array(z.coerce.number().int().positive()).default([]),
  /** Kata kunci boleh berupa id yang sudah ada atau teks baru yang akan dibuat. */
  tag: z.array(z.string().trim().min(1).max(100)).max(30, 'Maksimum 30 kata kunci').default([]),
  bahasa: z.string().trim().length(2).default('id'),
  sumber: teksOpsional(255),
  lokasiArsip: teksOpsional(255),
  deskripsiFisik: teksOpsional(255),
});

/** Langkah 3 — Substansi dan relasi. */
export const skemaDokumenRelasi = z.object({
  dokumenTujuanId: z.coerce.number().int().positive(),
  jenisRelasi: z.enum(JENIS_RELASI),
  catatan: teksOpsional(500),
});
export type MuatanDokumenRelasi = z.infer<typeof skemaDokumenRelasi>;

export const skemaDokumenSubstansi = z.object({
  abstrak: teksOpsional(5000),
  isiTeks: z.string().trim().max(2_000_000).optional(),
  catatanInternal: teksOpsional(2000),
  relasi: z.array(skemaDokumenRelasi).default([]),
});

/** Langkah 4 — Berkas dan akses. */
export const skemaAturanAkses = z.object({
  subjekTipe: z.enum(SUBJEK_AKSES),
  /** Id peran, unit kerja, atau pengguna — bergantung pada `subjekTipe`. */
  subjekId: z.coerce.number().int().positive(),
  izin: z.enum(IZIN_BERKAS).default('unduh'),
  /** Menyertakan seluruh unit bawahan, hanya bermakna bila subjekTipe = 'unit_kerja'. */
  termasukBawahan: z.boolean().default(false),
});
export type MuatanAturanAkses = z.infer<typeof skemaAturanAkses>;

export const skemaDokumenAkses = z
  .object({
    tingkatAkses: z.enum(TINGKAT_AKSES).default('publik'),
    daftarAkses: z.array(skemaAturanAkses).default([]),
  })
  .refine((nilai) => nilai.tingkatAkses !== 'terbatas' || nilai.daftarAkses.length > 0, {
    message:
      'Dokumen bertingkat akses terbatas harus memiliki sekurang-kurangnya satu aturan akses, ' +
      'jika tidak maka tidak akan pernah dapat diunduh siapa pun',
    path: ['daftarAkses'],
  });

/** Muatan pembuatan dokumen baru: gabungan keempat langkah. */
export const skemaBuatDokumen = skemaDokumenIdentitas
  .merge(skemaDokumenKlasifikasi)
  .merge(skemaDokumenSubstansi)
  .extend({
    tingkatAkses: z.enum(TINGKAT_AKSES).default('publik'),
    daftarAkses: z.array(skemaAturanAkses).default([]),
  })
  .refine((nilai) => nilai.tingkatAkses !== 'terbatas' || nilai.daftarAkses.length > 0, {
    message:
      'Dokumen bertingkat akses terbatas harus memiliki sekurang-kurangnya satu aturan akses',
    path: ['daftarAkses'],
  })
  .refine(
    (nilai) =>
      !nilai.tanggalBerlaku ||
      Date.parse(nilai.tanggalBerlaku) >= Date.parse(nilai.tanggalPenetapan),
    {
      message: 'Tanggal mulai berlaku tidak boleh mendahului tanggal penetapan',
      path: ['tanggalBerlaku'],
    },
  );
export type MuatanBuatDokumen = z.infer<typeof skemaBuatDokumen>;

/** Pembaruan dokumen: seluruh ruas opsional, tetapi aturan silangnya tetap berlaku. */
export const skemaUbahDokumen = skemaDokumenIdentitas
  .merge(skemaDokumenKlasifikasi)
  .merge(skemaDokumenSubstansi)
  .extend({ tingkatAkses: z.enum(TINGKAT_AKSES).optional() })
  .partial()
  .refine(
    (nilai) =>
      !nilai.tanggalBerlaku ||
      !nilai.tanggalPenetapan ||
      Date.parse(nilai.tanggalBerlaku) >= Date.parse(nilai.tanggalPenetapan),
    {
      message: 'Tanggal mulai berlaku tidak boleh mendahului tanggal penetapan',
      path: ['tanggalBerlaku'],
    },
  );
export type MuatanUbahDokumen = z.infer<typeof skemaUbahDokumen>;

/* ══════════════════════════════════════════════════════════════════════════
   ALUR KERJA PUBLIKASI
   ══════════════════════════════════════════════════════════════════════════ */

export const skemaAjukanDokumen = z.object({
  catatan: teksOpsional(1000),
});

export const skemaKeputusanVerifikasi = z.discriminatedUnion('keputusan', [
  z.object({
    keputusan: z.literal('setujui'),
    catatan: teksOpsional(1000),
  }),
  z.object({
    keputusan: z.literal('kembalikan'),
    /** Catatan perbaikan wajib: tanpa itu, penginput tidak tahu apa yang harus diubah. */
    catatan: teksWajib(1000, 'Catatan perbaikan'),
  }),
  z.object({
    keputusan: z.literal('tolak'),
    catatan: teksWajib(1000, 'Alasan penolakan'),
  }),
]);
export type MuatanKeputusanVerifikasi = z.infer<typeof skemaKeputusanVerifikasi>;

export const skemaTerbitkanDokumen = z.object({
  /** Dibiarkan kosong berarti terbit sekarang. */
  terbitPada: z.string().datetime({ offset: true }).optional(),
});
export type MuatanTerbitkanDokumen = z.infer<typeof skemaTerbitkanDokumen>;

export const skemaTarikDokumen = z.object({
  alasan: teksWajib(1000, 'Alasan penarikan'),
});

export const skemaUbahStatusKeberlakuan = z.object({
  statusKeberlakuan: z.enum(STATUS_KEBERLAKUAN),
  berlakuSejak: skemaTanggal.optional(),
  catatan: teksOpsional(1000),
});
export type MuatanUbahStatusKeberlakuan = z.infer<typeof skemaUbahStatusKeberlakuan>;

/* ══════════════════════════════════════════════════════════════════════════
   BERKAS DAN PERMINTAAN AKSES
   ══════════════════════════════════════════════════════════════════════════ */

export const skemaMetaBerkas = z.object({
  jenisBerkas: z.enum(JENIS_BERKAS).default('dokumen_utama'),
  judulBerkas: teksOpsional(255),
  urutan: z.coerce.number().int().min(0).default(0),
});
export type MuatanMetaBerkas = z.infer<typeof skemaMetaBerkas>;

export const skemaMintaAkses = z.object({
  dokumenId: z.coerce.number().int().positive(),
  alasan: teksWajib(1000, 'Alasan kebutuhan'),
  keperluan: teksOpsional(255),
});
export type MuatanMintaAkses = z.infer<typeof skemaMintaAkses>;

export const skemaPutuskanAkses = z.discriminatedUnion('keputusan', [
  z.object({
    keputusan: z.literal('setujui'),
    /** Dibiarkan kosong berarti akses tanpa batas waktu. */
    berlakuHingga: skemaTanggal.optional(),
    catatan: teksOpsional(1000),
  }),
  z.object({
    keputusan: z.literal('tolak'),
    catatan: teksWajib(1000, 'Alasan penolakan'),
  }),
]);
export type MuatanPutuskanAkses = z.infer<typeof skemaPutuskanAkses>;
