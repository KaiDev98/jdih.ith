#!/usr/bin/env node
/**
 * Membersihkan hasil build dan cache.
 *
 *     npm run clean              # hasil build saja
 *     npm run clean -- --penuh   # termasuk node_modules
 */
import { rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const penuh = process.argv.includes('--penuh');

const sasaran = [
  'packages/shared/dist',
  'backend/dist',
  'frontend/.next',
  'frontend/out',
  '.eslintcache',
];

if (penuh) {
  sasaran.push(
    'node_modules',
    'backend/node_modules',
    'frontend/node_modules',
    'packages/shared/node_modules',
  );
}

for (const bagian of sasaran) {
  const jalur = join(root, bagian);
  if (!existsSync(jalur)) continue;
  rmSync(jalur, { recursive: true, force: true });
  console.log(`  hapus  ${bagian}`);
}

console.log('');
console.log(penuh ? 'Selesai. Jalankan: npm install' : 'Selesai. Jalankan: npm run build');
