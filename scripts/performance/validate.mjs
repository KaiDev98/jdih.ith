import https from 'node:https';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHmac, randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
import { fixturePdf } from './fixture-pdf.mjs';

const root = resolve('test-results/performance-local');
const env = JSON.parse(await readFile(resolve(root, 'env.private.json')));
const marker = JSON.parse(await readFile(resolve(root, 'marker.json')));
const fixture = JSON.parse(await readFile(resolve(root, 'fixture.json')));
const sessions = JSON.parse(await readFile(resolve(root, 'sessions.private.json')));
assert.equal(env.APP_URL, 'https://localhost:3443');
assert.equal(marker.data, resolve(root, 'mysql-data'));
assert.equal(marker.id, fixture.marker);
const db = await mysql.createConnection({ host: '127.0.0.1', port: 3309, database: marker.db, user: env.DB_USER, password: env.DB_PASSWORD });
const agent = new https.Agent({ keepAlive: true, rejectUnauthorized: false });
const passed = [];
const check = name => { passed.push(name); console.log('PASS ' + name); };
const sa = sessions.filter(s => s.role === 'SUPERADMIN');
const admin = sessions.find(s => s.role === 'ADMIN');
const staff = sessions.find(s => s.role === 'DOSEN_STAF');
function request(path, { method = 'GET', session, json, body, headers = {} } = {}) {
  const data = json === undefined ? body : Buffer.from(JSON.stringify(json));
  const client = '9300';
  return new Promise((done, fail) => {
    const req = https.request(new URL(path, env.APP_URL), { agent, method, headers: {
      'x-perf-client': client, 'x-perf-proof': createHmac('sha256', env.SESSION_KEY).update(client).digest('hex'),
      ...(session ? { cookie: `jdih_session=${session.token}`, origin: env.APP_URL, 'x-csrf-token': createHmac('sha256', env.SESSION_KEY).update('csrf:' + session.token).digest('base64url') } : {}),
      ...(json === undefined ? {} : { 'content-type': 'application/json' }),
      ...(data ? { 'content-length': data.length } : {}), ...headers,
    } }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => { const buffer = Buffer.concat(chunks); let parsed; try { parsed = JSON.parse(buffer.toString()); } catch { /* HTML/PDF */ } done({ status: res.statusCode, headers: res.headers, buffer, json: parsed }); });
      res.on('error', fail);
    });
    req.setTimeout(15000, () => req.destroy(new Error('Validation request timed out')));
    req.on('error', fail); req.end(data);
  });
}
async function data(path, options) {
  const response = await request(path, options);
  assert.ok(response.status < 300 && response.json?.sukses === true, `${options?.method ?? 'GET'} ${path}: HTTP ${response.status} ${response.json?.galat?.pesan ?? ''}`);
  return response.json.data;
}
try {
  const [[server]] = await db.query('SELECT @@datadir dir,@@port port');
  assert.equal(resolve(server.dir), marker.data); assert.equal(Number(server.port), 3309);
  const snapshot = await data('/api/v1/public/home');
  const [counts] = await db.query("SELECT CAST(d.jenis_dokumen_id AS CHAR) id,COUNT(*) n FROM dokumen d JOIN dokumen_versi v ON v.id=d.current_published_version_id WHERE d.deleted_at IS NULL AND v.status_workflow='TERBIT' AND v.tingkat_akses='publik' GROUP BY d.jenis_dokumen_id");
  for (const type of snapshot.jenis) {
    assert.equal(type.jumlah, Number(counts.find(c => c.id === type.id)?.n ?? 0));
    const [[latest]] = await db.query("SELECT d.slug FROM dokumen d JOIN dokumen_versi v ON v.id=d.current_published_version_id WHERE d.jenis_dokumen_id=? AND d.deleted_at IS NULL AND v.status_workflow='TERBIT' AND v.tingkat_akses='publik' ORDER BY v.published_at DESC,v.id DESC LIMIT 1", [type.id]);
    assert.equal(type.dokumen?.slug ?? null, latest?.slug ?? null);
  }
  assert.ok(!JSON.stringify(snapshot).includes('tingkatAkses'));
  check('Homepage counts/latest match real SQL; private versions excluded');
  const h1 = await request('/'), h2 = await request('/');
  const nonce = h => /nonce-([^']+)/.exec(h.headers['content-security-policy'])?.[1];
  assert.ok(nonce(h1)); assert.notEqual(nonce(h1), nonce(h2));
  assert.ok(h1.buffer.toString().includes(`nonce="${nonce(h1)}"`));
  assert.match(h1.headers['cache-control'], /no-store/);
  check('HTML nonce changes on every request and HTML remains no-store');
  const search = await request('/api/v1/public/search/documents?perHalaman=5', { session: staff });
  assert.equal(search.status, 200); assert.match(search.headers['cache-control'], /private.*no-store/); assert.match(search.headers.vary, /Cookie/);
  check('Identity-dependent search cannot enter shared caches');
  assert.equal((await request('/api/v1/documents/load-4')).status, 404);
  assert.equal((await request('/api/v1/documents/load-4', { session: staff })).status, 200);
  assert.equal((await request('/api/v1/admin/documents', { session: staff })).status, 403);
  assert.equal((await request('/api/v1/admin/audit', { session: admin })).status, 403);
  assert.equal((await request('/api/v1/admin/documents/versions/1/approve', { method: 'POST', session: admin, json: {} })).status, 403);
  check('Internal documents and Admin/Superadmin permissions remain enforced');
  assert.equal((await request('/api/v1/auth/uji/superadmin')).status, 404);
  check('Production test login is disabled');
  const filePath = `/api/v1/public/documents/load-1/files/${fixture.fileId}?mode=inline`;
  const full = await request(filePath);
  assert.equal(full.status, 200); assert.equal(full.buffer.length, fixture.fileBytes); assert.equal(full.buffer.subarray(0, 5).toString(), '%PDF-');
  for (const [range, length] of [['bytes=0-65535', 65536], ['bytes=-100', 100], ['bytes=100-', fixture.fileBytes - 100]]) {
    const part = await request(filePath, { headers: { range } });
    assert.equal(part.status, 206); assert.equal(part.buffer.length, length); assert.match(part.headers['cache-control'], /private.*no-store/);
    assert.deepEqual(part.buffer, range.startsWith('bytes=-') ? full.buffer.subarray(-length) : full.buffer.subarray(range === 'bytes=100-' ? 100 : 0, range === 'bytes=100-' ? undefined : 65536));
  }
  assert.equal((await request(filePath, { headers: { range: `bytes=${fixture.fileBytes}-` } })).status, 416);
  assert.equal((await request(filePath, { headers: { range: 'bytes=0-1', 'if-range': '"old"' } })).status, 200);
  const internalId = String((await db.query('SELECT id FROM dokumen_berkas WHERE dokumen_versi_id=4'))[0][0].id);
  assert.equal((await request(`/api/v1/public/documents/load-4/files/${internalId}?mode=inline`, { headers: { range: 'bytes=0-100' } })).status, 404);
  assert.equal((await request(`/api/v1/public/documents/load-4/files/${internalId}?mode=inline`, { session: staff, headers: { range: 'bytes=0-100' } })).status, 206);
  const review = await request(`/api/v1/admin/documents/versions/1/files/${fixture.fileId}?mode=inline`, { session: sa[0], headers: { range: 'bytes=0-100' } });
  assert.equal(review.status, 206); assert.equal(review.buffer.length, 101);
  check('Public, Internal and panel PDF full/range/suffix/invalid/If-Range HTTP behavior');
  const [[category]] = await db.query('SELECT CAST(id AS CHAR) id FROM kategori WHERE aktif=1 LIMIT 1');
  const type = snapshot.jenis[0];
  const at = performance.now();
  await Promise.all(sa.slice(0, 4).map(async (session, i) => {
    const suffix = randomUUID(), slug = `perf-${suffix}`;
    const created = await data('/api/v1/admin/documents', { method: 'POST', session, json: {
      kodeDokumen: `PERF-${suffix}`, slug, jenisDokumenId: type.id,
      versi: { judul: `Peraturan uji workflow ${i}`, deskripsi: 'Data sintetis khusus validasi produksi lokal.', nomor: suffix, tahun: 2026, pic: 'Uji Performa', tanggalPenetapan: '2026-10-26', tingkatAkses: 'publik', kategoriId: [category.id] },
    } });
    const boundary = `----jdih-${suffix}`;
    const body = Buffer.concat([Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="jenisBerkas"\r\n\r\nUTAMA\r\n--${boundary}\r\nContent-Disposition: form-data; name="urutan"\r\n\r\n0\r\n--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="uji-workflow.pdf"\r\nContent-Type: application/pdf\r\n\r\n`), fixturePdf(), Buffer.from(`\r\n--${boundary}--\r\n`)]);
    const uploaded = await data(`/api/v1/admin/documents/versions/${created.versionId}/files`, { method: 'POST', session, body, headers: { 'content-type': `multipart/form-data; boundary=${boundary}` } });
    await data(`/api/v1/admin/documents/versions/${created.versionId}/approve`, { method: 'POST', session, json: {} });
    const impact = await data(`/api/v1/admin/documents/versions/${created.versionId}/legal-impact`, { session });
    await data(`/api/v1/admin/documents/versions/${created.versionId}/publish`, { method: 'POST', session, json: { konfirmasi: { tokenKonfirmasi: impact.tokenKonfirmasi, disetujui: true, dampak: impact.dampak } } });
    assert.equal((await request(`/api/v1/documents/${slug}`)).status, 200);
    const after = await data('/api/v1/public/home');
    assert.ok(after.jenis.find(t => t.id === type.id).jumlah >= type.jumlah + 1);
    await data(`/api/v1/admin/documents/${created.id}/withdraw`, { method: 'POST', session, json: { alasan: 'Selesai validasi sintetis; tarik dari publik.' } });
    assert.equal((await request(`/api/v1/documents/${slug}`)).status, 404);
    assert.equal((await request(`/api/v1/public/documents/${slug}/files/${uploaded.id}?mode=inline`, { headers: { range: 'bytes=0-1' } })).status, 404);
    const fresh = await data('/api/v1/public/home');
    assert.ok(fresh.jenis.every(t => t.dokumen?.slug !== slug));
  }));
  const workflowMs = performance.now() - at;
  assert.equal((await data('/api/v1/public/home')).jenis.find(t => t.id === type.id).jumlah, type.jumlah);
  check('Four simultaneous real create/upload/approve/publish/withdraw workflows, immediate visibility and file revocation');
  await writeFile(resolve(root, 'validation.json'), JSON.stringify({ date: new Date().toISOString(), passed, workflowMs, simultaneousWriters: 4 }, null, 2));
} finally { agent.destroy(); await db.end(); }
