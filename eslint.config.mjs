// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    name: 'jdih/ignores',
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/coverage/**',
      '**/*.tsbuildinfo',
      'backend/src/database/generated/**',
      // frontend memakai eslint.config.mjs sendiri, karena eslint-config-next
      // membawa salinan typescript-eslint yang bertabrakan bila digabung di sini.
      'frontend/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  {
    name: 'jdih/typescript',
    files: ['**/*.{ts,tsx,mts,cts}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Impor tipe dipisahkan agar emit runtime tetap bersih.
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      // Variabel tak terpakai jadi galat, kecuali diawali garis bawah.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      // Promise yang tidak ditunggu adalah sumber bug paling sering di Nest/Next.
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/await-thenable': 'error',
      // `any` dilarang, tetapi sebagai peringatan agar tidak menghambat pekerjaan.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unnecessary-condition': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
    },
  },

  {
    name: 'jdih/api',
    files: ['backend/**/*.ts'],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      // Dekorator NestJS memakai kelas kosong dan parameter properti.
      '@typescript-eslint/no-extraneous-class': 'off',
      '@typescript-eslint/no-empty-function': ['error', { allow: ['constructors'] }],
      // Metadata dekorator membuat sejumlah pemeriksaan tipe keliru menandai kode sah.
      '@typescript-eslint/unbound-method': 'off',
    },
  },

  {
    name: 'jdih/web',
    files: ['frontend/**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },

  {
    name: 'jdih/skrip-dan-konfigurasi',
    files: ['**/*.{mjs,cjs,js}', '**/*.config.{ts,mts}', 'scripts/**/*'],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      // Aturan yang memerlukan informasi tipe dimatikan di sini. Berkas
      // konfigurasi dan skrip berada di luar program TypeScript aplikasi, dan
      // memaksakan penaipan penuh atasnya hanya menghasilkan galat pemuatan aturan.
      //
      // Catatan: penyebaran ini HARUS berada di dalam `rules`, bukan di tingkat
      // objek konfigurasi. Menaruhnya di luar lalu mendeklarasikan `rules`
      // sesudahnya akan menimpanya dan mematikan efeknya.
      ...tseslint.configs.disableTypeChecked.rules,
      'no-console': 'off',
    },
  },

  {
    name: 'jdih/pengujian',
    files: ['**/*.{spec,test}.{ts,tsx}', '**/test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },

  prettier,
);
