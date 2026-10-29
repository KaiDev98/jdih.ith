import type { Metadata } from 'next';
import { HalamanTidakDitemukan } from '@/components/halaman-tidak-ditemukan';

export const metadata: Metadata = { title: 'Tidak ditemukan' };

/** 404 di dalam tata letak publik, mis. saat `notFound()` dipanggil halaman detail. */
export default function TidakDitemukanPublik() {
  return <HalamanTidakDitemukan />;
}
