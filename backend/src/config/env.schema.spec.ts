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
  DB_USER: 'test',
  DB_NAME: 'jdih_ith_v2_test',
  GOOGLE_CLIENT_ID: 'test-client',
  GOOGLE_CLIENT_SECRET: 'test-only',
  GOOGLE_REDIRECT_URI: 'http://localhost:3001/api/v1/auth/google/callback',
  SESSION_KEY: 'test-only-key-'.repeat(4),
};

describe('validasiEnv', () => {
  it('menerima konfigurasi minimum dan mengisi nilai baku', () => {
    const env = validasiEnv({ ...envMinimum });

    expect(env.NODE_ENV).toBe('development');
    expect(env.API_PORT).toBe(3001);
    expect(env.DB_NAME).toBe('jdih_ith_v2_test');
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

  it('menolak logging SQL identity dan legacy database', () => {
    expect(() => validasiEnv({ ...envMinimum, DB_LOG_QUERY: 'true' })).toThrow(/DB_LOG_QUERY/);
    expect(() => validasiEnv({ ...envMinimum, DB_NAME: 'jdih_ith' })).toThrow(/DB_NAME/);
  });
  it('menolak session key pendek', () => {
    expect(() => validasiEnv({ ...envMinimum, SESSION_KEY: 'short' })).toThrow(/SESSION_KEY/);
  });
  it('menolak insecure cookies di produksi', () => {
    expect(() =>
      validasiEnv({ ...envMinimum, NODE_ENV: 'production', COOKIE_SECURE: 'false' }),
    ).toThrow(/COOKIE_SECURE/);
  });
  it('LOGIN_UJI mati secara baku dan ditolak di produksi', () => {
    expect(validasiEnv({ ...envMinimum }).LOGIN_UJI).toBe(false);
    expect(validasiEnv({ ...envMinimum, LOGIN_UJI: 'true' }).LOGIN_UJI).toBe(true);
    expect(() =>
      validasiEnv({ ...envMinimum, NODE_ENV: 'production', LOGIN_UJI: 'true' }),
    ).toThrow(/LOGIN_UJI/);
  });
  it('menolak CORS berbeda dari origin frontend', () => {
    expect(() => validasiEnv({ ...envMinimum, CORS_ORIGIN: '*' })).toThrow(/CORS_ORIGIN/);
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

  it('menerima database produksi hanya pada NODE_ENV production', () => {
    const konfigurasiProduksi = {
      ...envMinimum,
      NODE_ENV: 'production',
      DB_NAME: 'jdih_ith_v2_prod',
      DB_PASSWORD: 'test-only-db-password',
      APP_URL: 'https://jdih.ith.ac.id',
      CORS_ORIGIN: 'https://jdih.ith.ac.id',
      GOOGLE_REDIRECT_URI: 'https://jdih.ith.ac.id/api/v1/auth/google/callback',
      SWAGGER_ENABLED: 'false',
    };
    expect(validasiEnv(konfigurasiProduksi).DB_NAME).toBe('jdih_ith_v2_prod');
    expect(() => validasiEnv({ ...envMinimum, DB_NAME: 'jdih_ith_v2_prod' })).toThrow(/DB_NAME/);
    expect(() =>
      validasiEnv({ ...konfigurasiProduksi, DB_NAME: 'jdih_ith_v2_test' }),
    ).toThrow(/DB_NAME/);
  });

  it('mengizinkan kata sandi kosong hanya pada pengembangan V2', () => {
    const env = validasiEnv({ ...envMinimum, DB_PASSWORD: '' });
    expect(env.DB_PASSWORD).toBe('');
  });

  it('melaporkan seluruh masalah sekaligus, bukan satu per satu', () => {
    let pesan = '';
    try {
      validasiEnv({ SESSION_KEY: 'pendek' });
    } catch (galat) {
      pesan = galat instanceof Error ? galat.message : String(galat);
    }

    expect(pesan).toContain('SESSION_KEY');
    expect(pesan).toContain('GOOGLE_CLIENT_ID');
    expect(pesan).toContain('GOOGLE_CLIENT_SECRET');
    expect(pesan).toContain('.env.identity.example');
  });
});
