/**
 * Skema autentikasi dan pengelolaan akun sendiri.
 *
 * Rujukan: docs/02-use-case.md UC-19 sampai UC-27
 */

import { z } from 'zod';
import { teksWajib } from './common.schema.js';
import { PERAN, type KodePeran } from '../roles.js';
import type { KodeIzin } from '../permissions.js';
import type { StatusPengguna, SumberAkun } from '../enums.js';

/**
 * Syarat kata sandi. Panjang diutamakan daripada kerumitan: kalimat sandi
 * dua belas karakter lebih kuat sekaligus lebih mudah diingat daripada delapan
 * karakter penuh lambang yang akhirnya dicatat di kertas.
 */
export const PANJANG_SANDI_MINIMUM = 12;

export const skemaKataSandi = z
  .string()
  .min(PANJANG_SANDI_MINIMUM, `Kata sandi minimum ${PANJANG_SANDI_MINIMUM} karakter`)
  .max(128, 'Kata sandi maksimum 128 karakter')
  .refine((nilai) => /[a-z]/.test(nilai), 'Kata sandi harus memuat huruf kecil')
  .refine((nilai) => /[A-Z]/.test(nilai), 'Kata sandi harus memuat huruf besar')
  .refine((nilai) => /\d/.test(nilai), 'Kata sandi harus memuat angka');

export const skemaSurel = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Alamat surel wajib diisi')
  .max(255)
  .email('Alamat surel tidak sah');

/* ───────────────────────────────── Masuk ─────────────────────────────────── */

export const skemaMasuk = z.object({
  surel: skemaSurel,
  kataSandi: z.string().min(1, 'Kata sandi wajib diisi'),
  /** Kode enam angka dari aplikasi pembangkit, bila akun mengaktifkan 2FA. */
  kode2fa: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Kode autentikasi terdiri atas enam angka')
    .optional(),
  ingatSaya: z.boolean().default(false),
});
export type MuatanMasuk = z.infer<typeof skemaMasuk>;

/* ──────────────────────────── Pendaftaran akun ───────────────────────────── */

export const skemaDaftar = z
  .object({
    nama: teksWajib(150, 'Nama lengkap'),
    surel: skemaSurel,
    /** NIP bagi tenaga kependidikan, NIDN bagi dosen. */
    nomorIdentitas: z
      .string()
      .trim()
      .min(1, 'NIP atau NIDN wajib diisi')
      .max(30)
      .regex(/^[0-9]+$/, 'NIP atau NIDN hanya boleh berisi angka'),
    unitKerjaId: z.coerce.number().int().positive({ message: 'Unit kerja wajib dipilih' }),
    jabatan: z.string().trim().max(150).optional(),
    kataSandi: skemaKataSandi,
    ulangiKataSandi: z.string(),
    setujuKebijakan: z.literal(true, {
      message: 'Persetujuan kebijakan privasi wajib diberikan',
    }),
  })
  .refine((nilai) => nilai.kataSandi === nilai.ulangiKataSandi, {
    message: 'Ulangan kata sandi tidak sama',
    path: ['ulangiKataSandi'],
  });
export type MuatanDaftar = z.infer<typeof skemaDaftar>;

/* ─────────────────────────── Pemulihan kata sandi ────────────────────────── */

export const skemaMintaPemulihan = z.object({ surel: skemaSurel });
export type MuatanMintaPemulihan = z.infer<typeof skemaMintaPemulihan>;

export const skemaSetelUlangSandi = z
  .object({
    token: z.string().min(16, 'Token pemulihan tidak sah'),
    kataSandi: skemaKataSandi,
    ulangiKataSandi: z.string(),
  })
  .refine((nilai) => nilai.kataSandi === nilai.ulangiKataSandi, {
    message: 'Ulangan kata sandi tidak sama',
    path: ['ulangiKataSandi'],
  });
export type MuatanSetelUlangSandi = z.infer<typeof skemaSetelUlangSandi>;

