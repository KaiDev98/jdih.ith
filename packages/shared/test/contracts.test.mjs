import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as c from '../dist/index.js';
const ok = (schema, value) => assert.equal(schema.safeParse(value).success, true);
const bad = (schema, value) => assert.equal(schema.safeParse(value).success, false);
const cases = [
  ['access', c.skemaTingkatAkses, ['publik', 'internal'], ['terbatas', 'PUBLIK', 'rahasia']],
  [
    'workflow',
    c.skemaStatusWorkflow,
    ['DRAF', 'DIAJUKAN', 'REVISI', 'DISETUJUI', 'TERBIT', 'DITARIK'],
    ['DITOLAK', 'VERIFIKASI', 'terbit'],
  ],
  [
    'legal status',
    c.skemaStatusHukum,
    ['BERLAKU', 'DIUBAH', 'DICABUT'],
    ['BELUM_BERLAKU', 'DICABUT_SEBAGIAN', 'berlaku'],
  ],
  [
    'relation',
    c.skemaJenisRelasi,
    ['MENGUBAH', 'MENCABUT', 'DASAR_HUKUM', 'TERKAIT'],
    ['JUKNIS', 'DILAKSANAKAN_OLEH'],
  ],
  [
    'account',
    c.skemaStatusPengguna,
    ['MENUNGGU_VERIFIKASI', 'AKTIF', 'DITOLAK', 'NONAKTIF'],
    ['DITANGGUHKAN', 'aktif'],
  ],
  ['file', c.skemaJenisBerkas, ['UTAMA', 'LAMPIRAN'], ['abstrak', 'dokumen_utama']],
  ['template access', c.skemaAksesTemplate, ['PUBLIK', 'INTERNAL'], ['RAHASIA', 'publik']],
  ['template status', c.skemaStatusVersiTemplate, ['ACTIVE', 'ARCHIVED'], ['DRAF', 'active']],
  [
    'role',
    c.skemaPeran,
    ['SUPERADMIN', 'ADMIN', 'DOSEN_STAF'],
    ['PENGUNJUNG', 'VERIFIKATOR', 'admin'],
  ],
];
for (const [name, schema, accepted, rejected] of cases) {
  test(name + ' canonical values', () => {
    accepted.forEach((v) => ok(schema, v));
    rejected.forEach((v) => bad(schema, v));
    assert.equal(schema.options.length, accepted.length);
  });
}
test('enum contracts and permissions match approved physical SQL/seed', () => {
  const sql = readFileSync(new URL('../../../database/v2/schema.sql', import.meta.url), 'utf8');
  for (const [, schema] of cases.slice(0, 8))
    assert.ok(sql.includes('ENUM(' + schema.options.map((v) => "'" + v + "'").join(',') + ')'));
  const seed = readFileSync(new URL('../../../database/v2/seed.sql', import.meta.url), 'utf8');
  const block = seed.match(
    /INSERT INTO izin \(kode, nama, modul\) VALUES([\s\S]*?) AS incoming/,
  )[1];
  const codes = [...block.matchAll(/\('([^']+)',/g)].map((m) => m[1]);
  assert.deepEqual([...c.SEMUA_IZIN].sort(), codes.sort());
  assert.equal(codes.length, 26);
});
test('BIGINT JSON ids preserve precision and reject coercion', () => {
  ok(c.skemaId, '18446744073709551615');
  for (const v of [
    '18446744073709551616',
    '0',
    '-1',
    '1.2',
    'x',
    '01',
    '',
    true,
    1,
    9007199254740992,
  ])
    bad(c.skemaId, v);
});
test('calendar dates and years match DB range', () => {
  ok(c.skemaTanggal, '2024-02-29');
  for (const d of ['2023-02-29', '2026-02-30', '2026-13-01', '0000-01-01']) bad(c.skemaTanggal, d);
  ok(c.skemaTahun, 1000);
  ok(c.skemaTahun, 9999);
  bad(c.skemaTahun, 999);
});
test('registration accepts exactly one unit path', () => {
  ok(c.skemaLengkapiRegistrasi, { unitKerjaId: '1' });
  ok(c.skemaLengkapiRegistrasi, { unitManual: 'Unit baru' });
  for (const v of [{}, { unitManual: '   ' }, { unitKerjaId: '1', unitManual: 'Unit' }])
    bad(c.skemaLengkapiRegistrasi, v);
});
for (const field of [
  'role',
  'peran',
  'status',
  'password',
  'kataSandi',
  'nip',
  'nidn',
  'nomorIdentitas',
  'email',
  'googleSub',
  'verifiedBy',
])
  test('registration rejects ' + field, () =>
    bad(c.skemaLengkapiRegistrasi, { unitManual: 'Unit', [field]: 'ADMIN' }),
  );
test('registration outcome is pending staff only', () => {
  ok(c.skemaHasilRegistrasi, { id: '1', status: 'MENUNGGU_VERIFIKASI', peran: ['DOSEN_STAF'] });
  bad(c.skemaHasilRegistrasi, { id: '1', status: 'AKTIF', peran: ['ADMIN'] });
});
test('account decisions contain no role/actor authority', () => {
  ok(c.skemaSetujuiAkun, { unitKerjaId: '1' });
  bad(c.skemaSetujuiAkun, {});
  bad(c.skemaSetujuiAkun, { unitKerjaId: '1', peran: 'ADMIN' });
  bad(c.skemaTolakAkun, { alasan: ' ' });
  ok(c.skemaUbahStatusAkun, { status: 'NONAKTIF', alasan: 'Operations' });
  bad(c.skemaUbahStatusAkun, { status: 'MENUNGGU_VERIFIKASI', alasan: 'Test' });
});
const draft = { judul: 'Contoh', tingkatAkses: 'publik' };
const ready = { ...draft, nomor: '1/2026', pic: 'Bagian Hukum', tanggalPenetapan: '2026-01-01' };
test('draft permits incomplete publish metadata', () => {
  ok(c.skemaBuatVersiDokumen, draft);
  ok(c.skemaBuatVersiDokumen, { ...draft, nomor: null, pic: null, tanggalPenetapan: null });
  bad(c.skemaUbahVersiDokumen, {});
  ok(c.skemaUbahVersiDokumen, { pic: null });
});
for (const field of ['nomor', 'pic', 'tanggalPenetapan'])
  test('publish requires ' + field, () => {
    ok(c.skemaKesiapanPublikasi, ready);
    for (const value of [undefined, null, '', '   '])
      bad(c.skemaKesiapanPublikasi, { ...ready, [field]: value });
  });
test('PIC free text and limits, dates require real calendar values', () => {
  ok(c.skemaKesiapanPublikasi, { ...ready, pic: 'PIC bebas lintas unit' });
  bad(c.skemaKesiapanPublikasi, { ...ready, pic: 1 });
  bad(c.skemaKesiapanPublikasi, { ...ready, pic: 'a'.repeat(256) });
  bad(c.skemaKesiapanPublikasi, { ...ready, tanggalPenetapan: '2026-02-30' });
});
for (const field of [
  'abstrak',
  'tanggalBerlaku',
  'createdBy',
  'verifiedBy',
  'publishedBy',
  'statusWorkflow',
  'currentPublishedVersionId',
  'nomorVersi',
])
  test('draft rejects legacy/server field ' + field, () =>
    bad(c.skemaBuatVersiDokumen, { ...draft, [field]: 'x' }),
  );
test('required return/withdraw notes reject unicode whitespace', () => {
  for (const schema of [c.skemaKembalikanRevisi, c.skemaTarikDokumen]) bad(schema, {});
  bad(c.skemaKembalikanRevisi, { catatan: ' \n\t\u00a0' });
  bad(c.skemaTarikDokumen, { alasan: ' ' });
  ok(c.skemaKembalikanRevisi, { catatan: 'Perbaiki' });
  ok(c.skemaTarikDokumen, { alasan: 'Koreksi publikasi' });
});
for (const schema of [c.skemaAjukanDokumen, c.skemaSetujuiDokumen])
  test(
    'workflow command rejects actor on ' + (schema === c.skemaAjukanDokumen ? 'submit' : 'approve'),
    () => {
      ok(schema, {});
      bad(schema, { actorId: '1' });
      bad(schema, { verifiedBy: '1' });
    },
  );
const impact = {
  targetDocumentId: '2',
  statusSaatIni: 'BERLAKU',
  jenisRelasi: 'MENGUBAH',
  statusUsulan: 'DIUBAH',
};
test('legal relation contracts contain only 4 canonical relations', () => {
  for (const jenisRelasi of c.JENIS_RELASI)
    ok(c.skemaBuatRelasi, { targetDocumentId: '2', jenisRelasi });
  bad(c.skemaBuatRelasi, { targetDocumentId: '2', jenisRelasi: 'JUKNIS' });
  ok(c.skemaBuatRelasi, { targetDocumentId: '2', jenisRelasi: 'TERKAIT' });
  bad(c.skemaBuatRelasi, { targetDocumentId: '2', jenisRelasi: 'MELAKSANAKAN' });
});
test('impact requires explicit confirmation of a reviewed snapshot', () => {
  const konfirmasi = {
    tokenKonfirmasi: 'opaque-review-snapshot',
    disetujui: true,
    dampak: [impact],
  };
  ok(c.skemaTerbitkanDokumen, { konfirmasi });
  bad(c.skemaTerbitkanDokumen, {});
  bad(c.skemaTerbitkanDokumen, { konfirmasi: { ...konfirmasi, disetujui: false } });
  bad(c.skemaTerbitkanDokumen, { konfirmasi: { ...konfirmasi, tokenKonfirmasi: '' } });
  bad(c.skemaDampakHukum, { ...impact, statusUsulan: 'DICABUT' });
  ok(c.skemaDampakHukum, { ...impact, jenisRelasi: 'MENCABUT', statusUsulan: 'DICABUT' });
});
test('Secret grant optional expiry and no trusted client actors', () => {
  const v = { penggunaId: '2', alasan: 'Penugasan' };
  ok(c.skemaGrantRahasia, v);
  ok(c.skemaGrantRahasia, { ...v, expiresAt: null });
  ok(c.skemaGrantRahasia, { ...v, expiresAt: '2027-01-01T00:00:00Z' });
  bad(c.skemaGrantRahasia, { ...v, expiresAt: 'tomorrow' });
  bad(c.skemaGrantRahasia, { ...v, grantedBy: '1' });
  bad(c.skemaRevokeRahasia, { alasan: 'Cabut', revokedBy: '1' });
  bad(c.skemaRevokeRahasia, { alasan: ' ' });
});
// Pengunjung anonim hanya menerima dokumen publik; tidak ada varian Internal/Rahasia
// dan tidak ada label akses apa pun, sehingga keberadaan Internal tidak tersirat.
const publik = {
  id: '1', slug: 'aturan', judul: 'Aturan', nomor: '1', tahun: 2026, tipe: 'Peraturan Rektor',
  pic: 'Bagian Hukum', statusHukum: 'BERLAKU', tanggalPenetapan: '2026-01-01',
};
test('anonymous result has no Internal variant and no access label', () => {
  assert.equal(c.skemaHasilCariInternalAnonim, undefined);
  for (const extra of [{ badge: 'INTERNAL' }, { badge: 'PUBLIK' }, { tingkatAkses: 'internal' }])
    bad(c.skemaHasilCariAnonim, { ...publik, ...extra });
  bad(c.skemaHasilCariAnonim, { judul: 'Judul Internal', badge: 'INTERNAL' });
  bad(c.skemaCariDokumen, { tingkatAkses: 'rahasia' });
  bad(c.skemaCariDokumen, { statusWorkflow: 'DRAF' });
});
test('generic comma-list utilities preserve precision and reject invalid IDs', () => {
  assert.deepEqual(c.daftarIdTerpisahKoma.parse('1, 18446744073709551615'), [
    '1',
    '18446744073709551615',
  ]);
  assert.deepEqual(c.daftarIdTerpisahKoma.parse(['2', '3']), ['2', '3']);
  bad(c.daftarIdTerpisahKoma, '1,invalid');
  bad(c.daftarIdTerpisahKoma, [9007199254740992]);
  assert.deepEqual(c.daftarTeksTerpisahKoma.parse('a, b, ,c'), ['a', 'b', 'c']);
  assert.deepEqual(c.daftarTeksTerpisahKoma.parse(['a', 'b']), ['a', 'b']);
});
test('generic optional text keeps empty-to-undefined normalization', () => {
  assert.equal(c.teksOpsional(10).parse('  '), undefined);
  assert.equal(c.teksOpsional(10).parse(undefined), undefined);
  assert.equal(c.teksOpsional(10).parse(' text '), 'text');
  bad(c.teksOpsional(3), 'long');
});
test('search pagination rejects boolean and malformed numeric coercion', () => {
  ok(c.skemaCariDokumen, { halaman: '2', tahun: '2026', jenisDokumenId: '1' });
  bad(c.skemaCariDokumen, { halaman: true });
  bad(c.skemaCariDokumen, { tahun: '20x6' });
  bad(c.skemaCariDokumen, { perHalaman: 101 });
});
const file = {
  id: '4',
  namaAsli: 'utama.pdf',
  jenisBerkas: 'UTAMA',
  kemampuan: { preview: true, download: true },
};
const detail = {
  id: '1',
  slug: 'contoh',
  tipe: 'SOP',
  judul: 'Contoh',
  deskripsi: null,
  nomor: '1',
  tanggalPenetapan: '2026-01-01',
  statusHukum: 'BERLAKU',
  pic: 'PIC bebas',
  keteranganStatus: null,
  berkasUtama: file,
  lampiran: [],
};
test('public detail exposes six metadata fields and authorized files', () => {
  // Tampilan publik tidak memuat tingkat akses sama sekali.
  ok(c.skemaDetailDokumenPublik, detail);
  bad(c.skemaDetailDokumenPublik, { ...detail, tingkatAkses: 'publik' });
  ok(c.skemaDetailDokumenAuthorized, { ...detail, tingkatAkses: 'internal' });
  bad(c.skemaDetailDokumenAuthorized, { ...detail, tingkatAkses: 'rahasia' });
  bad(c.skemaDetailDokumenPublik, { ...detail, tingkatAkses: 'rahasia' });
});
test('detail carries optional description and status note', () => {
  const keterangan = {
    tanggal: '2026-02-01',
    alasan: 'Disesuaikan dengan peraturan baru',
    sumber: { judul: 'Peraturan Baru', slug: 'peraturan-baru', nomor: '2' },
  };
  ok(c.skemaDetailDokumenPublik, {
    ...detail,
    deskripsi: 'Ringkasan isi',
    statusHukum: 'DICABUT',
    keteranganStatus: keterangan,
  });
  // Sumber tertutup bagi peminta: alasan dan sumber kosong.
  ok(c.skemaDetailDokumenPublik, {
    ...detail,
    statusHukum: 'DIUBAH',
    keteranganStatus: { tanggal: '2026-02-01', alasan: null, sumber: null },
  });
  bad(c.skemaKeteranganStatus, { ...keterangan, sumber: { ...keterangan.sumber, tingkatAkses: 'internal' } });
  bad(c.skemaKeteranganStatus, { ...keterangan, actorId: '1' });
});
test('version description and status reason are optional; blank becomes null', () => {
  const versi = { judul: 'Contoh', tingkatAkses: 'publik' };
  ok(c.skemaBuatVersiDokumen, versi);
  assert.equal(c.skemaBuatVersiDokumen.parse({ ...versi, deskripsi: '   ' }).deskripsi, null);
  assert.equal(c.skemaBuatVersiDokumen.parse({ ...versi, deskripsi: ' Isi ' }).deskripsi, 'Isi');
  bad(c.skemaBuatVersiDokumen, { ...versi, deskripsi: 'x'.repeat(1001) });
  ok(c.skemaUbahStatusHukum, { statusHukum: 'DICABUT' });
  assert.equal(c.skemaUbahStatusHukum.parse({ statusHukum: 'DICABUT', alasan: '' }).alasan, null);
  bad(c.skemaUbahStatusHukum, { statusHukum: 'DICABUT', alasan: 'x'.repeat(1001) });
});
for (const field of [
  'createdBy',
  'verifiedBy',
  'publishedBy',
  'secretGrants',
  'storageKey',
  'checksum',
  'statusWorkflow',
])
  test('detail rejects internal field ' + field, () => {
    bad(c.skemaDetailDokumenPublik, { ...detail, [field]: '1' });
    bad(c.skemaBerkasUtama, { ...file, [field]: '1' });
  });
test('template list only title and download, no public Internal', () => {
  const item = {
    id: '1',
    slug: 'surat-tugas',
    nama: 'Surat Tugas',
    kemampuan: { download: true },
  };
  // Daftar publik tidak memuat tingkat akses apa pun, termasuk PUBLIK.
  ok(c.skemaItemTemplatePublik, item);
  bad(c.skemaItemTemplatePublik, { ...item, tingkatAkses: 'PUBLIK' });
  bad(c.skemaItemTemplatePublik, { ...item, tingkatAkses: 'INTERNAL' });
  ok(c.skemaItemTemplateAuthorized, { ...item, tingkatAkses: 'INTERNAL' });
  bad(c.skemaItemTemplateAuthorized, { ...item, tingkatAkses: 'RAHASIA' });
  for (const field of ['preview', 'statusHukum', 'pic', 'detailUrl'])
    bad(c.skemaItemTemplatePublik, { ...item, [field]: 'x' });
  bad(c.skemaItemTemplatePublik, { ...item, kemampuan: { download: true, preview: true } });
});
test('template version metadata rejects actor/state/storage assignment', () => {
  ok(c.skemaBuatVersiTemplate, { tingkatAkses: 'INTERNAL' });
  for (const field of ['createdBy', 'status', 'storageKey'])
    bad(c.skemaBuatVersiTemplate, { tingkatAkses: 'PUBLIK', [field]: 'x' });
  ok(c.skemaArsipTemplate, {});
});
test('legacy exports no longer present', () => {
  for (const name of [
    'skemaMasuk',
    'skemaDaftar',
    'skemaKataSandi',
    'skemaMintaAkses',
    'skemaPutuskanAkses',
    'bolehKelolaTingkat',
    'TRANSISI_PUBLIKASI',
    'skemaDokumenSubstansi',
  ])
    assert.equal(name in c, false);
});
