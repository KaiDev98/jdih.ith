#!/usr/bin/env node
/**
 * Memeriksa kesiapan lingkungan pengembangan.
 *
 *     npm run doctor
 *
 * Memeriksa satu per satu hal yang biasanya menjadi penyebab "kok tidak jalan",
 * lalu menyebutkan tindakan perbaikannya. Tidak mengubah apa pun.
 */
import { createConnection } from 'node:net';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const hasil = [];
const catat = (nama, keadaan, keterangan, perbaikan) =>
  hasil.push({ nama, keadaan, keterangan, perbaikan });

/* ─────────────────────────────── Perkakas ─────────────────────────────────── */

const versiNode = process.versions.node;
const mayorNode = Number(versiNode.split('.')[0]);
catat(
  'Node.js',
  mayorNode >= 20 ? 'ok' : 'gagal',
  `v${versiNode}`,
  mayorNode >= 20 ? undefined : 'Perlu Node 20.9 atau lebih baru (Next 16 mensyaratkannya).',
);

/* ─────────────────────────── Berkas konfigurasi ───────────────────────────── */

function bacaEnv(jalur) {
  if (!existsSync(jalur)) return null;
  const hasilEnv = {};
  for (const baris of readFileSync(jalur, 'utf8').split(/\r?\n/)) {
    const cocok = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(baris);
    if (cocok) hasilEnv[cocok[1]] = cocok[2].trim();
  }
  return hasilEnv;
}

const envApi = bacaEnv(join(root, 'backend', '.env'));
catat(
  'backend/.env',
  envApi ? 'ok' : 'gagal',
  envApi ? 'ada' : 'belum ada',
  envApi ? undefined : 'Jalankan: npm run setup:env',
);

const envWeb = bacaEnv(join(root, 'frontend', '.env'));
catat(
  'frontend/.env',
  envWeb ? 'ok' : 'peringatan',
  envWeb ? 'ada' : 'belum ada (nilai baku dipakai)',
  envWeb ? undefined : 'Jalankan: npm run setup:env',
);

if (envApi) {
  const contoh = ['ganti-dengan', 'ubah-ini', 'changeme'];
  const belumDiganti = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'COOKIE_SECRET'].filter((kunci) => {
    const nilai = envApi[kunci] ?? '';
    return nilai.length < 32 || contoh.some((tanda) => nilai.includes(tanda));
  });
  catat(
    'Rahasia JWT dan kuki',
    belumDiganti.length === 0 ? 'ok' : 'gagal',
    belumDiganti.length === 0
      ? 'sudah diisi nilai kuat'
      : `belum diganti: ${belumDiganti.join(', ')}`,
    belumDiganti.length === 0 ? undefined : 'Jalankan: npm run setup:env -- --paksa',
  );
}

/* ───────────────────────── Paket kontrak bersama ──────────────────────────── */

const sharedTerbangun = existsSync(join(root, 'packages', 'shared', 'dist', 'index.js'));
catat(
  '@jdih/shared terbangun',
  sharedTerbangun ? 'ok' : 'gagal',
  sharedTerbangun ? 'dist/ tersedia' : 'dist/ belum ada',
  sharedTerbangun ? undefined : 'Jalankan: npm run build:shared',
);

const skemaDrizzle = join(root, 'backend', 'src', 'database', 'generated', 'schema.ts');
catat(
  'Skema Drizzle',
  existsSync(skemaDrizzle) ? 'ok' : 'peringatan',
  existsSync(skemaDrizzle) ? 'sudah dibangkitkan' : 'belum dibangkitkan',
  existsSync(skemaDrizzle) ? undefined : 'Jalankan: npm run db:import lalu npm run db:pull',
);

/* ──────────────────────────── Ketersediaan porta ──────────────────────────── */

function periksaPorta(host, porta, batasMs = 1200) {
  return new Promise((selesai) => {
    const sambungan = createConnection({ host, port: porta });
    const tutup = (terbuka) => {
      sambungan.destroy();
      selesai(terbuka);
    };
    sambungan.setTimeout(batasMs);
    sambungan.once('connect', () => tutup(true));
    sambungan.once('timeout', () => tutup(false));
    sambungan.once('error', () => tutup(false));
  });
}

const hostDb = envApi?.DB_HOST ?? '127.0.0.1';
const portaDb = Number(envApi?.DB_PORT ?? 3306);

const dbHidup = await periksaPorta(hostDb, portaDb);
catat(
  'MySQL / MariaDB',
  dbHidup ? 'ok' : 'gagal',
  dbHidup ? `menjawab pada ${hostDb}:${portaDb}` : `tidak menjawab pada ${hostDb}:${portaDb}`,
  dbHidup ? undefined : 'Nyalakan MySQL dari XAMPP Control Panel, lalu ulangi.',
);

const apiHidup = await periksaPorta('127.0.0.1', Number(envApi?.API_PORT ?? 3001));
catat(
  'Peladen API',
  'info',
  apiHidup ? 'sedang berjalan pada porta 3001' : 'porta 3001 kosong (belum dijalankan)',
);

const webHidup = await periksaPorta('127.0.0.1', 3000);
catat(
  'Aplikasi web',
  'info',
  webHidup ? 'sedang berjalan pada porta 3000' : 'porta 3000 kosong (belum dijalankan)',
);

/* ──────────────────────────────── Laporan ─────────────────────────────────── */

const lambang = { ok: '[ v ]', gagal: '[ x ]', peringatan: '[ ! ]', info: '[ i ]' };

console.log('');
console.log('PEMERIKSAAN LINGKUNGAN — PORTAL JDIH ITH');
console.log('='.repeat(72));

for (const butir of hasil) {
  console.log(`${lambang[butir.keadaan]} ${butir.nama.padEnd(26)} ${butir.keterangan}`);
  if (butir.perbaikan) console.log(`      -> ${butir.perbaikan}`);
}

const gagal = hasil.filter((b) => b.keadaan === 'gagal');
console.log('='.repeat(72));

if (gagal.length === 0) {
  console.log('Semua pemeriksaan wajib lolos. Jalankan: npm run dev');
} else {
  console.log(`${gagal.length} pemeriksaan wajib belum lolos. Ikuti saran di atas.`);
  process.exitCode = 1;
}
console.log('');
