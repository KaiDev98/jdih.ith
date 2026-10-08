'use client';

import { useEffect, useId, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Check, CheckCircle2, Circle, Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { skemaUbahPassword, type MuatanUbahPassword, type StatusPassword } from '@jdih/shared';
import { ambilApi, GalatApi } from '@/lib/api-client';
import { csrfHeaders, useSession } from '@/lib/sesi';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type Isian = MuatanUbahPassword;

/** Kolom password dengan tombol tampil/sembunyi dan pesan galat di bawahnya. */
export function KolomPassword({
  label,
  galat,
  autoComplete,
  ...props
}: React.ComponentProps<'input'> & { label: string; galat?: string; autoComplete: string }) {
  const [tampil, setTampil] = useState(false);
  const id = useId();
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={tampil ? 'text' : 'password'}
          autoComplete={autoComplete}
          aria-invalid={galat ? true : undefined}
          aria-describedby={galat ? `${id}-galat` : undefined}
          className="pr-10"
          {...props}
        />
        <button
          type="button"
          onClick={() => setTampil((x) => !x)}
          aria-label={tampil ? 'Sembunyikan password' : 'Tampilkan password'}
          className="absolute inset-y-0 right-0 grid w-10 place-items-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {tampil ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {galat && (
        <p id={`${id}-galat`} className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle aria-hidden className="size-3.5 shrink-0" />
          {galat}
        </p>
      )}
    </div>
  );
}

/** Daftar syarat password baru yang tercentang langsung saat diketik. */
export function SyaratPassword({ nilai }: { nilai: string }) {
  const syarat = [
    { teks: 'Minimal 10 karakter', ok: nilai.length >= 10 },
    { teks: 'Memuat huruf', ok: /[A-Za-z]/.test(nilai) },
    { teks: 'Memuat angka', ok: /[0-9]/.test(nilai) },
  ];
  return (
    <ul aria-label="Syarat password" className="grid gap-1 text-xs sm:grid-cols-3">
      {syarat.map(({ teks, ok }) => (
        <li
          key={teks}
          className={cn(
            'flex items-center gap-1.5',
            ok ? 'text-emerald-700' : 'text-muted-foreground',
          )}
        >
          {ok ? (
            <Check aria-hidden className="size-3.5" />
          ) : (
            <Circle aria-hidden className="size-3" />
          )}
          {teks}
          <span className="sr-only">{ok ? '(terpenuhi)' : '(belum)'}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Dialog buat/ganti password akun sendiri. Password saat ini diminta bila akun
 * sudah punya password. Setelah berhasil, sesi di perangkat lain dikeluarkan.
 */
export function DialogGantiPassword({
  buka,
  onBukaChange,
}: {
  buka: boolean;
  onBukaChange: (buka: boolean) => void;
}) {
  const { csrfToken } = useSession();
  const [status, setStatus] = useState<StatusPassword>();
  const [galatUmum, setGalatUmum] = useState('');
  const [berhasil, setBerhasil] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<Isian>({
    resolver: zodResolver(skemaUbahPassword),
    defaultValues: { passwordSaatIni: '', passwordBaru: '', konfirmasiPassword: '' },
  });
  const passwordBaru = useWatch({ control, name: 'passwordBaru' }) ?? '';

  useEffect(() => {
    if (!buka) return;
    let aktif = true;
    ambilApi<StatusPassword>('/auth/password')
      .then((s) => {
        if (aktif) setStatus(s);
      })
      .catch(() => {
        if (aktif) setStatus({ punyaPassword: true, diubahPada: null });
      });
    return () => {
      aktif = false;
    };
  }, [buka]);

  function ubahBuka(nilai: boolean) {
    if (!nilai) {
      reset();
      setGalatUmum('');
      setBerhasil(false);
    }
    onBukaChange(nilai);
  }

  async function kirim(isian: Isian) {
    setGalatUmum('');
    if (status?.punyaPassword && !isian.passwordSaatIni) {
      setError('passwordSaatIni', { message: 'Password saat ini wajib diisi' });
      return;
    }
    try {
      const hasil = await ambilApi<StatusPassword>('/auth/password', {
        method: 'POST',
        headers: csrfHeaders(csrfToken),
        muatan: {
          passwordBaru: isian.passwordBaru,
          konfirmasiPassword: isian.konfirmasiPassword,
          ...(status?.punyaPassword ? { passwordSaatIni: isian.passwordSaatIni } : {}),
        },
      });
      setStatus(hasil);
      setBerhasil(true);
    } catch (e) {
      if (e instanceof GalatApi && /password saat ini salah/i.test(e.message))
        setError('passwordSaatIni', { message: 'Password saat ini salah' }, { shouldFocus: true });
      else if (e instanceof GalatApi && e.status === 429)
        setGalatUmum('Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.');
      else
        setGalatUmum(e instanceof Error ? e.message : 'Password belum dapat disimpan. Coba lagi.');
    }
  }

  const buat = status !== undefined && !status.punyaPassword;
  return (
    <Dialog open={buka} onOpenChange={ubahBuka}>
      <DialogContent>
        {berhasil ? (
          <div className="grid justify-items-center gap-3 py-2 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="size-6" />
            </span>
            <DialogTitle>Password berhasil disimpan</DialogTitle>
            <DialogDescription>
              Anda kini dapat masuk dengan email dan password ini. Demi keamanan, sesi di perangkat
              lain telah dikeluarkan.
            </DialogDescription>
            <Button className="mt-2 w-full sm:w-auto" onClick={() => ubahBuka(false)}>
              Selesai
            </Button>
          </div>
        ) : (
          <form noValidate onSubmit={(e) => void handleSubmit(kirim)(e)} className="grid gap-5">
            <DialogHeader>
              <DialogTitle>{buat ? 'Buat password' : 'Ganti password'}</DialogTitle>
              <DialogDescription>
                {buat
                  ? 'Buat password agar Anda juga dapat masuk dengan email dan password, di samping akun Google.'
                  : 'Masukkan password saat ini, lalu password baru Anda.'}
              </DialogDescription>
            </DialogHeader>

            {galatUmum && (
              <div
                role="alert"
                className="flex gap-2.5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
              >
                <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
                {galatUmum}
              </div>
            )}

            <div className="grid gap-4">
              {!buat && (
                <KolomPassword
                  label="Password saat ini"
                  autoComplete="current-password"
                  galat={errors.passwordSaatIni?.message}
                  {...register('passwordSaatIni')}
                />
              )}
              <div className="grid gap-2">
                <KolomPassword
                  label="Password baru"
                  autoComplete="new-password"
                  galat={errors.passwordBaru?.message}
                  {...register('passwordBaru')}
                />
                <SyaratPassword nilai={passwordBaru} />
              </div>
              <KolomPassword
                label="Konfirmasi password baru"
                autoComplete="new-password"
                galat={errors.konfirmasiPassword?.message}
                {...register('konfirmasiPassword')}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => ubahBuka(false)}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting || status === undefined}>
                {isSubmitting && <LoaderCircle className="animate-spin" />}
                {isSubmitting ? 'Menyimpan…' : 'Simpan password'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
