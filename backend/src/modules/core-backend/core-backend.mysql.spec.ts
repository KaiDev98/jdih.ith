/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unnecessary-condition */
import 'reflect-metadata';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
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
import { LocalStorageDriver } from './storage/storage.service.js';
import { DocumentFilesService } from './files/document-files.service.js';
import { SearchService } from './search/search.service.js';
import { HomeRepository } from './search/home.repository.js';
import { KunjunganService } from './kunjungan/kunjungan.service.js';
import { LetterTemplatesService } from './templates/letter-templates.service.js';

const enabled = Boolean(process.env.IDENTITY_TEST_ENV);
function minimalDocx() {
  const entries = [
    ['[Content_Types].xml', Buffer.from('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>')],
    ['word/document.xml', Buffer.from('<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body/></w:document>')],
  ] as const;
  const crc32 = (bytes: Buffer) => {
    let crc = 0xffffffff;
    for (const byte of bytes) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    return (crc ^ 0xffffffff) >>> 0;
  };
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const [name, body] of entries) {
    const filename = Buffer.from(name);
    const crc = crc32(body);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18); local.writeUInt32LE(body.length, 22); local.writeUInt16LE(filename.length, 26);
    locals.push(local, filename, body);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6);
    central.writeUInt32LE(crc, 16); central.writeUInt32LE(body.length, 20); central.writeUInt32LE(body.length, 24);
    central.writeUInt16LE(filename.length, 28); central.writeUInt32LE(offset, 42);
    centrals.push(central, filename);
    offset += local.length + filename.length + body.length;
  }
  const centralBytes = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBytes.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBytes, end]);
}

