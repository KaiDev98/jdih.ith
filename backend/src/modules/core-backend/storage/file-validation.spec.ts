import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { validateIncomingFile } from './file-validation.js';

describe('incoming file signature validation', () => {
  let root = '';
  afterEach(async () => {
    if (root) await rm(root, { recursive: true, force: true });
    root = '';
  });
  async function file(name: string, bytes: Buffer) {
    if (!root) root = await mkdtemp(join(tmpdir(), 'jdih-file-validation-'));
    const path = join(root, name);
    await writeFile(path, bytes);
    return path;
  }

  it('accepts a PDF by signature and normalizes path-like submitted names', async () => {
    const path = await file('upload', Buffer.from('%PDF-1.7\nbody\n'));
    await expect(validateIncomingFile(path, '..\\private\\legal.pdf', 'dokumen', 1000)).resolves.toMatchObject({
      mimeType: 'application/pdf',
      originalName: 'legal.pdf',
    });
  });

  it('rejects extension-only PDF, oversized data and PDF used as a template', async () => {
    const path = await file('fake.pdf', Buffer.from('not a PDF file'));
    await expect(validateIncomingFile(path, 'fake.pdf', 'dokumen', 1000)).rejects.toThrow();
    await expect(validateIncomingFile(path, 'fake.pdf', 'dokumen', 2)).rejects.toThrow();
    const pdf = await file('real-pdf', Buffer.from('%PDF-1.7\nbody\n'));
    await expect(validateIncomingFile(pdf, 'template.pdf', 'template', 1000)).rejects.toThrow();
  });
});
