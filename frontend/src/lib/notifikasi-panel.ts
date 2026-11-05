import type { BatasNotifikasi, NotifikasiDokumen } from '@jdih/shared';
export type { BatasNotifikasi } from '@jdih/shared';
import { tautanDetailDokumen } from './panel';

export const AKSI_NOTIFIKASI_MASUK = [
  'SUBMIT',
  'TEMPLATE_SUBMIT',
  'REMOVAL_REQUEST',
  'ACCOUNT_REGISTER',
] as const;
export function notifikasiSetelahBatas(row: NotifikasiDokumen, bounds: BatasNotifikasi) {
  const event = row.id.startsWith('e-');
  const id = event ? row.id.slice(2) : row.id;
  const cutoff = event ? bounds.sampaiEventId : bounds.sampaiId;
  return !cutoff || BigInt(id) > BigInt(cutoff);
}
export function tautanNotifikasi(row: NotifikasiDokumen) {
  if (row.jenis === 'TEMPLATE')
    return ['TEMPLATE_SUBMIT', 'TEMPLATE_APPROVE'].includes(row.action)
      ? '/admin/dokumen/verifikasi#antrean-format'
      : '/admin/format-persuratan';
  if (row.jenis === 'REMOVAL')
    return `/admin/dokumen/verifikasi?permintaanId=${row.requestId ?? ''}&riwayatPermintaan=${row.action === 'REMOVAL_REQUEST' ? '0' : '1'}#permintaan-penghapusan`;
  if (row.jenis === 'ACCOUNT') return '/admin/pengguna?kelompok=DOSEN_STAF';
  if (row.action === 'DOCUMENT_DRAFT_DELETE') return '/admin/dokumen/pengajuan';
  if (row.action === 'DOCUMENT_DELETE' || !row.dokumenId || !row.versionId) return '/admin/dokumen';
  return tautanDetailDokumen(
    row.dokumenId,
    row.versionId,
    ['SUBMIT', 'APPROVE'].includes(row.action)
      ? 'verifikasi'
      : row.action === 'RETURN'
        ? 'pengajuan'
        : 'terverifikasi',
  );
}
