import type { Metadata } from 'next';
import { Globe, Mail, MapPin, Phone } from 'lucide-react';
import type { KontakKantor } from '@jdih/shared';
import { Card, PageTitle } from '@/components/ui';
import { ambilPublik } from '@/lib/api-peladen';
import { KONTAK_INSTITUSI, tautanTelepon } from '@/lib/kontak-institusi';

export const metadata: Metadata = {
  title: 'Kontak',
  description: 'Kontak Institut Teknologi Bacharuddin Jusuf Habibie, Parepare.',
};

const kelasTautan = 'font-medium text-blue-900 hover:underline [overflow-wrap:anywhere]';

export default async function Kontak() {
  const k = KONTAK_INSTITUSI;
  // Nomor telepon diatur Admin; bila gagal dimuat, barisnya cukup tidak tampil.
  const kontak = await ambilPublik<KontakKantor>('/public/contact', { cache: 'no-store' }).catch(
    () => null,
  );
  const butirKontak = [
    {
      ikon: MapPin,
      label: 'Kantor',
      isi: (
        <a href={k.kantor.urlPeta} target="_blank" rel="noreferrer noopener" className={kelasTautan}>
          {k.kantor.ruang}, {k.kantor.lokasi}
        </a>
      ),
    },
    ...(kontak
      ? [
          {
            ikon: Phone,
            label: 'Telepon',
            isi: (
              <a href={tautanTelepon(kontak.telepon)} className={kelasTautan}>
                {kontak.telepon}
              </a>
            ),
          },
        ]
      : []),
    {
      ikon: Mail,
      label: 'Surel',
      isi: (
        <a href={`mailto:${k.surel}`} className={kelasTautan}>
          {k.surel}
        </a>
      ),
    },
    {
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
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <PageTitle
        title="Kontak"
        description="Untuk pertanyaan seputar produk hukum dan layanan JDIH ITH, hubungi kami melalui:"
      />
      <Card>
        <dl className="grid gap-6 sm:grid-cols-2">
          {butirKontak.map(({ ikon: Ikon, label, isi }) => (
            <div key={label} className="flex min-w-0 gap-4">
              <span
                aria-hidden
                className="grid size-10 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-900"
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
  );
}
