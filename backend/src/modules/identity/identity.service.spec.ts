import 'reflect-metadata';
import { describe, it, expect, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import type { Pool, PoolConnection, ResultSetHeader } from 'mysql2/promise';
import type { PenggunaAktif } from '@jdih/shared';
import { IdentityRepository, utc, type UserRow, type SessionRow } from './identity.repository.js';
import { IdentityService } from './identity.service.js';
import { AuditService } from './audit.service.js';
import { acak, hashToken } from './security.js';

function fixture() {
  const row = {
    id: '1',
    google_sub: 'sub',
    email: 'staff@ith.ac.id',
    nama: 'Staff',
    avatar_url: null,
    unit_kerja_id: '2',
    unit_manual: null,
    status: 'AKTIF',
    deleted_at: null,
    verified_at: utc(),
  } as UserRow;
  const user: PenggunaAktif = {
    id: '1',
    nama: 'Staff',
    surel: 'staff@ith.ac.id',
    status: 'AKTIF',
    unitKerjaId: '2',
    unitManual: null,
    avatarUrl: null,
    peran: ['DOSEN_STAF'],
    izin: [],
  };
  const session = {
    id: '10',
    pengguna_id: '1',
    expires_at: utc(new Date(Date.now() + 100000)),
    revoked_at: null,
  } as SessionRow;
  const repo = new IdentityRepository({} as Pool),
    db = {} as PoolConnection;
  vi.spyOn(repo, 'transaction').mockImplementation((fn) => fn(db));
  vi.spyOn(repo, 'user').mockResolvedValue(row);
  vi.spyOn(repo, 'principal').mockResolvedValue(user);
  vi.spyOn(repo, 'session').mockResolvedValue(session);
  vi.spyOn(repo, 'unitValid').mockResolvedValue(true);
  vi.spyOn(repo, 'byIdentity').mockResolvedValue([row]);
  const writes = vi.spyOn(repo, 'write').mockResolvedValue({ affectedRows: 1 } as ResultSetHeader);
  const audit = new AuditService(repo);
  const service = new IdentityService(
    repo,
    audit,
    new ConfigService({ identitas: { sessionSeconds: 600, key: 'test-only-key' } }),
  );
  return { repo, row, user, session, writes, service, db, audit };
}
describe('sessions', () => {
  it('valid session reloads current identity and effective permissions', async () => {
    const f = fixture(),
      token = acak();
    expect((await f.service.authenticate(token)).user.id).toBe('1');
    expect(f.repo.session).toHaveBeenCalledWith(f.repo.pool, hashToken(token), false);
    expect(f.repo.principal).toHaveBeenCalled();
    expect(f.writes.mock.calls.some(([, q]) => q.includes('last_used_at'))).toBe(true);
  });
  for (const invalid of ['expired', 'revoked', 'missing', 'deleted', 'NONAKTIF', 'DITOLAK'])
    it(invalid + ' denied', async () => {
      const f = fixture();
      if (invalid === 'expired') f.session.expires_at = utc(new Date(0));
      else if (invalid === 'revoked') f.session.revoked_at = utc();
      else if (invalid === 'missing') vi.mocked(f.repo.session).mockResolvedValue(undefined);
      else if (invalid === 'deleted') f.row.deleted_at = utc();
      else f.row.status = invalid as UserRow['status'];
      await expect(f.service.authenticate(acak())).rejects.toThrow();
    });
  it('logout revokes and audits in same transaction', async () => {
    const f = fixture();
    await f.service.logout(acak());
    expect(f.writes.mock.calls.some(([db, q]) => db === f.db && q.includes('SET revoked_at'))).toBe(
      true,
    );
    expect(
      f.writes.mock.calls.some(
        ([db, q, p]) => db === f.db && q.includes('audit_log') && p?.includes('LOGOUT'),
      ),
    ).toBe(true);
  });
  it('refresh rotates token hash without extending expiry', async () => {
    const f = fixture(),
      old = acak(),
      result = await f.service.refresh(old);
    expect(result.token).not.toBe(old);
    expect(utc(result.expires)).toBe(f.session.expires_at);
    const call = f.writes.mock.calls.find(([, q]) => q.includes('SET token_hash'))!;
    expect(call[2]?.[0]).toEqual(hashToken(result.token));
    expect(JSON.stringify(f.writes.mock.calls)).not.toContain(result.token);
  });
});
describe('identity lifecycle', () => {
  const identity = { sub: 'sub', email: 'staff@ith.ac.id', nama: 'Staff', avatar: null };
  it('new registration creates pending staff, keeps manual proposal and stores only session hash', async () => {
    const f = fixture();
    f.row.status = 'MENUNGGU_VERIFIKASI';
    vi.mocked(f.repo.byIdentity).mockResolvedValueOnce([]).mockResolvedValueOnce([f.row]);
    const result = await f.service.register(
      identity,
      { unitManual: 'Proposed unit' },
      '127.0.0.1',
      'test-agent',
    );
    expect(result.result.status).toBe('MENUNGGU_VERIFIKASI');
    expect(result.result.peran).toEqual(['DOSEN_STAF']);
    expect(f.writes.mock.calls.find(([, q]) => q.includes('INSERT INTO pengguna('))?.[2]).toContain(
      'Proposed unit',
    );
    expect(f.writes.mock.calls.some(([, q]) => q.includes('INSERT INTO unit_kerja'))).toBe(false);
    expect(JSON.stringify(f.writes.mock.calls)).not.toContain(result.token);
    expect(
      f.writes.mock.calls.find(([, q]) => q.includes('INSERT INTO sesi_pengguna'))?.[2]?.[1],
    ).toEqual(hashToken(result.token));
  });
  it('registration rejects arbitrary role before transaction', async () => {
    const f = fixture();
    await expect(
      f.service.register(identity, { unitManual: 'Unit', peran: ['ADMIN'] }, '', ''),
    ).rejects.toThrow();
    expect(f.repo.transaction).not.toHaveBeenCalled();
  });
  it('preprovisioned Admin binds verified sub', async () => {
    const f = fixture();
    f.row.google_sub = null;
    f.user.peran = ['ADMIN'];
    await f.service.login(identity, '', '');
    expect(f.writes.mock.calls.some(([, q]) => q.includes('SET google_sub'))).toBe(true);
  });
  it('cannot bind a conflicting sub or unprovisioned staff', async () => {
    const f = fixture();
    f.row.google_sub = 'other';
    await expect(f.service.login(identity, '', '')).rejects.toThrow();
    f.row.google_sub = null;
    await expect(f.service.login(identity, '', '')).rejects.toThrow();
  });
  it('approval resolves manual unit, activates and audits authenticated actor', async () => {
    const f = fixture();
    const target = {
      ...f.row,
      id: '2',
      status: 'MENUNGGU_VERIFIKASI',
      unit_kerja_id: null,
      unit_manual: 'Manual',
    } as UserRow;
    const admin = {
      ...f.user,
      peran: ['ADMIN'] as PenggunaAktif['peran'],
      izin: ['users.approve'] as PenggunaAktif['izin'],
    };
    vi.mocked(f.repo.user).mockResolvedValueOnce(f.row).mockResolvedValueOnce(target);
    vi.mocked(f.repo.principal)
      .mockResolvedValueOnce(admin)
      .mockResolvedValueOnce({ ...f.user, id: '2', status: 'MENUNGGU_VERIFIKASI' });
    expect(await f.service.decision(acak(), '2', 'approve', { unitKerjaId: '9' })).toEqual({
      id: '2',
      status: 'AKTIF',
    });
    expect(f.repo.unitValid).toHaveBeenCalledWith(f.db, '9');
    expect(f.writes.mock.calls.find(([, q]) => q.includes("SET status='AKTIF'"))?.[2]).toContain(
      '1',
    );
    expect(f.writes.mock.calls.find(([, q]) => q.includes('audit_log'))?.[2]).toContain('APPROVE');
  });
  it('rejection requires reason, revokes all sessions and records audit', async () => {
    const f = fixture();
    await expect(f.service.decision(acak(), '2', 'reject', { alasan: ' ' })).rejects.toThrow();
    const target = { ...f.row, id: '2', status: 'MENUNGGU_VERIFIKASI' } as UserRow;
    vi.mocked(f.repo.user).mockResolvedValueOnce(f.row).mockResolvedValueOnce(target);
    vi.mocked(f.repo.principal)
      .mockResolvedValueOnce({ ...f.user, peran: ['ADMIN'], izin: ['users.reject'] })
      .mockResolvedValueOnce({ ...f.user, id: '2' });
    await f.service.decision(acak(), '2', 'reject', { alasan: 'Tidak sesuai' });
    expect(
      f.writes.mock.calls.some(([, q, p]) => q.includes('SET revoked_at') && p?.includes('2')),
    ).toBe(true);
    expect(f.writes.mock.calls.find(([, q]) => q.includes('audit_log'))?.[2]).toContain('REJECT');
  });
  it('cannot approve operations accounts through normal staff API', async () => {
    const f = fixture();
    vi.mocked(f.repo.principal).mockResolvedValue({
      ...f.user,
      peran: ['ADMIN'],
      izin: ['users.approve'],
    });
    await expect(
      f.service.decision(acak(), '2', 'approve', { unitKerjaId: '1' }),
    ).rejects.toThrow();
  });
  for (const [before, after, action] of [
    ['AKTIF', 'NONAKTIF', 'DEACTIVATE'],
    ['NONAKTIF', 'AKTIF', 'REACTIVATE'],
  ] as const)
    it(action + ' checks status and audits reason', async () => {
      const f = fixture();
      const target = { ...f.row, id: '2', status: before } as UserRow;
      vi.mocked(f.repo.user).mockResolvedValueOnce(f.row).mockResolvedValueOnce(target);
      vi.mocked(f.repo.principal)
        .mockResolvedValueOnce({ ...f.user, peran: ['ADMIN'], izin: ['users.set_status'] })
        .mockResolvedValueOnce({ ...f.user, id: '2', status: before });
      expect(
        await f.service.decision(acak(), '2', 'status', {
          status: after,
          alasan: 'Keputusan admin',
        }),
      ).toEqual({ id: '2', status: after });
      const audit = f.writes.mock.calls.find(([, q]) => q.includes('audit_log'));
      expect(audit?.[2]).toContain(action);
      expect(JSON.stringify(audit)).toContain('Keputusan admin');
      expect(f.writes.mock.calls.some(([, q]) => q.includes('SET revoked_at'))).toBe(
        after === 'NONAKTIF',
      );
    });
  it('pending cannot bypass approval using direct activation', async () => {
    const f = fixture();
    const target = { ...f.row, id: '2', status: 'MENUNGGU_VERIFIKASI' } as UserRow;
    vi.mocked(f.repo.user).mockResolvedValueOnce(f.row).mockResolvedValueOnce(target);
    vi.mocked(f.repo.principal)
      .mockResolvedValueOnce({ ...f.user, peran: ['ADMIN'], izin: ['users.set_status'] })
      .mockResolvedValueOnce({ ...f.user, id: '2', status: 'MENUNGGU_VERIFIKASI' });
    await expect(
      f.service.decision(acak(), '2', 'status', { status: 'AKTIF', alasan: 'Bypass' }),
    ).rejects.toThrow();
  });
  it('audit serializes only allowlisted fields even if runtime object has secrets', async () => {
    const f = fixture();
    const event = {
      action: 'LOGIN_FAILURE' as const,
      actorId: null,
      token: 'sensitive-token',
      cookie: 'sensitive-cookie',
      authorization: 'sensitive-header',
    };
    await f.audit.record(event);
    expect(JSON.stringify(f.writes.mock.calls)).not.toContain('sensitive-');
  });
});
it('repository rolls back instead of committing when audit/mutation fails', async () => {
  const connection = {
    beginTransaction: vi.fn().mockResolvedValue(undefined),
    commit: vi.fn().mockResolvedValue(undefined),
    rollback: vi.fn().mockResolvedValue(undefined),
    release: vi.fn(),
  };
  const repo = new IdentityRepository({
    getConnection: vi.fn().mockResolvedValue(connection),
  } as unknown as Pool);
  await expect(repo.transaction(() => Promise.reject(new Error('audit failure')))).rejects.toThrow(
    'audit failure',
  );
  expect(connection.rollback).toHaveBeenCalledOnce();
  expect(connection.commit).not.toHaveBeenCalled();
  expect(connection.release).toHaveBeenCalledOnce();
});
