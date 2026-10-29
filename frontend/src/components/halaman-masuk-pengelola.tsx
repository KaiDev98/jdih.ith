'use client';

import { FileText, ShieldCheck } from 'lucide-react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/sesi';
import { akarPanel } from '@/lib/panel';
import { FormMasukPassword } from '@/components/form-masuk-password';
import { AuthSurface } from '@/components/auth-surface';

const LOGIN_UJI =
  process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_LOGIN_UJI === 'true';

/**
 * Halaman masuk pengelola (Admin atau Superadmin), terpisah dari halaman masuk
 * Dosen/Staf. Tiap halaman hanya menerima perannya sendiri; backend menolak
 * peran lain dengan pesan yang sama seperti password salah. Tidak ada
 * pendaftaran: akun pengelola disiapkan oleh pengelola sistem.
 */
export function HalamanMasukPengelola({ jalur }: { jalur: 'admin' | 'superadmin' }) {
  const { state, pengguna } = useSession();
  const router = useRouter();
  const superadmin = jalur === 'superadmin';
  const Ikon = superadmin ? ShieldCheck : FileText;
  useEffect(() => {
    if (
      state === 'authenticated' &&
      pengguna?.peran.some((p) => p === 'ADMIN' || p === 'SUPERADMIN') &&
      akarPanel(pengguna.peran) === `/${jalur}`
    )
      router.replace(akarPanel(pengguna.peran));
  }, [state, pengguna, router, jalur]);

  return (
    <AuthSurface audience={jalur}>
      <div className="auth-heading">
        <p className="auth-eyebrow">
          <Ikon aria-hidden className="size-3.5" />
          {superadmin ? 'Pengelolaan portal' : 'Administrasi dokumen'}
        </p>
        <h1>{superadmin ? 'Masuk Superadmin' : 'Masuk Admin'}</h1>
        <p className="auth-intro">
          {superadmin
            ? 'Tinjau pengajuan dan kelola penerbitan dokumen.'
            : 'Kelola dokumen dan pengajuan unit kerja Anda.'}
        </p>
      </div>
      <div>
        <FormMasukPassword jalur={jalur} />
        {LOGIN_UJI && (
          <a
            href={`/api/v1/auth/uji/${superadmin ? 'SUPERADMIN' : 'ADMIN'}`}
            className="auth-dev-link auth-secondary"
          >
            Mode uji lokal: masuk tanpa password
          </a>
        )}
      </div>
      <p className="auth-policy auth-secondary">
        {superadmin
          ? 'Butuh bantuan masuk? Hubungi pengelola sistem untuk pemulihan akses.'
          : 'Butuh akun atau lupa password? Hubungi Superadmin untuk bantuan akses.'}
      </p>
    </AuthSurface>
  );
}