export const skemaUbahSandi = z
  .object({
    kataSandiLama: z.string().min(1, 'Kata sandi lama wajib diisi'),
    kataSandi: skemaKataSandi,
    ulangiKataSandi: z.string(),
    /** Mengakhiri seluruh sesi pada perangkat lain setelah kata sandi diganti. */
    akhiriSesiLain: z.boolean().default(true),
  })
  .refine((nilai) => nilai.kataSandi === nilai.ulangiKataSandi, {
    message: 'Ulangan kata sandi tidak sama',
    path: ['ulangiKataSandi'],
  })
  .refine((nilai) => nilai.kataSandi !== nilai.kataSandiLama, {
    message: 'Kata sandi baru harus berbeda dari kata sandi lama',
    path: ['kataSandi'],
  });
export type MuatanUbahSandi = z.infer<typeof skemaUbahSandi>;

/* ────────────────────────────── Profil pribadi ───────────────────────────── */

export const skemaUbahProfil = z.object({
  nama: teksWajib(150, 'Nama lengkap'),
  jabatan: z.string().trim().max(150).optional(),
  telepon: z
    .string()
    .trim()
    .max(25)
    .regex(/^[0-9+()\s-]*$/, 'Nomor telepon tidak sah')
    .optional(),
});
export type MuatanUbahProfil = z.infer<typeof skemaUbahProfil>;

/* ──────────────────────── Autentikasi dua faktor ─────────────────────────── */

export const skemaAktifkan2fa = z.object({
  kode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Kode autentikasi terdiri atas enam angka'),
});
export type MuatanAktifkan2fa = z.infer<typeof skemaAktifkan2fa>;

/* ───────────────────── Bentuk identitas pengguna aktif ───────────────────── */

/**
 * Identitas pengguna yang sedang masuk, sebagaimana dikembalikan titik akhir
 * /auth/saya dan disimpan pada konteks permintaan di peladen.
 *
 * `izin` sudah merupakan hasil akhir: gabungan izin seluruh peran, ditambah izin
 * langsung bermode "berikan", dikurangi izin langsung bermode "cabut". Sisi
 * peramban tidak perlu menghitung apa pun lagi — cukup memeriksa keanggotaan.
 */
export interface PenggunaAktif {
  readonly id: number;
  readonly nama: string;
  readonly surel: string;
  readonly status: StatusPengguna;
  readonly sumberAkun: SumberAkun;
  readonly unitKerjaId: number | null;
  readonly unitKerjaNama: string | null;
  readonly peran: readonly KodePeran[];
  readonly izin: readonly KodeIzin[];
  /**
   * Seluruh unit kerja yang datanya boleh disentuh: unit utama, unit bawahannya,
   * dan unit tambahan. Kosong bagi Superadmin, karena Lapisan 2 dilewati.
   */
  readonly cakupanUnitId: readonly number[];
  readonly dua2faAktif: boolean;
  readonly avatarUrl: string | null;
}

export interface HasilMasuk {
  readonly pengguna: PenggunaAktif;
  /** Umur token akses dalam detik. Token segar diambil melalui token penyegar. */
  readonly kedaluwarsaDalam: number;
}

/** Apakah pengguna memegang seluruh izin yang diminta. */
export function punyaSemuaIzin(
  pengguna: Pick<PenggunaAktif, 'izin'>,
  ...diminta: readonly KodeIzin[]
): boolean {
  return diminta.every((izin) => pengguna.izin.includes(izin));
}

/** Apakah pengguna memegang sekurang-kurangnya satu dari izin yang diminta. */
export function punyaSalahSatuIzin(
  pengguna: Pick<PenggunaAktif, 'izin'>,
  ...diminta: readonly KodeIzin[]
): boolean {
  return diminta.some((izin) => pengguna.izin.includes(izin));
}

/** Apakah pengguna berperan Superadmin, yang melewati pemeriksaan cakupan unit. */
export function adalahSuperadmin(pengguna: Pick<PenggunaAktif, 'peran'>): boolean {
  return pengguna.peran.includes(PERAN.SUPERADMIN);
}
