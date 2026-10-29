'use client';

import { LayarGalat } from '@/components/layar-galat';

export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <LayarGalat retry={retry} />;
}
