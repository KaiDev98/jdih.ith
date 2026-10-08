import { Inject, Injectable } from '@nestjs/common';
import type { Pool, PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { KOLAM_KONEKSI } from '../../database/database.module.js';
import { izinEfektif } from './security.js';
import { skemaPenggunaSesi, skemaPeran, type PenggunaAktif } from '@jdih/shared';

export type Connection = Pool | PoolConnection;
export interface UserRow extends RowDataPacket {
  id: string;
  google_sub: string | null;
  email: string;
  nama: string;
  avatar_url: string | null;
  password_hash: string | null;
  password_diubah_at: string | null;
  unit_kerja_id: string | null;
  unit_manual: string | null;
  status: PenggunaAktif['status'];
  deleted_at: string | null;
  verified_at: string | null;
}
export interface SessionRow extends RowDataPacket {
  id: string;
  pengguna_id: string;
  expires_at: string;
  revoked_at: string | null;
}
export const utc = (date = new Date()) => date.toISOString().slice(0, 23).replace('T', ' ');
export const fromUtc = (value: string) => new Date(value.replace(' ', 'T') + 'Z');

/** Prepared SQL only; no controller SQL. V2 DDL remains authoritative. */
@Injectable()
export class IdentityRepository {
  constructor(@Inject(KOLAM_KONEKSI) readonly pool: Pool) {}
  async rows<T extends RowDataPacket>(
    db: Connection,
    sql: string,
    values: (string | number | Buffer | null)[] = [],
  ): Promise<T[]> {
    const [rows] = await db.execute<T[]>(sql, values);
    return rows;
  }
  async write(db: Connection, sql: string, values: (string | number | Buffer | null)[] = []) {
    const [result] = await db.execute<ResultSetHeader>(sql, values);
    return result;
  }
  async transaction<T>(fn: (db: PoolConnection) => Promise<T>): Promise<T> {
    const db = await this.pool.getConnection();
    try {
      await db.beginTransaction();
      const value = await fn(db);
      await db.commit();
      return value;
    } catch (error) {
      await db.rollback();
      throw error;
    } finally {
      db.release();
    }
  }
  async user(db: Connection, id: string, lock = false) {
    return (
      await this.rows<UserRow>(
        db,
        'SELECT * FROM pengguna WHERE id=?' + (lock ? ' FOR UPDATE' : ''),
        [id],
      )
    )[0];
  }
  async byIdentity(db: Connection, sub: string, email: string) {
    return this.rows<UserRow>(
      db,
      'SELECT * FROM pengguna WHERE google_sub=? OR email=? ORDER BY id FOR UPDATE',
      [sub, email],
    );
  }
  /** Akun yang belum dihapus berdasarkan email; untuk login password. */
  async byEmail(db: Connection, email: string) {
    return (
      await this.rows<UserRow>(
        db,
        'SELECT * FROM pengguna WHERE email=? AND deleted_at IS NULL LIMIT 1 FOR UPDATE',
        [email],
      )
    )[0];
  }
  setPassword(db: Connection, values: (string | number | Buffer | null)[]) {
    return this.write(
      db,
      'UPDATE pengguna SET password_hash=?,password_diubah_at=? WHERE id=?',
      values,
    );
  }
  /** Cabut semua sesi pengguna kecuali sesi yang sedang dipakai. */
  revokeOtherSessions(db: Connection, values: (string | number | Buffer | null)[]) {
    return this.write(
      db,
      'UPDATE sesi_pengguna SET revoked_at=? WHERE pengguna_id=? AND id<>? AND revoked_at IS NULL',
      values,
    );
  }
  /** Ada akun (termasuk yang sudah dihapus) dengan email ini? Email unik di tabel. */
  async emailTerpakai(db: Connection, email: string) {
    return (
      (await this.rows(db, 'SELECT id FROM pengguna WHERE email=? FOR UPDATE', [email])).length > 0
    );
  }
  /** Akun Admin baru buatan Superadmin: langsung AKTIF, tanpa Google, dengan password awal. */
  insertAdmin(db: Connection, values: (string | number | Buffer | null)[]) {
    return this.write(
      db,
      "INSERT INTO pengguna(email,nama,status,verified_at,verified_by,password_hash,password_diubah_at) VALUES(?,?,'AKTIF',?,?,?,?)",
      values,
    );
  }
  assignAdminRole(db: Connection, values: (string | number | Buffer | null)[]) {
    return this.write(
      db,
      "INSERT INTO pengguna_peran(pengguna_id,peran_id) SELECT ?,id FROM peran WHERE kode='ADMIN'",
      values,
    );
  }
  /** Akun AKTIF pertama dengan peran tertentu; hanya untuk login uji lokal. */
  async akunUji(db: Connection, peran: string) {
    return (
      await this.rows<UserRow>(
        db,
        "SELECT u.* FROM pengguna u JOIN pengguna_peran pp ON pp.pengguna_id=u.id JOIN peran p ON p.id=pp.peran_id WHERE p.kode=? AND u.status='AKTIF' AND u.deleted_at IS NULL ORDER BY u.id LIMIT 1 FOR UPDATE",
        [peran],
      )
    )[0];
  }
  async session(db: Connection, hash: Buffer, lock = false) {
    return (
      await this.rows<SessionRow>(
        db,
        'SELECT id,pengguna_id,expires_at,revoked_at FROM sesi_pengguna WHERE token_hash=?' +
          (lock ? ' FOR UPDATE' : ''),
        [hash],
      )
    )[0];
  }
  async principal(db: Connection, row: UserRow): Promise<PenggunaAktif> {
    const roles = await this.rows<RowDataPacket & { kode: string }>(
      db,
      'SELECT p.kode FROM peran p JOIN pengguna_peran pp ON pp.peran_id=p.id WHERE pp.pengguna_id=?',
      [row.id],
    );
    const permissions = await this.rows<RowDataPacket & { kode: string }>(
      db,
      'SELECT DISTINCT i.kode FROM izin i JOIN peran_izin pi ON pi.izin_id=i.id JOIN pengguna_peran pp ON pp.peran_id=pi.peran_id WHERE pp.pengguna_id=?',
      [row.id],
    );
    const overrides = await this.rows<RowDataPacket & { kode: string; efek: string }>(
      db,
      'SELECT i.kode,ui.efek FROM pengguna_izin ui JOIN izin i ON i.id=ui.izin_id WHERE ui.pengguna_id=?',
      [row.id],
    );
    return skemaPenggunaSesi.parse({
      id: String(row.id),
      nama: row.nama,
      surel: row.email,
      status: row.status,
      unitKerjaId: row.unit_kerja_id === null ? null : String(row.unit_kerja_id),
      unitManual: row.unit_manual,
      avatarUrl: row.avatar_url,
      peran: roles.map((r) => skemaPeran.parse(r.kode)),
      izin: izinEfektif(
        permissions.map((r) => r.kode),
        overrides,
      ),
    });
  }
  async unitValid(db: Connection, id: string) {
    return (
      (
        await this.rows(
          db,
          'SELECT id FROM unit_kerja WHERE id=? AND aktif=1 AND deleted_at IS NULL FOR SHARE',
          [id],
        )
      ).length === 1
    );
  }

  touchSession(db: Connection, values: (string | number | Buffer | null)[]) {
    return this.write(db, 'UPDATE sesi_pengguna SET last_used_at=? WHERE id=?', values);
  }

  insertSession(db: Connection, values: (string | number | Buffer | null)[]) {
    return this.write(
      db,
      'INSERT INTO sesi_pengguna(pengguna_id,token_hash,user_agent,ip_hash,expires_at) VALUES(?,?,?,?,?)',
      values,
    );
  }

  bindGoogle(db: Connection, values: (string | number | Buffer | null)[]) {
    return this.write(
      db,
      'UPDATE pengguna SET google_sub=? WHERE id=? AND google_sub IS NULL',
      values,
    );
  }

  insertStaff(db: Connection, values: (string | number | Buffer | null)[]) {
    return this.write(
      db,
      'INSERT INTO pengguna(google_sub,email,nama,avatar_url,unit_kerja_id,unit_manual,status) VALUES(?,?,?,?,?,?,?)',
      values,
    );
  }

  assignStaffRole(db: Connection, values: (string | number | Buffer | null)[]) {
    return this.write(
      db,
      "INSERT INTO pengguna_peran(pengguna_id,peran_id) SELECT ?,id FROM peran WHERE kode='DOSEN_STAF'",
      values,
    );
  }

  rotateSession(db: Connection, values: (string | number | Buffer | null)[]) {
    return this.write(
      db,
      'UPDATE sesi_pengguna SET token_hash=?,last_used_at=? WHERE id=?',
      values,
    );
  }

  revokeSession(db: Connection, values: (string | number | Buffer | null)[]) {
    return this.write(db, 'UPDATE sesi_pengguna SET revoked_at=? WHERE id=?', values);
  }

  approveStaff(db: Connection, values: (string | number | Buffer | null)[]) {
    return this.write(
      db,
      "UPDATE pengguna SET status='AKTIF',unit_kerja_id=?,verified_by=?,verified_at=?,rejection_reason=NULL WHERE id=?",
      values,
    );
  }

  rejectStaff(db: Connection, values: (string | number | Buffer | null)[]) {
    return this.write(
      db,
      "UPDATE pengguna SET status='DITOLAK',verified_by=?,verified_at=?,rejection_reason=? WHERE id=?",
      values,
    );
  }

  setStaffStatus(db: Connection, values: (string | number | Buffer | null)[]) {
    return this.write(db, 'UPDATE pengguna SET status=? WHERE id=?', values);
  }

  revokeUserSessions(db: Connection, values: (string | number | Buffer | null)[]) {
    return this.write(
      db,
      'UPDATE sesi_pengguna SET revoked_at=? WHERE pengguna_id=? AND revoked_at IS NULL',
      values,
    );
  }

  /** Semua akun yang belum dihapus beserta perannya, terbaru di atas. */
  accountList(db: Connection, values: string[]) {
    return this.rows<
      RowDataPacket & {
        id: string;
        nama: string;
        email: string;
        status: string;
        unitKerja: string | null;
        peran: string | null;
        createdAt: string;
      }
    >(
      db,
      `SELECT CAST(u.id AS CHAR) id,u.nama,u.email,u.status,k.nama unitKerja,
        GROUP_CONCAT(r.kode ORDER BY r.kode) peran,
        DATE_FORMAT(u.created_at,'%Y-%m-%dT%H:%i:%sZ') createdAt
       FROM pengguna u
       LEFT JOIN pengguna_peran pp ON pp.pengguna_id=u.id
       LEFT JOIN peran r ON r.id=pp.peran_id
       LEFT JOIN unit_kerja k ON k.id=u.unit_kerja_id
       WHERE u.deleted_at IS NULL
       GROUP BY u.id,u.nama,u.email,u.status,k.nama,u.created_at
       ORDER BY u.created_at DESC,u.id DESC
       LIMIT ? OFFSET ?`,
      values,
    );
  }

  /**
   * Hapus lunak: tandai terhapus, nonaktifkan, dan lepas email serta ikatan
   * Google agar orang yang sama dapat mendaftar ulang. Baris tetap ada karena
   * dirujuk dokumen, workflow, dan audit.
   */
  softDeleteUser(db: Connection, values: (string | number | Buffer | null)[]) {
    return this.write(
      db,
      `UPDATE pengguna SET deleted_at=?,status='NONAKTIF',google_sub=NULL,
        email=CONCAT('dihapus-',id,'@dihapus.invalid') WHERE id=? AND deleted_at IS NULL`,
      values,
    );
  }

  insertUnit(db: Connection, values: (string | number | Buffer | null)[]) {
    return this.write(db, 'INSERT INTO unit_kerja(kode,nama) VALUES(?,?)', values);
  }

  insertAudit(db: Connection, values: (string | number | Buffer | null)[]) {
    return this.write(
      db,
      'INSERT INTO audit_log(actor_id,module,action,entity_type,entity_id,before_json,after_json,request_id) VALUES(?,?,?,?,?,?,?,?)',
      values,
    );
  }

  pendingList(db: Connection, values: (string | number | Buffer | null)[] = []) {
    return this.rows<RowDataPacket>(
      db,
      "SELECT CAST(id AS CHAR) id,nama,email,unit_manual,CAST(unit_kerja_id AS CHAR) unitKerjaId,status FROM pengguna WHERE status='MENUNGGU_VERIFIKASI' AND deleted_at IS NULL ORDER BY id LIMIT ? OFFSET ?",
      values,
    );
  }

  unitList(db: Connection, values: (string | number | Buffer | null)[] = []) {
    return this.rows<RowDataPacket>(
      db,
      'SELECT CAST(id AS CHAR) id,kode,nama FROM unit_kerja WHERE aktif=1 AND deleted_at IS NULL ORDER BY nama LIMIT 1000',
      values,
    );
  }

  lastInsertedId(db: Connection, values: (string | number | Buffer | null)[] = []) {
    return this.rows<RowDataPacket & { id: string }>(
      db,
      'SELECT CAST(LAST_INSERT_ID() AS CHAR) id',
      values,
    );
  }
}
