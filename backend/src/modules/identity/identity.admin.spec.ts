import 'reflect-metadata';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';
import type { Pool, PoolConnection, ResultSetHeader } from 'mysql2/promise';
import type { PenggunaAktif } from '@jdih/shared';
import { IdentityRepository, type UserRow } from './identity.repository.js';
import { IdentityService } from './identity.service.js';
import { AuditService } from './audit.service.js';
import { cocokPassword } from './password.js';

const akun = (peran: string[], id = '1'): PenggunaAktif => ({
  id,
  nama: 'Akun',
  surel: 'akun@ith.ac.id',
  status: 'AKTIF',
  unitKerjaId: null,
  unitManual: null,
  avatarUrl: null,
  peran: peran as never,
  izin: ['users.read'],
});

function siapkan({ aktor = akun(['SUPERADMIN']), emailAda = false, targetPeran = ['ADMIN'] } = {}) {
  const repo = new IdentityRepository({} as Pool);
  const db = {} as PoolConnection;
  vi.spyOn(repo, 'transaction').mockImplementation((fn) => fn(db));
  vi.spyOn(repo, 'emailTerpakai').mockResolvedValue(emailAda);
  vi.spyOn(repo, 'user').mockResolvedValue({ id: '5', deleted_at: null } as UserRow);
  vi.spyOn(repo, 'principal').mockResolvedValue(akun(targetPeran, '5'));
  const writes = vi
    .spyOn(repo, 'write')
    .mockResolvedValue({ affectedRows: 1, insertId: 42 } as ResultSetHeader);
  const service = new IdentityService(repo, new AuditService(repo), new ConfigService({}));
  vi.spyOn(service, 'authenticate').mockResolvedValue({ user: aktor, session: {} as never });
  return { service, writes };
}
const baru = { nama: 'Admin Baru', email: 'Admin.Baru@gmail.com', password: 'AwalKuat2026' };

describe('IdentityService.buatAdmin', () => {
  it('Superadmin membuat Admin aktif dengan password ter-hash', async () => {
    const { service, writes } = siapkan();
    await expect(service.buatAdmin('t', baru)).resolves.toEqual({
      id: '42',
      nama: 'Admin Baru',
      email: 'admin.baru@gmail.com',
    });
    const insert = writes.mock.calls.find((c) => String(c[1]).startsWith('INSERT INTO pengguna('))!;
    const nilai = insert[2] as string[];
    expect(nilai).not.toContain('AwalKuat2026');
    expect(await cocokPassword('AwalKuat2026', nilai[4]!)).toBe(true);
    expect(writes.mock.calls.some((c) => String(c[1]).includes("kode='ADMIN'"))).toBe(true);
    expect(writes.mock.calls.some((c) => String(c[1]).includes('INSERT INTO audit_log'))).toBe(
      true,
    );
  });

  it('Admin tidak dapat membuat Admin, dan email terpakai ditolak', async () => {
    await expect(
      siapkan({ aktor: akun(['ADMIN']) }).service.buatAdmin('t', baru),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(siapkan({ emailAda: true }).service.buatAdmin('t', baru)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});

describe('IdentityService.aturUlangPassword', () => {
  const isian = { passwordBaru: 'BaruKuat2026' };
  it('Superadmin mengatur ulang password Admin dan mencabut semua sesinya', async () => {
    const { service, writes } = siapkan();
    await expect(service.aturUlangPassword('t', '5', isian)).resolves.toEqual({
      id: '5',
      diatur: true,
    });
    const sql = writes.mock.calls.map((c) => String(c[1]));
    expect(sql.some((q) => q.includes('SET password_hash=?'))).toBe(true);
    expect(sql.some((q) => q.includes('UPDATE sesi_pengguna SET revoked_at=?'))).toBe(true);
  });

  it('menolak Admin sebagai pelaku, target Superadmin/Dosen, dan akun sendiri', async () => {
    await expect(
      siapkan({ aktor: akun(['ADMIN']) }).service.aturUlangPassword('t', '5', isian),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      siapkan({ targetPeran: ['ADMIN', 'SUPERADMIN'] }).service.aturUlangPassword('t', '5', isian),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      siapkan({ targetPeran: ['DOSEN_STAF'] }).service.aturUlangPassword('t', '5', isian),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(siapkan().service.aturUlangPassword('t', '1', isian)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
