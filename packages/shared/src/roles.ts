import { z } from 'zod';
/** Persisted roles only. Visitors are anonymous actors, never account roles. */
export const PERAN = {
  SUPERADMIN: 'SUPERADMIN',
  ADMIN: 'ADMIN',
  DOSEN_STAF: 'DOSEN_STAF',
} as const;
export const skemaPeran = z.enum(PERAN);
export type KodePeran = z.infer<typeof skemaPeran>;
export const SEMUA_PERAN = Object.values(PERAN);
export const AKTOR_ANONIM = 'PENGUNJUNG' as const;
export interface MetaPeran {
  readonly kode: KodePeran;
  readonly nama: string;
  readonly deskripsi: string;
}
export const KATALOG_PERAN: readonly MetaPeran[] = [
  {
    kode: PERAN.SUPERADMIN,
    nama: 'Superadmin',
    deskripsi: 'Akun operations; tidak dapat dibuat atau dipromosikan melalui aplikasi.',
  },
  {
    kode: PERAN.ADMIN,
    nama: 'Admin',
    deskripsi: 'Pengelola sesuai permission; verifikator memakai permission tambahan.',
  },
  {
    kode: PERAN.DOSEN_STAF,
    nama: 'Dosen/Staf',
    deskripsi: 'Akun AKTIF mengakses Internal lintas unit; Rahasia memerlukan explicit grant.',
  },
];
export function cariPeran(kode: KodePeran): MetaPeran | undefined {
  return KATALOG_PERAN.find((p) => p.kode === kode);
}
