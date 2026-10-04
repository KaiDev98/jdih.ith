import { skemaEnvLengkap, type Env } from './env.schema.js';

/**
 * Menyusun konfigurasi bersarang yang bertipe dari variabel lingkungan yang
 * sudah divalidasi.
 *
 * Alasan pengelompokan ini: kode modul sebaiknya membaca
 * `konfigurasi.basisData.host`, bukan `process.env.DB_HOST`. Dengan begitu
 * pengubahan nama variabel lingkungan tidak menyebar ke seluruh berkas, dan
 * tidak ada modul yang menyentuh process.env secara langsung.
 */
export function konfigurasi() {
  // ConfigModule sudah memvalidasi lebih dahulu; penguraian ini hanya untuk
  // memperoleh nilai bertipe beserta nilai bakunya.
  const env: Env = skemaEnvLengkap.parse(process.env);

  return {
    aplikasi: {
      lingkungan: env.NODE_ENV,
      produksi: env.NODE_ENV === 'production',
      port: env.API_PORT,
      host: env.API_HOST,
      prefiks: env.API_PREFIX,
      urlPortal: env.APP_URL,
      asalCorsDiizinkan: env.CORS_ORIGIN.split(',')
        .map((asal) => asal.trim())
        .filter((asal) => asal.length > 0),
      swaggerAktif: env.SWAGGER_ENABLED,
    },

    basisData: {
      host: env.DB_HOST,
      port: env.DB_PORT,
      pengguna: env.DB_USER,
      kataSandi: env.DB_PASSWORD,
      nama: env.DB_NAME,
      batasKolam: env.DB_POOL_LIMIT,
      zonaWaktu: env.DB_TIMEZONE,
      catatKueri: env.DB_LOG_QUERY,
    },

    identitas: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      redirectUri: env.GOOGLE_REDIRECT_URI,
      key: env.SESSION_KEY,
      sessionSeconds: env.SESSION_TTL_SECONDS,
      secure: env.COOKIE_SECURE,
      origin: env.APP_URL,
      proxyHops: env.TRUST_PROXY_HOPS,
    },

    penyimpanan: {
      pengandar: env.STORAGE_DRIVER,
      jalurLokal: env.STORAGE_LOCAL_PATH,
      umurTautanBertandaTangan: env.STORAGE_SIGNED_URL_TTL,
      ukuranMaksimumBita: env.UPLOAD_MAX_SIZE_MB * 1024 * 1024,
      s3: {
        titikAkhir: env.S3_ENDPOINT,
        wilayah: env.S3_REGION,
        bucket: env.S3_BUCKET,
        kunciAkses: env.S3_ACCESS_KEY,
        kunciRahasia: env.S3_SECRET_KEY,
      },
    },

    pencarian: {
      pengandar: env.SEARCH_DRIVER,
      meilisearch: {
        host: env.MEILISEARCH_HOST,
        kunciApi: env.MEILISEARCH_API_KEY,
      },
    },

    cache: {
      pengandar: env.CACHE_DRIVER,
      redisUrl: env.REDIS_URL,
    },

    surel: {
      pengandar: env.MAIL_DRIVER,
      host: env.MAIL_HOST,
      port: env.MAIL_PORT,
      pengguna: env.MAIL_USER,
      kataSandi: env.MAIL_PASSWORD,
      dariAlamat: env.MAIL_FROM_ADDRESS,
      dariNama: env.MAIL_FROM_NAME,
    },

    pembatasanLaju: {
      jendelaDetik: env.THROTTLE_TTL,
      batasUmum: env.THROTTLE_LIMIT,
      batasUnduhAnonim: env.UNDUH_LIMIT_ANONIM,
      batasUnduhPengguna: env.UNDUH_LIMIT_PENGGUNA,
    },

    log: {
      taraf: env.LOG_LEVEL,
      cantik: env.LOG_PRETTY,
    },

    integrasi: {
      jdihn: {
        aktif: env.JDIHN_ENABLED,
        urlApi: env.JDIHN_API_URL,
        kunciApi: env.JDIHN_API_KEY,
      },
      sso: {
        aktif: env.SSO_ENABLED,
        urlPenerbit: env.SSO_ISSUER_URL,
        idKlien: env.SSO_CLIENT_ID,
        rahasiaKlien: env.SSO_CLIENT_SECRET,
      },
    },
  } as const;
}

/** Bentuk seluruh konfigurasi aplikasi. Dipakai untuk mengetikkan ConfigService. */
export type KonfigurasiApp = ReturnType<typeof konfigurasi>;
