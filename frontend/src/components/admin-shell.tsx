'use client';

import Link from 'next/link';
import { useSession } from '@/lib/sesi';
import { StateMessage } from '@/components/ui';
import { HeaderAdmin } from './admin/header-admin';
import { IZIN_PANEL, menuUntuk } from './admin/navigasi-admin';
import { PasangNonce } from './admin/pasang-nonce';
import { SidebarAdmin } from './admin/sidebar-admin';

function Pesan({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto max-w-3xl p-8">{children}</main>;
}

/**
 * Kerangka panel admin: sidebar statis di layar lebar, menu geser (Sheet) di
 * layar kecil, header berisi jejak halaman dan menu akun. Akses tetap
 * diperiksa backend; pemeriksaan di sini hanya untuk tampilan.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const { state, pengguna, galat, muatUlang } = useSession();
  if (state === 'loading')
    return (
      <Pesan>
        <StateMessage title="Memeriksa sesi…" />
      </Pesan>
    );
  if (state === 'error')
    return (
      <Pesan>
        <StateMessage title="Status akun belum tersedia" kind="error">
          {galat}
          <button className="ml-2 underline" onClick={() => void muatUlang()}>
            Coba lagi
          </button>
        </StateMessage>
      </Pesan>
    );
  if (state !== 'authenticated' || !pengguna)
    return (
      <Pesan>
        <StateMessage title="Masuk diperlukan">
          Panel ini untuk pengelola portal.{' '}
          <Link className="font-semibold underline" href="/masuk/admin">
            Masuk sebagai Admin
          </Link>
        </StateMessage>
      </Pesan>
    );
  if (pengguna.status !== 'AKTIF')
    return (
      <Pesan>
        <StateMessage title="Akun belum aktif">
          DOSEN/STAF + MENUNGGU_VERIFIKASI belum memiliki akses Internal. Hubungi administrator.
        </StateMessage>
      </Pesan>
    );
  if (!pengguna.izin.some((i) => IZIN_PANEL.has(i)))
    return (
      <Pesan>
        <StateMessage title="Akses panel tidak tersedia">
          Akun aktif ini belum memiliki izin panel administrasi.
        </StateMessage>
      </Pesan>
    );

  const menu = menuUntuk(pengguna.izin);
  return (
    <div className="flex min-h-dvh bg-slate-50">
      <PasangNonce />
      <SidebarAdmin menu={menu} />
      <div className="flex min-w-0 flex-1 flex-col">
        <HeaderAdmin pengguna={pengguna} menu={menu} />
        <main id="isi-utama" className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
