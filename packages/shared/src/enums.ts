/** Canonical V2 values, aligned with database/v2/schema.sql. */
import { z } from 'zod';
export const TINGKAT_AKSES = ['publik', 'internal'] as const;
export const STATUS_WORKFLOW = [
  'DRAF',
  'DIAJUKAN',
  'REVISI',
  'DISETUJUI',
  'TERBIT',
  'DITARIK',
] as const;
export const STATUS_HUKUM = ['BERLAKU', 'DIUBAH', 'DICABUT'] as const;
export const JENIS_RELASI = ['MENGUBAH', 'MENCABUT', 'DASAR_HUKUM', 'TERKAIT'] as const;
export const STATUS_PENGGUNA = ['MENUNGGU_VERIFIKASI', 'AKTIF', 'DITOLAK', 'NONAKTIF'] as const;
export const JENIS_BERKAS = ['UTAMA', 'LAMPIRAN'] as const;
export const AKSES_TEMPLATE = ['PUBLIK', 'INTERNAL'] as const;
export const STATUS_VERSI_TEMPLATE = ['ACTIVE', 'ARCHIVED'] as const;
export const EFEK_IZIN = ['ALLOW', 'DENY'] as const;
export const AKSI_WORKFLOW = [
  'CREATE',
  'SUBMIT',
  'RETURN',
  'APPROVE',
  'PUBLISH',
  'WITHDRAW',
] as const;
export const skemaTingkatAkses = z.enum(TINGKAT_AKSES);
export const skemaStatusWorkflow = z.enum(STATUS_WORKFLOW);
export const skemaStatusHukum = z.enum(STATUS_HUKUM);
export const skemaJenisRelasi = z.enum(JENIS_RELASI);
export const skemaStatusPengguna = z.enum(STATUS_PENGGUNA);
export const skemaJenisBerkas = z.enum(JENIS_BERKAS);
export const skemaAksesTemplate = z.enum(AKSES_TEMPLATE);
export const skemaStatusVersiTemplate = z.enum(STATUS_VERSI_TEMPLATE);
export type TingkatAkses = z.infer<typeof skemaTingkatAkses>;
export type StatusWorkflow = z.infer<typeof skemaStatusWorkflow>;
export type StatusHukum = z.infer<typeof skemaStatusHukum>;
export type JenisRelasi = z.infer<typeof skemaJenisRelasi>;
export type StatusPengguna = z.infer<typeof skemaStatusPengguna>;
export type JenisBerkas = z.infer<typeof skemaJenisBerkas>;
export type AksesTemplate = z.infer<typeof skemaAksesTemplate>;
export type StatusVersiTemplate = z.infer<typeof skemaStatusVersiTemplate>;
// Display aliases only: no legacy values or workflow authority.
export const STATUS_KEBERLAKUAN = STATUS_HUKUM;
export const LABEL_STATUS_KEBERLAKUAN: Record<StatusHukum, string> = {
  BERLAKU: 'Berlaku',
  DIUBAH: 'Diubah',
  DICABUT: 'Dicabut',
};
export const WARNA_STATUS_KEBERLAKUAN: Record<StatusHukum, string> = {
  BERLAKU: '#16A34A',
  DIUBAH: '#F59E0B',
  DICABUT: '#DC2626',
};
