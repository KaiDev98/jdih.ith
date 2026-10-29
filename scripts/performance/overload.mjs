import https from 'node:https';
import mysql from 'mysql2/promise';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHmac } from 'node:crypto';
import assert from 'node:assert/strict';

const root = resolve('test-results/performance-local');
const marker = JSON.parse(await readFile(resolve(root, 'marker.json')));
const env = JSON.parse(await readFile(resolve(root, 'env.private.json')));
assert.equal(marker.data, resolve(root, 'mysql-data'));
assert.equal(env.APP_URL, 'https://localhost:3443');
assert.equal(marker.db, 'jdih_ith_v2_prod');
// Root is only used on this new, loopback-only disposable MySQL instance.
const db = await mysql.createConnection({ host: '127.0.0.1', port: 3309, user: 'root', database: marker.db });
const agent = new https.Agent({ keepAlive: true, maxSockets: 180, rejectUnauthorized: false });
function request(client) {
  const id = String(client), start = performance.now();
  return new Promise((done, fail) => {
    const req = https.get('https://localhost:3443/api/v1/public/documents?perHalaman=15', { agent, headers: {
      'x-perf-client': id, 'x-perf-proof': createHmac('sha256', env.SESSION_KEY).update(id).digest('hex'),
    } }, res => {
      const chunks = []; res.on('data', b => chunks.push(b));
      res.on('end', () => done({ status: res.statusCode, ms: performance.now() - start, retryAfter: res.headers['retry-after'], body: Buffer.concat(chunks).toString() }));
      res.on('error', fail);
    });
    req.setTimeout(15000, () => req.destroy(new Error('Overload check timed out'))); req.on('error', fail);
  });
}
let locked = false;
try {
  const [[server]] = await db.query('SELECT @@datadir dir,@@port port');
  assert.equal(resolve(server.dir), marker.data); assert.equal(Number(server.port), 3309);
  await db.query('LOCK TABLES dokumen WRITE'); locked = true;
  // This models a slow/blocked DB without altering or stopping any real server.
  const pending = Array.from({ length: 160 }, (_, i) => request(7000 + i));
  await new Promise(done => setTimeout(done, 1500));
  const [[threads]] = await db.query("SHOW GLOBAL STATUS LIKE 'Threads_connected'");
  await db.query('UNLOCK TABLES'); locked = false;
  const results = await Promise.all(pending);
  const rejected = results.filter(r => r.status === 503);
  assert.ok(rejected.length > 0, 'Bounded queue must reject excess requests');
  assert.ok(results.every(r => r.status === 200 || r.status === 503));
  assert.ok(rejected.every(r => r.retryAfter === '1' && !r.body.includes('SELECT') && !r.body.includes('Queue limit')));
  const recovery = await request(7400); assert.equal(recovery.status, 200);
  const report = { date: new Date().toISOString(), requests: results.length, statuses: Object.fromEntries([200, 503].map(s => [s, results.filter(r => r.status === s).length])), connectionsDuringBlock: Number(threads.Value), poolLimit: Number(env.DB_POOL_LIMIT), maxLatencyMs: Math.max(...results.map(r => r.ms)), recoveryMs: recovery.ms, recovered: true };
  await writeFile(resolve(root, 'overload.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally {
  if (locked) await db.query('UNLOCK TABLES');
  await db.end(); agent.destroy();
}
