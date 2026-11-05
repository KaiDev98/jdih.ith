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
import { DokumenAdminService } from './documents/dokumen-admin.service.js';
import { RemovalRequestsRepository } from './documents/removal-requests.repository.js';
import { RemovalRequestsService } from './documents/removal-requests.service.js';
import { LetterTemplatesService } from './templates/letter-templates.service.js';

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
      izin: role === 'SUPERADMIN'
        ? ['documents.read_admin', 'documents.edit', 'documents.delete', 'workflow.withdraw', 'templates.manage', 'users.read']
        : ['documents.read_admin', 'documents.edit', 'templates.manage'],
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
  function newRepository() {
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
    return repo;
  }
  function newService() {
    return new CoreBackendService(newRepository(), audit, {} as never, {} as never, {} as never);
  }
  async function auditEvent(action: string, entityId: string, module: 'documents' | 'letter-templates' | 'workflow' = 'documents',
    entityType = 'dokumen', extra: { before?: Record<string, string>; after?: Record<string, string> } = {}) {
    await audit.recordDomain({ module, action, entityType, entityId, actorId: superadmin.id, ...extra }, db);
    const [rows] = await db.query<RowDataPacket[]>('SELECT CAST(LAST_INSERT_ID() AS CHAR) id');
    return String(rows[0]!.id);
  }
  async function template(author: PenggunaAktif) {
    const uid = randomUUID();
    const id = await insert('INSERT INTO template_surat(slug,nama,aktif,created_by) VALUES(?,?,0,?)', [uid, 'Format fixture', author.id]);
    const vid = await insert("INSERT INTO template_surat_versi(template_surat_id,nomor_versi,tingkat_akses,status,storage_key,nama_asli,mime_type,size_bytes,checksum,created_by) VALUES(?,1,'PUBLIK','PENDING_REVIEW',?,'fixture.pdf','application/pdf',12,UNHEX(REPEAT('00',32)),?)", [id, uid, author.id]);
    const eventId = await auditEvent('CREATE_VERSION', vid, 'letter-templates', 'template_surat_versi');
    return { id, vid, eventId };
  }
  async function published(author: PenggunaAktif) {
    const vid = await version(author);
    await db.execute("UPDATE dokumen_versi SET status_workflow='TERBIT',nomor='1',pic='Hukum',tanggal_penetapan='2026-11-05',verified_by=?,approved_at=UTC_TIMESTAMP(6),published_by=?,published_at=UTC_TIMESTAMP(6) WHERE id=?", [superadmin.id, superadmin.id, vid]);
    const [rows] = await db.query<RowDataPacket[]>('SELECT CAST(dokumen_id AS CHAR) id FROM dokumen_versi WHERE id=?', [vid]);
    const id = String(rows[0]!.id);
    await db.execute('UPDATE dokumen SET current_published_version_id=? WHERE id=?', [vid, id]);
    return { id, vid };
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
  it('menolak dokumen pengguna lain dan mengizinkan notifikasi SOP Permohonan SK milik sendiri', async () => {
    for (const id of [foreignEvent])
      await expect(service.dismissNotification(owner, id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    expect((await service.notifications(other)).some((r) => r.id === foreignEvent)).toBe(true);
    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT * FROM notifikasi_dihapus WHERE pengguna_id=?',
      [owner.id],
    );
    expect(rows).toHaveLength(0);
    expect((await service.notifications(owner)).some((r) => r.id === hiddenEvent)).toBe(true);
    await expect(service.dismissNotification(owner, hiddenEvent)).resolves.toEqual({ jumlahDihapus: 1 });
  });
  it('hapus semua melewati 30 baris, mempertahankan peristiwa setelah snapshot dan inbox akun lain', async () => {
    expect(await service.notifications(owner)).toHaveLength(30);
    const latest = await event(versionId);
    await expect(service.clearNotifications(owner, { sampaiId: hiddenEvent })).resolves.toEqual({
      jumlahDihapus: 36,
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
    expect(incoming.filter((r) => !r.jenis || r.jenis === 'DOCUMENT').every((r) => r.action === 'SUBMIT')).toBe(true);
    await service.dismissNotification(superadmin, first);
    await db.execute("UPDATE dokumen_versi SET status_workflow='REVISI' WHERE id=?", [versionId]);
    const returned = await insert(
      "INSERT INTO dokumen_workflow(dokumen_versi_id,status_asal,status_tujuan,action,catatan,actor_id) VALUES (?,'DIAJUKAN','REVISI','RETURN','Perbaiki tanda tangan',?)",
      [versionId, superadmin.id],
    );
    expect((await service.notifications(owner)).find((r) => r.id === returned)?.catatan).toBe(
      'Perbaiki tanda tangan',
    );
    expect((await service.notifications(superadmin)).some((r) => (!r.jenis || r.jenis === 'DOCUMENT') && r.versionId === versionId)).toBe(
      false,
    );
    const resubmitted = await insert(
      "INSERT INTO dokumen_workflow(dokumen_versi_id,status_asal,status_tujuan,action,catatan,actor_id) VALUES (?,'REVISI','DIAJUKAN','SUBMIT','Tanda tangan dilengkapi',?)",
      [versionId, owner.id],
    );
    await db.execute("UPDATE dokumen_versi SET status_workflow='DIAJUKAN' WHERE id=?", [versionId]);
    expect(
      (await service.notifications(superadmin))
        .filter((r) => (!r.jenis || r.jenis === 'DOCUMENT') && r.versionId === versionId)
        .map((r) => r.id),
    ).toEqual([resubmitted]);
    expect(
      (await service.notifications(otherSuperadmin))
        .filter((r) => (!r.jenis || r.jenis === 'DOCUMENT') && r.versionId === versionId)
        .map((r) => r.id),
    ).toEqual([resubmitted]);
    await db.execute(
      "UPDATE dokumen_versi SET status_workflow='DISETUJUI',verified_by=?,approved_at=UTC_TIMESTAMP(6) WHERE id=?",
      [superadmin.id, versionId],
    );
    const approved = await event(versionId);
    expect((await service.notifications(owner)).some((r) => r.id === approved)).toBe(true);
    expect((await service.notifications(superadmin)).some((r) => (!r.jenis || r.jenis === 'DOCUMENT') && r.versionId === versionId)).toBe(
      false,
    );
  });
  it('pending formats enter all authorized Superadmin inboxes; approval/publication reach only their owner', async () => {
    const t = await template(owner);
    expect((await service.notifications(superadmin)).find((r) => r.id === `e-${t.eventId}`)).toMatchObject({ jenis: 'TEMPLATE', action: 'TEMPLATE_SUBMIT', resourceId: t.id });
    expect((await service.notifications({ ...superadmin, izin: ['documents.read_admin'] })).some((r) => r.id === `e-${t.eventId}`)).toBe(false);
    await service.dismissNotification(superadmin, `e-${t.eventId}`);
    expect((await newService().notifications(superadmin)).some((r) => r.id === `e-${t.eventId}`)).toBe(false);
    expect((await service.notifications(otherSuperadmin)).some((r) => r.id === `e-${t.eventId}`)).toBe(true);
    await db.execute("UPDATE template_surat_versi SET status='APPROVED',verified_by=?,approved_at=UTC_TIMESTAMP(6) WHERE id=?", [superadmin.id, t.vid]);
    const approved = await auditEvent('APPROVE_VERSION', t.vid, 'letter-templates', 'template_surat_versi');
    expect((await service.notifications(otherSuperadmin)).some((r) => r.id === `e-${t.eventId}`)).toBe(false);
    expect((await service.notifications(owner)).find((r) => r.id === `e-${approved}`)?.action).toBe('TEMPLATE_APPROVE');
    expect((await service.notifications(other)).some((r) => r.id === `e-${approved}`)).toBe(false);
    await db.execute("UPDATE template_surat_versi SET status='ACTIVE',activated_at=UTC_TIMESTAMP(6) WHERE id=?", [t.vid]);
    await db.execute('UPDATE template_surat SET current_version_id=?,aktif=1 WHERE id=?', [t.vid, t.id]);
    const active = await auditEvent('PUBLISH_VERSION', t.vid, 'letter-templates', 'template_surat_versi');
    expect((await service.notifications(owner)).find((r) => r.id === `e-${active}`)?.action).toBe('TEMPLATE_PUBLISH');
    await expect(service.dismissNotification(other, `e-${active}`)).rejects.toBeInstanceOf(NotFoundException);
  });
  it('removal decisions survive physical deletion and do not duplicate the underlying action', async () => {
    const repo = newRepository();
    const documents = new DokumenAdminService(repo, audit, { delete: vi.fn() } as never);
    const requests = new RemovalRequestsService(repo, new RemovalRequestsRepository(repo), audit, documents, service, {} as never);
    const d = await published(owner);
    const first = await requests.create(owner, 'DOCUMENT', d.id, { jenis: 'REVOKE', alasan: 'Periksa dahulu' });
    expect((await service.notifications(superadmin)).find((r) => r.requestId === first.id)?.action).toBe('REMOVAL_REQUEST');
    await requests.decide(superadmin, first.id, { keputusan: 'DECLINE', catatan: 'Dokumen masih berlaku' });
    expect((await service.notifications(superadmin)).some((r) => r.requestId === first.id)).toBe(false);
    expect((await service.notifications(owner)).find((r) => r.requestId === first.id)).toMatchObject({ action: 'REMOVAL_DECLINE', catatan: 'Dokumen masih berlaku' });
    const removal = await requests.create(owner, 'DOCUMENT', d.id, { jenis: 'DELETE', alasan: 'Unggahan salah' });
    await requests.decide(superadmin, removal.id, { keputusan: 'APPROVE', catatan: 'Hapus sesuai permintaan' });
    const result = await service.notifications(owner);
    expect(result.filter((r) => r.requestId === removal.id)).toHaveLength(1);
    expect(result.find((r) => r.requestId === removal.id)).toMatchObject({ jenis: 'REMOVAL', action: 'REMOVAL_APPROVE', judul: 'Fixture notifikasi', catatan: 'Hapus sesuai permintaan' });
    expect(result.some((r) => r.resourceId === d.id && r.action === 'DOCUMENT_DELETE')).toBe(false);
    expect((await service.notifications(other)).some((r) => r.requestId === removal.id)).toBe(false);
    const [rows] = await db.query<RowDataPacket[]>('SELECT id FROM dokumen WHERE id=?', [d.id]);
    expect(rows).toHaveLength(0);
  });
  it('notifies pending revocation work and a decision without a note without duplicate action messages', async () => {
    const repo = newRepository();
    const documents = new DokumenAdminService(repo, audit, { delete: vi.fn() } as never);
    const requests = new RemovalRequestsService(repo, new RemovalRequestsRepository(repo), audit, documents, service, {} as never);
    const d = await published(owner);
    const request = await requests.create(owner, 'DOCUMENT', d.id, { jenis: 'REVOKE', alasan: 'Koreksi dari Admin' });
    expect((await service.notifications(superadmin)).find((r) => r.requestId === request.id)?.action).toBe('REMOVAL_REQUEST');
    await requests.decide(superadmin, request.id, { keputusan: 'APPROVE' });
    const result = await service.notifications(owner);
    expect(result.filter((r) => r.requestId === request.id)).toHaveLength(1);
    expect(result.find((r) => r.requestId === request.id)).toMatchObject({ action: 'REMOVAL_APPROVE', catatan: null });
    expect(result.some((r) => r.resourceId === d.id && r.action === 'REVOKE')).toBe(false);
    expect((await service.notifications(superadmin)).some((r) => r.requestId === request.id)).toBe(false);
  });
  it('template revocation notifies the owner, pending decisions notify Superadmin and approval is not duplicated', async () => {
    const repo = newRepository();
    const templates = new LetterTemplatesService(repo, {} as never, audit, {} as never);
    const documents = new DokumenAdminService(repo, audit, {} as never);
    const requests = new RemovalRequestsService(repo, new RemovalRequestsRepository(repo), audit, documents, service, templates);
    const t = await template(owner);
    await db.execute("UPDATE template_surat_versi SET status='ACTIVE',activated_at=UTC_TIMESTAMP(6) WHERE id=?", [t.vid]);
    await db.execute('UPDATE template_surat SET current_version_id=?,aktif=1 WHERE id=?', [t.vid, t.id]);
    const request = await requests.create(owner, 'TEMPLATE', t.id, { jenis: 'REVOKE', alasan: 'Format lama' });
    expect((await service.notifications(superadmin)).some((r) => r.requestId === request.id && r.action === 'REMOVAL_REQUEST')).toBe(true);
    await requests.decide(superadmin, request.id, { keputusan: 'APPROVE' });
    const notifications = await service.notifications(owner);
    expect(notifications.filter((r) => r.requestId === request.id)).toHaveLength(1);
    expect(notifications.some((r) => r.resourceId === t.id && r.action === 'TEMPLATE_REVOKE')).toBe(false);
    const direct = await template(owner);
    await db.execute("UPDATE template_surat_versi SET status='ACTIVE',activated_at=UTC_TIMESTAMP(6) WHERE id=?", [direct.vid]);
    await db.execute('UPDATE template_surat SET current_version_id=?,aktif=1 WHERE id=?', [direct.vid, direct.id]);
    await templates.revoke(superadmin, direct.id, { versionId: direct.vid, alasan: 'Keputusan format langsung' });
    expect((await service.notifications(owner)).find((r) => r.resourceId === direct.id && r.action === 'TEMPLATE_REVOKE')).toMatchObject({ catatan: 'Keputusan format langsung' });
    expect((await service.notifications(other)).some((r) => r.resourceId === direct.id)).toBe(false);
  });
  it('direct Superadmin withdrawal, document deletion and draft cancellation notify only the owner', async () => {
    const d = await published(owner);
    const publication = await auditEvent('PUBLISH', d.vid, 'workflow', 'dokumen_versi');
    expect((await service.notifications(owner)).find((r) => r.id === `e-${publication}`)?.action).toBe('PUBLISH');
    await service.withdraw(superadmin, d.id, { alasan: 'Koreksi isi' });
    expect((await service.notifications(owner)).find((r) => r.resourceId === d.id && r.action === 'WITHDRAW')?.catatan).toBe('Koreksi isi');
    const documents = new DokumenAdminService(newRepository(), audit, { delete: vi.fn() } as never);
    await documents.hapusPermanen(superadmin, d.id);
    expect((await service.notifications(owner)).find((r) => r.resourceId === d.id && r.action === 'DOCUMENT_DELETE')).toMatchObject({ dokumenId: null, versionId: null, judul: 'Fixture notifikasi' });
    const draftId = await version(owner);
    const [rows] = await db.query<RowDataPacket[]>('SELECT CAST(dokumen_id AS CHAR) id FROM dokumen_versi WHERE id=?', [draftId]);
    const parentId = String(rows[0]!.id);
    await documents.hapusDraf(superadmin, parentId, draftId);
    expect((await service.notifications(owner)).find((r) => r.resourceId === parentId && r.action === 'DOCUMENT_DRAFT_DELETE')).toBeTruthy();
    expect((await service.notifications(other)).some((r) => [d.id, parentId].includes(r.resourceId ?? ''))).toBe(false);
  });
  it('notifies only the owner after direct legal revocation with a working document link', async () => {
    const d = await published(owner);
    await service.revoke(superadmin, d.id, { versionId: d.vid, alasan: 'Keputusan pencabutan' });
    expect((await service.notifications(owner)).find((r) => r.resourceId === d.id && r.action === 'REVOKE')).toMatchObject({ dokumenId: d.id, versionId: d.vid, catatan: 'Keputusan pencabutan' });
    expect((await service.notifications(other)).some((r) => r.resourceId === d.id)).toBe(false);
    expect((await service.notifications(superadmin)).some((r) => r.resourceId === d.id)).toBe(false);
  });
  it('mixed notification dismissal uses separate snapshots and rolls back preference writes if audit fails', async () => {
    const before = await auditEvent('DELETE_PERMANENT', '900001', 'documents', 'dokumen', { before: { ownerId: owner.id, judul: 'Snapshot sebelum' } });
    const after = await auditEvent('DELETE_PERMANENT', '900002', 'documents', 'dokumen', { before: { ownerId: owner.id, judul: 'Snapshot sesudah' } });
    const latest = await event(versionId);
    await service.clearNotifications(owner, { sampaiId: hiddenEvent, sampaiEventId: before });
    const result = await newService().notifications(owner);
    expect(result.map((r) => r.id).sort()).toEqual([latest, `e-${after}`].sort());
    vi.spyOn(audit, 'recordDomain').mockRejectedValueOnce(new Error('Audit failure'));
    await expect(service.dismissNotification(owner, `e-${after}`)).rejects.toThrow('Audit failure');
    expect((await service.notifications(owner)).some((r) => r.id === `e-${after}`)).toBe(true);
    const [rows] = await db.query<RowDataPacket[]>('SELECT id FROM audit_log WHERE id IN (?,?)', [before, after]);
    expect(rows).toHaveLength(2);
  });
  it('dismissal compares numeric event IDs correctly across a decimal digit boundary', async () => {
    const [maxRows] = await db.query<RowDataPacket[]>('SELECT CAST(COALESCE(MAX(id),0) AS CHAR) id FROM audit_log');
    const boundary = 10n ** BigInt((BigInt(String(maxRows[0]!.id)) + 1000n).toString().length);
    const cutoff = (boundary - 1n).toString();
    // Explicit fixture ID creates a digit boundary without inserting thousands of rows.
    await db.execute("INSERT INTO audit_log(id,actor_id,module,action,entity_type,entity_id,before_json,request_id) VALUES(?,?,'documents','DELETE_PERMANENT','dokumen','900003',JSON_OBJECT('ownerId',?,'judul','Sebelum batas'),?)", [cutoff, superadmin.id, owner.id, randomUUID()]);
    const next = await auditEvent('DELETE_PERMANENT', '900004', 'documents', 'dokumen', { before: { ownerId: owner.id, judul: 'Setelah batas' } });
    expect(BigInt(next)).toBeGreaterThan(BigInt(cutoff));
    await service.clearNotifications(owner, { sampaiEventId: cutoff });
    const rows = await service.notifications(owner);
    expect(rows.some((row) => row.id === `e-${cutoff}`)).toBe(false);
    expect(rows.some((row) => row.id === `e-${next}`)).toBe(true);
  });
  it('server snapshots include both sources even when one source is absent from the latest 30 notifications', async () => {
    for (let i = 0; i < 35; i++) await auditEvent('DELETE_PERMANENT', String(910000 + i), 'documents', 'dokumen', { before: { ownerId: owner.id, judul: `Peristiwa ${i}` } });
    expect((await service.notifications(owner)).every((row) => row.id.startsWith('e-'))).toBe(true);
    const snapshot = await service.notificationSnapshot(owner);
    expect(snapshot.sampaiId).toBe(hiddenEvent);
    expect(snapshot.sampaiEventId).toBeTruthy();
    const latestWorkflow = await event(versionId);
    const latestEvent = await auditEvent('DELETE_PERMANENT', '920000', 'documents', 'dokumen', { before: { ownerId: owner.id, judul: 'Setelah dialog' } });
    await service.clearNotifications(owner, snapshot);
    expect((await newService().notifications(owner)).map((row) => row.id).sort()).toEqual([latestWorkflow, `e-${latestEvent}`].sort());
  });
  it('pending staff registrations notify eligible Superadmin accounts and disappear after verification', async () => {
    const id = await insert("INSERT INTO pengguna(email,nama,status) VALUES(?,'Dosen baru','MENUNGGU_VERIFIKASI')", [`registration-${randomUUID()}@contoh.id`]);
    await audit.record({ action: 'REGISTER', actorId: id, targetId: id, afterStatus: 'MENUNGGU_VERIFIKASI' }, db);
    expect((await service.notifications(superadmin)).some((r) => r.action === 'ACCOUNT_REGISTER' && r.resourceId === id)).toBe(true);
    expect((await service.notifications(owner)).some((r) => r.action === 'ACCOUNT_REGISTER')).toBe(false);
    await db.execute("UPDATE pengguna SET status='AKTIF',verified_by=?,verified_at=UTC_TIMESTAMP(6) WHERE id=?", [superadmin.id, id]);
    expect((await service.notifications(superadmin)).some((r) => r.action === 'ACCOUNT_REGISTER' && r.resourceId === id)).toBe(false);
  });
});
