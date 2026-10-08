'use client';

import { useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronDown, Files, Search, X } from 'lucide-react';

type Jenis = { kode: string; nama: string };

/**
 * Bilah pencarian beranda: kotak kata kunci berbentuk pil dengan tombol Cari
 * menempel, lalu pilihan Tipe dan Tahun sebagai pil di bawahnya. Tekan "/" di
 * mana saja untuk langsung mengetik. Formulir tetap biasa (GET ke
 * /produk-hukum), jadi berfungsi juga tanpa JavaScript.
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
        <PilihanPil id="tipe-beranda" name="jenis" label="Tipe" kosong="Semua tipe" ikon={Files}>
          {tipe.map((item) => (
            <option key={item.kode} value={item.kode}>
              {item.nama}
            </option>
          ))}
        </PilihanPil>
        <PilihanPil
          id="tahun-beranda"
          name="tahun"
          label="Tahun"
          kosong="Semua tahun"
          ikon={CalendarDays}
        >
          {tahun.map((nilai) => (
            <option key={nilai} value={nilai}>
              {nilai}
            </option>
          ))}
        </PilihanPil>
      </div>
    </form>
  );
}

/** Pilihan berbentuk pil terang transparan di bawah kotak cari. */
function PilihanPil({
  id,
  name,
  label,
  kosong,
  ikon: Ikon,
  children,
}: {
  id: string;
  name: string;
  label: string;
  kosong: string;
  ikon: typeof Files;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-w-0">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Ikon
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-gigi-100"
      />
      <select
        id={id}
        name={name}
        defaultValue=""
        className="min-h-11 w-full cursor-pointer appearance-none truncate rounded-full border border-white/30 bg-white/15 pr-9 pl-10 text-sm font-semibold text-white transition-colors duration-150 hover:border-white/45 hover:bg-white/25 sm:min-w-52 [&>option]:text-tinta"
      >
        <option value="">{kosong}</option>
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-white/80"
      />
    </div>
  );
}
