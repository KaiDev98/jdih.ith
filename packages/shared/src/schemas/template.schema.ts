import { z } from 'zod';
import { skemaAksesTemplate, skemaStatusVersiTemplate } from '../enums.js';
import {
  skemaId,
  skemaSlug,
  skemaNomorVersi,
  teksWajib,
  skemaTanggapanHalaman,
} from './common.schema.js';
export const skemaBuatTemplate = z.strictObject({
  slug: skemaSlug,
  nama: teksWajib(200, 'Nama'),
  deskripsi: z.string().trim().optional(),
});
/** Upload accompanies this metadata; physical MIME/size/checksum/storage key are server-validated. */
export const skemaBuatVersiTemplate = z.strictObject({ tingkatAkses: skemaAksesTemplate });
export const skemaArsipTemplate = z.strictObject({});
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
  kemampuan: z.strictObject({ download: z.literal(true) }),
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
});
export type MuatanBuatTemplate = z.infer<typeof skemaBuatTemplate>;
export type MuatanBuatVersiTemplate = z.infer<typeof skemaBuatVersiTemplate>;
export type MuatanArsipTemplate = z.infer<typeof skemaArsipTemplate>;
export type ItemTemplatePublik = z.infer<typeof skemaItemTemplatePublik>;
export type ItemTemplateAuthorized = z.infer<typeof skemaItemTemplateAuthorized>;
export type VersiTemplateAdmin = z.infer<typeof skemaVersiTemplateAdmin>;
export type MetadataDownloadTemplate = z.infer<typeof skemaMetadataDownloadTemplate>;
export type MuatanUnggahTemplateAwal = z.infer<typeof skemaUnggahTemplateAwal>;
