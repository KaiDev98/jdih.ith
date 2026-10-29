/**
 * Ikon media sosial bergaya garis, senada dengan ikon lucide lainnya. Paket
 * lucide versi ini tidak lagi memuat ikon merek, jadi bentuknya ditulis di
 * sini (jalur dari lucide sebelum ikon merek dihapus, lisensi ISC).
 */
type Properti = { className?: string };

const dasar = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export function IkonInstagram({ className }: Properti) {
  return (
    <svg {...dasar} className={className}>
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

export function IkonYoutube({ className }: Properti) {
  return (
    <svg {...dasar} className={className}>
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
      <path d="m10 15 5-3-5-3z" />
    </svg>
  );
}

/** Ikon untuk nama media sosial di KONTAK_INSTITUSI; null bila tidak dikenal. */
export function IkonMediaSosial({ nama, className }: { nama: string } & Properti) {
  if (nama === 'Instagram') return <IkonInstagram className={className} />;
  if (nama === 'YouTube') return <IkonYoutube className={className} />;
  return null;
}
