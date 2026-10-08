'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { skemaLoginPassword, type MuatanLoginPassword } from '@jdih/shared';
import { ambilApi, GalatApi } from '@/lib/api-client';
import { useSession } from '@/lib/sesi';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';

/**
 * Masuk dengan email + password. Tiap jalur hanya menerima perannya sendiri:
 * `admin` untuk Admin, `superadmin` untuk Superadmin (diperiksa backend).
 */
export function FormMasukPassword({ jalur }: { jalur: 'admin' | 'superadmin' }) {
  const { muatUlang } = useSession();
  const router = useRouter();
  const [tampil, setTampil] = useState(false);
  const [galat, setGalat] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MuatanLoginPassword>({ resolver: zodResolver(skemaLoginPassword) });

  async function kirim(isian: MuatanLoginPassword) {
    setGalat('');
    try {
      await ambilApi(jalur === 'superadmin' ? '/auth/login/superadmin' : '/auth/login', {
        method: 'POST',
        muatan: isian,
      });
      await muatUlang();
      router.replace('/admin');
    } catch (e) {
      setGalat(
        e instanceof GalatApi && e.status === 429
          ? e.message
          : e instanceof GalatApi && e.status === 401
            ? 'Email atau password salah.'
            : 'Belum dapat masuk. Periksa koneksi lalu coba lagi.',
      );
    }
  }

  return (
    <form noValidate onSubmit={(e) => void handleSubmit(kirim)(e)} className="grid gap-4">
      {galat && (
        <div
          role="alert"
          className="flex gap-2.5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
          {galat}
        </div>
      )}
      <div className="grid gap-1.5">
        <Label htmlFor="masuk-email">Email</Label>
        <Input
          id="masuk-email"
          type="email"
          autoComplete="username"
          placeholder="nama@ith.ac.id"
          aria-invalid={errors.email ? true : undefined}
          {...register('email')}
        />
        {errors.email && (
          <p className="text-xs text-destructive">Masukkan alamat email yang valid.</p>
        )}
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="masuk-password">Password</Label>
        <div className="relative">
          <Input
            id="masuk-password"
            type={tampil ? 'text' : 'password'}
            autoComplete="current-password"
            className="pr-10"
            aria-invalid={errors.password ? true : undefined}
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setTampil((x) => !x)}
            aria-label={tampil ? 'Sembunyikan password' : 'Tampilkan password'}
            className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground"
          >
            {tampil ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>
      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting && <LoaderCircle className="animate-spin" />}
        {isSubmitting ? 'Memeriksa…' : 'Masuk'}
      </Button>
    </form>
  );
}
