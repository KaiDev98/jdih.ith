import { z } from 'zod';
import { skemaId, teksWajib } from './common.schema.js';
import { skemaKonfirmasiDampakPublikasi } from './relasi.schema.js';
// Version ID is a route parameter. No actor, verifier, state or timestamp from the client.
export const skemaAjukanDokumen = z.strictObject({
  catatan: z.string().trim().max(2000).optional(),
});
export const skemaKembalikanRevisi = z.strictObject({ catatan: teksWajib(2000, 'Catatan revisi') });
export const skemaSetujuiDokumen = z.strictObject({
  catatan: z.string().trim().max(2000).transform((value) => value || undefined).optional(),
  /** SOP Permohonan SK disetujui dan diterbitkan dalam satu transaksi. */
  konfirmasi: skemaKonfirmasiDampakPublikasi.optional(),
});
export const skemaNotifikasiDokumen = z.strictObject({
  id: skemaId,
  dokumenId: skemaId,
  versionId: skemaId,
  judul: z.string(),
  action: z.enum(['SUBMIT', 'RETURN', 'APPROVE']),
  catatan: z.string().nullable(),
  createdAt: z.string(),
});
export type NotifikasiDokumen = z.infer<typeof skemaNotifikasiDokumen>;
/** Batas snapshot agar notifikasi baru yang tiba saat konfirmasi tidak ikut terhapus. */
export const skemaHapusSemuaNotifikasi = z.strictObject({ sampaiId: skemaId });
export const skemaHasilHapusNotifikasi = z.strictObject({ jumlahDihapus: z.number().int().min(0) });
export type HasilHapusNotifikasi = z.infer<typeof skemaHasilHapusNotifikasi>;
/** An empty impact list still requires confirmation; readiness uses stored version metadata, never client assertions. */
export const skemaTerbitkanDokumen = z.strictObject({ konfirmasi: skemaKonfirmasiDampakPublikasi });
export const skemaTarikDokumen = z.strictObject({ alasan: teksWajib(1000, 'Alasan penarikan') });
export type MuatanAjukanDokumen = z.infer<typeof skemaAjukanDokumen>;
export type MuatanKembalikanRevisi = z.infer<typeof skemaKembalikanRevisi>;
export type MuatanSetujuiDokumen = z.infer<typeof skemaSetujuiDokumen>;
export type MuatanTerbitkanDokumen = z.infer<typeof skemaTerbitkanDokumen>;
export type MuatanTarikDokumen = z.infer<typeof skemaTarikDokumen>;
