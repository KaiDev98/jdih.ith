import { describe, expect, it, vi } from 'vitest';
import { HomeService } from './home.service.js';
import { HomeRepository } from './home.repository.js';
const row = { jenisId: '1', kode: 'SOP-BARU', nama: 'Prosedur Akademik', jumlah: '2', id: '10', slug: 'publik', judul: 'Publik terbaru', nomor: '1', tahun: 2026, tanggalPenetapan: '2026-10-26', statusHukum: 'BERLAKU', dilihat: '3' };
describe('snapshot beranda publik', () => {
  it('menggabungkan permintaan serentak, lalu membaca ulang tanpa menyimpan hasil', async () => {
    const repo = { latestByType: vi.fn().mockResolvedValue([row]), categories: vi.fn().mockResolvedValue([{ id: '2', kode: 'AKAD', nama: 'Akademik', jumlah: '2' }]), years: vi.fn().mockResolvedValue([{ tahun: '2026' }]) };
    const service = new HomeService(repo as never);
    const first = service.snapshot(), second = service.snapshot();
    expect(first).toBe(second);
    expect(await first).toMatchObject({ jenis: [{ jumlah: 2, dokumen: { id: '10' } }], kategori: [{ jumlah: 2 }], tahun: [2026] });
    expect(repo.categories).toHaveBeenCalledWith('1');
    repo.latestByType.mockResolvedValue([{ ...row, jumlah: '0', id: null }]);
    expect((await service.snapshot()).jenis[0]?.dokumen).toBeNull();
    expect(repo.latestByType).toHaveBeenCalledTimes(2);
  });
  it('membuang promise gagal agar gangguan tidak membekukan permintaan berikutnya', async () => {
    const repo = { latestByType: vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue([]), categories: vi.fn().mockResolvedValue([]), years: vi.fn().mockResolvedValue([]) };
    const service = new HomeService(repo as never);
    await expect(service.snapshot()).rejects.toThrow('offline');
    await expect(service.snapshot()).resolves.toEqual({ jenis: [], kategori: [], tahun: [] });
    expect(repo.categories).toHaveBeenCalledWith(null);
  });
  it('setiap query dokumen hanya membaca versi publik terbit yang masih current', async () => {
    const repo = { pool: {}, rows: vi.fn((_db: unknown, _sql: string, _values: unknown[] = []) => Promise.resolve([])) };
    const home = new HomeRepository(repo as never);
    await Promise.all([home.latestByType(), home.categories('9'), home.years()]);
    expect(repo.rows).toHaveBeenCalledTimes(3);
    for (const [, sql] of repo.rows.mock.calls) {
      expect(sql).toContain('v.id=d.current_published_version_id');
      expect(sql).toContain("v.status_workflow='TERBIT'");
      expect(sql).toContain("v.tingkat_akses='publik'");
      expect(sql).toContain('d.deleted_at IS NULL');
      expect(sql).toContain('d.peruntukan IS NULL');
    }
    expect(repo.rows.mock.calls[1]?.[2]).toEqual(['9']);
  });
});
