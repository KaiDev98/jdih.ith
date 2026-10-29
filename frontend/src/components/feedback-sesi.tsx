'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';

export const KUNCI_KELUAR = 'jdih:keluar-berhasil';

/** Pesan sekali tampil setelah pemuatan portal baru menyelesaikan logout. */
export function FeedbackSesi() {
  const [tampil, setTampil] = useState(false);
  useEffect(() => {
    try {
      if (sessionStorage.getItem(KUNCI_KELUAR) !== '1') return;
      sessionStorage.removeItem(KUNCI_KELUAR);
    } catch {
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Sinkronisasi pesan sekali tampil dari penyimpanan sesi browser.
    setTampil(true);
    const timer = window.setTimeout(() => setTampil(false), 6000);
    return () => window.clearTimeout(timer);
  }, []);
  if (!tampil) return null;
  return (
    <div
      role="status"
      className="fixed right-4 bottom-4 z-50 flex w-[min(23rem,calc(100vw-2rem))] items-center gap-3 rounded-xl border border-emerald-200 bg-white p-4 text-sm text-emerald-900 shadow-lg"
    >
      <CheckCircle2 aria-hidden className="size-5 shrink-0 text-emerald-600" />
      <p className="flex-1">Anda berhasil keluar dari akun.</p>
      <button
        type="button"
        aria-label="Tutup pemberitahuan"
        className="grid size-9 shrink-0 place-items-center rounded-lg hover:bg-emerald-50 focus-visible:ring-2 focus-visible:ring-emerald-600"
        onClick={() => setTampil(false)}
      >
        <X aria-hidden className="size-4" />
      </button>
    </div>
  );
}
