import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  BadRequestException,
  Injectable,
  PayloadTooLargeException,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import multer, { diskStorage } from 'multer';
import { Observable } from 'rxjs';
import type { Request, Response } from 'express';
import type { Subscription } from 'rxjs';
import type { KonfigurasiApp } from '../../../config/configuration.js';

@Injectable()
export class UploadInterceptor implements NestInterceptor {
  constructor(private readonly config: ConfigService<KonfigurasiApp, true>) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const storage = this.config.get('penyimpanan', { infer: true });
    const incoming = resolve(storage.jalurLokal, '.staging', 'incoming');
    // The repo's minimal ambient Multer declarations stand in for the absent @types/multer package.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const upload = multer({
      storage: diskStorage({
        destination: (_request, _file, callback) => {
          try {
            mkdirSync(incoming, { recursive: true, mode: 0o700 });
            callback(null, incoming);
          } catch (error) {
            callback(error as Error, incoming);
          }
        },
        filename: (_request, _file, callback) => callback(null, `${randomUUID()}.upload`),
      }),
      limits: { fileSize: storage.ukuranMaksimumBita, files: 1, fields: 8, parts: 10 },
    }).single('file');

    return new Observable((subscriber) => {
      let downstream: Subscription | undefined;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      upload(req, res, (error: unknown) => {
        if (error) {
          subscriber.error(
            (error as { code?: string }).code === 'LIMIT_FILE_SIZE'
              ? new PayloadTooLargeException('Ukuran berkas melampaui batas konfigurasi')
              : new BadRequestException('Multipart upload tidak sah'),
          );
          return;
        }
        if (!req.file) {
          subscriber.error(new BadRequestException('Berkas wajib disertakan'));
          return;
        }
        downstream = next.handle().subscribe(subscriber);
      });
      return () => {
        downstream?.unsubscribe();
        if (req.file?.path) void rm(req.file.path, { force: true });
      };
    });
  }
}
