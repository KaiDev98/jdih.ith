import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { IdentityRepository, type Connection } from './identity.repository.js';

export type SecurityAction =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'REGISTER'
  | 'LOGOUT'
  | 'REFRESH'
  | 'APPROVE'
  | 'REJECT'
  | 'DEACTIVATE'
  | 'REACTIVATE'
  | 'CREATE_UNIT'
  | 'SECRET_ACCESS';
export interface SecurityAudit {
  action: SecurityAction;
  actorId: string | null;
  targetId?: string;
  beforeStatus?: string;
  afterStatus?: string;
  reason?: string;
}
/** Allowlisted fields only. Never accept raw request, token, cookie, provider errors or arbitrary JSON. */
@Injectable()
export class AuditService {
  constructor(private readonly repo: IdentityRepository) {}
  async record(event: SecurityAudit, db: Connection = this.repo.pool) {
    await this.repo.insertAudit(db, [
      event.actorId,
      'identity',
      event.action,
      event.action === 'CREATE_UNIT'
        ? 'unit_kerja'
        : event.action === 'SECRET_ACCESS'
          ? 'dokumen'
          : 'pengguna',
      event.targetId ?? event.actorId,
      event.beforeStatus ? JSON.stringify({ status: event.beforeStatus }) : null,
      event.afterStatus
        ? JSON.stringify({
            status: event.afterStatus,
            ...(event.reason ? { alasan: event.reason.slice(0, 1000) } : {}),
          })
        : null,
      randomUUID(),
    ]);
  }
}
