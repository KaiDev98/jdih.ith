'use client';

import Link from '@/components/admin/tautan-panel';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { alamatPanel } from '@/lib/panel';
import type { PenggunaAktif } from '@jdih/shared';
import { useSession } from '@/lib/sesi';
import { Kerangka, StateMessage } from '@/components/ui';
import { HeaderAdmin } from './admin/header-admin';
import { useHitunganNav, useSidebarCiut } from './admin/hitungan-nav';
import { halamanAdminBolehDibuka, IZIN_PANEL, menuUntuk } from './admin/navigasi-admin';
import { PaletPerintah } from './admin/palet-perintah';
import { PasangNonce } from './admin/pasang-nonce';
import { SidebarAdmin } from './admin/sidebar-admin';

/** Halaman tunggal untuk keadaan sebelum panel tampil (sesi, akses), di atas kanvas panel. */
function Pesan({ children }: { children: React.ReactNode }) {
  return (
    <main className="panel-admin grid min-h-dvh place-items-center bg-kanvas p-6">
      <div className="w-full max-w-md">
        <Image src="/logo-ith.webp" alt="" width={500} height={527} unoptimized className="mx-auto mb-6 h-12 w-auto" />
        {children}
      </div>
    </main>
  );
}

/** Kerangka panel saat sesi diperiksa: bentuknya sama dengan panel agar tidak melompat. */
function MemeriksaSesi() {
  return (
    <div role="status" aria-label="Memeriksa sesi" className="flex min-h-dvh bg-kanvas">
      <div className="hidden w-64 shrink-0 flex-col gap-3 border-r border-sekat/80 p-4 lg:flex">
        <Kerangka className="mb-4 h-9 w-36" />
        {Array.from({ length: 7 }, (_, i) => (
          <Kerangka key={i} className="h-8 w-full" />
        ))}
      </div>
      <div className="flex-1 p-6 lg:p-10">
        <Kerangka className="h-8 w-64" />
        <Kerangka className="mt-3 h-4 w-96 max-w-full" />
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Kerangka key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Ruang kerja panel setelah akses dipastikan: sidebar (dapat diciutkan),
 * header berjejak halaman, palet pencarian Ctrl+K, dan isi halaman.
 */
function RuangKerja({ pengguna, children }: { pengguna: PenggunaAktif; children: React.ReactNode }) {
  const pathname = usePathname();
  const areaIsi = useRef<HTMLElement>(null);
  const menu = menuUntuk(pengguna.izin, pengguna.peran);
  const hitungan = useHitunganNav(pengguna.izin);
  const [ciut, setCiut] = useSidebarCiut();
  const [cari, setCari] = useState(false);
  // Setiap halaman baru dimulai dari atas area isi, termasuk ketika dokumen
  // sebelumnya panjang. Pada ponsel, gulir halaman tetap ditangani router.
  useEffect(() => {
    if (!areaIsi.current) return;
    areaIsi.current.scrollTop = 0;
    areaIsi.current.scrollLeft = 0;
  }, [pathname]);
  return (
    <div className="panel-admin ruang-kerja-panel flex min-h-dvh bg-kanvas">
      <PasangNonce />
      <SidebarAdmin
        menu={menu}
        hitungan={hitungan}
        superadmin={pengguna.peran.includes('SUPERADMIN')}
        ciut={ciut}
        onCiut={setCiut}
        onCari={() => setCari(true)}
      />
      <div className="kolom-panel flex min-h-0 min-w-0 flex-1 flex-col">
        <HeaderAdmin pengguna={pengguna} menu={menu} hitungan={hitungan} onCari={() => setCari(true)} />
        <main ref={areaIsi} id="isi-utama" tabIndex={-1} className="area-isi-panel min-w-0 flex-1 px-4 pt-5 pb-8 sm:px-5 lg:px-6 lg:pt-5">
          <div className="isi-panel mx-auto w-full max-w-[100rem]">{children}</div>
        </main>
      </div>
      <PaletPerintah
        buka={cari}
        onBukaChange={setCari}
        menu={menu}
        izin={pengguna.izin}
        peran={pengguna.peran}
      />
    </div>
  );
}

/**
 * Kerangka panel admin. Akses tetap diperiksa backend; pemeriksaan di sini
 * hanya untuk tampilan.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const { state, pengguna, galat, muatUlang } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tujuan = pengguna ? alamatPanel(pengguna.peran, pathname) : pathname;
  useEffect(() => {
    if (state === 'authenticated' && pengguna?.status === 'AKTIF' && tujuan !== pathname) {
      const query = searchParams.toString();
      router.replace(`${tujuan}${query ? `?${query}` : ''}${window.location.hash}`);
    }
  }, [state, pengguna, tujuan, pathname, router, searchParams]);
  if (state === 'loading') return <MemeriksaSesi />;
  if (state === 'error')
    return (
      <Pesan>
        <StateMessage title="Status akun belum tersedia" kind="error">
          {galat}
          <button className="ml-2 font-semibold underline" onClick={() => void muatUlang()}>
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
          <Link className="font-semibold underline" href={pathname.startsWith('/superadmin') ? '/masuk/superadmin' : '/masuk/admin'}>
            Masuk sebagai {pathname.startsWith('/superadmin') ? 'Superadmin' : 'Admin'}
          </Link>
        </StateMessage>
      </Pesan>
    );
  if (pengguna.status !== 'AKTIF')
    return (
      <Pesan>
        <StateMessage title="Akun belum aktif">
          Akun Dosen/Staf yang menunggu verifikasi belum dapat membuka dokumen khusus Dosen/Staf. Hubungi administrator.
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
  if (tujuan !== pathname) return <MemeriksaSesi />;
  const halamanBolehDibuka = halamanAdminBolehDibuka(pathname, pengguna.peran);
  const hanyaBaca = !pengguna.peran.includes('SUPERADMIN') &&
    /^\/admin\/(jenis-dokumen|kategori|kontak|pengguna|dokumen\/verifikasi)(\/|$)/.test(pathname);
  return (
    <RuangKerja pengguna={pengguna}>
      {halamanBolehDibuka ? (
        <>
          {hanyaBaca && <p role="status" className="mb-5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">Anda dapat melihat informasi pada halaman ini. Perubahan hanya dapat dilakukan oleh Superadmin.</p>}
          {children}
        </>
      ) : (
        <div className="mx-auto max-w-2xl pt-8">
          <StateMessage title="Akses panel tidak tersedia">
            Akun ini tidak memiliki akses panel pengelola.
          </StateMessage>
        </div>
      )}
    </RuangKerja>
  );
}
