import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { skemaId, type PenggunaAktif } from '@jdih/shared';
import { Aktor, Izin } from '../../../common/decorators/otorisasi.decorator.js';
import { RemovalRequestsService } from './removal-requests.service.js';

@Controller('admin')
export class RemovalRequestsController {
  constructor(private readonly requests: RemovalRequestsService) {}
  @Get('removal-requests') @Izin('documents.read_admin') list(
    @Aktor() actor: PenggunaAktif,
    @Query() query: unknown,
  ) {
    return this.requests.list(actor, query);
  }
  @Post('documents/:id/removal-requests') @Izin('documents.edit') document(
    @Aktor() actor: PenggunaAktif,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.requests.create(actor, 'DOCUMENT', skemaId.parse(id), body);
  }
  @Post('letter-templates/:id/removal-requests') @Izin('templates.manage') template(
    @Aktor() actor: PenggunaAktif,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.requests.create(actor, 'TEMPLATE', skemaId.parse(id), body);
  }
  @Post('removal-requests/:id/decision') @Izin('documents.read_admin') decide(
    @Aktor() actor: PenggunaAktif,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.requests.decide(actor, skemaId.parse(id), body);
  }
}
