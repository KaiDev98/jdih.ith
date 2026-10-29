import { access, cp, mkdir, rm, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

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

// Run in a fresh process: a previously loaded workspace DLL can conceal a
// missing native dependency in the standalone artifact on Windows.
const nativeCheck = spawnSync(process.execPath, ['--input-type=module', '-e', `
  import { createRequire } from 'node:module';
  const require = createRequire(process.cwd() + '/server.js');
  const sharp = require('sharp');
  await sharp({ create: { width: 2, height: 2, channels: 3, background: '#fff' } }).webp().toBuffer();
`], { cwd: standaloneRoot, windowsHide: true, stdio: 'inherit' });
if (nativeCheck.status !== 0) throw new Error('Standalone image optimizer failed its native runtime check');
