'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, Eye } from 'lucide-react';
import type { StatistikDokumen } from '@jdih/shared';

/** Dikirim setelah unduhan berhasil agar angka pengunduh diperbarui. */
export const PERISTIWA_UNDUH = 'jdih:unduh';

const angka = new Intl.NumberFormat('id-ID');

/**
 * Jumlah orang yang melihat dan mengunduh dokumen. Saat halaman dibuka, satu
 * kunjungan dicatat (server menghitung satu peramban sekali per hari) lalu
 * angka terbaru ditampilkan; setelah unduhan berhasil angkanya dimuat ulang.
 */
export function StatistikLangsung({ slug, awal }: { slug: string; awal: StatistikDokumen }) {
  const [statistik, setStatistik] = useState(awal);

  const catat = useCallback(() => {
    fetch(`/api/v1/public/documents/${encodeURIComponent(slug)}/view`, {
      method: 'POST',
      credentials: 'include',
    })
      .then(async (r) => {
        if (!r.ok) return;
        const json = (await r.json()) as { data?: StatistikDokumen };
        if (json.data) setStatistik(json.data);
      })
      .catch(() => undefined);
  }, [slug]);

  useEffect(() => {
    catat();
    const perbarui = () => window.setTimeout(catat, 400);
    window.addEventListener(PERISTIWA_UNDUH, perbarui);
    return () => window.removeEventListener(PERISTIWA_UNDUH, perbarui);
  }, [catat]);

  const butir = [
    { ikon: Eye, nilai: statistik.dilihat, teks: 'orang melihat' },
    { ikon: Download, nilai: statistik.diunduh, teks: 'orang mengunduh' },
  ];
  return (
    <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/80">
      {butir.map(({ ikon: Ikon, nilai, teks }) => (
        <li key={teks} className="inline-flex items-center gap-1.5">
          <Ikon aria-hidden className="size-4 text-white/60" />
          <strong className="font-semibold text-white tabular-nums">{angka.format(nilai)}</strong>
          {teks}
        </li>
      ))}
    </ul>
  );
}
