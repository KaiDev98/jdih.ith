#!/usr/bin/env node
/**
 * Memuat skema dan data referensi ke MySQL/MariaDB.
 *
 *     npm run db:import          # memuat skema + seed (aman diulang)
 *     npm run db:reset           # menghapus basis data lebih dahulu, lalu memuat ulang
 *
 * Mengapa memanggil program mysql, bukan pustaka mysql2:
 * jdih_ith_schema.sql memakai arahan `DELIMITER $$` untuk mendefinisikan pemicu.
 * `DELIMITER` bukan pernyataan SQL, melainkan arahan yang ditafsirkan program
 * klien. Pustaka Node tidak mengenalinya dan akan gagal tepat di bagian pemicu.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const hapusLebihDahulu = process.argv.includes('--drop');

/* ───────────────────── 1. Membaca konfigurasi basis data ──────────────────── */

function bacaEnv(jalur) {
  if (!existsSync(jalur)) return {};
  const hasil = {};
  for (const baris of readFileSync(jalur, 'utf8').split(/\r?\n/)) {
    const cocok = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(baris);
    if (!cocok) continue;
    let nilai = cocok[2].trim();
    if (
      (nilai.startsWith('"') && nilai.endsWith('"')) ||
      (nilai.startsWith("'") && nilai.endsWith("'"))
    ) {
      nilai = nilai.slice(1, -1);
    }
    hasil[cocok[1]] = nilai;
  }
  return hasil;
}

const env = { ...bacaEnv(join(root, 'backend', '.env')), ...process.env };

const db = {
  host: env.DB_HOST ?? '127.0.0.1',
  port: env.DB_PORT ?? '3306',
  user: env.DB_USER ?? 'root',
  password: env.DB_PASSWORD ?? '',
  name: env.DB_NAME ?? 'jdih_ith',
};

/* ──────────────────── 2. Mencari program klien mysql ─────────────────────── */

const kandidat = [
  env.MYSQL_CLIENT,
  'C:/xampp/mysql/bin/mysql.exe',
  'C:/laragon/bin/mysql/mysql-8.0.30-winx64/bin/mysql.exe',
  'C:/Program Files/MySQL/MySQL Server 8.0/bin/mysql.exe',
  'C:/Program Files/MariaDB 11.4/bin/mysql.exe',
  '/usr/bin/mysql',
  '/usr/local/bin/mysql',
  'mysql',
].filter(Boolean);

function cariKlien() {
  for (const jalur of kandidat) {
    if (jalur !== 'mysql' && !existsSync(jalur)) continue;
    const uji = spawnSync(jalur, ['--version'], { encoding: 'utf8' });
    if (uji.status === 0) return { jalur, versi: uji.stdout.trim() };
  }
  return null;
}

const klien = cariKlien();

if (!klien) {
  console.error('GAGAL: program klien mysql tidak ditemukan.');
  console.error('');
  console.error('Pemasangan XAMPP biasanya menyediakannya di:');
  console.error('  C:\\xampp\\mysql\\bin\\mysql.exe');
  console.error('');
  console.error('Bila lokasinya berbeda, sebutkan melalui variabel lingkungan:');
  console.error('  MYSQL_CLIENT="D:/jalur/ke/mysql.exe" npm run db:import');
  process.exit(1);
}

console.log(`Klien      : ${klien.versi}`);
console.log(`Peladen    : ${db.user}@${db.host}:${db.port}`);
console.log(`Basis data : ${db.name}`);
console.log('');

/* ───────────────────────── 3. Menjalankan perintah ───────────────────────── */

function argumenDasar() {
  const arg = [`--host=${db.host}`, `--port=${db.port}`, `--user=${db.user}`];
  if (db.password) arg.push(`--password=${db.password}`);
  arg.push('--default-character-set=utf8mb4');
  return arg;
}

function jalankanSql(pernyataan, label) {
  const hasil = spawnSync(klien.jalur, [...argumenDasar(), '--execute', pernyataan], {
    encoding: 'utf8',
  });
  if (hasil.status !== 0) {
    console.error(`GAGAL pada ${label}:`);
    console.error((hasil.stderr || hasil.stdout || '').trim());
    process.exit(1);
  }
  return (hasil.stdout ?? '').trim();
}

