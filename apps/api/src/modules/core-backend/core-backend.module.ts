import { Module } from '@nestjs/common';
import { DocumentsModule } from './documents/documents.module.js';
import { LegalRelationsModule } from './legal-relations/legal-relations.module.js';
import { MasterModule } from './master/master.module.js';
import { SecretAccessModule } from './secret-access/secret-access.module.js';
import { WorkflowModule } from './workflow/workflow.module.js';

@Module({
  imports: [
    MasterModule,
    DocumentsModule,
    WorkflowModule,
    LegalRelationsModule,
    SecretAccessModule,
  ],
})
export class CoreBackendModule {}
