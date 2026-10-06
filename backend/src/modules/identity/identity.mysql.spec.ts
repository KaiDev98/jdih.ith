import 'reflect-metadata';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';
import { randomUUID } from 'node:crypto';
import mysql from 'mysql2';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import { ConfigService } from '@nestjs/config';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { IdentityRepository } from './identity.repository.js';
import { IdentityService } from './identity.service.js';
import { AuditService } from './audit.service.js';
import { DocumentPolicyService } from './document-policy.service.js';
import { acak, cekIzin, hashToken } from './security.js';

const enabled = Boolean(process.env.IDENTITY_TEST_ENV);
describe.skipIf(!enabled)('MySQL 8.4 identity/security integration', () => {
  let pool: Pool;
  let repo: IdentityRepository;
  let audit: AuditService;
  let identity: IdentityService;
  let policy: DocumentPolicyService;

  beforeAll(async () => {
    const env = parseEnv(readFileSync(resolve(process.env.IDENTITY_TEST_ENV!), 'utf8'));
    if (env.DB_NAME !== 'jdih_ith_v2_test') throw new Error('Unsafe identity test database');
    if (!['127.0.0.1', 'localhost', '::1'].includes(env.DB_HOST ?? ''))
      throw new Error('Identity MySQL integration accepts only local hosts');
    const rawPool = mysql.createPool({
      host: env.DB_HOST,
      port: Number(env.DB_PORT),
      database: env.DB_NAME,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      timezone: 'Z',
      supportBigNumbers: true,
      bigNumberStrings: true,
      dateStrings: ['DATE', 'DATETIME'],
      connectionLimit: 8,
    });
    rawPool.on('connection', (connection) => {
      connection.query("SET time_zone = '+00:00'", (error) => {
        if (error) connection.destroy();
      });
    });
    pool = rawPool.promise();
    const [server] = await pool.query<RowDataPacket[]>(
      'SELECT VERSION() version,DATABASE() name,@@session.time_zone session_zone',
    );
    const serverInfo = server[0];
    if (!serverInfo) throw new Error('MySQL safety query returned no rows');
    expect(String(serverInfo.version)).toMatch(/^8\.4\./);
    expect(serverInfo.name).toBe('jdih_ith_v2_test');
    expect(serverInfo.session_zone).toBe('+00:00');
    repo = new IdentityRepository(pool);
    audit = new AuditService(repo);
    identity = new IdentityService(
      repo,
      audit,
      new ConfigService({ identitas: { key: 'mysql-integration-only-key', sessionSeconds: 600 } }),
    );
    policy = new DocumentPolicyService(repo, audit);
  }, 15000);

  afterAll(async () => {
    await pool.end();
  });

  const unique = () => randomUUID().replaceAll('-', '');
  async function addUnit() {
    const suffix = unique();
    const result = await repo.write(pool, 'INSERT INTO unit_kerja(kode,nama) VALUES(?,?)', [
      suffix,
      `Unit ${suffix}`,
    ]);
    return String(result.insertId);
  }
  async function addUser(
    role: 'ADMIN' | 'SUPERADMIN' | 'DOSEN_STAF',
    status: 'AKTIF' | 'MENUNGGU_VERIFIKASI' | 'DITOLAK' | 'NONAKTIF' = 'AKTIF',
  ) {
    const suffix = unique();
    const unitId = await addUnit();
    const result = await repo.write(
      pool,
      'INSERT INTO pengguna(google_sub,email,nama,status,unit_kerja_id,verified_at,rejection_reason) VALUES(?,?,?,?,?,IF(?=\'AKTIF\',UTC_TIMESTAMP(6),NULL),IF(?=\'DITOLAK\',\'Rejected test fixture\',NULL))',
      [`sub-${suffix}`, `${suffix}@ith.ac.id`, `User ${suffix}`, status, unitId, status, status],
    );
    const id = String(result.insertId);
    await repo.write(
      pool,
      'INSERT INTO pengguna_peran(pengguna_id,peran_id) SELECT ?,id FROM peran WHERE kode=?',
      [id, role],
    );
    return { id, unitId, sub: `sub-${suffix}`, email: `${suffix}@ith.ac.id`, nama: `User ${suffix}` };
  }
  async function addAdmin() {
    const user = await addUser('ADMIN');
    const result = await identity.login(
      { sub: user.sub, email: user.email, nama: user.nama, avatar: null },
      '127.0.0.1',
      'mysql-test',
    );
    if (!result) throw new Error('Provisioned test Admin was not recognized');
    return { ...user, token: result.token };
  }
  async function register(input: { unitKerjaId: string } | { unitManual: string }) {
    const suffix = unique();
    const account = {
      sub: `registration-${suffix}`,
      email: `registration-${suffix}@ith.ac.id`,
      nama: `Registration ${suffix}`,
      avatar: null,
    };
    const result = await identity.register(account, input, '127.0.0.1', 'mysql-test');
    return { ...account, ...result, id: result.result.id };
  }
  async function dbUser(id: string) {
    const row = (await repo.user(pool, id))!;
    return repo.principal(pool, row);
  }
  async function secretResource(ownerId: string) {
    const [types] = await pool.query<RowDataPacket[]>('SELECT id FROM jenis_dokumen ORDER BY id LIMIT 1');
    const suffix = unique();
    const result = await repo.write(
      pool,
      'INSERT INTO dokumen(kode_dokumen,slug,jenis_dokumen_id,created_by) VALUES(?,?,?,?)',
      [`TEST-${suffix}`, `test-${suffix}`, String(types[0]!.id), ownerId],
    );
    return {
      id: String(result.insertId),
      tingkatAkses: 'rahasia' as const,
      published: true,
      current: true,
      deleted: false,
    };
  }
  async function addGrant(
    documentId: string,
    userId: string,
    grantorId: string,
    state: 'active' | 'expired' | 'revoked',
  ) {
    if (state === 'active')
      await repo.write(
        pool,
        'INSERT INTO dokumen_akses_rahasia(dokumen_id,pengguna_id,granted_by,grant_reason) VALUES(?,?,?,?)',
        [documentId, userId, grantorId, 'Integration test grant'],
      );
    else if (state === 'expired')
      await repo.write(
        pool,
        'INSERT INTO dokumen_akses_rahasia(dokumen_id,pengguna_id,granted_by,granted_at,expires_at,grant_reason) VALUES(?,?,?,UTC_TIMESTAMP(6)-INTERVAL 2 HOUR,UTC_TIMESTAMP(6)-INTERVAL 1 HOUR,?)',
        [documentId, userId, grantorId, 'Expired integration grant'],
      );
    else
      await repo.write(
        pool,
        'INSERT INTO dokumen_akses_rahasia(dokumen_id,pengguna_id,granted_by,granted_at,revoked_at,grant_reason,revoke_reason) VALUES(?,?,?,UTC_TIMESTAMP(6)-INTERVAL 2 HOUR,UTC_TIMESTAMP(6),?,?)',
        [documentId, userId, grantorId, 'Revoked integration grant', 'Revoked in test'],
      );
  }

  it('schema and seed are present and verifier is ADMIN plus permission, not a role', async () => {
    const [tables] = await pool.query<RowDataPacket[]>('SHOW TABLES');
    expect(tables).toHaveLength(25);
    const [verifier] = await repo.rows<RowDataPacket & { total: number }>(
      pool,
      "SELECT COUNT(*) total FROM peran WHERE kode='VERIFIER'",
    );
    expect(Number(verifier!.total)).toBe(0);
    const admin = await addAdmin();
    const principal = await dbUser(admin.id);
    expect(principal.peran).toEqual(['ADMIN']);
    expect(principal.izin).toContain('users.approve');
    expect(principal.izin).toContain('users.reject');
  });

  it('creates pending DOSEN_STAF registered against an existing unit and stores only token hash', async () => {
    const unitId = await addUnit();
    const user = await register({ unitKerjaId: unitId });
    expect(user.result.status).toBe('MENUNGGU_VERIFIKASI');
    expect(user.result.peran).toEqual(['DOSEN_STAF']);
    const rows = await repo.rows<RowDataPacket & { token_hash: Buffer; unit_kerja_id: string }>(
      pool,
      'SELECT s.token_hash,p.unit_kerja_id FROM sesi_pengguna s JOIN pengguna p ON p.id=s.pengguna_id WHERE p.id=?',
      [user.id],
    );
    expect(rows[0]!.unit_kerja_id).toBe(unitId);
    expect(Buffer.isBuffer(rows[0]!.token_hash)).toBe(true);
    expect(rows[0]!.token_hash).toEqual(hashToken(user.token));
    expect(rows[0]!.token_hash.toString()).not.toBe(user.token);
  });

  it('creates pending DOSEN_STAF with a manual unit proposal without inventing a master unit', async () => {
    const before = await repo.rows<RowDataPacket & { total: number }>(pool, 'SELECT COUNT(*) total FROM unit_kerja');
    const user = await register({ unitManual: 'Unit manual proposed by integration' });
    const row = await repo.user(pool, user.id);
    const after = await repo.rows<RowDataPacket & { total: number }>(pool, 'SELECT COUNT(*) total FROM unit_kerja');
    expect(row?.status).toBe('MENUNGGU_VERIFIKASI');
    expect(row?.unit_manual).toBe('Unit manual proposed by integration');
    expect(row?.unit_kerja_id).toBeNull();
    expect(Number(after[0]!.total)).toBe(Number(before[0]!.total));
  });

  it('approves a pending manual-unit account, resolves its unit, and persists audit', async () => {
    const admin = await addAdmin();
    const user = await register({ unitManual: 'Unmapped unit' });
    await identity.decision(admin.token, user.id, 'approve', { unitKerjaId: admin.unitId });
    const row = await repo.user(pool, user.id);
    expect(row?.status).toBe('AKTIF');
    expect(row?.unit_kerja_id).toBe(admin.unitId);
    expect(row?.unit_manual).toBe('Unmapped unit');
    const [logs] = await repo.rows<RowDataPacket & { action: string }>(
      pool,
      "SELECT action FROM audit_log WHERE entity_id=? AND action='APPROVE'",
      [user.id],
    );
    expect(logs?.action).toBe('APPROVE');
  });

  it('rejects with a reason, revokes pending sessions, audits, and denies the old session', async () => {
    const admin = await addAdmin();
    const user = await register({ unitManual: 'Rejected unit' });
    await identity.decision(admin.token, user.id, 'reject', { alasan: 'Tidak sesuai ketentuan' });
    const row = await repo.user(pool, user.id);
    expect(row?.status).toBe('DITOLAK');
    expect(row?.rejection_reason).toBe('Tidak sesuai ketentuan');
    await expect(identity.authenticate(user.token)).rejects.toThrow();
    const [session] = await repo.rows<RowDataPacket & { revoked_at: string }>(
      pool,
      'SELECT revoked_at FROM sesi_pengguna WHERE pengguna_id=?',
      [user.id],
    );
    expect(session?.revoked_at).toBeTruthy();
    const [log] = await repo.rows<RowDataPacket & { action: string; after_json: string }>(
      pool,
      "SELECT action,after_json FROM audit_log WHERE entity_id=? AND action='REJECT'",
      [user.id],
    );
    expect(log?.action).toBe('REJECT');
    expect(JSON.stringify(log?.after_json)).toContain('Tidak sesuai ketentuan');
  });

  it('deactivates an active staff member, revokes sessions, and denies the former session', async () => {
    const admin = await addAdmin();
    const user = await register({ unitKerjaId: admin.unitId });
    await identity.decision(admin.token, user.id, 'approve', { unitKerjaId: admin.unitId });
    const staffSession = await identity.authenticate(user.token);
    expect(staffSession.user.status).toBe('AKTIF');
    await identity.decision(admin.token, user.id, 'status', {
      status: 'NONAKTIF',
      alasan: 'Tidak lagi bertugas',
    });
    expect((await repo.user(pool, user.id))?.status).toBe('NONAKTIF');
    await expect(identity.authenticate(user.token)).rejects.toThrow();
    const [session] = await repo.rows<RowDataPacket & { revoked_at: string }>(
      pool,
      'SELECT revoked_at FROM sesi_pengguna WHERE pengguna_id=?',
      [user.id],
    );
    expect(session?.revoked_at).toBeTruthy();
  });

  it.each(['MENUNGGU_VERIFIKASI', 'DITOLAK', 'NONAKTIF'] as const)(
    '%s principal is denied access to INTERNAL documents',
    async (status) => {
      const user = await addUser('DOSEN_STAF', status);
      const principal = await dbUser(user.id);
      await expect(
        policy.assertRead(
          { id: 'test-internal', tingkatAkses: 'internal', published: true, current: true, deleted: false },
          principal,
        ),
      ).rejects.toThrow();
    },
  );

  it('resolves valid sessions, rotates tokens, rejects old tokens, then revokes on logout', async () => {
    const user = await register({ unitManual: 'Session unit' });
    expect((await identity.authenticate(user.token)).user.id).toBe(user.id);
    const oldToken = user.token;
    const refreshed = await identity.refresh(oldToken);
    expect(refreshed.token).not.toBe(oldToken);
    await expect(identity.authenticate(oldToken)).rejects.toThrow();
    expect((await identity.authenticate(refreshed.token)).user.id).toBe(user.id);
    await identity.logout(refreshed.token);
    await expect(identity.authenticate(refreshed.token)).rejects.toThrow();
  });

  it.each(['expired', 'revoked'] as const)('%s session is denied by MySQL-backed resolver', async (state) => {
    const user = await addUser('DOSEN_STAF');
    const token = acak();
    const result = await repo.write(
      pool,
      'INSERT INTO sesi_pengguna(pengguna_id,token_hash,created_at,expires_at,revoked_at) VALUES(?,?,?, ?,?)',
      [
        user.id,
        hashToken(token),
        '2000-01-01 00:00:00',
        state === 'expired' ? '2000-01-02 00:00:00' : '2099-01-01 00:00:00',
        state === 'revoked' ? new Date().toISOString().slice(0, 23).replace('T', ' ') : null,
      ],
    );
    expect(result.affectedRows).toBe(1);
    await expect(identity.authenticate(token)).rejects.toThrow();
  });

  it('loads role permissions and evaluates ALLOW override from MySQL', async () => {
    const admin = await addAdmin();
    const staff = await addUser('DOSEN_STAF');
    await repo.write(
      pool,
      "INSERT INTO pengguna_izin(pengguna_id,izin_id,efek,alasan,granted_by) SELECT ?,id,'ALLOW','Integration allow',? FROM izin WHERE kode='documents.create'",
      [staff.id, admin.id],
    );
    const staffPrincipal = await dbUser(staff.id);
    expect(staffPrincipal.izin).toContain('documents.create');
    const adminPrincipal = await dbUser(admin.id);
    expect(adminPrincipal.izin).toContain('users.approve');
  });

  it('DENY override from MySQL wins for SUPERADMIN', async () => {
    const operator = await addAdmin();
    const superadmin = await addUser('SUPERADMIN');
    await repo.write(
      pool,
      "INSERT INTO pengguna_izin(pengguna_id,izin_id,efek,alasan,granted_by) SELECT ?,id,'DENY','Integration deny',? FROM izin WHERE kode='workflow.approve'",
      [superadmin.id, operator.id],
    );
    const principal = await dbUser(superadmin.id);
    expect(principal.peran).toContain('SUPERADMIN');
    expect(principal.izin).not.toContain('workflow.approve');
    expect(() => cekIzin(principal, ['workflow.approve'])).toThrow();
  });

  it('records approve/reject/deactivate/logout audit events without raw token or cookie values', async () => {
    const admin = await addAdmin();
    const pendingApproved = await register({ unitManual: 'Approve audit' });
    const pendingRejected = await register({ unitManual: 'Reject audit' });
    await identity.decision(admin.token, pendingApproved.id, 'approve', { unitKerjaId: admin.unitId });
    await identity.decision(admin.token, pendingRejected.id, 'reject', { alasan: 'Audit rejection' });
    await identity.decision(admin.token, pendingApproved.id, 'status', {
      status: 'NONAKTIF',
      alasan: 'Audit deactivation',
    });
    await identity.logout(admin.token);
    const logs = await repo.rows<RowDataPacket & { action: string; before_json: string; after_json: string }>(
      pool,
      'SELECT action,before_json,after_json FROM audit_log WHERE actor_id=?',
      [admin.id],
    );
    const actions = logs.map((row) => row.action);
    expect(actions).toEqual(expect.arrayContaining(['APPROVE', 'REJECT', 'DEACTIVATE', 'LOGOUT']));
    const auditPayload = JSON.stringify(logs);
    for (const raw of [admin.token, pendingApproved.token, pendingRejected.token, 'raw-cookie-canary'])
      expect(auditPayload).not.toContain(raw);
    expect(auditPayload).not.toContain('Authorization');
  });

  it('rolls back a real account mutation and audit insert together on MySQL when audit fails', async () => {
    const admin = await addAdmin();
    const pending = await register({ unitManual: 'Atomic audit' });
    const insertAudit = repo.insertAudit.bind(repo);
    vi.spyOn(repo, 'insertAudit').mockImplementationOnce(async (db, values) => {
      await insertAudit(db, values);
      throw new Error('Injected audit failure after MySQL insert');
    });
    await expect(
      identity.decision(admin.token, pending.id, 'approve', { unitKerjaId: admin.unitId }),
    ).rejects.toThrow('Injected audit failure');
    expect((await repo.user(pool, pending.id))?.status).toBe('MENUNGGU_VERIFIKASI');
    const [logs] = await repo.rows<RowDataPacket & { total: number }>(
      pool,
      "SELECT COUNT(*) total FROM audit_log WHERE action='APPROVE' AND entity_id=?",
      [pending.id],
    );
    expect(Number(logs!.total)).toBe(0);
  });

  it('allows a current active Secret grant and records access audit', async () => {
    const admin = await addAdmin();
    const staff = await addUser('DOSEN_STAF');
    const document = await secretResource(admin.id);
    await addGrant(document.id, staff.id, admin.id, 'active');
    await expect(policy.assertRead(document, await dbUser(staff.id))).resolves.toBeUndefined();
    const [logs] = await repo.rows<RowDataPacket & { total: number }>(
      pool,
      "SELECT COUNT(*) total FROM audit_log WHERE action='SECRET_ACCESS' AND actor_id=? AND entity_id=?",
      [staff.id, document.id],
    );
    expect(Number(logs!.total)).toBe(1);
  });

  it.each(['expired', 'revoked'] as const)('%s Secret grant is denied', async (state) => {
    const admin = await addAdmin();
    const staff = await addUser('DOSEN_STAF');
    const document = await secretResource(admin.id);
    await addGrant(document.id, staff.id, admin.id, state);
    await expect(policy.assertRead(document, await dbUser(staff.id))).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('uses not-found semantics for an unauthorized Secret resource', async () => {
    const admin = await addAdmin();
    const staff = await addUser('DOSEN_STAF');
    const document = await secretResource(admin.id);
    await expect(policy.assertRead(document, await dbUser(staff.id))).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
