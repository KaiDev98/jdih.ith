import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { IdentityRepository } from './identity.repository.js';
import { IdentityService } from './identity.service.js';
import { AuditService } from './audit.service.js';
import { GoogleService } from './google.service.js';
import { IdentityGuard } from './identity.guard.js';
import { DocumentPolicyService } from './document-policy.service.js';
import {
  AccountsController,
  IdentityController,
  IdentityUnitsController,
} from './identity.controller.js';

@Module({
  controllers: [IdentityController, AccountsController, IdentityUnitsController],
  providers: [
    IdentityRepository,
    AuditService,
    GoogleService,
    IdentityService,
    DocumentPolicyService,
    { provide: APP_GUARD, useClass: IdentityGuard },
  ],
  exports: [IdentityService, DocumentPolicyService, AuditService],
})
export class IdentityModule {}
