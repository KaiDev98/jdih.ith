import { z } from 'zod';
import { PER_HALAMAN_BAKU, PER_HALAMAN_MAKSIMUM } from '../api.js';
/** JSON decimal strings preserve the full MySQL BIGINT UNSIGNED range. */
export const skemaId = z
  .string()
  .regex(/^[1-9][0-9]{0,19}$/)
  .refine(
    (v) => /^[1-9][0-9]{0,19}$/.test(v) && BigInt(v) <= 18446744073709551615n,
    'Id di luar rentang BIGINT UNSIGNED',
  );
export const skemaSlug = z
  .string()
  .min(1)
  .max(191)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const skemaParamId = z.strictObject({ id: skemaId });
export const skemaParamSlug = z.strictObject({ slug: skemaSlug });
export type ParamId = z.infer<typeof skemaParamId>;
export type ParamSlug = z.infer<typeof skemaParamSlug>;
/** Generic query-list parsers; IDs retain full BIGINT precision and invalid entries fail. */
export const daftarIdTerpisahKoma = z
  .union([z.string(), z.array(skemaId)])
  .transform((nilai) =>
    typeof nilai === 'string'
      ? nilai
          .split(',')
          .map((bagian) => bagian.trim())
          .filter(Boolean)
      : nilai,
  )
  .pipe(z.array(skemaId));
export const daftarTeksTerpisahKoma = z
  .union([z.string(), z.array(z.string())])
  .transform((nilai) =>
    typeof nilai === 'string'
      ? nilai
          .split(',')
          .map((bagian) => bagian.trim())
          .filter(Boolean)
      : nilai,
  );
export const skemaTanggal = z.iso
  .date()
  .refine((v) => v >= '1000-01-01', 'Tanggal di luar rentang MySQL DATE');
export const skemaWaktu = z.iso.datetime({ offset: true });
export const skemaTahun = z.number().int().min(1000).max(9999);
export const skemaNomorVersi = z.number().int().min(1).max(4294967295);
export function teksWajib(maksimum: number, label: string) {
  return z
    .string()
    .trim()
    .min(1, label + ' wajib diisi')
    .max(maksimum);
}
export function teksOpsional(maksimum: number) {
  return z
    .string()
    .trim()
    .max(maksimum)
    .transform((nilai) => (nilai.length === 0 ? undefined : nilai))
    .optional();
}
/** Coercion is limited to URL query parameters, never identity/authority fields. */
const bilanganKueri = z
  .union([z.number(), z.string().regex(/^[0-9]+$/)])
  .transform(Number)
  .pipe(z.number().int().positive());
export const skemaHalaman = z.strictObject({
  halaman: bilanganKueri.default(1),
  perHalaman: bilanganKueri.pipe(z.number().max(PER_HALAMAN_MAKSIMUM)).default(PER_HALAMAN_BAKU),
});
export type KueriHalaman = z.infer<typeof skemaHalaman>;
export const skemaKataKunci = z.string().trim().max(200).optional();
export const skemaMetaHalaman = z.strictObject({
  halaman: z.number().int().positive(),
  perHalaman: z.number().int().positive().max(PER_HALAMAN_MAKSIMUM),
  totalButir: z.number().int().nonnegative(),
  totalHalaman: z.number().int().nonnegative(),
  adaSebelumnya: z.boolean(),
  adaBerikutnya: z.boolean(),
});
export function skemaTanggapan<T extends z.ZodType>(data: T) {
  return z.strictObject({ sukses: z.literal(true), data });
}
export function skemaTanggapanHalaman<T extends z.ZodType>(item: T) {
  return z.strictObject({ sukses: z.literal(true), data: z.array(item), meta: skemaMetaHalaman });
}
