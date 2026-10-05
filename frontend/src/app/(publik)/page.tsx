import Link from 'next/link';
import { ArrowRight, FileSearch, Files, Search } from 'lucide-react';
import { ambilPublik } from '@/lib/api-peladen';
import type { HasilCariAnonim } from '@jdih/shared';
import { Card, StateMessage } from '@/components/ui';

export const metadata = { title: 'Beranda', description: 'Portal produk hukum Institut Teknologi Bacharuddin Jusuf Habibie, Parepare.' };

export default async function Beranda() {
  let newest: Extract<HasilCariAnonim, { badge: 'PUBLIK' }> | null = null;
  let error = false;
  try { newest = await ambilPublik<Extract<HasilCariAnonim, { badge: 'PUBLIK' }> | null>('/public/documents/latest', { cache: 'no-store' }); } catch { error = true; }
  return <div>
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 text-white">
      <div aria-hidden className="absolute -right-24 -top-40 size-[28rem] rounded-full border-[48px] border-white/5" />
      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
        <p className="font-semibold tracking-[0.16em] text-orange-300 uppercase">Jaringan Dokumentasi dan Informasi Hukum</p>
        <h1 className="mt-5 max-w-4xl text-4xl leading-tight font-bold tracking-tight sm:text-5xl lg:text-6xl">Produk hukum ITH, <span className="text-emerald-300">terbuka dan tertata.</span></h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-blue-100">Institut Teknologi Bacharuddin Jusuf Habibie · Parepare, Sulawesi Selatan</p>
        <form action="/produk-hukum" className="mt-9 flex max-w-3xl flex-col gap-2 rounded-xl bg-white p-2 shadow-xl sm:flex-row">
          <label className="sr-only" htmlFor="q-home">Cari judul, nomor, tahun, jenis, kategori, atau tag</label>
          <div className="flex min-w-0 flex-1 items-center gap-3 px-3 text-slate-500"><Search aria-hidden className="size-5 shrink-0" /><input id="q-home" name="q" type="search" placeholder="Cari produk hukum…" className="min-h-12 w-full border-0 bg-transparent text-base text-slate-950 outline-none placeholder:text-slate-500" /></div>
          <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-7 font-semibold text-white hover:bg-emerald-800" type="submit">Cari Produk Hukum<ArrowRight aria-hidden className="size-4" /></button>
        </form>
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-blue-100"><span>Cari berdasarkan judul, nomor, tahun, jenis, kategori, atau tag.</span><Link className="font-semibold text-white underline decoration-orange-300 underline-offset-4" href="/format-persuratan">Lihat Format Persuratan</Link></div>
      </div>
    </section>
    <section className="mx-auto grid min-w-0 max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_1.4fr] lg:px-8 lg:py-20">
      <div className="min-w-0"><p className="text-sm font-bold tracking-wider text-emerald-800 uppercase">Mulai menjelajah</p><h2 className="mt-2 text-3xl font-bold text-slate-950">Satu portal untuk produk hukum ITH.</h2><p className="mt-4 leading-7 text-slate-600">Temukan peraturan, keputusan, instruksi, surat edaran, dan SOP yang telah diterbitkan.</p><Link href="/produk-hukum" className="mt-6 inline-flex items-center gap-2 font-semibold text-blue-900 hover:underline">Jelajahi Produk Hukum <ArrowRight aria-hidden className="size-4" /></Link></div>
      <Card className="min-w-0 border-l-4 border-l-orange-500 p-6 sm:p-7"><div className="flex items-start gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-lg bg-orange-50 text-orange-700"><FileSearch aria-hidden /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-500">Produk Hukum Publik terbaru</p>{error ? <StateMessage title="Dokumen terbaru belum dapat dimuat">Silakan coba lagi nanti atau buka daftar Produk Hukum.</StateMessage> : newest ? <><h3 className="mt-2 min-w-0 text-xl font-bold text-slate-950 [overflow-wrap:anywhere]">{newest.judul}</h3><p className="mt-2 text-sm text-slate-600">{newest.tipe}{newest.nomor ? ` · ${newest.nomor}` : ''}{newest.tahun ? ` · ${newest.tahun}` : ''}</p><Link className="mt-4 inline-flex items-center gap-2 font-semibold text-blue-900 hover:underline" href={`/produk-hukum/${newest.slug}`}>Lihat detail <ArrowRight aria-hidden className="size-4" /></Link></> : <p className="mt-2 text-slate-600">Belum ada dokumen publik yang diterbitkan.</p>}</div></div></Card>
    </section>
    <section className="border-y border-slate-200 bg-slate-50"><div className="mx-auto grid max-w-7xl gap-5 px-4 py-10 sm:px-6 md:grid-cols-2 lg:px-8"><Link href="/produk-hukum" className="group rounded-xl border border-slate-200 bg-white p-6 hover:border-blue-300 hover:shadow-md"><span className="grid size-10 place-items-center rounded-lg bg-blue-50 text-blue-900"><FileSearch aria-hidden /></span><h2 className="mt-4 text-lg font-bold text-slate-950">Produk Hukum</h2><p className="mt-2 text-sm leading-6 text-slate-600">Cari dan telusuri dokumen yang berlaku di lingkungan ITH.</p><span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-900">Buka daftar <ArrowRight aria-hidden className="size-4 transition group-hover:translate-x-1" /></span></Link><Link href="/format-persuratan" className="group rounded-xl border border-slate-200 bg-white p-6 hover:border-emerald-300 hover:shadow-md"><span className="grid size-10 place-items-center rounded-lg bg-emerald-50 text-emerald-800"><Files aria-hidden /></span><h2 className="mt-4 text-lg font-bold text-slate-950">Format Persuratan</h2><p className="mt-2 text-sm leading-6 text-slate-600">Unduh format surat resmi yang tersedia untuk publik.</p><span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-900">Lihat format <ArrowRight aria-hidden className="size-4 transition group-hover:translate-x-1" /></span></Link></div></section>
  </div>;
}
