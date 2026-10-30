import { describe, expect, it, vi } from 'vitest';
import type { PenggunaAktif } from '@jdih/shared';
import { CoreBackendService } from './core-backend.service.js';

const actor = (peran: 'ADMIN' | 'SUPERADMIN'): PenggunaAktif => ({
  id: '11',
  nama: 'Pengelola',
  surel: 'pengelola@ith.ac.id',
  status: 'AKTIF',
  unitKerjaId: '2',
  unitManual: null,
  avatarUrl: null,
  peran: [peran],
  izin: ['documents.read_admin'],
});
function setup() {
  const repo = {
    pool: {},
    rows: vi
      .fn()
      .mockImplementation((_pool, sql: string) =>
        Promise.resolve(sql.startsWith('SELECT COUNT') ? [{ total: 41 }] : []),
      ),
  };
  const service = new CoreBackendService(
    repo as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
  return { repo, service };
}
describe('filter koleksi dokumen panel sebelum pagination', () => {
  it.each(['SOP', 'PRODUK_HUKUM'] as const)(
    'menyaring %s pada query data dan total tanpa melepas kepemilikan Admin',
    async (kelompok) => {
      const { repo, service } = setup();
      const result = await service.adminDocuments(actor('ADMIN'), {
        kelompok,
        halaman: 2,
        perHalaman: 20,
      });
      expect(result.meta.totalButir).toBe(41);
      expect(result.meta.totalHalaman).toBe(3);
      expect(repo.rows).toHaveBeenCalledTimes(2);
      for (const [, sql, params] of repo.rows.mock.calls) {
        expect(sql).toContain('d.created_by=?');
        expect(sql).toContain('d.peruntukan IS NULL');
        expect(sql).toContain(
          kelompok === 'SOP'
            ? "AND (UPPER(COALESCE(j.kode,''))='SOP'"
            : "AND NOT (UPPER(COALESCE(j.kode,''))='SOP'",
        );
        expect(params).toContain('11');
      }
      expect(repo.rows.mock.calls[1]![2]).toEqual(['11', 20, 20]);
    },
  );
  it('Admin membaca koleksi SOP Permohonan SK miliknya sebelum pagination', async () => {
    const { repo, service } = setup();
    await service.adminDocuments(actor('ADMIN'), { peruntukan: 'PERMOHONAN_SK' });
    for (const [, sql, params] of repo.rows.mock.calls) {
      expect(sql).toContain('d.created_by=?');
      expect(sql).toContain('d.peruntukan=?');
      expect(sql).not.toContain('d.peruntukan IS NULL');
      expect(params).toContain('11');
      expect(params).toContain('PERMOHONAN_SK');
    }
  });
  it('mempertahankan cakupan terverifikasi pada koleksi SOP khusus Superadmin', async () => {
    const { repo, service } = setup();
    await service.adminDocuments(actor('SUPERADMIN'), { peruntukan: 'PERMOHONAN_SK' });
    for (const [, sql, params] of repo.rows.mock.calls) {
      expect(sql).toContain("v.status_workflow IN ('DISETUJUI','TERBIT','DITARIK')");
      expect(sql).toContain('d.peruntukan=?');
      expect(params).toContain('PERMOHONAN_SK');
    }
  });
  it('menolak nilai filter sembarang sebelum query', async () => {
    const { repo, service } = setup();
    await expect(
      service.adminDocuments(actor('SUPERADMIN'), { kelompok: 'RAHASIA' }),
    ).rejects.toThrow();
    expect(repo.rows).not.toHaveBeenCalled();
  });
});
