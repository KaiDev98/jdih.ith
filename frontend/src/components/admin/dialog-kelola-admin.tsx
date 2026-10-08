'use client';

import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Check, CheckCircle2, Copy, LoaderCircle, Wand2 } from 'lucide-react';
import {
  skemaAturUlangPassword,
  skemaBuatAdmin,
  type MuatanAturUlangPassword,
  type MuatanBuatAdmin,
} from '@jdih/shared';
import { ambilApi, GalatApi } from '@/lib/api-client';
import { csrfHeaders, useSession } from '@/lib/sesi';
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
import { KolomPassword, SyaratPassword } from './dialog-ganti-password';

/** Password acak 14 karakter, tanpa huruf yang mudah tertukar (0/O, 1/l/I), pasti memuat huruf dan angka. */
export function buatPasswordAcak() {
  const huruf = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
  const angka = '23456789';
  const semua = huruf + angka;
  const acak = crypto.getRandomValues(new Uint32Array(14));
  const pilih = (himpunan: string, n: number) => himpunan[n % himpunan.length]!;
  const isi = Array.from(acak, (n, i) =>
    i === 0 ? pilih(huruf, n) : i === 1 ? pilih(angka, n) : pilih(semua, n),
  );
  // Acak posisi (Fisher–Yates) agar huruf dan angka wajib tidak selalu di depan.
  const urut = crypto.getRandomValues(new Uint32Array(isi.length));
  for (let i = isi.length - 1; i > 0; i--) {
    const j = urut[i]! % (i + 1);
    [isi[i], isi[j]] = [isi[j]!, isi[i]!];
  }
  return isi.join('');
}

