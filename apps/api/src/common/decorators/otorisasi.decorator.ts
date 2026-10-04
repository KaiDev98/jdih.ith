import { SetMetadata, createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { KodeIzin, PenggunaAktif } from '@jdih/shared';
import type { Request } from 'express';

/**
 * Dekorator otorisasi.
 *
 * Kaidah yang dipegang: rute DITUTUP secara baku. Penjaga autentikasi global
 * menolak setiap permintaan kecuali rutenya ditandai @Publik(). Dengan begitu,
 * rute baru yang lupa diberi penjaga akan gagal tertutup (aman), bukan gagal
 * terbuka (bocor) — kebalikan dari pendekatan "tandai yang perlu dilindungi",
 * yang satu kelalaian saja sudah membuka data.
 *
 * Rujukan: docs/05-role-permission.md § E.1 prinsip 1 dan 4.
 */

export const KUNCI_META_PUBLIK = 'jdih:publik';
export const KUNCI_META_IZIN = 'jdih:izin';
export const KUNCI_META_IZIN_MODE = 'jdih:izin-mode';

/**
 * Menandai rute sebagai dapat diakses tanpa autentikasi.
 *
 * Perhatikan: publik BUKAN berarti tanpa pembatasan. Permintaan anonim tetap
 * memperoleh himpunan izin peran 'pengunjung', dan penyaringan tingkat akses
 * dokumen (Lapisan 3) tetap berjalan.
 */
export const Publik = (): MethodDecorator & ClassDecorator => SetMetadata(KUNCI_META_PUBLIK, true);

/**
 * Mewajibkan SELURUH izin yang disebut.
 *
 * @example
 * ```ts
 * @Izin(IZIN.DOCUMENTS_EDIT, IZIN.DOCUMENTS_UPLOAD)
 * ```
 */
export const Izin = (...kode: readonly KodeIzin[]): MethodDecorator & ClassDecorator =>
  SetMetadata(KUNCI_META_IZIN, { kode, mode: 'semua' as const });

/** Mewajibkan SEKURANG-KURANGNYA SATU dari izin yang disebut. */
export const IzinSalahSatu = (...kode: readonly KodeIzin[]): MethodDecorator & ClassDecorator =>
  SetMetadata(KUNCI_META_IZIN, { kode, mode: 'salah-satu' as const });

export interface SyaratIzin {
  readonly kode: readonly KodeIzin[];
  readonly mode: 'semua' | 'salah-satu';
}

/** Bentuk permintaan Express setelah penjaga autentikasi menempelkan identitas. */
export interface PermintaanBerpengguna extends Request {
  pengguna?: PenggunaAktif;
}

/**
 * Mengambil identitas pengguna yang sedang masuk.
 *
 * Pada rute @Publik(), nilainya `undefined` — karena itu tipenya sengaja memuat
 * kemungkinan tersebut, supaya pengendali dipaksa menanganinya alih-alih
 * menganggap pengguna selalu ada.
 *
 * @example
 * ```ts
 * profil(@Aktor() aktor: PenggunaAktif) { ... }          // rute terlindungi
 * daftar(@Aktor() aktor: PenggunaAktif | undefined) { }  // rute publik
 * ```
 */
export const Aktor = createParamDecorator(
  (ruas: keyof PenggunaAktif | undefined, konteks: ExecutionContext) => {
    const permintaan = konteks.switchToHttp().getRequest<PermintaanBerpengguna>();
    const pengguna = permintaan.pengguna;
    if (!pengguna) return undefined;
    return ruas ? pengguna[ruas] : pengguna;
  },
);
