import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { Publik } from '../../common/decorators/otorisasi.decorator.js';
import { TanpaCsrf } from './identity.guard.js';
import { PasswordRecoveryService } from './password-recovery.service.js';
import { RecoveryMailService } from './recovery-mail.service.js';

@Controller('auth/password-recovery')
export class PasswordRecoveryController {
  constructor(
    private readonly recovery: PasswordRecoveryService,
    private readonly mail: RecoveryMailService,
  ) {}
  private headers(res: Response) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
  }
  @Get()
  @Publik()
  status(@Res({ passthrough: true }) res: Response) {
    this.headers(res);
    return { tersedia: this.mail.available };
  }
  @Post()
  @Publik()
  @TanpaCsrf()
  @Throttle({ umum: { limit: 5, ttl: 900_000 } })
  request(@Body() input: unknown, @Res({ passthrough: true }) res: Response) {
    this.headers(res);
    return this.recovery.request(input);
  }
  @Post('confirm')
  @Publik()
  @TanpaCsrf()
  @Throttle({ umum: { limit: 10, ttl: 900_000 } })
  confirm(@Body() input: unknown, @Res({ passthrough: true }) res: Response) {
    this.headers(res);
    return this.recovery.confirm(input);
  }
}
