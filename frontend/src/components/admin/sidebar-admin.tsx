'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/cn';
import { hrefAktif, type KelompokNav } from './navigasi-admin';

export function MerekAdmin() {
  return (
    <Link
      href="/admin"
      className="flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Image
        src="/logo-ith.webp"
        alt=""
        width={500}
        height={527}
        unoptimized
        className="h-8 w-auto"
      />
      <span className="leading-tight">
        <span className="block text-sm font-bold text-foreground">
          JDIH <span className="text-primary">ITH</span>
        </span>
        <span className="block text-xs text-muted-foreground">Panel Admin</span>
      </span>
    </Link>
  );
}

/** Daftar menu berkelompok; dipakai sidebar desktop dan menu geser di layar kecil. */
export function NavAdmin({
  menu,
  onPilih,
}: {
  menu: readonly KelompokNav[];
  onPilih?: () => void;
}) {
  const pathname = usePathname();
  const aktif = hrefAktif(pathname, menu);
  return (
    <nav aria-label="Menu administrasi" className="grid gap-6">
      {menu.map((kelompok) => (
        <div key={kelompok.judul} className="grid gap-1">
          <p className="px-3 pb-1 text-[0.6875rem] font-semibold tracking-wider text-muted-foreground uppercase">
            {kelompok.judul}
          </p>
          {kelompok.butir.map(({ label, href, ikon: Ikon }) => {
            const dipilih = href === aktif;
            return (
              <Link
                key={href}
                href={href}
                onClick={onPilih}
                aria-current={dipilih ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  dipilih
                    ? 'bg-institusi-50 font-semibold text-institusi-900'
                    : 'text-slate-600 hover:bg-muted hover:text-foreground',
                )}
              >
                <Ikon
                  aria-hidden
                  className={cn('size-4 shrink-0', dipilih ? 'text-primary' : 'text-slate-400')}
                />
                {label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export function TautanPortal({ onPilih }: { onPilih?: () => void }) {
  return (
    <Link
      href="/"
      onClick={onPilih}
      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-muted hover:text-foreground"
    >
      <ExternalLink aria-hidden className="size-4 text-slate-400" />
      Buka portal publik
    </Link>
  );
}

/** Sidebar statis untuk layar lebar. */
export function SidebarAdmin({ menu }: { menu: readonly KelompokNav[] }) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-background lg:flex">
      <div className="flex h-16 shrink-0 items-center border-b border-border px-5">
        <MerekAdmin />
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-5">
        <NavAdmin menu={menu} />
      </div>
      <div className="shrink-0 border-t border-border p-3">
        <TautanPortal />
      </div>
    </aside>
  );
}
