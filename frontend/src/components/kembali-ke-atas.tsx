'use client';

import { ArrowUp } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import styles from './kembali-ke-atas.module.css';

export function KembaliKeAtas() {
  const pathname = usePathname();
  const [tampil, setTampil] = useState(false);
  const areaAktif = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let frame = 0;
    areaAktif.current = null;
    const perbarui = () => {
      setTampil(window.scrollY > 320 || (areaAktif.current?.scrollTop ?? 0) > 160);
    };
    const saatGulir = (event: Event) => {
      if (event.target instanceof HTMLElement && event.target.hasAttribute('data-gulir-dokumen'))
        areaAktif.current = event.target;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(perbarui);
    };
    frame = requestAnimationFrame(perbarui);
    document.addEventListener('scroll', saatGulir, { capture: true, passive: true });
    window.addEventListener('scroll', saatGulir, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('scroll', saatGulir, true);
      window.removeEventListener('scroll', saatGulir);
    };
  }, [pathname]);

  function kembali() {
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'instant'
      : 'smooth';
    for (const area of document.querySelectorAll<HTMLElement>('[data-gulir-dokumen]'))
      area.scrollTo({ top: 0, behavior });
    window.scrollTo({ top: 0, behavior });
  }

  return (
    <button
      type="button"
      aria-label="Kembali ke atas"
      aria-hidden={!tampil}
      disabled={!tampil}
      tabIndex={tampil ? 0 : -1}
      className={styles.button}
      data-visible={tampil}
      onClick={kembali}
    >
      <ArrowUp size={18} strokeWidth={1.8} aria-hidden />
      <span>Ke atas</span>
    </button>
  );
}
