import { z } from 'zod';
import { skemaAksesTemplate, skemaStatusVersiTemplate } from '../enums.js';
import {
  skemaId,
  skemaSlug,
  skemaNomorVersi,
  teksWajib,
  skemaTanggapanHalaman,
  skemaHalaman,
  skemaKataKunci,
} from './common.schema.js';
export const skemaCariTemplate = skemaHalaman.extend({ q: skemaKataKunci.optional() });
export const skemaBuatTemplate = z.strictObject({
  slug: skemaSlug,
  nama: teksWajib(200, 'Nama'),
  deskripsi: z.string().trim().optional(),
});
/** Upload accompanies this metadata; physical MIME/size/checksum/storage key are server-validated. */
export const skemaBuatVersiTemplate = z.strictObject({ tingkatAkses: skemaAksesTemplate });
export const skemaKeputusanTemplate = z.strictObject({});
export const skemaHapusTemplate = z.strictObject({});
export const skemaItemAntreanTemplate = z.strictObject({
  id: skemaId,
  templateSuratId: skemaId,
  nama: teksWajib(255, 'Nama'),
  nomorVersi: skemaNomorVersi,
  tingkatAkses: skemaAksesTemplate,
  status: z.enum(['PENDING_REVIEW', 'APPROVED']),
  pengunggah: teksWajib(255, 'Pengunggah'),
  diajukanPada: z.string(),
  mimeType: z.string().optional(),
  namaAsli: z.string().optional(),
});
export const skemaAntreanTemplate = skemaTanggapanHalaman(skemaItemAntreanTemplate);
export const skemaVersiTemplateAdmin = z.strictObject({
  id: skemaId,
  templateSuratId: skemaId,
  nomorVersi: skemaNomorVersi,
  tingkatAkses: skemaAksesTemplate,
  status: skemaStatusVersiTemplate,
});
const item = {
  id: skemaId,
  slug: skemaSlug,
  nama: teksWajib(200, 'Nama'),
  kemampuan: z.strictObject({ download: z.literal(true), preview: z.boolean().optional() }),
};
/**
 * Tampilan untuk pengunjung anonim sengaja TIDAK memuat `tingkatAkses`. Ruas
 * itu, sekalipun selalu bernilai PUBLIK, memberi tahu pengunjung bahwa ada
 * tingkat akses lain — dan keberadaan format Internal tidak boleh terungkap.
 */
export const skemaItemTemplatePublik = z.strictObject({
  ...item,
});
export const skemaItemTemplateAuthorized = z.strictObject({
  ...item,
  tingkatAkses: skemaAksesTemplate,
});
export const skemaDaftarTemplatePublik = skemaTanggapanHalaman(skemaItemTemplatePublik);
export const skemaDaftarTemplateAuthorized = skemaTanggapanHalaman(skemaItemTemplateAuthorized);
export const skemaMetadataDownloadTemplate = z.strictObject({
  namaAsli: teksWajib(255, 'Nama file'),
  mimeType: teksWajib(150, 'MIME'),
  sizeBytes: skemaId,
});
export const skemaUnggahTemplateAwal = skemaBuatTemplate.extend({
  tingkatAkses: skemaAksesTemplate,
  /** Klien lama/manual mempertahankan alamat persis; otomatis boleh diberi akhiran unik. */
  modeSlug: z.enum(['manual', 'otomatis']).default('manual'),
});
export type MuatanBuatTemplate = z.infer<typeof skemaBuatTemplate>;
export type MuatanBuatVersiTemplate = z.infer<typeof skemaBuatVersiTemplate>;
export type MuatanHapusTemplate = z.infer<typeof skemaHapusTemplate>;
export type ItemAntreanTemplate = z.infer<typeof skemaItemAntreanTemplate>;
export type ItemTemplatePublik = z.infer<typeof skemaItemTemplatePublik>;
export type ItemTemplateAuthorized = z.infer<typeof skemaItemTemplateAuthorized>;
export type VersiTemplateAdmin = z.infer<typeof skemaVersiTemplateAdmin>;
export type MetadataDownloadTemplate = z.infer<typeof skemaMetadataDownloadTemplate>;
export type MuatanUnggahTemplateAwal = z.infer<typeof skemaUnggahTemplateAwal>;
