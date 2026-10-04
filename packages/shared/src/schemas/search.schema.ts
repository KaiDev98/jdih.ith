import { z } from 'zod';
import { skemaStatusHukum, skemaStatusWorkflow, skemaTingkatAkses } from '../enums.js';
import { URUTAN_DOKUMEN } from '../api.js';
import {
  skemaId,
  skemaSlug,
  skemaTahun,
  skemaTanggal,
  skemaHalaman,
  teksWajib,
  skemaTanggapanHalaman,
} from './common.schema.js';
const tahunKueri = z.union([
  skemaTahun,
  z
    .string()
    .regex(/^[0-9]{4}$/)
    .transform(Number)
    .pipe(skemaTahun),
]);
/** q searches metadata only: title, number, year, type, category, tags. */
export const skemaCariDokumen = skemaHalaman.extend({
  q: z.string().trim().max(200).optional(),
  jenisDokumenId: skemaId.optional(),
  tahun: tahunKueri.optional(),
  unitKerjaId: skemaId.optional(),
  kategoriId: skemaId.optional(),
  statusHukum: skemaStatusHukum.optional(),
  urut: z.enum(URUTAN_DOKUMEN).default('relevansi'),
});
export const skemaCariDokumenAdmin = skemaCariDokumen.extend({
  statusWorkflow: skemaStatusWorkflow.optional(),
  tingkatAkses: skemaTingkatAkses.optional(),
});
const ringkasan = {
  id: skemaId,
  slug: skemaSlug,
  tipe: teksWajib(150, 'Tipe'),
  judul: teksWajib(500, 'Judul'),
  nomor: teksWajib(100, 'Nomor'),
  tahun: skemaTahun.nullable(),
  tanggalPenetapan: skemaTanggal,
  statusHukum: skemaStatusHukum,
};
export const skemaHasilCariPublik = z.strictObject({ ...ringkasan, badge: z.literal('PUBLIK') });
/** Anonymous display only: never clickable; no ID, slug, metadata, file, URL or capability. */
export const skemaHasilCariInternalAnonim = z.strictObject({
  judul: teksWajib(500, 'Judul'),
  badge: z.literal('INTERNAL'),
});
export const skemaHasilCariAnonim = z.discriminatedUnion('badge', [
  skemaHasilCariPublik,
  skemaHasilCariInternalAnonim,
]);
export const skemaTanggapanCariAnonim = skemaTanggapanHalaman(skemaHasilCariAnonim);
/** Only for an authenticated channel AFTER backend policy filtering. */
export const skemaHasilCariAuthorized = z.strictObject({
  ...ringkasan,
  tingkatAkses: skemaTingkatAkses,
});
export const skemaTanggapanCariAuthorized = skemaTanggapanHalaman(skemaHasilCariAuthorized);
export type KueriCariDokumen = z.infer<typeof skemaCariDokumen>;
export type KueriCariDokumenAdmin = z.infer<typeof skemaCariDokumenAdmin>;
export type HasilCariAnonim = z.infer<typeof skemaHasilCariAnonim>;
export type HasilCariAuthorized = z.infer<typeof skemaHasilCariAuthorized>;
