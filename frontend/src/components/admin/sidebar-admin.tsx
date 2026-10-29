'use client';

import Link from '@/components/admin/tautan-panel';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ChevronsLeft, ChevronsRight, ExternalLink, Search, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { HitunganNav } from './hitungan-nav';
import { hrefAktif, type KelompokNav } from './navigasi-admin';

/** Merek panel: logo ITH, nama portal, dan keterangan panel sesuai peran. */
export function MerekAdmin({ superadmin = false, ciut = false }: { superadmin?: boolean; ciut?: boolean }) {
  return (
    <Link
      href="/admin"
      title="Dasbor"
      className="flex min-w-0 items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-institusi-400"
    >
      <Image
        src="/logo-ith.webp"
        alt=""
        width={500}
        height={527}
        unoptimized
        className="h-9 w-auto shrink-0"
      />
      <span className={cn('label-nav min-w-0 leading-tight', ciut && 'sr-only')}>
        <span className="block text-[0.9375rem] font-extrabold tracking-[-0.01em] whitespace-nowrap text-tinta">
          JDIH <span className="text-institusi-600">ITH</span>
        </span>
        <span className="mt-0.5 flex items-center gap-1 text-xs font-medium whitespace-nowrap text-slate-500">
          {superadmin && <ShieldCheck aria-hidden className="size-3.5 text-institusi-600" />}
          {superadmin ? 'Panel Superadmin' : 'Panel Admin'}
        </span>
      </span>
    </Link>
  );
}

/** Lencana jumlah pekerjaan yang menunggu di samping butir menu. */
function LencanaJumlah({ nilai, ciut }: { nilai: number; ciut: boolean }) {
  if (nilai <= 0) return null;
  const teks = nilai > 99 ? '99+' : String(nilai);
  return ciut ? (
    <span
      aria-hidden
      className="absolute top-1.5 right-1.5 size-2 rounded-full bg-institusi-500 ring-2 ring-kanvas"
    />
  ) : (
    <span className="ml-auto min-w-5 rounded-full bg-institusi-600 px-1.5 text-center text-[0.6875rem] leading-5 font-bold text-white tabular-nums">
      {teks}
    </span>
  );
}

