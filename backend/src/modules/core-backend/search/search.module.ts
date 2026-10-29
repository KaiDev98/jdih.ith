import { Module } from '@nestjs/common';
import { IdentityModule } from '../../identity/identity.module.js';
import { CoreBackendDataModule } from '../core-backend-data.module.js';
import { SearchController } from './search.controller.js';
import { HomeController } from './home.controller.js';
import { HomeService } from './home.service.js';
import { HomeRepository } from './home.repository.js';

@Module({ imports: [CoreBackendDataModule, IdentityModule], controllers: [SearchController, HomeController], providers: [HomeService, HomeRepository] })
export class SearchModule {}
