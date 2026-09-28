/**
 * Definisi peran pengguna Portal JDIH ITH.
 *
 * Nilai `kode` harus sama persis dengan kolom `peran.kode` pada
 * database/jdih_ith_seed.sql § 7.
 *
 * Rujukan: docs/05-role-permission.md § E.2
 */

import { IZIN, type KodeIzin } from './permissions.js';

export const PERAN = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  DOSEN_STAF: 'dosen_staf',
  PENGUNJUNG: 'pengunjung',
} as const;

export type KodePeran = (typeof PERAN)[keyof typeof PERAN];

export const SEMUA_PERAN = Object.values(PERAN) as readonly KodePeran[];

export interface MetaPeran {
  readonly kode: KodePeran;
  readonly nama: string;
  /** Semakin kecil, semakin tinggi kewenangannya. Dipakai untuk mencegah eskalasi hak akses. */
  readonly tingkat: number;
  /** Peran virtual yang tidak pernah ditetapkan ke akun mana pun. */
  readonly anonim: boolean;
  /** Autentikasi dua faktor diwajibkan sebelum panel administrasi dapat dibuka. */
  readonly wajib2fa: boolean;
  /** Cakupan data dibatasi unit kerja akun beserta unit bawahannya (Lapisan 2). */
  readonly lingkupUnit: boolean;
  readonly deskripsi: string;
}

export const KATALOG_PERAN: readonly MetaPeran[] = [
  {
    kode: PERAN.SUPERADMIN,
    nama: 'Superadmin',
    tingkat: 1,
    anonim: false,
    wajib2fa: true,
    lingkupUnit: false,
    deskripsi: 'Administrator sistem dengan kewenangan penuh atas seluruh data dan konfigurasi.',
  },
  {
    kode: PERAN.ADMIN,
    nama: 'Admin',
    tingkat: 2,
    anonim: false,
    wajib2fa: false,
    lingkupUnit: true,
    deskripsi: 'Pengelola dokumentasi hukum, dibatasi pada cakupan unit kerjanya.',
  },
  {
    kode: PERAN.DOSEN_STAF,
    nama: 'Dosen/Staf',
    tingkat: 3,
    anonim: false,
    wajib2fa: false,
    lingkupUnit: false,
    deskripsi: 'Pengguna terautentikasi yang dapat mengakses dokumen internal.',
  },
  {
    kode: PERAN.PENGUNJUNG,
    nama: 'Pengunjung Publik',
    tingkat: 4,
    anonim: true,
    wajib2fa: false,
    lingkupUnit: false,
    deskripsi: 'Peran virtual untuk permintaan tanpa autentikasi; tidak pernah ditetapkan ke akun.',
  },
];

export function cariPeran(kode: KodePeran): MetaPeran | undefined {
  return KATALOG_PERAN.find((p) => p.kode === kode);
}

/**
 * Izin milik peran Pengunjung Publik. Sengaja dideklarasikan di sini agar
 * kebijakan akses anonim terkelola dari satu tempat yang sama dengan peran lain,
 * bukan tersebar sebagai pengecualian di dalam kode program.
 */
export const IZIN_PENGUNJUNG: readonly KodeIzin[] = [
  IZIN.DOKUMEN_LIHAT_PUBLIK,
  IZIN.DOKUMEN_UNDUH_PUBLIK,
];

/**
 * Apakah `pelaku` boleh mengelola akun atau peran bertingkat `tingkatSasaran`.
 * Peran hanya boleh menyentuh tingkat yang kewenangannya LEBIH RENDAH daripada
 * dirinya, sehingga tidak ada jalur eskalasi hak akses
 * (docs/05-role-permission.md § E.7 butir 3).
 */
export function bolehKelolaTingkat(tingkatPelaku: number, tingkatSasaran: number): boolean {
  return tingkatSasaran > tingkatPelaku;
}
