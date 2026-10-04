import { z } from 'zod';
import { skemaJenisRelasi, skemaStatusHukum } from '../enums.js';
import { skemaId, teksWajib } from './common.schema.js';
/** source version comes from the route; actors always from session. */
export const skemaBuatRelasi = z.strictObject({
  targetDocumentId: skemaId,
  jenisRelasi: skemaJenisRelasi,
  catatan: z.string().trim().max(2000).optional(),
});
export const skemaRelasi = skemaBuatRelasi.extend({ id: skemaId, sourceVersionId: skemaId });
const target = { targetDocumentId: skemaId, statusSaatIni: skemaStatusHukum };
/** Shape of proposed changes, not a function applying status transitions. */
export const skemaDampakHukum = z.discriminatedUnion('jenisRelasi', [
  z.strictObject({
    ...target,
    jenisRelasi: z.literal('MENGUBAH'),
    statusUsulan: z.literal('DIUBAH'),
  }),
  z.strictObject({
    ...target,
    jenisRelasi: z.literal('MENCABUT'),
    statusUsulan: z.literal('DICABUT'),
  }),
]);
export const skemaPreviewDampakPublikasi = z.strictObject({
  versiId: skemaId,
  tokenKonfirmasi: teksWajib(128, 'Token konfirmasi'),
  dampak: z.array(skemaDampakHukum),
  perluKonfirmasi: z.literal(true),
});
/** Opaque backend token binds the reviewed snapshot; service must recheck freshness and all impacts under lock. */
export const skemaKonfirmasiDampakPublikasi = z.strictObject({
  tokenKonfirmasi: teksWajib(128, 'Token konfirmasi'),
  disetujui: z.literal(true),
  dampak: z.array(skemaDampakHukum),
});
export type MuatanBuatRelasi = z.infer<typeof skemaBuatRelasi>;
export type Relasi = z.infer<typeof skemaRelasi>;
export type PreviewDampakPublikasi = z.infer<typeof skemaPreviewDampakPublikasi>;
export type KonfirmasiDampakPublikasi = z.infer<typeof skemaKonfirmasiDampakPublikasi>;
