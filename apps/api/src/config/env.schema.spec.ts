import { describe, expect, it } from 'vitest';

import { validasiEnv } from './env.schema.js';

/**
 * Pengujian validasi konfigurasi.
 *
 * Aturan silang antarvariabel adalah tempat kekeliruan penggelaran paling sering
 * terjadi — dan paling mahal, karena baru terasa setelah sistem dipakai. Setiap
 * aturan karena itu diuji satu per satu.
 */

const envMinimum = {
  JWT_SECRET: 'a'.repeat(48),
  JWT_REFRESH_SECRET: 'b'.repeat(48),
  COOKIE_SECRET: 'c'.repeat(48),
};

describe('validasiEnv', () => {
  it('menerima konfigurasi minimum dan mengisi nilai baku', () => {
    const env = validasiEnv({ ...envMinimum });

    expect(env.NODE_ENV).toBe('development');
    expect(env.API_PORT).toBe(3001);
    expect(env.DB_NAME).toBe('jdih_ith');
    expect(env.STORAGE_DRIVER).toBe('lokal');
    expect(env.SEARCH_DRIVER).toBe('mysql');
    expect(env.UNDUH_LIMIT_ANONIM).toBe(30);
    expect(env.UNDUH_LIMIT_PENGGUNA).toBe(200);
  });

  it('memaksa tipe angka dari teks, karena variabel lingkungan selalu berupa teks', () => {
    const env = validasiEnv({ ...envMinimum, API_PORT: '4000', DB_POOL_LIMIT: '25' });

    expect(env.API_PORT).toBe(4000);
    expect(env.DB_POOL_LIMIT).toBe(25);
  });

  it('menafsirkan "true" dan "1" sebagai benar', () => {
    expect(validasiEnv({ ...envMinimum, DB_LOG_QUERY: 'true' }).DB_LOG_QUERY).toBe(true);
    expect(validasiEnv({ ...envMinimum, DB_LOG_QUERY: '1' }).DB_LOG_QUERY).toBe(true);
    expect(validasiEnv({ ...envMinimum, DB_LOG_QUERY: 'false' }).DB_LOG_QUERY).toBe(false);
  });

  it('menolak rahasia yang terlalu pendek', () => {
    expect(() => validasiEnv({ ...envMinimum, JWT_SECRET: 'pendek' })).toThrow(/JWT_SECRET/);
  });

  it('menolak rahasia JWT akses dan penyegar yang sama', () => {
    const sama = 'x'.repeat(48);
    expect(() =>
      validasiEnv({ ...envMinimum, JWT_SECRET: sama, JWT_REFRESH_SECRET: sama }),
    ).toThrow(/harus berbeda/);
  });

  it('menolak COOKIE_SECRET yang sama dengan JWT_SECRET', () => {
    const sama = 'y'.repeat(48);
    expect(() => validasiEnv({ ...envMinimum, JWT_SECRET: sama, COOKIE_SECRET: sama })).toThrow(
      /COOKIE_SECRET/,
    );
  });

  it('mewajibkan parameter S3 bila pengandar penyimpanan s3 dipilih', () => {
    expect(() => validasiEnv({ ...envMinimum, STORAGE_DRIVER: 's3' })).toThrow(/S3_ENDPOINT/);

    const env = validasiEnv({
      ...envMinimum,
      STORAGE_DRIVER: 's3',
      S3_ENDPOINT: 'http://127.0.0.1:9000',
      S3_BUCKET: 'jdih',
      S3_ACCESS_KEY: 'kunci',
      S3_SECRET_KEY: 'rahasia',
    });
    expect(env.STORAGE_DRIVER).toBe('s3');
  });

  it('mewajibkan MEILISEARCH_HOST bila pengandar pencarian meilisearch dipilih', () => {
    expect(() => validasiEnv({ ...envMinimum, SEARCH_DRIVER: 'meilisearch' })).toThrow(
      /MEILISEARCH_HOST/,
    );
  });

  it('mewajibkan REDIS_URL bila pengandar cache redis dipilih', () => {
    expect(() => validasiEnv({ ...envMinimum, CACHE_DRIVER: 'redis' })).toThrow(/REDIS_URL/);
  });

  it('mewajibkan host dan port bila pengandar surel smtp dipilih', () => {
    expect(() => validasiEnv({ ...envMinimum, MAIL_DRIVER: 'smtp' })).toThrow(/MAIL_HOST/);
  });

  it('melarang Swagger menyala di produksi', () => {
    expect(() =>
      validasiEnv({
        ...envMinimum,
        NODE_ENV: 'production',
        DB_PASSWORD: 'kataSandiKuat',
        SWAGGER_ENABLED: 'true',
      }),
    ).toThrow(/SWAGGER_ENABLED/);
  });

  it('melarang kata sandi basis data kosong di produksi', () => {
    expect(() =>
      validasiEnv({ ...envMinimum, NODE_ENV: 'production', SWAGGER_ENABLED: 'false' }),
    ).toThrow(/DB_PASSWORD/);
  });

  it('mengizinkan kata sandi basis data kosong saat pengembangan, sesuai XAMPP baku', () => {
    const env = validasiEnv({ ...envMinimum, DB_PASSWORD: '' });
    expect(env.DB_PASSWORD).toBe('');
  });

  it('melaporkan seluruh masalah sekaligus, bukan satu per satu', () => {
    let pesan = '';
    try {
      validasiEnv({ JWT_SECRET: 'pendek', JWT_REFRESH_SECRET: 'juga-pendek' });
    } catch (galat) {
      pesan = galat instanceof Error ? galat.message : String(galat);
    }

    expect(pesan).toContain('JWT_SECRET');
    expect(pesan).toContain('JWT_REFRESH_SECRET');
    expect(pesan).toContain('COOKIE_SECRET');
    expect(pesan).toContain('.env.example');
  });
});
