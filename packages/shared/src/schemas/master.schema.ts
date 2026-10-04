import { z } from 'zod';
import { skemaId, teksWajib } from './common.schema.js';

export const skemaUnitKerja = z.strictObject({
  kode: teksWajib(40, 'Kode'),
  nama: teksWajib(200, 'Nama'),
  parentId: skemaId.nullable().optional(),
  aktif: z.boolean().optional(),
});
export const skemaJenisDokumen = z.strictObject({
  kode: teksWajib(40, 'Kode'),
  nama: teksWajib(150, 'Nama'),
  urutan: z.number().int().min(0).max(65535).optional(),
  aktif: z.boolean().optional(),
});
export const skemaKategori = z.strictObject({
  kode: teksWajib(60, 'Kode'),
  nama: teksWajib(150, 'Nama'),
  aktif: z.boolean().optional(),
});
export const skemaTag = z.strictObject({ nama: teksWajib(100, 'Nama') });
export const skemaStatusMaster = z.strictObject({ aktif: z.boolean() });
export const skemaParamMaster = z.strictObject({ id: skemaId });
