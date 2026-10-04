import { ForbiddenException, NotFoundException } from '@nestjs/common';
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
    const repo = { transaction: vi.fn(), pool: {}, rows: vi.fn() };
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
});
