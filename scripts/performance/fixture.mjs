import mysql from 'mysql2/promise';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
process.on('uncaughtException', error => { console.error('Fixture failed:', error.code ?? error.name); process.exit(1); });

const root = resolve('test-results/performance-local');
const marker = JSON.parse(await readFile(resolve(root, 'marker.json'), 'utf8'));
const env = JSON.parse(await readFile(resolve(root, 'env.private.json'), 'utf8'));
if (marker.data !== resolve(root, 'mysql-data') || marker.mysqlPort !== 3309 || marker.db !== 'jdih_ith_v2_prod') throw new Error('Invalid disposable instance marker');
const db = await mysql.createConnection({ host: '127.0.0.1', port: marker.mysqlPort, user: 'root', multipleStatements: true });
try {
  const [[server]] = await db.query('SELECT @@datadir dir,@@port port,VERSION() version');
  if (resolve(server.dir) !== marker.data || Number(server.port) !== 3309 || !server.version.startsWith('8.4.')) throw new Error('Refusing non-disposable database server');
  const [databases] = await db.query('SHOW DATABASES');
  if (databases.some(row => row.Database.startsWith('jdih_'))) throw new Error('Refusing existing JDIH databases; fixture imports only into an empty disposable instance');
  await db.query('CREATE DATABASE jdih_ith_v2_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci');
  for (const path of ['database/v2/schema.sql', 'database/v2/seed.sql']) {
    const source = (await readFile(path, 'utf8')).replace(/^USE jdih_ith_v2_dev;$/m, 'USE jdih_ith_v2_prod;');
    await db.query(source);
  }
  await db.query("CREATE USER 'jdih_perf'@'127.0.0.1' IDENTIFIED BY ?", [env.DB_PASSWORD]);
  await db.query("GRANT SELECT,INSERT,UPDATE,DELETE ON jdih_ith_v2_prod.* TO 'jdih_perf'@'127.0.0.1'");
  await db.query("SET time_zone='+00:00'");
  const [types] = await db.query('SELECT id,kode FROM jenis_dokumen ORDER BY id');
  const [units] = await db.query('SELECT id,kode FROM unit_kerja WHERE aktif=1 ORDER BY id');
  const [categories] = await db.query('SELECT id,kode FROM kategori WHERE aktif=1 ORDER BY id');
  const tokens = [];
  for (let i = 1; i <= 100; i++) {
    const role = i <= 10 ? 'SUPERADMIN' : i <= 30 ? 'ADMIN' : 'DOSEN_STAF';
    await db.query("INSERT INTO pengguna(id,nama,email,status,unit_kerja_id) VALUES(?,?,?,'AKTIF',?)", [i, `Uji Beban ${i}`, `load-${i}@ith.ac.id`, units[(i - 1) % units.length].id]);
    await db.query('INSERT INTO pengguna_peran(pengguna_id,peran_id) SELECT ?,id FROM peran WHERE kode=?', [i, role]);
    const token = randomBytes(32).toString('base64url');
    await db.query('INSERT INTO sesi_pengguna(pengguna_id,token_hash,expires_at) VALUES(?,?,UTC_TIMESTAMP(6)+INTERVAL 6 HOUR)', [i, createHash('sha256').update(token).digest()]);
    tokens.push({ id: String(i), role, token });
  }
  const count = 10000;
  await writeFile(resolve(root, 'sessions.private.json'), JSON.stringify(tokens), { mode: 0o600 });
  for (let start = 1; start <= count; start += 250) {
    const documents = [], versions = [], mappings = [];
    for (let id = start; id < Math.min(start + 250, count + 1); id++) {
      const author = 11 + id % 20, type = types[id % types.length], category = categories[id % categories.length];
      const published = id % 10 !== 0;
      documents.push([id, `LOAD-${id}`, `load-${id}`, type.id, author]);
      versions.push([id, id, 1, published ? 'TERBIT' : 'DRAF', id % 4 === 0 ? 'internal' : 'publik', String(id), 2020 + id % 7, `Peraturan uji beban ${id} tentang tata kelola unit ${category.kode}`, 'Dokumen sintetis khusus pengujian performa. Tidak berisi dokumen hukum nyata.', 'PIC Uji Beban', '2026-10-01', author, published ? 1 : null, published ? '2026-10-01 00:00:00' : null, published ? 1 : null, published ? `2026-10-${String(1 + id % 25).padStart(2, '0')} 00:00:00` : null]);
      mappings.push([id, category.id]);
    }
    await db.query('INSERT INTO dokumen(id,kode_dokumen,slug,jenis_dokumen_id,created_by) VALUES ?', [documents]);
    await db.query('INSERT INTO dokumen_versi(id,dokumen_id,nomor_versi,status_workflow,tingkat_akses,nomor,tahun,judul,deskripsi,pic,tanggal_penetapan,created_by,verified_by,approved_at,published_by,published_at) VALUES ?', [versions]);
    await db.query('INSERT INTO dokumen_versi_kategori(dokumen_versi_id,kategori_id) VALUES ?', [mappings]);
  }
  await db.query("UPDATE dokumen d JOIN dokumen_versi v ON v.dokumen_id=d.id SET d.current_published_version_id=v.id WHERE v.status_workflow='TERBIT'");
  await db.query('INSERT INTO dokumen_statistik(dokumen_id,jumlah_lihat,jumlah_unduh) SELECT id,0,0 FROM dokumen');
  await db.query("INSERT INTO kunjungan_harian(tanggal,jumlah) VALUES('2026-10-01',1000)");
} finally { await db.end(); }
await import('./files-fixture.mjs');
