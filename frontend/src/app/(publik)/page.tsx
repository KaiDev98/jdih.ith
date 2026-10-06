import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ClipboardList, FileText, ListChecks, Mail, Scale, Stamp } from 'lucide-react';
import type { HasilCariAnonim, TahunTersedia } from '@jdih/shared';
import { ambilApiBerdaftar } from '@/lib/api-client';
import { ambilPublik } from '@/lib/api-peladen';
import { BilahCari } from '@/components/bilah-cari';
import { TandaStatus } from '@/components/tanda-status';

export const metadata = {
  title: 'Beranda',
  description: 'Portal produk hukum Institut Teknologi Bacharuddin Jusuf Habibie, Parepare.',
};

type Jenis = { id: string; kode: string; nama: string };
type Terbaru = { jenis: Jenis; dokumen: HasilCariAnonim | null; jumlah: number | null };

const tautanJenis = (kode: string) => `/produk-hukum?jenis=${encodeURIComponent(kode)}`;

/** Penanda warna per jenis, diambil dari warna logo ITH. */
const WARNA_JENIS: Record<string, string> = {
  PERREK: 'bg-[#1d4f99]',
  SKREK: 'bg-[#2e7d3a]',
  INSREK: 'bg-[#e8792a]',
  SEREK: 'bg-[#f2c230]',
  SOP: 'bg-[#5b6472]',
};

