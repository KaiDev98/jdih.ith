'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { ambilApi } from '@/lib/api-client';
import { useSession, csrfHeaders } from '@/lib/sesi';
import { ConfirmAction, StateMessage } from '@/components/ui';

const links = [
  { label: 'Dasbor', href: '/admin', izin: 'dashboard.read' },
  { label: 'Semua Dokumen', href: '/admin/dokumen', izin: 'documents.read_admin' },
  { label: 'Buat Dokumen', href: '/admin/dokumen/baru', izin: 'documents.create' },
  { label: 'Antrean Verifikasi', href: '/admin/dokumen/verifikasi', izin: ['workflow.approve','workflow.return','documents.read_admin'] },
  { label: 'Pengguna', href: '/admin/pengguna', izin: 'users.read' },
  { label: 'Akses Rahasia', href: '/admin/dokumen', izin: 'secret.manage' },
  { label: 'Unit Kerja', href: '/admin/unit-kerja', izin: 'units.manage' },
  { label: 'Jenis Dokumen', href: '/admin/jenis-dokumen', izin: 'master.manage' },
  { label: 'Kategori', href: '/admin/kategori', izin: 'master.manage' },
  { label: 'Tag', href: '/admin/tag', izin: 'master.manage' },
  { label: 'Format Persuratan', href: '/admin/format-persuratan', izin: 'templates.manage' },
  { label: 'Kontak Kantor', href: '/admin/kontak', izin: 'contact.manage' },
  { label: 'Audit', href: '/admin/audit', izin: 'audit.read' },
];
const adminPermissions = new Set(links.flatMap((x) => Array.isArray(x.izin) ? x.izin : [x.izin]));

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { state, pengguna, galat, muatUlang, csrfToken } = useSession();
  const pathname = usePathname(); const router = useRouter(); const [menu, setMenu] = useState(false); const [busy, setBusy] = useState(false);
  async function logout() {
    setBusy(true);
    try { await ambilApi('/auth/logout', { method: 'POST', headers: csrfHeaders(csrfToken) }); await muatUlang(); router.replace('/'); }
    catch { throw new Error('Keluar gagal. Coba lagi.'); }
    finally { setBusy(false); }
  }
  if (state === 'loading') return <main className="mx-auto max-w-3xl p-8"><StateMessage title="Memeriksa sesi…" /></main>;
  if (state === 'error') return <main className="mx-auto max-w-3xl p-8"><StateMessage title="Status akun belum tersedia" kind="error">{galat}<button className="ml-2 underline" onClick={() => void muatUlang()}>Coba lagi</button></StateMessage></main>;
  if (state !== 'authenticated' || !pengguna) return <main className="mx-auto max-w-3xl p-8"><StateMessage title="Masuk diperlukan">Masuk dengan akun Google ITH yang telah disetujui. <Link className="font-semibold underline" href="/masuk">Masuk</Link></StateMessage></main>;
  if (pengguna.status !== 'AKTIF') return <main className="mx-auto max-w-3xl p-8"><StateMessage title="Akun belum aktif">DOSEN/STAF + MENUNGGU_VERIFIKASI belum memiliki akses Internal. Hubungi administrator.</StateMessage></main>;
  if (!pengguna.izin.some((i) => adminPermissions.has(i))) return <main className="mx-auto max-w-3xl p-8"><StateMessage title="Akses panel tidak tersedia">Akun aktif ini belum memiliki izin panel administrasi.</StateMessage></main>;
  const visible = links.filter((item) => (Array.isArray(item.izin) ? item.izin : [item.izin]).some((izin) => pengguna.izin.includes(izin as (typeof pengguna.izin)[number])));
  return <div className="min-h-screen bg-slate-100">
    <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
      <div className="flex items-center gap-3"><button type="button" className="rounded border px-3 py-2 lg:hidden" aria-expanded={menu} aria-controls="menu-admin" onClick={() => setMenu(!menu)}>Menu</button><Link href="/admin" className="font-bold text-slate-950">JDIH ITH <span className="font-normal text-slate-500">/ Admin</span></Link></div>
      <div className="flex items-center gap-3 text-sm"><span className="hidden text-slate-600 sm:inline">{pengguna.nama}</span><Link href="/" className="underline">Portal publik</Link><ConfirmAction label={busy ? 'Keluar…' : 'Keluar'} title="Keluar dari akun?" description="Sesi ini akan dicabut pada server." tone="secondary" onConfirm={logout} /></div>
    </header>
    <div className="mx-auto flex max-w-[1600px]">
      <aside id="menu-admin" className={`${menu ? 'block' : 'hidden'} fixed inset-x-0 top-16 z-20 max-h-[calc(100vh-4rem)] supports-[height:100dvh]:max-h-[calc(100dvh-4rem)] overflow-auto border-b bg-white p-3 lg:sticky lg:top-16 lg:block lg:h-[calc(100vh-4rem)] lg:supports-[height:100dvh]:h-[calc(100dvh-4rem)] lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r`}><nav aria-label="Menu administrasi" className="grid gap-1">{visible.map((item) => <Link key={item.label} href={item.href} aria-current={pathname === item.href ? 'page' : undefined} onClick={() => setMenu(false)} className={`rounded-md px-3 py-2 text-sm ${pathname === item.href ? 'bg-institusi-50 font-semibold text-institusi-900' : 'text-slate-700 hover:bg-slate-50'}`}>{item.label}</Link>)}</nav></aside>
      <main id="isi-utama" className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  </div>;
}
