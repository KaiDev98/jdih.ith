/**
 * Enumerasi domain Portal JDIH ITH.
 *
 * Seluruh nilai di sini HARUS sama persis dengan kolom ENUM dan data referensi
 * pada database/jdih_ith_schema.sql serta database/jdih_ith_seed.sql. Bila salah
 * satu berubah, keduanya wajib diubah bersamaan.
 *
 * Rujukan: docs/04-struktur-basis-data.md, docs/03-erd.md
 */

/* ────────────────────────── Dokumen: akses & publikasi ───────────────────── */

/**
 * Tingkat akses dokumen — menentukan SEBERAPA TERBUKA suatu dokumen.
 * Berbeda dari status publikasi, yang menentukan apakah dokumen sudah selesai
 * diproses. Rujukan: docs/05-role-permission.md § E.5.1
 */
export const TINGKAT_AKSES = ['publik', 'internal', 'terbatas', 'rahasia'] as const;
export type TingkatAkses = (typeof TINGKAT_AKSES)[number];

export const LABEL_TINGKAT_AKSES: Record<TingkatAkses, string> = {
  publik: 'Publik (Akses Terbuka)',
  internal: 'Internal (Perlu Masuk)',
  terbatas: 'Terbatas (Perlu Izin)',
  rahasia: 'Rahasia',
};

/**
 * Status publikasi — posisi dokumen dalam alur kerja pengelolaan. Hanya 'terbit'
 * yang pernah tampil pada kanal publik, tanpa memandang tingkat aksesnya.
 */
export const STATUS_PUBLIKASI = [
  'draf',
  'diajukan',
  'revisi',
  'disetujui',
  'terbit',
  'ditarik',
] as const;
export type StatusPublikasi = (typeof STATUS_PUBLIKASI)[number];

export const LABEL_STATUS_PUBLIKASI: Record<StatusPublikasi, string> = {
  draf: 'Draf',
  diajukan: 'Diajukan',
  revisi: 'Perlu Revisi',
  disetujui: 'Disetujui',
  terbit: 'Terbit',
  ditarik: 'Ditarik',
};

/** Satu-satunya status publikasi yang tampil ke publik. */
export const STATUS_PUBLIKASI_TAMPIL_PUBLIK: StatusPublikasi = 'terbit';

/**
 * Transisi status publikasi yang sah. Setiap kunci adalah status asal, nilainya
 * adalah status tujuan yang diizinkan (docs/01-analisis-kebutuhan.md § BR-06).
 */
export const TRANSISI_PUBLIKASI: Record<StatusPublikasi, readonly StatusPublikasi[]> = {
  draf: ['diajukan'],
  diajukan: ['revisi', 'disetujui'],
  revisi: ['diajukan'],
  disetujui: ['terbit', 'revisi'],
  terbit: ['ditarik'],
  ditarik: ['draf'],
};

/** Memeriksa apakah perpindahan status publikasi diizinkan. */
export function transisiPublikasiSah(dari: StatusPublikasi, ke: StatusPublikasi): boolean {
  return TRANSISI_PUBLIKASI[dari].includes(ke);
}

/* ─────────────────────── Dokumen: keberlakuan hukum ──────────────────────── */

/**
 * Status keberlakuan hukum — kedudukan hukum peraturan, terlepas dari status
 * publikasinya. Diambil dari tabel referensi `status_dokumen` kolom `kode`.
 */
export const STATUS_KEBERLAKUAN = [
  'berlaku',
  'diubah',
  'dicabut_sebagian',
  'belum_berlaku',
  'dicabut',
  'tidak_berlaku',
] as const;
export type StatusKeberlakuan = (typeof STATUS_KEBERLAKUAN)[number];

export const LABEL_STATUS_KEBERLAKUAN: Record<StatusKeberlakuan, string> = {
  berlaku: 'Berlaku',
  diubah: 'Diubah',
  dicabut_sebagian: 'Dicabut Sebagian',
  belum_berlaku: 'Belum Berlaku',
  dicabut: 'Dicabut',
  tidak_berlaku: 'Tidak Berlaku',
};

/** Warna penanda status keberlakuan — selaras dengan kolom `warna` pada seed. */
export const WARNA_STATUS_KEBERLAKUAN: Record<StatusKeberlakuan, string> = {
  berlaku: '#16A34A',
  diubah: '#F59E0B',
  dicabut_sebagian: '#EA580C',
  belum_berlaku: '#3B82F6',
  dicabut: '#DC2626',
  tidak_berlaku: '#6B7280',
};

/** Status yang masih dapat dijadikan dasar hukum (kolom `is_berlaku_efektif`). */
export const STATUS_BERLAKU_EFEKTIF: readonly StatusKeberlakuan[] = [
  'berlaku',
  'diubah',
  'dicabut_sebagian',
];

/* ──────────────────────── Relasi antarperaturan ──────────────────────────── */

/**
 * Jenis relasi antarperaturan. Relasi disimpan SATU ARAH pada basis data lalu
 * ditampilkan dua arah secara turunan, sehingga tidak mungkin ada pasangan
 * relasi yang tidak sinkron (docs/01-analisis-kebutuhan.md § BR-19).
 */
export const JENIS_RELASI = [
  'dasar_hukum',
  'mengubah',
  'mencabut',
  'mencabut_sebagian',
  'dilaksanakan_oleh',
  'juknis',
  'terkait',
] as const;
export type JenisRelasi = (typeof JENIS_RELASI)[number];

