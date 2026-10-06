import { Module } from '@nestjs/common';
import { CoreBackendDataModule } from '../core-backend-data.module.js';
import { KunjunganController } from './kunjungan.controller.js';
import { KunjunganService } from './kunjungan.service.js';

@Module({
  imports: [CoreBackendDataModule],
  controllers: [KunjunganController],
  providers: [KunjunganService],
})
export class KunjunganModule {}
