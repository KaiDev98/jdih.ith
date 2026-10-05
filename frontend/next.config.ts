import type { NextConfig } from 'next';

/**
 * Konfigurasi Next.js — Portal JDIH ITH Parepare.
 *
 * Dua keputusan penting di sini:
 *
 * 1. Panggilan API selalu memakai alamat relatif `/api/v1/...`, dan Next meneruskannya
 *    ke peladen NestJS. Akibatnya peramban dan API berada pada asal (origin) yang
 *    sama, sehingga kuki httpOnly untuk autentikasi bekerja tanpa pengaturan
 *    lintas-asal maupun SameSite=None. Pada penggelaran nyata, Nginx melakukan
 *    hal yang sama, sehingga kode aplikasi tidak perlu berubah sama sekali.
 *
 * 2. `output: 'standalone'` menghasilkan direktori mandiri berisi hanya berkas
 *    yang benar-benar dipakai, sehingga penggelaran ke peladen kampus tidak
 *    memerlukan seluruh node_modules.
 */

const urlApiInternal = process.env.API_INTERNAL_URL ?? 'http://localhost:3001';

const konfigurasi: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'standalone',

  // @jdih/shared adalah paket sumber di dalam monorepo, bukan paket terbitan npm.
  transpilePackages: ['@jdih/shared'],

  typescript: {
    // Kekeliruan tipe harus menggagalkan build. Membiarkannya lewat berarti
    // membiarkan galat sampai ke pengguna.
    ignoreBuildErrors: false,
  },

  // Catatan: Next 16 tidak lagi menyediakan kunci `eslint` maupun `next lint`.
  // Linting dijalankan terpisah melalui eslint.config.mjs pada paket ini.
  images: {
    // Berkas gambar konten disajikan peladen API melalui tautan bertanda tangan.
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: '127.0.0.1' },
    ],
  },

  async rewrites() {
    return [
      {
        source: '/api/v1/:jalur*',
        destination: `${urlApiInternal}/api/v1/:jalur*`,
      },
    ];
  },

  async headers() {
    return [
      {
        source: '/:jalur*',
        headers: [
          // Mencegah peramban menebak jenis isi berkas yang disajikan.
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Portal tidak boleh disematkan di dalam kerangka situs lain.
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // Alamat halaman internal tidak ikut terkirim saat pengguna menuju situs luar.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
        ],
      },
    ];
  },
};

export default konfigurasi;
