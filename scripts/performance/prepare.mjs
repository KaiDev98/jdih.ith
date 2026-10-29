import { mkdir, writeFile, access } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { connect } from 'node:net';

export const root = resolve('test-results/performance-local');
const workspace = resolve('.');
if (!root.startsWith(workspace + sep)) throw new Error('Unsafe performance workspace');
const mysqlPath = process.argv[process.argv.indexOf('--mysqld') + 1];
if (!process.argv.includes('--mysqld') || !mysqlPath) throw new Error('Provide --mysqld /absolute/path/to/mysqld');
const data = resolve(root, 'mysql-data');
try { await access(data); throw new Error('The disposable MySQL data directory already exists. Reuse its existing configuration; never overwrite it.'); }
catch (e) { if (e.code !== 'ENOENT') throw e; }
await new Promise((done, reject) => { const s = connect({ host: '127.0.0.1', port: 3309 }); s.once('connect', () => { s.destroy(); reject(new Error('Port 3309 already occupied')); }); s.once('error', e => e.code === 'ECONNREFUSED' ? done() : reject(e)); });
await mkdir(root, { recursive: true });
const password = randomBytes(24).toString('hex');
const marker = { id: randomUUID(), data, mysqlPort: 3309, apiPort: 3401, webPort: 3400, tlsPort: 3443, db: 'jdih_ith_v2_prod' };
await writeFile(resolve(root, 'marker.json'), JSON.stringify(marker), { mode: 0o600 });
const env = { NODE_ENV: 'production', API_PORT: '3401', API_HOST: '127.0.0.1', DB_HOST: '127.0.0.1', DB_PORT: '3309', DB_NAME: marker.db, DB_USER: 'jdih_perf', DB_PASSWORD: password, DB_POOL_LIMIT: '10', APP_URL: 'https://localhost:3443', CORS_ORIGIN: 'https://localhost:3443', GOOGLE_REDIRECT_URI: 'https://localhost:3443/api/v1/auth/google/callback', GOOGLE_CLIENT_ID: 'performance-fixture-only', GOOGLE_CLIENT_SECRET: 'not-used-by-this-test', SESSION_KEY: randomBytes(48).toString('hex'), COOKIE_SECURE: 'true', LOGIN_UJI: 'false', SWAGGER_ENABLED: 'false', LOG_PRETTY: 'false', LOG_LEVEL: 'error', STORAGE_DRIVER: 'lokal', STORAGE_LOCAL_PATH: resolve(root, 'storage'), THROTTLE_LIMIT: '120', TRUST_PROXY_HOPS: '1', API_INTERNAL_URL: 'http://127.0.0.1:3401', NEXT_PUBLIC_SITE_URL: 'https://localhost:3443' };
await writeFile(resolve(root, 'env.private.json'), JSON.stringify(env), { mode: 0o600 });
await writeFile(resolve(root, 'mysql.cnf'), `[mysqld]\nbasedir=${resolve(dirname(mysqlPath), '..').replaceAll('\\', '/')}\ndatadir=${data.replaceAll('\\', '/')}\nport=3309\nbind-address=127.0.0.1\nmysqlx=OFF\ninnodb-buffer-pool-size=134217728\nmax-connections=100\nlog-error=${resolve(root, 'mysql.log').replaceAll('\\', '/')}\n`);
execFileSync(resolve(mysqlPath), ['--no-defaults', '--initialize-insecure', `--basedir=${resolve(dirname(mysqlPath), '..')}`, `--datadir=${data}`], { windowsHide: true, stdio: 'pipe' });
await import('./certificate.mjs');
console.log(JSON.stringify({ root, data, mysqlPort: marker.mysqlPort, next: 'Start mysqld with this workspace mysql.cnf, then run fixture.mjs' }));
