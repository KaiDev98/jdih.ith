import { Inject, Injectable } from '@nestjs/common';
import type { Pool, PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { KOLAM_KONEKSI } from '../../database/database.module.js';

@Injectable()
export class CoreBackendRepository {
  constructor(@Inject(KOLAM_KONEKSI) readonly pool: Pool) {}
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
