import Link from 'next/link';
import Image from 'next/image';
import { ArrowUp, ArrowUpRight, Globe, Mail, MapPin, Phone } from 'lucide-react';
import type { KontakKantor, RingkasanKunjungan } from '@jdih/shared';
import { IkonMediaSosial } from '@/components/ikon-media-sosial';
import { KunjunganFooter } from '@/components/kunjungan-footer';
import { BukaFooter } from '@/components/buka-footer';
import { KONTAK_INSTITUSI, tautanTelepon } from '@/lib/kontak-institusi';

const NAMA_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const jamTampil = (jam: string) => jam.replace(':', '.');
const keMenit = (jam: string) => {
  const [j = 0, m = 0] = jam.split(':').map(Number);
  return j * 60 + m;
};

/** Hari (0 = Minggu) dan menit sejak tengah malam menurut waktu Parepare (WITA). */
function sekarangWita(waktu: Date) {
  const bagian = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Makassar',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(waktu);
  const ambil = (jenis: string) => bagian.find((b) => b.type === jenis)?.value ?? '';
  const hari = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(ambil('weekday'));
  return { hari, menit: Number(ambil('hour')) * 60 + Number(ambil('minute')) };
}

const jadwalHari = (hari: number) =>
  KONTAK_INSTITUSI.jamOperasional.find((baris) =>
    (baris.nomorHari as readonly number[]).includes(hari),
  );

/** Status layanan saat ini, mis. "Sedang buka, tutup pukul 16.00 WITA." */
export function statusLayanan(waktu: Date) {
  const { hari, menit } = sekarangWita(waktu);
  const hariIni = jadwalHari(hari);
  if (hariIni?.buka && hariIni.tutup) {
    if (menit >= keMenit(hariIni.buka) && menit < keMenit(hariIni.tutup))
      return { buka: true, teks: `Sedang buka, tutup pukul ${jamTampil(hariIni.tutup)} WITA.` };
    if (menit < keMenit(hariIni.buka))
      return {
        buka: false,
        teks: `Sedang tutup, buka hari ini pukul ${jamTampil(hariIni.buka)} WITA.`,
      };
  }
  for (let selisih = 1; selisih <= 7; selisih++) {
    const hariBerikut = (hari + selisih) % 7;
    const jadwal = jadwalHari(hariBerikut);
    if (jadwal?.buka) {
      const kapan = selisih === 1 ? 'besok' : NAMA_HARI[hariBerikut];
      return {
        buka: false,
        teks: `Sedang tutup, buka ${kapan} pukul ${jamTampil(jadwal.buka)} WITA.`,
      };
    }
  }
  return { buka: false, teks: 'Sedang tutup.' };
}

/** Keterangan status tanpa awalan "Sedang buka/tutup", mis. "Tutup pukul 16.00 WITA." */
const keteranganStatus = (teks: string) => {
  const sisa = teks.replace(/^Sedang (buka|tutup),?\s*/, '');
  return sisa ? sisa.charAt(0).toUpperCase() + sisa.slice(1) : '';
};

const kelasJudul = 'text-sm font-semibold text-white';
/** Ikon garis tipis yang menyatu dengan teks, bukan ikon dalam kotak. */
const kelasIkon = 'size-4 shrink-0 text-institusi-400';
const kelasTautan =
  'text-gigi-100 underline-offset-4 transition-colors duration-150 hover:text-white hover:underline';
/** Tombol bulat bergaris tipis di atas latar biru tua. */
const kelasPil =
  'bg-white/6 text-gigi-100 ring-1 ring-white/15 ring-inset transition-[background-color,color,transform] duration-200 hover:bg-white/15 hover:text-white';

/**
 * Footer publik dengan identitas portal, kantor, dan ringkasan kunjungan.
 * Bagian utama sejajar pada layar lebar, lalu hak cipta berada di bawahnya.
 * Hanya halaman publik yang ditautkan; tidak ada yang menyiratkan konten
 * khusus Dosen/Staf.
 */
