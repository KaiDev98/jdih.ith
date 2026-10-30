import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { IdentityRepository } from './identity.repository.js';
import { IdentityService } from './identity.service.js';
import { AuditService } from './audit.service.js';
import { GoogleService } from './google.service.js';
import { IdentityGuard } from './identity.guard.js';
import { DocumentPolicyService } from './document-policy.service.js';
import { PasswordRecoveryRepository } from './password-recovery.repository.js';
import { PasswordRecoveryService } from './password-recovery.service.js';
import { PasswordRecoveryController } from './password-recovery.controller.js';
import { RecoveryMailService } from './recovery-mail.service.js';
import {
  AccountsController,
  IdentityController,
  IdentityUnitsController,
} from './identity.controller.js';

@Module({
  controllers: [IdentityController, AccountsController, IdentityUnitsController, PasswordRecoveryController],
  providers: [
    IdentityRepository,
    AuditService,
    GoogleService,
    IdentityService,
    DocumentPolicyService,
    PasswordRecoveryRepository,
    PasswordRecoveryService,
    RecoveryMailService,
    { provide: APP_GUARD, useClass: IdentityGuard },
  ],
  exports: [IdentityService, DocumentPolicyService, AuditService],
})
export class IdentityModule {}
