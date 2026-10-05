'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/sesi';
import { Card, PageTitle, StateMessage } from '@/components/ui';

export default function MasukPage() {
  const { state, pengguna, galat, muatUlang } = useSession();
  const router = useRouter();
  useEffect(() => { if (state === 'authenticated') router.replace('/akun'); }, [state, router]);
  return <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6"><PageTitle title="Masuk ke JDIH ITH" description="Gunakan akun Google institusi @ith.ac.id. Akun DOSEN/STAF memerlukan persetujuan administrator sebelum memperoleh akses Internal." />
    <Card className="grid gap-5"><p className="text-sm leading-6 text-slate-700">Login menggunakan Google institusi. Kami tidak menyediakan pendaftaran dengan kata sandi lokal.</p>
      {state === 'registration' ? <div><StateMessage title="Satu langkah lagi">Lengkapi unit kerja setelah verifikasi Google.</StateMessage><Link className="mt-4 inline-flex min-h-11 items-center rounded-md bg-blue-900 px-5 font-semibold text-white" href="/akun">Lengkapi pendaftaran</Link></div>
        : state === 'loading' ? <StateMessage title="Memeriksa sesi…" />
          : state === 'error' ? <StateMessage title="Sesi belum dapat diperiksa" kind="error">{galat}<button onClick={() => void muatUlang()} className="ml-2 underline">Coba lagi</button></StateMessage>
            : pengguna ? <Link href="/akun" className="font-semibold underline">Lanjutkan ke akun</Link>
              : <a href="/api/v1/auth/google" className="inline-flex min-h-12 items-center justify-center rounded-md bg-blue-900 px-5 font-semibold text-white hover:bg-blue-950">Masuk dengan Google</a>}
      <p className="text-xs text-slate-500">Hanya alamat Google berakhiran <strong>@ith.ac.id</strong> yang dapat didaftarkan. Admin disetujui secara operasional dan tidak dapat dibuat atau dipromosikan melalui antarmuka.</p>
    </Card>
  </div>;
}
