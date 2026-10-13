import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ChevronRight, Download, Eye } from 'lucide-react';
import type { HasilCariAnonim, TahunTersedia } from '@jdih/shared';
import { ambilApiBerdaftar } from '@/lib/api-client';
import { ambilPublik } from '@/lib/api-peladen';
import { BilahCari } from '@/components/bilah-cari';
import { LatarFotoHero } from '@/components/latar-foto-hero';
import { TandaStatus } from '@/components/tanda-status';
import { PemicuMuncul } from '@/components/pemicu-muncul';
import { tampilanJenis } from '@/lib/tampilan-jenis';
import { AngkaNaik } from '@/components/angka-naik';
import { IkonSop } from '@/components/ikon-jenis';
import { PemilihUnitSop } from '@/components/pemilih-unit-sop';

export const metadata = {
  title: 'Beranda',
  description: 'Portal produk hukum Institut Teknologi Bacharuddin Jusuf Habibie, Parepare.',
};

type Jenis = { id: string; kode: string; nama: string };
type Terbaru = { jenis: Jenis; dokumen: HasilCariAnonim | null; jumlah: number | null };
type UnitSop = { id: string; kode: string; nama: string };
type UnitBerjumlah = UnitSop & { jumlah: number | null };

const tautanJenis = (kode: string) => `/produk-hukum?jenis=${encodeURIComponent(kode)}`;

