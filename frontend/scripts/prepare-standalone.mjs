import { access, cp, mkdir, rm, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const nextRoot = resolve(frontendRoot, '.next');
const standaloneRoot = resolve(nextRoot, 'standalone', 'frontend');

async function copyDirectory(source, destination, { optional = false } = {}) {
  try {
    await access(source);
  } catch (error) {
    if (optional && error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      await rm(destination, { recursive: true, force: true });
      return;
    }
    throw new Error(`Required standalone input is unavailable: ${source}`, { cause: error });
  }

  await rm(destination, { recursive: true, force: true });
  await mkdir(dirname(destination), { recursive: true });
  await cp(source, destination, { recursive: true, force: true });
}

const serverPath = resolve(standaloneRoot, 'server.js');
if (!(await stat(serverPath)).isFile()) {
  throw new Error(`Next standalone server was not generated: ${serverPath}`);
}

await copyDirectory(resolve(nextRoot, 'static'), resolve(standaloneRoot, '.next', 'static'));
await copyDirectory(resolve(frontendRoot, 'public'), resolve(standaloneRoot, 'public'), {
  optional: true,
});
