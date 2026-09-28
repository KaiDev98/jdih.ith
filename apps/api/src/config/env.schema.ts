import { z } from 'zod';

/**
 * Skema variabel lingkungan.
 *
 * Divalidasi satu kali saat peladen dinyalakan. Bila ada yang kurang atau salah
 * bentuk, peladen menolak menyala dan menyebutkan tepat variabel mana yang
 * bermasalah. Ini jauh lebih baik daripada menyala lalu gagal pada permintaan
 * pertama dengan galat yang tidak menyebut penyebabnya.
 */

const bolean = z
  .enum(['true', 'false', '1', '0'])
  .transform((nilai) => nilai === 'true' || nilai === '1');

const rahasiaMinimum = 32;

export const skemaEnv = z.object({
  /* ─────────────────────────────── Aplikasi ─────────────────────────────── */
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
  API_HOST: z.string().default('0.0.0.0'),
  /** Awalan global seluruh rute, mengikuti docs/05-role-permission.md § E.8. */
  API_PREFIX: z.string().default('api/v1'),
  /** Asal (origin) aplikasi web yang diizinkan memanggil API, dipisahkan koma. */
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  /** Alamat publik portal, dipakai pada tautan di dalam surel dan sitemap. */
  APP_URL: z.string().url().default('http://localhost:3000'),

  /* ──────────────────────────── Basis data MySQL ───────────────────────── */
  DB_HOST: z.string().min(1).default('127.0.0.1'),
  DB_PORT: z.coerce.number().int().min(1).max(65_535).default(3306),
  DB_USER: z.string().min(1).default('root'),
  /** Boleh kosong pada pemasangan XAMPP baku, karena itu tidak diwajibkan. */
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().min(1).default('jdih_ith'),
  DB_POOL_LIMIT: z.coerce.number().int().min(1).max(100).default(10),
  /** Zona waktu koneksi. Seluruh DATETIME disimpan dalam UTC (docs/04 § D.0). */
  DB_TIMEZONE: z.string().default('Z'),
  /** Mencatat setiap kueri ke log. Berguna saat pengembangan, berisik di produksi. */
  DB_LOG_QUERY: bolean.default(false),

  /* ───────────────────────────── Autentikasi ───────────────────────────── */
  JWT_SECRET: z.string().min(rahasiaMinimum, `JWT_SECRET minimum ${rahasiaMinimum} karakter`),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(rahasiaMinimum, `JWT_REFRESH_SECRET minimum ${rahasiaMinimum} karakter`),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  /** Menandatangani kuki sesi. Wajib berbeda dari rahasia JWT. */
  COOKIE_SECRET: z.string().min(rahasiaMinimum, `COOKIE_SECRET minimum ${rahasiaMinimum} karakter`),

  /* ─────────────────────── Penyimpanan berkas dokumen ──────────────────── */
  /** 'lokal' menyimpan di diska peladen; 's3' ke penyimpanan objek. */
  STORAGE_DRIVER: z.enum(['lokal', 's3']).default('lokal'),
  STORAGE_LOCAL_PATH: z.string().default('./storage/dokumen'),
  /** Umur tautan unduhan bertanda tangan, dalam detik. */
  STORAGE_SIGNED_URL_TTL: z.coerce.number().int().min(30).default(300),
  UPLOAD_MAX_SIZE_MB: z.coerce.number().int().min(1).max(200).default(50),

  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),

  /* ───────────────────────────── Pencarian ─────────────────────────────── */
  /**
   * 'mysql' memakai indeks FULLTEXT bawaan — cukup untuk memulai dan tidak
   * menambah layanan baru. 'meilisearch' diaktifkan bila kualitas penelusuran
   * perlu ditingkatkan (docs/07-rekomendasi-teknis.md § G.4).
   */
  SEARCH_DRIVER: z.enum(['mysql', 'meilisearch']).default('mysql'),
  MEILISEARCH_HOST: z.string().optional(),
  MEILISEARCH_API_KEY: z.string().optional(),

  /* ───────────────────────────── Cache/antrean ─────────────────────────── */
  /** 'memori' cukup untuk satu proses. Beralih ke 'redis' saat menjalankan banyak proses. */
  CACHE_DRIVER: z.enum(['memori', 'redis']).default('memori'),
  REDIS_URL: z.string().optional(),

  /* ──────────────────────────────── Surel ──────────────────────────────── */
  /** 'log' hanya mencetak surel ke log — aman dipakai saat pengembangan. */
  MAIL_DRIVER: z.enum(['log', 'smtp']).default('log'),
  MAIL_HOST: z.string().optional(),
  MAIL_PORT: z.coerce.number().int().optional(),
  MAIL_USER: z.string().optional(),
  MAIL_PASSWORD: z.string().optional(),
  MAIL_FROM_ADDRESS: z.string().default('jdih@ith.ac.id'),
  MAIL_FROM_NAME: z.string().default('JDIH ITH Parepare'),

  /* ───────────────────────── Pembatasan laju & log ─────────────────────── */
  /** Batas umum per IP, dalam jendela waktu tertentu (detik). */
  THROTTLE_TTL: z.coerce.number().int().min(1).default(60),
  THROTTLE_LIMIT: z.coerce.number().int().min(1).default(120),
  /** Batas unduhan per jam: pengunjung anonim dan pengguna terautentikasi. */
  UNDUH_LIMIT_ANONIM: z.coerce.number().int().min(1).default(30),
  UNDUH_LIMIT_PENGGUNA: z.coerce.number().int().min(1).default(200),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  /** Mempercantik log agar terbaca manusia. Matikan di produksi (log JSON). */
  LOG_PRETTY: bolean.default(true),

  /* ───────────────────────── Integrasi luar (opsional) ─────────────────── */
  SWAGGER_ENABLED: bolean.default(true),
  JDIHN_ENABLED: bolean.default(false),
  JDIHN_API_URL: z.string().optional(),
  JDIHN_API_KEY: z.string().optional(),
  SSO_ENABLED: bolean.default(false),
  SSO_ISSUER_URL: z.string().optional(),
  SSO_CLIENT_ID: z.string().optional(),
  SSO_CLIENT_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof skemaEnv>;

/**
 * Aturan silang antarvariabel: hal-hal yang tidak dapat dinyatakan pada satu
 * ruas, misalnya "bila pengandar S3 dipilih, parameternya wajib ada".
 */
export const skemaEnvLengkap = skemaEnv
  .refine(
    (env) =>
      env.STORAGE_DRIVER !== 's3' ||
      (!!env.S3_ENDPOINT && !!env.S3_BUCKET && !!env.S3_ACCESS_KEY && !!env.S3_SECRET_KEY),
    {
      message:
        'STORAGE_DRIVER=s3 memerlukan S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY, dan S3_SECRET_KEY',
      path: ['STORAGE_DRIVER'],
    },
  )
  .refine((env) => env.SEARCH_DRIVER !== 'meilisearch' || !!env.MEILISEARCH_HOST, {
    message: 'SEARCH_DRIVER=meilisearch memerlukan MEILISEARCH_HOST',
    path: ['SEARCH_DRIVER'],
  })
  .refine((env) => env.CACHE_DRIVER !== 'redis' || !!env.REDIS_URL, {
    message: 'CACHE_DRIVER=redis memerlukan REDIS_URL',
    path: ['CACHE_DRIVER'],
  })
  .refine((env) => env.MAIL_DRIVER !== 'smtp' || (!!env.MAIL_HOST && !!env.MAIL_PORT), {
    message: 'MAIL_DRIVER=smtp memerlukan MAIL_HOST dan MAIL_PORT',
    path: ['MAIL_DRIVER'],
  })
  .refine((env) => env.JWT_SECRET !== env.JWT_REFRESH_SECRET, {
    message:
      'JWT_SECRET dan JWT_REFRESH_SECRET harus berbeda; bila sama, token penyegar ' +
      'dapat dipakai sebagai token akses',
    path: ['JWT_REFRESH_SECRET'],
  })
  .refine((env) => env.COOKIE_SECRET !== env.JWT_SECRET, {
    message: 'COOKIE_SECRET harus berbeda dari JWT_SECRET',
    path: ['COOKIE_SECRET'],
  })
  .refine((env) => env.NODE_ENV !== 'production' || !env.SWAGGER_ENABLED, {
    message:
      'SWAGGER_ENABLED harus false di produksi; dokumentasi API terbuka memudahkan ' +
      'pemetaan permukaan serang',
    path: ['SWAGGER_ENABLED'],
  })
  .refine((env) => env.NODE_ENV !== 'production' || env.DB_PASSWORD.length > 0, {
    message: 'DB_PASSWORD tidak boleh kosong di produksi',
    path: ['DB_PASSWORD'],
  });

/**
 * Memvalidasi process.env. Dipanggil ConfigModule saat modul akar dimuat.
 * Melempar galat berisi daftar seluruh masalah sekaligus, bukan satu per satu.
 */
export function validasiEnv(mentah: Record<string, unknown>): Env {
  const hasil = skemaEnvLengkap.safeParse(mentah);

  if (!hasil.success) {
    const baris = hasil.error.issues.map((masalah) => {
      const ruas = masalah.path.join('.') || '(akar)';
      return `  - ${ruas}: ${masalah.message}`;
    });
    throw new Error(
      `Konfigurasi lingkungan tidak sah. Periksa berkas .env pada apps/api.\n` +
        `${baris.join('\n')}\n\n` +
        `Salin apps/api/.env.example menjadi apps/api/.env lalu isi nilainya.`,
    );
  }

  return hasil.data;
}
