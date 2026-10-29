'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserRoundPlus } from 'lucide-react';
import { AuthSurface } from '@/components/auth-surface';
import { FormDaftarEmail } from '@/components/form-daftar-email';
import { StateMessage } from '@/components/ui';
import { useSession } from '@/lib/sesi';

export default function DaftarPage() {
  const session = useSession();
  const router = useRouter();
  const [langkah, setLangkah] = useState(0);
  useEffect(() => {
    if (session.state === 'authenticated') router.replace('/akun');
  }, [session.state, router]);
  return (
    <AuthSurface audience="staff" mode="register" registrationStep={langkah}>
      <div className="auth-heading">
        <p className="auth-eyebrow">
          <UserRoundPlus aria-hidden className="size-3.5" /> Akun baru
        </p>
        <h1>Daftar akun Dosen/Staf</h1>
        <p className="auth-intro">
          Gunakan email ITH atau pribadi. Akun diperiksa oleh Superadmin.
        </p>
      </div>
      <div>
        {session.state === 'loading' || session.state === 'authenticated' ? (
          <StateMessage title="Memeriksa sesi…" />
        ) : session.state === 'error' ? (
          <StateMessage title="Sesi belum dapat diperiksa" kind="error">
            {session.galat}
            <button className="ml-2 underline" onClick={() => void session.muatUlang()}>
              Coba lagi
            </button>
          </StateMessage>
        ) : (
          <FormDaftarEmail onStepChange={setLangkah} />
        )}
      </div>
      <p className="auth-switch auth-secondary">
        Sudah punya akun?{' '}
        <Link href="/masuk" className="auth-link">
          Masuk
        </Link>
      </p>
    </AuthSurface>
  );
}
