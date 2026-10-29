import mysql from 'mysql2/promise';
import { readFile, writeFile, mkdir, link, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash, randomUUID, randomBytes } from 'node:crypto';
import { fixturePdf } from './fixture-pdf.mjs';
process.on('uncaughtException', error => { console.error('File fixture failed:', error.code ?? error.name); process.exit(1); });
const root = resolve('test-results/performance-local');
const marker = JSON.parse(await readFile(resolve(root, 'marker.json'), 'utf8'));
const env = JSON.parse(await readFile(resolve(root, 'env.private.json'), 'utf8'));
const db = await mysql.createConnection({ host: '127.0.0.1', port: 3309, user: env.DB_USER, password: env.DB_PASSWORD, database: marker.db });
try {
  const [[server]] = await db.query('SELECT @@datadir dir,@@port port,VERSION() version');
  if (resolve(server.dir) !== resolve(root, 'mysql-data') || Number(server.port) !== 3309 || marker.db !== 'jdih_ith_v2_prod') throw new Error('Non-disposable database');
  await db.query("SET time_zone='+00:00'");
  const [[existing]] = await db.query('SELECT COUNT(*) n FROM dokumen_berkas');
  if (Number(existing.n)) throw new Error('File fixture already exists; never overwrite it');
  try { await access(resolve(root, 'sessions.private.json')); } catch {
    const [accounts] = await db.query('SELECT u.id,p.kode role FROM pengguna u JOIN pengguna_peran pp ON pp.pengguna_id=u.id JOIN peran p ON p.id=pp.peran_id');
    const sessions = [];
    for (const user of accounts) {
      const token = randomBytes(32).toString('base64url');
      await db.query('INSERT INTO sesi_pengguna(pengguna_id,token_hash,expires_at) VALUES(?,?,UTC_TIMESTAMP(6)+INTERVAL 6 HOUR)', [user.id, createHash('sha256').update(token).digest()]);
      sessions.push({ id: String(user.id), role: user.role, token });
    }
    await writeFile(resolve(root, 'sessions.private.json'), JSON.stringify(sessions), { mode: 0o600 });
  }
  const file = fixturePdf();
  const checksum = createHash('sha256').update(file).digest();
  const seedRoot = resolve(env.STORAGE_LOCAL_PATH, '.fixture-content');
  await mkdir(seedRoot, { recursive: true });
  for (let i = 0; i < 256; i++) await mkdir(resolve(env.STORAGE_LOCAL_PATH, 'objects', i.toString(16).padStart(2, '0')), { recursive: true });
  const [versions] = await db.query('SELECT id,created_by FROM dokumen_versi ORDER BY id');
  for (let start = 0; start < versions.length; start += 500) {
    // 500 links per seed stays below NTFS's per-file hard-link limit. Unique
    // storage keys preserve the production schema without allocating 10 GiB.
    const seed = resolve(seedRoot, String(start));
    await writeFile(seed, file, { flag: 'wx' });
    const rows = [];
    for (const version of versions.slice(start, start + 500)) {
      const uuid = randomUUID(), key = `objects/${uuid.slice(0, 2)}/${uuid}`;
      await link(seed, resolve(env.STORAGE_LOCAL_PATH, key));
      rows.push([version.id, version.created_by, 'UTAMA', key, 'uji-beban.pdf', 'application/pdf', file.length, checksum, 0]);
    }
    await db.query('INSERT INTO dokumen_berkas(dokumen_versi_id,uploaded_by,jenis_berkas,storage_key,nama_asli,mime_type,size_bytes,checksum,urutan) VALUES ?', [rows]);
  }
  await db.query("INSERT INTO kunjungan_harian(tanggal,jumlah) VALUES('2026-10-01',1000) ON DUPLICATE KEY UPDATE jumlah=1000");
  const [[sample]] = await db.query('SELECT CAST(id AS CHAR) id FROM dokumen_berkas WHERE dokumen_versi_id=1');
  await writeFile(resolve(root, 'fixture.json'), JSON.stringify({ marker: marker.id, documents: versions.length, accounts: 100, fileBytes: file.length, fileId: sample.id, files: versions.length, mysqlVersion: server.version }));
  console.log('Disposable production fixture ready: 10,000 documents/files, 100 accounts, 1 MiB per file (deduplicated disk content).');
} finally { await db.end(); }
