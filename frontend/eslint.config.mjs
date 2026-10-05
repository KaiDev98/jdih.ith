// @ts-check
import next from 'eslint-config-next';
import vitals from 'eslint-config-next/core-web-vitals';

/**
 * Konfigurasi ESLint aplikasi web.
 *
 * Sengaja berdiri sendiri, tidak mewarisi konfigurasi akar. Alasannya teknis:
 * eslint-config-next membawa salinan typescript-eslint sendiri, dan mendaftarkan
 * dua salinan pengaya dengan nama sama pada satu konfigurasi flat akan ditolak
 * ESLint. Karena itu konfigurasi akar mengabaikan direktori ini, dan aturan
 * khas Next, React, serta aksesibilitas dijalankan dari sini.
 *
 * Jalankan melalui: npm run lint --workspace @jdih/web
 */
const konfigurasi = [
  {
    ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'],
  },

  ...next,
  ...vitals,

  {
    rules: {
      // Tautan internal wajib memakai <Link>, bukan <a>, agar navigasi tidak
      // memuat ulang seluruh halaman.
      '@next/next/no-html-link-for-pages': 'error',
      // <img> mentah melewatkan pengoptimalan gambar Next.
      '@next/next/no-img-element': 'warn',
      'react/jsx-no-target-blank': ['error', { allowReferrer: false }],
      'react-hooks/exhaustive-deps': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
];

export default konfigurasi;
