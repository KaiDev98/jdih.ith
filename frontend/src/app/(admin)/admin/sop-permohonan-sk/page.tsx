import type { Metadata } from 'next';
import { AdminSopPermohonanSk } from '@/components/admin-sop-permohonan-sk';

export const metadata: Metadata = { title: 'SOP Permohonan SK' };

export default function Page() {
  return <AdminSopPermohonanSk />;
}
