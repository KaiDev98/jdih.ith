import 'reflect-metadata';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { randomUUID } from 'node:crypto';
import mysql from 'mysql2/promise';
import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type { PenggunaAktif } from '@jdih/shared';
import { NotFoundException } from '@nestjs/common';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { IdentityRepository } from '../identity/identity.repository.js';
import { AuditService } from '../identity/audit.service.js';
import { CoreBackendRepository } from './core-backend.repository.js';
import { CoreBackendService } from './core-backend.service.js';

/** Opt-in local MySQL checks. All fixtures, dismissals and audit rows are rolled back. */
describe.skipIf(!process.env.NOTIFICATIONS_MYSQL_ENV)('notifikasi MySQL dengan rollback', () => {
  let pool: Pool;
  let db: PoolConnection;
  let service: CoreBackendService;
  let audit: AuditService;
  let owner: PenggunaAktif;
  let other: PenggunaAktif;
  let superadmin: PenggunaAktif;
  let otherSuperadmin: PenggunaAktif;
  let versionId: string;
  let events: string[];
  let hiddenEvent: string;
  let foreignEvent: string;
  beforeAll(() => {
    const env = parseEnv(readFileSync(process.env.NOTIFICATIONS_MYSQL_ENV!, 'utf8'));
    if (
      !['127.0.0.1', 'localhost', '::1'].includes(env.DB_HOST ?? '') ||
      !['jdih_ith_v2_dev', 'jdih_ith_v2_test'].includes(env.DB_NAME ?? '')
    )
      throw new Error('Non-local test target refused');
    pool = mysql.createPool({
      host: env.DB_HOST,
      port: Number(env.DB_PORT),
      database: env.DB_NAME,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      dateStrings: true,
      supportBigNumbers: true,
      bigNumberStrings: true,
      timezone: 'Z',
      connectionLimit: 2,
    });
  });
  afterAll(async () => {
    await pool.end();
  });
  async function insert(sql: string, values: (string | null)[] = []) {
    const [result] = await db.execute<ResultSetHeader>(sql, values);
    return String(result.insertId);
  }
  async function actor(role: 'ADMIN' | 'SUPERADMIN'): Promise<PenggunaAktif> {
    const id = await insert("INSERT INTO pengguna(email,nama,status) VALUES (?,?,'AKTIF')", [
      `notif-${randomUUID()}@ith.ac.id`,
      'Fixture notifikasi',
    ]);
    return {
      id,
      nama: 'Fixture',
      surel: 'fixture@ith.ac.id',
      status: 'AKTIF',
      peran: [role],
      izin: ['documents.read_admin'],
      avatarUrl: null,
      unitKerjaId: null,
      unitManual: null,
    };
  }
  async function version(author: PenggunaAktif, hidden = false) {
    const [types] = await db.query<RowDataPacket[]>(
      "SELECT CAST(id AS CHAR) id FROM jenis_dokumen WHERE kode='SOP' LIMIT 1",
    );
    const uid = randomUUID();
    const documentId = await insert(
      'INSERT INTO dokumen(kode_dokumen,slug,jenis_dokumen_id,created_by,peruntukan) VALUES (?,?,?,?,?)',
      [uid, uid, String(types[0]!.id), author.id, hidden ? 'PERMOHONAN_SK' : null],
    );
    return insert(
      "INSERT INTO dokumen_versi(dokumen_id,nomor_versi,tingkat_akses,judul,created_by) VALUES (?,1,'publik','Fixture notifikasi',?)",
      [documentId, author.id],
    );
  }
  async function event(version: string, submit = false) {
    return insert(
      'INSERT INTO dokumen_workflow(dokumen_versi_id,status_asal,status_tujuan,action,catatan,actor_id) VALUES (?,?,?,?,?,?)',
      [
        version,
        submit ? 'DRAF' : 'DIAJUKAN',
        submit ? 'DIAJUKAN' : 'DISETUJUI',
        submit ? 'SUBMIT' : 'APPROVE',
        'Fixture alasan',
        superadmin.id,
      ],
    );
  }
  function newService() {
    const repo = new CoreBackendRepository(db as unknown as Pool);
    vi.spyOn(repo, 'transaction').mockImplementation(async (fn) => {
      await db.query('SAVEPOINT notification_action');
      try {
        return await fn(db);
      } catch (e) {
        await db.query('ROLLBACK TO SAVEPOINT notification_action');
        throw e;
      }
    });
    return new CoreBackendService(repo, audit, {} as never, {} as never, {} as never);
  }
  beforeEach(async () => {
    db = await pool.getConnection();
    await db.beginTransaction();
    owner = await actor('ADMIN');
    other = await actor('ADMIN');
    superadmin = await actor('SUPERADMIN');
    otherSuperadmin = await actor('SUPERADMIN');
    audit = new AuditService(new IdentityRepository(db as unknown as Pool));
    service = newService();
    versionId = await version(owner);
    events = [];
    for (let i = 0; i < 35; i++) events.push(await event(versionId));
    hiddenEvent = await event(await version(owner, true));
    foreignEvent = await event(await version(other));
  });
  afterEach(async () => {
    await db.rollback();
    db.release();
    vi.restoreAllMocks();
  });

  it('hapus satu persisten pada pembacaan service baru, idempoten dan menjaga riwayat/alasan', async () => {
    const id = events.at(-1)!;
    expect((await service.notifications(owner)).some((r) => r.id === id)).toBe(true);
    await expect(service.dismissNotification(owner, id)).resolves.toEqual({ jumlahDihapus: 1 });
    expect((await newService().notifications(owner)).some((r) => r.id === id)).toBe(false);
    await expect(service.dismissNotification(owner, id)).resolves.toEqual({ jumlahDihapus: 0 });
    const [workflow] = await db.query<RowDataPacket[]>(
      'SELECT catatan FROM dokumen_workflow WHERE id=?',
      [id],
    );
    expect(workflow[0]?.catatan).toBe('Fixture alasan');
    const [logs] = await db.query<RowDataPacket[]>(
      "SELECT after_json FROM audit_log WHERE actor_id=? AND action='DISMISS_NOTIFICATION'",
      [owner.id],
    );
    expect(logs).toHaveLength(1);
    expect(logs[0]?.after_json).toEqual({ jumlahDihapus: 1 });
  });
  it('menolak dokumen pengguna lain/SOP khusus, tanpa menghapus notifikasi pemilik sebenarnya', async () => {
    for (const id of [hiddenEvent, foreignEvent])
      await expect(service.dismissNotification(owner, id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    expect((await service.notifications(other)).some((r) => r.id === foreignEvent)).toBe(true);
    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT * FROM notifikasi_dihapus WHERE pengguna_id=?',
      [owner.id],
    );
    expect(rows).toHaveLength(0);
  });
  it('hapus semua melewati 30 baris, mempertahankan peristiwa setelah snapshot dan inbox akun lain', async () => {
    expect(await service.notifications(owner)).toHaveLength(30);
    const latest = await event(versionId);
    await expect(service.clearNotifications(owner, { sampaiId: events.at(-1)! })).resolves.toEqual({
      jumlahDihapus: 35,
    });
    expect((await newService().notifications(owner)).map((r) => r.id)).toEqual([latest]);
    expect((await service.notifications(other)).some((r) => r.id === foreignEvent)).toBe(true);
    const submit = await event(versionId, true);
    await db.execute("UPDATE dokumen_versi SET status_workflow='DIAJUKAN' WHERE id=?", [versionId]);
    await service.dismissNotification(superadmin, submit);
    expect((await service.notifications(superadmin)).some((r) => r.id === submit)).toBe(false);
    expect((await service.notifications(otherSuperadmin)).some((r) => r.id === submit)).toBe(true);
  });
  it('audit gagal mengembalikan penghapusan dalam transaksi', async () => {
    const id = events.at(-1)!;
    vi.spyOn(audit, 'recordDomain').mockRejectedValueOnce(new Error('Audit failed'));
    await expect(service.dismissNotification(owner, id)).rejects.toThrow('Audit failed');
    expect((await service.notifications(owner)).some((r) => r.id === id)).toBe(true);
  });
  it('pengembalian memberi alasan ke Admin dan pengajuan ulang muncul sebagai pengajuan baru untuk Superadmin', async () => {
    const first = await event(versionId, true);
    await db.execute("UPDATE dokumen_versi SET status_workflow='DIAJUKAN' WHERE id=?", [versionId]);
    const incoming = await service.notifications(superadmin);
    expect(incoming.some((r) => r.id === first)).toBe(true);
    expect(incoming.every((r) => r.action === 'SUBMIT')).toBe(true);
    await service.dismissNotification(superadmin, first);
    await db.execute("UPDATE dokumen_versi SET status_workflow='REVISI' WHERE id=?", [versionId]);
    const returned = await insert(
      "INSERT INTO dokumen_workflow(dokumen_versi_id,status_asal,status_tujuan,action,catatan,actor_id) VALUES (?,'DIAJUKAN','REVISI','RETURN','Perbaiki tanda tangan',?)",
      [versionId, superadmin.id],
    );
    expect((await service.notifications(owner)).find((r) => r.id === returned)?.catatan).toBe(
      'Perbaiki tanda tangan',
    );
    expect((await service.notifications(superadmin)).some((r) => r.versionId === versionId)).toBe(
      false,
    );
    const resubmitted = await insert(
      "INSERT INTO dokumen_workflow(dokumen_versi_id,status_asal,status_tujuan,action,catatan,actor_id) VALUES (?,'REVISI','DIAJUKAN','SUBMIT','Tanda tangan dilengkapi',?)",
      [versionId, owner.id],
    );
    await db.execute("UPDATE dokumen_versi SET status_workflow='DIAJUKAN' WHERE id=?", [versionId]);
    expect(
      (await service.notifications(superadmin))
        .filter((r) => r.versionId === versionId)
        .map((r) => r.id),
    ).toEqual([resubmitted]);
    expect(
      (await service.notifications(otherSuperadmin))
        .filter((r) => r.versionId === versionId)
        .map((r) => r.id),
    ).toEqual([resubmitted]);
    await db.execute(
      "UPDATE dokumen_versi SET status_workflow='DISETUJUI',verified_by=?,approved_at=UTC_TIMESTAMP(6) WHERE id=?",
      [superadmin.id, versionId],
    );
    const approved = await event(versionId);
    expect((await service.notifications(owner)).some((r) => r.id === approved)).toBe(true);
    expect((await service.notifications(superadmin)).some((r) => r.versionId === versionId)).toBe(
      false,
    );
  });
});
