import { Module } from '@nestjs/common';
import { IdentityModule } from '../../identity/identity.module.js';
import { CoreBackendDataModule } from '../core-backend-data.module.js';
import { DocumentsController, PublicDocumentController } from '../core-backend.controller.js';

@Module({
  imports: [CoreBackendDataModule, IdentityModule],
  controllers: [DocumentsController, PublicDocumentController],
})
export class DocumentsModule {}
