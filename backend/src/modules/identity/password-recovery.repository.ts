import { Injectable } from '@nestjs/common';
import type { RowDataPacket } from 'mysql2/promise';
import { IdentityRepository, utc, type Connection } from './identity.repository.js';

export interface ResetRow extends RowDataPacket {
  id: string;
  pengguna_id: string;
  email: string;
  token_hash: Buffer;
  password_fingerprint: Buffer;
  expires_at: string;
  used_at: string | null;
  invalidated_at: string | null;
  created_at: string;
}
export interface ResetMailRow extends ResetRow {
  mailId: string;
  jenis: 'RESET_LINK' | 'PASSWORD_CHANGED';
  token_cipher: Buffer | null;
  attempts: number;
}
@Injectable()
export class PasswordRecoveryRepository {
  constructor(private readonly repo: IdentityRepository) {}
  latest(db: Connection, userId: string) {
    return this.repo
      .rows<ResetRow>(
        db,
        'SELECT * FROM password_reset_tokens WHERE pengguna_id=? ORDER BY id DESC LIMIT 1',
        [userId],
      )
      .then((rows) => rows[0]);
  }
  byHash(db: Connection, hash: Buffer, lock = false) {
    return this.repo
      .rows<ResetRow>(
        db,
        'SELECT * FROM password_reset_tokens WHERE token_hash=? LIMIT 1' +
          (lock ? ' FOR UPDATE' : ''),
        [hash],
      )
      .then((rows) => rows[0]);
  }
  async invalidate(db: Connection, userId: string, except = '0') {
    await this.repo.write(
      db,
      'UPDATE password_reset_tokens SET invalidated_at=UTC_TIMESTAMP(6) WHERE pengguna_id=? AND id<>? AND used_at IS NULL AND invalidated_at IS NULL',
      [userId, except],
    );
    await this.repo.write(
      db,
      "UPDATE password_reset_emails e JOIN password_reset_tokens t ON t.id=e.token_id SET e.cancelled_at=UTC_TIMESTAMP(6),e.token_cipher=NULL WHERE t.pengguna_id=? AND t.invalidated_at IS NOT NULL AND e.jenis='RESET_LINK' AND e.sent_at IS NULL",
      [userId],
    );
  }
  async create(
    db: Connection,
    userId: string,
    email: string,
    hash: Buffer,
    fingerprint: Buffer,
    expires: Date,
    cipher: Buffer,
  ) {
    const result = await this.repo.write(
      db,
      'INSERT INTO password_reset_tokens(pengguna_id,email,token_hash,password_fingerprint,expires_at) VALUES(?,?,?,?,?)',
      [userId, email, hash, fingerprint, utc(expires)],
    );
    const id = String(result.insertId);
    await this.repo.write(
      db,
      "INSERT INTO password_reset_emails(token_id,jenis,token_cipher) VALUES(?,'RESET_LINK',?)",
      [id, cipher],
    );
    return id;
  }
  async consume(db: Connection, id: string) {
    const result = await this.repo.write(
      db,
      'UPDATE password_reset_tokens SET used_at=UTC_TIMESTAMP(6) WHERE id=? AND used_at IS NULL AND invalidated_at IS NULL AND expires_at>UTC_TIMESTAMP(6)',
      [id],
    );
    if (result.affectedRows !== 1) throw new Error('Reset token state changed');
    await this.repo.write(
      db,
      "INSERT INTO password_reset_emails(token_id,jenis) VALUES(?,'PASSWORD_CHANGED')",
      [id],
    );
  }
  claim() {
    return this.repo.transaction(async (db) => {
      const rows = await this.repo.rows<ResetMailRow>(
        db,
        `SELECT t.*,CAST(e.id AS CHAR) mailId,e.jenis,e.token_cipher,e.attempts
        FROM password_reset_emails e JOIN password_reset_tokens t ON t.id=e.token_id
        WHERE e.sent_at IS NULL AND e.cancelled_at IS NULL AND e.attempts<5
        AND e.next_attempt_at<=UTC_TIMESTAMP(6) AND (e.lease_until IS NULL OR e.lease_until<UTC_TIMESTAMP(6))
        ORDER BY e.id LIMIT 1 FOR UPDATE SKIP LOCKED`,
      );
      const row = rows[0];
      if (!row) return undefined;
      await this.repo.write(
        db,
        'UPDATE password_reset_emails SET attempts=attempts+1,lease_until=DATE_ADD(UTC_TIMESTAMP(6),INTERVAL 120 SECOND) WHERE id=?',
        [row.mailId],
      );
      return { ...row, attempts: Number(row.attempts) + 1 };
    });
  }
  async finish(id: string, sent: boolean) {
    await this.repo.write(
      this.repo.pool,
      `UPDATE password_reset_emails SET ${sent ? 'sent_at' : 'cancelled_at'}=UTC_TIMESTAMP(6),token_cipher=NULL,lease_until=NULL WHERE id=?`,
      [id],
    );
  }
  async retry(id: string, attempts: number) {
    if (attempts >= 5) return this.finish(id, false);
    await this.repo.write(
      this.repo.pool,
      'UPDATE password_reset_emails SET lease_until=NULL,next_attempt_at=? WHERE id=?',
      [utc(new Date(Date.now() + Math.min(30_000 * 2 ** (attempts - 1), 300_000))), id],
    );
  }
  cleanup() {
    return this.repo.write(
      this.repo.pool,
      'DELETE FROM password_reset_tokens WHERE expires_at<DATE_SUB(UTC_TIMESTAMP(6),INTERVAL 7 DAY)',
    );
  }
}
