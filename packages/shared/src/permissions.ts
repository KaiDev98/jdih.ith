/**
 * BERKAS INI DIBANGKITKAN OTOMATIS — JANGAN DISUNTING LANGSUNG.
 *
 * Sumber  : database/jdih_ith_seed.sql (blok INSERT INTO `izin`)
 * Pembangkit: scripts/gen-permissions.mjs
 * Perintah  : npm run gen:permissions
 *
 * Total 76 izin dalam 9 modul, 27 di antaranya berdampak tinggi.
 * Rujukan: docs/05-role-permission.md § E.3
 */

/** Seluruh kode izin sistem, dikelompokkan menurut modul. */
export const IZIN = {
  // ── Modul dokumen (27 izin) ──
  DOKUMEN_LIHAT_PUBLIK: 'dokumen.lihat_publik',
  DOKUMEN_UNDUH_PUBLIK: 'dokumen.unduh_publik',
  DOKUMEN_LIHAT_INTERNAL: 'dokumen.lihat_internal',
  DOKUMEN_UNDUH_INTERNAL: 'dokumen.unduh_internal',
  DOKUMEN_LIHAT_TERBATAS: 'dokumen.lihat_terbatas',
  DOKUMEN_UNDUH_TERBATAS: 'dokumen.unduh_terbatas',
  DOKUMEN_LIHAT_RAHASIA: 'dokumen.lihat_rahasia',
  DOKUMEN_LIHAT_ADMIN: 'dokumen.lihat_admin',
  DOKUMEN_BUAT: 'dokumen.buat',
  DOKUMEN_UBAH: 'dokumen.ubah',
  DOKUMEN_HAPUS: 'dokumen.hapus',
  DOKUMEN_PULIHKAN: 'dokumen.pulihkan',
  DOKUMEN_HAPUS_PERMANEN: 'dokumen.hapus_permanen',
  DOKUMEN_UNGGAH_BERKAS: 'dokumen.unggah_berkas',
  DOKUMEN_HAPUS_BERKAS: 'dokumen.hapus_berkas',
  DOKUMEN_KELOLA_RELASI: 'dokumen.kelola_relasi',
  DOKUMEN_UBAH_STATUS: 'dokumen.ubah_status',
  DOKUMEN_UBAH_AKSES: 'dokumen.ubah_akses',
  DOKUMEN_AJUKAN: 'dokumen.ajukan',
  DOKUMEN_VERIFIKASI: 'dokumen.verifikasi',
  DOKUMEN_TERBITKAN: 'dokumen.terbitkan',
  DOKUMEN_TARIK: 'dokumen.tarik',
  DOKUMEN_IMPOR: 'dokumen.impor',
  DOKUMEN_EKSPOR: 'dokumen.ekspor',
  DOKUMEN_OPERASI_MASSAL: 'dokumen.operasi_massal',
  DOKUMEN_LIHAT_RIWAYAT: 'dokumen.lihat_riwayat',
  DOKUMEN_PUTUSKAN_AKSES: 'dokumen.putuskan_akses',

  // ── Modul akses_pribadi (5 izin) ──
  AKSES_MINTA: 'akses.minta',
  AKSES_KOLEKSI: 'akses.koleksi',
  AKSES_RIWAYAT_UNDUH: 'akses.riwayat_unduh',
  PROFIL_UBAH: 'profil.ubah',
  PROFIL_UBAH_SANDI: 'profil.ubah_sandi',

  // ── Modul konten (9 izin) ──
  BERITA_LIHAT_ADMIN: 'berita.lihat_admin',
  BERITA_KELOLA: 'berita.kelola',
  BERITA_TERBITKAN: 'berita.terbitkan',
  BERITA_HAPUS: 'berita.hapus',
  HALAMAN_KELOLA: 'halaman.kelola',
  BANNER_KELOLA: 'banner.kelola',
  MEDIA_KELOLA: 'media.kelola',
  TAUTAN_KELOLA: 'tautan.kelola',
  FAQ_KELOLA: 'faq.kelola',

  // ── Modul interaksi (2 izin) ──
  KONTAK_LIHAT: 'kontak.lihat',
  KONTAK_KELOLA: 'kontak.kelola',

  // ── Modul master (8 izin) ──
  MASTER_LIHAT: 'master.lihat',
  UNIT_KERJA_KELOLA: 'unit_kerja.kelola',
  JENIS_PERATURAN_KELOLA: 'jenis_peraturan.kelola',
  KATEGORI_KELOLA: 'kategori.kelola',
  BIDANG_HUKUM_KELOLA: 'bidang_hukum.kelola',
  TAG_KELOLA: 'tag.kelola',
  STATUS_KELOLA: 'status.kelola',
  JENIS_RELASI_KELOLA: 'jenis_relasi.kelola',

  // ── Modul pengguna (7 izin) ──
  PENGGUNA_LIHAT: 'pengguna.lihat',
  PENGGUNA_KELOLA: 'pengguna.kelola',
  PENGGUNA_HAPUS: 'pengguna.hapus',
  PENGGUNA_RESET_SANDI: 'pengguna.reset_sandi',
  PENGGUNA_VERIFIKASI: 'pengguna.verifikasi',
  PENGGUNA_TETAPKAN_PERAN: 'pengguna.tetapkan_peran',
  PENGGUNA_TETAPKAN_UNIT: 'pengguna.tetapkan_unit',

  // ── Modul otorisasi (3 izin) ──
  PERAN_LIHAT: 'peran.lihat',
  PERAN_KELOLA: 'peran.kelola',
  IZIN_TETAPKAN_LANGSUNG: 'izin.tetapkan_langsung',

  // ── Modul sistem (10 izin) ──
  PANEL_AKSES: 'panel.akses',
  DASBOR_LIHAT: 'dasbor.lihat',
  LAPORAN_LIHAT: 'laporan.lihat',
  MENU_KELOLA: 'menu.kelola',
  SISTEM_KONFIGURASI: 'sistem.konfigurasi',
  SISTEM_LOG_AKTIVITAS: 'sistem.log_aktivitas',
  SISTEM_LOG_KEAMANAN: 'sistem.log_keamanan',
  SISTEM_CADANGAN: 'sistem.cadangan',
  SISTEM_PEMELIHARAAN: 'sistem.pemeliharaan',
  JDIHN_KELOLA: 'jdihn.kelola',

  // ── Modul layanan (5 izin) ──
  LAYANAN_AJUKAN: 'layanan.ajukan',
  LAYANAN_LIHAT_SENDIRI: 'layanan.lihat_sendiri',
  LAYANAN_KELOLA: 'layanan.kelola',
  LAYANAN_TUGASKAN: 'layanan.tugaskan',
  LAYANAN_MASTER: 'layanan.master',
} as const;