export const LABEL_JENIS_RELASI: Record<JenisRelasi, string> = {
  dasar_hukum: 'Dasar Hukum',
  mengubah: 'Mengubah',
  mencabut: 'Mencabut',
  mencabut_sebagian: 'Mencabut Sebagian',
  dilaksanakan_oleh: 'Dilaksanakan oleh',
  juknis: 'Petunjuk Teknis',
  terkait: 'Terkait',
};

/** Label arah kebalikan, dipakai saat menampilkan dari sisi dokumen sasaran. */
export const LABEL_JENIS_RELASI_KEBALIKAN: Record<JenisRelasi, string> = {
  dasar_hukum: 'Menjadi Dasar Hukum bagi',
  mengubah: 'Diubah oleh',
  mencabut: 'Dicabut oleh',
  mencabut_sebagian: 'Dicabut Sebagian oleh',
  dilaksanakan_oleh: 'Melaksanakan',
  juknis: 'Petunjuk Teknis dari',
  terkait: 'Terkait',
};

/** Relasi yang mengusulkan perubahan status keberlakuan pada dokumen sasaran. */
export const RELASI_MENGUBAH_STATUS: Record<JenisRelasi, StatusKeberlakuan | null> = {
  dasar_hukum: null,
  mengubah: 'diubah',
  mencabut: 'dicabut',
  mencabut_sebagian: 'dicabut_sebagian',
  dilaksanakan_oleh: null,
  juknis: null,
  terkait: null,
};

/* ──────────────────────────── Berkas dokumen ─────────────────────────────── */

export const JENIS_BERKAS = [
  'dokumen_utama',
  'lampiran',
  'abstrak',
  'naskah_akademik',
  'terjemahan',
  'dokumen_pencabut',
] as const;
export type JenisBerkas = (typeof JENIS_BERKAS)[number];

export const LABEL_JENIS_BERKAS: Record<JenisBerkas, string> = {
  dokumen_utama: 'Naskah Peraturan',
  lampiran: 'Lampiran',
  abstrak: 'Abstrak',
  naskah_akademik: 'Naskah Akademik',
  terjemahan: 'Terjemahan',
  dokumen_pencabut: 'Dokumen Pencabut',
};

export const STATUS_EKSTRAKSI = ['menunggu', 'berhasil', 'gagal', 'tidak_perlu'] as const;
export type StatusEkstraksi = (typeof STATUS_EKSTRAKSI)[number];

/* ──────────────────────────────── Pengguna ───────────────────────────────── */

export const STATUS_PENGGUNA = [
  'menunggu_verifikasi',
  'aktif',
  'nonaktif',
  'ditangguhkan',
] as const;
export type StatusPengguna = (typeof STATUS_PENGGUNA)[number];

export const LABEL_STATUS_PENGGUNA: Record<StatusPengguna, string> = {
  menunggu_verifikasi: 'Menunggu Verifikasi',
  aktif: 'Aktif',
  nonaktif: 'Nonaktif',
  ditangguhkan: 'Ditangguhkan',
};

export const SUMBER_AKUN = ['lokal', 'sso'] as const;
export type SumberAkun = (typeof SUMBER_AKUN)[number];

/* ────────────────────────── Permintaan akses ─────────────────────────────── */

export const STATUS_PERMINTAAN_AKSES = ['menunggu', 'disetujui', 'ditolak', 'kedaluwarsa'] as const;
export type StatusPermintaanAkses = (typeof STATUS_PERMINTAAN_AKSES)[number];

export const LABEL_STATUS_PERMINTAAN_AKSES: Record<StatusPermintaanAkses, string> = {
  menunggu: 'Menunggu Keputusan',
  disetujui: 'Disetujui',
  ditolak: 'Ditolak',
  kedaluwarsa: 'Kedaluwarsa',
};

/* ───────────────────────────── Unit kerja ────────────────────────────────── */

export const JENIS_UNIT_KERJA = [
  'institut',
  'senat',
  'rektorat',
  'biro',
  'fakultas',
  'jurusan',
  'prodi',
  'lembaga',
  'upt',
  'satuan',
  'unit',
  'eksternal',
] as const;
export type JenisUnitKerja = (typeof JENIS_UNIT_KERJA)[number];

/* ───────────────────────── Konten informasi hukum ───────────────────────── */

export const TIPE_KONTEN = ['berita', 'artikel_hukum', 'pengumuman', 'siaran_pers'] as const;
export type TipeKonten = (typeof TIPE_KONTEN)[number];

export const LABEL_TIPE_KONTEN: Record<TipeKonten, string> = {
  berita: 'Berita',
  artikel_hukum: 'Artikel dan Kajian Hukum',
  pengumuman: 'Pengumuman',
  siaran_pers: 'Siaran Pers',
};

export const STATUS_KONTEN = ['draf', 'ditinjau', 'terbit', 'arsip'] as const;
export type StatusKonten = (typeof STATUS_KONTEN)[number];

/* ───────────────────────── Integrasi dan sistem ─────────────────────────── */

export const SINKRON_JDIHN = ['belum', 'tertunda', 'terkirim', 'gagal'] as const;
export type SinkronJdihn = (typeof SINKRON_JDIHN)[number];

export const LINGKUP_DOKUMEN = ['internal', 'eksternal'] as const;
export type LingkupDokumen = (typeof LINGKUP_DOKUMEN)[number];

export const SUBJEK_AKSES = ['peran', 'unit_kerja', 'pengguna'] as const;
export type SubjekAkses = (typeof SUBJEK_AKSES)[number];

export const IZIN_BERKAS = ['lihat', 'unduh'] as const;
export type IzinBerkas = (typeof IZIN_BERKAS)[number];
