import { Module } from '@nestjs/common';
import { IdentityModule } from '../../identity/identity.module.js';
import { CoreBackendDataModule } from '../core-backend-data.module.js';
import { SearchController } from './search.controller.js';

@Module({ imports: [CoreBackendDataModule, IdentityModule], controllers: [SearchController] })
export class SearchModule {}
