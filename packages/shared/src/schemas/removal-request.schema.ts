import { z } from 'zod';
import { skemaId, teksWajib } from './common.schema.js';

export const skemaPermintaanPenghapusan = z.strictObject({
  jenis: z.enum(['WITHDRAW', 'DELETE']),
  alasan: teksWajib(1000, 'Alasan permintaan'),
});
export const skemaKeputusanPenghapusan = z.strictObject({
  keputusan: z.enum(['APPROVE', 'DECLINE']),
  catatan: z.string().trim().max(1000).default(''),
});
export const skemaDaftarPermintaanPenghapusan = z.strictObject({
  sumber: z.enum(['DOCUMENT', 'TEMPLATE']).optional(),
  resourceId: skemaId.optional(),
  requestId: skemaId.optional(),
  halaman: z.coerce.number().int().min(1).max(100000).default(1),
  perHalaman: z.coerce.number().int().min(1).max(50).default(10),
  status: z.enum(['PENDING', 'APPROVED', 'DECLINED', 'OBSOLETE', 'ALL']).default('PENDING'),
});
export type SumberPermintaanPenghapusan = 'DOCUMENT' | 'TEMPLATE';
export interface PermintaanPenghapusan {
  id: string;
  sumber: SumberPermintaanPenghapusan;
  resourceId: string;
  versionId: string | null;
  judul: string;
  jenis: 'WITHDRAW' | 'DELETE';
  alasan: string;
  status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'OBSOLETE';
  pemohon: string;
  catatan: string | null;
  createdAt: string;
}
