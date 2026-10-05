import { Injectable } from '@nestjs/common';
import type { PenggunaAktif } from '@jdih/shared';
import { IdentityRepository, fromUtc } from './identity.repository.js';
import { cekAksesDokumen, type ResourceDokumen, type GrantDokumen } from './security.js';
import { AuditService } from './audit.service.js';

@Injectable()
export class DocumentPolicyService {
  constructor(
    private readonly repo: IdentityRepository,
    private readonly audit: AuditService,
  ) {}
  /** Caller supplies a repository-loaded current version. This is not an HTTP endpoint. */
  async assertRead(resource: ResourceDokumen, user?: PenggunaAktif) {
    let grant: GrantDokumen | undefined;
    if (user?.status === 'AKTIF' && resource.tingkatAkses === 'rahasia') {
      const row = (await this.repo.openGrant(this.repo.pool, [resource.id, user.id]))[0];
      if (row)
        grant = {
          dokumenId: resource.id,
          penggunaId: user.id,
          expiresAt: row.expires_at ? fromUtc(row.expires_at) : null,
          revokedAt: row.revoked_at ? fromUtc(row.revoked_at) : null,
        };
    }
    cekAksesDokumen(resource, user, grant);
    if (resource.tingkatAkses === 'rahasia' && user)
      await this.audit.record({ action: 'SECRET_ACCESS', actorId: user.id, targetId: resource.id });
    // Future file/view service must recheck immediately before streaming.
  }
}
