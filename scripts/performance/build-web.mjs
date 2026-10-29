import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const environment = JSON.parse(await readFile(resolve('test-results/performance-local/env.private.json'), 'utf8'));
if (environment.DB_PORT !== '3309' || environment.API_INTERNAL_URL !== 'http://127.0.0.1:3401') throw new Error('Invalid performance environment');
const result = spawnSync(process.platform === 'win32' ? 'cmd.exe' : 'npm', process.platform === 'win32' ? ['/d', '/s', '/c', 'npm.cmd run build --workspace @jdih/web'] : ['run', 'build', '--workspace', '@jdih/web'], { cwd: process.cwd(), env: { ...process.env, ...environment, NEXT_PUBLIC_LOGIN_UJI: 'false', NEXT_TELEMETRY_DISABLED: '1' }, windowsHide: true, stdio: 'inherit' });
process.exitCode = result.status ?? 1;
