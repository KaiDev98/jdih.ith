'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/sesi';
import { Card, StateMessage } from '@/components/ui';
import { HeroHalaman } from '@/components/hero-halaman';

/** Tombol login uji hanya tampil di pengembangan lokal; backend juga menolaknya bila LOGIN_UJI mati. */
const LOGIN_UJI = process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_LOGIN_UJI === 'true';

export default function MasukPage() {
  const { state, pengguna, galat, muatUlang } = useSession();
  const router = useRouter();
  useEffect(() => { if (state === 'authenticated') router.replace('/akun'); }, [state, router]);
  return <><HeroHalaman judul="Masuk ke JDIH ITH" deskripsi="Gunakan akun Google institusi @ith.ac.id. Akun baru memerlukan persetujuan administrator sebelum dapat digunakan." /><div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
    <Card className="grid gap-5"><p className="text-sm leading-6 text-slate-700">Login menggunakan Google institusi. Kami tidak menyediakan pendaftaran dengan kata sandi lokal.</p>
      {state === 'registration' ? <div><StateMessage title="Satu langkah lagi">Lengkapi unit kerja setelah verifikasi Google.</StateMessage><Link className="mt-4 inline-flex min-h-11 items-center rounded-md bg-institusi-600 px-5 font-semibold text-white" href="/akun">Lengkapi pendaftaran</Link></div>
        : state === 'loading' ? <StateMessage title="Memeriksa sesi…" />
          : state === 'error' ? <StateMessage title="Sesi belum dapat diperiksa" kind="error">{galat}<button onClick={() => void muatUlang()} className="ml-2 underline">Coba lagi</button></StateMessage>
            : pengguna ? <Link href="/akun" className="font-semibold underline">Lanjutkan ke akun</Link>
              : <><a href="/api/v1/auth/google" className="inline-flex min-h-12 items-center justify-center rounded-md bg-institusi-600 px-5 font-semibold text-white hover:bg-institusi-700">Masuk dengan Google</a>
                {LOGIN_UJI && <div className="grid gap-2 rounded-md border border-dashed border-amber-400 bg-amber-50 p-4"><p className="text-xs font-semibold text-amber-900">Mode uji lokal: tanpa Google</p><div className="flex flex-wrap gap-2"><a href="/api/v1/auth/uji/SUPERADMIN" className="inline-flex min-h-10 items-center rounded-md border border-amber-500 bg-white px-4 text-sm font-semibold text-amber-900 hover:bg-amber-100">Masuk sebagai Superadmin (uji)</a><a href="/api/v1/auth/uji/ADMIN" className="inline-flex min-h-10 items-center rounded-md border border-amber-500 bg-white px-4 text-sm font-semibold text-amber-900 hover:bg-amber-100">Masuk sebagai Admin (uji)</a></div></div>}</>}
      <p className="text-xs text-slate-500">Hanya alamat Google berakhiran <strong>@ith.ac.id</strong> yang dapat didaftarkan. Admin disetujui secara operasional dan tidak dapat dibuat atau dipromosikan melalui antarmuka.</p>
    </Card>
  </div></>;
}
