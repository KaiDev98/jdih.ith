import assert from 'node:assert/strict';
import test from 'node:test';
import { skemaDaftarDokumenPanel } from '../dist/index.js';

test('filter panel menerima koleksi yang didukung dan mempertahankan cakupan terverifikasi', () => {
  for (const kelompok of ['PRODUK_HUKUM', 'SOP']) {
    const query = skemaDaftarDokumenPanel.parse({ kelompok, halaman: '2', perHalaman: '20' });
    assert.equal(query.kelompok, kelompok);
    assert.equal(query.halaman, 2);
    assert.equal(query.cakupan, 'TERVERIFIKASI');
  }
  assert.equal(skemaDaftarDokumenPanel.safeParse({ kelompok: 'FORMAT' }).success, false);
  assert.equal(skemaDaftarDokumenPanel.safeParse({ createdBy: '1' }).success, false);
  assert.equal(skemaDaftarDokumenPanel.safeParse({ peruntukan: 'PERMOHONAN_SK' }).success, true);
});
