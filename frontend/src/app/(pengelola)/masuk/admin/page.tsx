import type { Metadata } from 'next';
import { HalamanMasukPengelola } from '@/components/halaman-masuk-pengelola';

export const metadata: Metadata = { title: 'Masuk Admin' };

export default function Page() {
  return <HalamanMasukPengelola jalur="admin" />;
}
