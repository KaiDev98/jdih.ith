import { z } from 'zod';
import { skemaId, teksWajib } from './common.schema.js';
import { skemaKonfirmasiDampakPublikasi } from './relasi.schema.js';
// Version ID is a route parameter. No actor, verifier, state or timestamp from the client.
export const skemaAjukanDokumen = z.strictObject({
  catatan: z.string().trim().max(2000).optional(),
});
export const skemaKembalikanRevisi = z.strictObject({ catatan: teksWajib(2000, 'Catatan revisi') });
export const skemaSetujuiDokumen = z.strictObject({
  catatan: z
    .string()
    .trim()
    .max(2000)
    .transform((value) => value || undefined)
    .optional(),
});
export const skemaIdNotifikasi = z.union([
  skemaId,
  z
    .string()
    .regex(/^e-[1-9][0-9]{0,19}$/)
    .refine((v) => skemaId.safeParse(v.slice(2)).success),
]);
export const skemaNotifikasiDokumen = z.strictObject({
  id: skemaIdNotifikasi,
  dokumenId: skemaId.nullable().optional(),
  versionId: skemaId.nullable().optional(),
  jenis: z.enum(['DOCUMENT', 'TEMPLATE', 'REMOVAL', 'ACCOUNT']).optional(),
  resourceId: skemaId.optional(),
  requestId: skemaId.nullable().optional(),
  judul: z.string(),
  action: z.enum([
    'SUBMIT',
    'RETURN',
    'APPROVE',
    'PUBLISH',
    'WITHDRAW',
    'REVOKE',
    'DOCUMENT_DELETE',
    'DOCUMENT_DRAFT_DELETE',
    'TEMPLATE_SUBMIT',
    'TEMPLATE_APPROVE',
    'TEMPLATE_PUBLISH',
    'TEMPLATE_WITHDRAW',
    'TEMPLATE_REVOKE',
    'TEMPLATE_DELETE',
    'REMOVAL_REQUEST',
    'REMOVAL_APPROVE',
    'REMOVAL_DECLINE',
    'ACCOUNT_REGISTER',
  ]),
  catatan: z.string().nullable(),
  createdAt: z.string(),
});
export type NotifikasiDokumen = z.infer<typeof skemaNotifikasiDokumen>;
/** Batas snapshot agar notifikasi baru yang tiba saat konfirmasi tidak ikut terhapus. */
export const skemaBatasNotifikasi = z.strictObject({
  sampaiId: skemaId.optional(),
  sampaiEventId: skemaId.optional(),
});
export type BatasNotifikasi = z.infer<typeof skemaBatasNotifikasi>;
export const skemaHapusSemuaNotifikasi = skemaBatasNotifikasi.refine(
  (v) => !!v.sampaiId || !!v.sampaiEventId,
  'Batas notifikasi wajib diisi',
);
export const skemaHasilHapusNotifikasi = z.strictObject({ jumlahDihapus: z.number().int().min(0) });
export type HasilHapusNotifikasi = z.infer<typeof skemaHasilHapusNotifikasi>;
/** An empty impact list still requires confirmation; readiness uses stored version metadata, never client assertions. */
export const skemaTerbitkanDokumen = z.strictObject({ konfirmasi: skemaKonfirmasiDampakPublikasi });
export const skemaTarikDokumen = z.strictObject({ alasan: teksWajib(1000, 'Alasan penarikan') });
export const skemaCabutDokumen = z.strictObject({ versionId: skemaId, alasan: teksWajib(1000, 'Alasan pencabutan') });
export type MuatanAjukanDokumen = z.infer<typeof skemaAjukanDokumen>;
export type MuatanKembalikanRevisi = z.infer<typeof skemaKembalikanRevisi>;
export type MuatanSetujuiDokumen = z.infer<typeof skemaSetujuiDokumen>;
export type MuatanTerbitkanDokumen = z.infer<typeof skemaTerbitkanDokumen>;
export type MuatanTarikDokumen = z.infer<typeof skemaTarikDokumen>;
