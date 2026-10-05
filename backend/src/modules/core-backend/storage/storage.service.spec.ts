import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { afterEach, describe, expect, it } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { LocalStorageDriver } from './storage.service.js';

describe('LocalStorageDriver', () => {
  let root = '';
  afterEach(async () => {
    if (root) await rm(root, { recursive: true, force: true });
    root = '';
  });

  async function driver() {
    root = await mkdtemp(join(tmpdir(), 'jdih-storage-unit-'));
    return new LocalStorageDriver(new ConfigService({ penyimpanan: { jalurLokal: root } }) as never);
  }

  it('stages, finalizes, streams and verifies SHA-256 without returning local paths', async () => {
    const storage = await driver();
    const bytes = Buffer.from('%PDF-1.7\nunit storage\n%%EOF\n');
    const staged = await storage.stage(Readable.from([bytes]));
    expect(staged.byte).toBe(bytes.length);
    expect(staged.checksum).toEqual(createHash('sha256').update(bytes).digest());
    expect(staged.storageKey).toMatch(/^objects\/[a-f0-9]{2}\/[a-f0-9-]{36}$/);
    expect(JSON.stringify(staged)).not.toContain(root);
    await storage.finalize(staged);
    expect(await storage.exists(staged.storageKey)).toBe(true);
    const opened = await storage.open(staged.storageKey);
    const buffers: Buffer[] = [];
    for await (const chunk of opened.stream) buffers.push(chunk as Buffer);
    expect(Buffer.concat(buffers)).toEqual(bytes);
    expect(await storage.verify(staged.storageKey, bytes.length, staged.checksum)).toBe(true);
    expect(await storage.verify(staged.storageKey, bytes.length + 1, staged.checksum)).toBe(false);
  });

  it('cleans both staging and finalized objects after a failed DB transaction', async () => {
    const storage = await driver();
    const staged = await storage.stage(Readable.from([Buffer.from('temporary') ]));
    await storage.finalize(staged);
    await storage.discard(staged);
    expect(await storage.exists(staged.storageKey)).toBe(false);
  });

  it('rejects keys that could escape the private storage root', async () => {
    const storage = await driver();
    await expect(storage.open('../../public/secret.pdf')).rejects.toThrow();
    await expect(storage.delete('../../public/secret.pdf')).rejects.toThrow();
  });
});
