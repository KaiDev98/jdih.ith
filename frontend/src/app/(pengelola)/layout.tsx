import type { Metadata } from 'next';

/** Halaman masuk pengelola: tanpa header/footer portal dan tidak diindeks mesin pencari. */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function TataLetakPengelola({ children }: { children: React.ReactNode }) {
  return children;
}
