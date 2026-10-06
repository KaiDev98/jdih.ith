import 'reflect-metadata';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import type { Pool, PoolConnection, ResultSetHeader } from 'mysql2/promise';
import type { PenggunaAktif } from '@jdih/shared';
import { IdentityRepository, utc, type UserRow } from './identity.repository.js';
import { IdentityService } from './identity.service.js';
import { AuditService } from './audit.service.js';

const superadmin: PenggunaAktif = {
  id: '1',
  nama: 'Super',
  surel: 'super@ith.ac.id',
  status: 'AKTIF',
  unitKerjaId: null,
  unitManual: null,
  avatarUrl: null,
  peran: ['SUPERADMIN'],
  izin: ['users.delete', 'users.read'],
};

function siapkan(targetPeran: string[], { ada = true, aktor = superadmin } = {}) {
  const repo = new IdentityRepository({} as Pool);
  const db = {} as PoolConnection;
  const target = {
    id: '5',
    email: 'staf@ith.ac.id',
    nama: 'Staf',
    status: 'AKTIF',
    deleted_at: null,
    verified_at: utc(),
  } as UserRow;
  vi.spyOn(repo, 'transaction').mockImplementation((fn) => fn(db));
  vi.spyOn(repo, 'user').mockResolvedValue(ada ? target : undefined);
  vi.spyOn(repo, 'principal').mockResolvedValue({
    ...superadmin,
    id: '5',
    peran: targetPeran as never,
  });
  const writes = vi.spyOn(repo, 'write').mockResolvedValue({ affectedRows: 1 } as ResultSetHeader);
  const service = new IdentityService(repo, new AuditService(repo), new ConfigService({}));
  vi.spyOn(service, 'authenticate').mockResolvedValue({ user: aktor, session: {} as never });
  return { service, writes };
}

describe('IdentityService.deleteAccount', () => {
  it('Superadmin menghapus akun Dosen/Staf: tandai terhapus, cabut sesi, audit', async () => {
    const { service, writes } = siapkan(['DOSEN_STAF']);
    await expect(service.deleteAccount('token', '5')).resolves.toEqual({ id: '5', dihapus: true });
    const sql = writes.mock.calls.map((c) => String(c[1]));
    expect(sql.some((q) => q.includes('UPDATE pengguna SET deleted_at=?'))).toBe(true);
    expect(sql.some((q) => q.includes('UPDATE sesi_pengguna SET revoked_at=?'))).toBe(true);
    expect(sql.some((q) => q.includes('INSERT INTO audit_log'))).toBe(true);
  });

  it('Superadmin juga dapat menghapus akun Admin', async () => {
    await expect(siapkan(['ADMIN']).service.deleteAccount('token', '5')).resolves.toEqual({
      id: '5',
      dihapus: true,
    });
  });

  it('akun Superadmin dan akun sendiri tidak dapat dihapus', async () => {
    await expect(
      siapkan(['SUPERADMIN']).service.deleteAccount('token', '5'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      siapkan(['DOSEN_STAF']).service.deleteAccount('token', '1'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('akun tanpa users.delete ditolak; akun tidak ada menghasilkan 404', async () => {
    const admin = {
      ...superadmin,
      id: '2',
      peran: ['ADMIN' as const],
      izin: ['users.read' as const],
    };
    await expect(
      siapkan(['DOSEN_STAF'], { aktor: admin }).service.deleteAccount('token', '5'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      siapkan(['DOSEN_STAF'], { ada: false }).service.deleteAccount('token', '9'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('IdentityService.deleteAccount oleh Admin', () => {
  const admin = { ...superadmin, id: '2', peran: ['ADMIN' as const] };
  it('Admin dapat menghapus akun Admin lain', async () => {
    await expect(
      siapkan(['ADMIN'], { aktor: admin }).service.deleteAccount('token', '5'),
    ).resolves.toEqual({ id: '5', dihapus: true });
  });
  it('Admin tidak dapat menghapus Superadmin', async () => {
    await expect(
      siapkan(['SUPERADMIN'], { aktor: admin }).service.deleteAccount('token', '5'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
