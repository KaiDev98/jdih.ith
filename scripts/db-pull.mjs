#!/usr/bin/env node
/**
 * Membangkitkan skema Drizzle dari basis data melalui introspeksi.
 *
 *     npm run db:pull
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  MENGAPA SKRIP INI ADA, BUKAN LANGSUNG MEMANGGIL drizzle-kit pull
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  Pada MariaDB, `drizzle-kit pull` GAGAL TANPA PESAN GALAT apa pun bila basis
 *  data memuat batasan CHECK. Penyebabnya sudah dilacak sampai baris kodenya:
 *  drizzle-kit menjalankan kueri
 *
 *      SELECT tc.table_name, tc.constraint_name, cc.check_clause FROM ...
 *
 *  lalu membaca hasilnya dengan kunci HURUF BESAR `row["CONSTRAINT_NAME"]`.
 *  MySQL mengembalikan label kolom information_schema dalam huruf besar,
 *  sedangkan MariaDB mengembalikannya sesuai yang ditulis pada kueri — huruf
 *  kecil. Akibatnya nama batasan menjadi `undefined`, pembangkitan kode
 *  melemparkan galat, dan prosesnya keluar dengan kode 1 tanpa mencetak apa pun.
 *
 *  Skema Portal JDIH ITH memuat 33 batasan CHECK, dan batasan itu adalah bagian
 *  dari jaminan kebenarannya — bukan hiasan yang boleh dibuang. Selain itu,
 *  MariaDB mewujudkan kolom JSON sebagai LONGTEXT ditambah CHECK `json_valid()`
 *  otomatis, sehingga jumlahnya bertambah sendiri.
 *
 *  Jalan keluar yang dipakai: introspeksi dijalankan pada SALINAN STRUKTUR
 *  sementara yang batasan CHECK-nya dilepas. Basis data sungguhan tidak pernah
 *  disentuh, dan seluruh 33 batasan tetap ditegakkan di sana. Tipe TypeScript
 *  yang dihasilkan sama saja, sebab Drizzle memang tidak memakai batasan CHECK
 *  untuk apa pun selain perintah `generate`/`push` — dan kedua perintah itu
 *  sengaja tidak dipakai pada proyek ini (berkas SQL yang menjadi sumber
 *  kebenaran skema, bukan berkas TypeScript).
 *
 *  Pada MySQL 8 bug tersebut tidak muncul, sehingga skrip ini mendeteksi jenis
 *  peladen dan melakukan introspeksi langsung tanpa salinan.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

import { rapikanSkema } from './lib/rapikan-skema.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dirApi = join(root, 'backend');

/* ─────────────────────────── Konfigurasi ─────────────────────────────────── */

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

const env = { ...bacaEnv(join(dirApi, '.env')), ...process.env };

const db = {
  host: env.DB_HOST ?? '127.0.0.1',
  port: env.DB_PORT ?? '3306',
  user: env.DB_USER ?? 'root',
  password: env.DB_PASSWORD ?? '',
  name: env.DB_NAME ?? 'jdih_ith',
};

const namaSalinan = `${db.name}__introspeksi`;

/* ─────────────────────── Menemukan program klien ─────────────────────────── */

function cariProgram(nama) {
  const kandidat = [
    env.MYSQL_BIN_DIR ? join(env.MYSQL_BIN_DIR, nama) : null,
    `C:/xampp/mysql/bin/${nama}`,
    `C:/Program Files/MySQL/MySQL Server 8.0/bin/${nama}`,
    `C:/Program Files/MariaDB 11.4/bin/${nama}`,
    `/usr/bin/${nama.replace('.exe', '')}`,
    `/usr/local/bin/${nama.replace('.exe', '')}`,
    nama.replace('.exe', ''),
  ].filter(Boolean);

  for (const jalur of kandidat) {
    const uji = spawnSync(jalur, ['--version'], { encoding: 'utf8' });
    if (uji.status === 0) return jalur;
  }
  return null;
}

const klienMysql = cariProgram('mysql.exe');
const klienDump = cariProgram('mysqldump.exe');

