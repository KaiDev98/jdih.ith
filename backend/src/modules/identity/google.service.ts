import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify, type JWTPayload, type JWTVerifyGetKey } from 'jose';
import { z } from 'zod';
import { acak, hashToken, sama } from './security.js';
import type { KonfigurasiApp } from '../../config/configuration.js';

export interface GoogleIdentity {
  sub: string;
  email: string;
  nama: string;
  avatar: string | null;
}
export async function verifyGoogleToken(
  token: string,
  key: JWTVerifyGetKey,
  clientId: string,
  nonce: string,
) {
  const { payload } = await jwtVerify(token, key, {
    algorithms: ['RS256'],
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    audience: clientId,
    requiredClaims: ['exp', 'iat', 'sub', 'nonce'],
  });
  return verifiedClaims(payload, clientId, nonce);
}
export function verifiedClaims(p: JWTPayload, clientId: string, nonce: string): GoogleIdentity {
  const email = z.email().max(254).safeParse(p.email);
  if (
    !['https://accounts.google.com', 'accounts.google.com'].includes(String(p.iss)) ||
    p.aud !== clientId ||
    (p.azp !== undefined && p.azp !== clientId) ||
    p.email_verified !== true ||
    !email.success ||
    email.data.split('@')[1]?.toLowerCase() !== 'ith.ac.id' ||
    p.hd !== 'ith.ac.id' ||
    !sama(p.nonce, nonce) ||
    typeof p.sub !== 'string' ||
    !/^[\x21-\x7e]{1,255}$/.test(p.sub) ||
    !p.exp ||
    p.exp <= Date.now() / 1000
  )
    throw new UnauthorizedException('Identitas institusi tidak sah');
  return {
    sub: p.sub,
    email: email.data.toLowerCase(),
    nama: typeof p.name === 'string' && p.name.trim() ? p.name.trim().slice(0, 200) : email.data,
    avatar:
      typeof p.picture === 'string' && p.picture.startsWith('https://') && p.picture.length <= 2048
        ? p.picture
        : null,
  };
}
/** Bounded, expiring single-process storage. Handles are random; only hashes are indexed. */
export class TemporaryStore<T> {
  private values = new Map<string, { value: T; until: number }>();
  put(value: T): string {
    for (const [key, entry] of this.values) if (entry.until <= Date.now()) this.values.delete(key);
    if (this.values.size >= 10000) throw new ServiceUnavailableException();
    const handle = acak();
    this.values.set(hashToken(handle).toString('hex'), { value, until: Date.now() + 600000 });
    return handle;
  }
  take(handle: string): T {
    const key = hashToken(handle).toString('hex'),
      entry = this.values.get(key);
    this.values.delete(key);
    if (!entry || entry.until <= Date.now()) throw new UnauthorizedException('Login harus diulang');
    return entry.value;
  }
}
@Injectable()
export class GoogleService {
  private jwks = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'), {
    timeoutDuration: 5000,
  });
  private flows = new TemporaryStore<{ state: string; nonce: string; verifier: string }>();
  readonly registrations = new TemporaryStore<GoogleIdentity>();
  constructor(private readonly config: ConfigService<KonfigurasiApp, true>) {}
  start() {
    const cfg = this.config.get('identitas', { infer: true });
    const flow = { state: acak(), nonce: acak(), verifier: acak() };
    const handle = this.flows.put(flow);
    const query = new URLSearchParams({
      client_id: cfg.clientId,
      redirect_uri: cfg.redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      hd: 'ith.ac.id',
      state: flow.state,
      nonce: flow.nonce,
      code_challenge: hashToken(flow.verifier).toString('base64url'),
      code_challenge_method: 'S256',
    });
    return { handle, url: 'https://accounts.google.com/o/oauth2/v2/auth?' + query.toString() };
  }
  async callback(handle: string, code: string, state: string): Promise<GoogleIdentity> {
    const flow = this.flows.take(handle);
    if (!sama(state, flow.state)) throw new UnauthorizedException('OAuth state tidak sah');
    const cfg = this.config.get('identitas', { infer: true });
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        signal: AbortSignal.timeout(10000),
        body: new URLSearchParams({
          code,
          client_id: cfg.clientId,
          client_secret: cfg.clientSecret,
          redirect_uri: cfg.redirectUri,
          code_verifier: flow.verifier,
          grant_type: 'authorization_code',
        }),
      });
      if (!response.ok) throw new Error('exchange');
      const body = z.object({ id_token: z.string().max(20000) }).parse(await response.json());
      return await verifyGoogleToken(body.id_token, this.jwks, cfg.clientId, flow.nonce);
    } catch {
      throw new UnauthorizedException('Verifikasi Google gagal');
    }
  }
}