/** Tipe gabungan seluruh kode izin yang sah. Salah tulis akan ditangkap saat kompilasi. */
export type KodeIzin = (typeof IZIN)[keyof typeof IZIN];

/** Daftar rata seluruh kode izin. */
export const SEMUA_IZIN = Object.values(IZIN) as readonly KodeIzin[];

/** Nama modul izin yang dikenal. */
export const MODUL_IZIN = [
  'dokumen',
  'akses_pribadi',
  'konten',
  'interaksi',
  'master',
  'pengguna',
  'otorisasi',
  'sistem',
  'layanan',
] as const;
export type ModulIzin = (typeof MODUL_IZIN)[number];

/**
 * Izin berdampak tinggi. Pemberiannya kepada suatu peran memicu konfirmasi
 * tambahan pada antarmuka (docs/05-role-permission.md § E.3).
 */
export const IZIN_BERDAMPAK_TINGGI: readonly KodeIzin[] = [
  'dokumen.lihat_rahasia',
  'dokumen.hapus_permanen',
  'dokumen.ubah_status',
  'dokumen.ubah_akses',
  'dokumen.verifikasi',
  'dokumen.terbitkan',
  'dokumen.tarik',
  'dokumen.impor',
  'dokumen.operasi_massal',
  'unit_kerja.kelola',
  'jenis_peraturan.kelola',
  'status.kelola',
  'jenis_relasi.kelola',
  'pengguna.kelola',
  'pengguna.hapus',
  'pengguna.reset_sandi',
  'pengguna.tetapkan_peran',
  'pengguna.tetapkan_unit',
  'peran.kelola',
  'izin.tetapkan_langsung',
  'sistem.konfigurasi',
  'sistem.log_aktivitas',
  'sistem.log_keamanan',
  'sistem.cadangan',
  'sistem.pemeliharaan',
  'jdihn.kelola',
  'layanan.master',
];

