import { defineConfig } from 'drizzle-kit';

/**
 * Konfigurasi drizzle-kit — dipakai oleh perintah db:pull, db:check, dan db:studio.
 *
 * Arah kerjanya sengaja SATU ARAH: dari basis data ke TypeScript.
 *
 *   database/*.sql  ──(npm run db:import)──▶  MySQL  ──(npm run db:pull)──▶  src/database/schema/
 *
 * Perintah `generate` dan `migrate` milik drizzle-kit TIDAK dipakai pada proyek
 * ini, karena akan menjadikan berkas TypeScript sebagai sumber kebenaran skema
 * dan menyingkirkan DDL yang sudah teruji beserta pemicu, tampilan, serta kolom
 * terbangkitnya. Perubahan skema dilakukan dengan menyunting berkas SQL, lalu
 * menjalankan db:import dan db:pull kembali.
 */

// Node 24 dapat memuat berkas .env tanpa pustaka tambahan. Skrip npm selalu
// dijalankan dari direktori paket ini, sehingga './.env' sudah tepat.
try {
  process.loadEnvFile('.env');
} catch {
  // Berkas .env belum ada — nilai baku di bawah tetap dipakai, dan perintah
  // drizzle-kit akan menyebutkan sendiri bila koneksi gagal.
}

/**
 * Kredensial disusun sebagai URL koneksi, bukan ruas terpisah.
 *
 * Alasannya praktis: drizzle-kit menolak `password: ''` sebagai nilai tidak sah,
 * padahal akun root tanpa kata sandi adalah keadaan baku pemasangan XAMPP. Bentuk
 * URL menangani kata sandi kosong dengan wajar — bagiannya cukup dihilangkan.
 */
function urlKoneksi(): string {
  const host = process.env.DB_HOST ?? '127.0.0.1';
  const port = process.env.DB_PORT ?? '3306';
  const pengguna = encodeURIComponent(process.env.DB_USER ?? 'root');
  const kataSandi = process.env.DB_PASSWORD ?? '';
  const nama = process.env.DB_NAME ?? 'jdih_ith';

  const identitas = kataSandi ? `${pengguna}:${encodeURIComponent(kataSandi)}` : pengguna;
  return `mysql://${identitas}@${host}:${port}/${nama}`;
}

export default defineConfig({
  dialect: 'mysql',
  // Keluaran introspeksi dipisahkan dari berkas tulisan tangan, supaya jelas
  // mana yang boleh disunting dan mana yang akan tertimpa.
  out: './src/database/generated',
  schema: './src/database/generated/schema.ts',

  dbCredentials: {
    url: urlKoneksi(),
  },

  introspect: {
    /**
     * Nama properti TypeScript memakai camelCase, sementara nama kolom di SQL
     * tetap snake_case. Drizzle memetakan keduanya, sehingga kode terbaca wajar
     * tanpa mengubah apa pun di basis data.
     */
    casing: 'camel',
  },

  verbose: true,
  strict: true,
});
