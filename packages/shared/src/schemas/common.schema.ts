/**
 * Skema validasi yang dipakai berulang di banyak titik akhir.
 *
 * Skema Zod di paket ini adalah SATU-SATUNYA sumber kebenaran bentuk data:
 * peladen memakainya untuk memvalidasi permintaan masuk, peramban memakainya
 * untuk memvalidasi formulir. Tipe TypeScript-nya diturunkan, bukan ditulis ulang.
 */

import { z } from 'zod';
import { PER_HALAMAN_BAKU, PER_HALAMAN_MAKSIMUM } from '../api.js';

/** Pengenal baris basis data: bilangan bulat positif. */
export const skemaId = z.coerce.number().int().positive();

/** Parameter rute yang berisi satu id, misalnya /dokumen/:id */
export const skemaParamId = z.object({ id: skemaId });
export type ParamId = z.infer<typeof skemaParamId>;

/** Parameter rute yang berisi slug, misalnya /peraturan/:slug */
export const skemaParamSlug = z.object({
  slug: z
    .string()
    .min(1, 'Slug tidak boleh kosong')
    .max(255)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung',
    ),
});
export type ParamSlug = z.infer<typeof skemaParamSlug>;

/** Tanggal dalam format YYYY-MM-DD. */
export const skemaTanggal = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal harus dalam format YYYY-MM-DD')
  .refine((nilai) => !Number.isNaN(Date.parse(nilai)), 'Tanggal tidak sah');

/** Tahun penetapan peraturan. Batas bawah mengikuti tahun berdirinya institusi. */
export const skemaTahun = z.coerce.number().int().min(1900).max(2200);

/**
 * Mengubah parameter kueri "1,2,3" menjadi array angka. Parameter kueri selalu
 * berupa teks, sehingga penguraiannya harus eksplisit.
 */
export const daftarIdTerpisahKoma = z
  .union([z.string(), z.array(z.coerce.number().int().positive())])
  .transform((nilai): number[] => {
    if (Array.isArray(nilai)) return nilai;
    return nilai
      .split(',')
      .map((bagian) => bagian.trim())
      .filter((bagian) => bagian.length > 0)
      .map(Number)
      .filter((angka) => Number.isInteger(angka) && angka > 0);
  });

/** Mengubah parameter kueri "a,b,c" menjadi array teks. */
export const daftarTeksTerpisahKoma = z
  .union([z.string(), z.array(z.string())])
  .transform((nilai): string[] => {
    if (Array.isArray(nilai)) return nilai;
    return nilai
      .split(',')
      .map((bagian) => bagian.trim())
      .filter((bagian) => bagian.length > 0);
  });

/** Parameter penghalamanan yang berlaku pada seluruh titik akhir berdaftar. */
export const skemaHalaman = z.object({
  halaman: z.coerce.number().int().positive().default(1),
  perHalaman: z.coerce
    .number()
    .int()
    .positive()
    .max(PER_HALAMAN_MAKSIMUM, `Maksimum ${PER_HALAMAN_MAKSIMUM} baris per halaman`)
    .default(PER_HALAMAN_BAKU),
});
export type KueriHalaman = z.infer<typeof skemaHalaman>;

/** Kata kunci pencarian bebas. */
export const skemaKataKunci = z.string().trim().max(200).optional();

/** Teks wajib dengan batas panjang, sekaligus memangkas spasi di tepi. */
export function teksWajib(maksimum: number, label: string) {
  return z
    .string()
    .trim()
    .min(1, `${label} wajib diisi`)
    .max(maksimum, `${label} maksimum ${maksimum} karakter`);
}

/** Teks opsional yang mengubah string kosong menjadi undefined. */
export function teksOpsional(maksimum: number) {
  return z
    .string()
    .trim()
    .max(maksimum)
    .transform((nilai) => (nilai.length === 0 ? undefined : nilai))
    .optional();
}
