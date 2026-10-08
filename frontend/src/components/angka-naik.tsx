'use client';

import { useEffect, useState } from 'react';

const format = new Intl.NumberFormat('id-ID');

/**
 * Angka yang menghitung naik dari 0 ke nilainya sekali saat tampil. Pembaca
 * layar langsung menerima nilai akhirnya; tanpa JavaScript atau bila pengguna
 * memilih mengurangi gerakan, nilai akhir langsung tampil.
 */
export function AngkaNaik({ nilai, tunda = 0 }: { nilai: number; tunda?: number }) {
  const [tampil, setTampil] = useState(nilai);

  useEffect(() => {
    if (nilai <= 0 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const durasi = 700 + Math.min(600, nilai * 6);
    const mulai = performance.now() + tunda;
    let bingkai = requestAnimationFrame(function langkah(kini) {
      const t = Math.min(1, Math.max(0, (kini - mulai) / durasi));
      setTampil(Math.round(nilai * (1 - (1 - t) ** 3)));
      if (t < 1) bingkai = requestAnimationFrame(langkah);
    });
    return () => cancelAnimationFrame(bingkai);
  }, [nilai, tunda]);

  return (
    <>
      <span aria-hidden>{format.format(tampil)}</span>
      <span className="sr-only">{format.format(nilai)}</span>
    </>
  );
}
