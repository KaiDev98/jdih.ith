import https from 'node:https';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHmac, randomUUID, randomBytes } from 'node:crypto';
import mysql from 'mysql2/promise';
import { fixturePdf } from './fixture-pdf.mjs';

const root = resolve('test-results/performance-local');
const env = JSON.parse(await readFile(resolve(root, 'env.private.json')));
const marker = JSON.parse(await readFile(resolve(root, 'marker.json')));
assert.equal(env.APP_URL, 'https://localhost:3443');
assert.equal(env.DB_PORT, '3309');
assert.equal(marker.data, resolve(root, 'mysql-data'));
const sessions = JSON.parse(await readFile(resolve(root, 'sessions.private.json')));
const sa = sessions.find(x => x.role === 'SUPERADMIN');
const admin = sessions.find(x => x.role === 'ADMIN');
const db = await mysql.createConnection({ host: '127.0.0.1', port: 3309, user: 'root', database: 'jdih_ith_v2_prod' });
const agent = new https.Agent({ rejectUnauthorized: false, keepAlive: true });
const checks = [];
const pass = name => { checks.push(name); console.log('PASS ' + name); };
function request(path, { method = 'GET', session, json, body, headers = {}, csrf = true } = {}) {
  return new Promise((done, reject) => {
    const data = json === undefined ? body : Buffer.from(JSON.stringify(json));
    const client = '9701';
    const req = https.request(new URL(path, env.APP_URL), { agent, method, headers: {
      'x-perf-client': client, 'x-perf-proof': createHmac('sha256', env.SESSION_KEY).update(client).digest('hex'),
      ...(session ? { cookie: `jdih_session=${session.token}`, origin: env.APP_URL,
        ...(csrf ? { 'x-csrf-token': createHmac('sha256', env.SESSION_KEY).update('csrf:' + session.token).digest('base64url') } : {}) } : {}),
      ...(json === undefined ? {} : { 'content-type': 'application/json' }),
      ...(data ? { 'content-length': data.length } : {}), ...headers,
    } }, res => {
      const chunks = [];
      res.on('data', x => chunks.push(x));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const body = res.headers['content-type']?.includes('application/json') ? JSON.parse(buffer) : undefined;
        done({ status: res.statusCode, headers: res.headers, body, buffer });
      });
    });
    req.setTimeout(15000, () => req.destroy(new Error('Request timeout')));
    req.on('error', reject); req.end(data);
  });
}
async function data(path, options) {
  const r = await request(path, options);
  assert.ok(r.status >= 200 && r.status < 300, `${path}: HTTP ${r.status}`);
  return r.body.data;
}
try {
  const [[server]] = await db.query('SELECT @@datadir dir,@@port port');
  assert.equal(resolve(server.dir), marker.data); assert.equal(server.port, 3309);
  const [[unit]] = await db.query('SELECT CAST(id AS CHAR) id FROM unit_kerja WHERE aktif=1 AND deleted_at IS NULL LIMIT 1');
  const [[internal]] = await db.query("SELECT d.slug,CAST(f.id AS CHAR) file FROM dokumen d JOIN dokumen_versi v ON v.id=d.current_published_version_id JOIN dokumen_berkas f ON f.dokumen_versi_id=v.id WHERE v.tingkat_akses='internal' LIMIT 1");
  const [[publicDoc]] = await db.query("SELECT d.slug,CAST(f.id AS CHAR) file FROM dokumen d JOIN dokumen_versi v ON v.id=d.current_published_version_id JOIN dokumen_berkas f ON f.dokumen_versi_id=v.id WHERE v.tingkat_akses='publik' LIMIT 1");
  const stale = { token: randomBytes(32).toString('base64url') };
  for (const path of ['/api/v1/public/search/documents', '/api/v1/public/search/documents/facets', '/api/v1/public/documents/permohonan-sk', '/api/v1/letter-templates', `/api/v1/documents/${publicDoc.slug}`, `/api/v1/public/documents/${publicDoc.slug}/files/${publicDoc.file}?mode=inline`]) {
    const r = await request(path, { session: stale });
    assert.equal(r.status, 200, path);
    assert.match(r.headers['cache-control'], /no-store/, path);
  }
  for (const path of [`/api/v1/documents/${internal.slug}`, `/api/v1/public/documents/${internal.slug}/files/${internal.file}`])
    assert.equal((await request(path, { session: stale })).status, 404);
  assert.equal((await request('/api/v1/admin/documents', { session: stale })).status, 401);
  pass('Expired/unknown cookies preserve public search, templates, detail and PDF; Internal stays 404 and panel 401');
  for (const origin of [undefined, 'https://evil.invalid']) {
    const headers = origin ? { origin } : {};
    assert.equal((await request('/api/v1/auth/register/email', { method: 'POST', json: {}, headers })).status, 403);
  }
  assert.equal((await request('/api/v1/admin/master/kategori', { method: 'POST', session: sa, csrf: false, json: {} })).status, 403);
  assert.equal((await request('/api/v1/admin/master/kategori', { method: 'POST', session: admin, json: {} })).status, 403);
  assert.equal((await request('/api/v1/admin/documents?peruntukan=PERMOHONAN_SK', { session: admin })).status, 404);
  assert.equal((await request('/api/v1/admin/audit', { session: admin })).status, 403);
  pass('Same-origin/CSRF enforced; Admin cannot write global master data or read SOP SK/audit');
  const password = randomBytes(20).toString('base64url') + 'A1!';
  const input = { nama: 'Audit sintetis', email: `audit-${randomUUID()}@example.invalid`, password, konfirmasiPassword: password, unitKerjaId: unit.id };
  const malicious = await request('/api/v1/auth/register/email', { method: 'POST', json: { ...input, peran: ['SUPERADMIN'], status: 'AKTIF' }, headers: { origin: env.APP_URL } });
  assert.ok([400, 422].includes(malicious.status));
  const registered = await request('/api/v1/auth/register/email', { method: 'POST', json: input, headers: { origin: env.APP_URL } });
  assert.equal(registered.status, 201);
  const cookie = registered.headers['set-cookie'].find(x => x.startsWith('jdih_session='));
  for (const flag of ['HttpOnly', 'Secure', 'SameSite=Lax']) assert.ok(cookie.includes(flag));
  assert.ok(!cookie.includes('Domain='));
  const pending = { token: cookie.split(';')[0].slice('jdih_session='.length) };
  const me = await data('/api/v1/auth/me', { session: pending });
  assert.equal(me.pengguna.status, 'MENUNGGU_VERIFIKASI');
  assert.deepEqual(me.pengguna.peran, ['DOSEN_STAF']);
  assert.equal((await request(`/api/v1/documents/${internal.slug}`, { session: pending })).status, 404);
  assert.equal((await request('/api/v1/auth/login', { method: 'POST', json: { email: input.email, password }, headers: { origin: env.APP_URL } })).status, 401);
  await data(`/api/v1/admin/users/${me.pengguna.id}/approve`, { method: 'POST', session: sa, json: { unitKerjaId: unit.id } });
  assert.equal((await request(`/api/v1/documents/${internal.slug}`, { session: pending })).status, 200);
  await data(`/api/v1/admin/users/${me.pengguna.id}/status`, { method: 'PATCH', session: sa, json: { status: 'NONAKTIF', alasan: 'Selesai audit sintetis lokal' } });
  assert.equal((await request('/api/v1/auth/me', { session: pending })).status, 401);
  assert.equal((await request(`/api/v1/documents/${internal.slug}`, { session: pending })).status, 404);
  assert.equal((await request('/api/v1/public/search/documents', { session: pending })).status, 200);
  pass('Real password registration cannot self-promote; pending access, wrong login role, approval and immediate revocation verified over HTTPS');
  const [[type]] = await db.query("SELECT CAST(id AS CHAR) id FROM jenis_dokumen WHERE UPPER(kode)='SOP' AND aktif=1 LIMIT 1");
  const [[category]] = await db.query('SELECT CAST(id AS CHAR) id FROM kategori WHERE aktif=1 LIMIT 1');
  const suffix = randomUUID(), slug = 'audit-sk-' + suffix;
  const created = await data('/api/v1/admin/documents', { method: 'POST', session: sa, json: { kodeDokumen: 'AUDIT-' + suffix, slug, jenisDokumenId: type.id, peruntukan: 'PERMOHONAN_SK', versi: { judul: 'SOP audit sintetis lokal', deskripsi: 'Fixture audit; bukan dokumen hukum nyata.', nomor: suffix, tahun: 2026, pic: 'QA Lokal', tanggalPenetapan: '2026-10-30', tingkatAkses: 'internal', kategoriId: [category.id] } } });
  const version = `/api/v1/admin/documents/versions/${created.versionId}`;
  assert.equal((await request(`/api/v1/admin/documents/${created.id}`, { session: admin })).status, 404);
  const boundary = '----audit' + suffix;
  const upload = Buffer.concat([Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="jenisBerkas"\r\n\r\nUTAMA\r\n--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="audit.pdf"\r\nContent-Type: application/pdf\r\n\r\n`), fixturePdf(), Buffer.from(`\r\n--${boundary}--\r\n`)]);
  await data(version + '/files', { method: 'POST', session: sa, body: upload, headers: { 'content-type': 'multipart/form-data; boundary=' + boundary } });
  const impact = await data(version + '/legal-impact', { session: sa });
  const approved = await data(version + '/approve', { method: 'POST', session: sa, json: { konfirmasi: { disetujui: true, tokenKonfirmasi: impact.tokenKonfirmasi, dampak: impact.dampak } } });
  assert.equal(approved.statusWorkflow, 'TERBIT');
  assert.equal((await request(`/api/v1/documents/${slug}`)).status, 404);
  assert.equal((await request(`/api/v1/documents/${slug}`, { session: sa })).status, 200);
  assert.ok(!(await data('/api/v1/public/documents/permohonan-sk')).some(x => x.slug === slug));
  await data(`/api/v1/admin/documents/${created.id}/withdraw`, { method: 'POST', session: sa, json: { alasan: 'Selesai audit sintetis lokal' } });
  pass('Superadmin-only SOP SK approval publishes atomically, preserves Internal access and can be withdrawn');
  for (const path of ['/api/v1/auth/uji/SUPERADMIN', '/api/v1/docs', '/api/v1/public/master/constructor']) assert.equal((await request(path)).status, 404);
  pass('Production test login, Swagger and non-allowlisted master table unavailable');
  await writeFile(resolve(root, 'release-security.json'), JSON.stringify({ date: new Date().toISOString(), checks }, null, 2));
} finally { agent.destroy(); await db.end(); }
