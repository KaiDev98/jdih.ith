import { z } from 'zod';
import { skemaId, teksWajib, skemaTanggapan } from './common.schema.js';
import { skemaPeran } from '../roles.js';
import { skemaIzin, type KodeIzin } from '../permissions.js';
import { skemaStatusPengguna } from '../enums.js';
export const skemaSurel = z.email().max(254);
/** Identity comes from the verified Google session, never the registration body. */
export const skemaLengkapiRegistrasi = z
  .strictObject({
    unitKerjaId: skemaId.optional(),
    unitManual: teksWajib(200, 'Unit manual').optional(),
  })
  .refine(
    (v) => (v.unitKerjaId !== undefined) !== (v.unitManual !== undefined),
    'Pilih tepat satu: unit master atau unit manual',
  );
export type MuatanLengkapiRegistrasi = z.infer<typeof skemaLengkapiRegistrasi>;
export const skemaHasilRegistrasi = z.strictObject({
  id: skemaId,
  status: z.literal('MENUNGGU_VERIFIKASI'),
  peran: z.tuple([z.literal('DOSEN_STAF')]),
});
export const skemaSetujuiAkun = z.strictObject({ unitKerjaId: skemaId });
export const skemaTolakAkun = z.strictObject({ alasan: teksWajib(1000, 'Alasan penolakan') });
/** Approval/rejection have separate commands; this is activation/deactivation only. */
export const skemaUbahStatusAkun = z.strictObject({
  status: z.enum(['AKTIF', 'NONAKTIF']),
  alasan: teksWajib(1000, 'Alasan'),
});
export type MuatanSetujuiAkun = z.infer<typeof skemaSetujuiAkun>;
export type MuatanTolakAkun = z.infer<typeof skemaTolakAkun>;
export type MuatanUbahStatusAkun = z.infer<typeof skemaUbahStatusAkun>;
export const skemaPenggunaSesi = z.strictObject({
  id: skemaId,
  nama: teksWajib(200, 'Nama'),
  surel: skemaSurel,
  status: skemaStatusPengguna,
  unitKerjaId: skemaId.nullable(),
  unitManual: z.string().max(200).nullable(),
  peran: z.array(skemaPeran),
  izin: z.array(skemaIzin),
  avatarUrl: z.url().max(2048).nullable(),
});
/** DOSEN_STAF + MENUNGGU_VERIFIKASI has no Internal access; AKTIF is required.
 * Session/role presence is not authorization; enforcement belongs to the backend. */
export type PenggunaAktif = z.infer<typeof skemaPenggunaSesi>;
export const skemaAuthMe = z.discriminatedUnion('terautentikasi', [
  z.strictObject({ terautentikasi: z.literal(false) }),
  z.strictObject({ terautentikasi: z.literal(true), pengguna: skemaPenggunaSesi }),
]);
export const skemaTanggapanAuthMe = skemaTanggapan(skemaAuthMe);
export type AuthMe = z.infer<typeof skemaAuthMe>;
/** HTTP session bootstrap; CSRF is a request proof, never a bearer/session credential. */
export const skemaAuthMeHttp = z.discriminatedUnion('terautentikasi', [
  z.strictObject({
    terautentikasi: z.literal(false),
    perluRegistrasi: z.boolean(),
    csrfToken: z.string().nullable(),
  }),
  z.strictObject({
    terautentikasi: z.literal(true),
    pengguna: skemaPenggunaSesi,
    csrfToken: z.string(),
  }),
]);
/** Login password lokal: hanya untuk akun Admin/Superadmin yang sudah membuat password. */
export const skemaLoginPassword = z.strictObject({
  email: z.string().trim().toLowerCase().pipe(skemaSurel),
  password: z.string().min(1, 'Password wajib diisi').max(128),
});
/** Aturan password baru: panjang cukup dan memadukan huruf dengan angka. */
export const skemaPasswordBaru = z
  .string()
  .min(10, 'Password minimal 10 karakter')
  .max(128, 'Password maksimal 128 karakter')
  .regex(/[A-Za-z]/, 'Password harus memuat huruf')
  .regex(/[0-9]/, 'Password harus memuat angka');
/**
 * Ganti (atau buat pertama kali) password. Password saat ini wajib bila akun
 * sudah punya password; backend memeriksanya, tidak cukup di sini.
 */
export const skemaUbahPassword = z
  .strictObject({
    passwordSaatIni: z.string().max(128).optional(),
    passwordBaru: skemaPasswordBaru,
    konfirmasiPassword: z.string().max(128),
  })
  .refine((v) => v.passwordBaru === v.konfirmasiPassword, {
    message: 'Konfirmasi password tidak sama',
    path: ['konfirmasiPassword'],
  })
  .refine((v) => !v.passwordSaatIni || v.passwordSaatIni !== v.passwordBaru, {
    message: 'Password baru harus berbeda dari password saat ini',
    path: ['passwordBaru'],
  });
export const skemaStatusPassword = z.strictObject({
  punyaPassword: z.boolean(),
  diubahPada: z.string().nullable(),
});
/** Superadmin membuat akun Admin dengan password awal (tanpa perlu login Google). */
export const skemaBuatAdmin = z.strictObject({
  nama: teksWajib(200, 'Nama'),
  email: z.string().trim().toLowerCase().pipe(skemaSurel),
  password: skemaPasswordBaru,
});
/** Superadmin mengatur ulang password akun Admin yang lupa. */
export const skemaAturUlangPassword = z.strictObject({ passwordBaru: skemaPasswordBaru });
export type MuatanBuatAdmin = z.infer<typeof skemaBuatAdmin>;
export type MuatanAturUlangPassword = z.infer<typeof skemaAturUlangPassword>;
export type MuatanLoginPassword = z.infer<typeof skemaLoginPassword>;
export type MuatanUbahPassword = z.infer<typeof skemaUbahPassword>;
export type StatusPassword = z.infer<typeof skemaStatusPassword>;
export const skemaGoogleCallback = z.object({
  code: z.string().min(1).max(4096),
  state: z.string().min(1).max(128),
});
/** Minimal master-unit creation used only for approved manual-unit resolution. */
export const skemaBuatUnit = z.strictObject({
  kode: teksWajib(40, 'Kode unit'),
  nama: teksWajib(200, 'Nama unit'),
});
/** Presentation helper only, never a document authorization decision. */
export function punyaSemuaIzin(
  pengguna: Pick<PenggunaAktif, 'izin'>,
  ...diminta: readonly KodeIzin[]
): boolean {
  return diminta.every((i) => pengguna.izin.includes(i));
}
export function punyaSalahSatuIzin(
  pengguna: Pick<PenggunaAktif, 'izin'>,
  ...diminta: readonly KodeIzin[]
): boolean {
  return diminta.some((i) => pengguna.izin.includes(i));
}
