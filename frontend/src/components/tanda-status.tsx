const STATUS = {
  BERLAKU: { teks: 'Berlaku', warna: 'text-green-700' },
  DIUBAH: { teks: 'Diubah', warna: 'text-amber-700' },
  DICABUT: { teks: 'Dicabut', warna: 'text-red-700' },
} as const;

type StatusHukum = keyof typeof STATUS;

/**
 * Status hukum dibedakan oleh bentuk tanda, bukan warna saja: lingkaran penuh
 * (berlaku), setengah (diubah), dan dicoret (dicabut). Tetap terbaca bagi
 * pengguna buta warna dan saat dicetak hitam-putih.
 */
export function TandaStatus({ status }: { status: string }) {
  const info = STATUS[status as StatusHukum];
  if (!info) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold ${info.warna}`}>
      <svg aria-hidden viewBox="0 0 12 12" className="size-3 shrink-0">
        {status === 'BERLAKU' && <circle cx="6" cy="6" r="5" fill="currentColor" />}
        {status === 'DIUBAH' && (
          <>
            <circle cx="6" cy="6" r="4.4" fill="none" stroke="currentColor" strokeWidth="1.2" />
            <path d="M6 1.6a4.4 4.4 0 0 1 0 8.8z" fill="currentColor" />
          </>
        )}
        {status === 'DICABUT' && (
          <>
            <circle cx="6" cy="6" r="4.4" fill="none" stroke="currentColor" strokeWidth="1.2" />
            <path d="M2.6 9.4 9.4 2.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </>
        )}
      </svg>
      {info.teks}
    </span>
  );
}
