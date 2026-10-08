'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AlertCircle, ChevronDown, KeyRound, LoaderCircle, LogOut, UserCog } from 'lucide-react';
import type { PenggunaAktif } from '@jdih/shared';
import { ambilApi } from '@/lib/api-client';
import { csrfHeaders, useSession } from '@/lib/sesi';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DialogGantiPassword } from './dialog-ganti-password';
import { inisial, peranTampil } from './navigasi-admin';

export function AvatarPengguna({
  pengguna,
  className,
}: {
  pengguna: PenggunaAktif;
  className?: string;
}) {
  return (
    <Avatar className={className}>
      {pengguna.avatarUrl && (
        <AvatarImage src={pengguna.avatarUrl} alt="" referrerPolicy="no-referrer" />
      )}
      <AvatarFallback>{inisial(pengguna.nama)}</AvatarFallback>
    </Avatar>
  );
}

export function LencanaPeran({ peran }: { peran: readonly string[] }) {
  const p = peranTampil(peran);
  return p ? <Badge variant={p.varian}>{p.teks}</Badge> : null;
}

/** Konfirmasi keluar, dengan status memproses dan pesan galat. */
function DialogKeluar({
  buka,
  onBukaChange,
}: {
  buka: boolean;
  onBukaChange: (b: boolean) => void;
}) {
  const { csrfToken, muatUlang } = useSession();
  const router = useRouter();
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState('');
  async function keluar() {
    setSibuk(true);
    setGalat('');
    try {
      await ambilApi('/auth/logout', { method: 'POST', headers: csrfHeaders(csrfToken) });
      router.replace('/');
      await muatUlang();
    } catch {
      setGalat('Keluar gagal. Periksa koneksi lalu coba lagi.');
      setSibuk(false);
    }
  }
  return (
    <Dialog
      open={buka}
      onOpenChange={(b) => {
        if (sibuk) return;
        setGalat('');
        onBukaChange(b);
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Keluar dari akun?</DialogTitle>
          <DialogDescription>
            Sesi di perangkat ini akan diakhiri. Anda perlu masuk lagi untuk membuka panel.
          </DialogDescription>
        </DialogHeader>
        {galat && (
          <p role="alert" className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle aria-hidden className="size-4" />
            {galat}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onBukaChange(false)} disabled={sibuk}>
            Batal
          </Button>
          <Button variant="destructive" onClick={() => void keluar()} disabled={sibuk}>
            {sibuk ? <LoaderCircle className="animate-spin" /> : <LogOut />}
            {sibuk ? 'Keluar…' : 'Keluar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Avatar, nama, dan lencana peran; diklik membuka menu akun. */
export function MenuProfil({ pengguna }: { pengguna: PenggunaAktif }) {
  const [gantiPassword, setGantiPassword] = useState(false);
  const [keluar, setKeluar] = useState(false);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2.5 rounded-lg p-1 pr-1.5 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-muted sm:pr-2"
            aria-label={`Menu akun ${pengguna.nama}`}
          >
            <AvatarPengguna pengguna={pengguna} className="size-8" />
            <span className="hidden min-w-0 sm:grid">
              <span className="max-w-40 truncate text-sm leading-tight font-medium text-foreground">
                {pengguna.nama}
              </span>
              <span className="mt-0.5">
                <LencanaPeran peran={pengguna.peran} />
              </span>
            </span>
            <ChevronDown aria-hidden className="hidden size-4 text-muted-foreground sm:block" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="flex items-center gap-3">
            <AvatarPengguna pengguna={pengguna} className="size-10" />
            <span className="grid min-w-0 gap-0.5">
              <span className="truncate text-sm font-semibold text-foreground">
                {pengguna.nama}
              </span>
              <span className="truncate text-xs font-normal text-muted-foreground">
                {pengguna.surel}
              </span>
              <span>
                <LencanaPeran peran={pengguna.peran} />
              </span>
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem asChild>
              <Link href="/admin/profil">
                <UserCog />
                Pengaturan Profil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setGantiPassword(true)}>
              <KeyRound />
              Ganti Password
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setKeluar(true)}>
            <LogOut />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DialogGantiPassword buka={gantiPassword} onBukaChange={setGantiPassword} />
      <DialogKeluar buka={keluar} onBukaChange={setKeluar} />
    </>
  );
}
