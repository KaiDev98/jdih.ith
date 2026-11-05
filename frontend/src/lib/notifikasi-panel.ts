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
    return row.action === 'TEMPLATE_SUBMIT'
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
    row.action === 'SUBMIT'
      ? 'verifikasi'
      : row.action === 'RETURN'
        ? 'pengajuan'
        : 'terverifikasi',
  );
}
