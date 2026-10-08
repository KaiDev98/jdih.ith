'use client';

import { useEffect, useState } from 'react';
import { KeyRound, Mail, ShieldCheck } from 'lucide-react';
import type { StatusPassword } from '@jdih/shared';
import { ambilApi } from '@/lib/api-client';
import { useSession } from '@/lib/sesi';
import { formatWaktuAudit } from '@/lib/label-audit';
import { Button } from '@/components/ui/button';
import { DialogGantiPassword } from './dialog-ganti-password';
import { AvatarPengguna, LencanaPeran } from './menu-profil';

function Bagian({
  judul,
  deskripsi,
  children,
}: {
  judul: string;
  deskripsi: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-4 border-t border-border py-8 first:border-t-0 first:pt-0 md:grid-cols-[16rem_minmax(0,1fr)] md:gap-10">
      <div>
        <h2 className="text-base font-semibold text-foreground">{judul}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{deskripsi}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function Baris({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm font-medium [overflow-wrap:anywhere] text-foreground">
        {children}
      </dd>
    </div>
  );
}

/** Halaman Pengaturan Profil: data akun (dari Google) dan keamanan masuk. */
export function ProfilAdmin() {
  const { pengguna } = useSession();
  const [status, setStatus] = useState<StatusPassword>();
  const [dialog, setDialog] = useState(false);

  useEffect(() => {
    if (dialog) return;
    ambilApi<StatusPassword>('/auth/password')
      .then(setStatus)
      .catch(() => undefined);
  }, [dialog]);

  if (!pengguna) return null;
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Pengaturan Profil</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Informasi akun dan cara Anda masuk ke panel admin.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-background px-5 py-6 sm:px-8 sm:py-8">
        <Bagian judul="Informasi akun" deskripsi="Nama dan foto mengikuti akun Google ITH Anda.">
          <div className="flex items-center gap-4">
            <AvatarPengguna pengguna={pengguna} className="size-14 text-base" />
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-foreground">{pengguna.nama}</p>
              <p className="truncate text-sm text-muted-foreground">{pengguna.surel}</p>
            </div>
          </div>
          <dl className="mt-4 divide-y divide-border border-y border-border">
            <Baris label="Peran">
              <LencanaPeran peran={pengguna.peran} />
            </Baris>
            <Baris label="Status akun">
              {pengguna.status === 'AKTIF' ? 'Aktif' : pengguna.status}
            </Baris>
            <Baris label="Jumlah izin">{pengguna.izin.length} izin</Baris>
          </dl>
        </Bagian>

        <Bagian judul="Keamanan" deskripsi="Cara masuk yang tersedia untuk akun ini.">
          <ul className="grid gap-3">
            <li className="flex items-start gap-3 rounded-lg border border-border p-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
                <Mail className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">Akun Google ITH</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Selalu dapat dipakai untuk masuk.
                </p>
              </div>
              <ShieldCheck aria-label="Aktif" className="size-5 text-emerald-600" />
            </li>
            <li className="flex flex-wrap items-start gap-3 rounded-lg border border-border p-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
                <KeyRound className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">Password</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {status === undefined
                    ? 'Memuat…'
                    : status.punyaPassword
                      ? `Terakhir diubah ${status.diubahPada ? formatWaktuAudit(status.diubahPada) : '—'}.`
                      : 'Belum dibuat. Buat password untuk masuk dengan email dan password.'}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
                disabled={status === undefined}
                onClick={() => setDialog(true)}
              >
                {status?.punyaPassword ? 'Ganti password' : 'Buat password'}
              </Button>
            </li>
          </ul>
        </Bagian>
      </div>
      <DialogGantiPassword buka={dialog} onBukaChange={setDialog} />
    </div>
  );
}
