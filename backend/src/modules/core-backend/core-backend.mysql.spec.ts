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
import type { PenggunaAktif } from '@jdih/shared';
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
import { DokumenAdminService } from './documents/dokumen-admin.service.js';
import { RemovalRequestsService } from './documents/removal-requests.service.js';
import { RemovalRequestsRepository } from './documents/removal-requests.repository.js';

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

  function removalServices() {
    const repository = new CoreBackendRepository(pool);
    const documents = new DokumenAdminService(repository, audit, storage);
    const requests = new RemovalRequestsService(repository, new RemovalRequestsRepository(repository), audit, documents, service, templates);
    return { documents, requests };
  }
  const adminOwner = () => ({ ...actor, peran: ['ADMIN'] } as PenggunaAktif);

  it('deletes only an owned draft revision, preserving the published file, pointer and access', async () => {
    const { documents } = removalServices();
    const d = await publishedDoc();
    const revision = await service.newVersion(actor, d.id, ready('Draf revisi yang dibatalkan'));
    await addFileMetadata(revision.id, 'UTAMA');
    await expect(documents.hapusDraf({ ...second, peran: ['ADMIN'] }, d.id, revision.id)).rejects.toMatchObject({ status: 404 });
    await expect(documents.hapusDraf(adminOwner(), d.id, d.versionId)).rejects.toMatchObject({ status: 409 });
    await documents.hapusDraf(adminOwner(), d.id, revision.id);
    const detail = await service.document(actor, d.id);
    expect(detail.document.currentPublishedVersionId).toBe(d.versionId);
    await expect(service.document(actor, d.id, revision.id)).rejects.toMatchObject({ status: 404 });
    const foreignVersion = await service.newVersion(second, d.id, ready('Revisi Superadmin lain'));
    await expect(documents.hapusDraf(adminOwner(), d.id, foreignVersion.id)).rejects.toMatchObject({ status: 404 });
    await documents.hapusDraf(actor, d.id, foreignVersion.id);
    await expect(service.publicDetail(await documentSlug(d.id))).resolves.toBeTruthy();
    const onlyDraft = await doc();
    await documents.hapusDraf(actor, onlyDraft.id, onlyDraft.versionId);
    await expect(service.document(actor, onlyDraft.id)).rejects.toMatchObject({ status: 404 });
  });

  it('rolls back draft cancellation when audit fails and rejects submitted drafts', async () => {
    const { documents } = removalServices();
    const d = await doc();
    await addFileMetadata(d.versionId, 'UTAMA');
    const fail = vi.spyOn(audit, 'recordDomain').mockRejectedValueOnce(new Error('audit unavailable'));
    await expect(documents.hapusDraf(adminOwner(), d.id, d.versionId)).rejects.toThrow('audit unavailable');
    fail.mockRestore();
    expect((await files.listForVersion(actor, d.versionId)).length).toBe(1);
    await service.transition(second, d.versionId, 'SUBMIT');
    await expect(documents.hapusDraf(actor, d.id, d.versionId)).rejects.toMatchObject({ status: 409 });
  });

  it('persists owner-only removal requests, prevents duplicate requests and reserves decisions to Superadmin', async () => {
    const { requests } = removalServices();
    const d = await publishedDoc();
    await expect(requests.create({ ...second, peran: ['ADMIN'] }, 'DOCUMENT', d.id, { jenis: 'DELETE', alasan: 'Bukan milik saya' })).rejects.toMatchObject({ status: 404 });
    const inputs = { jenis: 'REVOKE', alasan: 'Perlu pencabutan resmi' };
    for (const invalid of [{ ...adminOwner(), status: 'NONAKTIF' as const }, { ...adminOwner(), izin: ['documents.read_admin'] as const }, { ...actor, peran: ['DOSEN_STAF'] as const }])
      await expect(requests.create(invalid as PenggunaAktif, 'DOCUMENT', d.id, inputs)).rejects.toBeInstanceOf(ForbiddenException);
    const raced = await Promise.allSettled([requests.create(adminOwner(), 'DOCUMENT', d.id, inputs), requests.create(adminOwner(), 'DOCUMENT', d.id, inputs)]);
    expect(raced.map((item) => item.status).sort()).toEqual(['fulfilled', 'rejected']);
    const own = await requests.list(adminOwner(), { sumber: 'DOCUMENT', resourceId: d.id });
    expect(own.data).toHaveLength(1);
    const request = own.data[0]!;
    expect((await requests.list({ ...second, peran: ['ADMIN'] }, { sumber: 'DOCUMENT', resourceId: d.id })).data).toHaveLength(0);
    await expect(requests.decide(adminOwner(), request.id, { keputusan: 'APPROVE', catatan: 'Saya punya izin langsung' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.publicDetail(await documentSlug(d.id))).resolves.toBeTruthy();
    const decisions = await Promise.allSettled([
      requests.decide(second, request.id, { keputusan: 'APPROVE', catatan: 'Tarik untuk koreksi' }),
      requests.decide(second, request.id, { keputusan: 'APPROVE', catatan: 'Klik ulang' }),
    ]);
    expect(decisions.map((item) => item.status).sort()).toEqual(['fulfilled', 'rejected']);
    const detail = await service.document(actor, d.id);
    expect(detail.document.currentPublishedVersionId).toBe(d.versionId);
    expect(detail.document.statusWorkflow).toBe('TERBIT');
    expect(detail.document.statusHukum).toBe('DICABUT');
    const saved = (await requests.list(adminOwner(), { sumber: 'DOCUMENT', resourceId: d.id, status: 'ALL' })).data[0]!;
    expect(saved.status).toBe('APPROVED');
    expect(['Tarik untuk koreksi', 'Klik ulang']).toContain(saved.catatan);
  });

  it('deletes approved requests atomically, preserves request history and rolls back when decision audit fails', async () => {
    const { requests } = removalServices();
    const d = await publishedDoc();
    const request = await requests.create(adminOwner(), 'DOCUMENT', d.id, { jenis: 'DELETE', alasan: 'Unggahan keliru' });
    const original = audit.recordDomain.bind(audit);
    const fail = vi.spyOn(audit, 'recordDomain').mockImplementation((event, db) => {
      if (event.action === 'REMOVAL_APPROVED') throw new Error('decision audit unavailable');
      return original(event, db);
    });
    await expect(requests.decide(second, request.id, { keputusan: 'APPROVE', catatan: 'Hapus sesuai permintaan' })).rejects.toThrow('decision audit unavailable');
    fail.mockRestore();
    expect((await files.listForVersion(actor, d.versionId)).length).toBe(1);
    expect((await requests.list(adminOwner(), { sumber: 'DOCUMENT', resourceId: d.id })).data).toHaveLength(1);
    await requests.decide(second, request.id, { keputusan: 'APPROVE', catatan: 'Hapus sesuai permintaan' });
    await expect(service.document(actor, d.id)).rejects.toMatchObject({ status: 404 });
    expect((await requests.list(adminOwner(), { sumber: 'DOCUMENT', resourceId: d.id, status: 'ALL' })).data[0]).toMatchObject({ status: 'APPROVED', resourceId: d.id });
  });

  it('allows empty decision notes and preserves revoked documents/files in panels and public access without a replacement', async () => {
    const { requests } = removalServices();
    const d = await publishedDoc();
    const request = await requests.create(adminOwner(), 'DOCUMENT', d.id, { jenis: 'REVOKE', alasan: 'Alasan Admin tanpa catatan keputusan' });
    await requests.decide(second, request.id, { keputusan: 'APPROVE' });
    const q = await documentSlug(d.id);
    for (const reader of [adminOwner(), second]) {
      for (const filter of [{}, { statusWorkflow: 'TERBIT' }]) {
        const list = await service.adminDocuments(reader, { q, ...filter });
        expect(list.meta.totalButir).toBe(1);
        expect(list.data[0]).toMatchObject({ id: d.id, statusWorkflow: 'TERBIT', statusHukum: 'DICABUT' });
      }
      expect((await files.listForVersion(reader, d.versionId)).length).toBe(1);
    }
    expect((await service.adminDocuments({ ...second, peran: ['ADMIN'] }, { q })).data).toHaveLength(0);
    const publicDetail = await service.publicDetail(q);
    expect(publicDetail).toMatchObject({ statusHukum: 'DICABUT', keteranganStatus: { alasan: 'Alasan Admin tanpa catatan keputusan', sumber: null } });
    expect(publicDetail.keteranganStatus?.tanggal).toBe(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar' }).format(new Date()));
    expect(publicDetail.berkasUtama.id).toBeTruthy();
    const opened = await files.openCurrent(q, publicDetail.berkasUtama.id);
    opened.stream.destroy();
    expect((await requests.list(adminOwner(), { requestId: request.id, status: 'ALL' })).data[0]).toMatchObject({ status: 'APPROVED', catatan: null });
    const refusal = await requests.create(adminOwner(), 'DOCUMENT', d.id, { jenis: 'DELETE', alasan: 'Coba hapus' });
    await requests.decide(second, refusal.id, { keputusan: 'DECLINE', catatan: '   ' });
    expect((await requests.list(adminOwner(), { requestId: refusal.id, status: 'ALL' })).data[0]).toMatchObject({ status: 'DECLINED', catatan: null });
    expect((await service.document(adminOwner(), d.id)).document.statusHukum).toBe('DICABUT');
    const deletion = await requests.create(adminOwner(), 'DOCUMENT', d.id, { jenis: 'DELETE', alasan: 'Hapus setelah dicabut' });
    await requests.decide(second, deletion.id, { keputusan: 'APPROVE', catatan: '' });
    await expect(service.document(adminOwner(), d.id)).rejects.toMatchObject({ status: 404 });
  });

  it('direct revocation is Superadmin-only, version-bound, non-repeatable and preserves publication/history', async () => {
    const { requests } = removalServices();
    const d = await publishedDoc();
    const input = { versionId: d.versionId, alasan: 'Dicabut tanpa dokumen pengganti' };
    await expect(service.revoke(adminOwner(), d.id, input)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.revoke({ ...second, status: 'NONAKTIF' }, d.id, input)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.revoke(second, d.id, { ...input, alasan: '' })).rejects.toThrow();
    await expect(service.revoke(second, d.id, { ...input, versionId: '999999999' })).rejects.toMatchObject({ status: 409 });
    const draft = await doc();
    await expect(service.revoke(second, draft.id, { ...input, versionId: draft.versionId })).rejects.toMatchObject({ status: 409 });
    const request = await requests.create(adminOwner(), 'DOCUMENT', d.id, { jenis: 'REVOKE', alasan: 'Permintaan pemilik' });
    const raced = await Promise.allSettled([service.revoke(second, d.id, input), service.revoke(second, d.id, input)]);
    expect(raced.map((r) => r.status).sort()).toEqual(['fulfilled', 'rejected']);
    const result = await service.publicDetail(await documentSlug(d.id));
    expect(result).toMatchObject({ statusHukum: 'DICABUT', keteranganStatus: { alasan: input.alasan, sumber: null } });
    expect((await search.search({ q: result.judul, statusHukum: 'DICABUT' })).data.some((r) => r.id === d.id)).toBe(true);
    const [history] = await pool.query<RowDataPacket[]>('SELECT status_asal,status_tujuan,source_version_id FROM dokumen_status_hukum_riwayat WHERE dokumen_id=?', [d.id]);
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ status_asal: 'BERLAKU', status_tujuan: 'DICABUT', source_version_id: null });
    expect((await requests.list(adminOwner(), { requestId: request.id, status: 'ALL' })).data[0]!.status).toBe('OBSOLETE');
    await expect(requests.create(adminOwner(), 'DOCUMENT', d.id, { jenis: 'REVOKE', alasan: 'Cabut dua kali' })).rejects.toMatchObject({ status: 409 });
    await expect(requests.create(adminOwner(), 'DOCUMENT', d.id, { jenis: 'WITHDRAW', alasan: 'Klien lama' })).rejects.toMatchObject({ status: 409 });
  });

  it('rolls back revocation and request decision if audit fails; refusal preserves legal status and internal access stays private', async () => {
    const { requests } = removalServices();
    const d = await doc('internal');
    await addFileMetadata(d.versionId, 'UTAMA'); await approve(d.versionId); await publish(d.versionId);
    const request = await requests.create(adminOwner(), 'DOCUMENT', d.id, { jenis: 'REVOKE', alasan: 'Pencabutan internal' });
    const record = audit.recordDomain.bind(audit);
    const fail = vi.spyOn(audit, 'recordDomain').mockImplementation((event, db) => {
      if (event.action === 'REMOVAL_APPROVED') throw new Error('revocation audit failure');
      return record(event, db);
    });
    await expect(requests.decide(second, request.id, { keputusan: 'APPROVE' })).rejects.toThrow('revocation audit failure');
    fail.mockRestore();
    expect((await service.document(adminOwner(), d.id)).document).toMatchObject({ statusHukum: 'BERLAKU', currentPublishedVersionId: d.versionId });
    const [history] = await pool.query<RowDataPacket[]>('SELECT id FROM dokumen_status_hukum_riwayat WHERE dokumen_id=?', [d.id]);
    expect(history).toHaveLength(0);
    expect((await requests.list(adminOwner(), { requestId: request.id })).data[0]!.status).toBe('PENDING');
    await requests.decide(second, request.id, { keputusan: 'DECLINE' });
    expect((await service.document(adminOwner(), d.id)).document.statusHukum).toBe('BERLAKU');
    const next = await requests.create(adminOwner(), 'DOCUMENT', d.id, { jenis: 'REVOKE', alasan: 'Pencabutan internal kedua' });
    await requests.decide(second, next.id, { keputusan: 'APPROVE', catatan: 'Alasan keputusan Superadmin' });
    const slug = await documentSlug(d.id);
    const staff = await addStaff();
    expect(await service.publicDetail(slug, staff)).toMatchObject({ statusHukum: 'DICABUT', keteranganStatus: { alasan: 'Alasan keputusan Superadmin' } });
    await expect(service.publicDetail(slug)).rejects.toThrow();
    const file = (await files.listForVersion(actor, d.versionId))[0]!;
    await expect(files.openCurrent(slug, String(file.id))).rejects.toThrow();
  });

  it('keeps legacy withdrawal decisions separate instead of republishing or reinterpreting their history', async () => {
    const { requests } = removalServices();
    const d = await publishedDoc();
    const [insert] = await pool.execute("INSERT INTO permintaan_penghapusan(sumber,resource_id,version_id,judul,jenis,alasan,requested_by) VALUES('DOCUMENT',?,?,?,'WITHDRAW','Permintaan penarikan lama',?)", [d.id, d.versionId, 'Dokumen lama', actor.id]);
    const id = String((insert as any).insertId);
    await requests.decide(second, id, { keputusan: 'APPROVE' });
    expect((await service.document(adminOwner(), d.id)).document).toMatchObject({ statusWorkflow: 'DITARIK', statusHukum: 'BERLAKU', currentPublishedVersionId: null });
    await expect(service.publicDetail(await documentSlug(d.id))).rejects.toThrow();
  });

  it('hides completed decisions after 24 hours before pagination/count, keeps old pending requests and preserves stored history', async () => {
    const { requests } = removalServices();
    const d = await publishedDoc();
    const expired = await requests.create(adminOwner(), 'DOCUMENT', d.id, { jenis: 'DELETE', alasan: 'Keputusan lama' });
    await requests.decide(second, expired.id, { keputusan: 'DECLINE' });
    await pool.execute('UPDATE permintaan_penghapusan SET decided_at=UTC_TIMESTAMP(6)-INTERVAL 24 HOUR WHERE id=?', [expired.id]);
    const recent = await requests.create(adminOwner(), 'DOCUMENT', d.id, { jenis: 'DELETE', alasan: 'Keputusan masih tampil' });
    await requests.decide(second, recent.id, { keputusan: 'DECLINE' });
    await pool.execute('UPDATE permintaan_penghapusan SET decided_at=UTC_TIMESTAMP(6)-INTERVAL 23 HOUR-INTERVAL 59 MINUTE WHERE id=?', [recent.id]);
    const pending = await requests.create(adminOwner(), 'DOCUMENT', d.id, { jenis: 'DELETE', alasan: 'Menunggu tetap terlihat' });
    await pool.execute('UPDATE permintaan_penghapusan SET created_at=UTC_TIMESTAMP(6)-INTERVAL 7 DAY WHERE id=?', [pending.id]);
    for (const reader of [adminOwner(), second]) {
      const page = await requests.list(reader, { sumber: 'DOCUMENT', resourceId: d.id, status: 'ALL', perHalaman: 1 });
      expect(page.meta).toMatchObject({ totalButir: 2, totalHalaman: 2, adaBerikutnya: true });
      expect(page.data[0]!.id).toBe(pending.id);
      expect((await requests.list(reader, { sumber: 'DOCUMENT', resourceId: d.id, status: 'ALL', halaman: 2, perHalaman: 1 })).data[0]!.id).toBe(recent.id);
      expect((await requests.list(reader, { requestId: expired.id, status: 'ALL' })).meta.totalButir).toBe(0);
      expect((await requests.list(reader, { requestId: expired.id, status: 'DECLINED' })).data).toHaveLength(0);
    }
    expect((await requests.list({ ...second, peran: ['ADMIN'] }, { resourceId: d.id, status: 'ALL' })).data).toHaveLength(0);
    const [stored] = await pool.query<RowDataPacket[]>('SELECT id FROM permintaan_penghapusan WHERE id=?', [expired.id]);
    expect(stored).toHaveLength(1);
    const [events] = await pool.query<RowDataPacket[]>("SELECT id FROM audit_log WHERE entity_type='permintaan_penghapusan' AND entity_id=? AND action='REMOVAL_DECLINED'", [expired.id]);
    expect(events).toHaveLength(1);
  });

  it('rejects stale publication requests without withdrawing a newer version, and allows a reasoned refusal', async () => {
    const { requests } = removalServices();
    const d = await publishedDoc();
    const request = await requests.create(adminOwner(), 'DOCUMENT', d.id, { jenis: 'REVOKE', alasan: 'Cabut versi lama' });
    const newer = await service.newVersion(actor, d.id, ready('Versi baru setelah permintaan'));
    await addFileMetadata(newer.id, 'UTAMA'); await approve(newer.id); await publish(newer.id);
    await expect(requests.decide(second, request.id, { keputusan: 'APPROVE', catatan: 'Versi berubah' })).rejects.toMatchObject({ status: 409 });
    expect((await service.document(actor, d.id)).document.currentPublishedVersionId).toBe(newer.id);
    await requests.decide(second, request.id, { keputusan: 'DECLINE', catatan: 'Ajukan ulang untuk versi baru' });
    expect((await requests.list(adminOwner(), { sumber: 'DOCUMENT', resourceId: d.id, status: 'ALL' })).data[0]).toMatchObject({ status: 'DECLINED', catatan: 'Ajukan ulang untuk versi baru' });
  });

  it('keeps template management owner-scoped and handles legacy published-template withdrawal requests', async () => {
    const { requests } = removalServices();
    const suffix = uid();
    const template = await templates.create(actor, await incomingFile('request.docx', minimalDocx()), { nama: `Format ${suffix}`, slug: `request-${suffix}`, tingkatAkses: 'PUBLIK' });
    await templates.verify(second, template.id, template.versionId, {});
    await templates.publish(second, template.id, template.versionId, {});
    await expect(requests.create({ ...second, peran: ['ADMIN'] }, 'TEMPLATE', template.id, { jenis: 'DELETE', alasan: 'Tidak punya' })).rejects.toMatchObject({ status: 404 });
    const [legacy] = await pool.execute("INSERT INTO permintaan_penghapusan(sumber,resource_id,version_id,judul,jenis,alasan,requested_by) VALUES('TEMPLATE',?,?,?,'WITHDRAW','Perbarui isi format',?)", [template.id, template.versionId, 'Format lama', actor.id]);
    const request = { id: String((legacy as any).insertId) };
    await requests.decide(second, request.id, { keputusan: 'APPROVE', catatan: 'Tarik untuk diperbarui' });
    expect((await templates.list({ q: suffix })).data).toHaveLength(0);
    const [versions] = await pool.query<RowDataPacket[]>('SELECT status FROM template_surat_versi WHERE id=?', [template.versionId]);
    expect(versions[0]!.status).toBe('ARCHIVED');
    await expect(templates.remove(adminOwner(), template.id, {})).rejects.toMatchObject({ status: 409 });
    expect((await templates.adminList({ ...second, peran: ['ADMIN'] })).some((row) => row.id === template.id)).toBe(false);
    const deletion = await requests.create(adminOwner(), 'TEMPLATE', template.id, { jenis: 'DELETE', alasan: 'Format lama tidak diperlukan' });
    await requests.decide(second, deletion.id, { keputusan: 'APPROVE', catatan: 'Hapus format yang sudah ditarik' });
    await expect(templates.review(actor, template.id, template.versionId)).rejects.toMatchObject({ status: 404 });
    expect((await requests.list(adminOwner(), { sumber: 'TEMPLATE', resourceId: template.id, status: 'ALL' })).data).toHaveLength(2);
  });

  it('revokes published templates through Superadmin approval while keeping public preview/download and preserves revoked history when replacing', async () => {
    const { requests } = removalServices();
    const suffix = uid();
    const pdf = Buffer.from('%PDF-1.7\nmetadata-only test\n%%EOF\n');
    const t = await templates.create(actor, await incomingFile('request.pdf', pdf), { nama: `Format ${suffix}`, slug: `revoke-${suffix}`, tingkatAkses: 'PUBLIK' });
    await templates.verify(second, t.id, t.versionId, {}); await templates.publish(second, t.id, t.versionId, {});
    await expect(requests.create({ ...second, peran: ['ADMIN'] }, 'TEMPLATE', t.id, { jenis: 'REVOKE', alasan: 'Bukan pemilik' })).rejects.toMatchObject({ status: 404 });
    const request = await requests.create(adminOwner(), 'TEMPLATE', t.id, { jenis: 'REVOKE', alasan: 'Format tidak digunakan lagi' });
    await expect(requests.decide(adminOwner(), request.id, { keputusan: 'APPROVE' })).rejects.toBeInstanceOf(ForbiddenException);
    await requests.decide(second, request.id, { keputusan: 'APPROVE' });
    const publicList = await templates.list({ q: suffix });
    expect(publicList.meta.totalButir).toBe(1);
    expect(publicList.data[0]).toMatchObject({ id: t.id, pencabutan: { alasan: 'Format tidak digunakan lagi' }, kemampuan: { download: true, preview: true } });
    expect(publicList.data[0]).not.toHaveProperty('tingkatAkses');
    const opened = await templates.openAuthorized(await templates.authorizeOpen(t.slug), undefined, true);
    expect(opened.mimeType).toBe('application/pdf'); opened.stream.destroy();
    const managed = (await templates.adminList(adminOwner())).find((r) => r.id === t.id)!;
    expect(managed).toMatchObject({ currentVersionId: t.versionId, aktif: 1, dicabut: 1, pencabutan: { alasan: 'Format tidak digunakan lagi' } });
    await expect(requests.create(adminOwner(), 'TEMPLATE', t.id, { jenis: 'REVOKE', alasan: 'Ulang' })).rejects.toMatchObject({ status: 409 });
    await expect(templates.remove(adminOwner(), t.id, {})).rejects.toMatchObject({ status: 409 });
    const v2 = await templates.newVersion(adminOwner(), t.id, await incomingFile('new.pdf', pdf), { tingkatAkses: 'PUBLIK' });
    expect((await templates.list({ q: suffix })).data[0]!.pencabutan).toBeTruthy();
    await templates.verify(second, t.id, v2.id, {});
    expect((await templates.list({ q: suffix })).data[0]!.pencabutan).toBeTruthy();
    await templates.publish(second, t.id, v2.id, {});
    expect((await templates.list({ q: suffix })).data[0]).not.toHaveProperty('pencabutan');
    const [history] = await pool.query<RowDataPacket[]>('SELECT status,revoked_reason,CAST(revoked_by AS CHAR) revokedBy FROM template_surat_versi WHERE id=?', [t.versionId]);
    expect(history[0]).toMatchObject({ status: 'ARCHIVED', revoked_reason: 'Format tidak digunakan lagi', revokedBy: second.id });
  });

  it('protects template revocation by role/state/version and rollback, keeps Internal templates private and closes direct requests', async () => {
    const { requests } = removalServices();
    const suffix = uid();
    const t = await templates.create(actor, await incomingFile('request.docx', minimalDocx()), { nama: `Internal ${suffix}`, slug: `internal-revoke-${suffix}`, tingkatAkses: 'INTERNAL' });
    const input = { versionId: t.versionId, alasan: 'Pencabutan internal' };
    await expect(templates.revoke(second, t.id, input)).rejects.toMatchObject({ status: 409 });
    await templates.verify(second, t.id, t.versionId, {}); await templates.publish(second, t.id, t.versionId, {});
    await pool.execute('UPDATE template_surat SET aktif=0 WHERE id=?', [t.id]);
    await expect(templates.revoke(second, t.id, input)).rejects.toMatchObject({ status: 409 });
    await expect(requests.create(adminOwner(), 'TEMPLATE', t.id, { jenis: 'REVOKE', alasan: input.alasan })).rejects.toMatchObject({ status: 409 });
    await pool.execute('UPDATE template_surat SET aktif=1 WHERE id=?', [t.id]);
    await expect(templates.revoke(adminOwner(), t.id, input)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(templates.revoke({ ...second, status: 'NONAKTIF' }, t.id, input)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(templates.revoke(second, t.id, { ...input, alasan: '' })).rejects.toThrow();
    await expect(templates.revoke(second, t.id, { ...input, versionId: '999999999' })).rejects.toMatchObject({ status: 409 });
    const request = await requests.create(adminOwner(), 'TEMPLATE', t.id, { jenis: 'REVOKE', alasan: input.alasan });
    const record = audit.recordDomain.bind(audit);
    const fail = vi.spyOn(audit, 'recordDomain').mockImplementation((event, db) => {
      if (event.action === 'REMOVAL_APPROVED') throw new Error('template revocation audit failure');
      return record(event, db);
    });
    await expect(requests.decide(second, request.id, { keputusan: 'APPROVE' })).rejects.toThrow('template revocation audit failure'); fail.mockRestore();
    expect((await templates.adminList(adminOwner())).find((r) => r.id === t.id)!.dicabut).toBe(0);
    const results = await Promise.allSettled([templates.revoke(second, t.id, input), templates.revoke(second, t.id, input)]);
    expect(results.map((r) => r.status).sort()).toEqual(['fulfilled', 'rejected']);
    expect((await requests.list(adminOwner(), { requestId: request.id, status: 'ALL' })).data[0]!.status).toBe('OBSOLETE');
    expect((await templates.list({ q: suffix })).meta.totalButir).toBe(0);
    await expect(templates.authorizeOpen(t.slug)).rejects.toMatchObject({ status: 404 });
    const staff = await addStaff();
    const visible = (await templates.list({ q: suffix }, staff)).data[0]!;
    expect(visible).toMatchObject({ pencabutan: { alasan: input.alasan }, tingkatAkses: 'INTERNAL' });
    const opened = await templates.openAuthorized(await templates.authorizeOpen(t.slug, staff), staff); opened.stream.destroy();
    await templates.remove(second, t.id, {});
    await expect(templates.authorizeOpen(t.slug, staff)).rejects.toMatchObject({ status: 404 });
    const [stored] = await pool.query<RowDataPacket[]>('SELECT revoked_reason FROM template_surat_versi WHERE id=?', [t.versionId]);
    expect(stored[0]!.revoked_reason).toBe(input.alasan);
  });

  it('rejects template revocation approval after publication changes and permits refusal without a note', async () => {
    const { requests } = removalServices(); const suffix = uid();
    const t = await templates.create(actor, await incomingFile('request.docx', minimalDocx()), { nama: `Format ${suffix}`, slug: `stale-revoke-${suffix}`, tingkatAkses: 'PUBLIK' });
    await templates.verify(second, t.id, t.versionId, {}); await templates.publish(second, t.id, t.versionId, {});
    const request = await requests.create(adminOwner(), 'TEMPLATE', t.id, { jenis: 'REVOKE', alasan: 'Versi lama' });
    const v2 = await templates.newVersion(adminOwner(), t.id, await incomingFile('request.docx', minimalDocx()), { tingkatAkses: 'PUBLIK' });
    await templates.verify(second, t.id, v2.id, {}); await templates.publish(second, t.id, v2.id, {});
    await expect(requests.decide(second, request.id, { keputusan: 'APPROVE' })).rejects.toMatchObject({ status: 409 });
    await expect(templates.revoke(second, t.id, { versionId: t.versionId, alasan: 'Lama' })).rejects.toMatchObject({ status: 409 });
    await requests.decide(second, request.id, { keputusan: 'DECLINE' });
    expect((await templates.adminList(adminOwner())).find((r) => r.id === t.id)).toMatchObject({ currentVersionId: v2.id, dicabut: 0 });
  });

  it('closes pending requests when Superadmin directly removes their target', async () => {
    const { requests, documents } = removalServices();
    const d = await publishedDoc();
    const request = await requests.create(adminOwner(), 'DOCUMENT', d.id, { jenis: 'DELETE', alasan: 'Tidak diperlukan' });
    await documents.hapusPermanen(second, d.id);
    await expect(requests.decide(second, request.id, { keputusan: 'APPROVE', catatan: 'Klik terlambat' })).rejects.toMatchObject({ status: 409 });
    expect((await requests.list(adminOwner(), { sumber: 'DOCUMENT', resourceId: d.id, status: 'ALL' })).data[0]).toMatchObject({ status: 'OBSOLETE' });
  });

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

  it('creates templates, preserves version history, enforces visibility and deletes from all lists', async () => {
    const suffix = uid();
    const first = await templates.create(
      actor,
      await incomingFile('surat.docx', minimalDocx()),
      { slug: `format-${suffix}`, nama: `Format Surat ${suffix}`, tingkatAkses: 'PUBLIK' },
    );
    await expect(templates.publish(actor, first.id, first.versionId, {})).rejects.toThrow('Setujui');
    await templates.verify(actor, first.id, first.versionId, {});
    await expect(templates.open(`format-${suffix}`)).rejects.toThrow();
    await templates.publish(actor, first.id, first.versionId, {});
    const publicList = await templates.list({ q: suffix, halaman: 1, perHalaman: 20 });
    expect(publicList.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: first.id, slug: `format-${suffix}`, kemampuan: { download: true, preview: false } }),
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
    await templates.verify(actor, first.id, next.id, {});
    expect((await templates.authorizeOpen(`format-${suffix}`)).id).toBe(first.versionId);
    await templates.publish(actor, first.id, next.id, {});
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
    await templates.remove(actor, first.id, {});
    const [deleted] = await pool.query<RowDataPacket[]>(
      'SELECT current_version_id,aktif,deleted_at FROM template_surat WHERE id=?', [first.id],
    );
    expect(deleted[0]?.current_version_id).toBeNull();
    expect(deleted[0]?.aktif).toBe(0);
    expect(deleted[0]?.deleted_at).not.toBeNull();
    expect(next.templateSuratId).toBe(first.id);
    const [retained] = await pool.query<RowDataPacket[]>(
      'SELECT status FROM template_surat_versi WHERE template_surat_id=? ORDER BY nomor_versi', [first.id],
    );
    expect(retained).toEqual(versions);
    expect(await templates.adminList(actor)).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: first.id })]));
    expect((await templates.list({ halaman: 1, perHalaman: 100 }, staff)).data).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: first.id })]));
    await expect(templates.open(`format-${suffix}`, staff)).rejects.toThrow();
    await expect(templates.review(actor, first.id, next.id)).rejects.toThrow();
    await expect(templates.newVersion(actor, first.id, await incomingFile('surat-reactivated.docx', minimalDocx()), { tingkatAkses: 'PUBLIK' })).rejects.toThrow();
    await expect(templates.publish(actor, first.id, next.id, {})).rejects.toThrow();
    await expect(templates.remove(actor, first.id, {})).rejects.toThrow();
    const anonim = (await templates.list({ halaman: 1, perHalaman: 20 })).data;
    expect(anonim).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: first.id })]));
    // Tanggapan anonim tidak boleh menyiratkan adanya tingkat akses lain.
    for (const item of anonim) expect(item).not.toHaveProperty('tingkatAkses');
  });

  it.each(['PENDING_REVIEW', 'APPROVED', 'ARCHIVED'])(
    'deletion handles unpublished %s templates and rolls back completely when audit fails',
    async (status) => {
      const admin = await addAdmin('ADMIN');
      const template = await templates.create(admin, await incomingFile('pending.docx', minimalDocx()), {
        slug: `delete-${uid()}`, nama: 'Format untuk hapus', tingkatAkses: 'PUBLIK',
      });
      if (status === 'APPROVED') await templates.verify(actor, template.id, template.versionId, {});
      if (status === 'ARCHIVED') await pool.execute("UPDATE template_surat_versi SET status='ARCHIVED',archived_at=UTC_TIMESTAMP(6) WHERE id=?", [template.versionId]);
      const auditSpy = vi.spyOn(audit, 'recordDomain').mockRejectedValueOnce(new Error('delete audit rollback'));
      const remover = status === 'APPROVED' ? actor : admin;
      try {
        await expect(templates.remove(remover, template.id, {})).rejects.toThrow('delete audit rollback');
      } finally { auditSpy.mockRestore(); }
      expect(await templates.adminList(actor)).toEqual(expect.arrayContaining([expect.objectContaining({ id: template.id })]));
      const [before] = await pool.query<RowDataPacket[]>('SELECT deleted_at FROM template_surat WHERE id=?', [template.id]);
      expect(before[0]?.deleted_at).toBeNull();
      await templates.remove(remover, template.id, {});
      expect(await templates.adminList(actor)).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: template.id })]));
      const [history] = await pool.query<RowDataPacket[]>('SELECT status,storage_key FROM template_surat_versi WHERE id=?', [template.versionId]);
      expect(history[0]?.status).toBe(status);
      expect(await storage.exists(String(history[0]!.storage_key))).toBe(true);
      await expect(templates.verify(actor, template.id, template.versionId, {})).rejects.toThrow();
      const [events] = await pool.query<RowDataPacket[]>("SELECT action FROM audit_log WHERE module='letter-templates' AND entity_type='template_surat' AND entity_id=? AND action='DELETE'", [template.id]);
      expect(events).toHaveLength(1);
    },
  );

  it('template ownership and verification queue isolate two Admin accounts and protect approved decisions', async () => {
    const owner = await addAdmin('ADMIN');
    const other = await addAdmin('ADMIN');
    const marker = uid();
    const own = await templates.create(owner, await incomingFile('owner.docx', minimalDocx()), {
      slug: `owner-${marker}`, nama: `Queue ${marker} A`, tingkatAkses: 'PUBLIK',
    });
    const foreign = await templates.create(other, await incomingFile('other.docx', minimalDocx()), {
      slug: `other-${marker}`, nama: `Queue ${marker} B`, tingkatAkses: 'PUBLIK',
    });
    expect((await templates.adminList(owner)).map(row => String(row.id))).toContain(own.id);
    expect((await templates.adminList(owner)).map(row => String(row.id))).not.toContain(foreign.id);
    expect((await templates.verificationQueue(owner, { q: marker })).data.map(row => row.templateSuratId)).toEqual([own.id, foreign.id]);
    expect((await templates.verificationQueue(actor, { q: marker })).data).toHaveLength(2);
    await expect(templates.newVersion(other, own.id, await incomingFile('attack.docx', minimalDocx()), { tingkatAkses: 'PUBLIK' })).rejects.toThrow();
    await expect(templates.remove(other, own.id, {})).rejects.toThrow();
    await expect(templates.review(other, own.id, own.versionId)).rejects.toThrow();
    const elevated: PenggunaAktif = { ...owner, izin: [...owner.izin, 'workflow.approve', 'workflow.publish'] };
    await expect(templates.verify(elevated, own.id, own.versionId, {})).rejects.toBeInstanceOf(ForbiddenException);
    await expect(templates.publish(elevated, own.id, own.versionId, {})).rejects.toBeInstanceOf(ForbiddenException);
    await templates.verify(actor, own.id, own.versionId, {});
    expect((await templates.verificationQueue(actor, { q: marker })).data.map(row => row.templateSuratId)).toEqual([own.id, foreign.id]);
    expect((await templates.verificationQueue(other, { q: marker })).data.find(row => row.templateSuratId === own.id)?.status).toBe('APPROVED');
    const review = await templates.review(other, own.id, own.versionId, { queue: true });
    for await (const chunk of review.stream) expect(chunk).toBeDefined();
    await expect(templates.newVersion(owner, own.id, await incomingFile('approved.docx', minimalDocx()), { tingkatAkses: 'PUBLIK' })).rejects.toThrow('dikunci');
    await expect(templates.remove(owner, own.id, {})).rejects.toThrow('hanya dapat dihapus Superadmin');
    await templates.publish(actor, own.id, own.versionId, {});
    expect((await templates.verificationQueue(actor, { q: marker })).data.map(row => row.templateSuratId)).toEqual([foreign.id]);
    await expect(templates.review(other, own.id, own.versionId, { queue: true })).rejects.toThrow();
    await expect(templates.remove(owner, own.id, {})).rejects.toThrow('hanya dapat dihapus Superadmin');
    const replacement = await templates.newVersion(owner, own.id, await incomingFile('revision.docx', minimalDocx()), { tingkatAkses: 'PUBLIK' });
    expect(replacement.status).toBe('PENDING_REVIEW');
    const [current] = await pool.query<RowDataPacket[]>('SELECT CAST(current_version_id AS CHAR) current FROM template_surat WHERE id=?', [own.id]);
    expect(current[0]?.current).toBe(own.versionId);
  });

  it('simultaneous publication and deletion cannot reactivate a deleted format', async () => {
    const template = await templates.create(actor, await incomingFile('concurrent.docx', minimalDocx()), {
      slug: `delete-race-${uid()}`, nama: 'Format bersamaan', tingkatAkses: 'PUBLIK',
    });
    await templates.verify(actor, template.id, template.versionId, {});
    const results = await Promise.allSettled([
      templates.remove(actor, template.id, {}),
      templates.publish(actor, template.id, template.versionId, {}),
    ]);
    expect(results[0]?.status).toBe('fulfilled');
    const [row] = await pool.query<RowDataPacket[]>('SELECT aktif,current_version_id,deleted_at FROM template_surat WHERE id=?', [template.id]);
    expect(row[0]).toMatchObject({ aktif: 0, current_version_id: null });
    expect(row[0]?.deleted_at).not.toBeNull();
  });

  it('PDF format previews remain readable in the approved queue until publication, Office uses download', async () => {
    const owner = await addAdmin('ADMIN');
    const other = await addAdmin('ADMIN');
    const suffix = uid();
    const pdf = Buffer.from('%PDF-1.7\nFormat preview fixture\n%%EOF');
    const template = await templates.create(owner, await incomingFile('format.pdf', pdf), {
      slug: `preview-${suffix}`, nama: `Preview ${suffix}`, tingkatAkses: 'PUBLIK',
    });
    await expect(templates.review(other, template.id, template.versionId, { preview: true })).rejects.toThrow();
    const reviewed = await templates.review(other, template.id, template.versionId, { queue: true, preview: true });
    const chunks: Buffer[] = [];
    for await (const chunk of reviewed.stream) chunks.push(chunk as Buffer);
    expect(Buffer.concat(chunks)).toEqual(pdf);
    await expect(templates.authorizeOpen(`preview-${suffix}`)).rejects.toThrow();
    await templates.verify(actor, template.id, template.versionId, {});
    const approved = await templates.review(other, template.id, template.versionId, { queue: true, preview: true });
    for await (const chunk of approved.stream) expect(chunk).toBeDefined();
    await templates.publish(actor, template.id, template.versionId, {});
    await expect(templates.review(other, template.id, template.versionId, { queue: true, preview: true })).rejects.toThrow();
    const published = await templates.openAuthorized(await templates.authorizeOpen(`preview-${suffix}`), undefined, true);
    expect(published.mimeType).toBe('application/pdf');
    published.stream.destroy();
    expect((await templates.list({ q: suffix })).data[0]?.kemampuan.preview).toBe(true);
    const office = await templates.create(owner, await incomingFile('format.docx', minimalDocx()), {
      slug: `office-${suffix}`, nama: `Office ${suffix}`, tingkatAkses: 'PUBLIK',
    });
    await expect(templates.review(other, office.id, office.versionId, { queue: true, preview: true })).rejects.toThrow('pratinjau');
    const download = await templates.review(other, office.id, office.versionId, { queue: true });
    expect(download.mimeType).toContain('wordprocessingml');
    download.stream.destroy();
    await templates.remove(owner, office.id, {});
    await expect(templates.review(other, office.id, office.versionId, { queue: true })).rejects.toThrow();
  });

  it('handles template slug collisions atomically without reusing deleted URLs or changing another owner publication', async () => {
    const owner = await addAdmin('ADMIN');
    const slug = `slug-collision-${uid()}`;
    const meta = { nama: 'Format dengan nama sama', slug, tingkatAkses: 'PUBLIK' };
    const first = await templates.create(actor, await incomingFile('first.docx', minimalDocx()), meta);
    await templates.verify(actor, first.id, first.versionId, {});
    await templates.publish(actor, first.id, first.versionId, {});
    await expect(templates.create(owner, await incomingFile('manual.docx', minimalDocx()), meta)).rejects.toMatchObject({ status: 409 });
    const automatic = await templates.create(owner, await incomingFile('auto.docx', minimalDocx()), { ...meta, modeSlug: 'otomatis' });
    expect(automatic.slug).not.toBe(slug);
    expect(automatic.status).toBe('PENDING_REVIEW');
    expect((await templates.authorizeOpen(slug)).id).toBe(first.versionId);
    await templates.remove(actor, first.id, {});
    const replacement = await templates.create(owner, await incomingFile('replacement.docx', minimalDocx()), { ...meta, modeSlug: 'otomatis' });
    expect(replacement.slug).not.toBe(slug);
    expect(replacement.slug).not.toBe(automatic.slug);
    await expect(templates.authorizeOpen(slug)).rejects.toThrow();
    const [old] = await pool.query<RowDataPacket[]>('SELECT deleted_at,current_version_id FROM template_surat WHERE id=?', [first.id]);
    expect(old[0]?.deleted_at).not.toBeNull();
    expect(old[0]?.current_version_id).toBeNull();
    const [history] = await pool.query<RowDataPacket[]>('SELECT id FROM template_surat_versi WHERE id=?', [first.versionId]);
    expect(history).toHaveLength(1);
    const parallelMeta = { ...meta, slug: `parallel-slug-${uid()}`, modeSlug: 'otomatis' };
    const parallelFiles = await Promise.all([incomingFile('one.docx', minimalDocx()), incomingFile('two.docx', minimalDocx())]);
    const concurrent = await Promise.all(parallelFiles.map(file => templates.create(owner, file, parallelMeta)));
    expect(new Set(concurrent.map(result => result.slug)).size).toBe(2);
    expect(concurrent.every(result => result.status === 'PENDING_REVIEW')).toBe(true);
    const [audited] = await pool.query<RowDataPacket[]>("SELECT JSON_UNQUOTE(JSON_EXTRACT(after_json,'$.slug')) slug FROM audit_log WHERE module='letter-templates' AND action='CREATE' AND entity_id=?", [replacement.id]);
    expect(audited[0]?.slug).toBe(replacement.slug);
  });

  it('keeps Admin template uploads pending until an active Superadmin verifies them', async () => {
    const suffix = uid();
    const admin = await addAdmin('ADMIN');
    const template = await templates.create(
      admin,
      await incomingFile('surat-awal.docx', minimalDocx()),
      { slug: `review-${suffix}`, nama: `Review ${suffix}`, tingkatAkses: 'PUBLIK' },
    );
    await templates.verify(actor, template.id, template.versionId, {});
    await templates.publish(actor, template.id, template.versionId, {});
    const pending = await templates.newVersion(
      admin,
      template.id,
      await incomingFile('surat-admin.docx', minimalDocx()),
      { tingkatAkses: 'PUBLIK' },
    );
    expect(pending.status).toBe('PENDING_REVIEW');
    const [beforeApproval] = await pool.query<RowDataPacket[]>(
      'SELECT CAST(current_version_id AS CHAR) current FROM template_surat WHERE id=?',
      [template.id],
    );
    expect(beforeApproval[0]?.current).toBe(template.versionId);
    await expect(templates.verify(admin, template.id, pending.id, {})).rejects.toBeInstanceOf(ForbiddenException);
    await expect(templates.open(`review-${suffix}`)).resolves.toMatchObject({
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    await templates.verify(actor, template.id, pending.id, {});
    expect((await templates.authorizeOpen(`review-${suffix}`)).id).toBe(template.versionId);
    await expect(templates.publish(admin, template.id, pending.id, {})).rejects.toBeInstanceOf(ForbiddenException);
    await templates.publish(actor, template.id, pending.id, {});
    const [afterApproval] = await pool.query<RowDataPacket[]>(
      'SELECT CAST(current_version_id AS CHAR) current FROM template_surat WHERE id=?',
      [template.id],
    );
    expect(afterApproval[0]?.current).toBe(pending.id);
    const [versions] = await pool.query<RowDataPacket[]>(
      'SELECT status FROM template_surat_versi WHERE template_surat_id=? ORDER BY nomor_versi',
      [template.id],
    );
    expect(versions.map((row) => String(row.status))).toEqual(['ARCHIVED', 'ACTIVE']);

    const newTemplate = await templates.create(
      admin,
      await incomingFile('surat-tertunda.docx', minimalDocx()),
      { slug: `review-new-${suffix}`, nama: `Review Baru ${suffix}`, tingkatAkses: 'PUBLIK' },
    );
    expect(newTemplate.status).toBe('PENDING_REVIEW');
    expect((await templates.list({ halaman: 1, perHalaman: 100 })).data).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ slug: `review-new-${suffix}` })]),
    );
    await templates.verify(actor, newTemplate.id, newTemplate.versionId, {});
    await expect(templates.open(`review-new-${suffix}`)).rejects.toThrow();
    await expect(templates.verify(actor, newTemplate.id, newTemplate.versionId, {})).rejects.toThrow();
    const [original] = await pool.query<RowDataPacket[]>('SELECT checksum FROM template_surat_versi WHERE id=?', [newTemplate.versionId]);
    await pool.execute('UPDATE template_surat_versi SET checksum=? WHERE id=?', [Buffer.alloc(32), newTemplate.versionId]);
    await expect(templates.publish(actor, newTemplate.id, newTemplate.versionId, {})).rejects.toThrow('checksum');
    await pool.execute('UPDATE template_surat_versi SET checksum=? WHERE id=?', [original[0]!.checksum, newTemplate.versionId]);
    const auditFailure = vi.spyOn(audit, 'recordDomain').mockRejectedValueOnce(new Error('Publish audit rollback'));
    await expect(templates.publish(actor, newTemplate.id, newTemplate.versionId, {})).rejects.toThrow('Publish audit rollback');
    auditFailure.mockRestore();
    const [unpublished] = await pool.query<RowDataPacket[]>('SELECT status,activated_at FROM template_surat_versi WHERE id=?', [newTemplate.versionId]);
    expect(unpublished[0]!.status).toBe('APPROVED');
    expect(unpublished[0]!.activated_at).toBeNull();
    await expect(templates.open(`review-new-${suffix}`)).rejects.toThrow();
    const concurrent = await Promise.allSettled([templates.publish(actor, newTemplate.id, newTemplate.versionId, {}), templates.publish(actor, newTemplate.id, newTemplate.versionId, {})]);
    expect(concurrent.map(result => result.status).sort()).toEqual(['fulfilled', 'rejected']);
    expect((await templates.list({ halaman: 1, perHalaman: 100 })).data).toEqual(
      expect.arrayContaining([expect.objectContaining({ slug: `review-new-${suffix}` })]),
    );
    const [verificationAudit] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) total FROM audit_log WHERE module='letter-templates' AND action='APPROVE_VERSION' AND entity_id=? AND actor_id=?",
      [pending.id, actor.id],
    );
    expect(Number(verificationAudit[0]?.total)).toBe(1);
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

  it.each([null, 'PERMOHONAN_SK'])('approval stays queued and only publication moves collection %s to all documents, including revisions and rollback', async (peruntukan) => {
    const owner = await addAdmin('ADMIN');
    const reader = await addAdmin('ADMIN');
    const marker = uid();
    const [types] = await pool.query<RowDataPacket[]>("SELECT id FROM jenis_dokumen WHERE kode='SOP' AND aktif=1 LIMIT 1");
    const metadata = { ...ready(`Queue ${marker}`), kategoriId: [] };
    const document = await service.createDocument(owner, { kodeDokumen: marker, slug: `queue-${marker}`, jenisDokumenId: String(types[0]!.id), peruntukan, versi: metadata });
    const queue = (statusWorkflow?: string) => service.adminDocuments(reader, { q: marker, statusWorkflow, perHalaman: 1 }, true);
    const all = () => service.adminDocuments(owner, { q: marker });
    expect((await queue()).meta.totalButir).toBe(0);
    await addFileMetadata(document.versionId, 'UTAMA');
    await service.transition(owner, document.versionId, 'SUBMIT');
    expect((await queue()).data[0]?.statusWorkflow).toBe('DIAJUKAN');
    await approve(document.versionId);
    expect((await queue()).data[0]).toMatchObject({ versionId: document.versionId, statusWorkflow: 'DISETUJUI' });
    expect((await queue('DIAJUKAN')).meta.totalButir).toBe(0);
    expect((await queue('DISETUJUI')).meta.totalButir).toBe(1);
    expect((await all()).meta.totalButir).toBe(0);
    await publish(document.versionId);
    expect((await queue()).meta.totalButir).toBe(0);
    expect((await all()).data[0]?.versionId).toBe(document.versionId);
    const revision = await service.newVersion(owner, document.id, metadata);
    await addFileMetadata(revision.id, 'UTAMA');
    await service.transition(owner, revision.id, 'SUBMIT');
    await approve(revision.id);
    expect((await queue()).data[0]?.versionId).toBe(revision.id);
    expect((await all()).data.map(row => String(row.versionId))).toEqual([document.versionId]);
    const failure = vi.spyOn(audit, 'recordDomain').mockRejectedValueOnce(new Error('publish rollback'));
    try { await expect(publish(revision.id)).rejects.toThrow('publish rollback'); } finally { failure.mockRestore(); }
    expect((await queue()).data[0]?.statusWorkflow).toBe('DISETUJUI');
    expect((await all()).meta.totalButir).toBe(1);
    await publish(revision.id);
    expect((await queue()).meta.totalButir).toBe(0);
    expect((await all()).data.map(row => String(row.versionId))).toEqual([revision.id, document.versionId]);
  });

  it.each([null, 'PERMOHONAN_SK'])('Admin dapat mengajukan tanpa kategori untuk koleksi %s, unit dan batas kategori tetap diperiksa', async (peruntukan) => {
    const owner = await addAdmin('ADMIN');
    const [types] = await pool.query<RowDataPacket[]>("SELECT id FROM jenis_dokumen WHERE kode='SOP' AND aktif=1 LIMIT 1");
    const marker = uid();
    const payload = { kodeDokumen: marker, slug: `tanpa-kategori-${marker}`, jenisDokumenId: String(types[0]!.id), peruntukan,
      versi: { ...ready(`Dokumen tanpa kategori ${marker}`), kategoriId: [] } };
    const d = await service.createDocument(owner, payload);
    await expect(service.updateVersion(owner, d.versionId, { kategoriId: [defaultCategoryId] })).rejects.toThrow();
    const before = await service.document(owner, d.id);
    expect(before.kategoriId).toEqual([]);
    expect(before.document.unitKerjaId).toBe(owner.unitKerjaId);
    await files.upload(owner, d.versionId, await incomingFile('tanpa-kategori.pdf', Buffer.from('%PDF-1.7\ncategory optional fixture\n%%EOF\n')), { jenisBerkas: 'UTAMA' });
    await service.transition(owner, d.versionId, 'SUBMIT');
    await approve(d.versionId);
    expect((await service.document(owner, d.id)).document.currentPublishedVersionId).toBeNull();
    await publish(d.versionId);
    const published = await service.document(owner, d.id);
    expect(published.kategoriId).toEqual([]);
    expect(published.document.currentPublishedVersionId).toBe(d.versionId);
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
    await expect(service.newVersion(other, d.id, ready('Revisi tidak berhak', level))).rejects.toThrow();
    await expect(service.updateDocument(other, d.id, { slug: `dicoba-${marker}` })).rejects.toThrow();
    await expect(files.removeFromDraft(other, d.versionId, uploaded.id)).rejects.toThrow();
    await expect(service.transition(other, d.versionId, 'SUBMIT')).rejects.toThrow();
    expect(await files.listForVersion(other, d.versionId)).toEqual([]);
    await expect(service.document(other, d.id)).rejects.toThrow();
    const elevated: PenggunaAktif = { ...owner, izin: [...owner.izin, 'workflow.approve', 'workflow.return', 'workflow.publish'] };
    await expect(service.transition(elevated, d.versionId, 'APPROVE')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.publish(elevated, d.versionId, {})).rejects.toBeInstanceOf(ForbiddenException);
    await service.transition(owner, d.versionId, 'SUBMIT');
    expect(await files.listForVersion(other, d.versionId)).toEqual(expect.arrayContaining([expect.objectContaining({ id: uploaded.id })]));
    await expect(files.authorizeVersion(other, d.versionId, uploaded.id)).resolves.toMatchObject({ mime_type: 'application/pdf' });
    expect((await service.document(other, d.id, d.versionId)).document).toMatchObject({ bolehUbah: false, bolehRevisi: false });
    expect((await search.permohonanSk({ q: marker })).data).toHaveLength(0);
    expect((await service.notifications(actor)).some(row => row.versionId === d.versionId && row.action === 'SUBMIT')).toBe(true);
    await service.transition(actor, d.versionId, 'RETURN', 'Perbaiki deskripsi prosedur');
    expect((await service.notifications(owner)).some(row => row.versionId === d.versionId && row.action === 'RETURN')).toBe(true);
    await service.updateVersion(owner, d.versionId, { deskripsi: 'Prosedur diperbaiki sesuai catatan Superadmin' });
    await service.transition(owner, d.versionId, 'SUBMIT');
    await expect(service.impact(actor, d.versionId)).rejects.toThrow();
    await expect(service.transition(actor, d.versionId, 'APPROVE')).resolves.toMatchObject({ statusWorkflow: 'DISETUJUI' });
    expect(await files.listForVersion(other, d.versionId)).toEqual(expect.arrayContaining([expect.objectContaining({ id: uploaded.id })]));
    await expect(files.authorizeVersion(other, d.versionId, uploaded.id)).resolves.toMatchObject({ mime_type: 'application/pdf' });
    expect((await service.document(other, d.id)).document).toMatchObject({ statusWorkflow: 'DISETUJUI', bolehUbah: false });
    expect((await search.permohonanSk({ q: marker }, await addStaff())).data).toHaveLength(0);
    await publish(d.versionId);
    expect(await files.listForVersion(other, d.versionId)).toEqual([]);
    await expect(files.authorizeVersion(other, d.versionId, uploaded.id)).rejects.toThrow();
    await expect(service.document(other, d.id)).rejects.toThrow();
    expect((await service.notifications(owner)).some(row => row.versionId === d.versionId && row.action === 'APPROVE')).toBe(true);
    expect((await service.notifications(actor)).some(row => (!row.jenis || row.jenis === 'DOCUMENT') && row.versionId === d.versionId)).toBe(false);
    expect((await search.permohonanSk({ q: marker })).data).toHaveLength(level === 'publik' ? 1 : 0);
    expect((await search.permohonanSk({ q: marker }, await addStaff())).data).toHaveLength(1);
    const [events] = await pool.query<RowDataPacket[]>('SELECT action FROM dokumen_workflow WHERE dokumen_versi_id=? ORDER BY id', [d.versionId]);
    expect(events.map(row => String(row.action))).toEqual(['CREATE', 'SUBMIT', 'RETURN', 'SUBMIT', 'APPROVE', 'PUBLISH']);
  });

  it.each(['publik', 'internal'] as const)('SOP Permohonan SK %s disetujui dahulu lalu diterbitkan, mempertahankan versi dan akses', async (level) => {
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
    await expect(service.impact(actor, d.versionId)).rejects.toThrow();
    await approve(d.versionId);
    expect((await search.permohonanSk({ q: marker }, actor)).data).toHaveLength(0);
    await publish(d.versionId);
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
    await approve(revision.id);
    const fail = vi.spyOn(files, 'assertPublishReady').mockRejectedValueOnce(new Error('Simulasi storage gagal'));
    await expect(publish(revision.id)).rejects.toThrow('Simulasi storage gagal');
    fail.mockRestore();
    const [rolledBack] = await pool.query<RowDataPacket[]>('SELECT status_workflow FROM dokumen_versi WHERE id=?', [revision.id]);
    expect(rolledBack[0]!.status_workflow).toBe('DISETUJUI');
    const [current] = await pool.query<RowDataPacket[]>('SELECT current_published_version_id FROM dokumen WHERE id=?', [d.id]);
    expect(String(current[0]!.current_published_version_id)).toBe(d.versionId);
    await publish(revision.id);
    const [history] = await pool.query<RowDataPacket[]>('SELECT superseded_at FROM dokumen_versi WHERE id=?', [d.versionId]);
    expect(history[0]!.superseded_at).not.toBeNull();
    const [events] = await pool.query<RowDataPacket[]>('SELECT action FROM dokumen_workflow WHERE dokumen_versi_id=? ORDER BY id', [revision.id]);
    expect(events.map(row => String(row.action))).toEqual(['CREATE', 'APPROVE', 'PUBLISH']);
  });
});
