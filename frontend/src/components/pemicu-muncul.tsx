'use client';

import { useEffect } from 'react';

/**
 * Memunculkan elemen ber-atribut `data-muncul` saat pertama kali masuk layar.
 * Keadaan tersembunyinya diatur CSS sejak tampilan pertama (hanya bila
 * JavaScript aktif), jadi tidak ada kedipan. Elemen yang masuk layar bersamaan
 * muncul berurutan; kelompok pertama saat halaman dibuka menunggu hero
 * selesai lebih dulu. Tidak melakukan apa pun bila pengguna memilih
 * mengurangi gerakan.
 */
export function PemicuMuncul() {
  useEffect(() => {
    const akar = document.documentElement;
    akar.classList.add('gerak-aktif');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return () => akar.classList.remove('gerak-aktif');
    }
    const dipasang = performance.now();
    const pengamat = new IntersectionObserver(
      (entri) => {
        const awal = performance.now() - dipasang < 700;
        const masuk = entri
          .filter((e) => e.isIntersecting)
          .map((e) => e.target as HTMLElement)
          .sort((a, b) => {
            const ra = a.getBoundingClientRect();
            const rb = b.getBoundingClientRect();
            return ra.top - rb.top || ra.left - rb.left;
          });
        masuk.forEach((el, i) => {
          el.dataset.urut = String(Math.min(i, 6));
          if (awal) el.dataset.awal = '';
          el.dataset.terlihat = '';
          pengamat.unobserve(el);
        });
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    for (const el of document.querySelectorAll<HTMLElement>('[data-muncul]:not([data-terlihat])'))
      pengamat.observe(el);
    return () => {
      pengamat.disconnect();
      akar.classList.remove('gerak-aktif');
    };
  }, []);
  return null;
}
