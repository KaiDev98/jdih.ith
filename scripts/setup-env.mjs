#!/usr/bin/env node
/**
 * Menyiapkan berkas .env untuk seluruh aplikasi.
 *
 * Menyalin contoh konfigurasi V2, lalu mengganti nilai rahasia
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
const rahasiaWajib = ['SESSION_KEY'];

const aplikasi = [
  { nama: 'database V2', contoh: '.env.v2.example', tujuan: '.env.v2.local' },
  { nama: 'identity V2', contoh: 'backend/.env.identity.example', tujuan: 'backend/.env.identity.local' },
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
  console.log('Selesai. Isi koneksi MySQL 8 pada .env.v2.local dan konfigurasi Google');
  console.log('pada backend/.env.identity.local. Nilai rahasia tidak ditampilkan.');
}
