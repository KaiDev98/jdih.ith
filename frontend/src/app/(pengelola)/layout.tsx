import type { Metadata } from 'next';

/** Seluruh halaman autentikasi mandiri, tanpa header/footer portal. URL tetap sama. */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function TataLetakPengelola({ children }: { children: React.ReactNode }) {
  return <main id="isi-utama">{children}</main>;
}
