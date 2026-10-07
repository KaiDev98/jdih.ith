import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Building2,
  Clock,
  Mail,
  MapPin,
  Phone,
} from 'lucide-react';
import type { KontakKantor, RingkasanKunjungan } from '@jdih/shared';
import { KunjunganFooter } from '@/components/kunjungan-footer';
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

const kelasJudul = 'flex items-center gap-2 text-sm font-semibold text-white';
/** Ikon garis tipis yang menyatu dengan teks, bukan ikon dalam kotak. */
const kelasIkon = 'size-4 shrink-0 text-institusi-400';
const kelasTautan =
  'text-gigi-100 underline-offset-4 transition-colors duration-150 hover:text-white hover:underline';

const TAUTAN_JELAJAH = [
  { label: 'Produk Hukum', href: '/produk-hukum' },
  { label: 'Format Persuratan', href: '/format-persuratan' },
  { label: 'Profil', href: '/profil' },
  { label: 'Kontak', href: '/kontak' },
];

/**
 * Footer portal publik, oranye bata sekeluarga dengan hero agar halaman diapit
 * satu warna. Tiga kolom: kantor dan kontak, jam layanan dengan status buka
 * saat ini (jam WITA), dan ringkasan kunjungan; lalu bilah bawah berisi tautan
 * jelajah dan hak cipta.
 */
export function FooterPublik({
  kontak,
  kunjungan,
}: {
  kontak: KontakKantor | null;
  kunjungan: RingkasanKunjungan | null;
}) {
  const { kantor, nama } = KONTAK_INSTITUSI;
  const sekarang = new Date();
  const status = statusLayanan(sekarang);
  const hariIni = sekarangWita(sekarang).hari;

  return (
    <footer className="footer-institusi mt-16 text-[0.9375rem] text-gigi-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-9 py-10 md:grid-cols-2 lg:grid-cols-[1.1fr_1fr_0.9fr] lg:gap-14">
          <section aria-labelledby="judul-kantor">
            <h2 id="judul-kantor" className={kelasJudul}>
              <Building2 aria-hidden strokeWidth={1.75} className={kelasIkon} />
              Kantor Kami
            </h2>
            <address className="mt-3 grid gap-1 leading-7 not-italic">
              <span className="flex gap-2.5">
                <MapPin aria-hidden strokeWidth={1.75} className={`${kelasIkon} mt-1.5`} />
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
                    <Phone aria-hidden strokeWidth={1.75} className={`${kelasIkon} mt-1.5`} />
                  ) : (
                    <Mail aria-hidden strokeWidth={1.75} className={`${kelasIkon} mt-1.5`} />
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
            <Link
              href="/kontak"
              className="tekan mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-institusi-600 px-5 text-sm font-semibold text-white hover:bg-institusi-500"
            >
              Hubungi kami <ArrowRight aria-hidden className="size-4" />
            </Link>
          </section>

          <section aria-labelledby="judul-jam">
            <h2 id="judul-jam" className={kelasJudul}>
              <Clock aria-hidden strokeWidth={1.75} className={kelasIkon} />
              Jam Operasional
            </h2>
            <dl className="mt-3 grid gap-0.5 leading-7">
              {KONTAK_INSTITUSI.jamOperasional.map((baris) => {
                const aktif = (baris.nomorHari as readonly number[]).includes(hariIni);
                return (
                  <div key={baris.hari} className="flex justify-between gap-6 sm:max-w-sm">
                    <dt className={aktif ? 'font-semibold text-white' : ''}>{baris.hari}</dt>
                    <dd className={`tabular-nums ${aktif ? 'font-semibold text-white' : ''}`}>
                      {baris.jam}
                    </dd>
                  </div>
                );
              })}
            </dl>
            <p className="mt-2 text-sm font-medium text-white">{status.teks}</p>
          </section>

          <KunjunganFooter awal={kunjungan} />
        </div>

        <div className="flex flex-col gap-4 border-t border-white/20 py-5 text-sm lg:flex-row lg:items-center lg:justify-between">
          <nav aria-label="Tautan footer">
            <ul className="flex flex-wrap gap-x-5 gap-y-1.5">
              {TAUTAN_JELAJAH.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={kelasTautan}>
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <a href="#isi-utama" className={`${kelasTautan} inline-flex items-center gap-1`}>
                  Kembali ke atas <ArrowUp aria-hidden className="size-3.5" />
                </a>
              </li>
            </ul>
          </nav>
          <p className="flex items-center gap-2.5 text-gigi-200">
            <span className="grid size-7 shrink-0 place-items-center rounded-md bg-white">
              <Image
                src="/logo-ith.webp"
                alt=""
                width={500}
                height={527}
                unoptimized
                className="h-5 w-auto"
              />
            </span>
            © {sekarang.getFullYear()} {nama}
          </p>
        </div>
      </div>
    </footer>
  );
}
