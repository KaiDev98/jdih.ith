import { Module } from '@nestjs/common';
import { IdentityModule } from '../../identity/identity.module.js';
import { CoreBackendDataModule } from '../core-backend-data.module.js';
import { AdminDocumentFilesController, PublicDocumentFilesController } from './files.controller.js';

@Module({
  imports: [CoreBackendDataModule, IdentityModule],
  controllers: [AdminDocumentFilesController, PublicDocumentFilesController],
})
export class FilesModule {}
