import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { IdentityRepository, type Connection } from './identity.repository.js';

export type SecurityAction =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'LOGIN_UJI'
  | 'REGISTER'
  | 'LOGOUT'
  | 'REFRESH'
  | 'APPROVE'
  | 'REJECT'
  | 'DEACTIVATE'
  | 'REACTIVATE'
  | 'CREATE_UNIT'
  | 'SECRET_ACCESS'
  | 'DELETE_ACCOUNT';
export interface SecurityAudit {
  action: SecurityAction;
  actorId: string | null;
  targetId?: string;
  beforeStatus?: string;
  afterStatus?: string;
  reason?: string;
}
export interface DomainAudit {
  module: 'master' | 'documents' | 'workflow' | 'legal-relations' | 'secret-access' | 'letter-templates' | 'settings';
  action: string;
  entityType: string;
  entityId: string;
  actorId: string;
  before?: Readonly<Record<string, string | number | boolean | null>>;
  after?: Readonly<Record<string, string | number | boolean | null>>;
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

  async recordDomain(event: DomainAudit, db: Connection = this.repo.pool) {
    // Accept only explicit allowlisted scalar projections. Secrets, tokens and arbitrary request
    // bodies are never passed through to the audit log.
    const safe = (value: DomainAudit['before']) => {
      if (!value) return null;
      const allowed = [
        'status',
        'statusHukum',
        'slug',
        'kode',
        'nama',
        'nomorVersi',
        'judul',
        'tingkatAkses',
        'targetId',
        'reason',
      ];
      return JSON.stringify(
        Object.fromEntries(
          Object.entries(value)
            .filter(
              ([key, v]) =>
                allowed.includes(key) &&
                (v === null || ['string', 'number', 'boolean'].includes(typeof v)),
            )
            .map(([k, v]) => [k, typeof v === 'string' ? v.slice(0, 1000) : v]),
        ),
      );
    };
    await this.repo.insertAudit(db, [
      event.actorId,
      event.module,
      event.action.slice(0, 100),
      event.entityType.slice(0, 64),
      event.entityId,
      safe(event.before),
      safe(event.after),
      randomUUID(),
    ]);
  }
}
