import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Query,
  Req,
  NotFoundException,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Response, CookieOptions } from 'express';
import {
  skemaHalaman,
  skemaParamId,
  skemaAuthMeHttp,
  skemaLengkapiRegistrasi,
  skemaGoogleCallback,
} from '@jdih/shared';
import {
  Izin,
  Publik,
  type PermintaanBerpengguna,
} from '../../common/decorators/otorisasi.decorator.js';
import type { KonfigurasiApp } from '../../config/configuration.js';
import { GoogleService } from './google.service.js';
import { IdentityService } from './identity.service.js';
import { AuditService } from './audit.service.js';
import {
  cookie,
  FLOW_COOKIE,
  PendingAllowed,
  REGISTRATION_COOKIE,
  SESSION_COOKIE,
} from './identity.guard.js';
import { csrfToken, tokenValid } from './security.js';

@Controller('auth')
@Throttle({ umum: { limit: 20, ttl: 60000 } })
export class IdentityController {
  constructor(
    private readonly google: GoogleService,
    private readonly identity: IdentityService,
    private readonly audit: AuditService,
    private readonly config: ConfigService<KonfigurasiApp, true>,
  ) {}
  private options(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.config.get('identitas.secure', { infer: true }),
      sameSite: 'lax',
      path: '/',
    };
  }
  private privateResponse(res: Response) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
  }
  private setSession(res: Response, session: { token: string; expires: Date }) {
    res.cookie(SESSION_COOKIE, session.token, { ...this.options(), expires: session.expires });
  }
  @Get('google')
  @Publik()
  start(@Res() res: Response) {
    this.privateResponse(res);
    const flow = this.google.start();
    res.cookie(FLOW_COOKIE, flow.handle, { ...this.options(), maxAge: 600000 });
    res.redirect(flow.url);
  }
  /**
   * Login uji lokal (LOGIN_UJI=true). Bila nonaktif, rute ini berperilaku seperti
   * tidak ada. GET karena belum ada sesi untuk token CSRF; tujuan redirect tetap.
   */
  @Get('uji/:peran')
  @Publik()
  async loginUji(
    @Param('peran') peran: string,
    @Req() req: PermintaanBerpengguna,
    @Res() res: Response,
  ) {
    this.privateResponse(res);
    if (!this.config.get('identitas.loginUji', { infer: true })) throw new NotFoundException();
    if (peran !== 'SUPERADMIN' && peran !== 'ADMIN') throw new NotFoundException();
    const session = await this.identity.loginUji(peran, req.ip ?? '', req.get('user-agent') ?? '');
    this.setSession(res, session);
    res.redirect(`${this.config.get('identitas.origin', { infer: true })}/akun`);
  }
  @Get('google/callback')
  @Publik()
  async callback(@Query() query: unknown, @Req() req: PermintaanBerpengguna, @Res() res: Response) {
    this.privateResponse(res);
    res.clearCookie(FLOW_COOKIE, this.options());
    res.clearCookie(REGISTRATION_COOKIE, this.options());
    try {
      const { code, state } = skemaGoogleCallback.parse(query);
      const identity = await this.google.callback(cookie(req, FLOW_COOKIE), code, state);
      const session = await this.identity.login(
        identity,
        req.ip ?? '',
        req.get('user-agent') ?? '',
      );
      if (session) this.setSession(res, session);
      else {
        res.clearCookie(SESSION_COOKIE, this.options());
        res.cookie(REGISTRATION_COOKIE, this.google.registrations.put(identity), {
          ...this.options(),
          maxAge: 600000,
        });
      }
      // Fixed configured destination. Never accept return URLs from query/state.
      res.redirect(this.config.get('identitas.origin', { infer: true }));
    } catch {
      await this.audit.record({ action: 'LOGIN_FAILURE', actorId: null });
      throw new UnauthorizedException('Login Google gagal; ulangi login');
    }
  }
  @Get('me')
  @Publik()
  async me(@Req() req: PermintaanBerpengguna, @Res({ passthrough: true }) res: Response) {
    this.privateResponse(res);
    const token = cookie(req, SESSION_COOKIE),
      registration = cookie(req, REGISTRATION_COOKIE);
    const key = this.config.get('identitas.key', { infer: true });
    if (token) {
      const { user } = await this.identity.authenticate(token);
      return skemaAuthMeHttp.parse({
        terautentikasi: true,
        pengguna: user,
        csrfToken: csrfToken(token, key),
      });
    }
    return skemaAuthMeHttp.parse({
      terautentikasi: false,
      perluRegistrasi: tokenValid(registration),
      csrfToken: tokenValid(registration) ? csrfToken(registration, key) : null,
    });
  }
  @Post('register')
  @Publik()
  async register(
    @Body() input: unknown,
    @Req() req: PermintaanBerpengguna,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.privateResponse(res);
    const body = skemaLengkapiRegistrasi.parse(input);
    const identity = this.google.registrations.take(cookie(req, REGISTRATION_COOKIE));
    const session = await this.identity.register(
      identity,
      body,
      req.ip ?? '',
      req.get('user-agent') ?? '',
    );
    this.setSession(res, session);
    res.clearCookie(REGISTRATION_COOKIE, this.options());
    return session.result;
  }
  @Post('refresh')
  @PendingAllowed()
  async refresh(@Req() req: PermintaanBerpengguna, @Res({ passthrough: true }) res: Response) {
    this.privateResponse(res);
    const session = await this.identity.refresh(cookie(req, SESSION_COOKIE));
    this.setSession(res, session);
    return {
      csrfToken: csrfToken(session.token, this.config.get('identitas.key', { infer: true })),
    };
  }
  @Post('logout')
  @PendingAllowed()
  async logout(@Req() req: PermintaanBerpengguna, @Res({ passthrough: true }) res: Response) {
    this.privateResponse(res);
    await this.identity.logout(cookie(req, SESSION_COOKIE));
    res.clearCookie(SESSION_COOKIE, this.options());
    res.clearCookie(REGISTRATION_COOKIE, this.options());
    return { keluar: true };
  }
}
@Controller('admin/users')
export class AccountsController {
  constructor(private readonly identity: IdentityService) {}
  @Get()
  @Izin('users.read')
  list(@Query() input: unknown) {
    const q = skemaHalaman.parse(input);
    return this.identity.pending(q.halaman, q.perHalaman);
  }
  @Get(':id')
  @Izin('users.read')
  detail(@Param() input: unknown) {
    return this.identity.pendingDetail(skemaParamId.parse(input).id);
  }
  @Post(':id/approve')
  @Izin('users.approve')
  approve(@Param() param: unknown, @Body() body: unknown, @Req() req: PermintaanBerpengguna) {
    return this.identity.decision(
      cookie(req, SESSION_COOKIE),
      skemaParamId.parse(param).id,
      'approve',
      body,
    );
  }
  @Post(':id/reject')
  @Izin('users.reject')
  reject(@Param() param: unknown, @Body() body: unknown, @Req() req: PermintaanBerpengguna) {
    return this.identity.decision(
      cookie(req, SESSION_COOKIE),
      skemaParamId.parse(param).id,
      'reject',
      body,
    );
  }
  @Patch(':id/status')
  @Izin('users.set_status')
  status(@Param() param: unknown, @Body() body: unknown, @Req() req: PermintaanBerpengguna) {
    return this.identity.decision(
      cookie(req, SESSION_COOKIE),
      skemaParamId.parse(param).id,
      'status',
      body,
    );
  }
}
@Controller()
export class IdentityUnitsController {
  constructor(private readonly identity: IdentityService) {}
  @Get('public/units')
  @Publik()
  units() {
    return this.identity.units();
  }
  @Post('admin/units')
  @Izin('units.manage')
  create(@Body() body: unknown, @Req() req: PermintaanBerpengguna) {
    return this.identity.createUnit(cookie(req, SESSION_COOKIE), body);
  }
}
