'use client';

import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import type { RingkasanKunjungan } from '@jdih/shared';
import { ambilApi } from '@/lib/api-client';

const JEDA_PEMBARUAN = 30_000;
const angka = new Intl.NumberFormat('id-ID');

/**
 * Ringkasan kunjungan di footer. Saat dimuat, kunjungan peramban ini dicatat
 * (backend menghitungnya sekali per hari), lalu angkanya diperbarui berkala dan
 * setiap kali tab kembali dibuka.
 */
export function KunjunganFooter({ awal }: { awal: RingkasanKunjungan | null }) {
  const [data, setData] = useState(awal);

  useEffect(() => {
    let aktif = true;
    const simpan = (hasil: RingkasanKunjungan) => {
      if (aktif) setData(hasil);
    };
    void ambilApi<RingkasanKunjungan>('/public/visits', { method: 'POST' })
      .then(simpan)
      .catch(() => undefined);
    const perbarui = () => {
      if (document.visibilityState !== 'visible') return;
      void ambilApi<RingkasanKunjungan>('/public/visits', { cache: 'no-store' })
        .then(simpan)
        .catch(() => undefined);
    };
    const pewaktu = window.setInterval(perbarui, JEDA_PEMBARUAN);
    document.addEventListener('visibilitychange', perbarui);
    return () => {
      aktif = false;
      window.clearInterval(pewaktu);
      document.removeEventListener('visibilitychange', perbarui);
    };
  }, []);

  if (!data) return null;
  const butir = [
    { label: 'Hari ini', nilai: data.hariIni },
    { label: 'Bulan ini', nilai: data.bulanIni },
    { label: 'Tahun ini', nilai: data.tahunIni },
    { label: 'Total', nilai: data.total },
  ];
  return (
    <section aria-labelledby="judul-kunjungan">
      <h2 id="judul-kunjungan" className="flex items-center gap-2 text-sm font-semibold text-white">
        <Users aria-hidden strokeWidth={1.75} className="size-4 text-institusi-100" />
        Kunjungan
      </h2>
      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3" aria-live="polite">
        {butir.map((b) => (
          <div key={b.label} className="flex min-w-0 flex-col-reverse">
            <dt className="text-sm text-institusi-100">{b.label}</dt>
            <dd className="text-xl leading-tight font-extrabold tracking-[-0.01em] text-white tabular-nums">
              {angka.format(b.nilai)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
