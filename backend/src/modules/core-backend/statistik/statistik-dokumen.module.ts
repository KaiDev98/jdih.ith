import { Module } from '@nestjs/common';
import { IdentityModule } from '../../identity/identity.module.js';
import { CoreBackendDataModule } from '../core-backend-data.module.js';
import { StatistikDokumenController } from './statistik-dokumen.controller.js';

@Module({
  imports: [CoreBackendDataModule, IdentityModule],
  controllers: [StatistikDokumenController],
})
export class StatistikDokumenModule {}
