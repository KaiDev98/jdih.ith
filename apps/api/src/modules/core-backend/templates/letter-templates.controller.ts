import { Controller, Get, Param, Post, Query, Req, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import type { Response } from 'express';
import { rm } from 'node:fs/promises';
import { Aktor, Izin, Publik, type PermintaanBerpengguna } from '../../../common/decorators/otorisasi.decorator.js';
import type { PenggunaAktif } from '@jdih/shared';
import { IdentityService } from '../../identity/identity.service.js';
import { cookie, SESSION_COOKIE } from '../../identity/identity.guard.js';
import { UploadInterceptor } from '../storage/upload.interceptor.js';
import { contentDisposition } from '../files/file-headers.js';
import { LetterTemplatesService } from './letter-templates.service.js';
import { DownloadRateLimitService } from '../download-rate-limit.service.js';

@Controller('admin/letter-templates')
export class AdminLetterTemplatesController {
  constructor(private readonly templates: LetterTemplatesService) {}

  @Get() @Izin('templates.manage') list(@Aktor() actor: PenggunaAktif) {
    return this.templates.adminList(actor);
  }

  @Post() @Izin('templates.manage') @UseInterceptors(UploadInterceptor)
  async create(@UploadedFile() file: Express.Multer.File, @Req() req: PermintaanBerpengguna, @Aktor() actor: PenggunaAktif) {
    try { return await this.templates.create(actor, file, req.body); }
    finally { await rm(file.path, { force: true }); }
  }

  @Post(':templateId/versions') @Izin('templates.manage') @UseInterceptors(UploadInterceptor)
  async newVersion(
    @Param('templateId') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: PermintaanBerpengguna,
    @Aktor() actor: PenggunaAktif,
  ) {
    try { return await this.templates.newVersion(actor, id, file, req.body); }
    finally { await rm(file.path, { force: true }); }
  }

  @Post(':templateId/archive') @Izin('templates.manage')
  archive(@Param('templateId') id: string, @Req() req: PermintaanBerpengguna, @Aktor() actor: PenggunaAktif) {
    return this.templates.archive(actor, id, req.body);
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
    return token ? (await this.identity.authenticate(token)).user : undefined;
  }

  @Get() @Publik()
  async list(@Query() query: unknown, @Req() req: PermintaanBerpengguna) {
    return this.templates.list(query, await this.actor(req));
  }

  @Get(':slug/download') @Publik()
  async download(@Param('slug') slug: string, @Req() req: PermintaanBerpengguna, @Res() res: Response) {
    const actor = await this.actor(req);
    // Keep Internal-template denial indistinguishable from a missing template.
    const authorized = await this.templates.authorizeOpen(slug, actor);
    this.downloadLimits.consume({ penggunaId: actor?.id, ip: req.ip });
    const file = await this.templates.openAuthorized(authorized, actor);
    res.status(200);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Length', String(file.size));
    res.setHeader('Content-Disposition', contentDisposition(file.originalName, 'attachment'));
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    file.stream.on('error', () => res.destroy());
    file.stream.pipe(res);
  }
}
