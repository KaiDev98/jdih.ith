import { Module } from '@nestjs/common';
import { IdentityModule } from '../../identity/identity.module.js';
import { CoreBackendDataModule } from '../core-backend-data.module.js';
import { AdminKontakController, PublicKontakController } from './kontak.controller.js';
import { KontakService } from './kontak.service.js';

@Module({
  imports: [CoreBackendDataModule, IdentityModule],
  controllers: [PublicKontakController, AdminKontakController],
  providers: [KontakService],
})
export class KontakModule {}