/** Daftar menu berkelompok; dipakai sidebar desktop dan menu geser di layar kecil. */
export function NavAdmin({
  menu,
  hitungan = {},
  ciut = false,
  onPilih,
}: {
  menu: readonly KelompokNav[];
  hitungan?: HitunganNav;
  ciut?: boolean;
  onPilih?: () => void;
}) {
  const pathname = usePathname();
  const aktif = hrefAktif(pathname, menu);
  return (
    <nav aria-label="Menu administrasi" className="grid gap-4">
      {menu.map((kelompok) => (
        <div key={kelompok.judul} className="grid gap-0.5">
          {ciut ? (
            <span aria-hidden className="mx-auto mb-1 h-px w-6 bg-sekat first:hidden" />
          ) : (
            <p className="px-2.5 pb-1 text-xs font-medium text-slate-400">{kelompok.judul}</p>
          )}
          {kelompok.butir.map(({ label, href, ikon: Ikon, disabled, disabledReason }) => {
            const dipilih = href === aktif;
            const jumlah = hitungan[href] ?? 0;
            const kelas = cn(
              'panel-nav-item group relative flex min-h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm transition-[background-color,color,box-shadow] duration-150 outline-none focus-visible:ring-2 focus-visible:ring-institusi-400',
              ciut && 'justify-center px-0',
              disabled
                ? 'cursor-not-allowed text-slate-400 opacity-65'
                : dipilih
                  ? 'bg-white font-semibold text-tinta shadow-[0_1px_2px_rgb(28_25_23/0.06),0_0_0_1px_rgb(28_25_23/0.05)]'
                  : 'text-slate-600 hover:bg-white/70 hover:text-tinta',
            );
            const isi = (
              <>
                <Ikon
                  aria-hidden
                  className={cn(
                    'size-[1.125rem] shrink-0 transition-colors duration-150',
                    dipilih ? 'text-institusi-600' : 'text-slate-400 group-hover:text-slate-600',
                  )}
                />
                <span className={cn('label-nav truncate', ciut && 'sr-only')}>{label}</span>
                {disabled && !ciut && <span className="ml-auto text-[0.6875rem]">Superadmin</span>}
                {jumlah > 0 && <span className="sr-only">, {jumlah} menunggu</span>}
                {!disabled && <LencanaJumlah nilai={jumlah} ciut={ciut} />}
              </>
            );
            return disabled ? (
              <button
                key={href}
                type="button"
                disabled
                title={ciut ? `${label} · ${disabledReason}` : disabledReason}
                aria-disabled="true"
                className={kelas}
              >
                {isi}
              </button>
            ) : (
              <Link
                key={href}
                href={href}
                onClick={onPilih}
                title={ciut ? (jumlah > 0 ? `${label} (${String(jumlah)})` : label) : undefined}
                aria-current={dipilih ? 'page' : undefined}
                className={kelas}
              >
                {isi}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

/** Tombol pencarian cepat bergaya kolom isian; membuka palet Ctrl+K. */
export function TombolCari({ onCari, ciut = false }: { onCari: () => void; ciut?: boolean }) {
  return (
    <button
      type="button"
      onClick={onCari}
      title={ciut ? 'Cari (Ctrl+K)' : undefined}
      className={cn(
        'flex h-9 w-full items-center gap-2.5 rounded-lg border border-sekat bg-white/70 px-2.5 text-sm text-slate-500 transition-colors duration-150 outline-none hover:border-slate-300 hover:bg-white hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-institusi-400',
        ciut && 'justify-center px-0',
      )}
    >
      <Search aria-hidden className="size-4 shrink-0" />
      <span className={cn('label-nav flex-1 text-left whitespace-nowrap', ciut && 'sr-only')}>
        Cari…
      </span>
      {!ciut && (
        <kbd className="label-nav rounded border border-sekat bg-kanvas px-1.5 font-sans text-[0.6875rem] font-medium text-slate-500 pointer-coarse:hidden">
          Ctrl K
        </kbd>
      )}
    </button>
  );
}

/** Isi sidebar (merek, cari, menu, kaki); dipakai sidebar desktop dan menu geser. */
export function IsiSidebar({
  menu,
  hitungan,
  superadmin,
  ciut = false,
  onCiut,
  onCari,
  onPilih,
}: {
  menu: readonly KelompokNav[];
  hitungan?: HitunganNav;
  superadmin?: boolean;
  ciut?: boolean;
  onCiut?: (nilai: boolean) => void;
  onCari?: () => void;
  onPilih?: () => void;
}) {
  const kelasKaki = cn(
    'flex h-9 w-full items-center gap-3 rounded-lg px-2.5 text-sm text-slate-500 transition-colors duration-150 outline-none hover:bg-white/70 hover:text-tinta focus-visible:ring-2 focus-visible:ring-institusi-400',
    ciut && 'justify-center px-0',
  );
  return (
    <>
      <div className={cn('flex h-15 shrink-0 items-center px-4 lg:h-14', ciut && 'justify-center px-0')}>
        <MerekAdmin superadmin={superadmin} ciut={ciut} />
      </div>
      {onCari && (
        <div className="shrink-0 px-3 pb-2">
          <TombolCari
            ciut={ciut}
            onCari={() => {
              onPilih?.();
              onCari();
            }}
          />
        </div>
      )}
      <div className="gulir-sidebar min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-3 py-3">
        <NavAdmin menu={menu} hitungan={hitungan} ciut={ciut} onPilih={onPilih} />
      </div>
      <div className="grid shrink-0 gap-0.5 border-t border-sekat/80 p-3">
        <Link href="/" onClick={onPilih} title={ciut ? 'Buka portal publik' : undefined} className={kelasKaki}>
          <ExternalLink aria-hidden className="size-[1.125rem] shrink-0 text-slate-400" />
          <span className={cn('label-nav whitespace-nowrap', ciut && 'sr-only')}>Buka portal publik</span>
        </Link>
        {onCiut && (
          <button
            type="button"
            onClick={() => onCiut(!ciut)}
            aria-pressed={ciut}
            title={ciut ? 'Lebarkan menu' : undefined}
            className={kelasKaki}
          >
            {ciut ? (
              <ChevronsRight aria-hidden className="size-[1.125rem] shrink-0 text-slate-400" />
            ) : (
              <ChevronsLeft aria-hidden className="size-[1.125rem] shrink-0 text-slate-400" />
            )}
            <span className={cn('label-nav whitespace-nowrap', ciut && 'sr-only')}>
              {ciut ? 'Lebarkan menu' : 'Ciutkan menu'}
            </span>
          </button>
        )}
      </div>
    </>
  );
}

/**
 * Sidebar statis untuk layar lebar. Latarnya sama dengan kanvas sehingga
 * menyatu dan tidak menjadi blok putih kedua; butir aktif berupa pil putih
 * terangkat dengan ikon oranye. Dapat diciutkan menjadi deretan ikon untuk
 * memberi ruang lebih bagi isi.
 */
export function SidebarAdmin({
  menu,
  hitungan,
  superadmin,
  ciut,
  onCiut,
  onCari,
}: {
  menu: readonly KelompokNav[];
  hitungan: HitunganNav;
  superadmin?: boolean;
  ciut: boolean;
  onCiut: (nilai: boolean) => void;
  onCari: () => void;
}) {
  return (
    <aside
      data-ciut={ciut}
      className={cn(
        'sidebar-panel sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-sekat/80 bg-kanvas lg:flex',
        ciut ? 'w-[4.25rem]' : 'w-60',
      )}
    >
      <IsiSidebar
        menu={menu}
        hitungan={hitungan}
        superadmin={superadmin}
        ciut={ciut}
        onCiut={onCiut}
        onCari={onCari}
      />
    </aside>
  );
}
