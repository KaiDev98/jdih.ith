import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FormatPersuratan from '@/app/(publik)/format-persuratan/page';
import PermohonanSk from '@/app/(publik)/permohonan-sk/page';

const api = vi.hoisted(() => ({ list: vi.fn(), public: vi.fn() }));
vi.mock('@/lib/api-peladen', () => ({
  ambilBerdaftarDariPeladen: api.list,
  ambilPublik: api.public,
}));
vi.mock('@/components/hero-halaman', () => ({
  HeroHalaman: ({ judul }: { judul: string }) => <h1>{judul}</h1>,
}));
vi.mock('@/lib/sesi', () => ({ useSession: () => ({ state: 'anonymous' }) }));
afterEach(cleanup);
beforeEach(() => {
  api.list.mockReset();
  api.public.mockReset().mockResolvedValue(null);
});

describe('koleksi berkas publik yang panjang', () => {
  it('format menampilkan 12 item di area gulir dan menyediakan pemuatan lanjutan', async () => {
    api.list.mockResolvedValue({
      data: Array.from({ length: 12 }, (_, index) => ({
        id: String(index + 1),
        slug: `surat-${index}`,
        nama: `Surat ${index}`,
      })),
      meta: { totalButir: 150, totalHalaman: 13 },
    });
    render(
      await FormatPersuratan({ searchParams: Promise.resolve({ q: 'surat tugas', halaman: '2' }) }),
    );
    expect(screen.getAllByRole('button', { name: 'Download' })).toHaveLength(12);
    expect(screen.getByText('150 berkas tersedia')).toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Muat berkas berikutnya/ })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Daftar format persuratan' })).toHaveAttribute(
      'data-gulir-dokumen',
    );
    const path = String(api.list.mock.calls[0]![0]);
    const params = new URL(path, 'http://local').searchParams;
    expect(params.get('perHalaman')).toBe('12');
    expect(params.get('halaman')).toBe('2');
    expect(params.has('q')).toBe(false);
  });
  it('SOP memakai permintaan dengan sesi dan menampilkan pembatasan akses hanya dari data authorized', async () => {
    api.list.mockResolvedValue({
      data: [
        {
          id: '1',
          slug: 'sop-internal',
          judul: 'SOP SK Dosen',
          nomor: '1',
          tahun: 2026,
          statusHukum: 'BERLAKU',
          tingkatAkses: 'internal',
        },
      ],
      meta: { totalButir: 1, totalHalaman: 1 },
    });
    render(await PermohonanSk({ searchParams: Promise.resolve({}) }));
    expect(api.list).toHaveBeenCalledWith(
      '/public/documents/permohonan-sk?halaman=1&perHalaman=12',
    );
    expect(api.public).toHaveBeenCalledWith('/public/contact', expect.anything());
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(screen.getByText('Khusus Dosen/Staf aktif')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'SOP SK Dosen' })).toHaveAttribute(
      'href',
      '/produk-hukum/sop-internal?asal=permohonan-sk',
    );
    expect(
      screen.queryByRole('navigation', { name: 'Halaman daftar berkas' }),
    ).not.toBeInTheDocument();
  });
});
