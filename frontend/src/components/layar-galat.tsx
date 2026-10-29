'use client';

import { ArrowLeft, RotateCw } from 'lucide-react';
import styles from './layar-galat.module.css';

/** The fallback never renders exception messages, stack traces or private data. */
export function LayarGalat({ retry }: { retry: () => void }) {
  return (
    <main className={styles.page}>
      <section className={styles.content} aria-labelledby="galat-title" role="alert">
        <p className={styles.brand}>JDIH ITH</p>
        <span className={styles.rule} aria-hidden="true" />
        <h1 id="galat-title">Halaman belum dapat dimuat</h1>
        <p>Terjadi kendala saat membuka halaman ini. Coba muat kembali dalam beberapa saat.</p>
        <div className={styles.actions}>
          <button type="button" onClick={retry}><RotateCw size={18} aria-hidden="true" />Coba lagi</button>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- A full document navigation also recovers a failed router/root layout. */}
          <a href="/"><ArrowLeft size={18} aria-hidden="true" />Beranda</a>
        </div>
      </section>
    </main>
  );
}
