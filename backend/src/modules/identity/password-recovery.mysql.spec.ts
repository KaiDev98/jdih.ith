import 'reflect-metadata';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import mysql, { type Pool, type RowDataPacket } from 'mysql2/promise';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { SMTPServer } from 'smtp-server';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { IdentityRepository } from './identity.repository.js';
import { IdentityService } from './identity.service.js';
import { IdentityGuard } from './identity.guard.js';
import { AuditService } from './audit.service.js';
import { PasswordRecoveryRepository } from './password-recovery.repository.js';
import { PasswordRecoveryService } from './password-recovery.service.js';
import { PasswordRecoveryController } from './password-recovery.controller.js';
import { RecoveryMailService } from './recovery-mail.service.js';
import { hashPassword, cocokPassword } from './password.js';
import { acak, hashToken } from './security.js';
import { BungkusTanggapanInterceptor } from '../../common/interceptors/bungkus-tanggapan.interceptor.js';
import { SemuaGalatFilter } from '../../common/filters/semua-galat.filter.js';

describe.skipIf(!process.env.IDENTITY_TEST_ENV)(
  'pemulihan password: MySQL, HTTP dan SMTP lokal',
  () => {
    let pool: Pool,
      repo: IdentityRepository,
      resets: PasswordRecoveryRepository,
      identity: IdentityService;
    let recovery: PasswordRecoveryService, mail: RecoveryMailService, smtp: SMTPServer;
    let config: ConfigService;
    const messages: { to: string; source: string }[] = [];
    let rejectNext = false;
    let connected = false;
    let listening = false;
    const password = 'PasswordLama123';
    const nextPassword = 'PasswordBaru456';
    beforeAll(async () => {
      const env = parseEnv(readFileSync(process.env.IDENTITY_TEST_ENV!, 'utf8'));
      if (
        env.DB_NAME !== 'jdih_ith_v2_test' ||
        !['127.0.0.1', 'localhost'].includes(env.DB_HOST ?? '')
      )
        throw Error('Unsafe recovery test database');
      pool = mysql.createPool({
        host: env.DB_HOST,
        port: Number(env.DB_PORT),
        user: env.DB_USER,
        password: env.DB_PASSWORD,
        database: env.DB_NAME,
        timezone: 'Z',
        dateStrings: ['DATE', 'DATETIME'],
        supportBigNumbers: true,
        bigNumberStrings: true,
        connectionLimit: 8,
      });
      connected = true;
      pool.on('connection', (connection) => {
        void connection.query("SET time_zone='+00:00'");
      });
      const [version] = await pool.query<RowDataPacket[]>('SELECT VERSION() version,DATABASE() db');
      if (!String(version[0]?.version).startsWith('8.4.') || version[0]?.db !== 'jdih_ith_v2_test')
        throw Error('Unexpected database');
      smtp = new SMTPServer({
        authOptional: true,
        disabledCommands: ['AUTH', 'STARTTLS'],
        logger: false,
        onData(stream, session, done) {
          const chunks: Buffer[] = [];
          stream.on('data', (value: Buffer) => chunks.push(value));
          stream.on('end', () => {
            if (rejectNext) {
              rejectNext = false;
              done(new Error('Temporary SMTP failure'));
              return;
            }
            messages.push({
              to: session.envelope.rcptTo[0]?.address ?? '',
              source: Buffer.concat(chunks).toString('utf8'),
            });
            done();
          });
          stream.on('error', done);
        },
      });
      await new Promise<void>((resolve) => smtp.listen(0, '127.0.0.1', resolve));
      listening = true;
      const smtpPort = (smtp.server.address() as AddressInfo).port;
      config = new ConfigService({
        identitas: {
          key: 'recovery-integration-only-key'.repeat(2),
          origin: 'http://localhost:3000',
          secure: false,
          sessionSeconds: 600,
        },
        surel: {
          pengandar: 'smtp',
          host: '127.0.0.1',
          port: smtpPort,
          wajibTls: false,
          dariAlamat: 'noreply@example.test',
          dariNama: 'JDIH Test',
        },
      });
      repo = new IdentityRepository(pool);
      resets = new PasswordRecoveryRepository(repo);
      const audit = new AuditService(repo);
      identity = new IdentityService(repo, audit, config as never);
      mail = new RecoveryMailService(config as never);
      recovery = new PasswordRecoveryService(repo, resets, audit, identity, mail, config as never);
      await mail.verify();
    }, 20_000);
    afterAll(async () => {
      if (connected) await pool.end();
      if (listening) await new Promise<void>((resolve) => smtp.close(resolve));
    });
    async function user(status = 'AKTIF', roles = ['DOSEN_STAF'], hasPassword = true) {
      const key = randomUUID().replaceAll('-', '');
      const email = `recovery-${key}@example.test`;
      const result = await repo.write(
        pool,
        'INSERT INTO pengguna(email,nama,status,password_hash,password_diubah_at,rejection_reason) VALUES(?,?,?,?,UTC_TIMESTAMP(6),?)',
        [
          email,
          'Recovery Test',
          status,
          hasPassword ? await hashPassword(password) : null,
          status === 'DITOLAK' ? 'Fixture ditolak' : null,
        ],
      );
      const id = String(result.insertId);
      for (const role of roles)
        await repo.write(
          pool,
          'INSERT INTO pengguna_peran(pengguna_id,peran_id) SELECT ?,id FROM peran WHERE kode=?',
          [id, role],
        );
      return { id, email };
    }
    async function resetLink(email: string) {
      const generic = await recovery.request({ email });
      expect(generic).toEqual(await recovery.request({ email: 'not-registered@example.test' }));
      await recovery.processQueue();
      const message = messages.filter((m) => m.to === email).at(-1);
      expect(message).toBeDefined();
      const decoded = message!.source
        .replace(/=\r?\n/g, '')
        .replace(/=([A-F0-9]{2})/g, (_m, hex: string) => String.fromCharCode(parseInt(hex, 16)));
      const match = /https?:\/\/[^\s]+\/atur-ulang-password#token=[A-Za-z0-9_-]{43}/.exec(decoded);
      expect(match).not.toBeNull();
      const url = new URL(match![0]);
      expect(url.origin).toBe('http://localhost:3000');
      expect(url.search).toBe('');
      return new URLSearchParams(url.hash.slice(1)).get('token')!;
    }
    it.each(['AKTIF', 'MENUNGGU_VERIFIKASI'])(
      'email %s dikirim lewat SMTP; token sekali pakai, sesi dicabut, status tidak dipromosikan',
      async (status) => {
        const u = await user(status);
        const session = await identity.loginPassword(
          { email: u.email, password },
          '127.0.0.1',
          'Test',
          'staff',
        );
        for (let i = 0; i < 5; i++)
          await expect(
            identity.loginPassword(
              { email: u.email, password: 'wrong' },
              '127.0.0.1',
              'Test',
              'staff',
            ),
          ).rejects.toThrow();
        const token = await resetLink(u.email);
        const row = await resets.byHash(pool, hashToken(token));
        expect(row?.token_hash.equals(Buffer.from(token))).toBe(false);
        expect(row?.password_fingerprint).toHaveLength(32);
        const [jobs] = await pool.query<RowDataPacket[]>(
          'SELECT token_cipher,sent_at FROM password_reset_emails WHERE token_id=?',
          [row!.id],
        );
        expect(jobs[0]?.token_cipher).toBeNull();
        expect(jobs[0]?.sent_at).not.toBeNull();
        await expect(
          recovery.confirm({ token, passwordBaru: nextPassword, konfirmasiPassword: nextPassword }),
        ).resolves.toEqual({ diatur: true });
        await expect(
          recovery.confirm({ token, passwordBaru: nextPassword, konfirmasiPassword: nextPassword }),
        ).rejects.toThrow(/tidak valid/);
        await expect(identity.authenticate(session.token)).rejects.toThrow();
        await expect(
          identity.loginPassword({ email: u.email, password }, '127.0.0.1', 'Test', 'staff'),
        ).rejects.toThrow();
        await expect(
          identity.loginPassword(
            { email: u.email, password: nextPassword },
            '127.0.0.1',
            'Test',
            'staff',
          ),
        ).resolves.toHaveProperty('token');
        expect((await repo.user(pool, u.id))?.status).toBe(status);
        await recovery.processQueue();
        expect(messages.filter((m) => m.to === u.email)).toHaveLength(2);
        expect(messages.filter((m) => m.to === u.email).at(-1)?.source).toContain(
          'Password akun JDIH ITH',
        );
        const [audit] = await pool.query<RowDataPacket[]>(
          'SELECT action,before_json,after_json FROM audit_log WHERE entity_id=? AND action IN (?,?)',
          [u.id, 'PASSWORD_RESET_REQUEST', 'STAFF_PASSWORD_RESET'],
        );
        expect(audit.map((row) => String(row.action))).toEqual([
          'PASSWORD_RESET_REQUEST',
          'STAFF_PASSWORD_RESET',
        ]);
        expect(JSON.stringify(audit)).not.toContain(token);
        expect(JSON.stringify(audit)).not.toContain(nextPassword);
      },
      20_000,
    );
    it('unknown, nonaktif, ditolak, Google-only, Admin dan campuran peran mendapat respons sama tanpa email', async () => {
      const generic = await recovery.request({ email: 'missing@example.test' });
      for (const [status, roles, hasPassword] of [
        ['NONAKTIF', ['DOSEN_STAF'], true],
        ['DITOLAK', ['DOSEN_STAF'], true],
        ['AKTIF', ['DOSEN_STAF'], false],
        ['AKTIF', ['ADMIN'], true],
        ['AKTIF', ['SUPERADMIN'], true],
        ['AKTIF', ['DOSEN_STAF', 'ADMIN'], true],
      ] as const) {
        const u = await user(status, [...roles], hasPassword);
        expect(await recovery.request({ email: u.email })).toEqual(generic);
        expect(await resets.latest(pool, u.id)).toBeUndefined();
      }
    }, 15_000);
    it('token diganti, kedaluwarsa, diubah, dan akun dinonaktifkan ditolak tanpa mengubah password', async () => {
      const u = await user();
      const old = await resetLink(u.email);
      await repo.write(
        pool,
        'UPDATE password_reset_tokens SET created_at=DATE_SUB(UTC_TIMESTAMP(6),INTERVAL 2 MINUTE) WHERE pengguna_id=?',
        [u.id],
      );
      const fresh = await resetLink(u.email);
      await expect(
        recovery.confirm({
          token: old,
          passwordBaru: nextPassword,
          konfirmasiPassword: nextPassword,
        }),
      ).rejects.toThrow(/tidak valid/);
      await expect(
        recovery.confirm({
          token: acak(),
          passwordBaru: nextPassword,
          konfirmasiPassword: nextPassword,
        }),
      ).rejects.toThrow(/tidak valid/);
      await repo.write(
        pool,
        'UPDATE password_reset_tokens SET expires_at=DATE_SUB(UTC_TIMESTAMP(6),INTERVAL 1 SECOND) WHERE token_hash=?',
        [hashToken(fresh)],
      );
      await expect(
        recovery.confirm({
          token: fresh,
          passwordBaru: nextPassword,
          konfirmasiPassword: nextPassword,
        }),
      ).rejects.toThrow(/kedaluwarsa/);
      await repo.write(pool, 'UPDATE pengguna SET status=? WHERE id=?', ['NONAKTIF', u.id]);
      await expect(
        recovery.confirm({
          token: fresh,
          passwordBaru: nextPassword,
          konfirmasiPassword: nextPassword,
        }),
      ).rejects.toThrow(/tidak valid/);
      expect(await cocokPassword(password, (await repo.user(pool, u.id))!.password_hash!)).toBe(
        true,
      );
    }, 15_000);
    it('dua konfirmasi bersamaan hanya satu berhasil', async () => {
      const u = await user(),
        token = await resetLink(u.email);
      const results = await Promise.allSettled(
        [1, 2].map(() =>
          recovery.confirm({ token, passwordBaru: nextPassword, konfirmasiPassword: nextPassword }),
        ),
      );
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    }, 15_000);
    it.each(['role', 'status', 'password', 'email'] as const)(
      'token valid ditolak setelah %s akun berubah',
      async (field) => {
        const u = await user(),
          token = await resetLink(u.email);
        if (field === 'role')
          await repo.write(
            pool,
            "INSERT INTO pengguna_peran(pengguna_id,peran_id) SELECT ?,id FROM peran WHERE kode='ADMIN'",
            [u.id],
          );
        if (field === 'status')
          await repo.write(pool, "UPDATE pengguna SET status='NONAKTIF' WHERE id=?", [u.id]);
        if (field === 'password')
          await repo.setPassword(pool, [
            await hashPassword('ChangedOutside123'),
            '2026-10-30 00:00:00.000',
            u.id,
          ]);
        if (field === 'email')
          await repo.write(pool, 'UPDATE pengguna SET email=? WHERE id=?', [
            `changed-${u.email}`,
            u.id,
          ]);
        await expect(
          recovery.confirm({ token, passwordBaru: nextPassword, konfirmasiPassword: nextPassword }),
        ).rejects.toThrow(/tidak valid/);
      },
      15_000,
    );
    it('request berulang tidak mengirim email ganda dalam cooldown', async () => {
      const u = await user();
      const first = await recovery.request({ email: u.email });
      expect(await recovery.request({ email: u.email })).toEqual(first);
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT COUNT(*) jumlah FROM password_reset_tokens WHERE pengguna_id=?',
        [u.id],
      );
      expect(Number(rows[0]!.jumlah)).toBe(1);
      await recovery.processQueue();
      expect(messages.filter((m) => m.to === u.email)).toHaveLength(1);
    }, 15_000);
    it('kegagalan SMTP tetap mengantre dan berhasil pada percobaan berikutnya', async () => {
      await recovery.processQueue();
      const u = await user();
      await recovery.request({ email: u.email });
      rejectNext = true;
      await recovery.processQueue();
      const t = await resets.latest(pool, u.id);
      const [failed] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM password_reset_emails WHERE token_id=?',
        [t!.id],
      );
      expect(Number(failed[0]!.attempts)).toBe(1);
      expect(failed[0]!.sent_at).toBeNull();
      expect(failed[0]!.token_cipher).not.toBeNull();
      await repo.write(
        pool,
        'UPDATE password_reset_emails SET next_attempt_at=UTC_TIMESTAMP(6) WHERE token_id=?',
        [t!.id],
      );
      await recovery.processQueue();
      const [sent] = await pool.query<RowDataPacket[]>(
        'SELECT sent_at,token_cipher FROM password_reset_emails WHERE token_id=?',
        [t!.id],
      );
      expect(sent[0]!.sent_at).not.toBeNull();
      expect(sent[0]!.token_cipher).toBeNull();
    }, 15_000);
    it('audit gagal membatalkan perubahan password, konsumsi token dan pencabutan sesi', async () => {
      const u = await user();
      const session = await identity.loginPassword(
        { email: u.email, password },
        '127.0.0.1',
        'Test',
        'staff',
      );
      const token = await resetLink(u.email);
      const brokenAudit = new AuditService(repo);
      vi.spyOn(brokenAudit, 'record').mockRejectedValueOnce(new Error('Audit unavailable'));
      const isolated = new PasswordRecoveryService(
        repo,
        resets,
        brokenAudit,
        identity,
        mail,
        config as never,
      );
      await expect(
        isolated.confirm({ token, passwordBaru: nextPassword, konfirmasiPassword: nextPassword }),
      ).rejects.toThrow('Audit unavailable');
      expect((await resets.byHash(pool, hashToken(token)))!.used_at).toBeNull();
      expect(await cocokPassword(password, (await repo.user(pool, u.id))!.password_hash!)).toBe(
        true,
      );
      await expect(identity.authenticate(session.token)).resolves.toHaveProperty('user');
    }, 15_000);
    it('HTTP menolak origin asing, memberi respons generik dan membatasi banjir permintaan', async () => {
      const module = await Test.createTestingModule({
        imports: [ThrottlerModule.forRoot([{ name: 'umum', ttl: 900_000, limit: 120 }])],
        controllers: [PasswordRecoveryController],
        providers: [
          { provide: PasswordRecoveryService, useValue: recovery },
          { provide: RecoveryMailService, useValue: mail },
          { provide: ConfigService, useValue: config },
          { provide: IdentityService, useValue: identity },
          { provide: APP_GUARD, useClass: IdentityGuard },
          { provide: APP_GUARD, useClass: ThrottlerGuard },
        ],
      }).compile();
      const app = module.createNestApplication({ logger: false });
      app.setGlobalPrefix('api/v1');
      app.useGlobalInterceptors(new BungkusTanggapanInterceptor());
      app.useGlobalFilters(new SemuaGalatFilter());
      await app.listen(0, '127.0.0.1');
      try {
        const base = await app.getUrl();
        const post = (origin: string) =>
          fetch(`${base}/api/v1/auth/password-recovery`, {
            method: 'POST',
            headers: { Origin: origin, 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'missing@example.test' }),
          });
        expect((await post('https://attacker.example')).status).toBe(403);
        const response = await post('http://localhost:3000');
        expect(response.status).toBe(201);
        expect(response.headers.get('cache-control')).toBe('no-store');
        const body = await response.text();
        expect(body).not.toContain('token');
        for (let i = 0; i < 4; i++) expect((await post('http://localhost:3000')).status).toBe(201);
        expect((await post('http://localhost:3000')).status).toBe(429);
      } finally {
        await app.close();
      }
    }, 15_000);
  },
);
