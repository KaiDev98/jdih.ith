#!/usr/bin/env node
/**
 * Menyiapkan berkas .env untuk seluruh aplikasi.
 *
 * Menyalin setiap .env.example menjadi .env, lalu mengganti nilai rahasia
 * dengan nilai acak yang benar-benar kuat. Berkas .env yang SUDAH ADA tidak
 * pernah ditimpa — kecuali dijalankan dengan --paksa.
 *
 *     node scripts/setup-env.mjs
 *     node scripts/setup-env.mjs --paksa
 */
import { randomBytes } from 'node:crypto';
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const paksa = process.argv.includes('--paksa');

/** Rahasia acak 48 bita, aman dipakai pada berkas konfigurasi berbasis teks. */
const rahasia = () => randomBytes(48).toString('base64url');

/** Variabel yang nilainya harus dibangkitkan, bukan disalin dari contoh. */
const rahasiaWajib = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'COOKIE_SECRET'];

const aplikasi = [
  { nama: 'backend', contoh: 'backend/.env.example', tujuan: 'backend/.env' },
  { nama: 'frontend', contoh: 'frontend/.env.example', tujuan: 'frontend/.env' },
];

let adaPerubahan = false;

for (const { nama, contoh, tujuan } of aplikasi) {
  const jalurContoh = join(root, contoh);
  const jalurTujuan = join(root, tujuan);

  if (!existsSync(jalurContoh)) {
    console.log(`  lewati  ${nama} — ${relative(root, jalurContoh)} tidak ada`);
    continue;
  }

  if (existsSync(jalurTujuan) && !paksa) {
    console.log(`  ada     ${tujuan} — dibiarkan apa adanya (pakai --paksa untuk menimpa)`);
    continue;
  }

  copyFileSync(jalurContoh, jalurTujuan);
  let isi = readFileSync(jalurTujuan, 'utf8');

  const dibangkitkan = [];
  for (const kunci of rahasiaWajib) {
    const pola = new RegExp(`^${kunci}=.*$`, 'm');
    if (pola.test(isi)) {
      isi = isi.replace(pola, `${kunci}=${rahasia()}`);
      dibangkitkan.push(kunci);
    }
  }

  writeFileSync(jalurTujuan, isi, 'utf8');
  adaPerubahan = true;

  console.log(`  buat    ${tujuan}`);
  if (dibangkitkan.length > 0) {
    console.log(`          rahasia dibangkitkan: ${dibangkitkan.join(', ')}`);
  }
}

if (adaPerubahan) {
  console.log('');
  console.log('Selesai. Periksa nilai DB_USER dan DB_PASSWORD pada backend/.env');
  console.log('bila pemasangan MySQL Anda tidak memakai pengaturan XAMPP baku.');
}
