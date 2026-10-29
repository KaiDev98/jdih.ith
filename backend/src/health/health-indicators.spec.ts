import type * as fsPromises from 'node:fs/promises';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HealthIndicatorService } from '@nestjs/terminus';

import { BasisDataIndicator } from './basis-data.indicator.js';
import { PenyimpananIndicator } from './penyimpanan.indicator.js';

const { statfs } = vi.hoisted(() => ({ statfs: vi.fn() }));
vi.mock('node:fs/promises', async (asli) => {
  const modul = await asli<typeof fsPromises>();
  // Bawaan: statfs sungguhan, agar uji "jalur tidak ada" tetap memakai galat OS asli.
  statfs.mockImplementation(modul.statfs);
  return { ...modul, statfs };
});

const indicator = {
  check: (key: string) => ({
    up: (details: Record<string, unknown> = {}) => ({ [key]: { status: 'up', ...details } }),
    down: (details: Record<string, unknown> = {}) => ({ [key]: { status: 'down', ...details } }),
  }),
} as unknown as HealthIndicatorService;

const temporary: string[] = [];
afterEach(async () => {
  await Promise.all(temporary.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe('public health indicator projections', () => {
  it('does not expose database exception details', async () => {
    const database = { execute: vi.fn().mockRejectedValue(new Error('secret host and SQL details')) };
    const health = new BasisDataIndicator(indicator, database as never);

    const result = await health.periksa();

    expect(result).toHaveProperty('basis_data.status', 'down');
    expect(JSON.stringify(result)).not.toContain('secret host and SQL details');
  });

  it('does not expose private storage path or OS errors when storage is unavailable', async () => {
    const path = resolve(tmpdir(), `jdih-missing-storage-${Date.now()}`);
    const config = { get: vi.fn().mockReturnValue({ pengandar: 'lokal', jalurLokal: path }) };
    const health = new PenyimpananIndicator(indicator, config as never);

    const result = await health.periksa();

    expect(result).toHaveProperty('penyimpanan.status', 'down');
    expect(JSON.stringify(result)).not.toContain(path);
    expect(JSON.stringify(result)).not.toContain('ENOENT');
  });

  it('returns only readiness status when private storage is available', async () => {
    const path = await mkdtemp(join(tmpdir(), 'jdih-storage-health-'));
    temporary.push(path);
    // Diska mesin uji bisa saja hampir penuh; pemakaian dibuat tetap 50%.
    statfs.mockResolvedValueOnce({ blocks: 100, bsize: 4096, bavail: 50 });
    const config = { get: vi.fn().mockReturnValue({ pengandar: 'lokal', jalurLokal: path }) };
    const health = new PenyimpananIndicator(indicator, config as never);

    const result = await health.periksa();

    expect(result).toEqual({ penyimpanan: { status: 'up' } });
    expect(JSON.stringify(result)).not.toContain(path);
  });

  it('reports down without details when disk usage is above the threshold', async () => {
    const path = await mkdtemp(join(tmpdir(), 'jdih-storage-full-'));
    temporary.push(path);
    statfs.mockResolvedValueOnce({ blocks: 100, bsize: 4096, bavail: 3 });
    const config = { get: vi.fn().mockReturnValue({ pengandar: 'lokal', jalurLokal: path }) };
    const health = new PenyimpananIndicator(indicator, config as never);

    expect(await health.periksa()).toEqual({ penyimpanan: { status: 'down' } });
  });
});
