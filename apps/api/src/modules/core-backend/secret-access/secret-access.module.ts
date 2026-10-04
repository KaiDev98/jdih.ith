import { Module } from '@nestjs/common';
import { CoreBackendDataModule } from '../core-backend-data.module.js';
import { SecretAccessController } from '../core-backend.controller.js';

@Module({ imports: [CoreBackendDataModule], controllers: [SecretAccessController] })
export class SecretAccessModule {}
