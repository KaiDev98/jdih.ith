import { Module } from '@nestjs/common';
import { IdentityModule } from '../../identity/identity.module.js';
import { CoreBackendDataModule } from '../core-backend-data.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { DokumenAdminController } from './dokumen-admin.controller.js';
import { DokumenAdminService } from './dokumen-admin.service.js';
import { RemovalRequestsController } from './removal-requests.controller.js';
import { RemovalRequestsService } from './removal-requests.service.js';
import { RemovalRequestsRepository } from './removal-requests.repository.js';
import { AuditController, DocumentsController, PublicDocumentController } from '../core-backend.controller.js';

@Module({
  imports: [CoreBackendDataModule, IdentityModule, StorageModule],
  controllers: [DocumentsController, PublicDocumentController, AuditController, DokumenAdminController, RemovalRequestsController],
  providers: [DokumenAdminService, RemovalRequestsService, RemovalRequestsRepository],
})
export class DocumentsModule {}
