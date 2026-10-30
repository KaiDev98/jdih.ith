'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Check, KeyRound, LoaderCircle, Mail } from 'lucide-react';
import {
  skemaMintaPemulihanPassword,
  skemaKonfirmasiPemulihanPassword,
  skemaStatusPemulihanPassword,
  skemaHasilMintaPemulihanPassword,
  skemaHasilKonfirmasiPemulihanPassword,
  type MuatanMintaPemulihanPassword,
  type MuatanKonfirmasiPemulihanPassword,
} from '@jdih/shared';
import { ambilApi } from '@/lib/api-client';
import { AuthSurface } from './auth-surface';
import { Input, Label } from './ui/input';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

function Konfirmasi({
  open,
  busy,
  reset,
  close,
  confirm,
}: {
  open: boolean;
  busy: boolean;
  reset?: boolean;
  close: () => void;
  confirm: () => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value && !busy) close();
      }}
    >
      <DialogContent
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{reset ? 'Simpan password baru?' : 'Minta tautan pemulihan?'}</DialogTitle>
          <DialogDescription>
            {reset
              ? 'Semua sesi lama akun Anda akan diakhiri. Setelah berhasil, masuk kembali dengan password baru.'
              : 'Permintaan pemulihan akan diproses untuk email yang Anda masukkan.'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={busy} onClick={close}>
            Batal
          </Button>
          <Button type="button" disabled={busy} onClick={confirm}>
            {busy && <LoaderCircle size={16} className="animate-spin" aria-hidden />}
            {busy ? 'Memproses…' : reset ? 'Simpan password' : 'Kirim permintaan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
function Heading({ reset }: { reset?: boolean }) {
  const Icon = reset ? KeyRound : Mail;
  return (
    <div className="auth-heading">
      <p className="auth-eyebrow">
        <Icon size={14} aria-hidden /> Pemulihan akun Dosen/Staf
      </p>
      <h1>{reset ? 'Atur ulang password' : 'Lupa password?'}</h1>
      <p className="auth-intro">
        {reset
          ? 'Buat password baru untuk akun Anda.'
          : 'Masukkan email yang digunakan saat mendaftar.'}
      </p>
    </div>
  );
}
function KembaliMasuk() {
  return (
    <p className="auth-switch">
      <Link className="auth-link" href="/masuk">
        Kembali ke login Dosen/Staf <ArrowRight size={13} aria-hidden />
      </Link>
    </p>
  );
}

function MintaPemulihan() {
  const [tersedia, setTersedia] = useState<boolean | null>(null);
  const [galat, setGalat] = useState('');
  const [sent, setSent] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [ulang, setUlang] = useState(0);
  const running = useRef(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MuatanMintaPemulihanPassword>({ resolver: zodResolver(skemaMintaPemulihanPassword) });
  useEffect(() => {
    let active = true;
    void ambilApi<unknown>('/auth/password-recovery', { cache: 'no-store' })
      .then((value) => {
        const result = skemaStatusPemulihanPassword.parse(value);
        if (active) {
          setTersedia(result.tersedia);
          setGalat(
            result.tersedia
              ? ''
              : 'Pemulihan password belum tersedia saat ini. Silakan hubungi pengelola.',
          );
        }
      })
      .catch(() => {
        if (active) setGalat('Layanan belum dapat diperiksa. Silakan coba lagi.');
      });
    return () => {
      active = false;
    };
  }, [ulang]);
  async function kirim(values: MuatanMintaPemulihanPassword) {
    if (running.current) return;
    running.current = true;
    setGalat('');
    try {
      const result = skemaHasilMintaPemulihanPassword.parse(
        await ambilApi<unknown>('/auth/password-recovery', {
          method: 'POST',
          muatan: values,
          cache: 'no-store',
        }),
      );
      setSent(result.pesan);
      setConfirm(false);
    } catch (error) {
      setConfirm(false);
      setGalat(error instanceof Error ? error.message : 'Permintaan belum dapat diproses.');
    } finally {
      running.current = false;
    }
  }
  return (
    <AuthSurface audience="staff">
      <Heading />
      {sent ? (
        <div role="status" className="auth-recovery-result">
          <Check size={24} aria-hidden />
          <h2>Permintaan diterima</h2>
          <p>{sent}</p>
          <p>Tautan berlaku 30 menit dan hanya dapat digunakan sekali.</p>
        </div>
      ) : (
        <form
          className="auth-password-form"
          onSubmit={handleSubmit(() => setConfirm(true))}
          noValidate
        >
          <div className="auth-field">
            <Label htmlFor="pemulihan-email">Email terdaftar</Label>
            <Input
              id="pemulihan-email"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="nama@email.com"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'pemulihan-email-error' : undefined}
              {...register('email')}
            />
            {errors.email && (
              <p id="pemulihan-email-error" className="auth-error" role="alert">
                {errors.email.message}
              </p>
            )}
          </div>
          {galat && (
            <div className="auth-login-error" role="alert">
              <div>
                <p>{galat}</p>
                <div className="flex flex-wrap items-center gap-x-4">
                  <button
                    type="button"
                    className="auth-link min-h-11"
                    onClick={() => {
                      setTersedia(null);
                      setGalat('');
                      setUlang((value) => value + 1);
                    }}
                  >
                    Coba lagi
                  </button>
                  {tersedia === false && (
                    <Link className="auth-link inline-flex min-h-11 items-center" href="/kontak">
                      Hubungi pengelola
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}
          <Button
            type="submit"
            className="auth-primary"
            size="lg"
            disabled={tersedia !== true || isSubmitting}
          >
            {tersedia === null && !galat ? (
              <>
                <LoaderCircle className="animate-spin" size={16} aria-hidden />
                Memeriksa layanan…
              </>
            ) : (
              <>
                Kirim tautan pemulihan <ArrowRight size={15} aria-hidden />
              </>
            )}
          </Button>
          <p className="auth-hint">
            Jika akun Anda dibuat melalui Google, gunakan tombol Masuk dengan Google pada halaman
            login.
          </p>
        </form>
      )}
      <KembaliMasuk />
      <Konfirmasi
        open={confirm}
        busy={isSubmitting}
        close={() => setConfirm(false)}
        confirm={() => void handleSubmit(kirim)()}
      />
    </AuthSurface>
  );
}

function subscribeHash(listener: () => void) {
  window.addEventListener('hashchange', listener);
  return () => window.removeEventListener('hashchange', listener);
}
function AturUlang() {
  const hash = useSyncExternalStore(
    subscribeHash,
    () => window.location.hash,
    () => null,
  );
  const value = hash === null ? null : (new URLSearchParams(hash.slice(1)).get('token') ?? '');
  const token = value === null ? null : /^[A-Za-z0-9_-]{43}$/.test(value) ? value : '';
  const [galat, setGalat] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [selesai, setSelesai] = useState(false);
  const running = useRef(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MuatanKonfirmasiPemulihanPassword>({
    resolver: zodResolver(skemaKonfirmasiPemulihanPassword),
    values: { token: token ?? '', passwordBaru: '', konfirmasiPassword: '' },
  });
  async function simpan(values: MuatanKonfirmasiPemulihanPassword) {
    if (running.current) return;
    running.current = true;
    setGalat('');
    try {
      skemaHasilKonfirmasiPemulihanPassword.parse(
        await ambilApi<unknown>('/auth/password-recovery/confirm', {
          method: 'POST',
          muatan: values,
          cache: 'no-store',
        }),
      );
      window.history.replaceState(null, '', window.location.pathname);
      window.dispatchEvent(new Event('hashchange'));
      setSelesai(true);
      setConfirm(false);
    } catch (error) {
      setConfirm(false);
      setGalat(error instanceof Error ? error.message : 'Password belum dapat diubah.');
    } finally {
      running.current = false;
    }
  }
  return (
    <AuthSurface audience="staff">
      <Heading reset />
      {selesai ? (
        <div role="status" className="auth-recovery-result">
          <Check size={24} aria-hidden />
          <h2>Password berhasil diubah</h2>
          <p>Semua sesi lama telah diakhiri. Masuk kembali dengan password baru Anda.</p>
          <a className="auth-primary" href="/masuk">
            Masuk dengan password baru <ArrowRight size={16} aria-hidden />
          </a>
        </div>
      ) : token === null ? (
        <p role="status" className="auth-intro">
          Memeriksa tautan…
        </p>
      ) : !token ? (
        <div role="alert" className="auth-login-error">
          <p>
            Tautan pemulihan tidak valid. Buka kembali tautan dari email atau minta tautan baru.
          </p>
        </div>
      ) : (
        <form
          className="auth-password-form"
          onSubmit={handleSubmit(() => setConfirm(true))}
          noValidate
        >
          <div className="auth-field">
            <Label htmlFor="password-baru">Password baru</Label>
            <Input
              id="password-baru"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!errors.passwordBaru}
              aria-describedby="password-baru-hint"
              {...register('passwordBaru')}
            />
            <p id="password-baru-hint" className="auth-hint">
              Minimal 10 karakter, memuat huruf dan angka.
            </p>
            {errors.passwordBaru && (
              <p className="auth-error" role="alert">
                {errors.passwordBaru.message}
              </p>
            )}
          </div>
          <div className="auth-field">
            <Label htmlFor="konfirmasi-password-baru">Konfirmasi password baru</Label>
            <Input
              id="konfirmasi-password-baru"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!errors.konfirmasiPassword}
              {...register('konfirmasiPassword')}
            />
            {errors.konfirmasiPassword && (
              <p className="auth-error" role="alert">
                {errors.konfirmasiPassword.message}
              </p>
            )}
          </div>
          {galat && (
            <p className="auth-login-error" role="alert">
              {galat}
            </p>
          )}
          <Button type="submit" size="lg" className="auth-primary" disabled={isSubmitting}>
            Simpan password baru <ArrowRight size={15} aria-hidden />
          </Button>
        </form>
      )}
      {!selesai && (
        <>
          <p className="auth-switch">
            <Link className="auth-link" href="/lupa-password">
              Minta tautan pemulihan baru
            </Link>
          </p>
          <KembaliMasuk />
        </>
      )}
      <Konfirmasi
        open={confirm}
        busy={isSubmitting}
        reset
        close={() => setConfirm(false)}
        confirm={() => void handleSubmit(simpan)()}
      />
    </AuthSurface>
  );
}
export function FormPemulihanPassword({ mode }: { mode: 'request' | 'reset' }) {
  return mode === 'request' ? <MintaPemulihan /> : <AturUlang />;
}