/**
 * Izin yang dilarang secara struktural bagi peran selain Superadmin, karena
 * berpotensi menjadi jalur eskalasi hak akses (docs/05-role-permission.md § E.4).
 * Daftar putih ini ditegakkan di lapisan aplikasi, bukan hanya disembunyikan
 * pada antarmuka.
 */
export const IZIN_KHUSUS_SUPERADMIN: readonly KodeIzin[] = [
  IZIN.DOKUMEN_HAPUS_PERMANEN,
  IZIN.PENGGUNA_TETAPKAN_PERAN,
  IZIN.PERAN_KELOLA,
  IZIN.IZIN_TETAPKAN_LANGSUNG,
];

export interface MetaIzin {
  readonly kode: KodeIzin;
  readonly nama: string;
  readonly modul: ModulIzin;
  readonly berdampakTinggi: boolean;
  readonly urutan: number;
}

/** Katalog lengkap izin beserta nama tampilannya, untuk matriks izin di panel admin. */
export const KATALOG_IZIN: readonly MetaIzin[] = [
  {
    kode: 'dokumen.lihat_publik',
    nama: 'Melihat dokumen publik',
    modul: 'dokumen',
    berdampakTinggi: false,
    urutan: 1,
  },
  {
    kode: 'dokumen.unduh_publik',
    nama: 'Mengunduh dokumen publik',
    modul: 'dokumen',
    berdampakTinggi: false,
    urutan: 2,
  },
  {
    kode: 'dokumen.lihat_internal',
    nama: 'Melihat dokumen internal',
    modul: 'dokumen',
    berdampakTinggi: false,
    urutan: 3,
  },
  {
    kode: 'dokumen.unduh_internal',
    nama: 'Mengunduh dokumen internal',
    modul: 'dokumen',
    berdampakTinggi: false,
    urutan: 4,
  },
  {
    kode: 'dokumen.lihat_terbatas',
    nama: 'Melihat dokumen terbatas',
    modul: 'dokumen',
    berdampakTinggi: false,
    urutan: 5,
  },
  {
    kode: 'dokumen.unduh_terbatas',
    nama: 'Mengunduh dokumen terbatas',
    modul: 'dokumen',
    berdampakTinggi: false,
    urutan: 6,
  },
  {
    kode: 'dokumen.lihat_rahasia',
    nama: 'Melihat dokumen rahasia',
    modul: 'dokumen',
    berdampakTinggi: true,
    urutan: 7,
  },
  {
    kode: 'dokumen.lihat_admin',
    nama: 'Melihat dokumen pada panel admin',
    modul: 'dokumen',
    berdampakTinggi: false,
    urutan: 8,
  },
  {
    kode: 'dokumen.buat',
    nama: 'Membuat dokumen',
    modul: 'dokumen',
    berdampakTinggi: false,
    urutan: 9,
  },
  {
    kode: 'dokumen.ubah',
    nama: 'Mengubah metadata dokumen',
    modul: 'dokumen',
    berdampakTinggi: false,
    urutan: 10,
  },
  {
    kode: 'dokumen.hapus',
    nama: 'Menghapus dokumen',
    modul: 'dokumen',
    berdampakTinggi: false,
    urutan: 11,
  },
  {
    kode: 'dokumen.pulihkan',
    nama: 'Memulihkan dokumen',
    modul: 'dokumen',
    berdampakTinggi: false,
    urutan: 12,
  },
  {
    kode: 'dokumen.hapus_permanen',
    nama: 'Menghapus dokumen permanen',
    modul: 'dokumen',
    berdampakTinggi: true,
    urutan: 13,
  },
  {
    kode: 'dokumen.unggah_berkas',
    nama: 'Mengunggah berkas dokumen',
    modul: 'dokumen',
    berdampakTinggi: false,
    urutan: 14,
  },
  {
    kode: 'dokumen.hapus_berkas',
    nama: 'Menghapus berkas dokumen',
    modul: 'dokumen',
    berdampakTinggi: false,
    urutan: 15,
  },
  {
    kode: 'dokumen.kelola_relasi',
    nama: 'Mengelola relasi antarperaturan',
    modul: 'dokumen',
    berdampakTinggi: false,
    urutan: 16,
  },
  {
    kode: 'dokumen.ubah_status',
    nama: 'Mengubah status keberlakuan',
    modul: 'dokumen',
    berdampakTinggi: true,
    urutan: 17,
  },
  {
    kode: 'dokumen.ubah_akses',
    nama: 'Menetapkan tingkat akses dokumen',
    modul: 'dokumen',
    berdampakTinggi: true,
    urutan: 18,
  },
  {
    kode: 'dokumen.ajukan',
    nama: 'Mengajukan dokumen untuk verifikasi',
    modul: 'dokumen',
    berdampakTinggi: false,
    urutan: 19,
  },
  {
    kode: 'dokumen.verifikasi',
    nama: 'Memverifikasi dan menyetujui dokumen',
    modul: 'dokumen',
    berdampakTinggi: true,
    urutan: 20,
  },
  {
    kode: 'dokumen.terbitkan',
    nama: 'Mempublikasikan dokumen',
    modul: 'dokumen',
    berdampakTinggi: true,
    urutan: 21,
  },
  {
    kode: 'dokumen.tarik',
    nama: 'Menarik dokumen terbit',
    modul: 'dokumen',
    berdampakTinggi: true,
    urutan: 22,
  },
  {
    kode: 'dokumen.impor',
    nama: 'Mengimpor metadata massal',
    modul: 'dokumen',
    berdampakTinggi: true,
    urutan: 23,
  },
  {
    kode: 'dokumen.ekspor',
    nama: 'Mengekspor data dokumen',
    modul: 'dokumen',
    berdampakTinggi: false,
    urutan: 24,
  },
  {
    kode: 'dokumen.operasi_massal',
    nama: 'Melakukan operasi massal',
    modul: 'dokumen',
    berdampakTinggi: true,
    urutan: 25,
  },
  {
    kode: 'dokumen.lihat_riwayat',
    nama: 'Melihat riwayat perubahan dokumen',
    modul: 'dokumen',
    berdampakTinggi: false,
    urutan: 26,
  },
  {
    kode: 'dokumen.putuskan_akses',
    nama: 'Memutuskan permintaan akses dokumen',
    modul: 'dokumen',
    berdampakTinggi: false,
    urutan: 27,
  },
  {
    kode: 'akses.minta',
    nama: 'Mengajukan permintaan akses',
    modul: 'akses_pribadi',
    berdampakTinggi: false,
    urutan: 28,
  },
  {
    kode: 'akses.koleksi',
    nama: 'Mengelola koleksi dokumen pribadi',
    modul: 'akses_pribadi',
    berdampakTinggi: false,
    urutan: 29,
  },
  {
    kode: 'akses.riwayat_unduh',
    nama: 'Melihat riwayat unduhan pribadi',
    modul: 'akses_pribadi',
    berdampakTinggi: false,
    urutan: 30,
  },
  {
    kode: 'profil.ubah',
    nama: 'Mengubah profil pribadi',
    modul: 'akses_pribadi',
    berdampakTinggi: false,
    urutan: 31,
  },
  {
    kode: 'profil.ubah_sandi',
    nama: 'Mengubah kata sandi sendiri',
    modul: 'akses_pribadi',
    berdampakTinggi: false,
    urutan: 32,
  },
  {
    kode: 'berita.lihat_admin',
    nama: 'Melihat daftar berita di panel admin',
    modul: 'konten',
    berdampakTinggi: false,
    urutan: 33,
  },
  {
    kode: 'berita.kelola',
    nama: 'Mengelola berita dan artikel hukum',
    modul: 'konten',
    berdampakTinggi: false,
    urutan: 34,
  },
  {
    kode: 'berita.terbitkan',
    nama: 'Menerbitkan berita',
    modul: 'konten',
    berdampakTinggi: false,
    urutan: 35,
  },
  {
    kode: 'berita.hapus',
    nama: 'Menghapus berita',
    modul: 'konten',
    berdampakTinggi: false,
    urutan: 36,
  },
  {
    kode: 'halaman.kelola',
    nama: 'Mengelola halaman statis',
    modul: 'konten',
    berdampakTinggi: false,
    urutan: 37,
  },
  {
    kode: 'banner.kelola',
    nama: 'Mengelola banner dan pengumuman',
    modul: 'konten',
    berdampakTinggi: false,
    urutan: 38,
  },
  {
    kode: 'media.kelola',
    nama: 'Mengelola pustaka media',
    modul: 'konten',
    berdampakTinggi: false,
    urutan: 39,
  },
  {
    kode: 'tautan.kelola',
    nama: 'Mengelola tautan terkait',
    modul: 'konten',
    berdampakTinggi: false,
    urutan: 40,
  },
  {
    kode: 'faq.kelola',
    nama: 'Mengelola daftar tanya-jawab',
    modul: 'konten',
    berdampakTinggi: false,
    urutan: 41,
  },
  {
    kode: 'kontak.lihat',
    nama: 'Melihat pesan kontak masuk',
    modul: 'interaksi',
    berdampakTinggi: false,
    urutan: 42,
  },
  {
    kode: 'kontak.kelola',
    nama: 'Menanggapi dan menutup pesan kontak',
    modul: 'interaksi',
    berdampakTinggi: false,
    urutan: 43,
  },
  {
    kode: 'master.lihat',
    nama: 'Melihat data master',
    modul: 'master',
    berdampakTinggi: false,
    urutan: 44,
  },
  {
    kode: 'unit_kerja.kelola',
    nama: 'Mengelola unit kerja',
    modul: 'master',
    berdampakTinggi: true,
    urutan: 45,
  },
  {
    kode: 'jenis_peraturan.kelola',
    nama: 'Mengelola jenis peraturan',
    modul: 'master',
    berdampakTinggi: true,
    urutan: 46,
  },
  {
    kode: 'kategori.kelola',
    nama: 'Mengelola kategori',
    modul: 'master',
    berdampakTinggi: false,
    urutan: 47,
  },
  {
    kode: 'bidang_hukum.kelola',
    nama: 'Mengelola bidang hukum',
    modul: 'master',
    berdampakTinggi: false,
    urutan: 48,
  },
  {
    kode: 'tag.kelola',
    nama: 'Mengelola kata kunci',
    modul: 'master',
    berdampakTinggi: false,
    urutan: 49,
  },
  {
    kode: 'status.kelola',
    nama: 'Mengelola status keberlakuan',
    modul: 'master',
    berdampakTinggi: true,
    urutan: 50,
  },
  {
    kode: 'jenis_relasi.kelola',
    nama: 'Mengelola jenis relasi',
    modul: 'master',
    berdampakTinggi: true,
    urutan: 51,
  },
  {
    kode: 'pengguna.lihat',
    nama: 'Melihat daftar pengguna',
    modul: 'pengguna',
    berdampakTinggi: false,
    urutan: 52,
  },
  {
    kode: 'pengguna.kelola',
    nama: 'Mengelola akun pengguna',
    modul: 'pengguna',
    berdampakTinggi: true,
    urutan: 53,
  },
  {
    kode: 'pengguna.hapus',
    nama: 'Menghapus akun pengguna',
    modul: 'pengguna',
    berdampakTinggi: true,
    urutan: 54,
  },
  {
    kode: 'pengguna.reset_sandi',
    nama: 'Menetapkan ulang kata sandi',
    modul: 'pengguna',
    berdampakTinggi: true,
    urutan: 55,
  },
  {
    kode: 'pengguna.verifikasi',
    nama: 'Memverifikasi pendaftaran akun',
    modul: 'pengguna',
    berdampakTinggi: false,
    urutan: 56,
  },
  {
    kode: 'pengguna.tetapkan_peran',
    nama: 'Menetapkan peran kepada akun',
    modul: 'pengguna',
    berdampakTinggi: true,
    urutan: 57,
  },
  {
    kode: 'pengguna.tetapkan_unit',
    nama: 'Menetapkan unit kerja dan akses',
    modul: 'pengguna',
    berdampakTinggi: true,
    urutan: 58,
  },
  {
    kode: 'peran.lihat',
    nama: 'Melihat daftar peran dan izin',
    modul: 'otorisasi',
    berdampakTinggi: false,
    urutan: 59,
  },
  {
    kode: 'peran.kelola',
    nama: 'Mengelola peran dan izinnya',
    modul: 'otorisasi',
    berdampakTinggi: true,
    urutan: 60,
  },
  {
    kode: 'izin.tetapkan_langsung',
    nama: 'Menetapkan izin langsung pada akun',
    modul: 'otorisasi',
    berdampakTinggi: true,
    urutan: 61,
  },
  {
    kode: 'panel.akses',
    nama: 'Mengakses panel administrasi',
    modul: 'sistem',
    berdampakTinggi: false,
    urutan: 62,
  },
  {
    kode: 'dasbor.lihat',
    nama: 'Melihat dasbor statistik',
    modul: 'sistem',
    berdampakTinggi: false,
    urutan: 63,
  },
  {
    kode: 'laporan.lihat',
    nama: 'Melihat dan mengekspor laporan',
    modul: 'sistem',
    berdampakTinggi: false,
    urutan: 64,
  },
  {
    kode: 'menu.kelola',
    nama: 'Mengelola struktur menu navigasi',
    modul: 'sistem',
    berdampakTinggi: false,
    urutan: 65,
  },
  {
    kode: 'sistem.konfigurasi',
    nama: 'Mengelola konfigurasi sistem',
    modul: 'sistem',
    berdampakTinggi: true,
    urutan: 66,
  },
  {
    kode: 'sistem.log_aktivitas',
    nama: 'Melihat log aktivitas',
    modul: 'sistem',
    berdampakTinggi: true,
    urutan: 67,
  },
  {
    kode: 'sistem.log_keamanan',
    nama: 'Melihat log keamanan',
    modul: 'sistem',
    berdampakTinggi: true,
    urutan: 68,
  },
  {
    kode: 'sistem.cadangan',
    nama: 'Mengelola pencadangan dan pemulihan',
    modul: 'sistem',
    berdampakTinggi: true,
    urutan: 69,
  },
  {
    kode: 'sistem.pemeliharaan',
    nama: 'Mengaktifkan mode pemeliharaan',
    modul: 'sistem',
    berdampakTinggi: true,
    urutan: 70,
  },
  {
    kode: 'jdihn.kelola',
    nama: 'Mengelola sinkronisasi JDIHN',
    modul: 'sistem',
    berdampakTinggi: true,
    urutan: 71,
  },
  {
    kode: 'layanan.ajukan',
    nama: 'Mengajukan permohonan layanan hukum',
    modul: 'layanan',
    berdampakTinggi: false,
    urutan: 72,
  },
  {
    kode: 'layanan.lihat_sendiri',
    nama: 'Melihat permohonan sendiri',
    modul: 'layanan',
    berdampakTinggi: false,
    urutan: 73,
  },
  {
    kode: 'layanan.kelola',
    nama: 'Mengelola seluruh permohonan',
    modul: 'layanan',
    berdampakTinggi: false,
    urutan: 74,
  },
  {
    kode: 'layanan.tugaskan',
    nama: 'Menugaskan penelaah',
    modul: 'layanan',
    berdampakTinggi: false,
    urutan: 75,
  },
  {
    kode: 'layanan.master',
    nama: 'Mengelola katalog jenis layanan',
    modul: 'layanan',
    berdampakTinggi: true,
    urutan: 76,
  },
];

/** Mencari metadata satu izin menurut kodenya. */
export function cariIzin(kode: KodeIzin): MetaIzin | undefined {
  return KATALOG_IZIN.find((i) => i.kode === kode);
}

/** Memeriksa apakah suatu teks sembarang merupakan kode izin yang sah. */
export function adalahKodeIzin(nilai: unknown): nilai is KodeIzin {
  return typeof nilai === 'string' && (SEMUA_IZIN as readonly string[]).includes(nilai);
}
