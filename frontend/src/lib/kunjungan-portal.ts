'use client';

import { skemaRingkasanKunjungan, type RingkasanKunjungan } from '@jdih/shared';
import { ambilApi } from './api-client';

const KUNCI = 'jdih:kunjungan-tercatat';
const berjalan = new Map<string, Promise<RingkasanKunjungan>>();
const hariWita = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Makassar',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
function tercatat(hari: string) {
  try {
    return localStorage.getItem(KUNCI) === hari;
  } catch {
    return false;
  }
}

/** Server/kuki tetap menjadi penentu pencatatan. Storage dan lock hanya mencegah
 * POST bersamaan dari StrictMode, beberapa komponen, atau tab satu peramban. */
export function ambilKunjunganPortal(): Promise<RingkasanKunjungan> {
  const hari = hariWita();
  const pending = berjalan.get(hari);
  if (pending) return pending;
  const kirim = async () => {
    const tanggal = hariWita();
    const sudah = tercatat(tanggal);
    const data = skemaRingkasanKunjungan.parse(
      await ambilApi<unknown>('/public/visits', {
        ...(sudah ? {} : { method: 'POST' }),
        cache: 'no-store',
      }),
    );
    if (!sudah) {
      try {
        localStorage.setItem(KUNCI, tanggal);
      } catch {
        /* Kuki HttpOnly server tetap berlaku. */
      }
    }
    return data;
  };
  const request = Promise.resolve()
    .then(() =>
      !tercatat(hari) && navigator.locks
        ? navigator.locks.request('jdih:kunjungan-harian', kirim)
        : kirim(),
    )
    .finally(() => {
      berjalan.delete(hari);
    });
  berjalan.set(hari, request);
  return request;
}
