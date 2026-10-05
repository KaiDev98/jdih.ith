import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module.js';
import { CoreBackendRepository } from './core-backend.repository.js';
import { CoreBackendService } from './core-backend.service.js';
import { StorageModule } from './storage/storage.module.js';
import { DocumentFilesService } from './files/document-files.service.js';
import { SearchService } from './search/search.service.js';
import { LetterTemplatesService } from './templates/letter-templates.service.js';
import { UploadInterceptor } from './storage/upload.interceptor.js';
import { DownloadRateLimitService } from './download-rate-limit.service.js';

@Module({
  imports: [IdentityModule, StorageModule],
  providers: [CoreBackendRepository, CoreBackendService, DocumentFilesService, SearchService, LetterTemplatesService, UploadInterceptor, DownloadRateLimitService],
  exports: [CoreBackendRepository, CoreBackendService, DocumentFilesService, SearchService, LetterTemplatesService, UploadInterceptor, DownloadRateLimitService],
})
export class CoreBackendDataModule {}
