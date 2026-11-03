import { Controller, Get, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import {
  Publik,
  type PermintaanBerpengguna,
} from '../../../common/decorators/otorisasi.decorator.js';
import { HomeService } from './home.service.js';
import { IdentityService } from '../../identity/identity.service.js';
import { cookie, SESSION_COOKIE } from '../../identity/identity.guard.js';

@Controller('public')
export class HomeController {
  constructor(
    private readonly home: HomeService,
    private readonly identity: IdentityService,
  ) {}
  @Get('home')
  @Publik()
  // SSR berkumpul pada IP server Next. Tetap terbatas, tanpa melonggarkan login,
  // penulisan atau unduhan; query DB juga dibatasi pool dan digabung saat serentak.
  @Throttle({ umum: { limit: 600, ttl: 60000 } })
  async snapshot(@Req() req: PermintaanBerpengguna, @Res({ passthrough: true }) res: Response) {
    res.setHeader('Cache-Control', 'private, no-store');
    res.vary('Cookie');
    const actor = await this.identity.optionalUser(cookie(req, SESSION_COOKIE));
    return this.home.snapshot(actor);
  }
}