export default async function Beranda() {
  // Pilihan pencarian. Bila salah satu gagal dimuat, pilihannya cukup kosong;
  // pencarian kata kunci tetap berfungsi.
  const [tipe, tahun, unitSop] = await Promise.all([
    ambilPublik<Jenis[]>('/public/master/jenis_dokumen').catch(() => []),
    ambilPublik<TahunTersedia>('/public/documents/years').catch(() => []),
    ambilPublik<UnitSop[]>('/public/master/kategori').catch(() => []),
  ]);
  // Untuk setiap jenis: dokumen terbarunya dan jumlah dokumennya. Endpoint
  // /public/documents hanya memuat dokumen publik yang sudah terbit, dan sengaja
  // dipanggil tanpa kuki sesi, sehingga jumlahnya tidak pernah ikut menghitung
  // dokumen Internal walaupun pengunjungnya staf yang sedang masuk.
  const terbaruPerJenis: Terbaru[] = await Promise.all(
    tipe.map(async (jenis) => {
      try {
        const hasil = await ambilApiBerdaftar<HasilCariAnonim>('/public/documents', {
          kueri: { jenisDokumenId: jenis.id, halaman: 1, perHalaman: 1 },
          next: { revalidate: 60 },
        });
        return { jenis, dokumen: hasil.data[0] ?? null, jumlah: hasil.meta.totalButir };
      } catch {
        return { jenis, dokumen: null, jumlah: null };
      }
    }),
  );
  // SOP berdiri sendiri, terpisah dari produk hukum: tidak masuk panel jumlah
  // di hero dan tampil sebagai panel tersendiri di bawah regulasi terbaru.
  const adalahSop = ({ jenis }: Terbaru) => tampilanJenis(jenis.kode, jenis.nama).macam === 'sop';
  const produk = terbaruPerJenis.filter((t) => !adalahSop(t));
  const sop = terbaruPerJenis.find(adalahSop);
  // Jumlah SOP publik terbit per unit kerja (kategori SOP), dihitung seperti
  // jumlah per jenis di atas: tanpa kuki, jadi tidak pernah menghitung Internal.
  const unitSopBerjumlah: UnitBerjumlah[] = sop
    ? await Promise.all(
        unitSop.map(async (u) => {
          try {
            const hasil = await ambilApiBerdaftar<HasilCariAnonim>('/public/documents', {
              kueri: { jenisDokumenId: sop.jenis.id, kategoriId: u.id, halaman: 1, perHalaman: 1 },
              next: { revalidate: 60 },
            });
            return { ...u, jumlah: hasil.meta.totalButir };
          } catch {
            return { ...u, jumlah: null };
          }
        }),
      )
    : [];

  return (
    <div className="beranda bg-rak text-tinta">
      <PemicuMuncul />
      <section aria-labelledby="judul-beranda" className="hero-beranda text-white">
        <LatarFotoHero beranda />
        <div className="mx-auto grid max-w-7xl gap-10 px-4 pt-12 pb-9 sm:px-6 md:pt-16 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:px-8 lg:pb-12">
          <div className="min-w-0 max-w-2xl">
            <h1
              id="judul-beranda"
              className="text-[2.25rem] leading-[1.06] font-extrabold tracking-[-0.025em] text-balance sm:text-5xl lg:text-[3.5rem]"
            >
              <span className="topeng-baris">
                <span className="isi-baris">Produk Hukum ITH,</span>
              </span>{' '}
              <span className="topeng-baris">
                <span className="isi-baris baris-2 text-institusi-300">
                  terbuka dan <span className="garis-sorot">tertata.</span>
                </span>
              </span>
            </h1>
            <p className="masuk tunda-3 mt-4 max-w-xl text-base leading-7 text-gigi-100 sm:text-lg sm:leading-8">
              Cari peraturan, keputusan, instruksi, surat edaran, dan SOP Institut Teknologi
              Bacharuddin Jusuf Habibie yang telah diterbitkan.
            </p>
            <div className="masuk tunda-4 mt-8">
              <BilahCari tipe={tipe} tahun={tahun} />
            </div>
          </div>
          <div
            aria-hidden
            className="relative mr-6 hidden size-64 place-items-center lg:grid xl:size-72"
          >
            <span className="masuk-pudar absolute inset-0 rounded-full bg-white/10 backdrop-blur-[2px]" />
            <svg
              viewBox="0 0 100 100"
              className="cincin-gores absolute inset-0 size-full -rotate-90"
            >
              <circle cx="50" cy="50" r="49.6" pathLength={1} />
            </svg>
            <div className="masuk-skala tunda-6 relative grid size-48 place-items-center rounded-full bg-white shadow-[0_24px_48px_-20px_rgb(8_20_40/0.6)] xl:size-56">
              <Image
                src="/logo-ith.webp"
                alt=""
                width={500}
                height={527}
                unoptimized
                className="h-32 w-auto xl:h-36"
              />
            </div>
          </div>
        </div>
        <div className="tumpuan-panel">
          <div className="masuk tunda-5 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <JumlahPerJenis terbaru={produk} />
          </div>
        </div>
      </section>

      <section
        aria-labelledby="judul-regulasi-terbaru"
        className="mx-auto max-w-7xl px-4 pt-12 pb-6 sm:px-6 lg:px-8 lg:pt-16"
      >
        <div
          data-muncul="judul"
          className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3"
        >
          <div>
            <h2
              id="judul-regulasi-terbaru"
              className="text-3xl leading-tight font-extrabold tracking-[-0.02em]"
            >
              <span className="topeng-baris">
                <span className="isi-gulir">Regulasi terbaru</span>
              </span>
            </h2>
            <p className="ikut-muncul mt-2 text-slate-700">
              Dokumen terakhir yang diterbitkan untuk setiap jenis produk hukum.
            </p>
          </div>
          <Link
            href="/produk-hukum"
            className="ikut-muncul group inline-flex items-center gap-2 font-semibold text-institusi-700 hover:text-institusi-800"
          >
            Semua produk hukum{' '}
            <ArrowRight aria-hidden className="gerak size-4 group-hover:translate-x-1" />
          </Link>
        </div>
        {terbaruPerJenis.length === 0 ? (
          <p className="mt-8 rounded-xl border border-tinta/10 bg-white p-6 text-slate-700">
            Daftar produk hukum belum dapat dimuat. Silakan coba lagi nanti.
          </p>
        ) : (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {produk.map((item) => (
              <PanelTerbaru key={item.jenis.kode} {...item} />
            ))}
          </ul>
        )}
        {sop && <PanelSop {...sop} unit={unitSopBerjumlah} />}
      </section>

      <section
        aria-labelledby="judul-format"
        className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8"
      >
        <div data-muncul="skala">
          <div className="panel-format grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-6 gap-y-6 rounded-xl border border-tinta/10 bg-white p-6 sm:gap-x-9 sm:p-8 md:grid-cols-[auto_minmax(0,1fr)_auto]">
            <TumpukanSurat />
            <div>
              <h2 id="judul-format" className="text-2xl font-extrabold tracking-[-0.015em]">
                <span className="topeng-baris">
                  <span className="isi-gulir">Format persuratan</span>
                </span>
              </h2>
              <p className="ikut-muncul mt-1.5 text-slate-700">
                Unduh format surat resmi ITH untuk keperluan administrasi.
              </p>
            </div>
            <div className="ikut-muncul col-span-2 md:col-span-1">
              <Link
                href="/format-persuratan"
                className="tekan group inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-tinta px-6 font-semibold text-white hover:bg-institusi-800 hover:shadow-[0_10px_24px_-12px_rgb(132_55_15/0.7)]"
              >
                Lihat format persuratan{' '}
                <ArrowRight aria-hidden className="gerak size-4 group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/** Ikon tumpukan lembar format surat; bergerak saat panelnya disorot. */
function TumpukanSurat() {
  return (
    <div aria-hidden className="tumpukan-surat ikut-muncul ml-1 shrink-0">
      <span className="lembar lembar-belakang" />
      <span className="lembar lembar-tengah" />
      <span className="lembar lembar-depan">
        <span className="kop" />
        <span className="baris" />
        <span className="baris" />
        <span className="baris" />
        <span className="baris" />
      </span>
      <span className="lencana-unduh">
        <Download className="size-3.5" strokeWidth={2.5} />
      </span>
    </div>
  );
}

const ANGKA = new Intl.NumberFormat('id-ID');

/** Jeda muncul butir panel jumlah, menyusul panelnya. */
const TUNDA_BUTIR = ['tunda-5', 'tunda-5', 'tunda-6', 'tunda-6', 'tunda-7', 'tunda-7'];

/**
 * Panel putih di garis batas hero: jumlah dokumen publik terbit untuk setiap
 * jenis produk hukum (tanpa SOP), masing-masing dengan ikonnya. Satu baris di
 * desktop; .tumpuan-panel menjaganya tepat separuh di atas foto hero.
 */
function JumlahPerJenis({ terbaru }: { terbaru: Terbaru[] }) {
  if (terbaru.length === 0) return null;
  return (
    <nav aria-label="Jumlah dokumen per jenis" className="panel p-2">
      <ul className="grid grid-cols-2 gap-1 md:grid-cols-3 xl:grid-cols-6">
        {terbaru.map(({ jenis, jumlah }, i) => {
          const { ikon: Ikon, kotak, macam } = tampilanJenis(jenis.kode, jenis.nama);
          return (
            <li
              key={jenis.kode}
              style={{ '--tunda-ikon': `${String(560 + i * 70)}ms` } as React.CSSProperties}
              className={`butir-jenis masuk-ringan min-w-0 ${TUNDA_BUTIR[i] ?? 'tunda-7'}`}
            >
              <Link
                href={tautanJenis(jenis.kode)}
                data-gerak={macam}
                className="tile-jenis group flex items-center gap-2.5 rounded-xl p-2.5 outline-none sm:gap-3 sm:p-3"
              >
                <span
                  aria-hidden
                  className={`ikon-jenis grid size-9 shrink-0 place-items-center rounded-lg sm:size-11 sm:rounded-xl ${kotak}`}
                >
                  <Ikon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xl leading-tight font-extrabold text-tinta tabular-nums">
                    {jumlah === null ? '—' : <AngkaNaik nilai={jumlah} tunda={650 + i * 60} />}
                  </span>
                  <span className="nama-jenis block text-[0.8125rem] leading-snug font-medium text-slate-600 sm:text-sm">
                    {jenis.nama}
                  </span>
                </span>
                <ArrowRight
                  aria-hidden
                  className="panah-jenis hidden size-4 shrink-0 text-institusi-600 md:block xl:hidden"
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * SOP di bawah kartu regulasi terbaru, dibedakan dari kartu produk hukum:
 * satu baris ringkas berlatar hangat. Unit kerja dipilih lewat dropdown yang
 * langsung membuka daftar SOP unit itu, sehingga dua belas unit tidak perlu
 * dibentangkan di beranda. Centang pada ikon tergores ulang saat disorot.
 */
function PanelSop({ jenis, dokumen, jumlah, unit }: Terbaru & { unit: UnitBerjumlah[] }) {
  const href = tautanJenis(jenis.kode);
  return (
    <section aria-labelledby="judul-sop" data-muncul className="mt-6">
      <div className="panel-sop relative flex flex-col gap-5 overflow-hidden rounded-2xl border border-[#d3e2f5] bg-[#eaf2fc] p-5 pl-6 shadow-[0_1px_2px_rgb(23_35_64/0.05)] sm:p-6 sm:pl-7 lg:flex-row lg:items-center lg:justify-between">
        <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-[#1d4f99]" />
        <div className="flex min-w-0 items-center gap-4">
          <span
            aria-hidden
            className="ikon-sop grid size-12 shrink-0 place-items-center rounded-xl bg-white text-[#1d4f99] shadow-[0_4px_12px_-6px_rgb(29_79_153/0.45)] ring-1 ring-[#d3e2f5]"
          >
            <IkonSop className="size-5" />
          </span>
          <div className="min-w-0">
            <h3 id="judul-sop" className="text-lg leading-tight font-extrabold tracking-[-0.01em]">
              Standar Operasional Prosedur
            </h3>
            <p className="mt-1 text-sm text-slate-600 tabular-nums">
              {jumlah === null ? 'SOP' : `${ANGKA.format(jumlah)} SOP terbit`} ·{' '}
              {ANGKA.format(unit.length)} unit kerja
              {dokumen && (
                <>
                  {' · '}Terbaru:{' '}
                  <Link
                    href={`/produk-hukum/${dokumen.slug}`}
                    className="font-semibold text-tinta underline decoration-[#9dbbe3] underline-offset-4 [overflow-wrap:anywhere] hover:text-institusi-700 hover:decoration-institusi-400"
                  >
                    {dokumen.judul}
                  </Link>
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:shrink-0">
          {unit.length > 0 && (
            <PemilihUnitSop
              unit={unit.map((u) => ({
                href: `${href}&kategori=${encodeURIComponent(u.kode)}`,
                nama: u.nama,
                jumlah: u.jumlah,
              }))}
            />
          )}
          <Link
            href={href}
            className="tekan group inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-tinta px-5 text-sm font-semibold text-white hover:bg-institusi-800"
          >
            Semua SOP
            <ArrowRight aria-hidden className="gerak size-4 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/** Satu panel regulasi terbaru untuk satu jenis produk hukum. */
function PanelTerbaru({ jenis, dokumen }: Terbaru) {
  return (
    <li data-muncul className="flex min-w-0">
      <div
        className={`isi-bertahap group flex w-full min-w-0 flex-col rounded-xl p-5 ${dokumen ? 'kartu-angkat border border-tinta/10 bg-white' : 'border border-dashed border-slate-300 bg-white/50'}`}
      >
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-600">
          <span aria-hidden className="titik-muncul shrink-0">
            <span
              className={`gerak size-2.5 rounded-full group-hover:scale-125 ${tampilanJenis(jenis.kode, jenis.nama).titik}`}
            />
          </span>
          {jenis.nama}
        </p>
        {dokumen ? (
          <>
            <h3 className="mt-3 text-lg leading-snug font-bold [overflow-wrap:anywhere]">
              <Link
                href={`/produk-hukum/${dokumen.slug}`}
                className="gerak hover:text-institusi-700"
              >
                {dokumen.judul}
              </Link>
            </h3>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600 tabular-nums">
              <span>
                No. {dokumen.nomor}
                {dokumen.tahun ? ` · ${dokumen.tahun}` : ''}
              </span>
              <span
                className="inline-flex items-center gap-1 text-slate-500"
                title={`${ANGKA.format(dokumen.dilihat)} orang telah melihat`}
              >
                <Eye aria-hidden className="size-3.5" />
                {ANGKA.format(dokumen.dilihat)}
                <span className="sr-only"> orang telah melihat</span>
              </span>
            </p>
          </>
        ) : (
          <p className="mt-3 text-sm text-slate-500">Belum ada dokumen terbit.</p>
        )}
        <div className="mt-auto pt-5">
          <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-4 text-sm">
            {dokumen ? <TandaStatus status={dokumen.statusHukum} /> : <span />}
            <Link
              href={tautanJenis(jenis.kode)}
              aria-label={`Lihat semua ${jenis.nama}`}
              className="group/tautan inline-flex items-center gap-1 font-semibold text-institusi-700 hover:text-institusi-800"
            >
              Lihat semua{' '}
              <ArrowRight aria-hidden className="gerak size-3.5 group-hover/tautan:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>
    </li>
  );
}
