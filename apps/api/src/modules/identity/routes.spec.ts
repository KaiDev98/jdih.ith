import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { Controller, Get, UnauthorizedException, type INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import type { PenggunaAktif } from '@jdih/shared';
import { IdentityService } from './identity.service.js';
import { acak, csrfToken } from './security.js';
import { GoogleService } from './google.service.js';
import { AuditService } from './audit.service.js';

@Controller('contract-probe')
class DefaultClosedProbe {
  @Get() read() {
    return { ok: true };
  }
}

describe('AppModule HTTP security wiring (no database/network provider)', () => {
  let app: INestApplication | undefined, base: string;
  const token = acak(),
    key = 'test-only-session-key-'.repeat(3);
  const user: PenggunaAktif = {
    id: '1',
    nama: 'Staff',
    surel: 'staff@ith.ac.id',
    status: 'AKTIF',
    unitKerjaId: null,
    unitManual: null,
    avatarUrl: null,
    peran: ['DOSEN_STAF'],
    izin: [],
  };
  const identity = {
    authenticate: vi.fn(),
    logout: vi.fn().mockResolvedValue(undefined),
    pending: vi.fn().mockResolvedValue([]),
    units: vi.fn().mockResolvedValue([]),
  };
  beforeAll(async () => {
    Object.assign(process.env, {
      NODE_ENV: 'test',
      DB_NAME: 'jdih_ith_v2_test',
      DB_USER: 'test',
      DB_PORT: '3308',
      DB_LOG_QUERY: 'false',
      GOOGLE_CLIENT_ID: 'test',
      GOOGLE_CLIENT_SECRET: 'test-only',
      GOOGLE_REDIRECT_URI: 'http://localhost:3001/api/v1/auth/google/callback',
      SESSION_KEY: key,
      LOG_PRETTY: 'false',
      LOG_LEVEL: 'silent',
      COOKIE_SECURE: 'false',
      APP_URL: 'http://localhost:3000',
      CORS_ORIGIN: 'http://localhost:3000',
    });
    // Config supports info; silence Nest itself below instead of invalid env level.
    process.env.LOG_LEVEL = 'fatal';
    const { AppModule } = await import('../../app.module.js');
    const { KOLAM_KONEKSI } = await import('../../database/database.module.js');
    const module = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [DefaultClosedProbe],
    })
      .overrideProvider(KOLAM_KONEKSI)
      .useValue({ end: vi.fn().mockResolvedValue(undefined) })
      .overrideProvider(IdentityService)
      .useValue(identity)
      .overrideProvider(GoogleService)
      .useValue({})
      .overrideProvider(AuditService)
      .useValue({ record: vi.fn() })
      .compile();
    app = module.createNestApplication({ logger: false });
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    await app.listen(0, '127.0.0.1');
    base = await app.getUrl();
  }, 20000);
  afterAll(async () => {
    if (app) await app.close();
  });
  const auth = (status: PenggunaAktif['status'] = 'AKTIF', izin: PenggunaAktif['izin'] = []) => {
    identity.authenticate.mockImplementation((candidate: string) =>
      candidate === token
        ? Promise.resolve({ user: { ...user, status, izin } })
        : Promise.reject(new UnauthorizedException()),
    );
  };
  it('unmarked route denied anonymously and works with valid active session', async () => {
    auth();
    expect((await fetch(base + '/api/v1/contract-probe')).status).toBe(401);
    expect(
      (
        await fetch(base + '/api/v1/contract-probe', {
          headers: { cookie: 'jdih_session=' + token },
        })
      ).status,
    ).toBe(200);
  });
  it('@Publik liveness endpoint is accessible without cookie', async () =>
    expect((await fetch(base + '/api/v1/kesehatan/hidup')).status).toBe(200));
  it('pending denied default route but may read auth/me', async () => {
    auth('MENUNGGU_VERIFIKASI');
    const headers = { cookie: 'jdih_session=' + token };
    expect((await fetch(base + '/api/v1/contract-probe', { headers })).status).toBe(403);
    const response = await fetch(base + '/api/v1/auth/me', { headers });
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
  it('permissions enforced even for active account', async () => {
    auth();
    const headers = { cookie: 'jdih_session=' + token };
    expect((await fetch(base + '/api/v1/admin/users', { headers })).status).toBe(403);
    auth('AKTIF', ['users.read']);
    expect((await fetch(base + '/api/v1/admin/users', { headers })).status).toBe(200);
  });
  it('mounts Core Backend below the single global /api/v1 prefix and keeps it closed', async () => {
    expect((await fetch(base + '/api/v1/admin/master/jenis_dokumen')).status).toBe(401);
    expect((await fetch(base + '/api/v1/admin/documents/test-id')).status).toBe(401);
  });
  it('keeps the new admin query endpoints permission-gated and public masters allowlisted', async () => {
    auth('AKTIF', []);
    const headers = { cookie: 'jdih_session=' + token };
    expect((await fetch(base + '/api/v1/admin/documents', { headers })).status).toBe(403);
    expect((await fetch(base + '/api/v1/admin/documents/verification-queue', { headers })).status).toBe(403);
    expect((await fetch(base + '/api/v1/admin/active-users?q=ab', { headers })).status).toBe(403);
    expect((await fetch(base + '/api/v1/admin/audit', { headers })).status).toBe(403);
    expect((await fetch(base + '/api/v1/public/master/constructor')).status).toBe(404);
  });
  it('logout requires CSRF proof and clears HttpOnly cookie', async () => {
    auth();
    const headers = { cookie: 'jdih_session=' + token, origin: 'http://localhost:3000' };
    expect((await fetch(base + '/api/v1/auth/logout', { method: 'POST', headers })).status).toBe(
      403,
    );
    const response = await fetch(base + '/api/v1/auth/logout', {
      method: 'POST',
      headers: { ...headers, 'x-csrf-token': csrfToken(token, key) },
    });
    expect(response.status).toBe(201);
    expect(identity.logout).toHaveBeenCalledWith(token);
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
    expect(response.headers.get('set-cookie')).toContain('SameSite=Lax');
  });
});
