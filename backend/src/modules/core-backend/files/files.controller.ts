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
import { Aktor, Izin, Publik, type PermintaanBerpengguna } from '../../../common/decorators/otorisasi.decorator.js';
import type { PenggunaAktif } from '@jdih/shared';
import { IdentityService } from '../../identity/identity.service.js';
import { cookie, SESSION_COOKIE } from '../../identity/identity.guard.js';
import { DocumentFilesService } from './document-files.service.js';
import { DownloadRateLimitService } from '../download-rate-limit.service.js';
import { UploadInterceptor } from '../storage/upload.interceptor.js';
import { bisaDipratinjau } from '../storage/file-validation.js';
import { requestedRange, streamFileResponse } from './byte-range.js';
import { ConfigService } from '@nestjs/config';
import type { KonfigurasiApp } from '../../../config/configuration.js';
import { StatistikDokumenService } from '../statistik/statistik-dokumen.service.js';
import { bukanManusia } from '../kunjungan/kunjungan.controller.js';

@Controller('admin/documents/versions')
export class AdminDocumentFilesController {
  constructor(private readonly files: DocumentFilesService) {}

  @Get(':versionId/files')
  @Izin('documents.read_admin')
  list(@Param('versionId') versionId: string, @Aktor() actor: PenggunaAktif) {
    return this.files.listForVersion(actor, versionId);
  }

  @Get(':versionId/files/:fileId')
  @Izin('documents.read_admin')
  async review(@Param('versionId') versionId: string, @Param('fileId') fileId: string,
    @Query('mode') mode: string | undefined, @Aktor() actor: PenggunaAktif,
    @Req() req: PermintaanBerpengguna, @Res() res: Response) {
    const authorized = await this.files.authorizeVersion(actor, versionId, fileId);
    const range = requestedRange(req.get('range'), req.get('if-range'), Number(authorized.size_bytes), res);
    if (range === false) return;
    const file = range ? await this.files.openAuthorized(authorized, range) : await this.files.openAuthorized(authorized);
    const disposition = mode === 'inline' && bisaDipratinjau(file.mimeType) ? 'inline' : 'attachment';
    streamFileResponse(file, res, disposition, range);
  }

  @Delete(':versionId/files/:fileId')
  @Izin('documents.upload')
  remove(
    @Param('versionId') versionId: string,
    @Param('fileId') fileId: string,
    @Aktor() actor: PenggunaAktif,
  ) {
    return this.files.removeFromDraft(actor, versionId, fileId);
  }

  @Post(':versionId/files')
  @Izin('documents.upload')
  @UseInterceptors(UploadInterceptor)
  async upload(
    @Param('versionId') versionId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: PermintaanBerpengguna,
    @Aktor() actor: PenggunaAktif,
  ) {
    try {
      const raw = { ...(req.body as Record<string, unknown>) };
      if (typeof raw.urutan === 'string' && /^\d+$/.test(raw.urutan)) raw.urutan = Number(raw.urutan);
      return await this.files.upload(actor, versionId, file, raw);
    } finally {
      await rm(file.path, { force: true });
    }
  }
}

@Controller('public/documents')
export class PublicDocumentFilesController {
  constructor(
    private readonly files: DocumentFilesService,
    private readonly identity: IdentityService,
    private readonly downloadLimits: DownloadRateLimitService,
    private readonly statistik: StatistikDokumenService,
    private readonly config: ConfigService<KonfigurasiApp, true>,
  ) {}

  @Get(':slug/files/:fileId')
  @Publik()
  async stream(
    @Param('slug') slug: string,
    @Param('fileId') fileId: string,
    @Query('mode') mode: string | undefined,
    @Req() req: PermintaanBerpengguna,
    @Res() res: Response,
  ) {
    const token = cookie(req, SESSION_COOKIE);
    const actor = await this.identity.optionalUser(token);
    // Resolve and authorize before rate accounting so unauthorized Secret
    // probes retain the same not-found semantics as missing resources.
    const authorized = await this.files.authorizeCurrent(slug, fileId, actor);
    // Hanya PDF yang ditampilkan langsung; jenis lain (DOCX, XLSX, PPTX) selalu diunduh.
    const disposition = mode === 'inline' && bisaDipratinjau(authorized.mime_type) ? 'inline' : 'attachment';
    this.downloadLimits.consume(
      { penggunaId: actor?.id, ip: req.ip },
      disposition === 'inline' ? 'pratinjau' : 'unduh',
    );
    const range = requestedRange(req.get('range'), req.get('if-range'), Number(authorized.size_bytes), res);
    if (range === false) return;
    const file = range ? await this.files.openAuthorized(authorized, range) : await this.files.openAuthorized(authorized);
    // Unduhan (bukan pratinjau) menambah jumlah orang yang mengunduh; kegagalan
    // pencatatan tidak boleh menggagalkan unduhan.
    if (disposition === 'attachment' && !bukanManusia(req.get('user-agent')))
      await this.statistik
        .catatSekali(req, res, authorized.dokumen_id, 'unduh', this.config.get('identitas.secure', { infer: true }))
        .catch(() => undefined);
    streamFileResponse(file, res, disposition, range);
  }
}
