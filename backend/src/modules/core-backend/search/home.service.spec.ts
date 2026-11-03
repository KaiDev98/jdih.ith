import { describe, expect, it, vi } from 'vitest';
import { HomeService } from './home.service.js';
import { HomeRepository } from './home.repository.js';
import type { PenggunaAktif } from '@jdih/shared';
const row = {
  jenisId: '1',
  kode: 'SOP-BARU',
  nama: 'Prosedur Akademik',
  jumlah: '2',
  id: '10',
  slug: 'publik',
  judul: 'Publik terbaru',
  nomor: '1',
  tahun: 2026,
  tanggalPenetapan: '2026-10-26',
  statusHukum: 'BERLAKU',
  dilihat: '3',
};
describe('snapshot beranda publik', () => {
  it('menggabungkan permintaan serentak, lalu membaca ulang tanpa menyimpan hasil', async () => {
    const repo = {
      latestByType: vi.fn().mockResolvedValue([row]),
      categories: vi
        .fn()
        .mockResolvedValue([{ id: '2', kode: 'AKAD', nama: 'Akademik', jumlah: '2' }]),
      years: vi.fn().mockResolvedValue([{ tahun: '2026' }]),
    };
    const service = new HomeService(repo as never);
    const first = service.snapshot(),
      second = service.snapshot();
    expect(first).toBe(second);
    expect(await first).toMatchObject({
      jenis: [{ jumlah: 2, dokumen: { id: '10' } }],
      kategori: [{ jumlah: 2 }],
      tahun: [2026],
    });
    expect(repo.categories).toHaveBeenCalledWith('1', false);
    repo.latestByType.mockResolvedValue([{ ...row, jumlah: '0', id: null }]);
    expect((await service.snapshot()).jenis[0]?.dokumen).toBeNull();
    expect(repo.latestByType).toHaveBeenCalledTimes(2);
  });
  it('membuang promise gagal agar gangguan tidak membekukan permintaan berikutnya', async () => {
    const repo = {
      latestByType: vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue([]),
      categories: vi.fn().mockResolvedValue([]),
      years: vi.fn().mockResolvedValue([]),
    };
    const service = new HomeService(repo as never);
    await expect(service.snapshot()).rejects.toThrow('offline');
    await expect(service.snapshot()).resolves.toEqual({ jenis: [], kategori: [], tahun: [] });
    expect(repo.categories).toHaveBeenCalledWith(null, false);
  });
  it('setiap query dokumen hanya membaca versi publik terbit yang masih current', async () => {
    const repo = {
      pool: {},
      rows: vi.fn((_db: unknown, _sql: string, _values: unknown[] = []) => Promise.resolve([])),
    };
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

  it.each(['DOSEN_STAF', 'ADMIN', 'SUPERADMIN'] as const)(
    'sesi %s aktif mendapat cakupan Internal untuk dokumen, jumlah kategori dan tahun',
    async (role) => {
      const repo = {
        latestByType: vi.fn().mockResolvedValue([]),
        categories: vi.fn().mockResolvedValue([]),
        years: vi.fn().mockResolvedValue([]),
      };
      await new HomeService(repo as never).snapshot(actor(role));
      expect(repo.latestByType).toHaveBeenCalledWith(true);
      expect(repo.categories).toHaveBeenCalledWith(null, true);
      expect(repo.years).toHaveBeenCalledWith(true);
    },
  );

  it.each(['MENUNGGU_VERIFIKASI', 'NONAKTIF', 'DITOLAK'] as const)(
    'akun %s hanya mendapat data Publik meskipun membawa izin pengelola',
    async (status) => {
      const repo = {
        latestByType: vi.fn().mockResolvedValue([]),
        categories: vi.fn().mockResolvedValue([]),
        years: vi.fn().mockResolvedValue([]),
      };
      await new HomeService(repo as never).snapshot({ ...actor('DOSEN_STAF'), status });
      expect(repo.latestByType).toHaveBeenCalledWith(false);
      expect(repo.categories).toHaveBeenCalledWith(null, false);
      expect(repo.years).toHaveBeenCalledWith(false);
    },
  );

  it('pengelola tanpa izin baca tidak mendapat dokumen Internal', async () => {
    const repo = {
      latestByType: vi.fn().mockResolvedValue([]),
      categories: vi.fn().mockResolvedValue([]),
      years: vi.fn().mockResolvedValue([]),
    };
    await new HomeService(repo as never).snapshot({ ...actor('ADMIN'), izin: [] });
    expect(repo.latestByType).toHaveBeenCalledWith(false);
  });

  it('permintaan Internal dan Publik serentak tidak berbagi hasil, jumlah, atau tahun', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const repo = {
      latestByType: vi.fn(async (internal: boolean) => {
        await gate;
        return [{ ...row, id: internal ? '20' : '10', jumlah: internal ? '2' : '1' }];
      }),
      categories: vi.fn().mockResolvedValue([]),
      years: vi.fn((internal: boolean) => Promise.resolve([{ tahun: internal ? '2045' : '2026' }])),
    };
    const service = new HomeService(repo as never);
    const staff = service.snapshot(actor('DOSEN_STAF'));
    const anonymous = service.snapshot();
    expect(staff).not.toBe(anonymous);
    expect(service.snapshot(actor('ADMIN'))).toBe(staff);
    expect(service.snapshot({ ...actor('DOSEN_STAF'), status: 'MENUNGGU_VERIFIKASI' })).toBe(
      anonymous,
    );
    release();
    expect(await staff).toMatchObject({
      jenis: [{ jumlah: 2, dokumen: { id: '20' } }],
      tahun: [2045],
    });
    expect(await anonymous).toMatchObject({
      jenis: [{ jumlah: 1, dokumen: { id: '10' } }],
      tahun: [2026],
    });
    await service.snapshot();
    expect(repo.latestByType).toHaveBeenCalledTimes(3);
  });

  it('kegagalan request Internal tidak menahan request Publik atau permintaan ulang', async () => {
    const repo = {
      latestByType: vi.fn((internal: boolean) =>
        internal ? Promise.reject(new Error('offline')) : Promise.resolve([]),
      ),
      categories: vi.fn().mockResolvedValue([]),
      years: vi.fn().mockResolvedValue([]),
    };
    const service = new HomeService(repo as never);
    const first = service.snapshot(actor('DOSEN_STAF'));
    await expect(service.snapshot()).resolves.toEqual({ jenis: [], kategori: [], tahun: [] });
    await expect(first).rejects.toThrow('offline');
    repo.latestByType.mockResolvedValue([]);
    await expect(service.snapshot(actor('DOSEN_STAF'))).resolves.toEqual({
      jenis: [],
      kategori: [],
      tahun: [],
    });
  });
});

function actor(role: PenggunaAktif['peran'][number]): PenggunaAktif {
  return {
    id: '1',
    nama: 'Akun Uji',
    surel: 'uji@example.com',
    status: 'AKTIF',
    peran: [role],
    izin: ['documents.read_admin'],
    unitKerjaId: '9',
    unitManual: null,
    avatarUrl: null,
  };
}
