import { Injectable } from '@nestjs/common';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import type { PermintaanPenghapusan, SumberPermintaanPenghapusan } from '@jdih/shared';
import { CoreBackendRepository } from '../core-backend.repository.js';

export type ResourcePenghapusan = RowDataPacket & {
  id: string;
  createdBy: string;
  currentId: string | null;
  versionId: string | null;
  judul: string;
};
export type BarisPermintaan = RowDataPacket & PermintaanPenghapusan & { requestedBy: string };
@Injectable()
export class RemovalRequestsRepository {
  constructor(private readonly repo: CoreBackendRepository) {}

  async resource(
    db: PoolConnection,
    sumber: SumberPermintaanPenghapusan,
    id: string,
  ): Promise<ResourcePenghapusan | undefined> {
    const sql =
      sumber === 'DOCUMENT'
        ? `SELECT CAST(d.id AS CHAR) id,CAST(d.created_by AS CHAR) createdBy,CAST(d.current_published_version_id AS CHAR) currentId,
          CAST(COALESCE(d.current_published_version_id,(SELECT MAX(v.id) FROM dokumen_versi v WHERE v.dokumen_id=d.id)) AS CHAR) versionId,
          COALESCE((SELECT v.judul FROM dokumen_versi v WHERE v.id=COALESCE(d.current_published_version_id,(SELECT MAX(x.id) FROM dokumen_versi x WHERE x.dokumen_id=d.id))),d.kode_dokumen) judul
         FROM dokumen d WHERE d.id=? AND d.deleted_at IS NULL FOR UPDATE`
        : `SELECT CAST(t.id AS CHAR) id,CAST(t.created_by AS CHAR) createdBy,CAST(t.current_version_id AS CHAR) currentId,
          CAST(COALESCE(t.current_version_id,(SELECT MAX(v.id) FROM template_surat_versi v WHERE v.template_surat_id=t.id)) AS CHAR) versionId,t.nama judul
         FROM template_surat t WHERE t.id=? AND t.deleted_at IS NULL FOR UPDATE`;
    return (await this.repo.rows<ResourcePenghapusan>(db, sql, [id]))[0];
  }
  private readonly projection = `SELECT CAST(r.id AS CHAR) id,r.sumber,CAST(r.resource_id AS CHAR) resourceId,
    CAST(r.version_id AS CHAR) versionId,r.judul,r.jenis,r.alasan,r.status,u.nama pemohon,r.catatan,r.created_at createdAt,
    CAST(r.requested_by AS CHAR) requestedBy FROM permintaan_penghapusan r JOIN pengguna u ON u.id=r.requested_by`;
  async get(id: string, db?: PoolConnection): Promise<BarisPermintaan | undefined> {
    return (
      await this.repo.rows<BarisPermintaan>(
        db ?? this.repo.pool,
        `${this.projection} WHERE r.id=?${db ? ' FOR UPDATE' : ''}`,
        [id],
      )
    )[0];
  }
  async pending(db: PoolConnection, sumber: SumberPermintaanPenghapusan, resourceId: string) {
    return (
      (
        await this.repo.rows(
          db,
          "SELECT id FROM permintaan_penghapusan WHERE sumber=? AND resource_id=? AND status='PENDING' FOR UPDATE",
          [sumber, resourceId],
        )
      ).length > 0
    );
  }
  async create(
    db: PoolConnection,
    actorId: string,
    sumber: SumberPermintaanPenghapusan,
    resource: ResourcePenghapusan,
    jenis: string,
    alasan: string,
  ) {
    await this.repo.write(
      db,
      'INSERT INTO permintaan_penghapusan(sumber,resource_id,version_id,judul,jenis,alasan,requested_by) VALUES(?,?,?,?,?,?,?)',
      [sumber, resource.id, resource.versionId, resource.judul, jenis, alasan, actorId],
    );
    return this.repo.id(db);
  }
  async decide(db: PoolConnection, id: string, actorId: string, status: string, catatan: string) {
    return this.repo.write(
      db,
      "UPDATE permintaan_penghapusan SET status=?,catatan=?,decided_by=?,decided_at=UTC_TIMESTAMP(6) WHERE id=? AND status='PENDING'",
      [status, catatan, actorId, id],
    );
  }
  async list(
    ownerId: string | null,
    filter: {
      sumber?: SumberPermintaanPenghapusan;
      resourceId?: string;
      requestId?: string;
      status: string;
      halaman: number;
      perHalaman: number;
    },
  ) {
    const where: string[] = [],
      values: (string | number)[] = [];
    if (ownerId) {
      where.push('r.requested_by=?');
      values.push(ownerId);
    }
    if (filter.sumber) {
      where.push('r.sumber=?');
      values.push(filter.sumber);
    }
    if (filter.resourceId) {
      where.push('r.resource_id=?');
      values.push(filter.resourceId);
    }
    if (filter.requestId) { where.push('r.id=?'); values.push(filter.requestId); }
    if (filter.status !== 'ALL') {
      where.push('r.status=?');
      values.push(filter.status);
    }
    const predicate = where.length ? ` WHERE ${where.join(' AND ')}` : '';
    const [count] = await this.repo.rows<RowDataPacket & { total: number }>(
      this.repo.pool,
      `SELECT COUNT(*) total FROM permintaan_penghapusan r${predicate}`,
      values,
    );
    const data = await this.repo.rows<BarisPermintaan>(
      this.repo.pool,
      `${this.projection}${predicate} ORDER BY r.id DESC LIMIT ? OFFSET ?`,
      [...values, filter.perHalaman, (filter.halaman - 1) * filter.perHalaman],
    );
    return {
      sukses: true as const,
      data: data.map(({ requestedBy: _owner, ...row }) => row),
      meta: {
        halaman: filter.halaman,
        perHalaman: filter.perHalaman,
        totalButir: Number(count?.total ?? 0),
        totalHalaman: Math.ceil(Number(count?.total ?? 0) / filter.perHalaman),
        adaSebelumnya: filter.halaman > 1,
        adaBerikutnya: filter.halaman * filter.perHalaman < Number(count?.total ?? 0),
      },
    };
  }
}
