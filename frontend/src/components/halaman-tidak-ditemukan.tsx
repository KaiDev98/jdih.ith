import Link from 'next/link';
import { ArrowLeft, Search } from 'lucide-react';

/**
 * Isi halaman 404 portal. Teksnya netral: dokumen yang tidak ada dan dokumen
 * yang tidak boleh dibuka peminta tampil sama, sehingga keberadaan dokumen
 * tertutup tidak tersirat.
 */
export function HalamanTidakDitemukan({
  judul = 'Halaman tidak ditemukan',
  pesan = 'Alamat yang Anda buka tidak tersedia. Periksa kembali tautannya, atau cari produk hukum yang Anda butuhkan.',
}: {
  judul?: string;
  pesan?: string;
}) {
  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col items-start px-4 py-16 sm:px-6 sm:py-24">
      <p className="text-sm font-bold tracking-[0.16em] text-institusi-600 uppercase">Galat 404</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-tinta sm:text-4xl">{judul}</h1>
      <p className="mt-4 text-base leading-relaxed text-slate-600">{pesan}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/produk-hukum"
          className="inline-flex items-center gap-2 rounded-lg bg-institusi-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-institusi-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-institusi-500"
        >
          <Search aria-hidden className="size-4" />
          Cari Produk Hukum
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-tinta transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-institusi-500"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Kembali ke Beranda
        </Link>
      </div>
    </section>
  );
}
