'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/sesi';
import { Card, StateMessage } from '@/components/ui';
import { HeroHalaman } from '@/components/hero-halaman';

/** Tombol login uji hanya tampil di pengembangan lokal; backend juga menolaknya bila LOGIN_UJI mati. */
const LOGIN_UJI =
  process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_LOGIN_UJI === 'true';

/** Halaman masuk Dosen/Staf: hanya lewat Google. Admin dan Superadmin punya halamannya sendiri. */
export default function MasukPage() {
  const { state, pengguna, galat, muatUlang } = useSession();
  const router = useRouter();
  useEffect(() => {
    if (state !== 'authenticated') return;
    router.replace(
      pengguna?.peran.some((p) => p === 'ADMIN' || p === 'SUPERADMIN') ? '/admin' : '/akun',
    );
  }, [state, pengguna, router]);

  return (
    <>
      <HeroHalaman
        judul="Masuk Dosen dan Staf"
        deskripsi="Gunakan akun Google Anda. Akun baru memerlukan persetujuan administrator sebelum dapat membuka dokumen Internal."
      />
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <Card className="grid gap-5">
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
              <p className="text-sm leading-6 text-slate-700">
                Dosen dan staf masuk serta mendaftar lewat Google. Email Anda diverifikasi langsung
                oleh Google.
              </p>
              <a
                href="/api/v1/auth/google"
                className="inline-flex min-h-12 items-center justify-center rounded-md bg-institusi-600 px-5 font-semibold text-white hover:bg-institusi-700"
              >
                Masuk dengan Google
              </a>
              {LOGIN_UJI && (
                <p className="rounded-md border border-dashed border-amber-400 bg-amber-50 p-3 text-xs text-amber-900">
                  Mode uji lokal: login uji Admin dan Superadmin ada di halaman masuk masing-masing.
                </p>
              )}
            </>
          )}
          <p className="border-t border-slate-200 pt-4 text-sm text-slate-600">
            Pengelola portal?{' '}
            <Link href="/masuk/admin" className="font-semibold text-institusi-700 hover:underline">
              Masuk sebagai Admin
            </Link>
          </p>
        </Card>
      </div>
    </>
  );
}
