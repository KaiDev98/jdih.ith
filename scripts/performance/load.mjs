import https from 'node:https';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHmac } from 'node:crypto';
import os from 'node:os';

const root = resolve('test-results/performance-local');
const label = process.argv[2] ?? 'baseline';
if (!/^[a-z][a-z0-9-]*$/.test(label)) throw new Error('Invalid report label');
const env = JSON.parse(await readFile(resolve(root, 'env.private.json'), 'utf8'));
const marker = JSON.parse(await readFile(resolve(root, 'marker.json'), 'utf8'));
const fixture = JSON.parse(await readFile(resolve(root, 'fixture.json'), 'utf8'));
const sessions = JSON.parse(await readFile(resolve(root, 'sessions.private.json'), 'utf8'));
if (marker.data !== resolve(root, 'mysql-data') || fixture.marker !== marker.id || env.APP_URL !== 'https://localhost:3443') throw new Error('Refusing non-disposable target');
const agent = new https.Agent({ keepAlive: true, maxSockets: 128, rejectUnauthorized: false });
const sleep = ms => new Promise(done => setTimeout(done, ms));
const publicPaths = ['/', '/produk-hukum', '/format-persuratan', '/profil', '/kontak'];
const apiPaths = ['/api/v1/public/documents?perHalaman=15', '/api/v1/public/search/documents?perHalaman=15', '/api/v1/public/search/documents/facets', '/api/v1/public/documents/years', '/api/v1/public/master/kategori'];
const searchPaths = [
  '/api/v1/public/search/documents?q=Laboratorium&perHalaman=15',
  '/api/v1/public/search/documents/facets?q=Laboratorium',
  '/api/v1/public/search/documents?q=tata%20kelola&perHalaman=15&urut=judul',
  '/api/v1/public/search/documents?q=peraturan&halaman=20&perHalaman=15&urut=tahun_turun',
  '/api/v1/public/search/documents?q=zz-perf-no-match-20261026&perHalaman=15',
  '/api/v1/public/search/documents?q=2026&perHalaman=15',
];
const staff = sessions.filter(s => s.role === 'DOSEN_STAF');
const operators = sessions.filter(s => s.role !== 'DOSEN_STAF');
const results = [];
function request(path, client, cookie = '', range = false) {
  return new Promise(done => {
    const at = performance.now();
    const headers = { 'x-perf-client': String(client), 'x-perf-proof': createHmac('sha256', env.SESSION_KEY).update(String(client)).digest('hex'), 'accept-encoding': 'gzip', ...(cookie ? { cookie: `jdih_session=${cookie}` } : {}), ...(range ? { range: 'bytes=0-65535' } : {}) };
    const req = https.get(new URL(path, env.APP_URL), { agent, headers }, res => {
      const ttfb = performance.now() - at, chunks = [];
      let bytes = 0;
      const binary = res.headers['content-type']?.includes('application/pdf');
      res.on('data', chunk => { bytes += chunk.length; if (!binary) chunks.push(chunk); });
      res.on('end', async () => {
        let body = Buffer.concat(chunks);
        if (res.headers['content-encoding'] === 'gzip' && body.length) {
          const { gunzipSync } = await import('node:zlib'); body = gunzipSync(body);
        }
        let ok = [200, 206].includes(res.statusCode), semantic = '';
        if (ok && range && (res.statusCode !== 206 || bytes !== 65536 || !res.headers['content-range']?.startsWith('bytes 0-65535/'))) { ok = false; semantic = 'invalid_partial_content'; }
        if (ok && path.includes('/files/') && !binary) { ok = false; semantic = 'invalid_pdf'; }
        if (ok && path === '/' && !body.toString().includes('Peraturan uji beban')) { ok = false; semantic = 'homepage_missing_documents'; }
        if (ok && path.startsWith('/api/') && !binary) {
          try { const json = JSON.parse(body); if (json.sukses !== true) { ok = false; semantic = 'invalid_api_envelope'; }
            if (path.includes('zz-perf-no-match') && json.meta?.totalButir !== 0) { ok = false; semantic = 'invalid_empty_search'; }
          } catch { ok = false; semantic = 'invalid_json'; }
        }
        done({ status: res.statusCode, ok, semantic, ms: performance.now() - at, ttfb, bytes });
      });
      res.on('error', () => done({ status: 0, ok: false, semantic: 'response_error', ms: performance.now() - at, ttfb, bytes }));
    });
    req.setTimeout(15000, () => req.destroy(new Error('timeout')));
    req.on('error', () => done({ status: 0, ok: false, semantic: 'transport_error', ms: performance.now() - at, ttfb: 0, bytes: 0 }));
  });
}
const percentile = (values, p) => values.length ? values[Math.min(values.length - 1, Math.ceil(values.length * p) - 1)] : 0;
async function metrics(service, from, to) {
  try {
    const rows = (await readFile(resolve(root, `${service}-metrics.jsonl`), 'utf8')).trim().split('\n').map(s => JSON.parse(s)).filter(s => s.at >= from && s.at <= to);
    return { samples: rows.length, peakRssMiB: Math.max(0, ...rows.map(s => s.rssMiB)), peakCpuPct: Math.max(0, ...rows.map(s => s.cpuPct)), peakEventLoopP99Ms: Math.max(0, ...rows.map(s => s.loopP99Ms)) };
  } catch { return null; }
}
async function phase(name, users, seconds, mode, thinkMs) {
  const from = Date.now(), until = from + seconds * 1000, samples = [];
  const group = label.startsWith('search-') ? 5000 : results.length * 200;
  await Promise.all(Array.from({ length: users }, async (_, i) => {
    let iteration = 0;
    while (Date.now() < until) {
      let path, session;
      if (mode === 'web') path = publicPaths[(iteration + i) % publicPaths.length];
      else if (mode === 'api') path = apiPaths[(iteration + i) % apiPaths.length];
      else if (mode === 'search') path = searchPaths[(iteration + i) % searchPaths.length];
      else if (mode === 'staff') { session = staff[i % staff.length]; path = ['/api/v1/auth/me', '/api/v1/public/search/documents?perHalaman=15', '/api/v1/documents/load-4'][(iteration + i) % 3]; }
      else if (mode === 'panel') { session = operators[i % operators.length]; path = ['/api/v1/auth/me', '/api/v1/admin/documents?perHalaman=20', '/api/v1/admin/documents/notifications'][(iteration + i) % 3]; }
      else { path = `/api/v1/public/documents/load-1/files/${fixture.fileId}?mode=inline`; }
      const row = await request(path, 1 + group + i, session?.token, mode === 'range');
      samples.push({ ...row, path: path.split('?')[0] });
      iteration++;
      if (thinkMs) await sleep(thinkMs);
    }
  }));
  const to = Date.now(), latencies = samples.map(s => s.ms).sort((a, b) => a - b), ttfb = samples.map(s => s.ttfb).sort((a, b) => a - b);
  const statuses = {}, failures = {};
  for (const s of samples) { statuses[s.status] = (statuses[s.status] ?? 0) + 1; if (!s.ok) { const key = `${s.path}:${s.status}:${s.semantic}`; failures[key] = (failures[key] ?? 0) + 1; } }
  const result = { name, users, thinkMs, seconds: (to - from) / 1000, requests: samples.length, rps: samples.length * 1000 / (to - from), failures: samples.filter(s => !s.ok).length, failureRate: samples.filter(s => !s.ok).length / samples.length, statuses, failureReasons: failures, latencyMs: { p50: percentile(latencies, .5), p95: percentile(latencies, .95), p99: percentile(latencies, .99), max: latencies.at(-1) }, ttfbP95Ms: percentile(ttfb, .95), bytes: samples.reduce((n, s) => n + s.bytes, 0), api: await metrics('api', from, to), web: await metrics('web', from, to) };
  results.push(result); console.log(JSON.stringify(result));
  await writeFile(resolve(root, `${label}.json`), JSON.stringify({ label, date: new Date().toISOString(), machine: { platform: process.platform, cpu: os.cpus()[0].model, logicalCPUs: os.availableParallelism(), memoryGiB: os.totalmem() / 1073741824 }, fixture, notes: ['Local production build and compiled API on the same Windows host as the load generator.', 'Self-signed TLS trusted only by the disposable harness.', '10,000 unique file paths use hard-linked identical 1 MiB content; this is a warm storage test.', 'Measurements do not prove capacity on a different VPS or real WAN.'], results }, null, 2));
}
try {
  await request('/api/v1/kesehatan/hidup', 999);
  if (label.startsWith('search-')) {
    await phase('filtered-search', 25, 30, 'search', 300);
  } else {
  await phase('public-web', 10, 20, 'web', 300);
  await phase('public-api', 25, 20, 'api', 300);
  await phase('authenticated-panel', 20, 20, 'panel', 500);
  if (label !== 'baseline') {
    await phase('authenticated-staff', 25, 20, 'staff', 500);
    await phase('file-stream', 8, 15, 'file', 500);
    await phase('file-range', 8, 15, 'range', 500);
    await phase('burst-web', 50, 20, 'web', 500);
    await phase('recovery-web', 5, 15, 'web', 700);
    await phase('soak-api', 15, 120, 'api', 700);
  }
  }
  if (label !== 'baseline' && results.some(result => result.failures > 0)) process.exitCode = 1;
} finally { agent.destroy(); }
