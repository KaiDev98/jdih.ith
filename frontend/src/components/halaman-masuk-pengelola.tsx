'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/sesi';
import { FormMasukPassword } from '@/components/form-masuk-password';

const LOGIN_UJI =
  process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_LOGIN_UJI === 'true';

/**
 * Halaman masuk pengelola (Admin atau Superadmin), terpisah dari halaman masuk
 * Dosen/Staf. Tiap halaman hanya menerima perannya sendiri; backend menolak
 * peran lain dengan pesan yang sama seperti password salah.
 */
export function HalamanMasukPengelola({ jalur }: { jalur: 'admin' | 'superadmin' }) {
  const { state, pengguna } = useSession();
  const router = useRouter();
  const superadmin = jalur === 'superadmin';
  useEffect(() => {
    if (
      state === 'authenticated' &&
      pengguna?.peran.some((p) => p === 'ADMIN' || p === 'SUPERADMIN')
    )
      router.replace('/admin');
  }, [state, pengguna, router]);

  return (
    <main id="isi-utama" className="grid min-h-dvh place-items-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image
            src="/logo-ith.webp"
            alt=""
            width={500}
            height={527}
            unoptimized
            className="h-12 w-auto"
          />
          <h1 className="mt-4 text-xl font-bold tracking-tight text-foreground">
            {superadmin ? 'Masuk Superadmin' : 'Masuk Admin'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Panel pengelola JDIH ITH</p>
        </div>
        <div className="rounded-xl border border-border bg-background p-6">
          <FormMasukPassword jalur={jalur} />
          {LOGIN_UJI && (
            <a
              href={`/api/v1/auth/uji/${superadmin ? 'SUPERADMIN' : 'ADMIN'}`}
              className="mt-4 flex min-h-9 items-center justify-center rounded-md border border-dashed border-amber-400 bg-amber-50 text-xs font-semibold text-amber-900 hover:bg-amber-100"
            >
              Mode uji lokal: masuk tanpa password
            </a>
          )}
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {superadmin
            ? 'Lupa password? Atur ulang dari server dengan perintah superadmin:password.'
            : 'Lupa password? Hubungi Superadmin untuk mengatur ulang.'}
        </p>
        <p className="mt-2 text-center text-sm">
          <Link
            href="/masuk"
            className="text-muted-foreground hover:text-foreground hover:underline"
          >
            Dosen atau staf? Masuk di sini
          </Link>
        </p>
      </div>
    </main>
  );
}
