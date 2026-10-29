import {
  ClipboardCheck,
  FilePlus2,
  FileSignature,
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
import { alamatPanel } from '@/lib/panel';

type Izin = PenggunaAktif['izin'][number];
export type ButirNav = {
  label: string;
  href: string;
  ikon: LucideIcon;
  izin: readonly Izin[];
  /** Tetap terlihat untuk menjelaskan fitur, tetapi tidak dapat dibuka oleh peran ini. */
  disabled?: boolean;
  disabledReason?: string;
  superadminOnly?: boolean;
  /** Kata lain untuk pencarian cepat (Ctrl+K). */
  kataKunci?: string;
};
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
        label: 'Upload Dokumen',
        href: '/admin/dokumen/baru',
        ikon: FilePlus2,
        izin: ['documents.create'],
      },
      {
        label: 'Draf dan Pengajuan',
        href: '/admin/dokumen/pengajuan',
        ikon: FileText,
        izin: ['documents.read_admin'],
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
      { label: 'Kategori SOP', href: '/admin/kategori', ikon: FolderTree, izin: ['master.manage'] },
    ],
  },
  {
    judul: 'Layanan',
    butir: [
      {
        label: 'SOP Permohonan SK',
        href: '/admin/sop-permohonan-sk',
        superadminOnly: true,
        ikon: FileSignature,
        izin: ['documents.read_admin'],
        kataKunci: 'surat keputusan prosedur pengajuan',
      },
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
      { label: 'Audit', href: '/admin/audit', ikon: History, izin: ['audit.read'], superadminOnly: true },
    ],
  },
];

/** Aksi cepat di pencarian (Ctrl+K); tampil bila akun punya salah satu izinnya. */
export const AKSI_CEPAT: readonly ButirNav[] = [
  {
    label: 'Upload dokumen hukum baru',
    href: '/admin/dokumen/baru',
    ikon: FilePlus2,
    izin: ['documents.create'],
    kataKunci: 'unggah tambah buat draf',
  },
  {
    label: 'Unggah SOP Permohonan SK',
    href: '/admin/sop-permohonan-sk/baru',
    superadminOnly: true,
    ikon: FileSignature,
    izin: ['documents.create'],
    kataKunci: 'surat keputusan prosedur',
  },
  {
    label: 'Tinjau antrean verifikasi',
    href: '/admin/dokumen/verifikasi',
    ikon: ClipboardCheck,
    izin: ['workflow.approve', 'workflow.return'],
    kataKunci: 'setujui periksa ajukan',
  },
];

/** Semua izin yang membuka panel admin. */
export const IZIN_PANEL = new Set(MENU_ADMIN.flatMap((k) => k.butir.flatMap((b) => b.izin)));

/** Admin boleh membuka informasi global; otorisasi perubahan ada di setiap halaman/API. */
export function menuUntuk(izin: readonly string[], peran: readonly string[] = []): KelompokNav[] {
  const superadmin = peran.includes('SUPERADMIN');
  const pengelola = superadmin || peran.includes('ADMIN');
  return MENU_ADMIN.map((k) => ({
    ...k,
    butir: k.butir
      .filter((b) => (!b.superadminOnly || superadmin) &&
        (pengelola || b.izin.some((i) => izin.includes(i))))
      .map((b) => ({ ...b, href: alamatPanel(peran, b.href) })),
  })).filter((k) => k.butir.length > 0);
}

/** Butir aktif = href terpanjang yang cocok dengan alamat saat ini. */
export function hrefAktif(pathname: string, menu: readonly KelompokNav[]) {
  const semua = menu.flatMap((k) => k.butir.filter((b) => !b.disabled).map((b) => b.href));
  return semua
    .filter((h) => pathname === h || (!['/admin', '/superadmin'].includes(h) && pathname.startsWith(h + '/')))
    .sort((a, b) => b.length - a.length)[0];
}

/** Tampilan client-side tambahan; backend tetap sumber otorisasi. */
export function halamanAdminBolehDibuka(pathname: string, peran: readonly string[]) {
  if (/^\/(admin|superadmin)\/(sop-permohonan-sk|audit)(\/|$)/.test(pathname) &&
    !peran.includes('SUPERADMIN')) return false;
  return /^\/(admin|superadmin)(\/|$)/.test(pathname) &&
    peran.some((p) => p === 'ADMIN' || p === 'SUPERADMIN');
}

const LABEL_SEGMEN: Record<string, string> = {
  'sop-permohonan-sk': 'SOP Permohonan SK',
  'sop-permohonan-sk/baru': 'Unggah dokumen',
  dokumen: 'Dokumen',
  baru: 'Upload dokumen',
  verifikasi: 'Antrean verifikasi',
  pengajuan: 'Draf dan pengajuan',
  ubah: 'Ubah draf',
  pengguna: 'Pengguna',
  'jenis-dokumen': 'Jenis Dokumen',
  kategori: 'Kategori SOP',
  'format-persuratan': 'Format Persuratan',
  kontak: 'Kontak Kantor',
  audit: 'Audit',
  profil: 'Pengaturan Profil',
};

/** Jejak halaman dari alamat, mis. /admin/dokumen/12/ubah → Dasbor › Dokumen › Detail dokumen › Ubah draf. */
export function jejakHalaman(pathname: string): { label: string; href: string }[] {
  const segmen = pathname.split('/').filter(Boolean).slice(1);
  const akar = pathname.startsWith('/superadmin') ? '/superadmin' : '/admin';
  const jejak = [{ label: 'Dasbor', href: akar }];
  let href = akar;
  segmen.forEach((s, i) => {
    href += `/${s}`;
    // Antrean/pengajuan merupakan daftar tersendiri, bukan anak Semua Dokumen.
    if (i === 0 && s === 'dokumen' && ['verifikasi', 'pengajuan'].includes(segmen[1] ?? '')) return;
    // Label bergantung induknya lebih dulu, mis. "sop-permohonan-sk/baru".
    const label =
      LABEL_SEGMEN[`${segmen[i - 1] ?? ''}/${s}`] ??
      LABEL_SEGMEN[s] ??
      (/^\d+$/.test(s) ? 'Detail dokumen' : s);
    jejak.push({ label, href });
  });
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
