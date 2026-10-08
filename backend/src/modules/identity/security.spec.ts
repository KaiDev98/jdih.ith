import 'reflect-metadata';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { NotFoundException, type ExecutionContext } from '@nestjs/common';
import type { PenggunaAktif } from '@jdih/shared';
import { skemaLengkapiRegistrasi, skemaBuatUnit, skemaTolakAkun } from '@jdih/shared';
import {
  verifiedClaims,
  verifyGoogleToken,
  TemporaryStore,
  GoogleService,
} from './google.service.js';
import {
  acak,
  hashToken,
  csrfToken,
  cekCsrf,
  cekAksesDokumen,
  izinEfektif,
  cekIzin,
  type ResourceDokumen,
} from './security.js';
import { IdentityGuard, PendingAllowed } from './identity.guard.js';
import { IdentityService } from './identity.service.js';
import { Publik, Izin } from '../../common/decorators/otorisasi.decorator.js';

afterEach(() => vi.restoreAllMocks());
const principal: PenggunaAktif = {
  id: '1',
  nama: 'Test',
  surel: 'test@ith.ac.id',
  status: 'AKTIF',
  unitKerjaId: '2',
  unitManual: null,
  avatarUrl: null,
  peran: ['DOSEN_STAF'],
  izin: [],
};
const claims = {
  iss: 'https://accounts.google.com',
  aud: 'client',
  sub: '123',
  email: 'staff@ith.ac.id',
  email_verified: true,
  hd: 'ith.ac.id',
  nonce: 'nonce',
  exp: Math.floor(Date.now() / 1000) + 300,
};
describe('Google identity validation', () => {
  it('accepts verified exact institutional email', () =>
    expect(verifiedClaims(claims, 'client', 'nonce').email).toBe('staff@ith.ac.id'));
  for (const email of [
    'student@mahasiswa.ith.ac.id',
    'outside@gmail.com',
    'staff@evilith.ac.id',
    'staff@ith.ac.id.evil.com',
    'staff@@ith.ac.id',
  ])
    it('rejects ' + email, () =>
      expect(() => verifiedClaims({ ...claims, email }, 'client', 'nonce')).toThrow(),
    );
  for (const bad of [
    { email_verified: false },
    { email_verified: 'true' },
    { iss: 'https://evil.test' },
    { aud: 'other' },
    { azp: 'other' },
    { nonce: 'wrong' },
    { hd: 'other' },
    { hd: undefined },
    { exp: 1 },
    { sub: '' },
  ])
    it('fails closed ' + JSON.stringify(bad), () =>
      expect(() => verifiedClaims({ ...claims, ...bad }, 'client', 'nonce')).toThrow(),
    );
  it('mode * menerima akun Google apa pun yang emailnya terverifikasi', () => {
    const gmail = { ...claims, email: 'Seseorang@Gmail.com', hd: undefined };
    expect(verifiedClaims(gmail, 'client', 'nonce', '*').email).toBe('seseorang@gmail.com');
    expect(() => verifiedClaims({ ...gmail, email_verified: false }, 'client', 'nonce', '*')).toThrow();
    expect(() => verifiedClaims({ ...gmail, nonce: 'salah' }, 'client', 'nonce', '*')).toThrow();
    expect(() => verifiedClaims(gmail, 'client', 'nonce')).toThrow();
  });
  it('verifies actual RSA signatures and rejects tampered, wrong audience and expired tokens', async () => {
    const keys = await generateKeyPair('RS256');
    const jwk = await exportJWK(keys.publicKey);
    jwk.kid = 'test';
    const jwks = createLocalJWKSet({ keys: [jwk] });
    const sign = (patch: Record<string, unknown> = {}) =>
      new SignJWT({ ...claims, iat: Math.floor(Date.now() / 1000), ...patch })
        .setProtectedHeader({ alg: 'RS256', kid: 'test' })
        .sign(keys.privateKey);
    const token = await sign();
    expect((await verifyGoogleToken(token, jwks, 'client', 'nonce')).sub).toBe('123');
    await expect(
      verifyGoogleToken(token.slice(0, -12) + 'AAAAAAAAAAAA', jwks, 'client', 'nonce'),
    ).rejects.toThrow();
    await expect(
      verifyGoogleToken(await sign({ aud: 'wrong' }), jwks, 'client', 'nonce'),
    ).rejects.toThrow();
    await expect(
      verifyGoogleToken(await sign({ exp: 1 }), jwks, 'client', 'nonce'),
    ).rejects.toThrow();
    await expect(
      verifyGoogleToken(await sign({ iss: 'https://evil.test' }), jwks, 'client', 'nonce'),
    ).rejects.toThrow();
  });
  it('temporary handles are one-use and expire', () => {
    vi.useFakeTimers();
    try {
      const store = new TemporaryStore<string>();
      const h = store.put('identity');
      expect(store.take(h)).toBe('identity');
      expect(() => store.take(h)).toThrow();
      const expired = store.put('identity');
      vi.advanceTimersByTime(600001);
      expect(() => store.take(expired)).toThrow();
    } finally {
      vi.useRealTimers();
    }
  });
  it('OAuth state mismatch is rejected before code exchange and flow cannot be replayed', async () => {
    const service = new GoogleService(
      new ConfigService({
        identitas: { clientId: 'client', redirectUri: 'http://localhost/callback' },
      }),
    );
    const start = service.start();
    const url = new URL(start.url);
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    const fetcher = vi.spyOn(globalThis, 'fetch');
    await expect(service.callback(start.handle, 'code', 'wrong')).rejects.toThrow();
    await expect(
      service.callback(start.handle, 'code', url.searchParams.get('state')!),
    ).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
});
describe('RBAC and CSRF', () => {
  it('DENY overrides role and direct ALLOW without superadmin bypass', () => {
    expect(
      izinEfektif(
        ['users.read', 'workflow.approve'],
        [
          { kode: 'workflow.approve', efek: 'ALLOW' },
          { kode: 'workflow.approve', efek: 'DENY' },
          { kode: 'users.reject', efek: 'ALLOW' },
          { kode: 'legacy.permission', efek: 'ALLOW' },
        ],
      ),
    ).toEqual(['users.read', 'users.reject']);
    expect(() => cekIzin({ ...principal, peran: ['SUPERADMIN'] }, ['workflow.approve'])).toThrow();
  });
  it('verifier is ADMIN with permission', () => {
    expect(() =>
      cekIzin({ ...principal, peran: ['ADMIN'], izin: ['workflow.approve'] }, ['workflow.approve']),
    ).not.toThrow();
    expect(() => cekIzin({ ...principal, peran: ['ADMIN'] }, ['workflow.approve'])).toThrow();
  });
  it('pending cannot use permissions even if assigned', () =>
    expect(() =>
      cekIzin({ ...principal, status: 'MENUNGGU_VERIFIKASI', izin: ['users.read'] }, [
        'users.read',
      ]),
    ).toThrow());
  it('CSRF requires origin, correct session-bound proof and random token', () => {
    const token = acak(),
      key = 'test-key';
    const proof = csrfToken(token, key);
    expect(() =>
      cekCsrf('http://localhost:3000', proof, token, 'http://localhost:3000', key),
    ).not.toThrow();
    for (const [origin, header, t] of [
      ['http://evil.test', proof, token],
      [undefined, proof, token],
      ['http://localhost:3000', 'wrong', token],
      ['http://localhost:3000', proof, acak()],
    ])
      expect(() => cekCsrf(origin, header, t, 'http://localhost:3000', key)).toThrow();
    expect(hashToken(token).length).toBe(32);
    expect(hashToken(token).toString()).not.toBe(token);
  });
  it('registration and unit creation reject role/actor escalation', () => {
    expect(skemaLengkapiRegistrasi.safeParse({ unitManual: 'TIK', peran: ['ADMIN'] }).success).toBe(
      false,
    );
    expect(
      skemaLengkapiRegistrasi.safeParse({ unitManual: 'TIK', googleSub: 'spoof' }).success,
    ).toBe(false);
    expect(skemaBuatUnit.safeParse({ kode: 'TIK', nama: 'TIK', createdBy: '1' }).success).toBe(
      false,
    );
    expect(skemaTolakAkun.safeParse({ alasan: ' ' }).success).toBe(false);
  });
});
describe('document policy', () => {
  const resource: ResourceDokumen = {
    id: '8',
    tingkatAkses: 'publik',
    published: true,
    current: true,
    deleted: false,
  };
  it('anonymous public current published allowed', () =>
    expect(() => cekAksesDokumen(resource)).not.toThrow());
  for (const patch of [{ published: false }, { current: false }, { deleted: true }])
    it('noncurrent/unpublished/deleted fail closed ' + JSON.stringify(patch), () =>
      expect(() => cekAksesDokumen({ ...resource, ...patch })).toThrow(),
    );
  it('anonymous Internal is not found, indistinguishable from a missing document', () =>
    expect(() => cekAksesDokumen({ ...resource, tingkatAkses: 'internal' })).toThrow(NotFoundException));
  it('active staff Internal allowed without unit scope', () =>
    expect(() =>
      cekAksesDokumen(
        { ...resource, tingkatAkses: 'internal' },
        { ...principal, unitKerjaId: null },
      ),
    ).not.toThrow());
  for (const status of ['MENUNGGU_VERIFIKASI', 'DITOLAK', 'NONAKTIF'] as const)
    it(status + ' Internal denied', () =>
      expect(() =>
        cekAksesDokumen({ ...resource, tingkatAkses: 'internal' }, { ...principal, status }),
      ).toThrow(NotFoundException),
    );
  it('tingkat akses di luar publik/internal selalu tidak ditemukan', () => {
    const asing = { ...resource, tingkatAkses: 'rahasia' } as unknown as Parameters<
      typeof cekAksesDokumen
    >[0];
    for (const user of [undefined, principal, { ...principal, peran: ['ADMIN' as const] }])
      expect(() => cekAksesDokumen(asing, user)).toThrow(NotFoundException);
  });
});
describe('global route guard', () => {
  class Routes {
    closed() {
      return true;
    }
    @Publik() public() {
      return true;
    }
    @PendingAllowed() self() {
      return true;
    }
    @Publik() @Izin('users.read') contradictory() {
      return true;
    }
  }
  const identity = { authenticate: vi.fn() };
  const guard = new IdentityGuard(
    new Reflector(),
    identity as unknown as IdentityService,
    new ConfigService({ identitas: { origin: 'http://localhost:3000', key: 'test' } }),
  );
  const context = (method: keyof Routes, user = principal) => {
    identity.authenticate.mockReset().mockResolvedValue({ user });
    const req = {
      method: 'GET',
      path: '/test',
      headers: {},
      cookies: { jdih_session: acak() },
      pengguna: { id: 'spoof' },
    };
    const ctx = {
      getHandler: () => Routes.prototype[method],
      getClass: () => Routes,
      switchToHttp: () => ({ getRequest: () => req, getResponse: () => ({ setHeader: vi.fn() }) }),
    } as unknown as ExecutionContext;
    return { req, ctx };
  };
  it('unmarked route requires session', async () => {
    const { ctx } = context('closed');
    identity.authenticate.mockRejectedValue(new Error('no session'));
    await expect(guard.canActivate(ctx)).rejects.toThrow();
  });
  it('explicit public route allows anonymous and removes spoofed actor', async () => {
    const { ctx, req } = context('public');
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(identity.authenticate).not.toHaveBeenCalled();
    expect(req.pengguna).toBeUndefined();
  });
  it('pending denied default route but allowed identity self-service', async () => {
    await expect(
      guard.canActivate(context('closed', { ...principal, status: 'MENUNGGU_VERIFIKASI' }).ctx),
    ).rejects.toThrow();
    await expect(
      guard.canActivate(context('self', { ...principal, status: 'MENUNGGU_VERIFIKASI' }).ctx),
    ).resolves.toBe(true);
  });
  it('public marker cannot bypass permission metadata', async () => {
    await expect(guard.canActivate(context('contradictory').ctx)).rejects.toThrow();
  });
});
