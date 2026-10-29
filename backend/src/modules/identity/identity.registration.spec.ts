import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { ConflictException, ServiceUnavailableException } from '@nestjs/common';
import type { Pool, PoolConnection, ResultSetHeader } from 'mysql2/promise';
import { describe, expect, it, vi } from 'vitest';
import { IdentityRepository, type UserRow } from './identity.repository.js';
import { IdentityService } from './identity.service.js';
import { AuditService } from './audit.service.js';
import { cocokPassword } from './password.js';

const input = { nama: 'Dosen Kampus', email: 'dosen@gmail.com', password: 'PasswordKuat123', konfirmasiPassword: 'PasswordKuat123', unitManual: 'Unit lain' };
function fixture() {
  const repo = new IdentityRepository({} as Pool);
  const db = {} as PoolConnection;
  const row = { id: '9', nama: input.nama, email: input.email, google_sub: null, status: 'MENUNGGU_VERIFIKASI', deleted_at: null } as UserRow;
  vi.spyOn(repo, 'transaction').mockImplementation(fn => fn(db));
  vi.spyOn(repo, 'emailTerpakai').mockResolvedValue(false);
  vi.spyOn(repo, 'byEmail').mockResolvedValue(row);
  vi.spyOn(repo, 'unitValid').mockResolvedValue(true);
  const writes = vi.spyOn(repo, 'write').mockResolvedValue({ affectedRows: 1 } as ResultSetHeader);
  const audit = new AuditService(repo);
  const service = new IdentityService(repo, audit, new ConfigService({ identitas: { key: 'key-test-only', sessionSeconds: 3600 } }) as never);
  return { repo, service, writes, audit };
}
describe('pendaftaran email/password', () => {
  it('menyimpan hash dan status pending, menetapkan hanya Dosen/Staf serta mengaudit tanpa kredensial', async () => {
    const { service, writes, repo } = fixture();
    const result = await service.registerWithPassword(input, '127.0.0.1', 'test');
    expect(result.result).toEqual({ id: '9', status: 'MENUNGGU_VERIFIKASI', peran: ['DOSEN_STAF'] });
    const insert = writes.mock.calls.find(([, sql]) => sql.includes('INSERT INTO pengguna(email'))!;
    const hash = String(insert[2]?.[2]);
    expect(await cocokPassword(input.password, hash)).toBe(true);
    expect(insert[1]).toContain("'MENUNGGU_VERIFIKASI'");
    expect(writes.mock.calls.some(([, sql]) => sql.includes("kode='DOSEN_STAF'"))).toBe(true);
    expect(repo.emailTerpakai).toHaveBeenCalledWith(expect.anything(), input.email, false);
    expect(JSON.stringify(writes.mock.calls)).not.toContain(input.password);
    expect(JSON.stringify(writes.mock.calls)).not.toContain(result.token);
    const logs = writes.mock.calls.filter(([, sql]) => sql.includes('audit_log'));
    expect(logs).toHaveLength(1);
    expect(JSON.stringify(logs)).not.toContain(hash);
  });
  it('menolak injeksi status/peran sebelum transaksi', async () => {
    const f = fixture();
    for (const extra of [{ peran: ['SUPERADMIN'] }, { status: 'AKTIF' }, { googleSub: 'spoof' }])
      await expect(f.service.registerWithPassword({ ...input, ...extra }, '', '')).rejects.toThrow();
    expect(f.repo.transaction).not.toHaveBeenCalled();
  });
  it('tidak mengubah akun yang emailnya sudah dipakai, termasuk Google atau pengelola', async () => {
    const f = fixture();
    vi.mocked(f.repo.emailTerpakai).mockResolvedValue(true);
    await expect(f.service.registerWithPassword(input, '', '')).rejects.toBeInstanceOf(ConflictException);
    expect(f.writes).not.toHaveBeenCalled();
  });
  it('race email duplikat menjadi konflik tanpa mengekspos pesan SQL', async () => {
    const f = fixture();
    f.writes.mockRejectedValueOnce(Object.assign(new Error('private SQL data'), { code: 'ER_DUP_ENTRY' }));
    const error = await f.service.registerWithPassword(input, '', '').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ConflictException);
    expect((error as Error).message).not.toContain('private SQL');
  });
  it('membatasi proses pendaftaran serentak lalu melepaskan slot setelah selesai', async () => {
    const f = fixture();
    const requests = Array.from({ length: 4 }, () => f.service.registerWithPassword(input, '', ''));
    await expect(f.service.registerWithPassword(input, '', '')).rejects.toBeInstanceOf(ServiceUnavailableException);
    await Promise.all(requests);
    await expect(f.service.registerWithPassword(input, '', '')).resolves.toHaveProperty('token');
  });
});
