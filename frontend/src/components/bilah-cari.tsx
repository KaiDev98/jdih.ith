'use client';

import { useEffect, useRef, useState } from 'react';
import { CalendarDays, Files, Search, X } from 'lucide-react';
import { PilihanDropdown } from './pilihan-dropdown';

type Jenis = { kode: string; nama: string };

/**
 * Bilah pencarian beranda: kotak kata kunci berbentuk pil dengan tombol Cari
 * menempel, lalu pilihan Tipe dan Tahun sebagai pil di bawahnya. Tekan "/" di
 * mana saja untuk langsung mengetik. Formulir tetap biasa (GET ke
 * /produk-hukum); Tipe dan Tahun ikut terkirim lewat masukan tersembunyi.
 */
export function BilahCari({ tipe, tahun }: { tipe: readonly Jenis[]; tahun: readonly number[] }) {
  const [kataKunci, setKataKunci] = useState('');
  const [fokus, setFokus] = useState(false);
  const masukan = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const pintasan = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
      const sasaran = event.target as HTMLElement | null;
      if (sasaran?.closest('input, textarea, select, [contenteditable="true"]')) return;
      event.preventDefault();
      masukan.current?.focus();
    };
    document.addEventListener('keydown', pintasan);
    return () => document.removeEventListener('keydown', pintasan);
  }, []);

  return (
    <form action="/produk-hukum" role="search" className="min-w-0">
      <div className="flex items-center rounded-full bg-white p-1.5 text-tinta shadow-[0_24px_56px_-24px_rgb(61_23_6/0.55)] ring-white/35 transition-[box-shadow] duration-300 focus-within:ring-4 focus-within:shadow-[0_28px_64px_-24px_rgb(8_20_40/0.7)]">
        <Search aria-hidden className="ml-4 size-5 shrink-0 text-institusi-600 sm:ml-5" />
        <label htmlFor="q-beranda" className="sr-only">
          Kata kunci
        </label>
        <input
          ref={masukan}
          id="q-beranda"
          name="q"
          type="search"
          autoComplete="off"
          value={kataKunci}
          onChange={(e) => setKataKunci(e.target.value)}
          onFocus={() => setFokus(true)}
          onBlur={() => setFokus(false)}
          placeholder="Cari produk hukum…"
          className="min-h-12 w-full min-w-0 appearance-none border-0 bg-transparent px-3 text-base text-tinta outline-none placeholder:text-slate-500 sm:min-h-14 sm:text-lg [&::-webkit-search-cancel-button]:appearance-none"
        />
        {kataKunci ? (
          <button
            type="button"
            aria-label="Hapus kata kunci"
            onClick={() => {
              setKataKunci('');
              masukan.current?.focus();
            }}
            className="tekan mr-1 grid size-8 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-tinta"
          >
            <X aria-hidden className="size-4" />
          </button>
        ) : (
          !fokus && (
            <kbd
              aria-hidden
              className="mr-3 hidden h-6 shrink-0 items-center rounded-md border border-slate-300 px-2 font-sans text-xs font-semibold text-slate-500 md:inline-flex"
            >
              /
            </kbd>
          )
        )}
        <button
          type="submit"
          className="tekan inline-flex min-h-12 shrink-0 items-center justify-center rounded-full bg-institusi-600 px-6 text-base font-bold text-white hover:bg-institusi-700 hover:shadow-[0_8px_22px_-8px_rgb(194_81_14/0.75)] sm:min-h-14 sm:px-9 sm:text-lg"
        >
          Cari
        </button>
      </div>
      <div className="mt-4 grid gap-3 min-[400px]:grid-cols-2 sm:flex sm:flex-wrap sm:items-center">
        <PilihanDropdown
          id="tipe-beranda"
          name="jenis"
          label="Tipe"
          sembunyikanLabel
          varian="pil"
          ikon={Files}
          opsi={[
            { value: '', label: 'Semua tipe' },
            ...tipe.map((item) => ({ value: item.kode, label: item.nama })),
          ]}
        />
        <PilihanDropdown
          id="tahun-beranda"
          name="tahun"
          label="Tahun"
          sembunyikanLabel
          varian="pil"
          ikon={CalendarDays}
          opsi={[
            { value: '', label: 'Semua tahun' },
            ...tahun.map((nilai) => ({ value: String(nilai), label: String(nilai) })),
          ]}
        />
      </div>
    </form>
  );
}
