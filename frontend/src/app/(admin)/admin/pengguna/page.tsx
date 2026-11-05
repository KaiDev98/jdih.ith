import { AdminUsers } from '@/components/admin-users';
export default async function Page({ searchParams }: { searchParams: Promise<{ kelompok?: string }> }) {
  const query = await searchParams;
  return <AdminUsers kelompokAwal={query.kelompok === 'DOSEN_STAF' ? 'DOSEN_STAF' : 'ADMIN'} />;
}
