import { test } from 'node:test';
import assert from 'node:assert/strict';
import { samarkanSurel, surelUntukPanel, skemaAuthMeHttp, skemaPenggunaSesi, skemaLoginPassword } from '../dist/index.js';

test('mask email stabil, idempoten dan tidak membocorkan panjang lokal', () => {
  assert.equal(samarkanSurel('admin@ith.ac.id'), 'a***@ith.ac.id');
  assert.equal(samarkanSurel('admin.panjang@ith.ac.id'), 'a***@ith.ac.id');
  assert.equal(samarkanSurel('a@ith.ac.id'), '***@ith.ac.id');
  assert.equal(samarkanSurel('a***@ith.ac.id'), 'a***@ith.ac.id');
  assert.equal(samarkanSurel('***@ith.ac.id'), '***@ith.ac.id');
  assert.equal(samarkanSurel('tidak-valid'), '***');
  assert.equal(surelUntukPanel('admin@ith.ac.id', ['ADMIN']), 'a***@ith.ac.id');
  assert.equal(surelUntukPanel('admin@ith.ac.id', ['ADMIN', 'SUPERADMIN']), 'admin@ith.ac.id');
});

test('email sendiri terbuka berdasarkan ID; email akun lain tetap tersensor', () => {
  const surel = 'admin@ith.ac.id';
  assert.equal(surelUntukPanel(surel, ['ADMIN'], { pemilikId: '1', pelihatId: '1' }), surel);
  assert.equal(surelUntukPanel(surel, ['ADMIN'], { pemilikId: '2', pelihatId: '1' }), 'a***@ith.ac.id');
  for (const identitas of [{}, { pemilikId: '' }, { pemilikId: '', pelihatId: '' }, { pemilikId: '1' }])
    assert.equal(surelUntukPanel(surel, ['ADMIN'], identitas), 'a***@ith.ac.id');
});

test('sesi sendiri memakai email asli untuk semua peran, email tersensor bukan identitas login', () => {
  const user = { id: '1', nama: 'Admin', surel: 'admin@ith.ac.id', status: 'AKTIF', unitKerjaId: null, unitManual: null, peran: ['ADMIN'], izin: [], avatarUrl: null };
  const response = (pengguna) => ({ terautentikasi: true, pengguna, csrfToken: 'csrf' });
  const masked = { ...user, surel: 'a***@ith.ac.id' };
  assert.equal(skemaPenggunaSesi.safeParse(user).success, true);
  assert.equal(skemaPenggunaSesi.safeParse(masked).success, false);
  assert.equal(skemaAuthMeHttp.safeParse(response(masked)).success, false);
  assert.equal(skemaAuthMeHttp.safeParse(response(user)).success, true);
  assert.equal(skemaAuthMeHttp.safeParse(response({ ...user, peran: ['SUPERADMIN'] })).success, true);
  assert.equal(skemaAuthMeHttp.safeParse(response({ ...masked, peran: ['SUPERADMIN'] })).success, false);
  assert.equal(skemaLoginPassword.safeParse({ email: masked.surel, password: 'password-uji' }).success, false);
});
