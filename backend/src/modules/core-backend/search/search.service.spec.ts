import { describe, expect, it, vi } from 'vitest';
import { SearchService } from './search.service.js';

const publicRow = {
  id: '10', slug: 'aturan-publik', tipe: 'Peraturan Rektor', judul: 'Aturan publik', nomor: '4',
  tahun: 2026, tanggalPenetapan: '2026-01-03', statusHukum: 'BERLAKU', tingkatAkses: 'publik',
};
const internalRow = { ...publicRow, id: '20', slug: 'rahasia-internal', judul: 'Judul internal', tingkatAkses: 'internal' };

describe('SearchService visibility projection', () => {
  it('returns anonymous Internal rows as exactly title and badge, while excluding Secret from SQL visibility/count', async () => {
    const calls: { sql: string; values: unknown[] }[] = [];
    const repo = { rows: vi.fn((_db: unknown, sql: string, values: unknown[] = []) => {
      calls.push({ sql, values });
      return Promise.resolve(sql.startsWith('SELECT COUNT') ? [{ total: '2' }] : [publicRow, internalRow]);
    }), pool: {} };
    const result = await new SearchService(repo as never).search({ halaman: 1, perHalaman: 20 });
    expect(result.data).toEqual([
      expect.objectContaining({ id: '10', badge: 'PUBLIK' }),
      { judul: 'Judul internal', badge: 'INTERNAL' },
    ]);
    expect(Object.keys(result.data[1]!)).toEqual(['judul', 'badge']);
    expect(calls[0]!.sql).toContain("v.tingkat_akses IN ('publik','internal')");
    expect(calls[0]!.sql).not.toContain("'rahasia'");
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
