import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import {
  skemaLengkapiRegistrasi,
  skemaSetujuiAkun,
  skemaTolakAkun,
  skemaUbahStatusAkun,
  skemaBuatUnit,
  skemaLoginPassword,
  skemaUbahPassword,
  skemaBuatAdmin,
  skemaAturUlangPassword,
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
import { cocokPassword, hashPassword, samarkanWaktu } from './password.js';
import type { KonfigurasiApp } from '../../config/configuration.js';

/** Percobaan login password yang gagal per email: dikunci setelah batasnya. */
const BATAS_GAGAL = 5;
const LAMA_KUNCI_MS = 15 * 60 * 1000;
const punyaPeranAdmin = (peran: readonly string[]) =>
  peran.some((r) => r === 'ADMIN' || r === 'SUPERADMIN');

/**
 * Setiap peran punya jalur masuk sendiri: Dosen/Staf lewat Google, Admin lewat
 * halaman masuk Admin, Superadmin lewat halaman masuk Superadmin. Jalur yang
 * bukan miliknya selalu ditolak.
 */
export type JalurPassword = 'admin' | 'superadmin';
const cocokJalur = (peran: readonly string[], jalur: JalurPassword) =>
  jalur === 'superadmin'
    ? peran.includes('SUPERADMIN')
    : peran.includes('ADMIN') && !peran.includes('SUPERADMIN');

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
  private readonly gagalLogin = new Map<string, { jumlah: number; mulai: number; sampai: number }>();

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
      // Google hanya untuk Dosen/Staf; Admin dan Superadmin memakai halaman masuknya sendiri.
      if (punyaPeranAdmin((await this.repo.principal(db, row)).peran))
        throw new UnauthorizedException();
      if (!row.google_sub) throw new UnauthorizedException();
      const session = await this.issue(db, row, ip, agent);
      await this.audit.record({ action: 'LOGIN_SUCCESS', actorId: row.id }, db);
      return session;
    });
  }
  /**
   * Login uji tanpa Google untuk pengembangan lokal. Pemanggil wajib memastikan
   * LOGIN_UJI aktif; konfigurasi sendiri menolak LOGIN_UJI di produksi.
   */
  async loginUji(peran: 'SUPERADMIN' | 'ADMIN', ip: string, agent: string) {
    return this.repo.transaction(async (db) => {
      const row = await this.repo.akunUji(db, peran);
      if (!row) throw new NotFoundException('Belum ada akun aktif dengan peran ini');
      const session = await this.issue(db, row, ip, agent);
      await this.audit.record({ action: 'LOGIN_UJI', actorId: row.id }, db);
      return session;
    });
  }
  /**
   * Login email + password, hanya untuk Admin/Superadmin AKTIF yang sudah
   * membuat password. Pesan galat selalu sama dan waktu jawab disamarkan agar
   * keberadaan akun tidak dapat ditebak; email dikunci sementara setelah
   * beberapa kali gagal.
   */
  async loginPassword(input: unknown, ip: string, agent: string, jalur: JalurPassword = 'admin') {
    const { email, password } = skemaLoginPassword.parse(input);
    const sekarang = Date.now();
    const catatan = this.gagalLogin.get(email);
    if (catatan && catatan.sampai > sekarang)
      throw new HttpException(
        'Terlalu banyak percobaan gagal. Coba lagi dalam 15 menit.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    const hasil = await this.repo.transaction(async (db) => {
      const row = await this.repo.byEmail(db, email);
      const cocok = row?.password_hash
        ? await cocokPassword(password, row.password_hash)
        : await samarkanWaktu(password);
      if (!row || !cocok || row.status !== 'AKTIF') return { gagal: row?.id ?? null, session: null };
      const principal = await this.repo.principal(db, row);
      if (!cocokJalur(principal.peran, jalur)) return { gagal: row.id, session: null };
      const session = await this.issue(db, row, ip, agent);
      await this.audit.record({ action: 'LOGIN_SUCCESS', actorId: row.id, reason: `password:${jalur}` }, db);
      return { gagal: null, session };
    });
    if (hasil.session) {
      this.gagalLogin.delete(email);
      return hasil.session;
    }
    // Jendela 15 menit sejak kegagalan pertama; 5 kali gagal di dalamnya mengunci email.
    const masihJendela = catatan !== undefined && sekarang - catatan.mulai < LAMA_KUNCI_MS;
    const jumlah = (masihJendela ? catatan.jumlah : 0) + 1;
    this.gagalLogin.set(email, {
      jumlah,
      mulai: masihJendela ? catatan.mulai : sekarang,
      sampai: jumlah >= BATAS_GAGAL ? sekarang + LAMA_KUNCI_MS : 0,
    });
    if (this.gagalLogin.size > 10_000) this.gagalLogin.clear();
    await this.audit.record({ action: 'LOGIN_FAILURE', actorId: hasil.gagal, reason: `password:${jalur}` });
    throw new UnauthorizedException('Email atau password salah');
  }

  async statusPassword(userId: string) {
    const row = await this.repo.user(this.repo.pool, userId);
    return {
      punyaPassword: Boolean(row?.password_hash),
      diubahPada: row?.password_diubah_at ?? null,
    };
  }

  /**
   * Buat atau ganti password akun sendiri (Admin/Superadmin). Bila akun sudah
   * punya password, password saat ini wajib benar. Setelah berhasil, sesi lain
   * dicabut sehingga perangkat lain harus login ulang.
   */
  async ubahPassword(token: string, input: unknown) {
    const body = skemaUbahPassword.parse(input);
    return this.repo.transaction(async (db) => {
      const { user, session } = await this.authenticate(token, db, true);
      if (!punyaPeranAdmin(user.peran))
        throw new ForbiddenException('Password hanya tersedia untuk akun Admin dan Superadmin');
      const row = await this.repo.user(db, user.id, true);
      if (row?.password_hash) {
        if (!body.passwordSaatIni || !(await cocokPassword(body.passwordSaatIni, row.password_hash)))
          throw new UnprocessableEntityException('Password saat ini salah');
      }
      const waktu = utc();
      await this.repo.setPassword(db, [await hashPassword(body.passwordBaru), waktu, user.id]);
      await this.repo.revokeOtherSessions(db, [waktu, user.id, session.id]);
      await this.audit.record(
        { action: 'PASSWORD_CHANGE', actorId: user.id, reason: row?.password_hash ? 'ganti' : 'buat' },
        db,
      );
      return { punyaPassword: true, diubahPada: waktu };
    });
  }

  /** Hanya pemegang peran SUPERADMIN (bukan sekadar izin) yang mengelola akun Admin. */
  private async superadmin(token: string, db: Connection) {
    const auth = await this.authenticate(token, db, true);
    if (auth.user.status !== 'AKTIF' || !auth.user.peran.includes('SUPERADMIN'))
      throw new ForbiddenException('Hanya Superadmin yang dapat mengelola akun Admin');
    return auth.user;
  }

  /**
   * Superadmin membuat akun Admin baru dengan password awal. Akun langsung
   * AKTIF dan dapat masuk dengan email + password; bila kelak masuk lewat
   * Google dengan email yang sama, akun Google-nya otomatis tertaut.
   */
  async buatAdmin(token: string, input: unknown) {
    const body = skemaBuatAdmin.parse(input);
    return this.repo.transaction(async (db) => {
      const actor = await this.superadmin(token, db);
      if (await this.repo.emailTerpakai(db, body.email))
        throw new ConflictException('Email sudah terdaftar');
      const waktu = utc();
      const hasil = await this.repo.insertAdmin(db, [
        body.email,
        body.nama,
        waktu,
        actor.id,
        await hashPassword(body.password),
        waktu,
      ]);
      const id = String(hasil.insertId);
      if ((await this.repo.assignAdminRole(db, [id])).affectedRows !== 1)
        throw new Error('Peran ADMIN tidak tersedia');
      await this.audit.record(
        { action: 'CREATE_ADMIN', actorId: actor.id, targetId: id, afterStatus: 'AKTIF' },
        db,
      );
      return { id, nama: body.nama, email: body.email };
    });
  }

  /**
   * Superadmin mengatur ulang password akun Admin (bukan Superadmin, bukan
   * akun sendiri). Semua sesi akun itu dicabut sehingga harus masuk ulang.
   */
  async aturUlangPassword(token: string, target: string, input: unknown) {
    const body = skemaAturUlangPassword.parse(input);
    return this.repo.transaction(async (db) => {
      const actor = await this.superadmin(token, db);
      if (actor.id === target)
        throw new ConflictException('Gunakan menu Ganti Password untuk akun Anda sendiri');
      const row = await this.repo.user(db, target, true);
      if (!row || row.deleted_at) throw new NotFoundException();
      const subjek = await this.repo.principal(db, row);
      if (!subjek.peran.includes('ADMIN') || subjek.peran.includes('SUPERADMIN'))
        throw new ForbiddenException('Hanya password akun Admin yang dapat diatur ulang');
      const waktu = utc();
      await this.repo.setPassword(db, [await hashPassword(body.passwordBaru), waktu, target]);
      await this.repo.revokeUserSessions(db, [waktu, target]);
      await this.audit.record({ action: 'RESET_PASSWORD', actorId: actor.id, targetId: target }, db);
      return { id: target, diatur: true };
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
  async accounts(halaman: number, perHalaman: number) {
    const rows = await this.repo.accountList(this.repo.pool, [
      String(perHalaman),
      String((halaman - 1) * perHalaman),
    ]);
    return rows.map((r) => ({
      id: r.id,
      nama: r.nama,
      email: r.email,
      status: r.status,
      unitKerja: r.unitKerja,
      peran: r.peran ? r.peran.split(',') : [],
      createdAt: r.createdAt,
    }));
  }

  /**
   * Admin atau Superadmin (izin users.delete) menghapus akun terdaftar: Dosen/Staf
   * maupun Admin. Akun sendiri dan akun Superadmin tidak dapat dihapus siapa pun.
   * Sesi akun itu langsung dicabut.
   */
  async deleteAccount(token: string, target: string) {
    return this.repo.transaction(async (db) => {
      const { user: actor } = await this.authenticate(token, db, true);
      cekIzin(actor, ['users.delete']);
      if (actor.id === target) throw new ConflictException('Akun sendiri tidak dapat dihapus');
      const row = await this.repo.user(db, target, true);
      if (!row || row.deleted_at) throw new NotFoundException();
      const subject = await this.repo.principal(db, row);
      if (subject.peran.includes('SUPERADMIN'))
        throw new ForbiddenException('Akun Superadmin tidak dapat dihapus');
      await this.repo.softDeleteUser(db, [utc(), target]);
      await this.repo.revokeUserSessions(db, [utc(), target]);
      await this.audit.record(
        {
          action: 'DELETE_ACCOUNT',
          actorId: actor.id,
          targetId: target,
          beforeStatus: row.status,
          afterStatus: 'DIHAPUS',
          reason: `Peran: ${subject.peran.join(', ') || '-'}`,
        },
        db,
      );
      return { id: target, dihapus: true };
    });
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
