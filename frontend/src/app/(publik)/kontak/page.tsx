import type { Metadata } from 'next';
import { Globe, Mail, MapPin, Phone } from 'lucide-react';
import type { KontakKantor } from '@jdih/shared';
import { Card } from '@/components/ui';
import { HeroHalaman } from '@/components/hero-halaman';
import { ambilPublik } from '@/lib/api-peladen';
import { KONTAK_INSTITUSI, tautanTelepon } from '@/lib/kontak-institusi';

export const metadata: Metadata = {
  title: 'Kontak',
  description: 'Kontak Institut Teknologi Bacharuddin Jusuf Habibie, Parepare.',
};

const kelasTautan = 'font-medium text-institusi-900 hover:underline [overflow-wrap:anywhere]';

export default async function Kontak() {
  const k = KONTAK_INSTITUSI;
  // Telepon dan surel dikelola Admin; bila gagal dimuat, barisnya cukup tidak tampil.
  const kontak = await ambilPublik<KontakKantor>('/public/contact', { cache: 'no-store' }).catch(
    () => null,
  );
  const butirKontak = [
    {
      kunci: 'kantor',
      ikon: MapPin,
      label: 'Kantor',
      isi: (
        <a
          href={k.kantor.urlPeta}
          target="_blank"
          rel="noreferrer noopener"
          className={kelasTautan}
        >
          {k.kantor.ruang}, {k.kantor.lokasi}
        </a>
      ),
    },
    ...(kontak?.butir ?? []).map((butir) => ({
      kunci: `kontak-${butir.id}`,
      ikon: butir.jenis === 'TELEPON' ? Phone : Mail,
      label: butir.label ?? (butir.jenis === 'TELEPON' ? 'Telepon' : 'Email'),
      isi: (
        <a
          href={butir.jenis === 'TELEPON' ? tautanTelepon(butir.nilai) : `mailto:${butir.nilai}`}
          className={`${kelasTautan} ${butir.jenis === 'TELEPON' ? 'tabular-nums' : ''}`}
        >
          {butir.nilai}
        </a>
      ),
    })),
    {
      kunci: 'situs',
      ikon: Globe,
      label: 'Situs resmi',
      isi: (
        <a href={k.situs} target="_blank" rel="noreferrer noopener" className={kelasTautan}>
          {k.situs.replace(/^https?:\/\//, '')}
        </a>
      ),
    },
  ];

  return (
    <>
      <HeroHalaman
        label="Tentang"
        judul="Kontak"
        deskripsi="Untuk pertanyaan seputar produk hukum dan layanan JDIH ITH, hubungi kami melalui:"
      />
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <Card>
          <dl className="grid gap-6 sm:grid-cols-2">
            {butirKontak.map(({ kunci, ikon: Ikon, label, isi }) => (
              <div key={kunci} className="flex min-w-0 gap-4">
                <span
                  aria-hidden
                  className="grid size-10 shrink-0 place-items-center rounded-lg bg-institusi-50 text-institusi-900"
                >
                  <Ikon className="size-5" />
                </span>
                <div className="min-w-0">
                  <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                    {label}
                  </dt>
                  <dd className="mt-1">{isi}</dd>
                </div>
              </div>
            ))}
          </dl>
          <div className="mt-6 border-t border-slate-200 pt-5">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Media sosial
            </p>
            <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
              {k.mediaSosial.map((media) => (
                <li key={media.url}>
                  <a
                    href={media.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className={kelasTautan}
                  >
                    {media.nama} <span className="text-slate-500">{media.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>
    </>
  );
}
