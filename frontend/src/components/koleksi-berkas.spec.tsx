import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ItemTemplatePublik, MetaHalaman } from '@jdih/shared';
import { KoleksiBerkas } from './koleksi-berkas';

const api = vi.hoisted(() => ({ list: vi.fn() }));
const sesi = vi.hoisted(() => ({ value: { state: 'anonymous' } as Record<string, unknown> }));
vi.mock('@/lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api-client')>()),
  ambilApiBerdaftar: api.list,
}));
vi.mock('@/lib/sesi', () => ({ useSession: () => sesi.value }));
const format = (id: number): ItemTemplatePublik => ({
  id: String(id),
  slug: `surat-${id}`,
  nama: `Surat ${id}`,
  kemampuan: { download: true },
});
const meta = (halaman: number, total = 14): MetaHalaman => ({
  halaman,
  perHalaman: 12,
  totalButir: total,
  totalHalaman: Math.ceil(total / 12),
  adaBerikutnya: halaman * 12 < total,
  adaSebelumnya: halaman > 1,
});
const initial = { data: Array.from({ length: 12 }, (_, i) => format(i + 1)), meta: meta(1) };
beforeEach(() => {
  api.list.mockReset();
  sesi.value = { state: 'anonymous' };
  vi.stubGlobal('IntersectionObserver', undefined);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('koleksi berkas bergulir', () => {
  it('menambah halaman berikutnya tanpa menduplikasi atau membuang berkas sebelumnya', async () => {
    api.list.mockResolvedValue({ data: [format(12), format(13), format(14)], meta: meta(2) });
    render(<KoleksiBerkas jenis="format" initial={initial} />);
    fireEvent.click(screen.getByRole('button', { name: /Muat berkas berikutnya/ }));
    await screen.findByText('Menampilkan 14 dari 14 berkas');
    expect(screen.getAllByRole('button', { name: 'Download' })).toHaveLength(14);
    expect(api.list).toHaveBeenCalledWith(
      '/letter-templates',
      expect.objectContaining({ cache: 'no-store', kueri: { halaman: 2, perHalaman: 12 } }),
    );
    expect(
      screen.queryByRole('button', { name: /Muat berkas berikutnya/ }),
    ).not.toBeInTheDocument();
  });
  it('mempertahankan berkas saat halaman lanjutan gagal dan dapat mencoba ulang', async () => {
    api.list
      .mockRejectedValueOnce(new Error('Gangguan sementara'))
      .mockResolvedValueOnce({ data: [format(13), format(14)], meta: meta(2) });
    render(<KoleksiBerkas jenis="format" initial={initial} />);
    fireEvent.click(screen.getByRole('button', { name: /Muat berkas berikutnya/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Gangguan sementara');
    expect(screen.getAllByRole('button', { name: 'Download' })).toHaveLength(12);
    fireEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));
    await screen.findByText('Menampilkan 14 dari 14 berkas');
    expect(api.list).toHaveBeenCalledTimes(2);
  });
  it('kartu SOP merupakan satu tautan lengkap dengan konteks kembali dan akses internal', async () => {
    const item = {
      id: '9',
      slug: 'sk-dosen',
      tipe: 'SOP',
      judul: 'SOP SK Dosen',
      nomor: '9',
      tahun: 2026,
      tanggalPenetapan: '2026-01-01',
      statusHukum: 'BERLAKU' as const,
      dilihat: 0,
      tingkatAkses: 'internal' as const,
    };
    sesi.value = { state: 'authenticated', pengguna: { id: '1', status: 'AKTIF' } };
    const view = render(<KoleksiBerkas jenis="sk" initial={{ data: [item], meta: meta(1, 1) }} />);
    const link = screen.getByRole('link', { name: item.judul });
    expect(link).toHaveAttribute('href', '/produk-hukum/sk-dosen?asal=permohonan-sk');
    expect(within(link).getByText('Buka dokumen')).toBeInTheDocument();
    expect(within(link).queryByRole('link')).not.toBeInTheDocument();
    api.list.mockResolvedValue({ data: [], meta: meta(1, 0) });
    sesi.value = { state: 'anonymous' };
    view.rerender(<KoleksiBerkas jenis="sk" initial={{ data: [item], meta: meta(1, 1) }} />);
    await waitFor(() =>
      expect(screen.queryByRole('link', { name: item.judul })).not.toBeInTheDocument(),
    );
    expect(api.list).toHaveBeenCalledWith(
      '/public/documents/permohonan-sk',
      expect.objectContaining({ cache: 'no-store', kueri: { halaman: 1, perHalaman: 12 } }),
    );
  });
  it('mengamati area gulir sendiri dan menahan pemuatan ganda', async () => {
    let callback: IntersectionObserverCallback;
    let root: Element | Document | null | undefined;
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb: IntersectionObserverCallback, options: IntersectionObserverInit) {
          callback = cb;
          root = options.root;
        }
        observe() {}
        disconnect() {}
      },
    );
    api.list.mockResolvedValue({ data: [format(13), format(14)], meta: meta(2) });
    render(<KoleksiBerkas jenis="format" initial={initial} />);
    expect(root).toBe(screen.getByRole('region', { name: 'Daftar format persuratan' }));
    await act(async () => {
      callback(
        [{ isIntersecting: true }] as IntersectionObserverEntry[],
        {} as IntersectionObserver,
      );
      callback(
        [{ isIntersecting: true }] as IntersectionObserverEntry[],
        {} as IntersectionObserver,
      );
    });
    await screen.findByText('Menampilkan 14 dari 14 berkas');
    expect(api.list).toHaveBeenCalledTimes(1);
  });
});
