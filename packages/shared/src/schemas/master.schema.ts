import { z } from 'zod';
import { skemaId, teksWajib } from './common.schema.js';

export const skemaJenisDokumen = z.strictObject({
  kode: teksWajib(40, 'Kode'),
  nama: teksWajib(150, 'Nama'),
  urutan: z.number().int().min(0).max(65535).optional(),
  aktif: z.boolean().optional(),
});
/** Kategori SOP. Unit kerja mengikuti kategori ini, jadi kodenya dibatasi selebar kode unit. */
export const skemaKategori = z.strictObject({
  kode: teksWajib(40, 'Kode'),
  nama: teksWajib(150, 'Nama'),
  aktif: z.boolean().optional(),
});
/** Semua unit/kategori terlihat; kelayakan pilihan dihitung ulang oleh server. */
export const skemaPilihanKategoriDokumen = z.strictObject({
  id: skemaId,
  kode: z.string(),
  nama: z.string(),
  aktif: z.boolean(),
  bolehPilih: z.boolean(),
});
export type PilihanKategoriDokumen = z.infer<typeof skemaPilihanKategoriDokumen>;
export const skemaTag = z.strictObject({ nama: teksWajib(100, 'Nama') });
export const skemaStatusMaster = z.strictObject({ aktif: z.boolean() });
export const skemaParamMaster = z.strictObject({ id: skemaId });
