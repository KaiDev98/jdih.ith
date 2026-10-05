'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

const tautan = [
  { label: 'Beranda', href: '/' },
  { label: 'Profil', href: '/profil' },
  { label: 'Produk Hukum', href: '/produk-hukum' },
  { label: 'Format Persuratan', href: '/format-persuratan' },
];

export function NavigasiPublik() {
  const [buka, setBuka] = useState(false);
  return <>
    <nav aria-label="Navigasi utama" className="hidden items-center gap-1 md:flex">
      {tautan.map((item) => <Link key={item.href} href={item.href} className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-blue-900">{item.label}</Link>)}
      <Link href="/masuk" className="ml-2 inline-flex min-h-10 items-center rounded-md bg-blue-900 px-4 text-sm font-semibold text-white hover:bg-blue-950">Masuk</Link>
    </nav>
    <ButtonMobile buka={buka} setBuka={setBuka} />
  </>;
}

function ButtonMobile({ buka, setBuka }: { buka: boolean; setBuka: (next: boolean) => void }) {
  return <div className="md:hidden">
    <button type="button" aria-label={buka ? 'Tutup menu' : 'Buka menu'} aria-expanded={buka} aria-controls="menu-mobile" onClick={() => setBuka(!buka)} className="grid size-11 place-items-center rounded-md border border-slate-300 text-slate-800 focus-visible:outline-2 focus-visible:outline-blue-800">{buka ? <X aria-hidden /> : <Menu aria-hidden />}</button>
    {buka && <nav id="menu-mobile" aria-label="Navigasi utama seluler" className="absolute inset-x-0 top-full z-40 border-b border-slate-200 bg-white p-4 shadow-lg">
      <ul className="mx-auto grid max-w-7xl gap-1">{tautan.map((item) => <li key={item.href}><Link onClick={() => setBuka(false)} href={item.href} className="block rounded-md px-3 py-3 font-medium text-slate-800 hover:bg-slate-100">{item.label}</Link></li>)}<li><Link onClick={() => setBuka(false)} href="/masuk" className="mt-1 block rounded-md bg-blue-900 px-3 py-3 text-center font-semibold text-white">Masuk</Link></li></ul>
    </nav>}
  </div>;
}

export function PublicHeader() {
  return <header className="relative z-20 border-b border-slate-200 bg-white">
    <div className="mx-auto flex min-h-[76px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
      <Link href="/" aria-label="JDIH ITH, beranda" className="flex min-w-0 items-center gap-3">
        <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-lg bg-blue-900 text-base font-black tracking-tight text-white">ITH</span>
        <span className="min-w-0 leading-tight"><span className="block truncate text-base font-bold text-slate-950">JDIH ITH</span><span className="mt-1 hidden text-xs text-slate-600 sm:block">Institut Teknologi Bacharuddin Jusuf Habibie</span></span>
      </Link>
      <NavigasiPublik />
    </div>
  </header>;
}