if (!klienMysql || !klienDump) {
  console.error('GAGAL: program mysql dan/atau mysqldump tidak ditemukan.');
  console.error('Sebutkan direktorinya melalui MYSQL_BIN_DIR, contoh:');
  console.error('  MYSQL_BIN_DIR="C:/xampp/mysql/bin" npm run db:pull');
  process.exit(1);
}

function argumenSambungan() {
  const arg = [`--host=${db.host}`, `--port=${db.port}`, `--user=${db.user}`];
  if (db.password) arg.push(`--password=${db.password}`);
  return arg;
}

function jalankanSql(pernyataan, label, namaBasisData) {
  const arg = [...argumenSambungan()];
  if (namaBasisData) arg.push(namaBasisData);
  arg.push('--execute', pernyataan);

  const hasil = spawnSync(klienMysql, arg, { encoding: 'utf8' });
  if (hasil.status !== 0) {
    // Dilempar, bukan process.exit(): keluar langsung akan melewati blok
    // finally, dan salinan sementara tertinggal di peladen.
    throw new Error(`${label} gagal: ${(hasil.stderr || hasil.stdout || '').trim()}`);
  }
  return (hasil.stdout ?? '').trim();
}

/* ─────────────────── 1. Mengenali jenis peladen basis data ───────────────── */

const versi = jalankanSql('SELECT VERSION();', 'pemeriksaan versi').split(/\r?\n/).pop() ?? '';
const adalahMariaDb = /mariadb/i.test(versi);

console.log(`Peladen    : ${versi}`);
console.log(`Basis data : ${db.name}`);
console.log('');

/* ────────── 2. MySQL: introspeksi langsung, tidak perlu salinan ─────────── */

