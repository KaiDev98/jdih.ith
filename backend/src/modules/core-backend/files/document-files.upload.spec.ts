import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ConfigService } from '@nestjs/config';
import type { PenggunaAktif } from '@jdih/shared';
import { describe, expect, it, vi } from 'vitest';
import { LocalStorageDriver } from '../storage/storage.service.js';
import { DocumentFilesService } from './document-files.service.js';

describe('unggahan tunggal pengajuan dengan storage lokal', () => {
  it('menyimpan satu file dan menolak file kedua/lampiran tanpa mengubah file pertama', async () => {
    const root = await mkdtemp(join(tmpdir(), 'jdih-single-upload-'));
    try {
      const config = new ConfigService({
        penyimpanan: { jalurLokal: root, ukuranMaksimumBita: 1024 * 1024 },
      });
      const storage = new LocalStorageDriver(config as never);
      let count = 0;
      const repo = {
        transaction: vi.fn((fn: (db: unknown) => unknown) => fn({})),
        rows: vi.fn((_db: unknown, sql: string) =>
          Promise.resolve(
            sql.includes('FROM dokumen_versi v')
              ? [
                  {
                    id: '50',
                    status_workflow: 'DRAF',
                    version_created_by: '11',
                    document_created_by: '11',
                    peruntukan: null,
                  },
                ]
              : count
                ? [{ id: '8' }]
                : [],
          ),
        ),
        write: vi.fn(() => {
          count += 1;
          return Promise.resolve({ affectedRows: 1 });
        }),
        id: vi.fn().mockResolvedValue('8'),
      };
      const audit = { recordDomain: vi.fn().mockResolvedValue(undefined) };
      const files = new DocumentFilesService(
        repo as never,
        storage,
        audit as never,
        {} as never,
        config as never,
      );
      const actor = {
        id: '11',
        status: 'AKTIF',
        peran: ['ADMIN'],
        izin: ['documents.upload'],
      } as PenggunaAktif;
      const content = Buffer.from('%PDF-1.7\nSOP review\n%%EOF\n');
      const incoming = async (name: string) => {
        const path = join(root, name);
        await writeFile(path, content);
        return { path, originalname: name };
      };
      const first = await files.upload(actor, '50', await incoming('utama.pdf'), {
        jenisBerkas: 'UTAMA',
      });
      expect(first.namaAsli).toBe('utama.pdf');
      expect(first.sizeBytes).toBe(String(content.length));
      await expect(
        files.upload(actor, '50', await incoming('kedua.pdf'), { jenisBerkas: 'UTAMA' }),
      ).rejects.toThrow('satu file');
      await expect(
        files.upload(actor, '50', await incoming('lampiran.pdf'), { jenisBerkas: 'LAMPIRAN' }),
      ).rejects.toThrow('satu file');
      expect(repo.write).toHaveBeenCalledTimes(1);
      expect(audit.recordDomain).toHaveBeenCalledTimes(1);
      expect(repo.rows.mock.calls[0]?.[1]).toContain('FOR UPDATE');
      expect(repo.rows.mock.calls[1]?.[1]).not.toContain('FOR UPDATE');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
