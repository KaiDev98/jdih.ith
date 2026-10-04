/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unnecessary-condition */
import 'reflect-metadata';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';
import { randomUUID } from 'node:crypto';
import mysql from 'mysql2';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import { ConfigService } from '@nestjs/config';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { IdentityRepository } from '../identity/identity.repository.js';
import { AuditService } from '../identity/audit.service.js';
import { DocumentPolicyService } from '../identity/document-policy.service.js';
import { CoreBackendRepository } from './core-backend.repository.js';
import { CoreBackendService } from './core-backend.service.js';

const enabled = Boolean(process.env.IDENTITY_TEST_ENV);
describe.skipIf(!enabled)('MySQL 8.4 Core Backend integration', () => {
  let pool: Pool;
  let identities: IdentityRepository;
  let audit: AuditService;
  let service: CoreBackendService;
  let actor: any;
  let second: any;
  let policy: DocumentPolicyService;
  const uid = () => randomUUID().replaceAll('-', '');
  beforeAll(async () => {
    const env = parseEnv(readFileSync(resolve(process.env.IDENTITY_TEST_ENV!), 'utf8'));
    if (
      env.DB_NAME !== 'jdih_ith_v2_test' ||
      !['127.0.0.1', 'localhost', '::1'].includes(env.DB_HOST ?? '')
    )
      throw new Error('Unsafe Core Backend test target');
    const raw = mysql.createPool({
      host: env.DB_HOST,
      port: Number(env.DB_PORT),
      database: env.DB_NAME,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      timezone: 'Z',
      supportBigNumbers: true,
      bigNumberStrings: true,
      dateStrings: ['DATE', 'DATETIME'],
      connectionLimit: 6,
    });
    raw.on('connection', (connection) => {
      connection.query("SET time_zone = '+00:00'");
    });
    pool = raw.promise();
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT VERSION() version,DATABASE() db,@@port port',
    );
    if (!String(rows[0]?.version).startsWith('8.4.') || rows[0]?.db !== 'jdih_ith_v2_test')
      throw new Error('Unsafe MySQL target');
    identities = new IdentityRepository(pool);
    audit = new AuditService(identities);
    policy = new DocumentPolicyService(identities, audit);
    service = new CoreBackendService(
      new CoreBackendRepository(pool),
      audit,
      new ConfigService({ identitas: { key: 'integration-test-key' } }) as any,
      policy,
    );
    actor = await addAdmin();
    second = await addAdmin();
  }, 15000);
  afterAll(async () => {
    await pool?.end();
  });
  async function addAdmin() {
    const suffix = uid();
    const [unit] = await pool.execute('INSERT INTO unit_kerja(kode,nama) VALUES(?,?)', [
      suffix,
      `Unit ${suffix}`,
    ]);
    const unitId = String((unit as any).insertId);
    const [user] = await pool.execute(
      "INSERT INTO pengguna(google_sub,email,nama,status,unit_kerja_id,verified_at) VALUES(?,?,?,'AKTIF',?,UTC_TIMESTAMP(6))",
      [`sub-${suffix}`, `${suffix}@ith.ac.id`, `Admin ${suffix}`, unitId],
    );
    const id = String((user as any).insertId);
    await pool.execute(
      "INSERT INTO pengguna_peran(pengguna_id,peran_id) SELECT ?,id FROM peran WHERE kode='SUPERADMIN'",
      [id],
    );
    const row = await identities.user(pool, id);
    return identities.principal(pool, row!);
  }
  async function addStaff() {
    const suffix = uid();
    const [unit] = await pool.execute('INSERT INTO unit_kerja(kode,nama) VALUES(?,?)', [
      suffix,
      `Unit ${suffix}`,
    ]);
    const [user] = await pool.execute(
      "INSERT INTO pengguna(google_sub,email,nama,status,unit_kerja_id,verified_at) VALUES(?,?,?,'AKTIF',?,UTC_TIMESTAMP(6))",
      [`sub-${suffix}`, `${suffix}@ith.ac.id`, `Staff ${suffix}`, String((unit as any).insertId)],
    );
    const id = String((user as any).insertId);
    await pool.execute(
      "INSERT INTO pengguna_peran(pengguna_id,peran_id) SELECT ?,id FROM peran WHERE kode='DOSEN_STAF'",
      [id],
    );
    const row = await identities.user(pool, id);
    return identities.principal(pool, row!);
  }
  async function doc(level: 'publik' | 'internal' | 'rahasia' = 'publik') {
    const suffix = uid();
    const [types] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM jenis_dokumen WHERE aktif=1 ORDER BY urutan LIMIT 1',
    );
    return service.createDocument(actor, {
      kodeDokumen: `T-${suffix}`,
      slug: `test-${suffix}`,
      jenisDokumenId: String(types[0]!.id),
      versi: { judul: `Dokumen ${suffix}`, tingkatAkses: level },
    });
  }
  const ready = (judul: string, level: 'publik' | 'internal' | 'rahasia' = 'publik') => ({
    judul,
    tingkatAkses: level,
    nomor: '1',
    tahun: 2026,
    pic: 'Unit Hukum',
    tanggalPenetapan: '2026-01-02',
  });
  async function approve(versionId: string) {
    await service.transition(actor, versionId, 'SUBMIT');
    await expect(service.transition(actor, versionId, 'APPROVE')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    return service.transition(second, versionId, 'APPROVE');
  }
  async function publish(versionId: string) {
    const impact = await service.impact(actor, versionId);
    return service.publish(actor, versionId, {
      konfirmasi: {
        tokenKonfirmasi: impact.tokenKonfirmasi,
        disetujui: true,
        dampak: impact.dampak,
      },
    });
  }
  async function addFileMetadata(versionId: string, kind: 'UTAMA' | 'LAMPIRAN') {
    const suffix = uid();
    await pool.execute(
      'INSERT INTO dokumen_berkas(dokumen_versi_id,jenis_berkas,storage_key,nama_asli,mime_type,size_bytes,checksum) VALUES(?,?,?,?,?,?,?)',
      [versionId, kind, `metadata-only/${suffix}`, `${suffix}.pdf`, 'application/pdf', 1, Buffer.alloc(32)],
    );
  }

  it('keeps stable identity and current publication through a new draft, then atomically publishes revision and legal impact', async () => {
    const first = await doc();
    const v1 = first.versionId;
    await service.updateVersion(actor, v1, ready('Versi satu'));
    await approve(v1);
    await addFileMetadata(v1, 'UTAMA');
    await publish(v1);
    const target = await doc();
    const repealTarget = await doc();
    const revision = await service.newVersion(actor, first.id, ready('Versi dua'));
    expect(revision.nomorVersi).toBe(2);
    const [pointerBefore] = await pool.query<RowDataPacket[]>(
      'SELECT CAST(current_published_version_id AS CHAR) current FROM dokumen WHERE id=?',
      [first.id],
    );
    expect(pointerBefore[0]?.current).toBe(v1);
    await service.addRelation(actor, revision.id, {
      targetDocumentId: target.id,
      jenisRelasi: 'MENGUBAH',
    });
    await service.addRelation(actor, revision.id, {
      targetDocumentId: repealTarget.id,
      jenisRelasi: 'MENCABUT',
    });
    await approve(revision.id);
    await addFileMetadata(revision.id, 'UTAMA');
    const impact = await service.impact(actor, revision.id);
    expect(impact.dampak).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ targetDocumentId: target.id, statusUsulan: 'DIUBAH' }),
        expect.objectContaining({ targetDocumentId: repealTarget.id, statusUsulan: 'DICABUT' }),
      ]),
    );
    const insert = audit.recordDomain.bind(audit);
    const spy = vi.spyOn(audit, 'recordDomain').mockImplementation(async (e, db) => {
      await insert(e, db);
      if (e.action === 'PUBLISH' && e.entityId === revision.id)
        throw new Error('audit rollback probe');
    });
    await expect(publish(revision.id)).rejects.toThrow('audit rollback probe');
    spy.mockRestore();
    const [rolled] = await pool.query<RowDataPacket[]>(
      'SELECT CAST(current_published_version_id AS CHAR) current FROM dokumen WHERE id=?',
      [first.id],
    );
    expect(rolled[0]?.current).toBe(v1);
    const [workflowRolled] = await pool.query<RowDataPacket[]>(
      'SELECT status_workflow FROM dokumen_versi WHERE id=?',
      [revision.id],
    );
    expect(workflowRolled[0]?.status_workflow).toBe('DISETUJUI');
    const [statusRolled] = await pool.query<RowDataPacket[]>(
      'SELECT status_hukum FROM dokumen WHERE id=?',
      [target.id],
    );
    expect(statusRolled[0]?.status_hukum).toBe('BERLAKU');
    await publish(revision.id);
    await expect(publish(revision.id)).rejects.toThrow();
    await expect(service.transition(actor, revision.id, 'SUBMIT')).rejects.toThrow();
    const [after] = await pool.query<RowDataPacket[]>(
      'SELECT CAST(current_published_version_id AS CHAR) current FROM dokumen WHERE id=?',
      [first.id],
    );
    expect(after[0]?.current).toBe(revision.id);
    const [old] = await pool.query<RowDataPacket[]>(
      'SELECT status_workflow,superseded_at FROM dokumen_versi WHERE id=?',
      [v1],
    );
    expect(old[0]?.status_workflow).toBe('TERBIT');
    expect(old[0]?.superseded_at).toBeTruthy();
    const [targetStatus] = await pool.query<RowDataPacket[]>(
      'SELECT status_hukum FROM dokumen WHERE id=?',
      [target.id],
    );
    expect(targetStatus[0]?.status_hukum).toBe('DIUBAH');
    const [repealStatus] = await pool.query<RowDataPacket[]>(
      'SELECT status_hukum FROM dokumen WHERE id=?',
      [repealTarget.id],
    );
    expect(repealStatus[0]?.status_hukum).toBe('DICABUT');
    await service.withdraw(actor, first.id, { alasan: 'Dicabut untuk pengujian' });
    const [withdrawn] = await pool.query<RowDataPacket[]>(
      'SELECT current_published_version_id FROM dokumen WHERE id=?',
      [first.id],
    );
    expect(withdrawn[0]?.current_published_version_id).toBeNull();
    const [notRestored] = await pool.query<RowDataPacket[]>(
      'SELECT status_workflow FROM dokumen_versi WHERE id=?',
      [v1],
    );
    expect(notRestored[0]?.status_workflow).toBe('TERBIT');
    const [unchangedLegal] = await pool.query<RowDataPacket[]>(
      'SELECT status_hukum FROM dokumen WHERE id=?',
      [target.id],
    );
    expect(unchangedLegal[0]?.status_hukum).toBe('DIUBAH');
    const [unchangedRepeal] = await pool.query<RowDataPacket[]>(
      'SELECT status_hukum FROM dokumen WHERE id=?',
      [repealTarget.id],
    );
    expect(unchangedRepeal[0]?.status_hukum).toBe('DICABUT');
  });

  it('requires UTAMA metadata to publish and rejects attachment-only versions', async () => {
    const d = await doc();
    await service.updateVersion(actor, d.versionId, ready('Metadata readiness'));
    await approve(d.versionId);

    await expect(publish(d.versionId)).rejects.toThrow('Metadata file UTAMA wajib tersedia');
    await addFileMetadata(d.versionId, 'LAMPIRAN');
    await expect(publish(d.versionId)).rejects.toThrow('Metadata file UTAMA wajib tersedia');

    await addFileMetadata(d.versionId, 'UTAMA');
    await expect(publish(d.versionId)).resolves.toMatchObject({
      id: d.versionId,
      statusWorkflow: 'TERBIT',
      currentPublishedVersionId: d.versionId,
    });
  });

  it('rejects duplicate active Secret grants and permits expired-grant history plus regrant', async () => {
    const target = await addStaff();
    const d = await doc('rahasia');
    await service.updateVersion(actor, d.versionId, ready('Secret published', 'rahasia'));
    await approve(d.versionId);
    await addFileMetadata(d.versionId, 'UTAMA');
    await publish(d.versionId);
    const resource = {
      id: d.id,
      tingkatAkses: 'rahasia' as const,
      published: true,
      current: true,
      deleted: false,
    };
    await expect(policy.assertRead(resource, target)).rejects.toThrow();
    const input = { penggunaId: target.id, alasan: 'Akses kerja', expiresAt: null };
    const grant = await service.grant(actor, d.id, input);
    await expect(policy.assertRead(resource, target)).resolves.toBeUndefined();
    await expect(service.grant(actor, d.id, input)).rejects.toThrow();
    await pool.execute(
      'UPDATE dokumen_akses_rahasia SET granted_at=UTC_TIMESTAMP(6)-INTERVAL 1 HOUR,expires_at=UTC_TIMESTAMP(6)-INTERVAL 1 SECOND WHERE id=?',
      [grant.id],
    );
    await expect(policy.assertRead(resource, target)).rejects.toThrow();
    const renewed = await service.grant(actor, d.id, input);
    expect(renewed.id).not.toBe(grant.id);
    const [history] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) total FROM dokumen_akses_rahasia WHERE dokumen_id=? AND pengguna_id=?',
      [d.id, target.id],
    );
    expect(Number(history[0]?.total)).toBe(2);
    await service.revoke(actor, d.id, renewed.id, { alasan: 'Selesai' });
    await expect(policy.assertRead(resource, target)).rejects.toThrow();
  });

  it('keeps category and tag assignments version-scoped and supports unassign', async () => {
    const [catResult] = await pool.execute('INSERT INTO kategori(kode,nama) VALUES(?,?)', [
      uid(),
      `Kategori ${uid()}`,
    ]);
    const category = String((catResult as any).insertId);
    const [tagResult] = await pool.execute('INSERT INTO tag(nama) VALUES(?)', [`Tag ${uid()}`]);
    const tag = String((tagResult as any).insertId);
    const d = await doc();
    await service.updateVersion(actor, d.versionId, { kategoriId: [category], tagId: [tag] });
    const [c1] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) total FROM dokumen_versi_kategori WHERE dokumen_versi_id=? AND kategori_id=?',
      [d.versionId, category],
    );
    const [t1] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) total FROM dokumen_versi_tag WHERE dokumen_versi_id=? AND tag_id=?',
      [d.versionId, tag],
    );
    expect(Number(c1[0]?.total)).toBe(1);
    expect(Number(t1[0]?.total)).toBe(1);
    const revision = await service.newVersion(actor, d.id, {
      judul: 'Revision without taxonomy',
      tingkatAkses: 'publik',
    });
    const [isolated] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) total FROM dokumen_versi_kategori WHERE dokumen_versi_id=?',
      [revision.id],
    );
    expect(Number(isolated[0]?.total)).toBe(0);
    await service.updateVersion(actor, d.versionId, { kategoriId: [], tagId: [] });
    const [removed] = await pool.query<RowDataPacket[]>(
      'SELECT (SELECT COUNT(*) FROM dokumen_versi_kategori WHERE dokumen_versi_id=?) + (SELECT COUNT(*) FROM dokumen_versi_tag WHERE dokumen_versi_id=?) total',
      [d.versionId, d.versionId],
    );
    expect(Number(removed[0]?.total)).toBe(0);
  });

  it('guards workflow note and prevents actor-supplied creator spoofing through strict shared contract', async () => {
    const d = await doc();
    await expect(service.transition(actor, d.versionId, 'RETURN', '')).rejects.toThrow();
    await expect(service.impact(actor, d.versionId)).rejects.toThrow();
    await expect(service.withdraw(actor, d.id, {})).rejects.toThrow();
    await expect(
      service.createDocument(actor, {
        kodeDokumen: 'spoof',
        slug: 'spoof',
        jenisDokumenId: '1',
        createdBy: second.id,
        versi: ready('Spoof'),
      }),
    ).rejects.toThrow();
  });
});
