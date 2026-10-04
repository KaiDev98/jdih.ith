'use client';

import Link from 'next/link';
import { useSession } from '@/lib/sesi';
import { Card, PageTitle, StateMessage } from '@/components/ui';
export default function DasborAdmin() {
  const { pengguna } = useSession();
  const shortcuts = [
    ['Antrean verifikasi akun', '/admin/pengguna', 'users.read'],
    ['Kelola dokumen', '/admin/dokumen', 'documents.read_admin'],
    ['Buat dokumen', '/admin/dokumen/baru', 'documents.create'],
    ['Master data', '/admin/unit-kerja', 'master.manage'],
    ['Format persuratan', '/admin/format-persuratan', 'templates.manage'],
  ] as const;
  return <div className="mx-auto max-w-6xl"><PageTitle title="Dasbor" description="Ringkasan kerja berdasarkan izin akun Anda." />
    {pengguna?.izin.includes('users.read') && <Card className="mb-6"><p className="font-semibold">Antrean verifikasi akun tersedia</p><p className="mt-1 text-sm text-slate-600">API belum mengirim jumlah total pendaftar, sehingga dasbor tidak menampilkan angka perkiraan.</p><Link className="mt-3 inline-block text-sm font-semibold text-blue-900 underline" href="/admin/pengguna">Buka antrean pengguna</Link></Card>}
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{shortcuts.filter(([, , permission]) => pengguna?.izin.includes(permission)).map(([label, href]) => <Link key={href} href={href} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow"><span className="font-semibold text-slate-950">{label}</span><span className="mt-2 block text-sm text-slate-600">Buka modul →</span></Link>)}</div>
    <div className="mt-6"><StateMessage title="Beberapa ringkasan belum tersedia">Backend saat ini belum menyediakan agregasi dashboard, antrean verifikasi dokumen, atau daftar audit. Panel tidak menampilkan angka perkiraan.</StateMessage></div>
  </div>;
}
