import { Module } from '@nestjs/common';
import { DocumentsModule } from './documents/documents.module.js';
import { LegalRelationsModule } from './legal-relations/legal-relations.module.js';
import { MasterModule } from './master/master.module.js';
import { SecretAccessModule } from './secret-access/secret-access.module.js';
import { WorkflowModule } from './workflow/workflow.module.js';
import { FilesModule } from './files/files.module.js';
import { SearchModule } from './search/search.module.js';
import { LetterTemplatesModule } from './templates/letter-templates.module.js';
import { KontakModule } from './kontak/kontak.module.js';
import { KunjunganModule } from './kunjungan/kunjungan.module.js';

@Module({
  imports: [
    MasterModule,
    DocumentsModule,
    WorkflowModule,
    LegalRelationsModule,
    SecretAccessModule,
    FilesModule,
    SearchModule,
    LetterTemplatesModule,
    KontakModule,
    KunjunganModule,
  ],
})
export class CoreBackendModule {}
