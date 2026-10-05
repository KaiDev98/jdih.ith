import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import {
  skemaLengkapiRegistrasi,
  skemaSetujuiAkun,
  skemaTolakAkun,
  skemaUbahStatusAkun,
  skemaBuatUnit,
  type KodeIzin,
  type PenggunaAktif,
} from '@jdih/shared';
import {
  IdentityRepository,
  fromUtc,
  utc,
  type Connection,
  type SessionRow,
  type UserRow,
} from './identity.repository.js';
import { AuditService } from './audit.service.js';
import { acak, cekIzin, hashToken, tokenValid } from './security.js';
import type { GoogleIdentity } from './google.service.js';
import type { KonfigurasiApp } from '../../config/configuration.js';

export interface AuthSession {
  user: PenggunaAktif;
  session: SessionRow;
}
@Injectable()
export class IdentityService {
  constructor(
    private readonly repo: IdentityRepository,
    private readonly audit: AuditService,
    private readonly config: ConfigService<KonfigurasiApp, true>,
  ) {}
  private usable(user: UserRow | undefined): asserts user is UserRow {
    if (!user || user.deleted_at || !['AKTIF', 'MENUNGGU_VERIFIKASI'].includes(user.status))
      throw new UnauthorizedException('Akun tidak tersedia');
  }
  async authenticate(
    token: string,
    db: Connection = this.repo.pool,
    lock = false,
  ): Promise<AuthSession> {
    if (!tokenValid(token)) throw new UnauthorizedException();
    const session = await this.repo.session(db, hashToken(token), lock);
    if (!session || session.revoked_at || fromUtc(session.expires_at) <= new Date())
      throw new UnauthorizedException();
    const row = await this.repo.user(db, session.pengguna_id, lock);
    this.usable(row);
    const user = await this.repo.principal(db, row);
    await this.repo.touchSession(db, [utc(), session.id]);
    return { user, session };
  }
  private async issue(db: Connection, user: UserRow, ip: string, agent: string) {
    const token = acak(),
      cfg = this.config.get('identitas', { infer: true });
    const expires = new Date(Date.now() + cfg.sessionSeconds * 1000);
    await this.repo.insertSession(db, [
      user.id,
      hashToken(token),
      agent.slice(0, 1024),
      createHmac('sha256', cfg.key)
        .update('ip:' + ip)
        .digest(),
      utc(expires),
    ]);
    return { token, expires };
  }
  async login(identity: GoogleIdentity, ip: string, agent: string) {
    return this.repo.transaction(async (db) => {
      const users = await this.repo.byIdentity(db, identity.sub, identity.email);
      if (!users.length) return null;
      if (users.length !== 1) throw new ConflictException('Identitas tidak cocok');
      const row = users[0]!;
      this.usable(row);
      if (row.google_sub && row.google_sub !== identity.sub) throw new UnauthorizedException();
      if (!row.google_sub) {
        const principal = await this.repo.principal(db, row);
        if (
          row.email.toLowerCase() !== identity.email ||
          !principal.peran.some((r) => r === 'ADMIN' || r === 'SUPERADMIN')
        )
          throw new UnauthorizedException();
        await this.repo.bindGoogle(db, [identity.sub, row.id]);
      }
      const session = await this.issue(db, row, ip, agent);
      await this.audit.record({ action: 'LOGIN_SUCCESS', actorId: row.id }, db);
      return session;
    });
  }
  async register(identity: GoogleIdentity, input: unknown, ip: string, agent: string) {
    const body = skemaLengkapiRegistrasi.parse(input);
    return this.repo.transaction(async (db) => {
      if ((await this.repo.byIdentity(db, identity.sub, identity.email)).length)
        throw new ConflictException();
      if (body.unitKerjaId && !(await this.repo.unitValid(db, body.unitKerjaId)))
        throw new NotFoundException('Unit tidak tersedia');
      await this.repo.insertStaff(db, [
        identity.sub,
        identity.email,
        identity.nama,
        identity.avatar,
        body.unitKerjaId ?? null,
        body.unitManual ?? null,
        'MENUNGGU_VERIFIKASI',
      ]);
      const row = (await this.repo.byIdentity(db, identity.sub, identity.email))[0]!;
      const result = await this.repo.assignStaffRole(db, [row.id]);
      if (result.affectedRows !== 1) throw new Error('Missing staff role');
      const session = await this.issue(db, row, ip, agent);
      await this.audit.record({ action: 'REGISTER', actorId: row.id, afterStatus: row.status }, db);
      return {
        ...session,
        result: { id: String(row.id), status: row.status, peran: ['DOSEN_STAF'] },
      };
    });
  }
  async refresh(token: string) {
    return this.repo.transaction(async (db) => {
      const { user, session } = await this.authenticate(token, db, true);
      const replacement = acak();
      await this.repo.rotateSession(db, [hashToken(replacement), utc(), session.id]);
      await this.audit.record({ action: 'REFRESH', actorId: user.id }, db);
      return { token: replacement, expires: fromUtc(session.expires_at) };
    });
  }
  async logout(token: string) {
    return this.repo.transaction(async (db) => {
      const { user, session } = await this.authenticate(token, db, true);
      await this.repo.revokeSession(db, [utc(), session.id]);
      await this.audit.record({ action: 'LOGOUT', actorId: user.id }, db);
    });
  }
  async pending(halaman: number, perHalaman: number) {
    return this.repo.pendingList(this.repo.pool, [
      String(perHalaman),
      String((halaman - 1) * perHalaman),
    ]);
  }
  async pendingDetail(id: string) {
    const row = await this.repo.user(this.repo.pool, id);
    if (!row || row.deleted_at || row.status !== 'MENUNGGU_VERIFIKASI')
      throw new NotFoundException();
    return {
      id: String(row.id),
      nama: row.nama,
      email: row.email,
      unitManual: row.unit_manual,
      unitKerjaId: row.unit_kerja_id,
      status: row.status,
    };
  }
  async decision(
    token: string,
    target: string,
    kind: 'approve' | 'reject' | 'status',
    input: unknown,
  ) {
    const body =
      kind === 'approve'
        ? skemaSetujuiAkun.parse(input)
        : kind === 'reject'
          ? skemaTolakAkun.parse(input)
          : skemaUbahStatusAkun.parse(input);
    const permission: KodeIzin =
      kind === 'approve'
        ? 'users.approve'
        : kind === 'reject'
          ? 'users.reject'
          : 'users.set_status';
    return this.repo.transaction(async (db) => {
      const { user: actor } = await this.authenticate(token, db, true);
      cekIzin(actor, [permission]);
      if (!actor.peran.some((r) => r === 'ADMIN' || r === 'SUPERADMIN'))
        throw new ForbiddenException();
      const row = await this.repo.user(db, target, true);
      if (!row || row.deleted_at) throw new NotFoundException();
      const subject = await this.repo.principal(db, row);
      if (subject.peran.length !== 1 || subject.peran[0] !== 'DOSEN_STAF')
        throw new ForbiddenException('Akun operations tidak dikelola melalui endpoint staff');
      let next: string;
      if (kind === 'approve' && 'unitKerjaId' in body) {
        if (row.status !== 'MENUNGGU_VERIFIKASI') throw new ConflictException();
        if (!(await this.repo.unitValid(db, body.unitKerjaId)))
          throw new NotFoundException('Unit tidak tersedia');
        next = 'AKTIF';
        await this.repo.approveStaff(db, [body.unitKerjaId, actor.id, utc(), target]);
      } else if (kind === 'reject' && 'alasan' in body) {
        if (row.status !== 'MENUNGGU_VERIFIKASI') throw new ConflictException();
        next = 'DITOLAK';
        await this.repo.rejectStaff(db, [actor.id, utc(), body.alasan, target]);
      } else if ('status' in body) {
        if (!(
          (row.status === 'AKTIF' && body.status === 'NONAKTIF') ||
          (row.status === 'NONAKTIF' &&
            body.status === 'AKTIF' &&
            row.verified_at &&
            row.unit_kerja_id)
        ))
          throw new ConflictException();
        if (body.status === 'AKTIF' && !(await this.repo.unitValid(db, row.unit_kerja_id!)))
          throw new ConflictException();
        next = body.status;
        await this.repo.setStaffStatus(db, [next, target]);
      } else throw new ConflictException();
      if (next === 'DITOLAK' || next === 'NONAKTIF')
        await this.repo.revokeUserSessions(db, [utc(), target]);
      await this.audit.record(
        {
          action:
            kind === 'approve'
              ? 'APPROVE'
              : kind === 'reject'
                ? 'REJECT'
                : next === 'AKTIF'
                  ? 'REACTIVATE'
                  : 'DEACTIVATE',
          actorId: actor.id,
          targetId: target,
          beforeStatus: row.status,
          afterStatus: next,
          ...('alasan' in body ? { reason: body.alasan } : {}),
        },
        db,
      );
      return { id: target, status: next };
    });
  }
  async units() {
    return this.repo.unitList(this.repo.pool);
  }
  async createUnit(token: string, input: unknown) {
    const body = skemaBuatUnit.parse(input);
    return this.repo.transaction(async (db) => {
      const { user } = await this.authenticate(token, db, true);
      cekIzin(user, ['units.manage']);
      if (!user.peran.some((r) => r === 'ADMIN' || r === 'SUPERADMIN'))
        throw new ForbiddenException();
      await this.repo.insertUnit(db, [body.kode, body.nama]);
      const id = String((await this.repo.lastInsertedId(db))[0]!.id);
      await this.audit.record({ action: 'CREATE_UNIT', actorId: user.id, targetId: id }, db);
      return { id, ...body };
    });
  }
}
