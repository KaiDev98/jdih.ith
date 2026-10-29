'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ArrowRight, Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { skemaLoginPassword, type MuatanLoginPassword } from '@jdih/shared';
import { ambilApi, GalatApi } from '@/lib/api-client';
import { useSession } from '@/lib/sesi';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';

/**
 * Masuk dengan email + password. Tiap jalur hanya menerima perannya sendiri:
 * `admin` untuk Admin, `superadmin` untuk Superadmin, `staff` untuk Dosen/Staf.
 */
export function FormMasukPassword({ jalur }: { jalur: 'admin' | 'superadmin' | 'staff' }) {
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
      const endpoint =
        jalur === 'staff'
          ? '/auth/login/staff'
          : jalur === 'superadmin'
            ? '/auth/login/superadmin'
            : '/auth/login';
      await ambilApi(endpoint, {
        method: 'POST',
        muatan: isian,
      });
      await muatUlang();
      router.replace(
        jalur === 'staff' ? '/akun' : jalur === 'superadmin' ? '/superadmin' : '/admin',
      );
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
    <form
      noValidate
      onSubmit={(e) => void handleSubmit(kirim)(e)}
      aria-busy={isSubmitting}
      className="auth-password-form"
    >
      {galat && (
        <div role="alert" className="auth-login-error">
          <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
          {galat}
        </div>
      )}
      <div className="auth-field">
        <Label htmlFor="masuk-email">Email</Label>
        <Input
          id="masuk-email"
          type="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder={jalur === 'staff' ? 'nama@email.com' : 'nama@ith.ac.id'}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? 'galat-email' : undefined}
          {...register('email')}
        />
        {errors.email && (
          <p id="galat-email" role="alert" className="text-xs text-destructive">
            Masukkan alamat email yang valid.
          </p>
        )}
      </div>
      <div className="auth-field">
        <Label htmlFor="masuk-password">Password</Label>
        <div className="relative">
          <Input
            id="masuk-password"
            type={tampil ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="Masukkan password Anda"
            className="pr-12"
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? 'galat-password' : undefined}
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setTampil((x) => !x)}
            aria-label={tampil ? 'Sembunyikan password' : 'Tampilkan password'}
            aria-pressed={tampil}
            aria-controls="masuk-password"
            className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-lg text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-institusi-500"
          >
            {tampil ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {errors.password && (
          <p id="galat-password" role="alert" className="text-xs text-destructive">
            {errors.password.message}
          </p>
        )}
      </div>
      <Button type="submit" size="lg" className="auth-primary" disabled={isSubmitting}>
        {isSubmitting && <LoaderCircle className="animate-spin" />}
        {isSubmitting ? 'Memeriksa…' : 'Masuk'}
        {!isSubmitting && <ArrowRight className="auth-submit-arrow size-4" aria-hidden />}
      </Button>
    </form>
  );
}
