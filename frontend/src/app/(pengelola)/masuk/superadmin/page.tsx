import type { Metadata } from 'next';
import { HalamanMasukPengelola } from '@/components/halaman-masuk-pengelola';

export const metadata: Metadata = { title: 'Masuk Superadmin' };

/** Sengaja tidak ditautkan dari halaman mana pun. */
export default function Page() {
  return <HalamanMasukPengelola jalur="superadmin" />;
}
