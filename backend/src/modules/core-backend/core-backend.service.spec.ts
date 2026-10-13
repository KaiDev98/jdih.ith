import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { PenggunaAktif } from '@jdih/shared';
import { CoreBackendService } from './core-backend.service.js';

function fixture(status: PenggunaAktif['status'], izin: PenggunaAktif['izin']): PenggunaAktif {
  return {
    id: '11',
    nama: 'Test user',
    surel: 'test@ith.ac.id',
    status,
    unitKerjaId: null,
    unitManual: null,
    avatarUrl: null,
    peran: ['DOSEN_STAF'],
    izin,
  };
}

describe('CoreBackendService authorization boundary', () => {
  const setup = () => {
    const repo = { transaction: vi.fn(), pool: {}, rows: vi.fn().mockResolvedValue([]) };
    const audit = { recordDomain: vi.fn() };
    const service = new CoreBackendService(repo as never, audit as never, {} as never, {} as never, { assertPublishReady: vi.fn() } as never);
    return { repo, service };
  };

  it('rejects pending Dosen/Staf before touching repositories', async () => {
    const { repo, service } = setup();
    await expect(
      service.createDocument(fixture('MENUNGGU_VERIFIKASI', ['documents.create']), {}),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repo.transaction).not.toHaveBeenCalled();
  });

  it('requires the specific server-side permission on active accounts', async () => {
    const { repo, service } = setup();
    await expect(service.createDocument(fixture('AKTIF', []), {})).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(repo.transaction).not.toHaveBeenCalled();
  });

  it('rejects actor authority fields from document payloads', async () => {
    const { repo, service } = setup();
    await expect(
      service.createDocument(fixture('AKTIF', ['documents.create']), {
        kodeDokumen: 'TEST',
        slug: 'test',
        jenisDokumenId: '1',
        createdBy: '999',
        versi: { judul: 'Test', tingkatAkses: 'publik' },
      }),
    ).rejects.toThrow();
    expect(repo.transaction).not.toHaveBeenCalled();
  });

  it('rejects unrecognized master table names before constructing SQL', async () => {
    const { repo, service } = setup();
    await expect(
      service.masterList(fixture('AKTIF', ['master.manage']), 'users' as never),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.rows).not.toHaveBeenCalled();
  });

  it('protects administrative list queries and allowlists public master lookup', async () => {
    const { repo, service } = setup();
    const user = fixture('AKTIF', []);
    await expect(service.adminDocuments(user, {})).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.adminDocuments(user, {}, true)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.auditList(user, {})).rejects.toBeInstanceOf(ForbiddenException);
    expect(repo.rows).not.toHaveBeenCalled();
    await expect(service.publicMaster('jenis_dokumen')).resolves.toEqual([]);
    expect(repo.rows).toHaveBeenCalledWith({}, expect.stringContaining('WHERE aktif=1 ORDER BY urutan,nama'));
    await expect(service.publicMaster('constructor' as never)).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('CoreBackendService unit kerja mengikuti kategori SOP', () => {
  const superadmin = { ...fixture('AKTIF', ['master.manage', 'units.manage']), peran: ['SUPERADMIN'] } as PenggunaAktif;
  const setup = (sebelum?: Record<string, unknown>) => {
    const db = {};
    const repo = {
      pool: {},
      transaction: vi.fn((fn: (d: unknown) => unknown) => fn(db)),
      rows: vi.fn().mockResolvedValue(sebelum ? [sebelum] : []),
      write: vi.fn().mockResolvedValue({ affectedRows: 1 }),
      id: vi.fn().mockResolvedValue('12'),
    };
    const audit = { recordDomain: vi.fn() };
    const service = new CoreBackendService(repo as never, audit as never, {} as never, {} as never, { assertPublishReady: vi.fn() } as never);
    const sql = () => repo.write.mock.calls.map((c) => [String(c[1]), c[2]] as const);
    return { repo, service, sql };
  };

  it('menolak penulisan unit kerja langsung', async () => {
    const { repo, service } = setup();
    await expect(
      service.masterSave(superadmin, 'unit_kerja', null, { kode: 'X', nama: 'X' }),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      service.masterStatus(superadmin, 'unit_kerja', '1', { aktif: false }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repo.transaction).not.toHaveBeenCalled();
  });

  it('kategori baru langsung menjadi unit kerja dengan kode dan nama yang sama', async () => {
    const { service, sql } = setup();
    await service.masterSave(superadmin, 'kategori', null, { kode: 'SOP-HUKUM', nama: 'Bagian Hukum' });
    expect(sql()).toContainEqual([
      expect.stringContaining('INSERT INTO unit_kerja(kode,nama,aktif)'),
      ['SOP-HUKUM', 'Bagian Hukum', true],
    ]);
  });

  it('mengganti kode kategori ikut mengganti kode unitnya', async () => {
    const { service, sql } = setup({ id: '3', kode: 'SOP-SPI', nama: 'SPI' });
    await service.masterSave(superadmin, 'kategori', '3', { kode: 'SOP-PENGAWAS', nama: 'SPI', aktif: true });
    expect(sql()).toContainEqual([
      expect.stringContaining('UPDATE IGNORE unit_kerja SET kode=?'),
      ['SOP-PENGAWAS', 'SOP-SPI'],
    ]);
  });

  it('menonaktifkan kategori ikut menonaktifkan unitnya', async () => {
    const { service, sql } = setup({ id: '3', aktif: 1 });
    await service.masterStatus(superadmin, 'kategori', '3', { aktif: false });
    expect(sql()).toContainEqual([expect.stringContaining('UPDATE unit_kerja u JOIN kategori k'), ['3']]);
  });
});