export function FooterPublik({
  kontak,
  kunjungan,
}: {
  kontak: KontakKantor | null;
  kunjungan: RingkasanKunjungan | null;
}) {
  const { kantor, nama, situs, mediaSosial } = KONTAK_INSTITUSI;
  const sekarang = new Date();
  const status = statusLayanan(sekarang);
  const hariIni = sekarangWita(sekarang).hari;
  return (
    <footer className="footer-institusi text-[0.9375rem] text-gigi-100">
      <div aria-hidden className="garis-logo h-[3px]" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-start gap-y-6 py-6 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-5 lg:grid-cols-[1.2fr_1.05fr_0.95fr_0.95fr] lg:gap-x-6 lg:py-8">
          <section aria-labelledby="judul-portal">
            <Link
              href="/"
              className="inline-flex items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-institusi-400"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-white shadow-sm shadow-black/20">
                <Image
                  src="/logo-ith.webp"
                  alt=""
                  width={500}
                  height={527}
                  unoptimized
                  className="h-9 w-auto"
                />
              </span>
              <span className="leading-tight">
                <span
                  id="judul-portal"
                  className="block text-lg font-extrabold tracking-[-0.01em] text-white"
                >
                  JDIH <span className="text-institusi-400">ITH</span>
                </span>
                <span className="mt-0.5 block text-xs font-medium text-gigi-200">
                  Jaringan Dokumentasi dan Informasi Hukum
                </span>
              </span>
            </Link>
            <p className="mt-3 max-w-sm leading-relaxed text-gigi-200">
              Portal resmi produk hukum {nama} dan status keberlakuannya.
            </p>
            <ul aria-label="Kanal resmi ITH" className="mt-4 flex flex-wrap items-center gap-2">
              {mediaSosial.map((m) => (
                <li key={m.url}>
                  <a
                    href={m.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={`${m.nama} ITH ${m.label}`}
                    title={`${m.nama} ${m.label}`}
                    className={`grid size-9 place-items-center rounded-full hover:-translate-y-0.5 ${kelasPil}`}
                  >
                    <IkonMediaSosial nama={m.nama} className="size-[1.125rem]" />
                  </a>
                </li>
              ))}
              <li>
                <a
                  href={situs}
                  target="_blank"
                  rel="noreferrer noopener"
                  className={`inline-flex h-9 items-center gap-2 rounded-full px-3 text-sm font-medium ${kelasPil}`}
                >
                  <Globe aria-hidden strokeWidth={1.75} className="size-4" />
                  {situs.replace(/^https?:\/\//, '')}
                  <ArrowUpRight aria-hidden className="size-3.5" />
                </a>
              </li>
            </ul>
          </section>

          <section
            aria-labelledby="judul-kantor"
            className="sm:border-l sm:border-white/10 sm:pl-6 lg:pl-6"
          >
            <h2 id="judul-kantor" className={kelasJudul}>
              Kantor
            </h2>
            <address className="mt-3 grid gap-2 leading-6 not-italic">
              <span className="flex gap-2.5">
                <MapPin aria-hidden strokeWidth={1.75} className={`${kelasIkon} mt-1`} />
                <span>
                  <span className="font-semibold text-white">{kantor.ruang}</span>
                  <br />
                  {kantor.lokasi} ·{' '}
                  <a
                    href={kantor.urlPeta}
                    target="_blank"
                    rel="noreferrer noopener"
                    className={`${kelasTautan} inline-flex items-center gap-0.5`}
                  >
                    Lihat di peta <ArrowUpRight aria-hidden className="size-3.5" />
                  </a>
                </span>
              </span>
              {(kontak?.butir ?? []).map((butir) => (
                <span key={butir.id} className="flex gap-2.5 [overflow-wrap:anywhere]">
                  {butir.jenis === 'TELEPON' ? (
                    <Phone aria-hidden strokeWidth={1.75} className={`${kelasIkon} mt-1`} />
                  ) : (
                    <Mail aria-hidden strokeWidth={1.75} className={`${kelasIkon} mt-1`} />
                  )}
                  <span className="min-w-0">
                    {butir.label && <span className="text-gigi-300">{butir.label}: </span>}
                    <a
                      href={
                        butir.jenis === 'TELEPON'
                          ? tautanTelepon(butir.nilai)
                          : `mailto:${butir.nilai}`
                      }
                      className={`${kelasTautan} ${butir.jenis === 'TELEPON' ? 'tabular-nums' : ''}`}
                    >
                      {butir.nilai}
                    </a>
                  </span>
                </span>
              ))}
            </address>
          </section>

          <section
            aria-labelledby="judul-jam-layanan"
            className="sm:border-t sm:border-white/10 sm:pt-5 lg:border-l lg:border-t-0 lg:pt-0 lg:pl-6"
          >
            <h2 id="judul-jam-layanan" className={kelasJudul}>
              Jam layanan
            </h2>
            <div className="mt-3 rounded-xl bg-white/5 p-3 ring-1 ring-white/10 ring-inset">
              <p className="flex items-center gap-2 text-sm font-semibold text-white">
                <span aria-hidden className="relative flex size-2">
                  {status.buka && (
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-daun-400 opacity-60 motion-reduce:hidden" />
                  )}
                  <span
                    className={`relative inline-flex size-2 rounded-full ${status.buka ? 'bg-daun-400' : 'bg-amber-400'}`}
                  />
                </span>
                {status.buka ? 'Sedang buka' : 'Sedang tutup'}
                <span className="sr-only">. {keteranganStatus(status.teks)}</span>
              </p>
              <p aria-hidden className="mt-0.5 text-xs text-gigi-200">
                {keteranganStatus(status.teks)}
              </p>
              <BukaFooter label="Jam operasional" className="mt-2 border-t border-white/10">
                <dl className="grid gap-1 pb-1 text-sm">
                  {KONTAK_INSTITUSI.jamOperasional.map((baris) => {
                    const aktif = (baris.nomorHari as readonly number[]).includes(hariIni);
                    return (
                      <div key={baris.hari} className="flex justify-between gap-4">
                        <dt className={aktif ? 'font-semibold text-white' : ''}>{baris.hari}</dt>
                        <dd className={`tabular-nums ${aktif ? 'font-semibold text-white' : ''}`}>
                          {baris.jam}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </BukaFooter>
            </div>
          </section>

          <section
            aria-label="Statistik kunjungan"
            className="sm:border-l sm:border-t sm:border-white/10 sm:pt-5 sm:pl-6 lg:border-t-0 lg:pt-0 lg:pl-6"
          >
            <div className="rounded-2xl bg-white/[0.045] p-4 ring-1 ring-white/10 ring-inset sm:p-5">
              <KunjunganFooter awal={kunjungan} />
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-2 border-t border-white/10 py-3 text-sm text-gigi-200 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {sekarang.getFullYear()} {nama}. Hak cipta dilindungi.
          </p>
          <a
            href="#isi-utama"
            className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3.5 py-1.5 font-medium ${kelasPil}`}
          >
            Kembali ke atas <ArrowUp aria-hidden className="size-3.5" />
          </a>
        </div>
      </div>
    </footer>
  );
}
