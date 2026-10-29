'use client';

import { LayarGalat } from '@/components/layar-galat';

export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <html lang="id"><body><LayarGalat retry={retry} /></body></html>;
}
