import { Injectable } from '@nestjs/common';
import type { PenggunaAktif } from '@jdih/shared';
import { cekAksesDokumen, type ResourceDokumen } from './security.js';

@Injectable()
export class DocumentPolicyService {
  /** Caller supplies a repository-loaded current version. This is not an HTTP endpoint. */
  assertRead(resource: ResourceDokumen, user?: PenggunaAktif) {
    cekAksesDokumen(resource, user);
    // Future file/view service must recheck immediately before streaming.
  }
}
