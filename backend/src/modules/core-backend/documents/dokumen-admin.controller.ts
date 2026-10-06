import { Body, Controller, Delete, Param, Patch } from '@nestjs/common';
import type { PenggunaAktif } from '@jdih/shared';
import { skemaParamId } from '@jdih/shared';
import { Aktor, Izin } from '../../../common/decorators/otorisasi.decorator.js';
import { DokumenAdminService } from './dokumen-admin.service.js';

@Controller('admin/documents')
export class DokumenAdminController {
  constructor(private readonly dokumen: DokumenAdminService) {}
  @Patch(':id/legal-status') @Izin('legal.correct_status') ubahStatus(
    @Param() param: unknown,
    @Body() body: unknown,
    @Aktor() actor: PenggunaAktif,
  ) {
    return this.dokumen.ubahStatusHukum(actor, skemaParamId.parse(param).id, body);
  }
  @Delete(':id') @Izin('documents.delete') hapus(
    @Param() param: unknown,
    @Aktor() actor: PenggunaAktif,
  ) {
    return this.dokumen.hapusPermanen(actor, skemaParamId.parse(param).id);
  }
}
