import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const root = resolve('test-results/performance-local');
const marker = JSON.parse(await readFile(resolve(root, 'marker.json'), 'utf8'));
if (marker.data !== resolve(root, 'mysql-data')) throw new Error('Invalid disposable instance');
for (const service of process.argv.slice(2)) {
  if (!['api', 'web', 'gateway'].includes(service)) throw new Error('Invalid service');
  const row = JSON.parse((await readFile(resolve(root, `${service}-metrics.jsonl`), 'utf8')).trim().split('\n').at(-1));
  if (row.service !== service || Date.now() - row.at > 10000) throw new Error('Refusing stale process ID');
  process.kill(row.pid, 'SIGTERM');
  console.log(`Stopped disposable ${service} process ${row.pid}`);
}
