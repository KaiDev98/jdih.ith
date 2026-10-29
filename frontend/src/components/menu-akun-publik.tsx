'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { ExternalLink, LoaderCircle, LogOut, UserRound } from 'lucide-react';
import { ambilApi } from '@/lib/api-client';
import { akarPanel } from '@/lib/panel';
import { KUNCI_KELUAR } from '@/components/feedback-sesi';
import { csrfHeaders, useSession } from '@/lib/sesi';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { inisial } from '@/components/admin/navigasi-admin';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/** Menu akun tambahan; navigasi dan isi portal Dosen/Staf sama dengan portal publik. */
export function MenuAkunPublik() {
  const { state, pengguna, csrfToken } = useSession();
  const [keluar, setKeluar] = useState(false);
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState('');
  const proses = useRef(false);
  const batal = useRef<HTMLButtonElement>(null);
  const pemicu = useRef<HTMLButtonElement>(null);
  async function akhiriSesi() {
    if (proses.current) return;
    proses.current = true;
    setSibuk(true);
    setGalat('');
    try {
      await ambilApi('/auth/logout', { method: 'POST', headers: csrfHeaders(csrfToken) });
      try {
        sessionStorage.setItem(KUNCI_KELUAR, '1');
      } catch {
        /* Penyimpanan browser opsional; logout tetap dilanjutkan. */
      }
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Logout memuat ulang portal agar konteks sesi dan data privat dibuang.
      window.location.assign('/');
    } catch {
      setGalat('Belum dapat keluar. Periksa koneksi lalu coba lagi.');
      proses.current = false;
      setSibuk(false);
    }
  }
  if (state !== 'authenticated' || !pengguna) return null;
  const pengelola = pengguna.peran.some((p) => p === 'ADMIN' || p === 'SUPERADMIN');
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            ref={pemicu}
            type="button"
            aria-label={`Menu profil ${pengguna.nama}`}
            className="tekan ml-1 flex min-h-11 shrink-0 items-center gap-2 rounded-full p-1 outline-none hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-institusi-500"
          >
            <Avatar className="size-9">
              {pengguna.avatarUrl && (
                <AvatarImage src={pengguna.avatarUrl} alt="" referrerPolicy="no-referrer" />
              )}
              <AvatarFallback>{inisial(pengguna.nama)}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 max-w-[calc(100vw-2rem)]">
          <DropdownMenuLabel>
            <p className="truncate text-sm font-semibold">{pengguna.nama}</p>
            <p className="mt-1 truncate text-xs font-normal text-slate-500">{pengguna.surel}</p>
            <p className="mt-1 text-[0.6875rem] font-normal text-slate-500">
              {pengelola ? 'Pengelola portal' : 'Dosen / Staf ITH'}
            </p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/akun">
              <UserRound aria-hidden /> Profil saya
            </Link>
          </DropdownMenuItem>
          {pengelola && (
            <DropdownMenuItem asChild>
              <Link href={akarPanel(pengguna.peran)}>
                <ExternalLink aria-hidden /> Buka panel pengelola
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              setGalat('');
              setKeluar(true);
            }}
          >
            <LogOut aria-hidden /> Keluar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog
        open={keluar}
        onOpenChange={(nilai) => {
          if (!proses.current) setKeluar(nilai);
        }}
      >
        <DialogContent
          className="max-w-sm"
          closeDisabled={sibuk}
          aria-busy={sibuk}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            batal.current?.focus();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            pemicu.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>Keluar dari akun?</DialogTitle>
            <DialogDescription>
              Sesi di perangkat ini akan diakhiri. Anda tetap dapat menjelajahi dokumen publik.
            </DialogDescription>
          </DialogHeader>
          {galat && (
            <p role="alert" className="text-sm text-red-800">
              {galat}
            </p>
          )}
          <DialogFooter>
            <Button ref={batal} variant="outline" disabled={sibuk} onClick={() => setKeluar(false)}>
              Batal
            </Button>
            <Button disabled={sibuk} onClick={() => void akhiriSesi()}>
              {sibuk ? (
                <LoaderCircle aria-hidden className="animate-spin" />
              ) : (
                <LogOut aria-hidden />
              )}
              {sibuk ? 'Keluar…' : 'Ya, keluar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
