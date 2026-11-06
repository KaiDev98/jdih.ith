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
import { LetterTemplatesService } from '../core-backend/templates/letter-templates.service.js';
import { RemovalRequestsService } from '../core-backend/documents/removal-requests.service.js';
import { DokumenAdminService } from '../core-backend/documents/dokumen-admin.service.js';
import { RemovalRequestsRepository } from '../core-backend/documents/removal-requests.repository.js';
import { Readable } from 'node:stream';
import { DocumentFilesService } from '../core-backend/files/document-files.service.js';

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
    penggunaSesiTampil: vi.fn(),
    logout: vi.fn().mockResolvedValue(undefined),
    pending: vi.fn().mockResolvedValue([]),
    units: vi.fn().mockResolvedValue([]),
    loginUji: vi.fn().mockResolvedValue({ token, expires: new Date(Date.now() + 3600000) }),
    loginPassword: vi.fn().mockResolvedValue({ token, expires: new Date(Date.now() + 3600000) }),
    registerWithPassword: vi.fn().mockResolvedValue({ token, expires: new Date(Date.now() + 3600000), result: { id: '9', status: 'MENUNGGU_VERIFIKASI', peran: ['DOSEN_STAF'] } }),
  };
  const templates = { remove: vi.fn().mockResolvedValue({ id: '5', deleted: true }), review: vi.fn(), revoke: vi.fn().mockResolvedValue({ id: '5', versionId: '50', dicabut: true }) };
  const listRepository = new RemovalRequestsRepository({
    pool: {}, rows: (_db: unknown, sql: string) => Promise.resolve(sql.startsWith('SELECT COUNT') ? [{ total: 0 }] : []),
  } as never);
  const listService = new RemovalRequestsService({} as never, listRepository, {} as never, {} as never, {} as never, {} as never);
  const removals = { create: vi.fn().mockResolvedValue({ id: '8', status: 'PENDING' }), list: listService.list.bind(listService) };
  const drafts = { hapusDraf: vi.fn().mockResolvedValue({ id: '5', versionId: '50', dihapus: true }) };
  const documentFiles = { reusePreviousMain: vi.fn().mockResolvedValue({ versionId: '50', disalin: true }) };
  beforeAll(async () => {
    Object.assign(process.env, {
      NODE_ENV: 'test',
      LOGIN_UJI: 'true',
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
      .overrideProvider(LetterTemplatesService)
      .useValue(templates)
      .overrideProvider(RemovalRequestsService)
      .useValue(removals)
      .overrideProvider(DokumenAdminService)
      .useValue(drafts)
      .overrideProvider(DocumentFilesService)
      .useValue(documentFiles)
      .compile();
    app = module.createNestApplication({ logger: false });
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    await app.listen(0, '127.0.0.1');
    base = await app.getUrl();
  }, 60000);
  afterAll(async () => {
    if (app) await app.close();
  });
  const auth = (status: PenggunaAktif['status'] = 'AKTIF', izin: PenggunaAktif['izin'] = []) => {
    identity.authenticate.mockImplementation((candidate: string) =>
      candidate === token
        ? Promise.resolve({ user: { ...user, status, izin } })
        : Promise.reject(new UnauthorizedException()),
    );
    identity.penggunaSesiTampil.mockImplementation(async (candidate: string) => {
      const session = await identity.authenticate(candidate) as { user: PenggunaAktif };
      return session.user;
    });
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
  it('pendaftaran email memerlukan same-origin, memberi sesi privat pending, tanpa bergantung login Google', async () => {
    const path = base + '/api/v1/auth/register/email';
    const input = { nama: 'Pendaftar', email: 'user@gmail.com', password: 'PasswordKuat123', konfirmasiPassword: 'PasswordKuat123', unitManual: 'Unit lain' };
    for (const origin of [undefined, 'https://evil.test']) expect((await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json', ...(origin ? { origin } : {}) }, body: JSON.stringify(input) })).status).toBe(403);
    const response = await fetch(path, { method: 'POST', headers: { origin: 'http://localhost:3000', 'content-type': 'application/json' }, body: JSON.stringify(input) });
    expect(response.status).toBe(201);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
    expect(response.headers.get('set-cookie')).toContain('SameSite=Lax');
    expect(await response.text()).not.toContain(token);
    expect(identity.registerWithPassword).toHaveBeenCalledOnce();
  });
  it('login staff menggunakan jalurnya sendiri dan same-origin', async () => {
    const input = { email: 'user@gmail.com', password: 'PasswordKuat123' };
    const response = await fetch(base + '/api/v1/auth/login/staff', { method: 'POST', headers: { origin: 'http://localhost:3000', 'content-type': 'application/json' }, body: JSON.stringify(input) });
    expect(response.status).toBe(201);
    expect(identity.loginPassword).toHaveBeenCalledWith(input, expect.any(String), expect.any(String), 'staff');
  });
  it.each([['ADMIN', '/admin'], ['SUPERADMIN', '/superadmin']])('login uji %s mengarah langsung ke panel perannya', async (role, panel) => {
    const response = await fetch(`${base}/api/v1/auth/uji/${role}`, { redirect: 'manual' });
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(`http://localhost:3000${panel}`);
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(identity.loginUji).toHaveBeenCalledWith(role, expect.any(String), expect.any(String));
  });
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
    expect((await fetch(base + '/api/v1/admin/active-users?q=ab', { headers })).status).toBe(404);
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
  it('DELETE Format Persuratan memerlukan sesi, izin, origin dan CSRF sebelum memanggil service', async () => {
    templates.remove.mockClear();
    auth('AKTIF', ['templates.manage']);
    const path = base + '/api/v1/admin/letter-templates/5';
    const headers = { cookie: 'jdih_session=' + token, origin: 'http://localhost:3000' };
    for (const invalid of [
      headers,
      { ...headers, 'x-csrf-token': 'salah' },
      { ...headers, origin: 'https://evil.test', 'x-csrf-token': csrfToken(token, key) },
    ]) expect((await fetch(path, { method: 'DELETE', headers: invalid })).status).toBe(403);
    const valid = { ...headers, 'x-csrf-token': csrfToken(token, key) };
    auth();
    expect((await fetch(path, { method: 'DELETE', headers: valid })).status).toBe(403);
    expect(templates.remove).not.toHaveBeenCalled();
    for (const role of ['ADMIN', 'SUPERADMIN'] as const) {
      const actor = { ...user, peran: [role], izin: ['templates.manage'] };
      identity.authenticate.mockResolvedValue({ user: actor });
      expect((await fetch(path, { method: 'DELETE', headers: valid })).status).toBe(200);
      expect(templates.remove).toHaveBeenLastCalledWith(actor, '5', undefined);
    }
  });
  it('legal revocation is default-closed and checks CSRF and Superadmin even with direct Admin permission', async () => {
    const path = base + '/api/v1/admin/documents/5/revoke';
    const body = JSON.stringify({ versionId: '50', alasan: 'Pencabutan tanpa pengganti' });
    const headers = { cookie: 'jdih_session=' + token, origin: 'http://localhost:3000', 'content-type': 'application/json' };
    auth();
    expect((await fetch(path, { method: 'POST', body })).status).toBe(403);
    identity.authenticate.mockResolvedValue({ user: { ...user, peran: ['SUPERADMIN'], izin: ['workflow.withdraw'] } });
    expect((await fetch(path, { method: 'POST', headers, body })).status).toBe(403);
    expect((await fetch(path, { method: 'POST', headers: { ...headers, origin: 'https://evil.test', 'x-csrf-token': csrfToken(token, key) }, body })).status).toBe(403);
    identity.authenticate.mockResolvedValue({ user: { ...user, peran: ['ADMIN'], izin: ['workflow.withdraw'] } });
    expect((await fetch(path, { method: 'POST', headers: { ...headers, 'x-csrf-token': csrfToken(token, key) }, body })).status).toBe(403);
  });
  it('removed template revocation route stays unavailable for anonymous users and Superadmin', async () => {
    const path = base + '/api/v1/admin/letter-templates/5/revoke';
    const body = JSON.stringify({ versionId: '50', alasan: 'Pencabutan format' });
    const headers = { cookie: 'jdih_session=' + token, origin: 'http://localhost:3000', 'content-type': 'application/json' };
    auth(); expect((await fetch(path, { method: 'POST', body })).status).toBe(404);
    identity.authenticate.mockResolvedValue({ user: { ...user, peran: ['SUPERADMIN'], izin: ['templates.manage'] } });
    expect((await fetch(path, { method: 'POST', headers, body })).status).toBe(404);
    expect((await fetch(path, { method: 'POST', headers: { ...headers, origin: 'https://evil.test', 'x-csrf-token': csrfToken(token, key) }, body })).status).toBe(404);
    expect((await fetch(path, { method: 'POST', headers: { ...headers, 'x-csrf-token': csrfToken(token, key) }, body })).status).toBe(404);
    expect(templates.revoke).not.toHaveBeenCalled();
  });
  it('reuse of previous revision bytes is default-closed, permission checked and CSRF protected', async () => {
    const path = base + '/api/v1/admin/documents/versions/50/reuse-main';
    const body = JSON.stringify({});
    const headers = { cookie: 'jdih_session=' + token, origin: 'http://localhost:3000', 'content-type': 'application/json', 'x-csrf-token': csrfToken(token, key) };
    auth();
    expect((await fetch(path, { method: 'POST', body })).status).toBe(403);
    expect((await fetch(path, { method: 'POST', headers, body })).status).toBe(403);
    const actor = { ...user, peran: ['ADMIN'], izin: ['documents.upload', 'documents.revise'] };
    identity.authenticate.mockResolvedValue({ user: actor });
    expect((await fetch(path, { method: 'POST', headers: { ...headers, 'x-csrf-token': 'invalid' }, body })).status).toBe(403);
    expect((await fetch(path, { method: 'POST', headers: { ...headers, origin: 'https://evil.test' }, body })).status).toBe(403);
    expect(documentFiles.reusePreviousMain).not.toHaveBeenCalled();
    expect((await fetch(path, { method: 'POST', headers, body })).status).toBe(201);
    expect(documentFiles.reusePreviousMain).toHaveBeenCalledWith(actor, '50', {});
  });
  it('draft cancellation and removal requests are default-closed, permission-checked and CSRF-protected', async () => {
    const actor = { ...user, peran: ['ADMIN'], izin: ['documents.read_admin', 'documents.edit'] };
    const headers = { cookie: 'jdih_session=' + token, origin: 'http://localhost:3000', 'content-type': 'application/json' };
    for (const [path, method, body] of [
      ['/admin/documents/5/drafts/50', 'DELETE', undefined],
      ['/admin/documents/5/removal-requests', 'POST', JSON.stringify({ jenis: 'DELETE', alasan: 'Unggahan keliru' })],
    ] as const) {
      auth();
      expect((await fetch(base + '/api/v1' + path, { method, body })).status).toBe(403);
      expect((await fetch(base + '/api/v1' + path, { method, headers: { ...headers, 'x-csrf-token': csrfToken(token, key) }, body })).status).toBe(403);
      identity.authenticate.mockResolvedValue({ user: actor });
      expect((await fetch(base + '/api/v1' + path, { method, headers, body })).status).toBe(403);
      expect((await fetch(base + '/api/v1' + path, { method, headers: { ...headers, origin: 'https://evil.test', 'x-csrf-token': csrfToken(token, key) }, body })).status).toBe(403);
      const response = await fetch(base + '/api/v1' + path, { method, headers: { ...headers, 'x-csrf-token': csrfToken(token, key) }, body });
      expect(response.status).toBe(method === 'POST' ? 201 : 200);
    }
    expect(drafts.hapusDraf).toHaveBeenCalledWith(actor, '5', '50');
    expect(removals.create).toHaveBeenCalledWith(actor, 'DOCUMENT', '5', { jenis: 'DELETE', alasan: 'Unggahan keliru' });
  });
  it('removal list retains its top-level array and pagination through the real HTTP response interceptor', async () => {
    identity.authenticate.mockResolvedValue({ user: { ...user, peran: ['SUPERADMIN'], izin: ['documents.read_admin'] } });
    const response = await fetch(base + '/api/v1/admin/removal-requests?status=PENDING&halaman=1&perHalaman=5', {
      headers: { cookie: 'jdih_session=' + token },
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ sukses: true, data: [], meta: { totalButir: 0, halaman: 1, perHalaman: 5 } });
    expect(body).toHaveProperty('data.length', 0);
    expect(body).not.toHaveProperty('data.data');
  });
  it('pratinjau antrean memakai rute terproteksi dengan respons PDF inline dan cache privat', async () => {
    const pdf = Buffer.from('%PDF-1.7\nPreview transport\n%%EOF');
    templates.review.mockImplementation(() => Promise.resolve({ stream: Readable.from([pdf]), mimeType: 'application/pdf', originalName: 'format.pdf', size: pdf.length }));
    const path = base + '/api/v1/admin/letter-templates/verification-queue/5/versions/80/preview';
    auth();
    expect((await fetch(path)).status).toBe(401);
    expect((await fetch(path, { headers: { cookie: 'jdih_session=' + token } })).status).toBe(403);
    identity.authenticate.mockResolvedValue({ user: { ...user, peran: ['ADMIN'], izin: ['documents.read_admin'] } });
    const response = await fetch(path, { headers: { cookie: 'jdih_session=' + token } });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/pdf');
    expect(response.headers.get('content-disposition')).toMatch(/^inline;/);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(Buffer.from(await response.arrayBuffer())).toEqual(pdf);
    expect(templates.review).toHaveBeenLastCalledWith(expect.anything(), '5', '80', { queue: true, preview: true });
  });
});
