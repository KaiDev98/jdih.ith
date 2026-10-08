'use client';

import { Fragment, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
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
import { jejakHalaman, type KelompokNav } from './navigasi-admin';
import { MenuProfil } from './menu-profil';
import { MerekAdmin, NavAdmin, TautanPortal } from './sidebar-admin';

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
              {i > 0 && <BreadcrumbSeparator className={sembunyikan} />}
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
}: {
  pengguna: PenggunaAktif;
  menu: readonly KelompokNav[];
}) {
  const [menuBuka, setMenuBuka] = useState(false);
  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6">
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
        <SheetContent>
          <SheetTitle className="sr-only">Menu administrasi</SheetTitle>
          <SheetDescription className="sr-only">Navigasi panel admin JDIH ITH</SheetDescription>
          <div className="flex h-16 shrink-0 items-center border-b border-border px-5">
            <MerekAdmin />
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-5">
            <NavAdmin menu={menu} onPilih={() => setMenuBuka(false)} />
          </div>
          <div className="shrink-0 border-t border-border p-3">
            <TautanPortal onPilih={() => setMenuBuka(false)} />
          </div>
        </SheetContent>
      </Sheet>
      <div className="min-w-0 flex-1">
        <JejakAdmin />
      </div>
      <MenuProfil pengguna={pengguna} />
    </header>
  );
}
