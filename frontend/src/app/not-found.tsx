import type { Metadata } from 'next';
import { HalamanTidakDitemukan } from '@/components/halaman-tidak-ditemukan';
import TataLetakPublik from './(publik)/layout';

export const metadata: Metadata = { title: 'Tidak ditemukan' };

/** 404 untuk alamat yang tidak cocok dengan rute mana pun; memakai navbar dan footer publik. */
export default function TidakDitemukan() {
  return (
    <TataLetakPublik>
      <HalamanTidakDitemukan />
    </TataLetakPublik>
  );
}
