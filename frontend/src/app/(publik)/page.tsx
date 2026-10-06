import Link from 'next/link';
import { ArrowRight, Files, Search } from 'lucide-react';
import { ambilPublik } from '@/lib/api-peladen';
import type { HasilCariAnonim, TahunTersedia } from '@jdih/shared';
import { Card } from '@/components/ui';

export const metadata = { title: 'Beranda', description: 'Portal produk hukum Institut Teknologi Bacharuddin Jusuf Habibie, Parepare.' };

export default async function Beranda() {
  // Pilihan hero. Bila salah satu gagal dimuat, pilihannya cukup kosong — pencarian
  // kata kunci tetap berfungsi.
  const [tipe, tahun] = await Promise.all([
    ambilPublik<{ id: string; kode: string; nama: string }[]>('/public/master/jenis_dokumen').catch(() => []),
    ambilPublik<TahunTersedia>('/public/documents/years').catch(() => []),
  ]);
  // Satu dokumen terbaru untuk setiap jenis produk hukum. Endpoint /public/documents
  // hanya mengembalikan dokumen publik terbit, terurut dari yang paling baru
  // diterbitkan — jadi jenis yang isinya hanya dokumen Internal tampil kosong,
  // sama seperti jenis yang memang belum punya dokumen.
  const terbaruPerJenis = await Promise.all(
    tipe.map(async (jenis) => {
      try {
        const hasil = await ambilPublik<HasilCariAnonim[]>('/public/documents', {
          kueri: { jenisDokumenId: jenis.id, halaman: 1, perHalaman: 1 },
        });
        return { jenis, dokumen: hasil[0] ?? null };
      } catch {
        return { jenis, dokumen: null };
      }
    }),
  );
  const kelasPilihan = 'min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-950 focus-visible:outline-2 focus-visible:outline-institusi-800';
  return <div>
    <section className="relative overflow-hidden bg-gradient-to-br from-institusi-700 via-institusi-600 to-institusi-500 text-white">
      <div aria-hidden className="absolute -right-24 -top-40 size-[28rem] rounded-full border-[48px] border-white/5" />
      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
        <p className="font-semibold tracking-[0.16em] text-white uppercase">Jaringan Dokumentasi dan Informasi Hukum</p>
        <h1 className="mt-5 max-w-4xl text-4xl leading-tight font-bold tracking-tight sm:text-5xl lg:text-6xl">Produk hukum ITH, <span className="text-yellow-100">terbuka dan tertata.</span></h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-white">Institut Teknologi Bacharuddin Jusuf Habibie · Parepare, Sulawesi Selatan</p>
        <form action="/produk-hukum" className="mt-9 grid max-w-4xl gap-3 rounded-xl bg-white p-3 text-slate-950 shadow-xl">
          <label className="sr-only" htmlFor="q-home">Cari judul, nomor, tahun, jenis, kategori, atau tag</label>
          <div className="flex min-w-0 items-center gap-3 rounded-lg border border-slate-300 px-3 text-slate-500 focus-within:outline-2 focus-within:outline-institusi-800"><Search aria-hidden className="size-5 shrink-0" /><input id="q-home" name="q" type="search" placeholder="Cari produk hukum…" className="min-h-12 w-full border-0 bg-transparent text-base text-slate-950 outline-none placeholder:text-slate-500" /></div>
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div className="grid gap-1"><label htmlFor="tipe-home" className="text-xs font-semibold tracking-wide text-slate-600 uppercase">Tipe</label><select id="tipe-home" name="jenis" defaultValue="" className={kelasPilihan}><option value="">Semua tipe</option>{tipe.map((item) => <option key={item.kode} value={item.kode}>{item.nama}</option>)}</select></div>
            <div className="grid gap-1"><label htmlFor="tahun-home" className="text-xs font-semibold tracking-wide text-slate-600 uppercase">Tahun</label><select id="tahun-home" name="tahun" defaultValue="" className={kelasPilihan}><option value="">Semua tahun</option>{tahun.map((nilai) => <option key={nilai} value={nilai}>{nilai}</option>)}</select></div>
            <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-institusi-600 px-7 font-semibold text-white hover:bg-institusi-700" type="submit">Cari Produk Hukum<ArrowRight aria-hidden className="size-4" /></button>
          </div>
        </form>
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white"><span>Cari berdasarkan judul, nomor, tahun, jenis, kategori, atau tag.</span><Link className="font-semibold text-white underline decoration-orange-300 underline-offset-4" href="/format-persuratan">Lihat Format Persuratan</Link></div>
      </div>
    </section>
    <section aria-labelledby="judul-regulasi-terbaru" className="mx-auto max-w-7xl px-4 pt-14 sm:px-6 lg:px-8 lg:pt-20">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-bold tracking-wider text-institusi-800 uppercase">Regulasi Terbaru</p><h2 id="judul-regulasi-terbaru" className="mt-2 text-3xl font-bold text-slate-950">Terbaru dari setiap jenis produk hukum</h2></div><Link href="/produk-hukum" className="inline-flex items-center gap-2 font-semibold text-institusi-900 hover:underline">Semua produk hukum <ArrowRight aria-hidden className="size-4" /></Link></div>
      <ul className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{terbaruPerJenis.map(({ jenis, dokumen }) => <li key={jenis.kode} className="min-w-0"><Card className="flex h-full min-w-0 flex-col p-5"><p className="text-xs font-bold tracking-wide text-institusi-900 uppercase">{jenis.nama}</p>{dokumen ? <><h3 className="mt-3 min-w-0 text-lg leading-snug font-bold text-slate-950 [overflow-wrap:anywhere]"><Link href={`/produk-hukum/${dokumen.slug}`} className="hover:text-institusi-900 hover:underline">{dokumen.judul}</Link></h3><p className="mt-2 text-sm text-slate-600">{dokumen.nomor}{dokumen.tahun ? ` · ${dokumen.tahun}` : ''}</p><p className="mt-1 text-sm text-slate-500">Ditetapkan {new Date(`${dokumen.tanggalPenetapan}T00:00:00`).toLocaleDateString('id-ID', { dateStyle: 'long' })}</p></> : <p className="mt-3 text-sm text-slate-500">Belum ada dokumen terbit.</p>}<Link href={`/produk-hukum?jenis=${jenis.kode}`} className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-semibold text-institusi-900 hover:underline">Lihat semua {jenis.nama} <ArrowRight aria-hidden className="size-4" /></Link></Card></li>)}</ul>
    </section>
    <section className="border-y border-slate-200 bg-slate-50"><div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"><Link href="/format-persuratan" className="group block max-w-xl rounded-xl border border-slate-200 bg-white p-6 hover:border-institusi-300 hover:shadow-md"><span className="grid size-10 place-items-center rounded-lg bg-institusi-50 text-institusi-800"><Files aria-hidden /></span><h2 className="mt-4 text-lg font-bold text-slate-950">Format Persuratan</h2><p className="mt-2 text-sm leading-6 text-slate-600">Unduh format surat resmi yang tersedia untuk publik.</p><span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-institusi-900">Lihat format <ArrowRight aria-hidden className="size-4 transition group-hover:translate-x-1" /></span></Link></div></section>
  </div>;
}
