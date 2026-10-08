import 'reflect-metadata';
import {
  ForbiddenException,
  HttpException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';
import type { Pool, PoolConnection, ResultSetHeader } from 'mysql2/promise';
import type { PenggunaAktif } from '@jdih/shared';
import { IdentityRepository, type UserRow } from './identity.repository.js';
import { IdentityService } from './identity.service.js';
import { AuditService } from './audit.service.js';
import { cocokPassword, hashPassword } from './password.js';

const admin: PenggunaAktif = {
  id: '9',
  nama: 'Admin',
  surel: 'admin@ith.ac.id',
  status: 'AKTIF',
  unitKerjaId: null,
  unitManual: null,
  avatarUrl: null,
  peran: ['ADMIN'],
  izin: [],
};
const PASSWORD = 'RahasiaKuat123';

async function siapkan({ hash = true, status = 'AKTIF', peran = ['ADMIN'] } = {}) {
  const repo = new IdentityRepository({} as Pool);
  const db = {} as PoolConnection;
  const row = {
    id: '9',
    email: 'admin@ith.ac.id',
    nama: 'Admin',
    status,
    deleted_at: null,
    password_hash: hash ? await hashPassword(PASSWORD) : null,
  } as UserRow;
  vi.spyOn(repo, 'transaction').mockImplementation((fn) => fn(db));
  const byEmail = vi
    .spyOn(repo, 'byEmail')
    .mockImplementation((_db, email) => Promise.resolve(email === row.email ? row : undefined));
  vi.spyOn(repo, 'user').mockResolvedValue(row);
  vi.spyOn(repo, 'principal').mockResolvedValue({ ...admin, peran: peran as never });
  const writes = vi.spyOn(repo, 'write').mockResolvedValue({ affectedRows: 1 } as ResultSetHeader);
  const config = new ConfigService({ identitas: { key: 'kunci-uji', sessionSeconds: 3600 } });
  const service = new IdentityService(repo, new AuditService(repo), config as never);
  vi.spyOn(service, 'authenticate').mockResolvedValue({
    user: { ...admin, peran: peran as never },
    session: { id: '77' } as never,
  });
  return { service, writes, byEmail, row };
}
const sqlDari = (writes: { mock: { calls: unknown[][] } }): string[] =>
  writes.mock.calls.map((c) => String(c[1]));

describe('hash password', () => {
  it('memverifikasi password yang benar dan menolak yang salah atau rusak', async () => {
    const hash = await hashPassword('Contoh12345');
    expect(hash).toMatch(/^scrypt\$16384\$8\$1\$/);
    expect(hash).not.toContain('Contoh12345');
    expect(await cocokPassword('Contoh12345', hash)).toBe(true);
    expect(await cocokPassword('contoh12345', hash)).toBe(false);
    expect(await cocokPassword('Contoh12345', 'bukan-hash')).toBe(false);
    expect(await hashPassword('Contoh12345')).not.toBe(hash);
  });
});

describe('IdentityService.loginPassword', () => {
  it('admin dengan password benar mendapat sesi', async () => {
    const { service, writes } = await siapkan();
    const sesi = await service.loginPassword(
      { email: 'Admin@ITH.ac.id', password: PASSWORD },
      '1.1.1.1',
      'uji',
    );
    expect(sesi.token).toBeTruthy();
    expect(sqlDari(writes).some((q) => q.includes('INSERT INTO sesi_pengguna'))).toBe(true);
  });

  it('password salah, email tak dikenal, akun tanpa password, nonaktif, dan non-admin mendapat galat yang sama', async () => {
    const kasus = [
      { siap: {}, masuk: { email: 'admin@ith.ac.id', password: 'Salah12345' } },
      { siap: {}, masuk: { email: 'tidakada@ith.ac.id', password: PASSWORD } },
      { siap: { hash: false }, masuk: { email: 'admin@ith.ac.id', password: PASSWORD } },
      { siap: { status: 'NONAKTIF' }, masuk: { email: 'admin@ith.ac.id', password: PASSWORD } },
      { siap: { peran: ['DOSEN_STAF'] }, masuk: { email: 'admin@ith.ac.id', password: PASSWORD } },
    ];
    for (const { siap, masuk } of kasus) {
      const { service } = await siapkan(siap);
      const galat = await service.loginPassword(masuk, '1.1.1.1', 'uji').catch((e: unknown) => e);
      expect(galat).toBeInstanceOf(UnauthorizedException);
      expect((galat as Error).message).toBe('Email atau password salah');
    }
  });

  it('setiap jalur hanya untuk perannya: Admin di jalur Admin, Superadmin di jalur Superadmin', async () => {
    const masuk = { email: 'admin@ith.ac.id', password: PASSWORD };
    const admin = await siapkan({ peran: ['ADMIN'] });
    await expect(admin.service.loginPassword(masuk, 'ip', 'ua', 'admin')).resolves.toBeTruthy();
    await expect(
      (await siapkan({ peran: ['ADMIN'] })).service.loginPassword(masuk, 'ip', 'ua', 'superadmin'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      (await siapkan({ peran: ['SUPERADMIN'] })).service.loginPassword(masuk, 'ip', 'ua', 'admin'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      (await siapkan({ peran: ['ADMIN', 'SUPERADMIN'] })).service.loginPassword(
        masuk,
        'ip',
        'ua',
        'admin',
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      (await siapkan({ peran: ['SUPERADMIN'] })).service.loginPassword(
        masuk,
        'ip',
        'ua',
        'superadmin',
      ),
    ).resolves.toBeTruthy();
  });

  it('mengunci email setelah 5 kali gagal, termasuk untuk password yang benar', async () => {
    const { service } = await siapkan();
    for (let i = 0; i < 5; i++)
      await expect(
        service.loginPassword({ email: 'admin@ith.ac.id', password: 'Salah12345' }, 'ip', 'ua'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    const galat = await service
      .loginPassword({ email: 'admin@ith.ac.id', password: PASSWORD }, 'ip', 'ua')
      .catch((e: unknown) => e);
    expect(galat).toBeInstanceOf(HttpException);
    expect((galat as HttpException).getStatus()).toBe(429);
  });
});

describe('IdentityService.ubahPassword', () => {
  it('mewajibkan password saat ini yang benar bila sudah punya password', async () => {
    const { service, writes } = await siapkan();
    const baru = { passwordBaru: 'BaruSekali22', konfirmasiPassword: 'BaruSekali22' };
    await expect(service.ubahPassword('t', baru)).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
    await expect(
      service.ubahPassword('t', { ...baru, passwordSaatIni: 'Salah12345' }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(sqlDari(writes).some((q) => q.includes('password_hash'))).toBe(false);
    await expect(
      service.ubahPassword('t', { ...baru, passwordSaatIni: PASSWORD }),
    ).resolves.toEqual(expect.objectContaining({ punyaPassword: true }));
    const sql = sqlDari(writes);
    expect(sql.some((q) => q.includes('UPDATE pengguna SET password_hash=?'))).toBe(true);
    expect(sql.some((q) => q.includes('id<>?') && q.includes('sesi_pengguna'))).toBe(true);
    expect(sql.some((q) => q.includes('INSERT INTO audit_log'))).toBe(true);
  });

  it('membuat password pertama tanpa password saat ini', async () => {
    const { service } = await siapkan({ hash: false });
    await expect(
      service.ubahPassword('t', {
        passwordBaru: 'BaruSekali22',
        konfirmasiPassword: 'BaruSekali22',
      }),
    ).resolves.toEqual(expect.objectContaining({ punyaPassword: true }));
  });

  it('menolak akun non-admin dan password baru yang lemah', async () => {
    const { service } = await siapkan({ peran: ['DOSEN_STAF'] });
    await expect(
      service.ubahPassword('t', {
        passwordBaru: 'BaruSekali22',
        konfirmasiPassword: 'BaruSekali22',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    const admin2 = await siapkan();
    await expect(
      admin2.service.ubahPassword('t', {
        passwordSaatIni: PASSWORD,
        passwordBaru: 'lemah',
        konfirmasiPassword: 'lemah',
      }),
    ).rejects.toThrow();
  });
});
