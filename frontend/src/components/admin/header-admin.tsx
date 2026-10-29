'use client';

import { Fragment, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, Search } from 'lucide-react';
import type { PenggunaAktif } from '@jdih/shared';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import type { HitunganNav } from './hitungan-nav';
import { jejakHalaman, type KelompokNav } from './navigasi-admin';
import { MenuProfil } from './menu-profil';
import { IsiSidebar } from './sidebar-admin';
import { NotifikasiDokumenPanel } from './notifikasi-dokumen';

/** Jejak halaman; di layar kecil hanya halaman saat ini dan induknya yang tampil. */
function JejakAdmin() {
  const jejak = jejakHalaman(usePathname());
  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap">
        {jejak.map((j, i) => {
          const terakhir = i === jejak.length - 1;
          const sembunyikan = i < jejak.length - 2 ? 'hidden md:inline-flex' : '';
          return (
            <Fragment key={j.href}>
              {i > 0 && <BreadcrumbSeparator className={i <= jejak.length - 2 ? 'hidden md:inline-flex' : ''} />}
              <BreadcrumbItem className={sembunyikan}>
                {terakhir ? (
                  <BreadcrumbPage>{j.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={j.href}>{j.label}</BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export function HeaderAdmin({
  pengguna,
  menu,
  hitungan,
  onCari,
}: {
  pengguna: PenggunaAktif;
  menu: readonly KelompokNav[];
  hitungan: HitunganNav;
  onCari: () => void;
}) {
  const [menuBuka, setMenuBuka] = useState(false);
  return (
    <header className="header-panel sticky top-0 z-30 flex h-15 shrink-0 items-center gap-2.5 border-b border-sekat/70 bg-kanvas/95 px-4 backdrop-blur-md sm:px-5 lg:h-14 lg:px-6">
      <Sheet open={menuBuka} onOpenChange={setMenuBuka}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="-ml-2 lg:hidden"
            aria-label="Buka menu navigasi"
          >
            <Menu />
          </Button>
        </SheetTrigger>
        <SheetContent className="bg-kanvas">
          <SheetTitle className="sr-only">Menu administrasi</SheetTitle>
          <SheetDescription className="sr-only">Navigasi panel admin JDIH ITH</SheetDescription>
          <IsiSidebar
            menu={menu}
            hitungan={hitungan}
            superadmin={pengguna.peran.includes('SUPERADMIN')}
            onCari={onCari}
            onPilih={() => setMenuBuka(false)}
          />
        </SheetContent>
      </Sheet>
      <div className="min-w-0 flex-1">
        <JejakAdmin />
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onCari}
        aria-label="Cari halaman atau dokumen (Ctrl+K)"
        title="Cari (Ctrl+K)"
        className="cari-panel shrink-0 text-slate-500 hover:bg-white hover:text-tinta xl:w-auto xl:gap-2 xl:px-3"
      >
        <Search />
        <span className="hidden text-xs font-medium xl:inline">Cari cepat</span>
        <kbd className="hidden rounded border border-sekat bg-white px-1 py-0.5 text-[10px] xl:inline">Ctrl K</kbd>
      </Button>
      <NotifikasiDokumenPanel key={pengguna.id} />
      <MenuProfil pengguna={pengguna} />
    </header>
  );
}
