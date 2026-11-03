import 'reflect-metadata';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import mysql, {
  type Connection,
  type Pool,
  type ResultSetHeader,
  type RowDataPacket,
} from 'mysql2/promise';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { skemaBerandaPublik, skemaTanggapan, type BerandaPublik } from '@jdih/shared';
import { IdentityRepository, utc } from '../../identity/identity.repository.js';
import { IdentityService } from '../../identity/identity.service.js';
import { AuditService } from '../../identity/audit.service.js';
import { acak, hashToken } from '../../identity/security.js';
import { CoreBackendRepository } from '../core-backend.repository.js';
import { BungkusTanggapanInterceptor } from '../../../common/interceptors/bungkus-tanggapan.interceptor.js';
import { HomeRepository } from './home.repository.js';
import { HomeService } from './home.service.js';
import { HomeController } from './home.controller.js';

/** HTTP + sesi + SQL nyata. Seluruh fixture dalam satu transaksi yang di-rollback. */
describe.skipIf(!process.env.IDENTITY_TEST_ENV)('beranda sesuai akses: MySQL dan HTTP', () => {
  let db: Connection;
  let app: INestApplication | undefined;
  let base: string;
  let connected = false;
  let typeId: string, sopTypeId: string, categoryId: string, unitId: string, viewerUnitId: string;
  let authorId: string, publicId: string, internalId: string, internalSopId: string;
  let baseline: Record<string, number> | undefined;
  const tokens: Record<string, string> = {};
  const marker = randomUUID().replaceAll('-', '');
  const tracked = [
    'pengguna',
    'sesi_pengguna',
    'jenis_dokumen',
    'kategori',
    'unit_kerja',
    'dokumen',
    'dokumen_versi',
  ];

  async function insert(sql: string, values: (string | number | Buffer | null)[] = []) {
    const [result] = await db.execute<ResultSetHeader>(sql, values);
    return String(result.insertId);
  }
  async function counts() {
    const result: Record<string, number> = {};
    for (const table of tracked) {
      const [rows] = await db.query<RowDataPacket[]>(`SELECT COUNT(*) n FROM ${table}`);
      result[table] = Number(rows[0]!.n);
    }
    return result;
  }
  async function account(
    name: string,
    role: 'DOSEN_STAF' | 'ADMIN' | 'SUPERADMIN',
    status = 'AKTIF',
  ) {
    const id = await insert(
      "INSERT INTO pengguna(email,nama,status,verified_at,unit_kerja_id) VALUES(?,?,?,IF(?='AKTIF',UTC_TIMESTAMP(6),NULL),?)",
      [`home-${name}-${marker}@example.com`, `Home ${name}`, status, status, viewerUnitId],
    );
    await insert(
      'INSERT INTO pengguna_peran(pengguna_id,peran_id) SELECT ?,id FROM peran WHERE kode=?',
      [id, role],
    );
    const token = acak();
    await insert(
      'INSERT INTO sesi_pengguna(pengguna_id,token_hash,created_at,expires_at) VALUES(?,?,DATE_SUB(UTC_TIMESTAMP(6),INTERVAL 2 HOUR),DATE_ADD(UTC_TIMESTAMP(6),INTERVAL 1 HOUR))',
      [id, hashToken(token)],
    );
    tokens[name] = token;
    return id;
  }
  async function document(
    type: string,
    access: 'publik' | 'internal',
    title: string,
    options: {
      special?: boolean;
      state?: 'DRAF' | 'TERBIT' | 'DITARIK';
      deleted?: boolean;
      year?: number;
    } = {},
  ) {
    const slug = `home-${title}-${marker}`;
    const id = await insert(
      'INSERT INTO dokumen(kode_dokumen,slug,jenis_dokumen_id,peruntukan,created_by) VALUES(?,?,?,?,?)',
      [slug, slug, type, options.special ? 'PERMOHONAN_SK' : null, authorId],
    );
    const status = options.state ?? 'TERBIT';
    const published = status !== 'DRAF';
    const time = utc();
    const version = await insert(
      'INSERT INTO dokumen_versi(dokumen_id,nomor_versi,status_workflow,tingkat_akses,nomor,tahun,judul,deskripsi,pic,unit_kerja_id,tanggal_penetapan,created_by,verified_by,approved_at,published_by,published_at,withdrawn_at,withdrawal_reason) VALUES(?,1,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [
        id,
        status,
        access,
        '1',
        options.year ?? 2026,
        title,
        'Fixture beranda',
        'Unit Pengujian',
        unitId,
        '2026-01-01',
        authorId,
        published ? authorId : null,
        published ? time : null,
        published ? authorId : null,
        published ? time : null,
        status === 'DITARIK' ? time : null,
        status === 'DITARIK' ? 'Fixture ditarik' : null,
      ],
    );
    if (status === 'TERBIT')
      await db.execute('UPDATE dokumen SET current_published_version_id=? WHERE id=?', [
        version,
        id,
      ]);
    if (options.deleted)
      await db.execute('UPDATE dokumen SET deleted_at=UTC_TIMESTAMP(6) WHERE id=?', [id]);
    if (type === sopTypeId)
      await insert('INSERT INTO dokumen_versi_kategori(dokumen_versi_id,kategori_id) VALUES(?,?)', [
        version,
        categoryId,
      ]);
    return { id, version };
  }

  beforeAll(async () => {
    const env = parseEnv(readFileSync(process.env.IDENTITY_TEST_ENV!, 'utf8'));
    if (
      env.DB_NAME !== 'jdih_ith_v2_test' ||
      !['127.0.0.1', 'localhost', '::1'].includes(env.DB_HOST ?? '')
    )
      throw new Error('Unsafe home test database');
    db = await mysql.createConnection({
      host: env.DB_HOST,
      port: Number(env.DB_PORT),
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
      timezone: 'Z',
      dateStrings: ['DATE', 'DATETIME'],
      supportBigNumbers: true,
      bigNumberStrings: true,
    });
    connected = true;
    const [engine] = await db.query<RowDataPacket[]>('SELECT VERSION() version,DATABASE() db');
    if (!String(engine[0]?.version).startsWith('8.4.') || engine[0]?.db !== 'jdih_ith_v2_test')
      throw new Error('Unexpected home database');
    await db.query("SET time_zone='+00:00'");
    baseline = await counts();
    await db.beginTransaction();
    unitId = await insert('INSERT INTO unit_kerja(kode,nama) VALUES(?,?)', [
      `HD-${marker}`,
      'Unit dokumen beranda',
    ]);
    viewerUnitId = await insert('INSERT INTO unit_kerja(kode,nama) VALUES(?,?)', [
      `HV-${marker}`,
      'Unit pembaca berbeda',
    ]);
    categoryId = await insert('INSERT INTO kategori(kode,nama) VALUES(?,?)', [
      `HC-${marker}`,
      'Kategori fixture beranda',
    ]);
    typeId = await insert('INSERT INTO jenis_dokumen(kode,nama,urutan) VALUES(?,?,0)', [
      `HT-${marker}`,
      'Peraturan fixture beranda',
    ]);
    sopTypeId = await insert('INSERT INTO jenis_dokumen(kode,nama,urutan) VALUES(?,?,0)', [
      `HS-${marker}`,
      'Prosedur fixture beranda',
    ]);
    authorId = await account('superadmin', 'SUPERADMIN');
    await account('admin', 'ADMIN');
    await account('staff', 'DOSEN_STAF');
    await account('pending', 'DOSEN_STAF', 'MENUNGGU_VERIFIKASI');
    for (const name of ['revoked', 'expired', 'inactive', 'deleted']) {
      const userId = await account(name, 'DOSEN_STAF');
      if (name === 'revoked')
        await db.execute(
          'UPDATE sesi_pengguna SET revoked_at=UTC_TIMESTAMP(6) WHERE pengguna_id=?',
          [userId],
        );
      if (name === 'expired')
        await db.execute(
          'UPDATE sesi_pengguna SET expires_at=DATE_SUB(UTC_TIMESTAMP(6),INTERVAL 1 HOUR) WHERE pengguna_id=?',
          [userId],
        );
      if (name === 'inactive' || name === 'deleted')
        await db.execute(
          "UPDATE pengguna SET status='NONAKTIF',deleted_at=IF(?='deleted',UTC_TIMESTAMP(6),NULL) WHERE id=?",
          [name, userId],
        );
    }
    const publicDoc = await document(typeId, 'publik', 'public-current');
    publicId = publicDoc.id;
    internalId = (await document(typeId, 'internal', 'internal-current', { year: 2045 })).id;
    await document(typeId, 'internal', 'draft-hidden', { state: 'DRAF', year: 2046 });
    await document(typeId, 'publik', 'withdrawn-hidden', { state: 'DITARIK', year: 2047 });
    await document(typeId, 'publik', 'deleted-hidden', { deleted: true, year: 2048 });
    await document(sopTypeId, 'publik', 'sop-public');
    internalSopId = (await document(sopTypeId, 'internal', 'sop-internal')).id;
    await document(sopTypeId, 'internal', 'special-sk-hidden', { special: true, year: 2049 });
    const time = utc();
    await insert(
      "INSERT INTO dokumen_versi(dokumen_id,nomor_versi,status_workflow,tingkat_akses,nomor,tahun,judul,pic,tanggal_penetapan,created_by,verified_by,approved_at,published_by,published_at,superseded_at) VALUES(?,2,'TERBIT','internal','2',2050,'superseded-hidden','PIC','2026-01-01',?,?,?,?,?,?)",
      [publicId, authorId, authorId, time, authorId, time, time],
    );
    const core = new CoreBackendRepository(db as unknown as Pool);
    const identities = new IdentityRepository(db as unknown as Pool);
    const identity = new IdentityService(
      identities,
      new AuditService(identities),
      new ConfigService({}),
    );
    const module = await Test.createTestingModule({
      controllers: [HomeController],
      providers: [
        { provide: HomeService, useValue: new HomeService(new HomeRepository(core)) },
        { provide: IdentityService, useValue: identity },
      ],
    }).compile();
    app = module.createNestApplication({ logger: false });
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    app.useGlobalInterceptors(new BungkusTanggapanInterceptor());
    await app.listen(0, '127.0.0.1');
    const server = app.getHttpServer() as Server;
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  }, 15000);

  afterAll(async () => {
    await app?.close();
    if (connected) {
      await db.rollback();
      if (baseline) expect(await counts()).toEqual(baseline);
      await db.end();
    }
  });

  async function get(name?: string) {
    const res = await fetch(`${base}/api/v1/public/home?internal=true`, {
      headers: name ? { Cookie: `jdih_session=${tokens[name] ?? name}` } : {},
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(res.headers.get('vary')).toContain('Cookie');
    const value: unknown = await res.json();
    return skemaTanggapan(skemaBerandaPublik).parse(value).data;
  }
  function assertSnapshot(snapshot: BerandaPublik, internal: boolean) {
    expect(snapshot.jenis.find((row) => row.id === typeId)).toMatchObject({
      jumlah: internal ? 2 : 1,
      dokumen: { id: internal ? internalId : publicId },
    });
    const sop = snapshot.jenis.find((row) => row.id === sopTypeId)!;
    expect(sop.jumlah).toBe(internal ? 2 : 1);
    if (internal) expect(sop.dokumen?.id).toBe(internalSopId);
    expect(snapshot.kategori.find((row) => row.id === categoryId)?.jumlah).toBe(internal ? 2 : 1);
    expect(snapshot.tahun.includes(2045)).toBe(internal);
    for (const year of [2046, 2047, 2048, 2049, 2050]) expect(snapshot.tahun).not.toContain(year);
    expect(JSON.stringify(snapshot)).not.toMatch(
      /draft-hidden|withdrawn-hidden|deleted-hidden|special-sk-hidden|superseded-hidden/,
    );
  }
  it.each(['staff', 'admin', 'superadmin'])(
    '%s mendapat dokumen terbaru Internal dan jumlah lintas unit',
    async (name) => {
      assertSnapshot(await get(name), true);
    },
  );
  it.each([undefined, 'pending', 'revoked', 'expired', 'inactive', 'deleted', 'invalid-token'])(
    '%s hanya mendapat Publik, tanpa bocoran tahun atau hitungan Internal',
    async (name) => {
      assertSnapshot(await get(name), false);
    },
  );
  it('request Publik/Internal serentak tetap terpisah dan akun pending tidak menaikkan jumlah', async () => {
    const names = [undefined, 'staff', 'pending', 'admin', undefined, 'superadmin'];
    const results = await Promise.all(names.map((name) => get(name)));
    results.forEach((snapshot, i) =>
      assertSnapshot(snapshot, ['staff', 'admin', 'superadmin'].includes(names[i] ?? '')),
    );
  });
});
