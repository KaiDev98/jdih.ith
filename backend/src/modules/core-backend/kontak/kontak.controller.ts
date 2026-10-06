import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import type { PenggunaAktif } from '@jdih/shared';
import { skemaParamId } from '@jdih/shared';
import { Aktor, Izin, Publik } from '../../../common/decorators/otorisasi.decorator.js';
import { KontakService } from './kontak.service.js';

@Controller('public/contact')
export class PublicKontakController {
  constructor(private readonly kontak: KontakService) {}
  @Get() @Publik() ambil() {
    return this.kontak.ambil();
  }
}

@Controller('admin/contact/items')
export class AdminKontakController {
  constructor(private readonly kontak: KontakService) {}
  @Post() @Izin('contact.manage') tambah(@Body() body: unknown, @Aktor() actor: PenggunaAktif) {
    return this.kontak.tambah(actor, body);
  }
  @Patch(':id') @Izin('contact.manage') ubah(
    @Param() param: unknown,
    @Body() body: unknown,
    @Aktor() actor: PenggunaAktif,
  ) {
    return this.kontak.ubah(actor, skemaParamId.parse(param).id, body);
  }
  @Delete(':id') @Izin('contact.manage') hapus(
    @Param() param: unknown,
    @Aktor() actor: PenggunaAktif,
  ) {
    return this.kontak.hapus(actor, skemaParamId.parse(param).id);
  }
}
