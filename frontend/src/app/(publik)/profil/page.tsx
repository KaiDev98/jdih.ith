import type { Metadata } from 'next';
import { Card, PageTitle } from '@/components/ui';
import { KONTAK_INSTITUSI } from '@/lib/kontak-institusi';

export const metadata: Metadata = {
  title: 'Profil',
  description: 'Profil Institut Teknologi Bacharuddin Jusuf Habibie, Parepare.',
};

export default function Profil() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <PageTitle
        title="Profil"
        description={`${KONTAK_INSTITUSI.nama} · Parepare, Sulawesi Selatan`}
      />
      <Card>
        <p className="leading-8 text-slate-700">
          Portal JDIH ITH menyediakan akses terstruktur ke produk hukum Institut Teknologi
          Bacharuddin Jusuf Habibie: peraturan, keputusan, instruksi, surat edaran, dan SOP yang
          telah diterbitkan.
        </p>
        <p className="mt-5 text-sm text-slate-500">
          Konten profil lebih lengkap dapat ditambahkan setelah materi resmi institusi disiapkan.
        </p>
      </Card>
    </div>
  );
}
