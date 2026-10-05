import { Module } from '@nestjs/common';
import { IdentityModule } from '../../identity/identity.module.js';
import { CoreBackendDataModule } from '../core-backend-data.module.js';
import { AdminLetterTemplatesController, PublicLetterTemplatesController } from './letter-templates.controller.js';

@Module({
  imports: [CoreBackendDataModule, IdentityModule],
  controllers: [AdminLetterTemplatesController, PublicLetterTemplatesController],
})
export class LetterTemplatesModule {}
