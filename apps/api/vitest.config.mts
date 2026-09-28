import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

/**
 * Vitest dipakai sebagai satu-satunya pelari uji pada seluruh monorepo, supaya
 * tidak ada dua kerangka uji dengan dua konfigurasi berbeda.
 *
 * NestJS memakai dekorator beserta metadata tipenya untuk penyuntikan dependensi,
 * dan esbuild — pengalih bawaan Vitest — tidak memancarkan metadata tersebut.
 * unplugin-swc menggantikannya dengan SWC yang mendukungnya, sehingga kelas yang
 * diuji tetap dapat menerima dependensinya.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts', 'test/**/*.e2e-spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts', 'src/main.ts', 'src/database/schema/**'],
    },
  },
  plugins: [
    swc.vite({
      module: { type: 'es6' },
      jsc: {
        target: 'es2023',
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
      },
    }),
  ],
});
