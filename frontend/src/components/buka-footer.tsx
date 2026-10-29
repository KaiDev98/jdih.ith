'use client';

import { useId, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

/** Tinggi mengikuti isi; konten tetap terpasang agar animasi membuka dan menutup sama halusnya. */
export function BukaFooter({
  label, children, className = '',
}: { label: ReactNode; children: ReactNode; className?: string }) {
  const [buka, setBuka] = useState(false);
  const id = useId();
  return (
    <div className={`buka-footer ${className}`} data-buka={buka}>
      <button
        type="button"
        id={`${id}-tombol`}
        aria-expanded={buka}
        aria-controls={`${id}-isi`}
        onClick={() => setBuka((nilai) => !nilai)}
        className="buka-footer-tombol flex w-full items-center justify-between gap-3 rounded-lg px-1 py-2 text-left text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-institusi-400"
      >
        <span className="min-w-0">{label}</span>
        <ChevronDown aria-hidden className="buka-footer-ikon size-4 shrink-0 text-gigi-300" />
      </button>
      <div className="buka-footer-isi" id={`${id}-isi`} role="region" aria-labelledby={`${id}-tombol`} aria-hidden={!buka} inert={!buka}>
        <div className="min-h-0 overflow-hidden">
          <div className="buka-footer-dalam">{children}</div>
        </div>
      </div>
    </div>
  );
}
