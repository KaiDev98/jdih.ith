import type { Metadata } from 'next';
import { AdminDocumentCreate } from '@/components/admin-documents';

export const metadata: Metadata = { title: 'Unggah SOP Permohonan SK' };

/** Unggah SOP Permohonan SK: jenis dikunci ke SOP dan dokumen ditandai untuk halaman khususnya. */
export default function Page() {
  return <AdminDocumentCreate mode="permohonan-sk" />;
}
