import { z } from 'zod';

/**
 * Ringkasan kunjungan portal publik. Satu peramban dihitung sekali per hari
 * (tanggal WITA); yang disimpan hanya jumlah per tanggal, tanpa data pribadi.
 */
export const skemaRingkasanKunjungan = z.strictObject({
  hariIni: z.number().int().nonnegative(),
  bulanIni: z.number().int().nonnegative(),
  tahunIni: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
});
export type RingkasanKunjungan = z.infer<typeof skemaRingkasanKunjungan>;
