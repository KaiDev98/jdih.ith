import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/** Pengujian komponen React. Berkas uji berdampingan dengan berkas yang diujinya. */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    // jsdom menyediakan DOM tiruan, sebab komponen React memerlukannya.
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{spec,test}.{ts,tsx}'],
    // Agar rangkaian CI tidak gagal hanya karena suatu paket belum memiliki uji.
    passWithNoTests: true,
  },
});
