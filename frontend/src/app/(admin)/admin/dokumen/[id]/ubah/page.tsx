'use client';
import { useParams } from 'next/navigation';
import { AdminUbahDraf } from '@/components/admin-ubah-draf';

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <AdminUbahDraf id={id} />;
}
