/**
 * Bentuk baku tanggapan API Portal JDIH ITH.
 *
 * Setiap titik akhir mengembalikan salah satu dari dua bentuk di bawah. Konsistensi
 * ini membuat sisi peramban dapat menangani galat di satu tempat saja, bukan
 * menebak bentuk tanggapan per permintaan.
 */

/** Kode galat yang dikenal. Dipakai peramban untuk memilih pesan dan tindakan lanjutan. */
export const KODE_GALAT = {
  /** Muatan permintaan tidak lolos validasi skema. */
  VALIDASI_GAGAL: 'VALIDASI_GAGAL',
  /** Belum masuk, atau token sudah tidak berlaku. */
  TIDAK_TERAUTENTIKASI: 'TIDAK_TERAUTENTIKASI',
  /** Sudah masuk, tetapi tidak memegang izin fungsional yang diperlukan (Lapisan 1). */
  IZIN_TIDAK_CUKUP: 'IZIN_TIDAK_CUKUP',
  /** Akun tidak berstatus aktif, atau sedang terkunci. */
  AKUN_TIDAK_AKTIF: 'AKUN_TIDAK_AKTIF',
  /** General access denial; Secret policy must use a non-disclosing NOT_FOUND response. */
  AKSES_DOKUMEN_DITOLAK: 'AKSES_DOKUMEN_DITOLAK',
  TIDAK_DITEMUKAN: 'TIDAK_DITEMUKAN',
  /** Bertabrakan dengan data yang sudah ada, misalnya nomor peraturan duplikat. */
  KONFLIK: 'KONFLIK',
  /** Perpindahan status yang tidak diizinkan oleh alur kerja. */
  TRANSISI_TIDAK_SAH: 'TRANSISI_TIDAK_SAH',
  /** Penginput tidak boleh menyetujui dokumennya sendiri. */
  PEMISAHAN_TUGAS: 'PEMISAHAN_TUGAS',
  /** Permintaan melewati batas laju. */
  TERLALU_BANYAK_PERMINTAAN: 'TERLALU_BANYAK_PERMINTAAN',
  GALAT_PELADEN: 'GALAT_PELADEN',
} as const;

export type KodeGalat = (typeof KODE_GALAT)[keyof typeof KODE_GALAT];

/** Satu butir kesalahan validasi, menunjuk ruas tertentu pada formulir. */
export interface ButirGalatValidasi {
  /** Jalur ruas, misalnya "nomor" atau "berkas.0.jenis". */
  readonly ruas: string;
  readonly pesan: string;
}

export interface TanggapanGalat {
  readonly sukses: false;
  readonly galat: {
    readonly kode: KodeGalat;
    readonly pesan: string;
    /** Hanya terisi pada VALIDASI_GAGAL. */
    readonly butir?: readonly ButirGalatValidasi[];
    /** Penjelasan tambahan yang aman ditampilkan kepada pengguna. */
    readonly rincian?: Readonly<Record<string, unknown>>;
  };
  /** Penanda korelasi untuk mencocokkan galat di peramban dengan baris log di peladen. */
  readonly jejak: string;
}

export interface TanggapanSukses<T> {
  readonly sukses: true;
  readonly data: T;
}

export interface MetaHalaman {
  readonly halaman: number;
  readonly perHalaman: number;
  readonly totalButir: number;
  readonly totalHalaman: number;
  readonly adaSebelumnya: boolean;
  readonly adaBerikutnya: boolean;
}

export interface TanggapanHalaman<T> {
  readonly sukses: true;
  readonly data: readonly T[];
  readonly meta: MetaHalaman;
  /** Jumlah hasil per nilai penyaring, untuk penyaring aspek (fitur F-12). */
  readonly aspek?: Readonly<Record<string, readonly HitunganAspek[]>>;
}

export interface HitunganAspek {
  readonly nilai: string;
  readonly label: string;
  readonly jumlah: number;
}

export type Tanggapan<T> = TanggapanSukses<T> | TanggapanGalat;

/** Menghitung metadata halaman dari parameter kueri dan jumlah total baris. */
export function susunMetaHalaman(
  halaman: number,
  perHalaman: number,
  totalButir: number,
): MetaHalaman {
  const totalHalaman = perHalaman > 0 ? Math.max(1, Math.ceil(totalButir / perHalaman)) : 1;
  return {
    halaman,
    perHalaman,
    totalButir,
    totalHalaman,
    adaSebelumnya: halaman > 1,
    adaBerikutnya: halaman < totalHalaman,
  };
}

/** Batas jumlah baris per halaman. Dibatasi agar satu permintaan tidak membebani peladen. */
export const PER_HALAMAN_BAKU = 20;
export const PER_HALAMAN_MAKSIMUM = 100;
export const PILIHAN_PER_HALAMAN = [10, 20, 50, 100] as const;

/** Urutan hasil pencarian yang tersedia (fitur F-14). */
export const URUTAN_DOKUMEN = [
  'relevansi',
  'terbaru',
  'terlama',
  'tahun_turun',
  'tahun_naik',
  'judul',
] as const;
export type UrutanDokumen = (typeof URUTAN_DOKUMEN)[number];

export const LABEL_URUTAN_DOKUMEN: Record<UrutanDokumen, string> = {
  relevansi: 'Paling Relevan',
  terbaru: 'Terbaru Ditetapkan',
  terlama: 'Terlama Ditetapkan',
  tahun_turun: 'Tahun Terbesar',
  tahun_naik: 'Tahun Terkecil',
  judul: 'Judul A sampai Z',
};
