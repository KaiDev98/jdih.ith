import {
  Building2,
  ClipboardCheck,
  FilePlus2,
  Files,
  FileText,
  FolderTree,
  History,
  LayoutDashboard,
  Phone,
  Shapes,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { PenggunaAktif } from '@jdih/shared';

type Izin = PenggunaAktif['izin'][number];
export type ButirNav = { label: string; href: string; ikon: LucideIcon; izin: readonly Izin[] };
export type KelompokNav = { judul: string; butir: readonly ButirNav[] };

/** Menu panel admin, dikelompokkan menurut pekerjaan. Butir tampil bila akun punya salah satu izinnya. */
export const MENU_ADMIN: readonly KelompokNav[] = [
  {
    judul: 'Umum',
    butir: [{ label: 'Dasbor', href: '/admin', ikon: LayoutDashboard, izin: ['dashboard.read'] }],
  },
  {
    judul: 'Dokumen',
    butir: [
      {
        label: 'Semua Dokumen',
        href: '/admin/dokumen',
        ikon: Files,
        izin: ['documents.read_admin'],
      },
      {
        label: 'Buat Dokumen',
        href: '/admin/dokumen/baru',
        ikon: FilePlus2,
        izin: ['documents.create'],
      },
      {
        label: 'Antrean Verifikasi',
        href: '/admin/dokumen/verifikasi',
        ikon: ClipboardCheck,
        izin: ['workflow.approve', 'workflow.return', 'documents.read_admin'],
      },
    ],
  },
  {
    judul: 'Data Master',
    butir: [
      {
        label: 'Jenis Dokumen',
        href: '/admin/jenis-dokumen',
        ikon: Shapes,
        izin: ['master.manage'],
      },
      { label: 'Kategori', href: '/admin/kategori', ikon: FolderTree, izin: ['master.manage'] },
      { label: 'Unit Kerja', href: '/admin/unit-kerja', ikon: Building2, izin: ['units.manage'] },
    ],
  },
  {
    judul: 'Layanan',
    butir: [
      {
        label: 'Format Persuratan',
        href: '/admin/format-persuratan',
        ikon: FileText,
        izin: ['templates.manage'],
      },
      { label: 'Kontak Kantor', href: '/admin/kontak', ikon: Phone, izin: ['contact.manage'] },
    ],
  },
  {
    judul: 'Sistem',
    butir: [
      { label: 'Pengguna', href: '/admin/pengguna', ikon: Users, izin: ['users.read'] },
      { label: 'Audit', href: '/admin/audit', ikon: History, izin: ['audit.read'] },
    ],
  },
];

/** Semua izin yang membuka panel admin. */
export const IZIN_PANEL = new Set(MENU_ADMIN.flatMap((k) => k.butir.flatMap((b) => b.izin)));

/** Menu yang boleh dilihat akun ini; kelompok kosong disembunyikan. */
export function menuUntuk(izin: readonly string[]): KelompokNav[] {
  return MENU_ADMIN.map((k) => ({
    ...k,
    butir: k.butir.filter((b) => b.izin.some((i) => izin.includes(i))),
  })).filter((k) => k.butir.length > 0);
}

/** Butir aktif = href terpanjang yang cocok dengan alamat saat ini. */
export function hrefAktif(pathname: string, menu: readonly KelompokNav[]) {
  const semua = menu.flatMap((k) => k.butir.map((b) => b.href));
  return semua
    .filter((h) => pathname === h || (h !== '/admin' && pathname.startsWith(h + '/')))
    .sort((a, b) => b.length - a.length)[0];
}

const LABEL_SEGMEN: Record<string, string> = {
  dokumen: 'Dokumen',
  baru: 'Buat dokumen',
  verifikasi: 'Antrean verifikasi',
  ubah: 'Ubah draf',
  pengguna: 'Pengguna',
  'unit-kerja': 'Unit Kerja',
  'jenis-dokumen': 'Jenis Dokumen',
  kategori: 'Kategori',
  'format-persuratan': 'Format Persuratan',
  kontak: 'Kontak Kantor',
  audit: 'Audit',
  profil: 'Pengaturan Profil',
};

/** Jejak halaman dari alamat, mis. /admin/dokumen/12/ubah → Dasbor › Dokumen › Detail dokumen › Ubah draf. */
export function jejakHalaman(pathname: string): { label: string; href: string }[] {
  const segmen = pathname.split('/').filter(Boolean).slice(1);
  const jejak = [{ label: 'Dasbor', href: '/admin' }];
  let href = '/admin';
  for (const s of segmen) {
    href += `/${s}`;
    jejak.push({ label: LABEL_SEGMEN[s] ?? (/^\d+$/.test(s) ? 'Detail dokumen' : s), href });
  }
  return jejak;
}

export type PeranTampil = { teks: 'Superadmin' | 'Admin'; varian: 'superadmin' | 'admin' } | null;
export function peranTampil(peran: readonly string[]): PeranTampil {
  if (peran.includes('SUPERADMIN')) return { teks: 'Superadmin', varian: 'superadmin' };
  if (peran.includes('ADMIN')) return { teks: 'Admin', varian: 'admin' };
  return null;
}

export function inisial(nama: string) {
  const kata = nama.trim().split(/\s+/).filter(Boolean);
  return (
    ((kata[0]?.[0] ?? '') + (kata.length > 1 ? (kata.at(-1)?.[0] ?? '') : '')).toUpperCase() || '?'
  );
}
