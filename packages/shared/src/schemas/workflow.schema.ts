import { z } from 'zod';
import { teksWajib } from './common.schema.js';
import { skemaStatusHukum } from '../enums.js';
import { skemaKonfirmasiDampakPublikasi } from './relasi.schema.js';
// Version ID is a route parameter. No actor, verifier, state or timestamp from the client.
export const skemaAjukanDokumen = z.strictObject({
  catatan: z.string().trim().max(2000).optional(),
});
export const skemaKembalikanRevisi = z.strictObject({ catatan: teksWajib(2000, 'Catatan revisi') });
export const skemaSetujuiDokumen = z.strictObject({
  catatan: z.string().trim().max(2000).optional(),
});
/** An empty impact list still requires confirmation; readiness uses stored version metadata, never client assertions. */
export const skemaTerbitkanDokumen = z.strictObject({ konfirmasi: skemaKonfirmasiDampakPublikasi });
export const skemaTarikDokumen = z.strictObject({ alasan: teksWajib(1000, 'Alasan penarikan') });
export type MuatanAjukanDokumen = z.infer<typeof skemaAjukanDokumen>;
export type MuatanKembalikanRevisi = z.infer<typeof skemaKembalikanRevisi>;
export type MuatanSetujuiDokumen = z.infer<typeof skemaSetujuiDokumen>;
export type MuatanTerbitkanDokumen = z.infer<typeof skemaTerbitkanDokumen>;
export type MuatanTarikDokumen = z.infer<typeof skemaTarikDokumen>;

/** Admin mengubah status hukum dokumen secara langsung; alasan dicatat di riwayat. */
export const skemaUbahStatusHukum = z.strictObject({
  statusHukum: skemaStatusHukum,
  alasan: teksWajib(1000, 'Alasan perubahan status'),
});
export type MuatanUbahStatusHukum = z.infer<typeof skemaUbahStatusHukum>;
