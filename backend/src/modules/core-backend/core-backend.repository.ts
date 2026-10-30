import { Inject, Injectable } from '@nestjs/common';
import type { Pool, PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { KOLAM_KONEKSI } from '../../database/database.module.js';

@Injectable()
export class CoreBackendRepository {
  constructor(@Inject(KOLAM_KONEKSI) readonly pool: Pool) {}
  private notificationScope(actorId: string, superadmin: boolean) {
    return {
      where: `d.deleted_at IS NULL AND ${
        superadmin
          ? "w.action='SUBMIT' AND v.status_workflow='DIAJUKAN' AND w.id=(SELECT MAX(latest.id) FROM dokumen_workflow latest WHERE latest.dokumen_versi_id=v.id AND latest.action='SUBMIT')"
          : "w.action IN ('RETURN','APPROVE') AND v.created_by=? AND d.created_by=?"
      }`,
      values: superadmin ? [] : [actorId, actorId],
    };
  }
  async notificationList(actorId: string, superadmin: boolean) {
    const scope = this.notificationScope(actorId, superadmin);
    return this.rows(
      this.pool,
      `SELECT CAST(w.id AS CHAR) id,CAST(d.id AS CHAR) dokumenId,CAST(v.id AS CHAR) versionId,
        v.judul,w.action,w.catatan,w.created_at createdAt
       FROM dokumen_workflow w JOIN dokumen_versi v ON v.id=w.dokumen_versi_id
       JOIN dokumen d ON d.id=v.dokumen_id WHERE ${scope.where}
       AND NOT EXISTS (SELECT 1 FROM notifikasi_dihapus n WHERE n.pengguna_id=? AND n.workflow_id=w.id)
       ORDER BY w.id DESC LIMIT 30`,
      [...scope.values, actorId],
    );
  }
  async lockNotificationAccount(db: PoolConnection, actorId: string) {
    return this.rows(
      db,
      "SELECT id FROM pengguna WHERE id=? AND status='AKTIF' AND deleted_at IS NULL FOR UPDATE",
      [actorId],
    );
  }
  private notificationSelection(actorId: string, superadmin: boolean, id: string, all: boolean) {
    const scope = this.notificationScope(actorId, superadmin);
    return {
      from: `FROM dokumen_workflow w JOIN dokumen_versi v ON v.id=w.dokumen_versi_id
        JOIN dokumen d ON d.id=v.dokumen_id WHERE ${scope.where} AND w.id${all ? '<=' : '='}?`,
      values: [...scope.values, id],
    };
  }
  async notificationExists(db: PoolConnection, actorId: string, superadmin: boolean, id: string) {
    const selection = this.notificationSelection(actorId, superadmin, id, false);
    return (await this.rows(db, `SELECT w.id ${selection.from}`, selection.values)).length > 0;
  }
  async insertNotificationDismissals(
    db: PoolConnection,
    actorId: string,
    superadmin: boolean,
    id: string,
    all: boolean,
  ) {
    const selection = this.notificationSelection(actorId, superadmin, id, all);
    return this.write(
      db,
      `INSERT IGNORE INTO notifikasi_dihapus (pengguna_id,workflow_id) SELECT ?,w.id ${selection.from}`,
      [actorId, ...selection.values],
    );
  }
  async transaction<T>(fn: (db: PoolConnection) => Promise<T>): Promise<T> {
    const db = await this.pool.getConnection();
    try {
      await db.beginTransaction();
      const result = await fn(db);
      await db.commit();
      return result;
    } catch (e) {
      await db.rollback();
      throw e;
    } finally {
      db.release();
    }
  }
  async rows<T extends RowDataPacket>(
    db: Pool | PoolConnection,
    sql: string,
    values: unknown[] = [],
  ) {
    const [rows] = await db.execute<T[]>(sql, values as (string | number | Buffer | null)[]);
    return rows;
  }
  async write(db: Pool | PoolConnection, sql: string, values: unknown[] = []) {
    const [result] = await db.execute<ResultSetHeader>(
      sql,
      values as (string | number | Buffer | null)[],
    );
    return result;
  }
  async id(db: PoolConnection) {
    const r = await this.rows<RowDataPacket & { id: string }>(
      db,
      'SELECT CAST(LAST_INSERT_ID() AS CHAR) id',
    );
    return String(r[0]!.id);
  }
}
