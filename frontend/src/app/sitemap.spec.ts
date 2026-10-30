import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ambilApiBerdaftar } from '@/lib/api-client';
import sitemap from './sitemap';

vi.mock('@/lib/api-client', () => ({ ambilApiBerdaftar: vi.fn() }));
beforeEach(() => vi.resetAllMocks());

describe('sitemap koleksi terpisah', () => {
  it('memuat halaman lanjutan masing-masing koleksi dan hanya satu URL per dokumen', async () => {
    vi.mocked(ambilApiBerdaftar).mockImplementation(async (path, options) => {
      const page = options?.kueri?.halaman;
      return {
        data: [
          {
            id: path === '/public/documents' ? String(page) : 'sk',
            slug: path === '/public/documents' ? `biasa-${page}` : 'permohonan-sk',
          },
        ],
        meta: {
          halaman: Number(page),
          perHalaman: 100,
          totalButir: 2,
          totalHalaman: 2,
          adaSebelumnya: page === 2,
          adaBerikutnya: page === 1,
        },
      };
    });
    const urls = (await sitemap()).map((row) => row.url);
    expect(urls.filter((url) => url.includes('/produk-hukum/'))).toEqual([
      expect.stringContaining('/produk-hukum/biasa-1'),
      expect.stringContaining('/produk-hukum/biasa-2'),
      expect.stringContaining('/produk-hukum/permohonan-sk'),
    ]);
    for (const path of ['/public/documents', '/public/documents/permohonan-sk'])
      for (const halaman of [1, 2])
        expect(ambilApiBerdaftar).toHaveBeenCalledWith(
          path,
          expect.objectContaining({ kueri: { halaman, perHalaman: 100 } }),
        );
  });

  it('gangguan satu koleksi tetap menyisakan halaman statis dan koleksi lainnya', async () => {
    vi.mocked(ambilApiBerdaftar).mockImplementation(async (path) => {
      if (path === '/public/documents') throw new Error('offline');
      return {
        data: [{ id: 'sk', slug: 'permohonan-sk' }],
        meta: {
          halaman: 1,
          perHalaman: 100,
          totalButir: 1,
          totalHalaman: 1,
          adaSebelumnya: false,
          adaBerikutnya: false,
        },
      };
    });
    const urls = (await sitemap()).map((row) => row.url);
    expect(urls).toContainEqual(expect.stringMatching(/\/produk-hukum$/));
    expect(urls).toContainEqual(expect.stringMatching(/\/produk-hukum\/permohonan-sk$/));
  });
});
