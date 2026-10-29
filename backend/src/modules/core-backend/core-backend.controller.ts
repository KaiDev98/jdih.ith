import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, Res } from '@nestjs/common';
import type { Response } from 'express';
import {
  Izin,
  IzinSalahSatu,
  Aktor,
  Publik,
  type PermintaanBerpengguna,
} from '../../common/decorators/otorisasi.decorator.js';
import type { PenggunaAktif } from '@jdih/shared';
import { skemaAjukanDokumen, skemaKembalikanRevisi, skemaSetujuiDokumen } from '@jdih/shared';
import { CoreBackendService } from './core-backend.service.js';
import { IdentityService } from '../identity/identity.service.js';
import { cookie, SESSION_COOKIE } from '../identity/identity.guard.js';

type MasterTable = 'unit_kerja' | 'jenis_dokumen' | 'kategori' | 'tag';
type ToggleableMasterTable = Exclude<MasterTable, 'tag'>;
type PublicMasterTable = 'unit_kerja' | 'jenis_dokumen' | 'kategori';

@Controller('admin/master')
export class MasterController {
  constructor(private readonly core: CoreBackendService) {}
  @Get(':table') @IzinSalahSatu('master.manage', 'units.manage', 'documents.read_admin') list(
    @Param('table') table: MasterTable,
    @Aktor() actor: PenggunaAktif,
  ) {
    return this.core.masterList(actor, table);
  }
  @Get(':table/:id') @IzinSalahSatu('master.manage', 'units.manage', 'documents.read_admin') detail(
    @Param('table') table: MasterTable,
    @Param('id') id: string,
    @Aktor() actor: PenggunaAktif,
  ) {
    return this.core.masterDetail(actor, table, id);
  }
  @Post(':table') @IzinSalahSatu('master.manage', 'units.manage') create(
    @Param('table') table: MasterTable,
    @Body() body: unknown,
    @Aktor() actor: PenggunaAktif,
  ) {
    return this.core.masterSave(actor, table, null, body);
  }
  @Patch(':table/:id') @IzinSalahSatu('master.manage', 'units.manage') update(
    @Param('table') table: ToggleableMasterTable,
    @Param('id') id: string,
    @Body() body: unknown,
    @Aktor() actor: PenggunaAktif,
  ) {
    return this.core.masterSave(actor, table, id, body);
  }
  @Patch(':table/:id/status') @IzinSalahSatu('master.manage', 'units.manage') status(
    @Param('table') table: ToggleableMasterTable,
    @Param('id') id: string,
    @Body() body: unknown,
    @Aktor() actor: PenggunaAktif,
  ) {
    return this.core.masterStatus(actor, table, id, body);
  }
}

@Controller('admin/document-options')
export class DocumentOptionsController {
  constructor(private readonly core: CoreBackendService) {}
  @Get(':table') @Izin('documents.create') list(
    @Param('table') table: 'jenis_dokumen' | 'kategori',
    @Aktor() actor: PenggunaAktif,
  ) {
    return this.core.documentOptions(actor, table);
  }
}

@Controller('public/master')
export class PublicMasterController {
  constructor(private readonly core: CoreBackendService) {}
  @Get(':table') @Publik() list(@Param('table') table: PublicMasterTable) {
    return this.core.publicMaster(table);
  }
}

@Controller('admin/documents')
export class DocumentsController {
  constructor(private readonly core: CoreBackendService) {}
  @Get('notifications') @Izin('documents.read_admin') notifications(@Aktor() actor: PenggunaAktif) {
    return this.core.notifications(actor);
  }
  @Delete('notifications/:id') @Izin('documents.read_admin') dismissNotification(
    @Param('id') id: string, @Aktor() actor: PenggunaAktif,
  ) {
    return this.core.dismissNotification(actor, id);
  }
  @Delete('notifications') @Izin('documents.read_admin') clearNotifications(
    @Body() body: unknown, @Aktor() actor: PenggunaAktif,
  ) {
    return this.core.clearNotifications(actor, body);
  }
  @Get('verification-queue')
  @IzinSalahSatu('workflow.approve', 'workflow.return', 'documents.read_admin')
  queue(@Query() query: unknown, @Aktor() actor: PenggunaAktif) {
    return this.core.adminDocuments(actor, query, true);
  }
  @Get('relation-targets') @Izin('legal.manage_relations') relationTargets(
    @Query() query: unknown, @Aktor() actor: PenggunaAktif,
  ) {
    return this.core.relationTargets(actor, query);
  }
  @Get() @Izin('documents.read_admin') list(
    @Query() query: unknown,
    @Aktor() actor: PenggunaAktif,
  ) {
    return this.core.adminDocuments(actor, query);
  }
  @Post() @Izin('documents.create') create(@Body() body: unknown, @Aktor() actor: PenggunaAktif) {
    return this.core.createDocument(actor, body);
  }
  @Get(':id') @Izin('documents.read_admin') detail(
    @Param('id') id: string,
    @Query('versionId') versionId: string | undefined,
    @Aktor() actor: PenggunaAktif,
  ) {
    return this.core.document(actor, id, versionId);
  }
  @Patch(':id') @Izin('documents.edit') update(
    @Param('id') id: string,
    @Body() body: unknown,
    @Aktor() actor: PenggunaAktif,
  ) {
    return this.core.updateDocument(actor, id, body);
  }
  @Post(':id/versions') @Izin('documents.revise') version(
    @Param('id') id: string,
    @Body() body: unknown,
    @Aktor() actor: PenggunaAktif,
  ) {
    return this.core.newVersion(actor, id, body);
  }
  @Patch('versions/:versionId') @Izin('documents.edit') updateVersion(
    @Param('versionId') id: string,
    @Body() body: unknown,
    @Aktor() actor: PenggunaAktif,
  ) {
    return this.core.updateVersion(actor, id, body);
  }
}

