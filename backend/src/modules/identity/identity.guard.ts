import {
  ForbiddenException,
  Injectable,
  SetMetadata,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import type { KonfigurasiApp } from '../../config/configuration.js';
import {
  KUNCI_META_PUBLIK,
  KUNCI_META_IZIN,
  type SyaratIzin,
  type PermintaanBerpengguna,
} from '../../common/decorators/otorisasi.decorator.js';
import { IdentityService } from './identity.service.js';
import { cekCsrf, cekIzin } from './security.js';

const PENDING = 'jdih:pending-allowed';
/** Only identity self-service; never use on domain resources. */
export const PendingAllowed = () => SetMetadata(PENDING, true);
const TANPA_CSRF = 'jdih:tanpa-csrf';
/**
 * Hanya untuk tulis publik tanpa sesi yang tidak mengubah data milik siapa pun,
 * mis. pencatat kunjungan. Asal (Origin) tetap wajib sama dengan portal.
 */
export const TanpaCsrf = () => SetMetadata(TANPA_CSRF, true);
export const SESSION_COOKIE = 'jdih_session';
export const REGISTRATION_COOKIE = 'jdih_registration';
export const FLOW_COOKIE = 'jdih_oauth';
export function cookie(req: PermintaanBerpengguna, name: string): string {
  const value: unknown = (req.cookies as Record<string, unknown> | undefined)?.[name];
  return typeof value === 'string' ? value : '';
}
@Injectable()
export class IdentityGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly identity: IdentityService,
    private readonly config: ConfigService<KonfigurasiApp, true>,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<PermintaanBerpengguna>();
    const res = context.switchToHttp().getResponse<Response>();
    // Never trust an identity attached by body parsing or a prior untrusted middleware.
    delete req.pengguna;
    const targets = [context.getHandler(), context.getClass()];
    const publicRoute =
      this.reflector.getAllAndOverride<boolean>(KUNCI_META_PUBLIK, targets) === true;
    const pending = this.reflector.getAllAndOverride<boolean>(PENDING, targets) === true;
    const required = this.reflector.getAllAndOverride<SyaratIzin | undefined>(
      KUNCI_META_IZIN,
      targets,
    );
    const tanpaCsrf = this.reflector.getAllAndOverride<boolean>(TANPA_CSRF, targets) === true;
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && tanpaCsrf) {
      if (req.headers.origin !== this.config.get('identitas.origin', { infer: true }))
        throw new ForbiddenException('Asal permintaan tidak sah');
    } else if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const cfg = this.config.get('identitas', { infer: true });
      // The registration marker is scoped to this route, not arbitrary public writes.
      const token = req.path.endsWith('/auth/register')
        ? cookie(req, REGISTRATION_COOKIE)
        : cookie(req, SESSION_COOKIE);
      cekCsrf(req.headers.origin, req.headers['x-csrf-token'], token, cfg.origin, cfg.key);
    }
    if (!publicRoute || required) {
      res.setHeader('Cache-Control', 'no-store');
      const { user } = await this.identity.authenticate(cookie(req, SESSION_COOKIE));
      req.pengguna = user;
      if (!pending || required)
        cekIzin(user, required?.kode ?? [], required?.mode === 'salah-satu');
    }
    return true;
  }
}
