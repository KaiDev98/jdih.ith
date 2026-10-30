'use client';

import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { BukaFooter } from './buka-footer';
import type { RingkasanKunjungan } from '@jdih/shared';
import { ambilKunjunganPortal } from '@/lib/kunjungan-portal';

const JEDA_PEMBARUAN = 30_000;
const angka = new Intl.NumberFormat('id-ID');

/**
 * Ringkasan kunjungan di footer. Kunjungan peramban ini dicatat sekali per
 * hari: backend menyaring lewat kuki, dan peramban tidak mengirim POST lagi
 * setelah tercatat. Tanpa penyaring di sisi peramban, setiap halaman yang
 * dibuka mengirim POST, dan pengguna kampus yang berbagi satu IP cepat terkena
 * batas laju. Angkanya diperbarui berkala dan setiap kali tab kembali dibuka.
 */
export function KunjunganFooter({ awal }: { awal: RingkasanKunjungan | null }) {
  const [data, setData] = useState(awal);
  const [galat, setGalat] = useState(false);
  const [ulang, setUlang] = useState(0);

  useEffect(() => {
    let aktif = true;
    const perbarui = () => {
      if (document.visibilityState !== 'visible') return;
      void ambilKunjunganPortal()
        .then((hasil) => {
          if (aktif) {
            setData(hasil);
            setGalat(false);
          }
        })
        .catch(() => {
          if (aktif) setGalat(true);
        });
    };
    perbarui();
    const pewaktu = window.setInterval(perbarui, JEDA_PEMBARUAN);
    document.addEventListener('visibilitychange', perbarui);
    return () => {
      aktif = false;
      window.clearInterval(pewaktu);
      document.removeEventListener('visibilitychange', perbarui);
    };
  }, [ulang]);

  const butir = data
    ? [
        { label: 'Hari ini', nilai: data.hariIni },
        { label: 'Bulan ini', nilai: data.bulanIni },
        { label: 'Tahun ini', nilai: data.tahunIni },
        { label: 'Total', nilai: data.total },
      ]
    : [];
  return (
    <BukaFooter
      label={
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/6 ring-1 ring-white/15 ring-inset">
            <Users aria-hidden strokeWidth={1.75} className="size-4 text-institusi-400" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-white">Kunjungan portal</span>
            <span className="block text-xs text-gigi-300">
              {data
                ? `${angka.format(data.total)} total kunjungan`
                : galat
                  ? 'Data belum tersedia'
                  : 'Memuat data kunjungan…'}
            </span>
          </span>
        </span>
      }
    >
      <div className="pt-3">
        <p className="mb-3 text-xs leading-5 text-gigi-300">
          Satu peramban dihitung sekali per hari, berdasarkan waktu WITA.
        </p>
        {galat && (
          <div role="status" className="mb-3 text-xs leading-5 text-gigi-200">
            <p>
              {data
                ? 'Menampilkan data terakhir. Pembaruan belum tersedia.'
                : 'Statistik belum dapat dimuat.'}
            </p>
            <button
              type="button"
              className="mt-1 min-h-11 underline underline-offset-4"
              onClick={() => {
                setGalat(false);
                setUlang((nilai) => nilai + 1);
              }}
            >
              Coba lagi
            </button>
          </div>
        )}
        <dl className="grid grid-cols-2 gap-2.5" aria-live="polite">
          {butir.map((b) => (
            <div
              key={b.label}
              className="flex min-w-0 flex-col rounded-xl bg-white/[0.04] px-3 py-2.5 ring-1 ring-white/[0.08] ring-inset"
            >
              <dt className="text-xs text-gigi-300">{b.label}</dt>
              <dd className="mt-1 text-xl leading-tight font-extrabold tracking-[-0.01em] text-white tabular-nums">
                {angka.format(b.nilai)}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </BukaFooter>
  );
}
