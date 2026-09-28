/**
 * Skema Drizzle Portal JDIH ITH — berkas barrel.
 *
 * Isi skema TIDAK ditulis di sini. Berkas ini hanya mengekspor ulang hasil
 * introspeksi pada `../generated/`, yang dibangkitkan dari basis data:
 *
 *     npm run db:import      # memuat DDL + data referensi ke MySQL/MariaDB
 *     npm run db:pull        # membaca basis data, menulis ../generated/
 *
 * ── Mengapa dibangkitkan, bukan ditulis tangan ───────────────────────────────
 *
 * `database/jdih_ith_schema.sql` adalah sumber kebenaran tunggal skema: 50 tabel,
 * 3 tampilan, 85 kunci tamu, 33 batasan CHECK, dan 4 pemicu, seluruhnya sudah
 * diuji eksekusi. Menulis ulang bentuk yang sama sebagai deklarasi TypeScript
 * berarti memelihara dua salinan, dan cepat atau lambat keduanya akan berbeda
 * tanpa ada yang menyadarinya. Dengan introspeksi: SQL berubah, jalankan db:pull,
 * tipe TypeScript ikut berubah — dan mustahil melenceng.
 *
 * ── Yang WAJIB diketahui saat memakai skema ini ──────────────────────────────
 *
 * 1. KOLOM TERBANGKIT bersifat baca-saja. `dokumen.nomorNormal` dan
 *    `permintaanAkses.kunciMenunggu` adalah GENERATED STORED; menyertakannya
 *    pada INSERT atau UPDATE akan ditolak MySQL. Drizzle menandainya
 *    `.generatedAlwaysAs()` sehingga pelanggaran tertangkap saat kompilasi.
 *
 * 2. `.default('NULL')` pada kedua kolom itu adalah artefak introspeksi
 *    drizzle-kit — teks "NULL" terbaca sebagai nilai baku, bukan NULL. Tidak
 *    berakibat apa pun, sebab kolom terbangkit tidak pernah ditulis aplikasi.
 *
 * 3. Batasan CHECK tidak tampil pada berkas hasil introspeksi. Seluruh 33
 *    batasan tetap ditegakkan DBMS; Drizzle hanya tidak memodelkannya. Jangan
 *    menyimpulkan bahwa aturannya hilang.
 *
 * Rujukan: docs/04-struktur-basis-data.md § D.0.1
 */

export * from '../generated/schema.js';
export * from '../generated/relations.js';
