import { Module } from '@nestjs/common';
import { CoreBackendDataModule } from '../core-backend-data.module.js';
import { WorkflowController } from '../core-backend.controller.js';

@Module({ imports: [CoreBackendDataModule], controllers: [WorkflowController] })
export class WorkflowModule {}