/** Satu baris data login yang bisa disalin. */
function BarisSalin({ label, nilai }: { label: string; nilai: string }) {
  const [tersalin, setTersalin] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/50 px-3 py-2">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate font-mono text-sm text-foreground">{nilai}</p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Salin ${label.toLowerCase()}`}
        onClick={() => {
          void navigator.clipboard.writeText(nilai).then(() => {
            setTersalin(true);
            window.setTimeout(() => setTersalin(false), 1500);
          });
        }}
      >
        {tersalin ? <Check className="text-emerald-600" /> : <Copy />}
      </Button>
    </div>
  );
}

function KotakGalat({ pesan }: { pesan: string }) {
  return (
    <div
      role="alert"
      className="flex gap-2.5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
    >
      <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
      {pesan}
    </div>
  );
}

/** Tampilan setelah berhasil: data login untuk diserahkan langsung ke Admin. */
function DataLogin({
  judul,
  email,
  password,
  onSelesai,
}: {
  judul: string;
  email: string;
  password: string;
  onSelesai: () => void;
}) {
  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="size-5" />
        </span>
        <DialogHeader>
          <DialogTitle>{judul}</DialogTitle>
          <DialogDescription>
            Serahkan data ini langsung kepada Admin yang bersangkutan.
          </DialogDescription>
        </DialogHeader>
      </div>
      <div className="grid gap-2">
        <BarisSalin label="Email" nilai={email} />
        <BarisSalin label="Password" nilai={password} />
      </div>
      <p className="rounded-md bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
        Password ini hanya ditampilkan sekali. Minta Admin menggantinya lewat menu{' '}
        <strong>Ganti Password</strong> setelah masuk pertama kali.
      </p>
      <DialogFooter>
        <Button onClick={onSelesai}>Selesai</Button>
      </DialogFooter>
    </div>
  );
}

/** Superadmin membuat akun Admin baru: nama, email, dan password awal. */
export function DialogTambahAdmin({
  buka,
  onBukaChange,
  onDibuat,
}: {
  buka: boolean;
  onBukaChange: (b: boolean) => void;
  onDibuat: () => void;
}) {
  const { csrfToken } = useSession();
  const [galat, setGalat] = useState('');
  const [dibuat, setDibuat] = useState<{ email: string; password: string }>();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<MuatanBuatAdmin>({
    resolver: zodResolver(skemaBuatAdmin),
    defaultValues: { nama: '', email: '', password: '' },
  });
  const password = useWatch({ control, name: 'password' }) ?? '';

  function ubahBuka(b: boolean) {
    if (!b) {
      reset();
      setGalat('');
      setDibuat(undefined);
    }
    onBukaChange(b);
  }

  async function kirim(isian: MuatanBuatAdmin) {
    setGalat('');
    try {
      const hasil = await ambilApi<{ email: string }>('/admin/users/admins', {
        method: 'POST',
        headers: csrfHeaders(csrfToken),
        muatan: isian,
      });
      setDibuat({ email: hasil.email, password: isian.password });
      onDibuat();
    } catch (e) {
      if (e instanceof GalatApi && e.status === 409)
        setError('email', { message: 'Email ini sudah terdaftar' }, { shouldFocus: true });
      else setGalat(e instanceof Error ? e.message : 'Akun belum dapat dibuat. Coba lagi.');
    }
  }

  return (
    <Dialog open={buka} onOpenChange={ubahBuka}>
      <DialogContent>
        {dibuat ? (
          <DataLogin
            judul="Akun Admin dibuat"
            email={dibuat.email}
            password={dibuat.password}
            onSelesai={() => ubahBuka(false)}
          />
        ) : (
          <form noValidate onSubmit={(e) => void handleSubmit(kirim)(e)} className="grid gap-5">
            <DialogHeader>
              <DialogTitle>Tambah Admin</DialogTitle>
              <DialogDescription>
                Admin dapat langsung masuk dengan email dan password ini, tanpa perlu akun Google.
              </DialogDescription>
            </DialogHeader>
            {galat && <KotakGalat pesan={galat} />}
            <div className="grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="admin-nama">Nama lengkap</Label>
                <Input
                  id="admin-nama"
                  autoComplete="off"
                  aria-invalid={errors.nama ? true : undefined}
                  {...register('nama')}
                />
                {errors.nama && <p className="text-xs text-destructive">{errors.nama.message}</p>}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="admin-email">Email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  autoComplete="off"
                  placeholder="nama@ith.ac.id"
                  aria-invalid={errors.email ? true : undefined}
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">
                    {errors.email.message === 'Email ini sudah terdaftar'
                      ? errors.email.message
                      : 'Masukkan alamat email yang valid'}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <KolomPassword
                  label="Password awal"
                  autoComplete="new-password"
                  galat={errors.password?.message}
                  {...register('password')}
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <SyaratPassword nilai={password} />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setValue('password', buatPasswordAcak(), { shouldValidate: true })
                    }
                  >
                    <Wand2 />
                    Buat acak
                  </Button>
                </div>
              </div>
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <LoaderCircle className="animate-spin" />}
                {isSubmitting ? 'Membuat…' : 'Buat akun Admin'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Superadmin mengatur ulang password akun Admin yang lupa. */
export function DialogAturUlangPassword({
  akun,
  onTutup,
}: {
  akun: { id: string; nama: string; email: string } | undefined;
  onTutup: () => void;
}) {
  const { csrfToken } = useSession();
  const [galat, setGalat] = useState('');
  const [selesai, setSelesai] = useState<string>();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<MuatanAturUlangPassword>({
    resolver: zodResolver(skemaAturUlangPassword),
    defaultValues: { passwordBaru: '' },
  });
  const passwordBaru = useWatch({ control, name: 'passwordBaru' }) ?? '';

  function tutup() {
    reset();
    setGalat('');
    setSelesai(undefined);
    onTutup();
  }

  async function kirim(isian: MuatanAturUlangPassword) {
    if (!akun) return;
    setGalat('');
    try {
      await ambilApi(`/admin/users/${akun.id}/password`, {
        method: 'POST',
        headers: csrfHeaders(csrfToken),
        muatan: isian,
      });
      setSelesai(isian.passwordBaru);
    } catch (e) {
      setGalat(e instanceof Error ? e.message : 'Password belum dapat diatur ulang. Coba lagi.');
    }
  }

  return (
    <Dialog open={akun !== undefined} onOpenChange={(b) => !b && tutup()}>
      <DialogContent>
        {akun && selesai ? (
          <DataLogin
            judul="Password diatur ulang"
            email={akun.email}
            password={selesai}
            onSelesai={tutup}
          />
        ) : (
          <form noValidate onSubmit={(e) => void handleSubmit(kirim)(e)} className="grid gap-5">
            <DialogHeader>
              <DialogTitle>Atur ulang password</DialogTitle>
              <DialogDescription>
                Password baru untuk <strong className="text-foreground">{akun?.nama}</strong>. Semua
                sesi akun ini akan dikeluarkan.
              </DialogDescription>
            </DialogHeader>
            {galat && <KotakGalat pesan={galat} />}
            <div className="grid gap-2">
              <KolomPassword
                label="Password baru"
                autoComplete="new-password"
                galat={errors.passwordBaru?.message}
                {...register('passwordBaru')}
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <SyaratPassword nilai={passwordBaru} />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setValue('passwordBaru', buatPasswordAcak(), { shouldValidate: true })
                  }
                >
                  <Wand2 />
                  Buat acak
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={tutup} disabled={isSubmitting}>
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <LoaderCircle className="animate-spin" />}
                {isSubmitting ? 'Menyimpan…' : 'Atur ulang'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
