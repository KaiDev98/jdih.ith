import { Body, Controller, Get, Patch } from '@nestjs/common';
import type { PenggunaAktif } from '@jdih/shared';
import { Aktor, Izin, Publik } from '../../../common/decorators/otorisasi.decorator.js';
import { KontakService } from './kontak.service.js';

@Controller('public/contact')
export class PublicKontakController {
  constructor(private readonly kontak: KontakService) {}
  @Get() @Publik() ambil() {
    return this.kontak.ambil();
  }
}

@Controller('admin/contact')
export class AdminKontakController {
  constructor(private readonly kontak: KontakService) {}
  @Patch() @Izin('contact.manage') ubah(@Body() body: unknown, @Aktor() actor: PenggunaAktif) {
    return this.kontak.ubah(actor, body);
  }
}
