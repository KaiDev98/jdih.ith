import { Module } from '@nestjs/common';
import { CoreBackendDataModule } from '../core-backend-data.module.js';
import { DocumentOptionsController, MasterController, PublicMasterController } from '../core-backend.controller.js';

@Module({ imports: [CoreBackendDataModule], controllers: [MasterController, PublicMasterController, DocumentOptionsController] })
export class MasterModule {}
