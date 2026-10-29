import { Controller, Get, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { Publik } from '../../../common/decorators/otorisasi.decorator.js';
import { HomeService } from './home.service.js';

@Controller('public')
export class HomeController {
  constructor(private readonly home: HomeService) {}
  @Get('home')
  @Publik()
  // SSR berkumpul pada IP server Next. Tetap terbatas, tanpa melonggarkan login,
  // penulisan atau unduhan; query DB juga dibatasi pool dan digabung saat serentak.
  @Throttle({ umum: { limit: 600, ttl: 60000 } })
  snapshot(@Res({ passthrough: true }) res: Response) {
    res.setHeader('Cache-Control', 'no-store');
    return this.home.snapshot();
  }
}
