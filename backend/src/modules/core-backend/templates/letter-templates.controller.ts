import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { rm } from 'node:fs/promises';
import {
  Aktor,
  Izin,
  IzinSalahSatu,
  Publik,
  type PermintaanBerpengguna,
} from '../../../common/decorators/otorisasi.decorator.js';
import type { PenggunaAktif } from '@jdih/shared';
import { skemaId } from '@jdih/shared';
import { IdentityService } from '../../identity/identity.service.js';
import { cookie, SESSION_COOKIE } from '../../identity/identity.guard.js';
import { UploadInterceptor } from '../storage/upload.interceptor.js';
import { contentDisposition } from '../files/file-headers.js';
import { LetterTemplatesService } from './letter-templates.service.js';
import { DownloadRateLimitService } from '../download-rate-limit.service.js';

@Controller('admin/letter-templates')
export class AdminLetterTemplatesController {
  constructor(private readonly templates: LetterTemplatesService) {}

  @Get() @IzinSalahSatu('templates.manage', 'documents.read_admin') list(
    @Aktor() actor: PenggunaAktif,
  ) {
    return this.templates.adminList(actor);
  }

  @Get('verification-queue')
  @IzinSalahSatu('templates.manage', 'documents.read_admin')
  queue(@Query() query: unknown, @Aktor() actor: PenggunaAktif) {
    return this.templates.verificationQueue(actor, query);
  }

  @Post()
  @Izin('templates.manage')
  @UseInterceptors(UploadInterceptor)
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: PermintaanBerpengguna,
    @Aktor() actor: PenggunaAktif,
  ) {
    try {
      return await this.templates.create(actor, file, req.body);
    } finally {
      await rm(file.path, { force: true });
    }
  }

  @Post(':templateId/versions')
  @Izin('templates.manage')
  @UseInterceptors(UploadInterceptor)
  async newVersion(
    @Param('templateId') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: PermintaanBerpengguna,
    @Aktor() actor: PenggunaAktif,
  ) {
    try {
      return await this.templates.newVersion(actor, id, file, req.body);
    } finally {
      await rm(file.path, { force: true });
    }
  }

  @Post(':templateId/versions/:versionId/verify')
  @Izin('templates.manage')
  verify(
    @Param('templateId') templateId: string,
    @Param('versionId') versionId: string,
    @Req() req: PermintaanBerpengguna,
    @Aktor() actor: PenggunaAktif,
  ) {
    return this.templates.verify(
      actor,
      skemaId.parse(templateId),
      skemaId.parse(versionId),
      req.body,
    );
  }

  @Post(':templateId/versions/:versionId/publish')
  @Izin('templates.manage')
  publish(
    @Param('templateId') templateId: string,
    @Param('versionId') versionId: string,
    @Req() req: PermintaanBerpengguna,
    @Aktor() actor: PenggunaAktif,
  ) {
    return this.templates.publish(
      actor,
      skemaId.parse(templateId),
      skemaId.parse(versionId),
      req.body,
    );
  }

  @Get(':templateId/versions/:versionId/download')
  @IzinSalahSatu('templates.manage', 'documents.read_admin')
  async review(
    @Param('templateId') templateId: string,
    @Param('versionId') versionId: string,
    @Aktor() actor: PenggunaAktif,
    @Res() res: Response,
  ) {
    return this.reviewFile(actor, templateId, versionId, res, false, false);
  }

  @Get(':templateId/versions/:versionId/preview')
  @IzinSalahSatu('templates.manage', 'documents.read_admin')
  preview(
    @Param('templateId') templateId: string,
    @Param('versionId') versionId: string,
    @Aktor() actor: PenggunaAktif,
    @Res() res: Response,
  ) {
    return this.reviewFile(actor, templateId, versionId, res, false, true);
  }

  @Get('verification-queue/:templateId/versions/:versionId/preview')
  @IzinSalahSatu('templates.manage', 'documents.read_admin')
  previewQueued(
    @Param('templateId') templateId: string,
    @Param('versionId') versionId: string,
    @Aktor() actor: PenggunaAktif,
    @Res() res: Response,
  ) {
    return this.reviewFile(actor, templateId, versionId, res, true, true);
  }

  @Get('verification-queue/:templateId/versions/:versionId/download')
  @IzinSalahSatu('templates.manage', 'documents.read_admin')
  downloadQueued(
    @Param('templateId') templateId: string,
    @Param('versionId') versionId: string,
    @Aktor() actor: PenggunaAktif,
    @Res() res: Response,
  ) {
    return this.reviewFile(actor, templateId, versionId, res, true, false);
  }

  private async reviewFile(
    actor: PenggunaAktif,
    templateId: string,
    versionId: string,
    res: Response,
    queue: boolean,
    preview: boolean,
  ) {
    const file = await this.templates.review(
      actor,
      skemaId.parse(templateId),
      skemaId.parse(versionId),
      { queue, preview },
    );
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Length', String(file.size));
    res.setHeader(
      'Content-Disposition',
      contentDisposition(file.originalName, preview ? 'inline' : 'attachment'),
    );
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    file.stream.on('error', () => res.destroy());
    file.stream.pipe(res);
  }

  @Post(':templateId/revoke')
  @Izin('templates.manage')
  revoke(
    @Param('templateId') id: string,
    @Req() req: PermintaanBerpengguna,
    @Aktor() actor: PenggunaAktif,
  ) {
    return this.templates.revoke(actor, skemaId.parse(id), req.body);
  }

  @Delete(':templateId')
  @Izin('templates.manage')
  remove(
    @Param('templateId') id: string,
    @Req() req: PermintaanBerpengguna,
    @Aktor() actor: PenggunaAktif,
  ) {
    return this.templates.remove(actor, skemaId.parse(id), req.body);
  }
}

@Controller('letter-templates')
export class PublicLetterTemplatesController {
  constructor(
    private readonly templates: LetterTemplatesService,
    private readonly identity: IdentityService,
    private readonly downloadLimits: DownloadRateLimitService,
  ) {}
  private async actor(req: PermintaanBerpengguna) {
    const token = cookie(req, SESSION_COOKIE);
    return this.identity.optionalUser(token);
  }

  @Get()
  @Publik()
  async list(
    @Query() query: unknown,
    @Req() req: PermintaanBerpengguna,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader('Cache-Control', 'private, no-store');
    res.vary('Cookie');
    return this.templates.list(query, await this.actor(req));
  }

  @Get(':slug/download')
  @Publik()
  async download(
    @Param('slug') slug: string,
    @Req() req: PermintaanBerpengguna,
    @Res() res: Response,
  ) {
    return this.sendFile(slug, req, res, false);
  }

  @Get(':slug/preview')
  @Publik()
  preview(@Param('slug') slug: string, @Req() req: PermintaanBerpengguna, @Res() res: Response) {
    return this.sendFile(slug, req, res, true);
  }

  private async sendFile(
    slug: string,
    req: PermintaanBerpengguna,
    res: Response,
    preview: boolean,
  ) {
    const actor = await this.actor(req);
    // Keep Internal-template denial indistinguishable from a missing template.
    const authorized = await this.templates.authorizeOpen(slug, actor);
    this.downloadLimits.consume({ penggunaId: actor?.id, ip: req.ip });
    const file = await this.templates.openAuthorized(authorized, actor, preview);
    res.status(200);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Length', String(file.size));
    res.setHeader(
      'Content-Disposition',
      contentDisposition(file.originalName, preview ? 'inline' : 'attachment'),
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    file.stream.on('error', () => res.destroy());
    file.stream.pipe(res);
  }
}
