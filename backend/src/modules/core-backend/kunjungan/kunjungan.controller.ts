import { Controller, Get, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import {
  Publik,
  type PermintaanBerpengguna,
} from '../../../common/decorators/otorisasi.decorator.js';
import type { KonfigurasiApp } from '../../../config/configuration.js';
import { cookie, TanpaCsrf } from '../../identity/identity.guard.js';
import { KunjunganService, tanggalWita } from './kunjungan.service.js';

const KUKI_KUNJUNGAN = 'jdih_kunjungan';

/**
 * Agen yang bukan pengunjung manusia: mesin pencari, perayap, pratinjau tautan,
 * alat uji, dan peramban otomatis (headless). Kunjungan mereka tidak dihitung.
 */
const POLA_BOT =
  /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|headless|lighthouse|pagespeed|puppeteer|playwright|selenium|phantomjs|curl|wget|python-requests|httpclient|go-http/i;

export const bukanManusia = (agen: string | undefined) => !agen || POLA_BOT.test(agen);

@Controller('public/visits')
export class KunjunganController {
  constructor(
    private readonly kunjungan: KunjunganService,
    private readonly config: ConfigService<KonfigurasiApp, true>,
  ) {}

  @Get() @Publik() ringkasan(@Res({ passthrough: true }) res: Response) {
    res.setHeader('Cache-Control', 'no-store');
    return this.kunjungan.ringkasan();
  }

  /**
   * Catat satu kunjungan. Peramban yang sudah tercatat hari ini (kuki berisi
   * tanggal WITA hari ini) tidak dihitung lagi, jadi memuat ulang halaman tidak
   * menaikkan angka. Kuki berakhir di ujung hari WITA. Bot dan peramban
   * otomatis tidak dihitung.
   */
  @Post()
  @Publik()
  @TanpaCsrf()
  @Throttle({ umum: { limit: 10, ttl: 60000 } })
  async catat(@Req() req: PermintaanBerpengguna, @Res({ passthrough: true }) res: Response) {
    res.setHeader('Cache-Control', 'no-store');
    const sekarang = new Date();
    const hari = tanggalWita(sekarang);
    if (cookie(req, KUKI_KUNJUNGAN) !== hari && !bukanManusia(req.get('user-agent'))) {
      await this.kunjungan.catat(sekarang);
      res.cookie(KUKI_KUNJUNGAN, hari, {
        httpOnly: true,
        sameSite: 'lax',
        secure: this.config.get('identitas.secure', { infer: true }),
        path: '/',
        expires: new Date(`${hari}T23:59:59+08:00`),
      });
    }
    return this.kunjungan.ringkasan(sekarang);
  }
}
