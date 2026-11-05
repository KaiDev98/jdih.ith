'use client';

import { useEffect } from 'react';

/** Tunggu isi panel siap sebelum mengikuti tautan bagian dari notifikasi. */
export function usePanelAnchor(id: string, ready: boolean) {
  useEffect(() => {
    if (!ready || window.location.hash !== `#${id}`) return;
    const frame = requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView?.({
        block: 'start',
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'instant'
          : 'smooth',
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [id, ready]);
}
