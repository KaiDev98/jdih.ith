import { ForbiddenException } from '@nestjs/common';
import type { PenggunaAktif } from '@jdih/shared';
import { mkdtemp, rm, rmdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Readable } from 'node:stream';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LetterTemplatesService } from './letter-templates.service.js';

const admin: PenggunaAktif = {
  id: '11', nama: 'Admin', surel: 'admin@ith.ac.id', status: 'AKTIF',
  unitKerjaId: '2', unitManual: null, avatarUrl: null, peran: ['ADMIN'],
  izin: ['documents.read_admin', 'templates.manage'],
};
const temporary: string[] = [];
afterEach(async () => {
  await Promise.all(temporary.splice(0).map(async (path) => {
    await rm(join(path, 'format.pdf'), { force: true });
    await rmdir(path);
  }));
});
async function incoming() {
  const directory = await mkdtemp(join(tmpdir(), 'jdih-template-test-'));
  temporary.push(directory);
  const path = join(directory, 'format.pdf');
  await writeFile(path, '%PDF-1.7\n%%EOF');
  return { path, originalname: 'format.pdf' };
}
function setup() {
  const db = {};
  const repo = {
    rows: vi.fn(), write: vi.fn(), id: vi.fn().mockResolvedValue('80'),
    transaction: vi.fn((fn: (connection: unknown) => unknown) => fn(db)),
  };
  const storage = {
    stage: vi.fn(async (stream: Readable) => {
      for await (const _chunk of stream) { /* Consume the uploaded file before cleanup. */ }
      return { storageKey: 'format', byte: 14, checksum: Buffer.alloc(32) };
    }),
    finalize: vi.fn(), discard: vi.fn(),
  };
  const audit = { recordDomain: vi.fn() };
  const config = { get: () => ({ ukuranMaksimumBita: 1_000_000 }) };
  const service = new LetterTemplatesService(repo as never, storage as never, audit as never, config as never);
  return { service, repo, storage, audit, db };
}

describe('Format Persuratan dikelola Admin dan Superadmin', () => {
  it('pencarian dan pagination memakai batas API serta count yang hanya mencakup akses publik', async () => {
    const { service, repo } = setup();
    repo.rows.mockResolvedValueOnce([{ total: '25' }]).mockResolvedValueOnce([{ id: '1', slug: 'surat', nama: 'Surat', tingkatAkses: 'PUBLIK' }]);
    const result = await service.list({ q: 'surat_100%', halaman: 2, perHalaman: 12 });
    expect(result.meta).toMatchObject({ totalButir: 25, totalHalaman: 3 });
    expect(result.data[0]).not.toHaveProperty('tingkatAkses');
    expect(repo.rows.mock.calls.every(([, sql]) => String(sql).includes("v.tingkat_akses='PUBLIK'"))).toBe(true);
    expect(repo.rows.mock.calls[0]?.[2]).toEqual(['%surat!_100!%%']);
    expect(repo.rows.mock.calls[1]?.[2]).toEqual(['%surat!_100!%%', 12, 12]);
  });
  for (const peran of ['ADMIN', 'SUPERADMIN'] as const) {
    it(`${peran} dapat membuat format dan versi awal dengan audit`, async () => {
      const { service, repo, audit, db } = setup();
      await expect(service.create({ ...admin, peran: [peran] }, await incoming(), {
        nama: 'Surat tugas', slug: 'surat-tugas', tingkatAkses: 'PUBLIK',
      })).resolves.toMatchObject({ status: 'ACTIVE', nomorVersi: 1 });
      expect(repo.write).toHaveBeenCalledWith(db, expect.stringContaining('INSERT INTO template_surat('), ['surat-tugas', 'Surat tugas', null, admin.id]);
      expect(audit.recordDomain).toHaveBeenCalledWith(expect.objectContaining({ action: 'CREATE', actorId: admin.id }), db);
    });

    it(`${peran} dapat memperbarui format milik akun lain tanpa menghapus versi lama`, async () => {
      const { service, repo, audit, db } = setup();
      repo.rows.mockResolvedValueOnce([{ id: '5', current_version_id: '50', created_by: '99' }])
        .mockResolvedValueOnce([{ id: '50', nomor_versi: 1 }])
        .mockResolvedValueOnce([{ number: '1' }]);
      await expect(service.newVersion({ ...admin, peran: [peran] }, '5', await incoming(), { tingkatAkses: 'INTERNAL' }))
        .resolves.toMatchObject({ nomorVersi: 2, status: 'ACTIVE' });
      expect(repo.write).toHaveBeenCalledWith(db, expect.stringContaining("SET status='ARCHIVED'"), ['50']);
      expect(repo.write).toHaveBeenCalledWith(db, expect.stringContaining('SET current_version_id=?,aktif=1'), ['80', '5']);
      expect(audit.recordDomain).toHaveBeenCalledWith(expect.objectContaining({ action: 'CREATE_VERSION', actorId: admin.id }), db);
    });

    it(`${peran} dapat mengarsipkan format milik akun lain dengan audit`, async () => {
      const { service, repo, audit, db } = setup();
      repo.rows.mockResolvedValueOnce([{ id: '5', current_version_id: '50', aktif: 1, created_by: '99' }])
        .mockResolvedValueOnce([{ id: '50' }]);
      await expect(service.archive({ ...admin, peran: [peran] }, '5', {})).resolves.toEqual({ id: '5', archived: true });
      expect(repo.write).toHaveBeenCalledWith(db, expect.stringContaining('SET current_version_id=NULL,aktif=0'), ['5']);
      expect(audit.recordDomain).toHaveBeenCalledWith(expect.objectContaining({ action: 'ARCHIVE', actorId: admin.id }), db);
    });
  }

  for (const actor of [
    { ...admin, izin: [] },
    { ...admin, status: 'NONAKTIF' as const },
    { ...admin, peran: ['DOSEN_STAF' as const] },
  ]) it(`menolak semua perubahan tanpa role, izin, atau status yang sah: ${actor.peran[0]}/${actor.status}/${actor.izin.length}`, async () => {
    const { service, repo, storage } = setup();
    const file = { path: 'tidak-dibaca.pdf', originalname: 'format.pdf' };
    await expect(service.create(actor, file, {})).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.newVersion(actor, '5', file, {})).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.archive(actor, '5', {})).rejects.toBeInstanceOf(ForbiddenException);
    expect(storage.stage).not.toHaveBeenCalled();
    expect(repo.transaction).not.toHaveBeenCalled();
  });
});
