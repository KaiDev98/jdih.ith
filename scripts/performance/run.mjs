import { readFile, appendFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { monitorEventLoopDelay } from 'node:perf_hooks';
import https from 'node:https';
import http from 'node:http';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { forwardRequest } from './proxy-request.mjs';

const workspace = resolve('.'), root = resolve('test-results/performance-local');
const marker = JSON.parse(await readFile(resolve(root, 'marker.json'), 'utf8'));
const environment = JSON.parse(await readFile(resolve(root, 'env.private.json'), 'utf8'));
if (marker.data !== resolve(root, 'mysql-data') || environment.DB_PORT !== '3309' || environment.DB_NAME !== 'jdih_ith_v2_prod') throw new Error('Invalid disposable production instance');
Object.assign(process.env, environment, { NEXT_TELEMETRY_DISABLED: '1' });
const service = process.argv[2];
if (!['api', 'web', 'gateway'].includes(service)) throw new Error('Use run.mjs api|web|gateway');
const histogram = monitorEventLoopDelay({ resolution: 20 }); histogram.enable();
let prior = process.cpuUsage(), priorAt = Date.now();
const timer = setInterval(() => {
  const at = Date.now(), cpu = process.cpuUsage(), usage = process.memoryUsage();
  const row = { at, service, pid: process.pid, rssMiB: usage.rss / 1048576, heapMiB: usage.heapUsed / 1048576, cpuPct: 100 * ((cpu.user - prior.user) + (cpu.system - prior.system)) / ((at - priorAt) * 1000), loopP99Ms: histogram.percentile(99) / 1e6, loopMaxMs: histogram.max / 1e6 };
  prior = cpu; priorAt = at; histogram.reset();
  void appendFile(resolve(root, `${service}-metrics.jsonl`), JSON.stringify(row) + '\n');
}, 1000); timer.unref();
if (service === 'api') {
  process.chdir(resolve(workspace, 'backend'));
  await import(pathToFileURL(resolve(workspace, 'backend/dist/main.js')).href);
} else if (service === 'web') {
  process.env.PORT = '3400'; process.env.HOSTNAME = '127.0.0.1';
  await import(pathToFileURL(resolve(workspace, 'frontend/.next/standalone/frontend/server.js')).href);
} else {
  const agent = new http.Agent({ keepAlive: true, maxSockets: 128 });
  const server = https.createServer({ key: await readFile(resolve(root, 'tls.key')), cert: await readFile(resolve(root, 'tls.crt')) }, (req, res) => {
    if (!['localhost:3443', '127.0.0.1:3443'].includes(req.headers.host)) { res.writeHead(400); res.end(); return; }
    // Isolated harness only. A keyed marker models independent visitors through
    // a trusted reverse proxy. Never deploy this synthetic-address gateway.
    const client = String(req.headers['x-perf-client'] ?? '');
    const proof = String(req.headers['x-perf-proof'] ?? '');
    const expected = createHmac('sha256', environment.SESSION_KEY).update(client).digest('hex');
    const simulated = /^\d{1,4}$/.test(client) && proof.length === expected.length && timingSafeEqual(Buffer.from(proof), Buffer.from(expected));
    const clientIp = simulated ? `198.18.${Math.floor(Number(client) / 250)}.${1 + Number(client) % 250}` : '127.0.0.1';
    const headers = { ...req.headers, 'x-forwarded-for': clientIp, 'x-forwarded-proto': 'https', 'x-forwarded-host': req.headers.host };
    delete headers['x-perf-client']; delete headers['x-perf-proof'];
    forwardRequest(req, res, { host: '127.0.0.1', port: req.url.startsWith('/api/v1/') ? 3401 : 3400, path: req.url, method: req.method, headers, agent }, error => {
      console.error(JSON.stringify({ at: Date.now(), event: 'local_gateway_upstream_error', path: req.url.split('?')[0], method: req.method, ...error }));
    });
  });
  server.keepAliveTimeout = 65000; server.headersTimeout = 66000;
  server.listen(3443, '127.0.0.1', () => console.log('Disposable TLS gateway ready on https://localhost:3443'));
}
