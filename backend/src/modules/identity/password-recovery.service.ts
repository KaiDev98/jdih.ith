import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from 'node:crypto';
import { setTimeout as pause } from 'node:timers/promises';
import { skemaMintaPemulihanPassword, skemaKonfirmasiPemulihanPassword } from '@jdih/shared';
import type { KonfigurasiApp } from '../../config/configuration.js';
import {
  IdentityRepository,
  fromUtc,
  utc,
  type UserRow,
  type Connection,
} from './identity.repository.js';
import { IdentityService } from './identity.service.js';
import { AuditService } from './audit.service.js';
import { acak, hashToken } from './security.js';
import { hashPassword } from './password.js';
import { PasswordRecoveryRepository, type ResetRow } from './password-recovery.repository.js';
import { RecoveryMailService } from './recovery-mail.service.js';

const MESSAGE =
  'Jika email terdaftar sebagai akun Dosen/Staf dengan password, tautan pemulihan akan dikirim. Periksa kotak masuk dan folder spam.';
const INVALID = 'Tautan tidak valid atau sudah kedaluwarsa. Silakan minta tautan baru.';
const fingerprint = (passwordHash: string) => createHash('sha256').update(passwordHash).digest();
@Injectable()
export class PasswordRecoveryService {
  private readonly logger = new Logger(PasswordRecoveryService.name);
  private running = false;
  private queueError = false;
  private nextCleanup = 0;
  constructor(
    private readonly repo: IdentityRepository,
    private readonly resets: PasswordRecoveryRepository,
    private readonly audit: AuditService,
    private readonly identity: IdentityService,
    private readonly mail: RecoveryMailService,
    private readonly config: ConfigService<KonfigurasiApp, true>,
  ) {}
  private key() {
    return createHash('sha256')
      .update('JDIH-ITH:password-recovery:v1\0')
      .update(this.config.get('identitas.key', { infer: true }))
      .digest();
  }
  private seal(token: string) {
    const iv = randomBytes(12),
      cipher = createCipheriv('aes-256-gcm', this.key(), iv);
    const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
    return Buffer.concat([iv, encrypted, cipher.getAuthTag()]);
  }
  private open(value: Buffer) {
    const decipher = createDecipheriv('aes-256-gcm', this.key(), value.subarray(0, 12));
    decipher.setAuthTag(value.subarray(-16));
    return Buffer.concat([decipher.update(value.subarray(12, -16)), decipher.final()]).toString(
      'utf8',
    );
  }
  private async eligible(row: UserRow | undefined, db: Connection) {
    if (
      !row?.password_hash ||
      row.deleted_at ||
      !['AKTIF', 'MENUNGGU_VERIFIKASI'].includes(row.status)
    )
      return false;
    const actor = await this.repo.principal(db, row);
    return (
      actor.peran.includes('DOSEN_STAF') &&
      !actor.peran.some((role) => role === 'ADMIN' || role === 'SUPERADMIN')
    );
  }
  private valid(token: ResetRow | undefined, user: UserRow) {
    return Boolean(
      token &&
      user.password_hash &&
      !token.used_at &&
      !token.invalidated_at &&
      fromUtc(token.expires_at).getTime() > Date.now() &&
      token.email === user.email &&
      timingSafeEqual(token.password_fingerprint, fingerprint(user.password_hash)),
    );
  }
  async request(input: unknown) {
    const { email } = skemaMintaPemulihanPassword.parse(input);
    this.mail.assertAvailable();
    const started = Date.now();
    try {
      await this.repo.transaction(async (db) => {
        const row = await this.repo.byEmail(db, email);
        if (!row?.password_hash || !(await this.eligible(row, db))) return;
        const recent = await this.resets.latest(db, row.id);
        if (recent && Date.now() - fromUtc(recent.created_at).getTime() < 60_000) return;
        const token = acak();
        await this.resets.invalidate(db, row.id);
        await this.resets.create(
          db,
          row.id,
          row.email,
          hashToken(token),
          fingerprint(row.password_hash),
          new Date(Date.now() + 30 * 60_000),
          this.seal(token),
        );
        await this.audit.record(
          { action: 'PASSWORD_RESET_REQUEST', actorId: null, targetId: row.id },
          db,
        );
      });
    } finally {
      await pause(Math.max(0, 300 + randomInt(100) - (Date.now() - started)));
    }
    return { pesan: MESSAGE };
  }
  async confirm(input: unknown) {
    const body = skemaKonfirmasiPemulihanPassword.parse(input);
    const tokenHash = hashToken(body.token);
    const candidate = await this.resets.byHash(this.repo.pool, tokenHash);
    if (!candidate) throw new BadRequestException(INVALID);
    const passwordHash = await hashPassword(body.passwordBaru);
    const email = await this.repo.transaction(async (db) => {
      // Semua perubahan untuk pengguna dikunci sebelum token, sama seperti request.
      const user = await this.repo.user(db, candidate.pengguna_id, true);
      const token = await this.resets.byHash(db, tokenHash, true);
      if (!user || !(await this.eligible(user, db)) || !this.valid(token, user))
        throw new BadRequestException(INVALID);
      await this.resets.consume(db, candidate.id);
      await this.repo.setPassword(db, [passwordHash, utc(), user.id]);
      await this.repo.revokeUserSessions(db, [utc(), user.id]);
      await this.resets.invalidate(db, user.id, candidate.id);
      await this.audit.record(
        { action: 'STAFF_PASSWORD_RESET', actorId: null, targetId: user.id },
        db,
      );
      return user.email;
    });
    this.identity.clearPasswordFailures(email);
    return { diatur: true };
  }

  @Interval(5000)
  async processQueue() {
    if (this.running || !this.mail.available) return;
    this.running = true;
    try {
      if (Date.now() > this.nextCleanup) {
        await this.resets.cleanup();
        this.nextCleanup = Date.now() + 3_600_000;
      }
      for (let i = 0; i < 5; i++) {
        const job = await this.resets.claim();
        if (!job) break;
        try {
          let link: string | undefined;
          if (job.jenis === 'RESET_LINK') {
            const user = await this.repo.user(this.repo.pool, job.pengguna_id);
            if (
              !user ||
              !(await this.eligible(user, this.repo.pool)) ||
              !this.valid(job, user) ||
              !job.token_cipher
            ) {
              await this.resets.finish(job.mailId, false);
              continue;
            }
            const token = this.open(job.token_cipher);
            if (!timingSafeEqual(hashToken(token), job.token_hash)) {
              await this.resets.finish(job.mailId, false);
              continue;
            }
            const url = new URL(
              '/atur-ulang-password',
              this.config.get('identitas.origin', { infer: true }),
            );
            url.hash = new URLSearchParams({ token }).toString();
            link = url.href;
          }
          await this.mail.send(job.email, link);
          await this.resets.finish(job.mailId, true);
        } catch {
          await this.resets.retry(job.mailId, job.attempts);
          this.logger.warn(
            `Pengiriman email pemulihan tertunda; antrean ${job.mailId}, percobaan ${job.attempts}.`,
          );
        }
      }
      this.queueError = false;
    } catch {
      if (!this.queueError)
        this.logger.warn(
          'Antrean pemulihan password belum dapat diproses. Periksa database dan konfigurasi email.',
        );
      this.queueError = true;
    } finally {
      this.running = false;
    }
  }
}