function jalankanDrizzleKit(namaBasisDataSumber) {
  // drizzle-kit dipanggil langsung melalui berkas bin-nya, bukan lewat npx
  // dengan shell. Menyalakan shell membuat argumen dirangkai sebagai teks tanpa
  // pelolosan (Node menandainya sebagai risiko keamanan, DEP0190), sekaligus
  // menghilangkan ketergantungan pada cara npx menemukan perintah, yang berbeda
  // antara Windows dan POSIX.
  const binDrizzle = join(root, 'node_modules', 'drizzle-kit', 'bin.cjs');
  const hasil = spawnSync(process.execPath, [binDrizzle, 'pull'], {
    cwd: dirApi,
    encoding: 'utf8',
    env: { ...process.env, DB_NAME: namaBasisDataSumber, DB_PORT: db.port, DB_HOST: db.host },
  });

  if (hasil.status !== 0) {
    // Keluaran drizzle-kit padat dengan bilah kemajuan dan kode warna; hanya
    // baris bermakna yang ditampilkan agar pesannya terbaca.
    const mentah = String(hasil.stdout ?? '') + String(hasil.stderr ?? '');
    const baris = mentah
      // Kode warna ANSI memang berupa karakter kendali; justru itu yang hendak
      // dibuang dari keluaran, sehingga peringatan aturan ini tidak berlaku.
      // eslint-disable-next-line no-control-regex
      .replace(/\u001b\[[0-9;?]*[A-Za-z]/g, '')
      .split(/\r?\n/)
      .map((b) => b.trim())
      .filter((b) => b.length > 0)
      .filter((b) => !/^\[.\]\s+\d+/.test(b))
      .filter((b) => !/^\[[\u2800-\u28ff]/.test(b));

    console.error('Keluaran drizzle-kit:');
    for (const b of baris.slice(-12)) {
      console.error('  ' + b);
    }
  }

  return hasil.status === 0;
}

function periksaHasil() {
  const berkas = join(dirApi, 'src', 'database', 'generated', 'schema.ts');
  if (!existsSync(berkas)) return null;
  const isi = readFileSync(berkas, 'utf8');
  return {
    berkas,
    tabel: (isi.match(/mysqlTable\(/g) ?? []).length,
    baris: isi.split('\n').length,
  };
}

/**
 * Memperbaiki kekeliruan khas MariaDB pada berkas hasil introspeksi.
 * Rincian tiap perbaikan ada pada scripts/lib/rapikan-skema.mjs.
 */
function rapikanBerkasTerbangkit() {
  const berkas = join(dirApi, 'src', 'database', 'generated', 'schema.ts');
  if (!existsSync(berkas)) return null;

  const { isi, perbaikan } = rapikanSkema(readFileSync(berkas, 'utf8'));
  writeFileSync(berkas, isi, 'utf8');
  return perbaikan;
}

if (!adalahMariaDb) {
  console.log('Peladen MySQL terdeteksi — introspeksi dijalankan langsung.');
  if (!jalankanDrizzleKit(db.name)) {
    console.error('GAGAL: drizzle-kit pull tidak berhasil.');
    process.exit(1);
  }
  const hasil = periksaHasil();
  console.log(hasil ? `OK  ${hasil.tabel} tabel ditulis ke src/database/generated/` : 'Selesai.');
  process.exit(0);
}

/* ───── 3. MariaDB: introspeksi pada salinan struktur tanpa batasan CHECK ── */

console.log('Peladen MariaDB terdeteksi.');
console.log('drizzle-kit tidak dapat membaca basis data bermuatan batasan CHECK pada MariaDB,');
console.log('sehingga introspeksi dijalankan pada salinan struktur sementara.');
console.log('');

const dirKerja = join(tmpdir(), `jdih-introspeksi-${process.pid}`);
mkdirSync(dirKerja, { recursive: true });
const jalurDump = join(dirKerja, 'struktur.sql');

let salinanDibuat = false;

/** Tidak boleh melempar galat: dijalankan pada blok finally, termasuk saat gagal. */
function bersihkan() {
  try {
    if (salinanDibuat) {
      jalankanSql(`DROP DATABASE IF EXISTS \`${namaSalinan}\`;`, 'penghapusan salinan');
    }
  } catch (galat) {
    console.error(
      `Catatan: salinan sementara \`${namaSalinan}\` gagal dihapus ` +
        `(${galat instanceof Error ? galat.message : String(galat)}). Hapus manual bila perlu.`,
    );
  }
  rmSync(dirKerja, { recursive: true, force: true });
}

try {
  /* 3a. Menyalin struktur (tanpa data, tanpa pemicu). */
  const dump = spawnSync(
    klienDump,
    [
      ...argumenSambungan(),
      '--no-data',
      '--skip-triggers',
      '--routines=false',
      '--events=false',
      db.name,
    ],
    { encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 },
  );

  if (dump.status !== 0) {
    throw new Error(`penyalinan struktur gagal: ${(dump.stderr ?? '').trim()}`);
  }

  /* 3b. Melepas seluruh batasan CHECK dari teks DDL salinan. */
  const { ddl, jumlahNamaan, jumlahJsonValid } = lepasBatasanCheck(dump.stdout);
  writeFileSync(jalurDump, ddl, 'utf8');
  console.log(`  ${jumlahNamaan} batasan CHECK bernama dilepas dari salinan`);
  console.log(`  ${jumlahJsonValid} batasan json_valid() otomatis dilepas dari salinan`);

  /* 3c. Membangun salinan. */
  jalankanSql(
    `DROP DATABASE IF EXISTS \`${namaSalinan}\`;
     CREATE DATABASE \`${namaSalinan}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,
    'pembuatan salinan',
  );

  salinanDibuat = true;

  const impor = spawnSync(klienMysql, [...argumenSambungan(), namaSalinan], {
    encoding: 'utf8',
    input: readFileSync(jalurDump, 'utf8'),
    maxBuffer: 128 * 1024 * 1024,
  });

  if (impor.status !== 0) {
    throw new Error(
      `pembangunan salinan gagal: ${(impor.stderr || impor.stdout || '').trim().slice(0, 2000)}`,
    );
  }

  const rekap = jalankanSql(
    `SELECT
       (SELECT COUNT(*) FROM information_schema.tables
          WHERE table_schema='${namaSalinan}' AND table_type='BASE TABLE') AS tabel,
       (SELECT COUNT(*) FROM information_schema.table_constraints
          WHERE constraint_schema='${namaSalinan}' AND constraint_type='CHECK') AS cek;`,
    'pemeriksaan salinan',
  );
  const [, nilaiRekap] = rekap.split(/\r?\n/);
  const [tabelSalinan, cekSalinan] = (nilaiRekap ?? '').split('\t');
  console.log(`  salinan siap: ${tabelSalinan} tabel, ${cekSalinan} batasan CHECK`);
  console.log('');

  if (Number(cekSalinan) !== 0) {
    throw new Error(`masih ada ${cekSalinan} batasan CHECK pada salinan; introspeksi pasti gagal`);
  }

  /* 3d. Introspeksi. */
  console.log('Menjalankan drizzle-kit pull …');
  if (!jalankanDrizzleKit(namaSalinan)) {
    throw new Error('drizzle-kit pull tidak berhasil meskipun batasan CHECK sudah dilepas');
  }

  const perbaikan = rapikanBerkasTerbangkit();
  if (perbaikan) {
    console.log('');
    console.log('Merapikan kekeliruan khas MariaDB pada berkas hasil introspeksi:');
    console.log(`  ${perbaikan.petikRangkapTiga} nilai baku berpetik rangkap tiga diperbaiki`);
    console.log(`  ${perbaikan.petikTerlolos} nilai baku berpetik terlolos diperbaiki`);
    console.log(`  ${perbaikan.bakuNullTeks} nilai baku "NULL" berupa teks dihapus`);
    console.log(`  ${perbaikan.fungsiSql} fungsi SQL diubah menjadi pemanggilan sql\`…\``);
    console.log(`  ${perbaikan.imporDitambahkan} pembangun kolom ditambahkan ke daftar impor`);
  }

  const hasil = periksaHasil();
  if (!hasil) {
    throw new Error('berkas src/database/generated/schema.ts tidak terbentuk');
  }

  console.log('');
  console.log(`OK  ${hasil.tabel} tabel, ${hasil.baris} baris ditulis ke:`);
  console.log('    backend/src/database/generated/schema.ts');
  console.log('    backend/src/database/generated/relations.ts');
  console.log('');
  console.log('Berkas ini sudah diekspor ulang oleh src/database/schema/index.ts,');
  console.log('sehingga seluruh tabel langsung tersedia bertipe pada DatabaseModule.');
  console.log('Periksa hasilnya: npm run typecheck --workspace @jdih/api');
} catch (galat) {
  console.error('');
  console.error(`GAGAL: ${galat instanceof Error ? galat.message : String(galat)}`);
  process.exitCode = 1;
} finally {
  bersihkan();
}

/* ───────────────────────── Transformasi teks DDL ─────────────────────────── */

/**
 * Melepas seluruh batasan CHECK dari hasil mysqldump.
 *
 * Dua bentuk yang ditangani:
 *
 *  1. Batasan tingkat tabel, satu baris tersendiri:
 *       CONSTRAINT `ck_dokumen_tahun` CHECK (`tahun` between 1945 and 2100),
 *
 *  2. Batasan sebaris pada definisi kolom, hasil perwujudan JSON oleh MariaDB:
 *       `muatan` longtext ... DEFAULT NULL CHECK (json_valid(`muatan`)),
 *
 * Penghapusan baris dapat meninggalkan koma menggantung sebelum penutup tanda
 * kurung, sehingga koma itu dibereskan pada langkah terakhir.
 */
function lepasBatasanCheck(ddl) {
  let jumlahJsonValid = 0;
  let jumlahNamaan = 0;

  // Bentuk 2 — dibereskan lebih dahulu agar tidak tercampur dengan bentuk 1.
  let hasil = ddl.replace(/\s+CHECK \(json_valid\(`[^`]+`\)\)/g, () => {
    jumlahJsonValid += 1;
    return '';
  });

  // Bentuk 1 — baris utuh berisi batasan bernama.
  hasil = hasil
    .split('\n')
    .filter((baris) => {
      if (/^\s*CONSTRAINT `[^`]+` CHECK \(/.test(baris)) {
        jumlahNamaan += 1;
        return false;
      }
      return true;
    })
    .join('\n');

  // Membereskan koma menggantung: ",\n)" menjadi "\n)".
  hasil = hasil.replace(/,(\s*\n\s*)\)/g, '$1)');

  return { ddl: hasil, jumlahNamaan, jumlahJsonValid };
}
