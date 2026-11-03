import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { PenggunaAktif } from '@jdih/shared';
import { mkdtemp, rm, rmdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Readable } from 'node:stream';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LetterTemplatesService } from './letter-templates.service.js';

const admin: PenggunaAktif = {
  id: '11',
  nama: 'Admin',
  surel: 'admin@ith.ac.id',
  status: 'AKTIF',
  unitKerjaId: '2',
  unitManual: null,
  avatarUrl: null,
  peran: ['ADMIN'],
  izin: ['documents.read_admin', 'templates.manage'],
};
const temporary: string[] = [];
afterEach(async () => {
  await Promise.all(
    temporary.splice(0).map(async (path) => {
      await rm(join(path, 'format.pdf'), { force: true });
      await rmdir(path);
    }),
  );
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
    rows: vi.fn(),
    write: vi.fn(),
    id: vi.fn().mockResolvedValue('80'),
    transaction: vi.fn((fn: (connection: unknown) => unknown) => fn(db)),
  };
  const storage = {
    stage: vi.fn(async (stream: Readable) => {
      for await (const _chunk of stream) {
        /* Consume the uploaded file before cleanup. */
      }
      return { storageKey: 'format', byte: 14, checksum: Buffer.alloc(32) };
    }),
    finalize: vi.fn(),
    discard: vi.fn(),
    verify: vi.fn().mockResolvedValue(true),
  };
  const audit = { recordDomain: vi.fn() };
  const config = { get: () => ({ ukuranMaksimumBita: 1_000_000 }) };
  const service = new LetterTemplatesService(
    repo as never,
    storage as never,
    audit as never,
    config as never,
  );
  return { service, repo, storage, audit, db };
}

