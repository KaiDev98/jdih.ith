import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { PenggunaAktif } from '@jdih/shared';
import { CoreBackendService } from './core-backend.service.js';

function fixture(status: PenggunaAktif['status'], izin: PenggunaAktif['izin']): PenggunaAktif {
  return {
    id: '11',
    nama: 'Test user',
    surel: 'test@ith.ac.id',
    status,
    unitKerjaId: null,
    unitManual: null,
    avatarUrl: null,
    peran: ['DOSEN_STAF'],
    izin,
  };
}

describe('CoreBackendService authorization boundary', () => {
  const setup = () => {
    const repo = { transaction: vi.fn(), pool: {}, rows: vi.fn().mockResolvedValue([]) };
    const audit = { recordDomain: vi.fn() };
    const service = new CoreBackendService(repo as never, audit as never, {} as never, {} as never, { assertPublishReady: vi.fn() } as never);
    return { repo, service };
  };

  it('rejects pending Dosen/Staf before touching repositories', async () => {
    const { repo, service } = setup();
    await expect(
      service.createDocument(fixture('MENUNGGU_VERIFIKASI', ['documents.create']), {}),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repo.transaction).not.toHaveBeenCalled();
  });

  it('requires the specific server-side permission on active accounts', async () => {
    const { repo, service } = setup();
    await expect(service.createDocument(fixture('AKTIF', []), {})).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(repo.transaction).not.toHaveBeenCalled();
  });

  it('rejects actor authority fields from document payloads', async () => {
    const { repo, service } = setup();
    await expect(
      service.createDocument(fixture('AKTIF', ['documents.create']), {
        kodeDokumen: 'TEST',
        slug: 'test',
        jenisDokumenId: '1',
        createdBy: '999',
        versi: { judul: 'Test', tingkatAkses: 'publik' },
      }),
    ).rejects.toThrow();
    expect(repo.transaction).not.toHaveBeenCalled();
  });

  it('rejects unrecognized master table names before constructing SQL', async () => {
    const { repo, service } = setup();
    await expect(
      service.masterList(fixture('AKTIF', ['master.manage']), 'users' as never),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.rows).not.toHaveBeenCalled();
  });

  it('protects administrative list queries and allowlists public master lookup', async () => {
    const { repo, service } = setup();
    const user = fixture('AKTIF', []);
    await expect(service.adminDocuments(user, {})).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.adminDocuments(user, {}, true)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.auditList(user, {})).rejects.toBeInstanceOf(ForbiddenException);
    expect(repo.rows).not.toHaveBeenCalled();
    await expect(service.publicMaster('jenis_dokumen')).resolves.toEqual([]);
    expect(repo.rows).toHaveBeenCalledWith({}, expect.stringContaining('WHERE aktif=1 ORDER BY urutan,nama'));
    await expect(service.publicMaster('constructor' as never)).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('CoreBackendService unit kerja mengikuti kategori SOP', () => {
  const superadmin = { ...fixture('AKTIF', ['master.manage', 'units.manage']), peran: ['SUPERADMIN'] } as PenggunaAktif;
  const setup = (sebelum?: Record<string, unknown>) => {
    const db = {};
    const repo = {
      pool: {},
      transaction: vi.fn((fn: (d: unknown) => unknown) => fn(db)),
      rows: vi.fn().mockResolvedValue(sebelum ? [sebelum] : []),
      write: vi.fn().mockResolvedValue({ affectedRows: 1 }),
      id: vi.fn().mockResolvedValue('12'),
    };
    const audit = { recordDomain: vi.fn() };
    const service = new CoreBackendService(repo as never, audit as never, {} as never, {} as never, { assertPublishReady: vi.fn() } as never);
    const sql = () => repo.write.mock.calls.map((c) => [String(c[1]), c[2]] as const);
    return { repo, service, sql };
  };

  it('menolak penulisan unit kerja langsung', async () => {
    const { repo, service } = setup();
    await expect(
      service.masterSave(superadmin, 'unit_kerja', null, { kode: 'X', nama: 'X' }),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      service.masterStatus(superadmin, 'unit_kerja', '1', { aktif: false }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repo.transaction).not.toHaveBeenCalled();
  });

  it('kategori baru langsung menjadi unit kerja dengan kode dan nama yang sama', async () => {
    const { service, sql } = setup();
    await service.masterSave(superadmin, 'kategori', null, { kode: 'SOP-HUKUM', nama: 'Bagian Hukum' });
    expect(sql()).toContainEqual([
      expect.stringContaining('INSERT INTO unit_kerja(kode,nama,aktif)'),
      ['SOP-HUKUM', 'Bagian Hukum', true],
    ]);
  });

  it('mengganti kode kategori ikut mengganti kode unitnya', async () => {
    const { service, sql } = setup({ id: '3', kode: 'SOP-SPI', nama: 'SPI' });
    await service.masterSave(superadmin, 'kategori', '3', { kode: 'SOP-PENGAWAS', nama: 'SPI', aktif: true });
    expect(sql()).toContainEqual([
      expect.stringContaining('UPDATE IGNORE unit_kerja SET kode=?'),
      ['SOP-PENGAWAS', 'SOP-SPI'],
    ]);
  });

  it('menonaktifkan kategori ikut menonaktifkan unitnya', async () => {
    const { service, sql } = setup({ id: '3', aktif: 1 });
    await service.masterStatus(superadmin, 'kategori', '3', { aktif: false });
    expect(sql()).toContainEqual([expect.stringContaining('UPDATE unit_kerja u JOIN kategori k'), ['3']]);
  });
});

describe('CoreBackendService status peraturan (seperti JDIH BPK)', () => {
  const admin: PenggunaAktif = {
    ...fixture('AKTIF', ['legal.manage_relations', 'documents.read_admin']),
    peran: ['ADMIN'],
  };
  interface Baris { jenis: string; dokumen: { id: string } }
  /** Akses method privat untuk diuji langsung, dengan tipe yang jelas. */
  const statusPeraturan = (service: CoreBackendService) =>
    (service as unknown as { statusPeraturan: (id: string) => Promise<Baris[]> }).statusPeraturan.bind(
      service,
    );
  const setup = (rows: unknown[][]) => {
    const db = {};
    const repo = {
      pool: {},
      transaction: vi.fn((fn: (d: unknown) => unknown) => fn(db)),
      rows: vi.fn(),
      write: vi.fn().mockResolvedValue({ affectedRows: 1 }),
      id: vi.fn().mockResolvedValue('77'),
    };
    for (const r of rows) repo.rows.mockResolvedValueOnce(r);
    // Kebijakan baca tiruan: dokumen bertingkat "internal" tertutup bagi peminta.
    const policy = {
      assertRead: vi.fn((res: { tingkatAkses: string }) => {
        if (res.tingkatAkses === 'internal') throw new NotFoundException();
      }),
    };
    const service = new CoreBackendService(
      repo as never,
      { recordDomain: vi.fn() } as never,
      {} as never,
      policy,
      { assertPublishReady: vi.fn() } as never,
    );
    return { repo, service };
  };
  const dok = (id: string, jenisRelasi: string, tingkatAkses = 'publik') => ({
    jenisRelasi,
    id,
    slug: `dok-${id}`,
    tipe: 'Peraturan Rektor',
    judul: `Dokumen ${id}`,
    nomor: id,
    tahun: 2026,
    tingkatAkses,
  });

  it('menyusun dua arah: dicabut/diubah dengan, lalu mencabut/mengubah; yang tertutup dilewati', async () => {
    const { service } = setup([
      [dok('8', 'MENGUBAH'), dok('9', 'MENCABUT'), dok('10', 'MENCABUT', 'internal')],
      [dok('3', 'MENGUBAH'), dok('2', 'MENCABUT')],
    ]);
    const hasil = await statusPeraturan(service)('5');
    expect(hasil.map((x) => `${x.jenis}:${x.dokumen.id}`)).toEqual([
      'DICABUT_DENGAN:9',
      'DIUBAH_DENGAN:8',
      'MENCABUT:2',
      'MENGUBAH:3',
    ]);
    expect(hasil[0]?.dokumen).not.toHaveProperty('tingkatAkses');
  });

  it('hanya dokumen terbit dan belum dicabut yang dapat diubah atau dicabut', async () => {
    const belumTerbit = setup([
      [{ dokumen_id: '5', status_workflow: 'DRAF', created_by: '11', document_created_by: '11', peruntukan: null }],
      [{ id: '9', created_by: '11', published_version_created_by: '11', status_hukum: 'BERLAKU', current_published_version_id: null }],
    ]);
    await expect(
      belumTerbit.service.addRelation(admin, '50', { targetDocumentId: '9', jenisRelasi: 'MENCABUT' }),
    ).rejects.toThrow(/belum terbit/);
    const sudahDicabut = setup([
      [{ dokumen_id: '5', status_workflow: 'DRAF', created_by: '11', document_created_by: '11', peruntukan: null }],
      [{ id: '9', created_by: '11', published_version_created_by: '11', status_hukum: 'DICABUT', current_published_version_id: '90' }],
    ]);
    await expect(
      sudahDicabut.service.addRelation(admin, '50', { targetDocumentId: '9', jenisRelasi: 'MENGUBAH' }),
    ).rejects.toThrow(/sudah dicabut/);
    const sah = setup([
      [{ dokumen_id: '5', status_workflow: 'DRAF', created_by: '11', document_created_by: '11', peruntukan: null }],
      [{ id: '9', created_by: '11', published_version_created_by: '11', status_hukum: 'DIUBAH', current_published_version_id: '90' }],
    ]);
    await expect(
      sah.service.addRelation(admin, '50', { targetDocumentId: '9', jenisRelasi: 'MENCABUT' }),
    ).resolves.toMatchObject({ id: '77', jenisRelasi: 'MENCABUT' });
  });
});

describe('CoreBackendService SOP Permohonan SK (peruntukan)', () => {
  const admin = { ...fixture('AKTIF', ['documents.create', 'documents.edit']), peran: ['SUPERADMIN'] } as PenggunaAktif;
  /** `antrean`: hasil repo.rows berurutan per panggilan. */
  const setup = (antrean: unknown[][]) => {
    const rows = vi.fn();
    for (const hasil of antrean) rows.mockResolvedValueOnce(hasil);
    rows.mockResolvedValue([]);
    const repo = {
      pool: {},
      transaction: vi.fn((fn: (d: unknown) => unknown) => fn({})),
      rows,
      write: vi.fn().mockResolvedValue({ affectedRows: 1 }),
      id: vi.fn().mockResolvedValue('40'),
    };
    const audit = { recordDomain: vi.fn() };
    const service = new CoreBackendService(repo as never, audit as never, {} as never, {} as never, { assertPublishReady: vi.fn() } as never);
    const sql = () => repo.write.mock.calls.map((c) => [String(c[1]), c[2]] as const);
    return { service, sql };
  };
  const dokumenBaru = (jenisDokumenId: string) => ({
    kodeDokumen: 'SOP-PSK',
    slug: 'sop-permohonan-sk',
    jenisDokumenId,
    peruntukan: 'PERMOHONAN_SK',
    versi: { judul: 'SOP Permohonan Surat Keputusan', tingkatAkses: 'publik' },
  });

  it('menyimpan peruntukan pada dokumen SOP baru', async () => {
    const { service, sql } = setup([[{ id: '7', kode: 'SOP', nama: 'SOP' }]]);
    await expect(service.createDocument(admin, dokumenBaru('7'))).resolves.toMatchObject({ id: '40' });
    expect(sql()[0]).toEqual([
      expect.stringContaining('INSERT INTO dokumen(kode_dokumen,slug,jenis_dokumen_id,peruntukan,created_by)'),
      ['SOP-PSK', 'sop-permohonan-sk', '7', 'PERMOHONAN_SK', '11'],
    ]);
  });

  it('menolak peruntukan SOP Permohonan SK pada jenis selain SOP', async () => {
    const { service, sql } = setup([[{ id: '2', kode: 'SKREK', nama: 'SK Rektor' }]]);
    await expect(service.createDocument(admin, dokumenBaru('2'))).rejects.toThrow(/berjenis SOP/);
    expect(sql()).toEqual([]);
    const ganti = setup([
      [{ id: '40', slug: 'x', jenis_dokumen_id: '7', peruntukan: 'PERMOHONAN_SK' }],
      [{ id: '2', kode: 'SKREK', nama: 'SK Rektor' }],
    ]);
    // Mengganti jenis dokumen bertanda menjadi bukan SOP juga ditolak.
    await expect(ganti.service.updateDocument(admin, '40', { jenisDokumenId: '2' })).rejects.toThrow(/berjenis SOP/);
  });

  it('melepas dan menandai dokumen lewat ubah dokumen', async () => {
    const lepas = setup([
      [{ id: '40', slug: 'x', jenis_dokumen_id: '7', peruntukan: 'PERMOHONAN_SK' }],
      [{ id: '7', kode: 'SOP', nama: 'SOP' }],
    ]);
    await lepas.service.updateDocument(admin, '40', { peruntukan: null });
    expect(lepas.sql()[0]?.[1]).toEqual([null, null, null, null, '40']);
    const tandai = setup([
      [{ id: '41', slug: 'y', jenis_dokumen_id: '7', peruntukan: null }],
      [{ id: '7', kode: 'SOP', nama: 'SOP' }],
    ]);
    await tandai.service.updateDocument(admin, '41', { peruntukan: 'PERMOHONAN_SK' });
    expect(tandai.sql()[0]?.[1]).toEqual([null, null, null, 'PERMOHONAN_SK', '41']);
  });
});
