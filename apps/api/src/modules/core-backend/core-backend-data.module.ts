import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module.js';
import { CoreBackendRepository } from './core-backend.repository.js';
import { CoreBackendService } from './core-backend.service.js';

@Module({
  imports: [IdentityModule],
  providers: [CoreBackendRepository, CoreBackendService],
  exports: [CoreBackendRepository, CoreBackendService],
})
export class CoreBackendDataModule {}
