'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/sesi';
import { akarPanel } from '@/lib/panel';
import { Building2, ShieldCheck } from 'lucide-react';
import { StateMessage } from '@/components/ui';
import { AuthSurface } from '@/components/auth-surface';
import { FormMasukPassword } from '@/components/form-masuk-password';

/** Email/password semua domain; Google khusus @ith.ac.id. */
export default function MasukPage() {
  const { state, pengguna, galat, muatUlang } = useSession();
  const router = useRouter();
  useEffect(() => {
    if (state !== 'authenticated') return;
    router.replace(
      pengguna?.peran.some((p) => p === 'ADMIN' || p === 'SUPERADMIN')
        ? akarPanel(pengguna.peran)
        : '/akun',
    );
  }, [state, pengguna, router]);

  return (
    <AuthSurface audience="staff">
      <div className="auth-heading">
        <p className="auth-eyebrow">
          <Building2 aria-hidden className="size-3.5" /> Akun Dosen/Staf
        </p>
        <h1>Masuk Dosen dan Staf</h1>
        <p className="auth-intro">Email ITH atau pribadi yang terdaftar.</p>
      </div>
      <div>
        {state === 'registration' ? (
          <div>
            <StateMessage title="Satu langkah lagi">
              Lengkapi unit kerja setelah verifikasi Google.
            </StateMessage>
            <Link
              className="mt-4 inline-flex min-h-11 items-center rounded-md bg-institusi-600 px-5 font-semibold text-white"
              href="/akun"
            >
              Lengkapi pendaftaran
            </Link>
          </div>
        ) : state === 'loading' ? (
          <StateMessage title="Memeriksa sesi…" />
        ) : state === 'error' ? (
          <StateMessage title="Sesi belum dapat diperiksa" kind="error">
            {galat}
            <button onClick={() => void muatUlang()} className="ml-2 underline">
              Coba lagi
            </button>
          </StateMessage>
        ) : pengguna ? (
          <Link href="/akun" className="font-semibold underline">
            Lanjutkan ke akun
          </Link>
        ) : (
          <>
            <FormMasukPassword jalur="staff" />
            <div className="auth-secondary">
              <div className="auth-divider">atau</div>
              <a href="/api/v1/auth/google" className="auth-google">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0">
                  <path
                    fill="#4285F4"
                    d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.04.97-3.38.97-2.61 0-4.83-1.76-5.62-4.12H3.04v2.59A10 10 0 0 0 12 22Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M6.38 13.93a6 6 0 0 1 0-3.86V7.48H3.04a10 10 0 0 0 0 9.04l3.34-2.59Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.95c1.47 0 2.79.5 3.83 1.51l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.96 5.48l3.34 2.59C7.17 7.71 9.39 5.95 12 5.95Z"
                  />
                </svg>
                Masuk dengan Google
              </a>
              <p className="auth-hint">Masuk dengan Google khusus akun @ith.ac.id.</p>
              <p className="auth-switch">
                Belum punya akun?{' '}
                <Link href="/daftar" className="auth-link">
                  Daftar akun
                </Link>
              </p>
              <p className="auth-policy">
                <ShieldCheck aria-hidden className="size-3.5" /> Akses internal tersedia setelah
                akun disetujui Superadmin.
              </p>
            </div>
          </>
        )}
      </div>
    </AuthSurface>
  );
}
