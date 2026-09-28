#!/usr/bin/env node
/**
 * Membangkitkan packages/shared/src/permissions.ts dari database/jdih_ith_seed.sql.
 *
 * Alasan keberadaan skrip ini: daftar izin adalah kontrak antara basis data,
 * peladen, dan peramban. Bila ditulis dua kali secara manual, cepat atau lambat
 * keduanya akan berbeda dan penyebabnya sulit dilacak. Satu-satunya sumber
 * kebenaran adalah berkas seed; berkas TypeScript diturunkan darinya.
 *
 * Jalankan ulang setiap kali daftar izin pada seed berubah:  npm run gen:permissions
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const seedPath = join(root, 'database', 'jdih_ith_seed.sql');
const outPath = join(root, 'packages', 'shared', 'src', 'permissions.ts');

const sql = readFileSync(seedPath, 'utf8');

const blok = /INSERT INTO `izin`[\s\S]*?;/.exec(sql);
if (!blok) {
  console.error('GAGAL: blok "INSERT INTO `izin`" tidak ditemukan pada berkas seed.');
  process.exit(1);
}

const pola =
  /\(\s*'([a-z_]+\.[a-z_]+)'\s*,\s*'([^']*)'\s*,\s*'([a-z_]+)'\s*,\s*(TRUE|FALSE)\s*,\s*(\d+)\s*\)/g;

const izin = [...blok[0].matchAll(pola)].map((m) => ({
  kode: m[1],
  nama: m[2],
  modul: m[3],
  berdampakTinggi: m[4] === 'TRUE',
  urutan: Number(m[5]),
}));

if (izin.length === 0) {
  console.error('GAGAL: tidak ada baris izin yang cocok dengan pola.');
  process.exit(1);
}

const modul = [...new Set(izin.map((i) => i.modul))];
const konstanta = (kode) => kode.toUpperCase().replace(/[.]/g, '_');

const perModul = modul
  .map((m) => {
    const baris = izin
      .filter((i) => i.modul === m)
      .map((i) => `  ${konstanta(i.kode)}: '${i.kode}',`)
      .join('\n');
    return `  // ── Modul ${m} (${izin.filter((i) => i.modul === m).length} izin) ──\n${baris}`;
  })
  .join('\n\n');

const berdampakTinggi = izin
  .filter((i) => i.berdampakTinggi)
  .map((i) => `  '${i.kode}',`)
  .join('\n');

const katalog = izin
  .map(
    (i) =>
      `  { kode: '${i.kode}', nama: ${JSON.stringify(i.nama)}, modul: '${i.modul}', ` +
      `berdampakTinggi: ${i.berdampakTinggi}, urutan: ${i.urutan} },`,
  )
  .join('\n');

const isi = `/**
 * BERKAS INI DIBANGKITKAN OTOMATIS — JANGAN DISUNTING LANGSUNG.
 *
 * Sumber  : database/jdih_ith_seed.sql (blok INSERT INTO \`izin\`)
 * Pembangkit: scripts/gen-permissions.mjs
 * Perintah  : npm run gen:permissions
 *
 * Total ${izin.length} izin dalam ${modul.length} modul, ${izin.filter((i) => i.berdampakTinggi).length} di antaranya berdampak tinggi.
 * Rujukan: docs/05-role-permission.md § E.3
 */

/** Seluruh kode izin sistem, dikelompokkan menurut modul. */
export const IZIN = {
${perModul}
} as const;

/** Tipe gabungan seluruh kode izin yang sah. Salah tulis akan ditangkap saat kompilasi. */
export type KodeIzin = (typeof IZIN)[keyof typeof IZIN];

/** Daftar rata seluruh kode izin. */
export const SEMUA_IZIN = Object.values(IZIN) as readonly KodeIzin[];

/** Nama modul izin yang dikenal. */
export const MODUL_IZIN = ${JSON.stringify(modul)} as const;
export type ModulIzin = (typeof MODUL_IZIN)[number];

/**
 * Izin berdampak tinggi. Pemberiannya kepada suatu peran memicu konfirmasi
 * tambahan pada antarmuka (docs/05-role-permission.md § E.3).
 */
export const IZIN_BERDAMPAK_TINGGI: readonly KodeIzin[] = [
${berdampakTinggi}
];

/**
 * Izin yang dilarang secara struktural bagi peran selain Superadmin, karena
 * berpotensi menjadi jalur eskalasi hak akses (docs/05-role-permission.md § E.4).
 * Daftar putih ini ditegakkan di lapisan aplikasi, bukan hanya disembunyikan
 * pada antarmuka.
 */
export const IZIN_KHUSUS_SUPERADMIN: readonly KodeIzin[] = [
  IZIN.DOKUMEN_HAPUS_PERMANEN,
  IZIN.PENGGUNA_TETAPKAN_PERAN,
  IZIN.PERAN_KELOLA,
  IZIN.IZIN_TETAPKAN_LANGSUNG,
];

export interface MetaIzin {
  readonly kode: KodeIzin;
  readonly nama: string;
  readonly modul: ModulIzin;
  readonly berdampakTinggi: boolean;
  readonly urutan: number;
}

/** Katalog lengkap izin beserta nama tampilannya, untuk matriks izin di panel admin. */
export const KATALOG_IZIN: readonly MetaIzin[] = [
${katalog}
];

/** Mencari metadata satu izin menurut kodenya. */
export function cariIzin(kode: KodeIzin): MetaIzin | undefined {
  return KATALOG_IZIN.find((i) => i.kode === kode);
}

/** Memeriksa apakah suatu teks sembarang merupakan kode izin yang sah. */
export function adalahKodeIzin(nilai: unknown): nilai is KodeIzin {
  return typeof nilai === 'string' && (SEMUA_IZIN as readonly string[]).includes(nilai);
}
`;

writeFileSync(outPath, isi, 'utf8');
console.log(
  `OK  permissions.ts dibangkitkan: ${izin.length} izin, ${modul.length} modul, ` +
    `${izin.filter((i) => i.berdampakTinggi).length} berdampak tinggi`,
);
