import { Controller, Get, Query, Req } from '@nestjs/common';
import { Publik, type PermintaanBerpengguna } from '../../../common/decorators/otorisasi.decorator.js';
import { IdentityService } from '../../identity/identity.service.js';
import { cookie, SESSION_COOKIE } from '../../identity/identity.guard.js';
import { SearchService } from './search.service.js';

@Controller('public')
export class SearchController {
  constructor(private readonly search: SearchService, private readonly identity: IdentityService) {}

  private async actor(req: PermintaanBerpengguna) {
    const token = cookie(req, SESSION_COOKIE);
    return token ? (await this.identity.authenticate(token)).user : undefined;
  }

  @Get('search/documents')
  @Publik()
  async searchDocuments(@Query() query: unknown, @Req() req: PermintaanBerpengguna) {
    return this.search.search(query, await this.actor(req));
  }

  @Get('documents')
  @Publik()
  async list(@Query() query: unknown) {
    return this.search.publicList(query);
  }

  @Get('documents/years')
  @Publik()
  years() {
    return this.search.publicYears();
  }

  @Get('documents/latest')
  @Publik()
  latest() {
    return this.search.latestPublic();
  }
}
