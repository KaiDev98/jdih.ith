import Link from 'next/link';
import { ArrowRight, BadgeCheck, Building2, FileText, Mail, UserRound } from 'lucide-react';
import type { PenggunaSesiTampil } from '@jdih/shared';
import { akarPanel } from '@/lib/panel';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { inisial } from '@/components/admin/navigasi-admin';
import { Badge } from '@/components/ui';

const STATUS: Record<string, string> = {
  AKTIF: 'Aktif',
  MENUNGGU_VERIFIKASI: 'Menunggu verifikasi',
  NONAKTIF: 'Nonaktif',
  DITOLAK: 'Pendaftaran ditolak',
};

export function ProfilPengguna({ pengguna, unit }: { pengguna: PenggunaSesiTampil; unit: string }) {
  const pengelola = pengguna.peran.some((p) => p === 'ADMIN' || p === 'SUPERADMIN');
  const aktif = pengguna.status === 'AKTIF';
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/"
        className="inline-flex min-h-10 items-center gap-2 text-sm text-slate-500 hover:text-institusi-700"
      >
        Beranda <span aria-hidden>/</span>
        <span className="text-slate-800">Profil saya</span>
      </Link>
      <div className="profil-portal mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_40px_-30px_#17304044]">
        <div className="relative border-b border-slate-100 bg-slate-50 px-5 py-6 sm:px-8 sm:py-8">
          <div aria-hidden className="absolute inset-y-0 left-0 w-1 bg-institusi-500" />
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
            <Avatar className="size-16 rounded-2xl border-4 border-white shadow-sm sm:size-20">
              {pengguna.avatarUrl && (
                <AvatarImage src={pengguna.avatarUrl} alt="" referrerPolicy="no-referrer" />
              )}
              <AvatarFallback className="rounded-xl text-xl">
                {inisial(pengguna.nama)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold tracking-wide text-institusi-700">
                {pengelola ? 'PENGELOLA PORTAL' : 'DOSEN / STAF ITH'}
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Profil saya</h1>
              <p className="mt-1 break-words text-sm text-slate-600">{pengguna.nama}</p>
            </div>
            <div className="col-start-2 sm:col-auto">
              <Badge
                color={
                  aktif ? 'green' : pengguna.status === 'MENUNGGU_VERIFIKASI' ? 'amber' : 'slate'
                }
              >
                {STATUS[pengguna.status] ?? pengguna.status}
              </Badge>
            </div>
          </div>
        </div>
        <div className="grid md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <section className="min-w-0 p-5 sm:p-8">
            <h2 className="text-base font-semibold text-slate-900">Informasi akun</h2>
            <p className="mt-1 text-xs text-slate-500">
              Identitas yang terdaftar pada akun portal Anda.
            </p>
            <dl className="mt-5 divide-y divide-slate-100 text-sm">
              {[
                { ikon: UserRound, label: 'Nama lengkap', nilai: pengguna.nama },
                { ikon: Mail, label: 'Email', nilai: pengguna.surel },
                { ikon: Building2, label: 'Unit kerja', nilai: unit },
              ].map(({ ikon: Ikon, label, nilai }) => (
                <div key={label} className="flex gap-3 py-4 first:pt-0">
                  <Ikon aria-hidden className="mt-0.5 size-4 shrink-0 text-slate-400" />
                  <div className="min-w-0">
                    <dt className="text-xs text-slate-500">{label}</dt>
                    <dd className="mt-1 break-words font-medium text-slate-900 [overflow-wrap:anywhere]">
                      {nilai}
                    </dd>
                  </div>
                </div>
              ))}
            </dl>
          </section>
          <section className="min-w-0 border-t border-slate-100 bg-slate-50/60 p-5 sm:p-8 md:border-t-0 md:border-l">
            <span className="mb-3 inline-flex rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
              <BadgeCheck aria-hidden className="size-5" />
            </span>
            <h2 className="text-base font-semibold text-slate-900">
              {aktif ? 'Siap menjelajahi portal' : 'Status akses Anda'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {aktif
                ? 'Akun Anda aktif. Telusuri produk hukum dan format persuratan melalui menu portal.'
                : pengguna.status === 'MENUNGGU_VERIFIKASI'
                  ? 'Pendaftaran menunggu persetujuan Superadmin. Dokumen publik tetap dapat Anda akses selama menunggu.'
                  : 'Akses akun Anda belum aktif. Hubungi pengelola untuk bantuan; dokumen publik tetap tersedia.'}
            </p>
            <div className="mt-5 grid gap-2">
              {pengelola && (
                <Link className="profil-pintasan" href={akarPanel(pengguna.peran)}>
                  Buka panel pengelola
                  <ArrowRight aria-hidden className="size-4" />
                </Link>
              )}
              <Link className="profil-pintasan" href="/produk-hukum">
                <span className="flex items-center gap-2">
                  <FileText aria-hidden className="size-4" />
                  Produk hukum
                </span>
                <ArrowRight aria-hidden className="size-4" />
              </Link>
              <Link className="profil-pintasan" href="/format-persuratan">
                Format persuratan
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
