import { Body, Controller, Delete, Param } from '@nestjs/common';
import type { PenggunaAktif } from '@jdih/shared';
import { skemaHapusDokumenPermanen, skemaParamId } from '@jdih/shared';
import { Aktor, Izin } from '../../../common/decorators/otorisasi.decorator.js';
import { DokumenAdminService } from './dokumen-admin.service.js';

@Controller('admin/documents')
export class DokumenAdminController {
  constructor(private readonly dokumen: DokumenAdminService) {}
  @Delete(':id/drafts/:versionId') @Izin('documents.edit') hapusDraf(
    @Param('id') id: string, @Param('versionId') versionId: string, @Aktor() actor: PenggunaAktif,
  ) {
    return this.dokumen.hapusDraf(actor, skemaParamId.parse({ id }).id, skemaParamId.parse({ id: versionId }).id);
  }
  @Delete(':id') @Izin('documents.delete') hapus(
    @Param() param: unknown,
    @Aktor() actor: PenggunaAktif,
    @Body() raw: unknown,
  ) {
    return this.dokumen.hapusPermanen(actor, skemaParamId.parse(param).id, skemaHapusDokumenPermanen.parse(raw).versionId);
  }
}
