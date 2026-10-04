import { Module } from '@nestjs/common';
import { CoreBackendDataModule } from '../core-backend-data.module.js';
import { LegalRelationsController } from '../core-backend.controller.js';

@Module({ imports: [CoreBackendDataModule], controllers: [LegalRelationsController] })
export class LegalRelationsModule {}
