'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { AdminDocumentDetail } from '@/components/admin-document-detail';
import type { KonteksDokumen } from '@/lib/panel';

export function HalamanDetailDokumen({ konteks = 'terverifikasi' }: { konteks?: KonteksDokumen }) {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  return <AdminDocumentDetail id={id} versionId={search.get('versionId') ?? undefined} konteks={konteks} />;
}
