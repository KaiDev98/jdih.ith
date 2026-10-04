import { Module } from '@nestjs/common';
import { CoreBackendDataModule } from '../core-backend-data.module.js';
import { MasterController } from '../core-backend.controller.js';

@Module({ imports: [CoreBackendDataModule], controllers: [MasterController] })
export class MasterModule {}
