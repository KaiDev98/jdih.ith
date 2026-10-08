import { Controller, Param, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import {
  Publik,
  type PermintaanBerpengguna,
} from '../../../common/decorators/otorisasi.decorator.js';
import type { KonfigurasiApp } from '../../../config/configuration.js';
import { IdentityService } from '../../identity/identity.service.js';
import { cookie, SESSION_COOKIE, TanpaCsrf } from '../../identity/identity.guard.js';
import { bukanManusia } from '../kunjungan/kunjungan.controller.js';
import { StatistikDokumenService } from './statistik-dokumen.service.js';

@Controller('public/documents')
export class StatistikDokumenController {
  constructor(
    private readonly statistik: StatistikDokumenService,
    private readonly identity: IdentityService,
    private readonly config: ConfigService<KonfigurasiApp, true>,
  ) {}

  /**
   * Catat bahwa satu orang melihat dokumen ini, lalu kembalikan angka terbaru.
   * Hak akses diperiksa seperti halaman detail; bot tidak dihitung.
   */
  @Post(':slug/view')
  @Publik()
  @TanpaCsrf()
  @Throttle({ umum: { limit: 30, ttl: 60000 } })
  async lihat(
    @Param('slug') slug: string,
    @Req() req: PermintaanBerpengguna,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader('Cache-Control', 'no-store');
    const token = cookie(req, SESSION_COOKIE);
    const actor = token ? (await this.identity.authenticate(token)).user : undefined;
    const id = await this.statistik.dokumenTerbaca(slug, actor);
    if (!bukanManusia(req.get('user-agent')))
      await this.statistik.catatSekali(
        req,
        res,
        id,
        'lihat',
        this.config.get('identitas.secure', { infer: true }),
      );
    return this.statistik.ambil(id);
  }
}
