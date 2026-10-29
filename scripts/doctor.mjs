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
import { parseEnv } from 'node:util';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const hasil = [];
const catat = (nama, keadaan, keterangan, perbaikan) =>
  hasil.push({ nama, keadaan, keterangan, perbaikan });

/* ─────────────────────────────── Perkakas ─────────────────────────────────── */

const versiNode = process.versions.node;
const [mayorNode, minorNode, patchNode] = versiNode.split('.').map(Number);
const nodeDidukung = (mayorNode === 24 && (minorNode > 22 || (minorNode === 22 && patchNode >= 2))) ||
  (mayorNode === 26 && minorNode >= 13);
catat(
  'Node.js',
  nodeDidukung ? 'ok' : 'gagal',
  `v${versiNode}`,
  nodeDidukung ? undefined : 'Gunakan Node LTS 24.22.2 atau versi LTS yang didukung pada package.json/.nvmrc.',
);

/* ─────────────────────────── Berkas konfigurasi ───────────────────────────── */

function bacaEnv(jalur) {
  if (!existsSync(jalur)) return null;
  return parseEnv(readFileSync(jalur, 'utf8'));
}

const envDb = bacaEnv(join(root, '.env.v2.local'));
const envIdentity = bacaEnv(join(root, 'backend', '.env.identity.local'));
const envApi = { ...envDb, ...envIdentity, ...process.env };
catat(
  'Konfigurasi API V2',
  envApi.DB_NAME && envApi.SESSION_KEY ? 'ok' : 'gagal',
  envApi.DB_NAME && envApi.SESSION_KEY ? 'tersedia (nilai tidak ditampilkan)' : 'belum lengkap',
  envApi.DB_NAME && envApi.SESSION_KEY ? undefined : 'Jalankan: npm run setup:env lalu isi konfigurasi V2.',
);

const envWeb = bacaEnv(join(root, 'frontend', '.env'));
catat(
  'frontend/.env',
  envWeb ? 'ok' : 'peringatan',
  envWeb ? 'ada' : 'belum ada (nilai baku dipakai)',
  envWeb ? undefined : 'Jalankan: npm run setup:env',
);

if (envApi.SESSION_KEY) {
  const contoh = ['ganti-dengan', 'ubah-ini', 'changeme'];
  const belumDiganti = ['SESSION_KEY'].filter((kunci) => {
    const nilai = envApi[kunci] ?? '';
    return nilai.length < 32 || contoh.some((tanda) => nilai.includes(tanda));
  });
  catat(
    'Rahasia sesi V2',
    belumDiganti.length === 0 ? 'ok' : 'gagal',
    belumDiganti.length === 0
      ? 'sudah diisi nilai kuat'
      : `belum diganti: ${belumDiganti.join(', ')}`,
    belumDiganti.length === 0 ? undefined : 'Buat SESSION_KEY acak minimal 32 karakter dalam konfigurasi privat.',
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

const skemaDrizzle = join(root, 'database', 'v2', 'schema.sql');
catat(
  'Skema SQL V2',
  existsSync(skemaDrizzle) ? 'ok' : 'peringatan',
  existsSync(skemaDrizzle) ? 'tersedia' : 'belum tersedia',
  existsSync(skemaDrizzle) ? undefined : 'Pulihkan database/v2/schema.sql dari rilis. Jangan gunakan import/reset legacy.',
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
const portaDb = Number(envApi.DB_PORT ?? 3307);

const dbHidup = await periksaPorta(hostDb, portaDb);
catat(
  'Koneksi TCP MySQL 8',
  dbHidup ? 'ok' : 'gagal',
  dbHidup ? `menjawab pada ${hostDb}:${portaDb}` : `tidak menjawab pada ${hostDb}:${portaDb}`,
  dbHidup ? undefined : 'Nyalakan MySQL 8 dan cocokkan DB_HOST/DB_PORT pada konfigurasi V2.',
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