describe.skipIf(!enabled)('MySQL 8.4 Core Backend integration', () => {
  let pool: Pool;
  let identities: IdentityRepository;
  let audit: AuditService;
  let service: CoreBackendService;
  let actor: any;
  let second: any;
  let policy: DocumentPolicyService;
  let storage: LocalStorageDriver;
  let storageRoot: string;
  let files: DocumentFilesService;
  let search: SearchService;
  let templates: LetterTemplatesService;
  let defaultCategoryId: string;
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
    policy = new DocumentPolicyService();
    storageRoot = await mkdtemp(join(tmpdir(), 'jdih-core-storage-'));
    const config = new ConfigService({
      identitas: { key: 'integration-test-key' },
      penyimpanan: { jalurLokal: storageRoot, ukuranMaksimumBita: 50 * 1024 * 1024 },
    }) as any;
    storage = new LocalStorageDriver(config);
    const repository = new CoreBackendRepository(pool);
    files = new DocumentFilesService(repository, storage, audit, policy, config);
    search = new SearchService(repository);
    templates = new LetterTemplatesService(repository, storage, audit, config);
    service = new CoreBackendService(
      repository,
      audit,
      config,
      policy,
      files,
    );
    actor = await addAdmin();
    second = await addAdmin();
    const [categories] = await pool.query<RowDataPacket[]>('SELECT CAST(id AS CHAR) id FROM kategori WHERE aktif=1 ORDER BY id LIMIT 1');
    defaultCategoryId = String(categories[0]!.id);
  }, 15000);
  afterAll(async () => {
    await pool?.end();
    if (storageRoot) await rm(storageRoot, { recursive: true, force: true });
  });
  async function addAdmin(role: 'ADMIN' | 'SUPERADMIN' = 'SUPERADMIN') {
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
      "INSERT INTO pengguna_peran(pengguna_id,peran_id) SELECT ?,id FROM peran WHERE kode=?",
      [id, role],
    );
    const row = await identities.user(pool, id);
    return identities.principal(pool, row!);
  }

  it('kunjungan berasal dari jumlah MySQL aktual dengan batas hari/bulan WITA', async () => {
    const db = await pool.getConnection();
    await db.beginTransaction();
    try {
      const kunjungan = new KunjunganService(new CoreBackendRepository(db as unknown as Pool));
      const januari = new Date('2100-01-31T15:59:00Z');
      const februari = new Date('2100-01-31T16:00:00Z');
      const sebelumJan = await kunjungan.ringkasan(januari);
      const sebelumFeb = await kunjungan.ringkasan(februari);
      await kunjungan.catat(januari);
      await kunjungan.catat(januari);
      await kunjungan.catat(februari);
      expect(await kunjungan.ringkasan(januari)).toEqual({ hariIni: sebelumJan.hariIni + 2, bulanIni: sebelumJan.bulanIni + 2, tahunIni: sebelumJan.tahunIni + 2, total: sebelumJan.total + 2 });
      expect(await kunjungan.ringkasan(februari)).toEqual({ hariIni: sebelumFeb.hariIni + 1, bulanIni: sebelumFeb.bulanIni + 1, tahunIni: sebelumFeb.tahunIni + 3, total: sebelumFeb.total + 3 });
    } finally { await db.rollback(); db.release(); }
  });
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
  async function addPendingStaff() {
    const suffix = uid();
    const [unit] = await pool.execute('INSERT INTO unit_kerja(kode,nama) VALUES(?,?)', [suffix, `Unit ${suffix}`]);
    const [user] = await pool.execute(
      "INSERT INTO pengguna(google_sub,email,nama,status,unit_kerja_id) VALUES(?,?,?,'MENUNGGU_VERIFIKASI',?)",
      [`sub-${suffix}`, `${suffix}@ith.ac.id`, `Pending ${suffix}`, String((unit as any).insertId)],
    );
    const id = String((user as any).insertId);
    await pool.execute("INSERT INTO pengguna_peran(pengguna_id,peran_id) SELECT ?,id FROM peran WHERE kode='DOSEN_STAF'", [id]);
    const row = await identities.user(pool, id);
    return identities.principal(pool, row!);
  }
  async function doc(level: 'publik' | 'internal' = 'publik') {
    const suffix = uid();
    const [types] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM jenis_dokumen WHERE aktif=1 ORDER BY urutan LIMIT 1',
    );
    return service.createDocument(actor, {
      kodeDokumen: `T-${suffix}`,
      slug: `test-${suffix}`,
      jenisDokumenId: String(types[0]!.id),
      versi: ready(`Dokumen ${suffix}`, level),
    });
  }
  const ready = (judul: string, level: 'publik' | 'internal' = 'publik') => ({
    judul,
    tingkatAkses: level,
    nomor: '1',
    tahun: 2026,
    pic: 'Unit Hukum',
    tanggalPenetapan: '2026-01-02',
    deskripsi: 'Dokumen pengujian alur verifikasi',
    kategoriId: [defaultCategoryId],
  });
  async function approve(versionId: string) {
    return service.transition(actor, versionId, 'APPROVE', 'Draf Superadmin telah diperiksa dan sesuai');
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
  async function publishedDoc() {
    const d = await doc();
    await addFileMetadata(d.versionId, 'UTAMA');
    await approve(d.versionId);
    await publish(d.versionId);
    return d;
  }
  async function addFileMetadata(versionId: string, kind: 'UTAMA' | 'LAMPIRAN') {
    const suffix = uid();
    const content = Buffer.from('%PDF-1.7\nmetadata-only test\n%%EOF\n');
    const staged = await storage.stage(Readable.from([content]));
    await storage.finalize(staged);
    await pool.execute(
      'INSERT INTO dokumen_berkas(dokumen_versi_id,uploaded_by,jenis_berkas,storage_key,nama_asli,mime_type,size_bytes,checksum) VALUES(?,?,?,?,?,?,?,?)',
      [versionId, actor.id, kind, staged.storageKey, `${suffix}.pdf`, 'application/pdf', staged.byte, staged.checksum],
    );
  }
  async function incomingFile(name: string, bytes: Buffer) {
    const path = join(storageRoot, `${uid()}.upload`);
    await writeFile(path, bytes);
    return { path, originalname: name };
  }
  async function documentSlug(id: string) {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT slug FROM dokumen WHERE id=?', [id]);
    return String(rows[0]!.slug);
  }

  it('serves authorized admin document and verifier lists, active DOSEN_STAF lookup, redacted audit, and public masters', async () => {
    const d = await doc();
    const createdList = await service.adminDocuments(actor, { halaman: '1', perHalaman: '50', cakupan: 'PENGAJUAN' });
    expect(createdList.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: d.id, versionId: d.versionId, statusWorkflow: 'DRAF' }),
    ]));
    await addFileMetadata(d.versionId, 'UTAMA');
    await service.transition(second, d.versionId, 'SUBMIT');
    const queue = await service.adminDocuments(actor, { halaman: '1', perHalaman: '50' }, true);
    expect(queue.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: d.id, versionId: d.versionId, statusWorkflow: 'DIAJUKAN' }),
    ]));
    const active = await addStaff();
    const auditRows = await service.auditList(actor, { halaman: '1', perHalaman: '50', module: 'documents' });
    expect(auditRows.data).toEqual(expect.arrayContaining([expect.objectContaining({ module: 'documents', action: 'CREATE' })]));
    expect(auditRows.data[0]).not.toHaveProperty('beforeJson');
    expect(auditRows.data[0]).not.toHaveProperty('afterJson');
    expect(auditRows.data[0]).not.toHaveProperty('requestId');
    expect(auditRows.data[0]).not.toHaveProperty('userAgent');
    await expect(service.auditList(active, { halaman: '1', perHalaman: '10' })).rejects.toBeInstanceOf(ForbiddenException);
    for (const table of ['jenis_dokumen', 'kategori', 'unit_kerja'] as const) {
      const rows = await service.publicMaster(table);
      expect(rows.length).toBeGreaterThan(0);
      expect(rows[0]).toHaveProperty('nama');
      expect(rows[0]).toHaveProperty('id');
    }
  });

  it('keeps stable identity and current publication through a new draft, then atomically publishes revision and legal impact', async () => {
    const first = await doc();
    const v1 = first.versionId;
    await service.updateVersion(actor, v1, ready('Versi satu'));
    await addFileMetadata(v1, 'UTAMA');
    await approve(v1);
    await publish(v1);
    const target = await publishedDoc();
    const repealTarget = await publishedDoc();
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
    await addFileMetadata(revision.id, 'UTAMA');
    await approve(revision.id);
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

  it('serializes concurrent duplicate submit, approve, and publish actions', async () => {
    const d = await doc();
    await service.updateVersion(actor, d.versionId, ready('Concurrent workflow'));
    await addFileMetadata(d.versionId, 'UTAMA');

    const submits = await Promise.allSettled([
      service.transition(second, d.versionId, 'SUBMIT'),
      service.transition(second, d.versionId, 'SUBMIT'),
    ]);
    expect(submits.filter((result) => result.status === 'fulfilled')).toHaveLength(1);

    const approvals = await Promise.allSettled([
      service.transition(second, d.versionId, 'APPROVE', 'Sesuai'),
      service.transition(second, d.versionId, 'APPROVE', 'Sesuai'),
    ]);
    expect(approvals.filter((result) => result.status === 'fulfilled')).toHaveLength(1);

    const impact = await service.impact(second, d.versionId);
    const command = {
      konfirmasi: {
        tokenKonfirmasi: impact.tokenKonfirmasi,
        disetujui: true as const,
        dampak: impact.dampak,
      },
    };
    const publications = await Promise.allSettled([
      service.publish(second, d.versionId, command),
      service.publish(second, d.versionId, command),
    ]);
    expect(publications.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const [current] = await pool.query<RowDataPacket[]>(
      'SELECT CAST(current_published_version_id AS CHAR) current FROM dokumen WHERE id=?',
      [d.id],
    );
    expect(current[0]?.current).toBe(d.versionId);
  });

  it('allocates concurrent revisions uniquely and serializes publish against withdrawal', async () => {
    const d = await doc();
    await service.updateVersion(actor, d.versionId, ready('Concurrent version one'));
    await addFileMetadata(d.versionId, 'UTAMA');
    await approve(d.versionId);
    await publish(d.versionId);

    const revisions = await Promise.all([
      service.newVersion(actor, d.id, ready('Concurrent version two')),
      service.newVersion(actor, d.id, ready('Concurrent version three')),
    ]);
    expect(revisions.map((revision) => revision.nomorVersi).sort()).toEqual([2, 3]);

    const next = revisions[0];
    await addFileMetadata(next.id, 'UTAMA');
    await approve(next.id);
    const impact = await service.impact(second, next.id);
    const command = {
      konfirmasi: {
        tokenKonfirmasi: impact.tokenKonfirmasi,
        disetujui: true as const,
        dampak: impact.dampak,
      },
    };
    const [publication, withdrawal] = await Promise.allSettled([
      service.publish(second, next.id, command),
      service.withdraw(second, d.id, { alasan: 'Race regression test' }),
    ]);
    expect(publication.status).toBe('fulfilled');
    expect(withdrawal.status).toBe('fulfilled');

    const [current] = await pool.query<RowDataPacket[]>(
      'SELECT CAST(current_published_version_id AS CHAR) current FROM dokumen WHERE id=?',
      [d.id],
    );
    const [latest] = await pool.query<RowDataPacket[]>(
      'SELECT status_workflow FROM dokumen_versi WHERE id=?',
      [next.id],
    );
    if (current[0]?.current === null) expect(latest[0]?.status_workflow).toBe('DITARIK');
    else {
      expect(current[0]?.current).toBe(next.id);
      expect(latest[0]?.status_workflow).toBe('TERBIT');
    }
  });

  it('serializes competing legal impact publications using fresh target status', async () => {
    const target = await publishedDoc();
    const makeProposal = async (jenisRelasi: 'MENGUBAH' | 'MENCABUT') => {
      const source = await doc();
      await service.updateVersion(actor, source.versionId, ready(`Concurrent ${jenisRelasi}`));
      await service.addRelation(actor, source.versionId, {
        targetDocumentId: target.id,
        jenisRelasi,
      });
      await addFileMetadata(source.versionId, 'UTAMA');
      await approve(source.versionId);
      const impact = await service.impact(second, source.versionId);
      return {
        id: source.versionId,
        command: {
          konfirmasi: {
            tokenKonfirmasi: impact.tokenKonfirmasi,
            disetujui: true as const,
            dampak: impact.dampak,
          },
        },
      };
    };
    const [change, repeal] = await Promise.all([
      makeProposal('MENGUBAH'),
      makeProposal('MENCABUT'),
    ]);
    const publications = await Promise.allSettled([
      service.publish(second, change.id, change.command),
      service.publish(second, repeal.id, repeal.command),
    ]);
    expect(publications.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(publications.filter((result) => result.status === 'rejected')).toHaveLength(1);

    const [status] = await pool.query<RowDataPacket[]>(
      'SELECT status_hukum FROM dokumen WHERE id=?',
      [target.id],
    );
    const [history] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) total FROM dokumen_status_hukum_riwayat WHERE dokumen_id=?',
      [target.id],
    );
    expect(['DIUBAH', 'DICABUT']).toContain(status[0]?.status_hukum);
    expect(Number(history[0]?.total)).toBe(1);
  });

  it('requires exactly one UTAMA before submission and rejects attachment-only versions', async () => {
    const d = await doc();
    await service.updateVersion(actor, d.versionId, ready('Metadata readiness'));
    await expect(service.transition(actor, d.versionId, 'APPROVE')).rejects.toThrow('tepat satu file');
    await addFileMetadata(d.versionId, 'LAMPIRAN');
    await expect(service.transition(actor, d.versionId, 'APPROVE')).rejects.toThrow('tepat satu file');
    await pool.execute('DELETE FROM dokumen_berkas WHERE dokumen_versi_id=?', [d.versionId]);
    await addFileMetadata(d.versionId, 'UTAMA');
    await approve(d.versionId);
    await expect(publish(d.versionId)).resolves.toMatchObject({
      id: d.versionId,
      statusWorkflow: 'TERBIT',
      currentPublishedVersionId: d.versionId,
    });
  });

  it('allows concurrent first uploads to different versions and serializes duplicate uploads to one version', async () => {
    const documents = await Promise.all(Array.from({ length: 4 }, () => doc()));
    const pdf = Buffer.from('%PDF-1.7\nparallel upload test\n%%EOF\n');
    const uploaded = await Promise.all(documents.map(async d => files.upload(actor, d.versionId,
      await incomingFile('parallel.pdf', pdf), { jenisBerkas: 'UTAMA' })));
    expect(new Set(uploaded.map(f => f.id)).size).toBe(4);
    const duplicate = await doc();
    const results = await Promise.allSettled(Array.from({ length: 4 }, async () => files.upload(actor,
      duplicate.versionId, await incomingFile('duplicate.pdf', pdf), { jenisBerkas: 'UTAMA' })));
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(r => r.status === 'rejected')).toHaveLength(3);
    expect(await files.listForVersion(actor, duplicate.versionId)).toHaveLength(1);
  });

  it('uploads one UTAMA, refuses additional files, and rechecks access for each file request', async () => {
    const publicDoc = await doc('publik');
    await service.updateVersion(actor, publicDoc.versionId, ready('File access public'));
    const pdf = Buffer.from('%PDF-1.7\nfile integration fixture\n%%EOF\n');
    const main = await files.upload(actor, publicDoc.versionId, await incomingFile('main.pdf', pdf), { jenisBerkas: 'UTAMA' });
    await expect(files.upload(actor, publicDoc.versionId, await incomingFile('appendix-a.pdf', pdf), { jenisBerkas: 'LAMPIRAN', urutan: 1 })).rejects.toThrow('satu file');
    await expect(files.upload(actor, publicDoc.versionId, await incomingFile('duplicate.pdf', pdf), { jenisBerkas: 'UTAMA' })).rejects.toThrow();
    await expect(files.upload(actor, publicDoc.versionId, await incomingFile('fake.pdf', Buffer.from('not PDF bytes')), { jenisBerkas: 'LAMPIRAN' })).rejects.toThrow();
    await approve(publicDoc.versionId);
    await publish(publicDoc.versionId);
    const fileSlug = await documentSlug(publicDoc.id);
    const [publicationState] = await pool.query<RowDataPacket[]>(
      'SELECT CAST(d.current_published_version_id AS CHAR) currentId,CAST(v.id AS CHAR) versionId,v.status_workflow,d.deleted_at,f.dokumen_versi_id fileVersion FROM dokumen d JOIN dokumen_versi v ON v.id=d.current_published_version_id JOIN dokumen_berkas f ON f.dokumen_versi_id=v.id WHERE d.slug=? AND f.id=?',
      [fileSlug, main.id],
    );
    expect(publicationState[0]).toMatchObject({ currentId: publicDoc.versionId, versionId: publicDoc.versionId, status_workflow: 'TERBIT' });
    const [policyState] = await pool.query<RowDataPacket[]>(
      'SELECT IF(d.current_published_version_id=v.id,1,0) is_current,IF(d.deleted_at IS NULL,0,1) is_deleted FROM dokumen d JOIN dokumen_versi v ON v.id=d.current_published_version_id JOIN dokumen_berkas f ON f.dokumen_versi_id=v.id WHERE d.slug=? AND f.id=?',
      [fileSlug, main.id],
    );
    expect(policyState[0]).toMatchObject({ is_current: '1', is_deleted: '0' });
    const anonymousDetail = await service.publicDetail(fileSlug);
    expect(anonymousDetail).toMatchObject({
      berkasUtama: { id: main.id, jenisBerkas: 'UTAMA', kemampuan: { preview: true, download: true } },
      lampiran: [],
    });
    // Anonymous visitors are not told about access levels at all.
    expect(anonymousDetail).not.toHaveProperty('tingkatAkses');
    const opened = await files.openCurrent(fileSlug, main.id);
    const chunks: Buffer[] = [];
    for await (const chunk of opened.stream) chunks.push(chunk as Buffer);
    expect(Buffer.concat(chunks)).toEqual(pdf);

    const internal = await doc('internal');
    await service.updateVersion(actor, internal.versionId, ready('Internal file', 'internal'));
    const internalMain = await files.upload(actor, internal.versionId, await incomingFile('internal.pdf', pdf), { jenisBerkas: 'UTAMA' });
    await approve(internal.versionId);
    await publish(internal.versionId);
    const internalSlug = await documentSlug(internal.id);
    await expect(files.openCurrent(internalSlug, internalMain.id)).rejects.toThrow();
    await expect(files.openCurrent(internalSlug, internalMain.id, await addStaff())).resolves.toMatchObject({ mimeType: 'application/pdf' });

  });

  it('blocks publish when a main-file storage object is missing or its checksum no longer matches', async () => {
    const d = await doc();
    await service.updateVersion(actor, d.versionId, ready('Missing storage object'));
    await addFileMetadata(d.versionId, 'UTAMA');
    await approve(d.versionId);
    const [row] = await pool.query<RowDataPacket[]>(
      'SELECT storage_key FROM dokumen_berkas WHERE dokumen_versi_id=? AND jenis_berkas=\'UTAMA\'', [d.versionId],
    );
    await storage.delete(String(row[0]!.storage_key));
    await expect(publish(d.versionId)).rejects.toThrow('File UTAMA tidak tersedia atau checksum berubah');
    const [status] = await pool.query<RowDataPacket[]>(
      'SELECT status_workflow FROM dokumen_versi WHERE id=?', [d.versionId],
    );
    expect(status[0]?.status_workflow).toBe('DISETUJUI');
    const [pointer] = await pool.query<RowDataPacket[]>(
      'SELECT current_published_version_id FROM dokumen WHERE id=?', [d.id],
    );
    expect(pointer[0]?.current_published_version_id).toBeNull();

    const tampered = await doc();
    await service.updateVersion(actor, tampered.versionId, ready('Checksum mismatch'));
    await addFileMetadata(tampered.versionId, 'UTAMA');
    await approve(tampered.versionId);
    await pool.execute('UPDATE dokumen_berkas SET checksum=? WHERE dokumen_versi_id=? AND jenis_berkas=\'UTAMA\'', [Buffer.alloc(32), tampered.versionId]);
    await expect(publish(tampered.versionId)).rejects.toThrow('File UTAMA tidak tersedia atau checksum berubah');
  });

  it('creates templates, atomically archives old versions, enforces visibility and archives safely', async () => {
    const suffix = uid();
    const first = await templates.create(
      actor,
      await incomingFile('surat.docx', minimalDocx()),
      { slug: `format-${suffix}`, nama: 'Format Surat', tingkatAkses: 'PUBLIK' },
    );
    const publicList = await templates.list({ halaman: 1, perHalaman: 20 });
    expect(publicList.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: first.id, slug: `format-${suffix}`, kemampuan: { download: true } }),
    ]));
    await expect(templates.open(`format-${suffix}`)).resolves.toMatchObject({ mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

    const originalStage = storage.stage.bind(storage);
    const rollbackStage = vi.spyOn(storage, 'stage');
    let failedObject = '';
    rollbackStage.mockImplementation(async (stream) => {
      const object = await originalStage(stream);
      failedObject = object.storageKey;
      return object;
    });
    const auditSpy = vi.spyOn(audit, 'recordDomain').mockImplementation(() => Promise.reject(new Error('template audit rollback probe')));
    await expect(templates.newVersion(actor, first.id, await incomingFile('rolled-back.docx', minimalDocx()), { tingkatAkses: 'INTERNAL' })).rejects.toThrow('template audit rollback probe');
    auditSpy.mockRestore(); rollbackStage.mockRestore();
    expect(await storage.exists(failedObject)).toBe(false);
    const [afterRollback] = await pool.query<RowDataPacket[]>(
      'SELECT CAST(current_version_id AS CHAR) current FROM template_surat WHERE id=?', [first.id],
    );
    expect(afterRollback[0]?.current).toBe(first.versionId);

    const next = await templates.newVersion(
      actor,
      first.id,
      await incomingFile('surat-internal.docx', minimalDocx()),
      { tingkatAkses: 'INTERNAL' },
    );
    const [versions] = await pool.query<RowDataPacket[]>(
      'SELECT status FROM template_surat_versi WHERE template_surat_id=? ORDER BY nomor_versi', [first.id],
    );
    expect(versions.map((row) => String(row.status))).toEqual(['ARCHIVED', 'ACTIVE']);
    expect((await templates.list({ halaman: 1, perHalaman: 20 })).data).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: first.id })]),
    );
    const staff = await addStaff();
    expect((await templates.list({ halaman: 1, perHalaman: 20 }, staff)).data).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: first.id, tingkatAkses: 'INTERNAL' })]),
    );
    await expect(templates.open(`format-${suffix}`)).rejects.toThrow();
    await expect(templates.open(`format-${suffix}`, staff)).resolves.toMatchObject({ mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const [downloadAudit] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) total FROM audit_log WHERE module='letter-templates' AND action='DOWNLOAD_INTERNAL' AND entity_id=?",
      [next.id],
    );
    expect(Number(downloadAudit[0]?.total)).toBe(1);
    await templates.archive(actor, first.id, {});
    const [archived] = await pool.query<RowDataPacket[]>(
      'SELECT current_version_id,aktif FROM template_surat WHERE id=?', [first.id],
    );
    expect(archived[0]?.current_version_id).toBeNull();
    expect(archived[0]?.aktif).toBe(0);
    expect(next.templateSuratId).toBe(first.id);
    const reactivated = await templates.newVersion(actor, first.id, await incomingFile('surat-reactivated.docx', minimalDocx()), { tingkatAkses: 'PUBLIK' });
    expect(reactivated.nomorVersi).toBe(3);
    const anonim = (await templates.list({ halaman: 1, perHalaman: 20 })).data;
    expect(anonim).toEqual(expect.arrayContaining([expect.objectContaining({ id: first.id })]));
    // Tanggapan anonim tidak boleh menyiratkan adanya tingkat akses lain.
    for (const item of anonim) expect(item).not.toHaveProperty('tingkatAkses');
  });

  it('searches current published versions, redacts anonymous Internal results and omits Secret from counts until grant', async () => {
    const marker = uid();
    const tagName = `TagSearch${marker}`;
    const [categoryResult] = await pool.execute('INSERT INTO kategori(kode,nama) VALUES(?,?)', [uid(), `Kategori ${marker}`]);
    const [tagResult] = await pool.execute('INSERT INTO tag(nama) VALUES(?)', [tagName]);
    const categoryId = String((categoryResult as any).insertId);
    const tagId = String((tagResult as any).insertId);
    const publicDoc = await doc('publik');
    const internalDoc = await doc('internal');
    for (const [target, level, title] of [
      [publicDoc, 'publik', `Search V2 public ${marker}`],
      [internalDoc, 'internal', `Search V2 internal ${marker}`],
    ] as const) {
      await service.updateVersion(actor, target.versionId, ready(title, level));
      if (target.id === publicDoc.id)
        await service.updateVersion(actor, target.versionId, { kategoriId: [categoryId], tagId: [tagId], unitKerjaId: actor.unitKerjaId });
      await addFileMetadata(target.versionId, 'UTAMA');
      await approve(target.versionId);
      await publish(target.versionId);
    }
    const anon = await search.search({ q: marker, halaman: 1, perHalaman: 20 });
    // Anonymous visitors must not learn that Internal documents exist: only the
    // public one is returned and counted, with no access label of any kind.
    expect(anon.meta.totalButir).toBe(1);
    expect(anon.data).toEqual([expect.objectContaining({ judul: `Search V2 public ${marker}` })]);
    expect(anon.data[0]).not.toHaveProperty('badge');
    expect(anon.data[0]).not.toHaveProperty('tingkatAkses');
    const [type] = await pool.query<RowDataPacket[]>('SELECT CAST(jenis_dokumen_id AS CHAR) id FROM dokumen WHERE id=?', [publicDoc.id]);
    const filtered = await search.search({ q: `public ${marker}`, jenisDokumenId: String(type[0]!.id), tahun: '2026', unitKerjaId: actor.unitKerjaId, kategoriId: categoryId, statusHukum: 'BERLAKU' });
    expect(filtered.data).toHaveLength(1);
    expect((await search.search({ q: tagName })).data).toHaveLength(1);
    const staff = await addStaff();
    const staffResults = await search.search({ q: marker }, staff);
    expect(staffResults.meta.totalButir).toBe(2);
    const pending = await addPendingStaff();
    const pendingResults = await search.search({ q: `internal ${marker}` }, pending);
    expect(pendingResults.data).toEqual([]);
    expect(pendingResults.meta.totalButir).toBe(0);
    const internalFiles = (await pool.query<RowDataPacket[]>('SELECT CAST(id AS CHAR) id FROM dokumen_berkas WHERE dokumen_versi_id=? AND jenis_berkas=\'UTAMA\'', [internalDoc.versionId]))[0];
    await expect(files.openCurrent(await documentSlug(internalDoc.id), String(internalFiles[0]!.id), pending)).rejects.toThrow();
    for (const row of (await search.publicList({ halaman: 1, perHalaman: 100 })).data) {
      expect(row).not.toHaveProperty('badge');
      expect(row).not.toHaveProperty('tingkatAkses');
    }

    const revision = await service.newVersion(actor, publicDoc.id, ready(`Search V2 revised ${marker}`));
    expect((await search.search({ q: `public ${marker}` })).data).toHaveLength(1);
    await addFileMetadata(revision.id, 'UTAMA');
    await approve(revision.id);
    await publish(revision.id);
    expect((await search.search({ q: `public ${marker}` })).data).toHaveLength(0);
    expect((await search.search({ q: `revised ${marker}` })).data).toHaveLength(1);
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

  it.each(['publik', 'internal'] as const)('Admin mengunggah SOP SK %s, meminta revisi dan hanya Superadmin yang menerbitkan', async (level) => {
    const owner = await addAdmin('ADMIN');
    const other = await addAdmin('ADMIN');
    const [units] = await pool.query<RowDataPacket[]>('SELECT kode FROM unit_kerja WHERE id=?', [owner.unitKerjaId]);
    const [category] = await pool.execute('INSERT INTO kategori(kode,nama) VALUES(?,?)', [units[0]!.kode, `Kategori ${uid()}`]);
    const categoryId = String((category as any).insertId);
    const [types] = await pool.query<RowDataPacket[]>("SELECT id FROM jenis_dokumen WHERE kode='SOP' AND aktif=1 LIMIT 1");
    const marker = uid();
    const payload = { kodeDokumen: marker, slug: `admin-sop-${marker}`, jenisDokumenId: String(types[0]!.id), peruntukan: 'PERMOHONAN_SK', versi: { ...ready(`SOP SK Admin ${marker}`, level), kategoriId: [categoryId] } };
    await expect(service.createDocument(owner, { ...payload, versi: { ...payload.versi, kategoriId: [defaultCategoryId] } })).rejects.toThrow();
    const d = await service.createDocument(owner, payload);
    expect((await service.adminDocuments(owner, { cakupan: 'PENGAJUAN', peruntukan: 'PERMOHONAN_SK', q: marker })).data.map(row => String(row.id))).toEqual([d.id]);
    expect((await service.adminDocuments(other, { cakupan: 'PENGAJUAN', peruntukan: 'PERMOHONAN_SK', q: marker })).data).toHaveLength(0);
    const pdf = Buffer.from('%PDF-1.7\nadmin SOP fixture\n%%EOF\n');
    await expect(files.upload(other, d.versionId, await incomingFile('other.pdf', pdf), { jenisBerkas: 'UTAMA' })).rejects.toThrow();
    const uploaded = await files.upload(owner, d.versionId, await incomingFile('sop.pdf', pdf), { jenisBerkas: 'UTAMA' });
    expect(await files.listForVersion(owner, d.versionId)).toEqual(expect.arrayContaining([expect.objectContaining({ id: uploaded.id })]));
    await expect(service.updateVersion(other, d.versionId, { judul: 'Manipulasi' })).rejects.toThrow();
    await expect(service.transition(other, d.versionId, 'SUBMIT')).rejects.toThrow();
    const elevated = { ...owner, izin: [...owner.izin, 'workflow.approve', 'workflow.return', 'workflow.publish'] };
    await expect(service.transition(elevated, d.versionId, 'APPROVE')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.publish(elevated, d.versionId, {})).rejects.toBeInstanceOf(ForbiddenException);
    await service.transition(owner, d.versionId, 'SUBMIT');
    expect((await search.permohonanSk({ q: marker })).data).toHaveLength(0);
    expect((await service.notifications(actor)).some(row => row.versionId === d.versionId && row.action === 'SUBMIT')).toBe(true);
    await service.transition(actor, d.versionId, 'RETURN', 'Perbaiki deskripsi prosedur');
    expect((await service.notifications(owner)).some(row => row.versionId === d.versionId && row.action === 'RETURN')).toBe(true);
    await service.updateVersion(owner, d.versionId, { deskripsi: 'Prosedur diperbaiki sesuai catatan Superadmin' });
    await service.transition(owner, d.versionId, 'SUBMIT');
    const preview = await service.impact(actor, d.versionId);
    await expect(service.transition(actor, d.versionId, 'APPROVE', undefined, { tokenKonfirmasi: preview.tokenKonfirmasi, dampak: preview.dampak as never, disetujui: true })).resolves.toMatchObject({ statusWorkflow: 'TERBIT' });
    expect((await service.notifications(owner)).some(row => row.versionId === d.versionId && row.action === 'APPROVE')).toBe(true);
    expect((await service.notifications(actor)).some(row => row.versionId === d.versionId)).toBe(false);
    expect((await search.permohonanSk({ q: marker })).data).toHaveLength(level === 'publik' ? 1 : 0);
    expect((await search.permohonanSk({ q: marker }, await addStaff())).data).toHaveLength(1);
    const [events] = await pool.query<RowDataPacket[]>('SELECT action FROM dokumen_workflow WHERE dokumen_versi_id=? ORDER BY id', [d.versionId]);
    expect(events.map(row => String(row.action))).toEqual(['CREATE', 'SUBMIT', 'RETURN', 'SUBMIT', 'APPROVE', 'PUBLISH']);
  });

  it.each(['publik', 'internal'] as const)('SOP Permohonan SK %s terbit saat disetujui, mempertahankan versi dan akses', async (level) => {
    const marker = uid();
    const [types] = await pool.query<RowDataPacket[]>("SELECT id FROM jenis_dokumen WHERE kode='SOP' AND aktif=1 LIMIT 1");
    // Jenis dasar dan kata kunci sama; hanya peruntukan yang membedakan koleksi.
    const biasa = await service.createDocument(actor, { kodeDokumen: `biasa-${marker}`, slug: `sop-biasa-${marker}`, jenisDokumenId: String(types[0]!.id), versi: ready(`SOP biasa ${marker}`) });
    await addFileMetadata(biasa.versionId, 'UTAMA');
    await approve(biasa.versionId);
    await publish(biasa.versionId);
    const home = new HomeRepository(new CoreBackendRepository(pool));
    const sebelum = await home.latestByType();
    const kategoriSebelum = await home.categories(String(types[0]!.id));
    const tahunSebelum = await home.years();
    const d = await service.createDocument(actor, { kodeDokumen: marker, slug: `sop-${marker}`, jenisDokumenId: String(types[0]!.id), peruntukan: 'PERMOHONAN_SK', versi: ready(`SOP SK ${marker}`, level) });
    await addFileMetadata(d.versionId, 'UTAMA');
    await expect(approve(d.versionId)).rejects.toThrow(/konfirmasi/i);
    const preview = await service.impact(actor, d.versionId);
    const konfirmasi = { tokenKonfirmasi: preview.tokenKonfirmasi, dampak: preview.dampak as never, disetujui: true as const };
    await expect(service.transition(actor, d.versionId, 'APPROVE', undefined, konfirmasi)).resolves.toMatchObject({ statusWorkflow: 'TERBIT' });
    const staff = await addStaff();
    const pending = await addPendingStaff();
    expect((await search.permohonanSk({ q: marker }, staff)).data).toHaveLength(1);
    expect((await search.permohonanSk({ q: marker })).data).toHaveLength(level === 'publik' ? 1 : 0);
    expect((await search.permohonanSk({ q: marker }, pending)).data).toHaveLength(level === 'publik' ? 1 : 0);
    for (const pengguna of [undefined, staff, pending, actor]) {
      const umum = await search.search({ q: marker, jenisDokumenId: String(types[0]!.id) }, pengguna);
      expect(umum.data.map(row => row.id)).toEqual([biasa.id]);
      expect(umum.meta.totalButir).toBe(1);
      expect((await search.facets({ q: marker }, pengguna)).total).toBe(1);
    }
    expect((await search.publicList({ q: marker })).data.map(row => row.id)).toEqual([biasa.id]);
    expect((await search.latestPublic())?.id).toBe(biasa.id);
    expect(await home.latestByType()).toEqual(sebelum);
    expect(await home.categories(String(types[0]!.id))).toEqual(kategoriSebelum);
    expect(await home.years()).toEqual(tahunSebelum);
    const revision = await service.newVersion(actor, d.id, ready(`SOP SK ${marker} revisi`, level));
    await addFileMetadata(revision.id, 'UTAMA');
    const [before] = await pool.query<RowDataPacket[]>('SELECT current_published_version_id FROM dokumen WHERE id=?', [d.id]);
    expect(String(before[0]!.current_published_version_id)).toBe(d.versionId);
    const next = await service.impact(actor, revision.id);
    const fail = vi.spyOn(files, 'assertPublishReady').mockRejectedValueOnce(new Error('Simulasi storage gagal'));
    await expect(service.transition(actor, revision.id, 'APPROVE', undefined, { tokenKonfirmasi: next.tokenKonfirmasi, dampak: next.dampak as never, disetujui: true })).rejects.toThrow('Simulasi storage gagal');
    fail.mockRestore();
    const [rolledBack] = await pool.query<RowDataPacket[]>('SELECT status_workflow FROM dokumen_versi WHERE id=?', [revision.id]);
    expect(rolledBack[0]!.status_workflow).toBe('DRAF');
    const [current] = await pool.query<RowDataPacket[]>('SELECT current_published_version_id FROM dokumen WHERE id=?', [d.id]);
    expect(String(current[0]!.current_published_version_id)).toBe(d.versionId);
    await service.transition(actor, revision.id, 'APPROVE', undefined, { tokenKonfirmasi: next.tokenKonfirmasi, dampak: next.dampak as never, disetujui: true });
    const [history] = await pool.query<RowDataPacket[]>('SELECT superseded_at FROM dokumen_versi WHERE id=?', [d.versionId]);
    expect(history[0]!.superseded_at).not.toBeNull();
    const [events] = await pool.query<RowDataPacket[]>('SELECT action FROM dokumen_workflow WHERE dokumen_versi_id=? ORDER BY id', [revision.id]);
    expect(events.map(row => String(row.action))).toEqual(['CREATE', 'APPROVE', 'PUBLISH']);
  });
});
