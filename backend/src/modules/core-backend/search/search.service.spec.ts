import { describe, expect, it, vi } from 'vitest';
import { SearchService } from './search.service.js';

const publicRow = {
  id: '10', slug: 'aturan-publik', tipe: 'Peraturan Rektor', judul: 'Aturan publik', nomor: '4',
  tahun: 2026, tanggalPenetapan: '2026-01-03', statusHukum: 'BERLAKU', tingkatAkses: 'publik', dilihat: '7',
};
const internalRow = { ...publicRow, id: '20', slug: 'rahasia-internal', judul: 'Judul internal', tingkatAkses: 'internal' };

describe('SearchService visibility projection', () => {
  it('anonymous search sees only public documents, with no access label of any kind', async () => {
    const calls: { sql: string; values: unknown[] }[] = [];
    const repo = { rows: vi.fn((_db: unknown, sql: string, values: unknown[] = []) => {
      calls.push({ sql, values });
      return Promise.resolve(sql.startsWith('SELECT COUNT') ? [{ total: '1' }] : [publicRow]);
    }), pool: {} };
    const result = await new SearchService(repo as never).search({ halaman: 1, perHalaman: 20 });
    expect(result.data).toEqual([expect.objectContaining({ id: '10', judul: 'Aturan publik' })]);
    expect(result.data[0]).not.toHaveProperty('badge');
    expect(result.data[0]).not.toHaveProperty('tingkatAkses');
    // Both the count and the page are restricted to public documents in SQL,
    // so Internal documents neither appear nor inflate the total.
    for (const call of calls) {
      expect(call.sql).toContain("v.tingkat_akses='publik'");
      expect(call.sql).toContain('d.peruntukan IS NULL');
      expect(call.sql).not.toContain("'internal'");
      expect(call.sql).not.toContain("'rahasia'");
    }
  });

  it('active staff search still receives Internal documents with their access level', async () => {
    const repo = { rows: vi.fn((_db: unknown, sql: string) =>
      Promise.resolve(sql.startsWith('SELECT COUNT') ? [{ total: '2' }] : [publicRow, internalRow])), pool: {} };
    const staff = { id: '1', status: 'AKTIF', peran: ['DOSEN_STAF'], izin: [] };
    const result = await new SearchService(repo as never).search({ halaman: 1, perHalaman: 20 }, staff as never);
    expect(result.data).toEqual([
      expect.objectContaining({ id: '10', tingkatAkses: 'publik' }),
      expect.objectContaining({ id: '20', tingkatAkses: 'internal' }),
    ]);
  });

  it('lists years from public documents only, newest first', async () => {
    const calls: string[] = [];
    const repo = { rows: vi.fn((_db: unknown, sql: string) => {
      calls.push(sql);
      return Promise.resolve([{ tahun: '2026' }, { tahun: 2024 }]);
    }), pool: {} };
    await expect(new SearchService(repo as never).publicYears()).resolves.toEqual([2026, 2024]);
    expect(calls[0]).toContain("v.tingkat_akses='publik'");
    expect(calls[0]).not.toContain("'internal'");
    expect(calls[0]).toContain('ORDER BY v.tahun DESC');
    expect(calls[0]).toContain('d.peruntukan IS NULL');
  });

  it('applies keyword and explicit filters with prepared values', async () => {
    const calls: { sql: string; values: unknown[] }[] = [];
    const repo = { rows: vi.fn((_db: unknown, sql: string, values: unknown[] = []) => {
      calls.push({ sql, values });
      return Promise.resolve(sql.startsWith('SELECT COUNT') ? [{ total: '0' }] : []);
    }), pool: {} };
    await new SearchService(repo as never).search({
      q: 'aturan_100%', jenisDokumenId: '3', tahun: '2026', unitKerjaId: '8', kategoriId: '9', statusHukum: 'BERLAKU',
    });
    expect(calls[0]!.sql).toContain('v.judul LIKE ? ESCAPE');
    expect(calls[0]!.sql).toContain('EXISTS(SELECT 1 FROM dokumen_versi_tag');
    expect(calls[0]!.sql).toContain('d.status_hukum=?');
    expect(calls[0]!.values).toContain('%aturan!_100!%%');
  });
});

describe('SearchService.facets', () => {
  function siapkan() {
    const calls: { sql: string; values: unknown[] }[] = [];
    const repo = {
      rows: vi.fn((_db: unknown, sql: string, values: unknown[] = []) => {
        calls.push({ sql, values });
        return Promise.resolve([
          { id: '1', jumlah: '3' },
          { id: '2', jumlah: '1' },
        ]);
      }),
      pool: {},
    };
    return { service: new SearchService(repo as never), calls };
  }

  it('menghitung per jenis tanpa penyaring jenis, hanya publik untuk anonim', async () => {
    const { service, calls } = siapkan();
    const hasil = await service.facets({ jenisDokumenId: '2', tahun: '2026' });
    expect(hasil).toEqual({
      total: 4,
      perJenis: [
        { jenisDokumenId: '1', jumlah: 3 },
        { jenisDokumenId: '2', jumlah: 1 },
      ],
    });
    expect(calls[0]!.sql).toContain("v.tingkat_akses='publik'");
    expect(calls[0]!.sql).toContain('d.peruntukan IS NULL');
    expect(calls[0]!.sql).not.toContain('d.jenis_dokumen_id=?');
    expect(calls[0]!.values).toEqual([2026]);
  });

  it('staf aktif ikut menghitung dokumen Internal', async () => {
    const { service, calls } = siapkan();
    await service.facets({}, {
      id: '7', nama: 'Staf', surel: 's@ith.ac.id', status: 'AKTIF', unitKerjaId: null,
      unitManual: null, avatarUrl: null, peran: ['DOSEN_STAF'], izin: [],
    });
    expect(calls[0]!.sql).toContain("v.tingkat_akses IN ('publik','internal')");
  });
});

describe('SOP Permohonan SK: akses dan pagination', () => {
  it.each([undefined, 'MENUNGGU_VERIFIKASI', 'NONAKTIF', 'AKTIF'] as const)('memfilter akses untuk status %s sebelum menghitung hasil', async (status) => {
    const repo = { pool: {}, rows: vi.fn((_db: unknown, sql: string) => Promise.resolve(sql.includes('COUNT(*)') ? [{ total: '25' }] : [])) };
    const actor = status ? { id: '7', nama: 'Staf', surel: 's@ith.ac.id', status, unitKerjaId: null, unitManual: null, avatarUrl: null, peran: ['DOSEN_STAF'], izin: [] } : undefined;
    const result = await new SearchService(repo as never).permohonanSk({ halaman: 2, perHalaman: 12, q: 'SK' }, actor as never);
    expect(result.meta).toMatchObject({ totalButir: 25, totalHalaman: 3, halaman: 2, perHalaman: 12 });
    for (const [, sql] of repo.rows.mock.calls) {
      expect(sql).toContain("d.peruntukan='PERMOHONAN_SK'");
      expect(sql).not.toContain('d.peruntukan IS NULL');
      expect(sql).toContain(status === 'AKTIF' ? "v.tingkat_akses IN ('publik','internal')" : "v.tingkat_akses='publik'");
      expect(sql).not.toContain("'rahasia'");
    }
    expect(repo.rows).toHaveBeenLastCalledWith(expect.anything(), expect.stringContaining('LIMIT ? OFFSET ?'), expect.arrayContaining([12]));
  });
});