@Controller('admin/audit')
export class AuditController {
  constructor(private readonly core: CoreBackendService) {}
  @Get() @Izin('audit.read') list(@Query() query: unknown, @Aktor() actor: PenggunaAktif) {
    return this.core.auditList(actor, query);
  }
}

@Controller('admin/documents')
export class WorkflowController {
  constructor(private readonly core: CoreBackendService) {}
  @Post('versions/:versionId/submit') @Izin('workflow.submit') submit(
    @Param('versionId') id: string,
    @Body() body: unknown,
    @Aktor() actor: PenggunaAktif,
  ) {
    return this.core.transition(actor, id, 'SUBMIT', skemaAjukanDokumen.parse(body).catatan);
  }
  @Post('versions/:versionId/return') @Izin('workflow.return') returnRevision(
    @Param('versionId') id: string,
    @Body() body: unknown,
    @Aktor() actor: PenggunaAktif,
  ) {
    return this.core.transition(actor, id, 'RETURN', skemaKembalikanRevisi.parse(body).catatan);
  }
  @Post('versions/:versionId/approve') @Izin('workflow.approve') approve(
    @Param('versionId') id: string,
    @Body() body: unknown,
    @Aktor() actor: PenggunaAktif,
  ) {
    const data = skemaSetujuiDokumen.parse(body);
    return this.core.transition(actor, id, 'APPROVE', data.catatan, data.konfirmasi);
  }
  @Get('versions/:versionId/legal-impact') @Izin('workflow.publish') impact(
    @Param('versionId') id: string,
    @Aktor() actor: PenggunaAktif,
  ) {
    return this.core.impact(actor, id);
  }
  @Post('versions/:versionId/publish') @Izin('workflow.publish') publish(
    @Param('versionId') id: string,
    @Body() body: unknown,
    @Aktor() actor: PenggunaAktif,
  ) {
    return this.core.publish(actor, id, body);
  }
  @Post(':id/withdraw') @Izin('workflow.withdraw') withdraw(
    @Param('id') id: string,
    @Body() body: unknown,
    @Aktor() actor: PenggunaAktif,
  ) {
    return this.core.withdraw(actor, id, body);
  }
}

@Controller('admin/versions/:versionId/relations')
export class LegalRelationsController {
  constructor(private readonly core: CoreBackendService) {}
  @Get() @Izin('documents.read_admin') list(
    @Param('versionId') id: string,
    @Aktor() actor: PenggunaAktif,
  ) {
    return this.core.relations(actor, id);
  }
  @Post() @Izin('legal.manage_relations') create(
    @Param('versionId') id: string,
    @Body() body: unknown,
    @Aktor() actor: PenggunaAktif,
  ) {
    return this.core.addRelation(actor, id, body);
  }
  @Delete(':relationId') @Izin('legal.manage_relations') remove(
    @Param('versionId') id: string,
    @Param('relationId') rid: string,
    @Aktor() actor: PenggunaAktif,
  ) {
    return this.core.removeRelation(actor, id, rid);
  }
}

@Controller('documents')
export class PublicDocumentController {
  constructor(
    private readonly core: CoreBackendService,
    private readonly identity: IdentityService,
  ) {}
  @Get(':slug') @Publik() async detail(
    @Param('slug') slug: string,
    @Req() req: PermintaanBerpengguna,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader('Cache-Control', 'private, no-store');
    res.vary('Cookie');
    const token = cookie(req, SESSION_COOKIE);
    const actor = await this.identity.optionalUser(token);
    return this.core.publicDetail(slug, actor);
  }
}
