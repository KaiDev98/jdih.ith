// Generated from database/v2/seed.sql by npm run gen:permissions. No role provisioning API.
import { z } from 'zod';
export const IZIN = {
  DOCUMENTS_READ_ADMIN: 'documents.read_admin',
  DOCUMENTS_CREATE: 'documents.create',
  DOCUMENTS_EDIT: 'documents.edit',
  DOCUMENTS_UPLOAD: 'documents.upload',
  DOCUMENTS_REVISE: 'documents.revise',
  DOCUMENTS_DELETE: 'documents.delete',
  WORKFLOW_SUBMIT: 'workflow.submit',
  WORKFLOW_RETURN: 'workflow.return',
  WORKFLOW_APPROVE: 'workflow.approve',
  WORKFLOW_PUBLISH: 'workflow.publish',
  WORKFLOW_WITHDRAW: 'workflow.withdraw',
  LEGAL_MANAGE_RELATIONS: 'legal.manage_relations',
  LEGAL_CORRECT_STATUS: 'legal.correct_status',
  USERS_READ: 'users.read',
  USERS_APPROVE: 'users.approve',
  USERS_REJECT: 'users.reject',
  USERS_SET_STATUS: 'users.set_status',
  UNITS_MANAGE: 'units.manage',
  MASTER_MANAGE: 'master.manage',
  SECRET_MANAGE: 'secret.manage',
  SECRET_READ_ADMIN: 'secret.read_admin',
  TEMPLATES_MANAGE: 'templates.manage',
  DASHBOARD_READ: 'dashboard.read',
  AUDIT_READ: 'audit.read',
  CONTACT_MANAGE: 'contact.manage',
} as const;
export const skemaIzin = z.enum(IZIN);
export type KodeIzin = z.infer<typeof skemaIzin>;
export const SEMUA_IZIN = Object.values(IZIN);
export const MODUL_IZIN = [
  'documents',
  'workflow',
  'legal-relations',
  'users',
  'units',
  'master',
  'secret-access',
  'letter-templates',
  'dashboard',
  'audit',
  'settings',
] as const;
export type ModulIzin = (typeof MODUL_IZIN)[number];
/** All writes and sensitive Secret reads; not a replacement for UI confirmation on every write. */
export const IZIN_BERDAMPAK_TINGGI: readonly KodeIzin[] = SEMUA_IZIN.filter(
  (i) =>
    ![IZIN.DOCUMENTS_READ_ADMIN, IZIN.USERS_READ, IZIN.DASHBOARD_READ, IZIN.AUDIT_READ].some(
      (read) => read === i,
    ),
);
export interface MetaIzin {
  readonly kode: KodeIzin;
  readonly nama: string;
  readonly modul: ModulIzin;
}
export const KATALOG_IZIN: readonly MetaIzin[] = [
  {
    kode: 'documents.read_admin',
    nama: 'Melihat dokumen administratif',
    modul: 'documents',
  },
  {
    kode: 'documents.create',
    nama: 'Membuat dokumen dan draf',
    modul: 'documents',
  },
  {
    kode: 'documents.edit',
    nama: 'Mengubah draf dan metadata',
    modul: 'documents',
  },
  {
    kode: 'documents.upload',
    nama: 'Mengunggah file dan lampiran',
    modul: 'documents',
  },
  {
    kode: 'documents.revise',
    nama: 'Membuat revisi baru',
    modul: 'documents',
  },
  {
    kode: 'documents.delete',
    nama: 'Menghapus dokumen secara permanen',
    modul: 'documents',
  },
  {
    kode: 'workflow.submit',
    nama: 'Mengajukan versi',
    modul: 'workflow',
  },
  {
    kode: 'workflow.return',
    nama: 'Mengembalikan dengan catatan revisi',
    modul: 'workflow',
  },
  {
    kode: 'workflow.approve',
    nama: 'Menyetujui versi pihak lain',
    modul: 'workflow',
  },
  {
    kode: 'workflow.publish',
    nama: 'Menerbitkan dan mengonfirmasi dampak hukum',
    modul: 'workflow',
  },
  {
    kode: 'workflow.withdraw',
    nama: 'Menarik publikasi dengan alasan',
    modul: 'workflow',
  },
  {
    kode: 'legal.manage_relations',
    nama: 'Mengelola relasi pada draf',
    modul: 'legal-relations',
  },
  {
    kode: 'legal.correct_status',
    nama: 'Koreksi status hukum dengan audit',
    modul: 'legal-relations',
  },
  {
    kode: 'users.read',
    nama: 'Melihat akun dan antrean verifikasi',
    modul: 'users',
  },
  {
    kode: 'users.approve',
    nama: 'Menyetujui pendaftaran Dosen/Staf',
    modul: 'users',
  },
  {
    kode: 'users.reject',
    nama: 'Menolak pendaftaran dengan alasan',
    modul: 'users',
  },
  {
    kode: 'users.set_status',
    nama: 'Mengelola status akun',
    modul: 'users',
  },
  {
    kode: 'units.manage',
    nama: 'Mengelola unit dan resolusi unit manual',
    modul: 'units',
  },
  {
    kode: 'master.manage',
    nama: 'Mengelola jenis kategori dan tag',
    modul: 'master',
  },
  {
    kode: 'secret.manage',
    nama: 'Mengelola grant Rahasia',
    modul: 'secret-access',
  },
  {
    kode: 'secret.read_admin',
    nama: 'Akses Rahasia untuk administrasi',
    modul: 'secret-access',
  },
  {
    kode: 'templates.manage',
    nama: 'Mengelola versi Format Persuratan',
    modul: 'letter-templates',
  },
  {
    kode: 'dashboard.read',
    nama: 'Melihat dashboard administratif',
    modul: 'dashboard',
  },
  {
    kode: 'audit.read',
    nama: 'Melihat audit sesuai kewenangan',
    modul: 'audit',
  },
  {
    kode: 'contact.manage',
    nama: 'Mengelola kontak kantor',
    modul: 'settings',
  },
];
export function cariIzin(kode: KodeIzin): MetaIzin | undefined {
  return KATALOG_IZIN.find((i) => i.kode === kode);
}
export function adalahKodeIzin(nilai: unknown): nilai is KodeIzin {
  return skemaIzin.safeParse(nilai).success;
}