function jalankanBerkas(namaBerkas, label, denganNamaBasisData) {
  const jalur = join(root, 'database', namaBerkas);
  if (!existsSync(jalur)) {
    console.error(`GAGAL: berkas ${namaBerkas} tidak ditemukan pada direktori database/.`);
    process.exit(1);
  }

  const arg = argumenDasar();
  if (denganNamaBasisData) arg.push(db.name);

  const hasil = spawnSync(klien.jalur, arg, {
    encoding: 'utf8',
    input: readFileSync(jalur, 'utf8'),
    maxBuffer: 64 * 1024 * 1024,
  });

  if (hasil.status !== 0) {
    console.error(`GAGAL pada ${label}:`);
    console.error((hasil.stderr || hasil.stdout || '').trim().slice(0, 4000));
    process.exit(1);
  }

  // Peringatan tetap ditampilkan: sebagian di antaranya penting, misalnya
  // pemberitahuan bahwa suatu batasan diabaikan DBMS.
  const peringatan = (hasil.stderr ?? '').trim();
  if (peringatan) console.log(`  catatan: ${peringatan.split(/\r?\n/).slice(0, 5).join(' | ')}`);

  console.log(`  selesai  ${label}`);
}

/* Uji koneksi lebih dahulu, agar pesan galatnya jelas. */
const versiPeladen = jalankanSql('SELECT VERSION();', 'uji koneksi');
console.log(`Versi peladen: ${versiPeladen.split(/\r?\n/).pop()}`);
console.log('');

if (hapusLebihDahulu) {
  console.log(`Menghapus basis data ${db.name} …`);
  jalankanSql(`DROP DATABASE IF EXISTS \`${db.name}\`;`, 'penghapusan basis data');
}

console.log('Memuat skema dan data referensi:');
// Berkas skema membuat basis datanya sendiri (CREATE DATABASE IF NOT EXISTS),
// sehingga tidak perlu disebutkan pada argumen.
jalankanBerkas('jdih_ith_schema.sql', 'jdih_ith_schema.sql', false);
jalankanBerkas('jdih_ith_seed.sql', 'jdih_ith_seed.sql', false);

/* ──────────────────────────── 4. Pemeriksaan hasil ───────────────────────── */

console.log('');
console.log('Pemeriksaan hasil:');

const rekap = jalankanSql(
  `SELECT
     (SELECT COUNT(*) FROM information_schema.tables
        WHERE table_schema='${db.name}' AND table_type='BASE TABLE') AS tabel,
     (SELECT COUNT(*) FROM information_schema.views
        WHERE table_schema='${db.name}') AS tampilan,
     (SELECT COUNT(*) FROM information_schema.table_constraints
        WHERE table_schema='${db.name}' AND constraint_type='FOREIGN KEY') AS kunci_tamu,
     (SELECT COUNT(*) FROM information_schema.triggers
        WHERE trigger_schema='${db.name}') AS pemicu,
     (SELECT COUNT(*) FROM \`${db.name}\`.izin) AS izin,
     (SELECT COUNT(*) FROM \`${db.name}\`.peran) AS peran,
     (SELECT COUNT(*) FROM \`${db.name}\`.jenis_peraturan) AS jenis_peraturan,
     (SELECT COUNT(*) FROM \`${db.name}\`.unit_kerja) AS unit_kerja;`,
  'rekapitulasi',
);

const [kepala, nilai] = rekap.split(/\r?\n/);
const kolom = kepala.split('\t');
const angka = nilai.split('\t');
const harapan = { tabel: 50, izin: 76, peran: 4 };

let semuaSesuai = true;
kolom.forEach((nama, i) => {
  const diharapkan = harapan[nama];
  const cocok = diharapkan === undefined || Number(angka[i]) === diharapkan;
  if (!cocok) semuaSesuai = false;
  const tanda = diharapkan === undefined ? ' ' : cocok ? 'v' : 'x';
  const catatan = diharapkan === undefined ? '' : `  (diharapkan ${diharapkan})`;
  console.log(`  [${tanda}] ${nama.padEnd(16)} ${String(angka[i]).padStart(4)}${catatan}`);
});

console.log('');
if (semuaSesuai) {
  console.log('Basis data siap. Langkah berikutnya: npm run db:pull');
  console.log('');
  console.log('PERINGATAN: akun superadmin pada seed memakai sidik kata sandi contoh.');
  console.log('Ganti sebelum sistem dipakai. Lihat database/jdih_ith_seed.sql bagian 16.');
} else {
  console.log('Ada jumlah yang tidak sesuai harapan. Periksa catatan di atas.');
  process.exit(1);
}
