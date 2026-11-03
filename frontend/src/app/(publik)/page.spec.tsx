import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BerandaPublik } from '@jdih/shared';
import Beranda from './page';

const api = vi.hoisted(() => ({ session: vi.fn(), public: vi.fn() }));
vi.mock('@/lib/api-peladen', () => ({ ambilDariPeladen: api.session, ambilPublik: api.public }));
vi.mock('@/components/bilah-cari', () => ({ BilahCari: () => null }));
vi.mock('@/components/latar-foto-hero', () => ({ LatarFotoHero: () => null }));
vi.mock('@/components/pemicu-muncul', () => ({ PemicuMuncul: () => null }));
vi.mock('@/components/angka-naik', () => ({
  AngkaNaik: ({ nilai }: { nilai: number }) => <span>{nilai}</span>,
}));

function snapshot(internal: boolean): BerandaPublik {
  return {
    jenis: [
      {
        id: '1',
        kode: 'PERREK',
        nama: 'Peraturan Rektor',
        jumlah: internal ? 2 : 1,
        dokumen: {
          id: internal ? '20' : '10',
          slug: internal ? 'internal-terbaru' : 'publik-terbaru',
          tipe: 'Peraturan Rektor',
          judul: internal ? 'Regulasi Internal terbaru' : 'Regulasi Publik terbaru',
          nomor: '1',
          tahun: 2026,
          tanggalPenetapan: '2026-10-30',
          statusHukum: 'BERLAKU',
          dilihat: 0,
        },
      },
    ],
    kategori: [],
    tahun: [2026],
  };
}
beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(cleanup);

describe('beranda menampilkan snapshot sesuai sesi', () => {
  it.each([false, true])(
    'regulasi terbaru dan jumlah produk memakai snapshot Internal=%s',
    async (internal) => {
      api.session.mockResolvedValue(snapshot(internal));
      render(await Beranda());
      expect(api.session).toHaveBeenCalledExactlyOnceWith('/public/home');
      expect(api.public).not.toHaveBeenCalled();
      const expected = internal ? 'Regulasi Internal terbaru' : 'Regulasi Publik terbaru';
      expect(
        screen.getByRole('link', { name: `Buka Peraturan Rektor terbaru: ${expected}` }),
      ).toHaveAttribute(
        'href',
        internal ? '/produk-hukum/internal-terbaru' : '/produk-hukum/publik-terbaru',
      );
      const counts = screen.getByRole('navigation', { name: 'Jumlah dokumen per jenis' });
      expect(within(counts).getByText(internal ? '2' : '1')).toBeInTheDocument();
      expect(
        screen.queryByText(internal ? 'Regulasi Publik terbaru' : 'Regulasi Internal terbaru'),
      ).not.toBeInTheDocument();
    },
  );
  it('API gagal tidak membuat jumlah dokumen rekaan atau mengambil ulang tanpa sesi', async () => {
    api.session.mockRejectedValue(new Error('Offline'));
    render(await Beranda());
    expect(
      screen.getByText('Daftar produk hukum belum dapat dimuat. Silakan coba lagi nanti.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('navigation', { name: 'Jumlah dokumen per jenis' }),
    ).not.toBeInTheDocument();
    expect(api.public).not.toHaveBeenCalled();
  });
});
