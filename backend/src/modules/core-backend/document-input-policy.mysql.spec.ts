import 'reflect-metadata';
import { readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { randomUUID } from 'node:crypto';
import { join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { Readable } from 'node:stream';
import mysql, { type Connection, type Pool, type PoolConnection, type RowDataPacket, type ResultSetHeader } from 'mysql2/promise';
import { ConfigService } from '@nestjs/config';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import type { PenggunaAktif } from '@jdih/shared';
import { CoreBackendRepository } from './core-backend.repository.js';
import { CoreBackendService } from './core-backend.service.js';
import { IdentityRepository } from '../identity/identity.repository.js';
import { AuditService } from '../identity/audit.service.js';
import { DocumentPolicyService } from '../identity/document-policy.service.js';
import { DocumentFilesService } from './files/document-files.service.js';
import { LocalStorageDriver } from './storage/storage.service.js';

/** Seluruh fixture berada di transaksi luar yang selalu di-rollback. Tidak reset DB. */
describe.skipIf(!process.env.DOCUMENT_POLICY_MYSQL_ENV)('MySQL kebijakan unit, relasi dan persetujuan langsung (rollback)', () => {
  let db: Connection;
  let repo: CoreBackendRepository;
  let service: CoreBackendService;
  let storage: LocalStorageDriver;
  let storageRoot: string;
  let admin: PenggunaAktif;
  let other: PenggunaAktif;
  let superadmin: PenggunaAktif;
  let categoryId: string;
  let otherCategoryId: string;
  let typeId: string;
  let savepoint = 0;
  let baseline: Record<string, number>;
  let connected = false;
  const counts = async () => {
    const result: Record<string, number> = {};
    for (const table of ['pengguna', 'dokumen', 'dokumen_versi', 'dokumen_workflow', 'dokumen_relasi', 'audit_log']) {
      const [rows] = await db.query<RowDataPacket[]>(`SELECT COUNT(*) n FROM ${table}`);
      result[table] = Number(rows[0]!.n);
    }
    return result;
  };
  beforeAll(async () => {
    const env = parseEnv(readFileSync(resolve(process.env.DOCUMENT_POLICY_MYSQL_ENV!), 'utf8'));
    if (!['127.0.0.1', 'localhost', '::1'].includes(env.DB_HOST ?? '') || env.DB_NAME !== 'jdih_ith_v2_dev') throw new Error('Unsafe policy test target');
    db = await mysql.createConnection({ host: env.DB_HOST, port: Number(env.DB_PORT), user: env.DB_USER, password: env.DB_PASSWORD, database: env.DB_NAME, timezone: 'Z', supportBigNumbers: true, bigNumberStrings: true, dateStrings: ['DATE', 'DATETIME'] });
    connected = true;
    const [version] = await db.query<RowDataPacket[]>('SELECT VERSION() version,DATABASE() db');
    if (!String(version[0]?.version).startsWith('8.4.') || version[0]?.db !== 'jdih_ith_v2_dev') throw new Error('Unexpected policy database');
    await db.query("SET time_zone='+00:00'");
    baseline = await counts();
    storageRoot = await mkdtemp(join(tmpdir(), 'jdih-policy-'));
    repo = new CoreBackendRepository(db as unknown as Pool);
    vi.spyOn(repo, 'transaction').mockImplementation(async (fn) => {
      const name = `policy_${++savepoint}`;
      await db.query(`SAVEPOINT ${name}`);
      try { const result = await fn(db as unknown as PoolConnection); await db.query(`RELEASE SAVEPOINT ${name}`); return result; }
      catch (error) { await db.query(`ROLLBACK TO SAVEPOINT ${name}`); await db.query(`RELEASE SAVEPOINT ${name}`); throw error; }
    });
    const config = new ConfigService({ identitas: { key: 'local-policy-test' }, penyimpanan: { jalurLokal: storageRoot, ukuranMaksimumBita: 1_000_000 } });
    storage = new LocalStorageDriver(config as never);
    const audit = new AuditService(new IdentityRepository(db as unknown as Pool));
    const policy = new DocumentPolicyService();
    const files = new DocumentFilesService(repo, storage, audit, policy, config as never);
    service = new CoreBackendService(repo, audit, config as never, policy, files);
    const [types] = await db.query<RowDataPacket[]>('SELECT CAST(id AS CHAR) id FROM jenis_dokumen WHERE aktif=1 LIMIT 1');
    typeId = String(types[0]!.id);
  });
  beforeEach(async () => {
    await db.beginTransaction();
    async function actor(role: 'ADMIN' | 'SUPERADMIN') {
      const key = randomUUID().replaceAll('-', '');
      const [unit] = await db.execute<ResultSetHeader>('INSERT INTO unit_kerja(kode,nama) VALUES(?,?)', [key, `Policy ${key}`]);
      const [category] = await db.execute<ResultSetHeader>('INSERT INTO kategori(kode,nama) VALUES(?,?)', [key, `Policy ${key}`]);
      const [user] = await db.execute<ResultSetHeader>("INSERT INTO pengguna(email,nama,status,unit_kerja_id) VALUES(?,?,'AKTIF',?)", [`policy-${key}@ith.ac.id`, `Policy ${key}`, unit.insertId]);
      const principal: PenggunaAktif = { id: String(user.insertId), nama: 'Policy', surel: `policy-${key}@ith.ac.id`, status: 'AKTIF', unitKerjaId: String(unit.insertId), unitManual: null, avatarUrl: null, peran: [role], izin: ['documents.create', 'documents.read_admin', 'documents.edit', 'workflow.submit', 'workflow.approve', 'workflow.publish', 'legal.manage_relations'] };
      return { principal, category: String(category.insertId) };
    }
    const a = await actor('ADMIN'); admin = a.principal; categoryId = a.category;
    const b = await actor('ADMIN'); other = b.principal; otherCategoryId = b.category;
    superadmin = (await actor('SUPERADMIN')).principal;
  });
  afterEach(async () => { await db.rollback(); });
  afterAll(async () => {
    if (connected) { await db.rollback(); expect(await counts()).toEqual(baseline); await db.end(); }
    if (storageRoot && resolve(storageRoot).startsWith(resolve(tmpdir()) + sep + 'jdih-policy-')) await rm(storageRoot, { recursive: true, force: true });
  });
  async function create(actor: PenggunaAktif, category = categoryId) {
    const key = randomUUID().replaceAll('-', '');
    return service.createDocument(actor, { kodeDokumen: `POL-${key}`, slug: `pol-${key}`, jenisDokumenId: typeId,
      versi: { judul: `Policy ${key}`, deskripsi: 'Dokumen uji kelengkapan', nomor: '1', tahun: 2026, pic: 'Policy', tanggalPenetapan: '2026-10-25', tingkatAkses: 'publik', kategoriId: [category] } });
  }
  async function mainFile(id: string, owner: string) {
    const staged = await storage.stage(Readable.from([Buffer.from('%PDF-1.7\nPolicy\n%%EOF')]));
    await storage.finalize(staged);
    await db.execute("INSERT INTO dokumen_berkas(dokumen_versi_id,uploaded_by,jenis_berkas,storage_key,nama_asli,mime_type,size_bytes,checksum,urutan) VALUES(?,?,'UTAMA',?,'policy.pdf','application/pdf',?,?,0)", [id, owner, staged.storageKey, staged.byte, staged.checksum]);
  }
  async function publishOwn(actor: PenggunaAktif, category: string) {
    const doc = await create(actor, category); await mainFile(doc.versionId, actor.id);
    await service.transition(actor, doc.versionId, 'SUBMIT'); await service.transition(superadmin, doc.versionId, 'APPROVE');
    const impact = await service.impact(superadmin, doc.versionId);
    await service.publish(superadmin, doc.versionId, { konfirmasi: { tokenKonfirmasi: impact.tokenKonfirmasi, disetujui: true, dampak: impact.dampak } });
    return doc;
  }
  it('semua pilihan terlihat, tetapi hanya unit akun yang dapat disimpan; manipulasi ditolak atomik', async () => {
    const options = await service.documentOptions(admin, 'kategori');
    expect(options.find((r) => r.id === categoryId)).toMatchObject({ bolehPilih: true });
    expect(options.find((r) => r.id === otherCategoryId)).toMatchObject({ bolehPilih: false });
    const noUnit = await service.documentOptions({ ...admin, unitKerjaId: null }, 'kategori');
    expect(noUnit.some((r) => r.bolehPilih === true)).toBe(false);
    const before = await counts();
    await expect(create(admin, otherCategoryId)).rejects.toBeInstanceOf(NotFoundException);
    expect(await counts()).toEqual(before);
    const own = await create(admin);
    await expect(service.updateVersion(admin, own.versionId, { unitKerjaId: other.unitKerjaId })).rejects.toThrow(/unit kerja/);
    await expect(service.updateVersion(admin, own.versionId, { kategoriId: [otherCategoryId] })).rejects.toBeInstanceOf(NotFoundException);
    const [categories] = await db.query<RowDataPacket[]>('SELECT CAST(kategori_id AS CHAR) id FROM dokumen_versi_kategori WHERE dokumen_versi_id=?', [own.versionId]);
    expect(categories).toEqual([{ id: categoryId }]);
  });
  it('persetujuan langsung mencatat DRAF -> DISETUJUI, audit dan checksum; tidak masuk antrean atau notifikasi pengajuan', async () => {
    const doc = await create(superadmin); await mainFile(doc.versionId, superadmin.id);
    await expect(service.transition(superadmin, doc.versionId, 'SUBMIT')).rejects.toThrow(/tanpa masuk antrean/);
    await service.transition(superadmin, doc.versionId, 'APPROVE');
    const [history] = await db.query<RowDataPacket[]>('SELECT status_asal,status_tujuan,action FROM dokumen_workflow WHERE dokumen_versi_id=? ORDER BY id', [doc.versionId]);
    expect(history.map((r) => String(r.action))).toEqual(['CREATE', 'APPROVE']);
    expect(history[1]).toMatchObject({ status_asal: 'DRAF', status_tujuan: 'DISETUJUI' });
    const [audit] = await db.query<RowDataPacket[]>("SELECT JSON_UNQUOTE(JSON_EXTRACT(after_json,'$.jalur')) jalur FROM audit_log WHERE entity_id=? AND module='workflow' AND action='APPROVE'", [doc.versionId]);
    expect(audit[0]?.jalur).toBe('SUPERADMIN_LANGSUNG');
    expect((await service.adminDocuments(superadmin, {}, true)).data.some((r) => r.versionId === doc.versionId)).toBe(false);
    expect((await service.notifications(superadmin)).some((r) => r.versionId === doc.versionId)).toBe(false);
  });
  it('Admin tetap harus mengajukan dan tidak dapat menyetujui sendiri', async () => {
    const doc = await create(admin); await mainFile(doc.versionId, admin.id);
    await expect(service.transition(admin, doc.versionId, 'APPROVE')).rejects.toThrow();
    await service.transition(admin, doc.versionId, 'SUBMIT');
    expect((await service.adminDocuments(superadmin, {}, true)).data.some((r) => r.versionId === doc.versionId)).toBe(true);
    await expect(service.transition(superadmin, doc.versionId, 'APPROVE')).resolves.toMatchObject({ statusWorkflow: 'DISETUJUI' });
  });
  it('pencarian dan POST relasi membatasi dokumen/versi target; pengajuan ulang menolak relasi lintas pemilik lama', async () => {
    const own = await publishOwn(admin, categoryId);
    const foreign = await publishOwn(other, otherCategoryId);
    const source = await create(admin); await mainFile(source.versionId, admin.id);
    const targets = await service.relationTargets(admin, { perHalaman: 100 });
    expect(targets.data.some((r) => r.id === own.id)).toBe(true);
    expect(targets.data.some((r) => r.id === foreign.id)).toBe(false);
    for (const jenisRelasi of ['MENGUBAH', 'MENCABUT'])
      await expect(service.addRelation(admin, source.versionId, { jenisRelasi, targetDocumentId: foreign.id })).rejects.toBeInstanceOf(NotFoundException);
    await service.addRelation(admin, source.versionId, { jenisRelasi: 'MENGUBAH', targetDocumentId: own.id });
    await db.execute('UPDATE dokumen_versi SET created_by=? WHERE id=?', [superadmin.id, own.versionId]);
    expect((await service.relationTargets(admin, { perHalaman: 100 })).data.some((r) => r.id === own.id)).toBe(false);
    await expect(service.addRelation(admin, source.versionId, { jenisRelasi: 'MENCABUT', targetDocumentId: own.id })).rejects.toBeInstanceOf(NotFoundException);
    await db.execute("INSERT INTO dokumen_relasi(source_version_id,target_document_id,jenis_relasi) VALUES(?,?,'MENCABUT')", [source.versionId, foreign.id]);
    await expect(service.transition(admin, source.versionId, 'SUBMIT')).rejects.toBeInstanceOf(NotFoundException);
    const [state] = await db.query<RowDataPacket[]>('SELECT status_workflow FROM dokumen_versi WHERE id=?', [source.versionId]);
    expect(state[0]?.status_workflow).toBe('DRAF');
  });
});
