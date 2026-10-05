'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { GalatApi } from './api-client';

/**
 * Penyedia TanStack Query.
 *
 * Instans QueryClient dibuat di dalam `useState`, bukan sebagai variabel modul.
 * Alasannya khas Next.js: variabel modul di peladen dibagi antarpermintaan, jadi
 * cache satu pengguna dapat tersaji kepada pengguna lain. Membuatnya per komponen
 * memastikan setiap permintaan peladen memperoleh cache-nya sendiri.
 */
export function PenyediaKueri({ children }: { children: ReactNode }) {
  const [klien] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data dokumen jarang berubah dalam hitungan detik; satu menit
            // menghindari permintaan berulang saat pengguna berpindah halaman.
            staleTime: 60_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: (jumlahGagal, galat) => {
              // Galat 4xx tidak akan berubah hasilnya bila diulang — hanya
              // menambah beban dan memperlambat munculnya pesan bagi pengguna.
              if (galat instanceof GalatApi && galat.status < 500) return false;
              return jumlahGagal < 2;
            },
          },
          mutations: {
            // Perubahan data tidak boleh diulang otomatis: pengulangan dapat
            // menciptakan dokumen ganda atau notifikasi berulang.
            retry: false,
          },
        },
      }),
  );

  return <QueryClientProvider client={klien}>{children}</QueryClientProvider>;
}
