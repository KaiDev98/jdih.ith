import { AdminVerificationQueue } from '@/components/admin-documents';
import { skemaId } from '@jdih/shared';
export default async function Page({ searchParams }: { searchParams: Promise<{ permintaanId?: string; riwayatPermintaan?: string }> }) {
  const query = await searchParams;
  const id = skemaId.safeParse(query.permintaanId);
  return <AdminVerificationQueue requestId={id.success ? id.data : undefined} showHistory={query.riwayatPermintaan === '1'} />;
}