describe('Format Persuratan dikelola Admin dan Superadmin', () => {
  it('pencarian dan pagination memakai batas API serta count yang hanya mencakup akses publik', async () => {
    const { service, repo } = setup();
    repo.rows
      .mockResolvedValueOnce([{ total: '25' }])
      .mockResolvedValueOnce([{ id: '1', slug: 'surat', nama: 'Surat', tingkatAkses: 'PUBLIK' }]);
    const result = await service.list({ q: 'surat_100%', halaman: 2, perHalaman: 12 });
    expect(result.meta).toMatchObject({ totalButir: 25, totalHalaman: 3 });
    expect(result.data[0]).not.toHaveProperty('tingkatAkses');
    expect(
      repo.rows.mock.calls.every(([, sql]) => String(sql).includes("v.tingkat_akses='PUBLIK'")),
    ).toBe(true);
    expect(repo.rows.mock.calls[0]?.[2]).toEqual(['%surat!_100!%%']);
    expect(repo.rows.mock.calls[1]?.[2]).toEqual(['%surat!_100!%%', 12, 12]);
  });
  for (const peran of ['ADMIN', 'SUPERADMIN'] as const) {
    it(`${peran} dapat membuat format dan versi awal dengan audit`, async () => {
      const { service, repo, audit, db } = setup();
      await expect(
        service.create({ ...admin, peran: [peran] }, await incoming(), {
          nama: 'Surat tugas',
          slug: 'surat-tugas',
          tingkatAkses: 'PUBLIK',
        }),
      ).resolves.toMatchObject({ status: 'PENDING_REVIEW', nomorVersi: 1 });
      expect(repo.write).toHaveBeenCalledWith(
        db,
        expect.stringContaining('INSERT INTO template_surat('),
        ['surat-tugas', 'Surat tugas', null, admin.id, 0],
      );
      expect(repo.write).not.toHaveBeenCalledWith(
        db,
        expect.stringContaining('SET current_version_id=?'),
        expect.anything(),
      );
      expect(audit.recordDomain).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CREATE', actorId: admin.id }),
        db,
      );
      expect(audit.recordDomain).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CREATE_VERSION',
          after: {
            nomorVersi: 1,
            tingkatAkses: 'PUBLIK',
            status: 'PENDING_REVIEW',
          },
        }),
        db,
      );
    });

    it(`${peran} dapat memperbarui format miliknya tanpa menghapus versi lama`, async () => {
      const { service, repo, audit, db } = setup();
      repo.rows
        .mockResolvedValueOnce([{ id: '5', current_version_id: '50', created_by: admin.id }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: '50', nomor_versi: 1 }])
        .mockResolvedValueOnce([{ number: '1' }]);
      await expect(
        service.newVersion({ ...admin, peran: [peran] }, '5', await incoming(), {
          tingkatAkses: 'INTERNAL',
        }),
      ).resolves.toMatchObject({ nomorVersi: 2, status: 'PENDING_REVIEW' });
      expect(repo.write).not.toHaveBeenCalledWith(
        db,
        expect.stringContaining("SET status='ARCHIVED'"),
        ['50'],
      );
      expect(repo.write).not.toHaveBeenCalledWith(
        db,
        expect.stringContaining('SET current_version_id=?,aktif=1'),
        expect.anything(),
      );
      expect(audit.recordDomain).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CREATE_VERSION', actorId: admin.id }),
        db,
      );
    });

    it(`${peran} dapat menghapus format miliknya yang belum disetujui tanpa mengarsipkan versinya`, async () => {
      const { service, repo, audit, db } = setup();
      repo.rows
        .mockResolvedValueOnce([
          { id: '5', nama: 'Surat', current_version_id: null, aktif: 0, created_by: admin.id },
        ])
        .mockResolvedValueOnce([]);
      await expect(service.remove({ ...admin, peran: [peran] }, '5', {})).resolves.toEqual({
        id: '5',
        deleted: true,
      });
      expect(repo.write).toHaveBeenCalledWith(
        db,
        expect.stringContaining('SET current_version_id=NULL,aktif=0,deleted_at=UTC_TIMESTAMP(6)'),
        ['5'],
      );
      expect(audit.recordDomain).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'DELETE', actorId: admin.id }),
        db,
      );
      expect(repo.write).toHaveBeenCalledTimes(1);
    });
  }

  it('approval preserves the old publication; only a later publish activates the approved version', async () => {
    const { service, repo, audit, storage, db } = setup();
    const superadmin: PenggunaAktif = { ...admin, peran: ['SUPERADMIN'] };
    const version = {
      id: '80',
      status: 'PENDING_REVIEW',
      nomor_versi: 2,
      tingkat_akses: 'INTERNAL',
      storage_key: 'format',
      size_bytes: '14',
      checksum: Buffer.alloc(32),
    };
    repo.rows
      .mockResolvedValueOnce([{ id: '5', created_by: admin.id, current_version_id: '50' }])
      .mockResolvedValueOnce([version]);
    await expect(service.verify(superadmin, '5', '80', {})).resolves.toMatchObject({
      status: 'APPROVED',
    });
    expect(storage.verify).toHaveBeenCalled();
    expect(repo.write).toHaveBeenCalledExactlyOnceWith(
      db,
      expect.stringContaining("SET status='APPROVED'"),
      [superadmin.id, '80'],
    );
    expect(audit.recordDomain).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'APPROVE_VERSION' }),
      db,
    );
    repo.write.mockClear();
    repo.rows
      .mockResolvedValueOnce([{ id: '5', created_by: admin.id, current_version_id: '50' }])
      .mockResolvedValueOnce([
        { ...version, status: 'APPROVED', verified_by: superadmin.id, approved_at: '2026-11-04' },
      ])
      .mockResolvedValueOnce([{ id: '50', status: 'ACTIVE' }]);
    await expect(service.publish(superadmin, '5', '80', {})).resolves.toMatchObject({
      status: 'ACTIVE',
    });
    expect(repo.write).toHaveBeenNthCalledWith(
      1,
      db,
      expect.stringContaining("SET status='ARCHIVED'"),
      ['50'],
    );
    expect(repo.write).toHaveBeenNthCalledWith(
      2,
      db,
      expect.stringContaining("SET status='ACTIVE'"),
      ['80'],
    );
    expect(repo.write).toHaveBeenNthCalledWith(
      3,
      db,
      expect.stringContaining('SET current_version_id=?,aktif=1'),
      ['80', '5'],
    );
    expect(audit.recordDomain).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'PUBLISH_VERSION' }),
      db,
    );
  });

  it('Admin cannot publish and Superadmin cannot publish unapproved bytes or approve missing files', async () => {
    const { service, repo, storage } = setup();
    await expect(service.publish(admin, '5', '80', {})).rejects.toBeInstanceOf(ForbiddenException);
    expect(repo.transaction).not.toHaveBeenCalled();
    const superadmin: PenggunaAktif = { ...admin, peran: ['SUPERADMIN'] };
    repo.rows
      .mockResolvedValueOnce([{ id: '5' }])
      .mockResolvedValueOnce([{ id: '80', status: 'PENDING_REVIEW' }]);
    await expect(service.publish(superadmin, '5', '80', {})).rejects.toThrow('Setujui');
    repo.rows
      .mockResolvedValueOnce([{ id: '5' }])
      .mockResolvedValueOnce([{ id: '80', status: 'PENDING_REVIEW' }]);
    storage.verify.mockResolvedValue(false);
    await expect(service.verify(superadmin, '5', '80', {})).rejects.toThrow('checksum');
    expect(repo.write).not.toHaveBeenCalled();
  });

  it('denies verification to Admin even when Admin has templates.manage', async () => {
    const { service, repo } = setup();
    await expect(service.verify(admin, '5', '80', {})).rejects.toBeInstanceOf(ForbiddenException);
    expect(repo.transaction).not.toHaveBeenCalled();
  });

  it('archives an earlier pending version when a new upload is submitted', async () => {
    const { service, repo, storage, db } = setup();
    repo.rows
      .mockResolvedValueOnce([{ id: '5', created_by: admin.id, current_version_id: '50' }])
      .mockResolvedValueOnce([{ id: '70', nomor_versi: 2 }])
      .mockResolvedValueOnce([{ id: '50', nomor_versi: 1 }])
      .mockResolvedValueOnce([{ number: '2' }]);
    await expect(
      service.newVersion(admin, '5', await incoming(), { tingkatAkses: 'PUBLIK' }),
    ).resolves.toMatchObject({ nomorVersi: 3, status: 'PENDING_REVIEW' });
    expect(repo.write).toHaveBeenCalledWith(
      db,
      expect.stringContaining("SET status='ARCHIVED',archived_at=UTC_TIMESTAMP(6)"),
      ['70'],
    );
    expect(repo.write).not.toHaveBeenCalledWith(
      db,
      expect.stringContaining("SET status='ARCHIVED'"),
      ['50'],
    );
    expect(storage.discard).not.toHaveBeenCalled();
  });

  for (const actor of [
    { ...admin, izin: [] },
    { ...admin, status: 'NONAKTIF' as const },
    { ...admin, peran: ['DOSEN_STAF' as const] },
  ])
    it(`menolak semua perubahan tanpa role, izin, atau status yang sah: ${actor.peran[0]}/${actor.status}/${actor.izin.length}`, async () => {
      const { service, repo, storage } = setup();
      const file = { path: 'tidak-dibaca.pdf', originalname: 'format.pdf' };
      await expect(service.create(actor, file, {})).rejects.toBeInstanceOf(ForbiddenException);
      await expect(service.newVersion(actor, '5', file, {})).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      await expect(service.remove(actor, '5', {})).rejects.toBeInstanceOf(ForbiddenException);
      await expect(service.verificationQueue(actor, {})).rejects.toBeInstanceOf(ForbiddenException);
      expect(storage.stage).not.toHaveBeenCalled();
      expect(repo.transaction).not.toHaveBeenCalled();
    });

  it('format tanpa publikasi aktif tetap dapat dihapus', async () => {
    const { service, repo } = setup();
    repo.rows
      .mockResolvedValueOnce([
        { id: '5', nama: 'Surat', created_by: admin.id, current_version_id: null, aktif: 0 },
      ])
      .mockResolvedValueOnce([]);
    await expect(service.remove(admin, '5', {})).resolves.toEqual({ id: '5', deleted: true });
    expect(repo.write).toHaveBeenCalledTimes(1);
  });

  it('penghapusan berulang atau ID tidak ditemukan ditolak tanpa write/audit', async () => {
    const { service, repo, audit } = setup();
    repo.rows.mockResolvedValueOnce([]);
    await expect(service.remove(admin, '5', {})).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.write).not.toHaveBeenCalled();
    expect(audit.recordDomain).not.toHaveBeenCalled();
  });

  it('menolak payload penghapusan yang mencoba mengirim status atau identitas', async () => {
    const { service, repo } = setup();
    await expect(service.remove(admin, '5', { aktif: true, actorId: '99' })).rejects.toThrow();
    expect(repo.transaction).not.toHaveBeenCalled();
  });

  it('Admin tidak dapat mengganti atau menghapus format milik pengunggah lain', async () => {
    const { service, repo, storage, audit } = setup();
    repo.rows.mockResolvedValue([{ id: '5', created_by: '99', current_version_id: null }]);
    await expect(
      service.newVersion(admin, '5', await incoming(), { tingkatAkses: 'PUBLIK' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.remove(admin, '5', {})).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.write).not.toHaveBeenCalled();
    expect(audit.recordDomain).not.toHaveBeenCalled();
    expect(storage.discard).toHaveBeenCalledOnce();
  });

  it('hasil persetujuan Superadmin tidak dapat diganti atau dihapus Admin pemilik', async () => {
    const { service, repo } = setup();
    const own = { id: '5', created_by: admin.id, current_version_id: null };
    repo.rows
      .mockResolvedValueOnce([own])
      .mockResolvedValueOnce([{ id: '80', status: 'APPROVED' }]);
    await expect(
      service.newVersion(admin, '5', await incoming(), { tingkatAkses: 'PUBLIK' }),
    ).rejects.toThrow('dikunci');
    repo.rows.mockResolvedValueOnce([own]).mockResolvedValueOnce([{ id: '80' }]);
    await expect(service.remove(admin, '5', {})).rejects.toThrow('hanya dapat dihapus Superadmin');
    expect(repo.write).not.toHaveBeenCalled();
  });

  it('daftar pengelolaan Admin menyaring pemilik di server; Superadmin dapat membaca semua', async () => {
    const { service, repo } = setup();
    await service.adminList(admin);
    expect(repo.rows).toHaveBeenLastCalledWith(
      undefined,
      expect.stringContaining('AND t.created_by=?'),
      [admin.id],
    );
    await service.adminList({ ...admin, peran: ['SUPERADMIN'] });
    expect(repo.rows).toHaveBeenLastCalledWith(
      undefined,
      expect.not.stringContaining('AND t.created_by=?'),
      [],
    );
  });
});