export default async function Beranda() {
  // Pilihan pencarian. Bila salah satu gagal dimuat, pilihannya cukup kosong;
  // pencarian kata kunci tetap berfungsi.
  const [tipe, tahun] = await Promise.all([
    ambilPublik<Jenis[]>('/public/master/jenis_dokumen').catch(() => []),
    ambilPublik<TahunTersedia>('/public/documents/years').catch(() => []),
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

  return (
    <div className="beranda bg-rak text-tinta">
      <section aria-labelledby="judul-beranda" className="hero-beranda text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 pt-12 pb-24 sm:px-6 md:pt-16 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:px-8 lg:pb-28">
          <div className="min-w-0 max-w-2xl">
            <h1
              id="judul-beranda"
              className="text-[2.25rem] leading-[1.06] font-extrabold tracking-[-0.025em] text-balance sm:text-5xl lg:text-[3.5rem]"
            >
              Produk hukum ITH, <span className="text-institusi-100">terbuka dan tertata.</span>
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-institusi-50 sm:text-lg sm:leading-8">
              Cari peraturan, keputusan, instruksi, surat edaran, dan SOP Institut Teknologi
              Bacharuddin Jusuf Habibie yang telah diterbitkan.
            </p>
            <div className="mt-8">
              <BilahCari tipe={tipe} tahun={tahun} />
            </div>
          </div>
          <div
            aria-hidden
            className="mr-6 hidden size-64 place-items-center rounded-full bg-white/10 ring-1 ring-white/20 lg:grid xl:size-72"
          >
            <div className="grid size-48 place-items-center rounded-full bg-white shadow-[0_24px_48px_-20px_rgb(61_23_6/0.6)] xl:size-56">
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
      </section>

      <div className="relative z-10 mx-auto -mt-14 max-w-7xl px-4 sm:px-6 lg:px-8">
        <JumlahPerJenis terbaru={terbaruPerJenis} />
      </div>

      <section
        aria-labelledby="judul-regulasi-terbaru"
        className="mx-auto max-w-7xl px-4 pt-12 pb-14 sm:px-6 lg:px-8 lg:pt-16"
      >
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
          <div>
            <h2
              id="judul-regulasi-terbaru"
              className="text-3xl leading-tight font-extrabold tracking-[-0.02em]"
            >
              Regulasi terbaru
            </h2>
            <p className="mt-2 text-slate-700">
              Dokumen terakhir yang diterbitkan untuk setiap jenis produk hukum.
            </p>
          </div>
          <Link
            href="/produk-hukum"
            className="inline-flex items-center gap-2 font-semibold text-institusi-700 hover:underline"
          >
            Semua produk hukum <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
        {terbaruPerJenis.length === 0 ? (
          <p className="mt-8 rounded-xl border border-tinta/10 bg-white p-6 text-slate-700">
            Daftar produk hukum belum dapat dimuat. Silakan coba lagi nanti.
          </p>
        ) : (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {terbaruPerJenis.map((item) => (
              <PanelTerbaru key={item.jenis.kode} {...item} />
            ))}
          </ul>
        )}
      </section>

      <section
        aria-labelledby="judul-format"
        className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8"
      >
        <div className="grid gap-6 rounded-xl border border-tinta/10 bg-white p-6 sm:p-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div>
            <h2 id="judul-format" className="text-2xl font-extrabold tracking-[-0.015em]">
              Format persuratan
            </h2>
            <p className="mt-1.5 text-slate-700">
              Unduh format surat resmi ITH untuk keperluan administrasi.
            </p>
          </div>
          <Link
            href="/format-persuratan"
            className="tekan inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-tinta px-6 font-semibold text-white hover:bg-institusi-800"
          >
            Lihat format persuratan <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}

/** Ikon dan warnanya untuk setiap jenis produk hukum (warna logo ITH). */
const IKON_JENIS: Record<string, { ikon: typeof Scale; kelas: string }> = {
  PERREK: { ikon: Scale, kelas: 'bg-[#e8f0fb] text-[#1d4f99]' },
  SKREK: { ikon: Stamp, kelas: 'bg-[#e7f4ea] text-[#2e7d3a]' },
  INSREK: { ikon: ClipboardList, kelas: 'bg-institusi-50 text-institusi-700' },
  SEREK: { ikon: Mail, kelas: 'bg-[#fdf6dc] text-[#a07a05]' },
  SOP: { ikon: ListChecks, kelas: 'bg-slate-100 text-slate-700' },
};

/**
 * Panel putih yang menumpang di tepi bawah hero: jumlah dokumen publik terbit
 * untuk setiap jenis produk hukum, masing-masing dengan ikonnya. Tiap butir
 * menaut ke daftar jenis tersebut.
 */
function JumlahPerJenis({ terbaru }: { terbaru: Terbaru[] }) {
  if (terbaru.length === 0) return null;
  const angka = new Intl.NumberFormat('id-ID');
  return (
    <nav aria-label="Jumlah dokumen per jenis" className="panel p-2">
      <ul className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-5">
        {terbaru.map(({ jenis, jumlah }) => {
          const { ikon: Ikon, kelas } = IKON_JENIS[jenis.kode] ?? {
            ikon: FileText,
            kelas: 'bg-slate-100 text-slate-700',
          };
          return (
            <li key={jenis.kode} className="min-w-0">
              <Link
                href={tautanJenis(jenis.kode)}
                className="group flex items-center gap-2.5 rounded-xl p-2.5 transition-colors duration-150 hover:bg-slate-50 sm:gap-3 sm:p-3"
              >
                <span
                  aria-hidden
                  className={`grid size-9 shrink-0 place-items-center rounded-lg sm:size-11 sm:rounded-xl ${kelas}`}
                >
                  <Ikon className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xl leading-tight font-extrabold text-tinta tabular-nums">
                    {jumlah === null ? '—' : angka.format(jumlah)}
                  </span>
                  <span className="block text-[0.8125rem] leading-snug font-medium text-slate-600 group-hover:text-institusi-700 sm:text-sm">
                    {jenis.nama}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Satu panel regulasi terbaru untuk satu jenis produk hukum. */
function PanelTerbaru({ jenis, dokumen }: Terbaru) {
  return (
    <li className="flex min-w-0 flex-col rounded-xl border border-tinta/10 bg-white p-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-slate-600">
        <span
          aria-hidden
          className={`size-2.5 shrink-0 rounded-full ${WARNA_JENIS[jenis.kode] ?? 'bg-slate-400'}`}
        />
        {jenis.nama}
      </p>
      {dokumen ? (
        <>
          <h3 className="mt-3 text-lg leading-snug font-bold [overflow-wrap:anywhere]">
            <Link
              href={`/produk-hukum/${dokumen.slug}`}
              className="hover:text-institusi-700 hover:underline"
            >
              {dokumen.judul}
            </Link>
          </h3>
          <p className="mt-2 text-sm text-slate-600 tabular-nums">
            No. {dokumen.nomor}
            {dokumen.tahun ? ` · ${dokumen.tahun}` : ''}
          </p>
        </>
      ) : (
        <p className="mt-3 text-slate-600">Belum ada dokumen terbit.</p>
      )}
      <div className="mt-auto pt-5">
        <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-4 text-sm">
          {dokumen ? <TandaStatus status={dokumen.statusHukum} /> : <span />}
          <Link
            href={tautanJenis(jenis.kode)}
            aria-label={`Lihat semua ${jenis.nama}`}
            className="inline-flex items-center gap-1 font-semibold text-institusi-700 hover:underline"
          >
            Lihat semua <ArrowRight aria-hidden className="size-3.5" />
          </Link>
        </div>
      </div>
    </li>
  );
}
