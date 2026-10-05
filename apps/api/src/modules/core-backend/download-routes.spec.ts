import 'reflect-metadata';
import { Readable } from 'node:stream';
import cookieParser from 'cookie-parser';
import { NotFoundException } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { PenggunaAktif } from '@jdih/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { KonfigurasiApp } from '../../config/configuration.js';
import { IdentityService } from '../identity/identity.service.js';
import { DocumentFilesService } from './files/document-files.service.js';
import type { BerkasDownloadTerotorisasi } from './files/document-files.service.js';
import { PublicDocumentFilesController } from './files/files.controller.js';
import { LetterTemplatesService } from './templates/letter-templates.service.js';
import type { TemplateDownloadTerotorisasi } from './templates/letter-templates.service.js';
import { PublicLetterTemplatesController } from './templates/letter-templates.controller.js';
import { DownloadRateLimitService } from './download-rate-limit.service.js';

const token = 'authorized-test-session';
const pengguna: PenggunaAktif = {
  id: 'staff-verified-by-server',
  nama: 'Dosen Test',
  surel: 'dosen@ith.ac.id',
  status: 'AKTIF',
  unitKerjaId: null,
  unitManual: null,
  avatarUrl: null,
  peran: ['DOSEN_STAF'],
  izin: [],
};

function streamFile() {
  return {
    stream: Readable.from([Buffer.from('first-chunk-'), Buffer.from('second-chunk')]),
    size: 24,
    mimeType: 'application/pdf',
    originalName: 'document.pdf',
  };
}

describe('download route rate limiting (HTTP)', () => {
  const files = {
    authorizeCurrent: vi.fn<
      (slug: string, fileId: string, actor?: PenggunaAktif) => Promise<BerkasDownloadTerotorisasi>
    >(),
    openAuthorized: vi.fn<
      (file: BerkasDownloadTerotorisasi) => ReturnType<DocumentFilesService['openAuthorized']>
    >(),
  };
  const templates = {
    authorizeOpen: vi.fn<
      (slug: string, actor?: PenggunaAktif) => Promise<TemplateDownloadTerotorisasi>
    >(),
    openAuthorized: vi.fn<
      (file: TemplateDownloadTerotorisasi, actor?: PenggunaAktif) =>
        ReturnType<LetterTemplatesService['openAuthorized']>
    >(),
  };
  const identity = { authenticate: vi.fn() };
  let app: INestApplication;
  let base: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    files.authorizeCurrent.mockResolvedValue({} as BerkasDownloadTerotorisasi);
    files.openAuthorized.mockImplementation(() => Promise.resolve(streamFile()));
    templates.authorizeOpen.mockResolvedValue({} as TemplateDownloadTerotorisasi);
    templates.openAuthorized.mockImplementation(() => Promise.resolve(streamFile()));
    identity.authenticate.mockResolvedValue({ user: pengguna });

    const config = new ConfigService({
      pembatasanLaju: { batasUnduhAnonim: 1, batasUnduhPengguna: 1 },
    }) as unknown as ConfigService<KonfigurasiApp, true>;
    const module = await Test.createTestingModule({
      controllers: [PublicDocumentFilesController, PublicLetterTemplatesController],
      providers: [
        { provide: DocumentFilesService, useValue: files },
        { provide: LetterTemplatesService, useValue: templates },
        { provide: IdentityService, useValue: identity },
        { provide: DownloadRateLimitService, useValue: new DownloadRateLimitService(config) },
      ],
    }).compile();
    app = module.createNestApplication({ logger: false });
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    await app.listen(0, '127.0.0.1');
    base = await app.getUrl();
  });

  afterEach(async () => {
    await app.close();
  });

  it('streams a public file within the limit and returns HTTP 429 after the limit', async () => {
    const openedFile = streamFile();
    const pipe = vi.spyOn(openedFile.stream, 'pipe');
    files.openAuthorized.mockResolvedValue(openedFile);
    const url = `${base}/api/v1/public/documents/public/files/file-1`;
    const first = await fetch(`${url}?mode=inline`);
    expect(first.status).toBe(200);
    expect(first.headers.get('content-disposition')).toContain('inline');
    expect(await first.text()).toBe('first-chunk-second-chunk');
    expect(pipe).toHaveBeenCalled();

    const second = await fetch(url);
    expect(second.status).toBe(429);
    expect(await second.text()).not.toContain('storage_key');
    expect(files.authorizeCurrent).toHaveBeenCalledTimes(2);
    expect(files.openAuthorized).toHaveBeenCalledTimes(1);
  });

  it('limits authenticated Internal/Secret streams per server-derived user identity', async () => {
    const url = `${base}/api/v1/public/documents/internal/files/file-2`;
    const headers = { cookie: 'jdih_session=' + token };
    expect((await fetch(url, { headers })).status).toBe(200);
    expect((await fetch(url, { headers })).status).toBe(429);
    expect(identity.authenticate).toHaveBeenCalledTimes(2);
    expect(files.openAuthorized).toHaveBeenCalledTimes(1);
  });

  it('keeps unauthorized Secret requests not-found and does not consume the allowed slot', async () => {
    files.authorizeCurrent.mockImplementation((slug) =>
      slug === 'secret'
        ? Promise.reject(new NotFoundException())
        : Promise.resolve({} as BerkasDownloadTerotorisasi),
    );

    expect(
      (await fetch(`${base}/api/v1/public/documents/secret/files/file-3`)).status,
    ).toBe(404);

    const allowed = await fetch(`${base}/api/v1/public/documents/public/files/file-4`);
    expect(allowed.status).toBe(200);
    expect(files.openAuthorized).toHaveBeenCalledOnce();

    const secretWhileLimited = await fetch(
      `${base}/api/v1/public/documents/secret/files/file-3`,
    );
    expect(secretWhileLimited.status).toBe(404);
    expect(
      (await fetch(`${base}/api/v1/public/documents/public/files/file-4`)).status,
    ).toBe(429);
    expect(files.openAuthorized).toHaveBeenCalledOnce();
  });

  it('shares anonymous quota with public letter-template downloads', async () => {
    expect(
      (await fetch(`${base}/api/v1/public/documents/public/files/file-5`)).status,
    ).toBe(200);
    expect(
      (await fetch(`${base}/api/v1/letter-templates/template/download`)).status,
    ).toBe(429);
    expect(templates.authorizeOpen).toHaveBeenCalledOnce();
    expect(templates.openAuthorized).not.toHaveBeenCalled();
  });
});
