import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PratinjauFormat } from './pratinjau-format';

const fetchFile = vi.fn();
const createUrl = vi.fn();
const revokeUrl = vi.fn();
const props = {
  nama: 'Surat Tugas',
  previewUrl: '/api/v1/admin/letter-templates/5/versions/80/preview',
  downloadUrl: '/api/v1/admin/letter-templates/5/versions/80/download',
  canPreview: true,
};
const pdf = () => ({
  ok: true,
  headers: new Headers({ 'content-type': 'application/pdf' }),
  blob: async () => new Blob(['%PDF-1.7'], { type: 'application/pdf' }),
});
beforeEach(() => {
  fetchFile.mockReset().mockResolvedValue(pdf());
  createUrl.mockReset().mockReturnValue('blob:preview');
  revokeUrl.mockReset();
  vi.stubGlobal('fetch', fetchFile);
  vi.stubGlobal(
    'URL',
    Object.assign(class extends URL {}, { createObjectURL: createUrl, revokeObjectURL: revokeUrl }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('pratinjau Format Persuratan', () => {
  it('PDF dimuat saat diminta melalui API bersesi, tanpa ajakan unduh untuk ditinjau', async () => {
    render(<PratinjauFormat {...props} />);
    expect(screen.queryByText('Unduh untuk ditinjau')).not.toBeInTheDocument();
    expect(fetchFile).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Pratinjau' }));
    expect(await screen.findByTitle('Pratinjau Surat Tugas')).toHaveAttribute(
      'src',
      'blob:preview',
    );
    expect(fetchFile).toHaveBeenCalledWith(
      props.previewUrl,
      expect.objectContaining({
        credentials: 'include',
        cache: 'no-store',
        signal: expect.any(AbortSignal),
      }),
    );
    expect(screen.getByRole('link', { name: 'Unduh berkas' })).toHaveAttribute(
      'href',
      props.downloadUrl,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Tutup' }));
    await waitFor(() => expect(revokeUrl).toHaveBeenCalledWith('blob:preview'));
  });
  it('berkas non-PDF menyediakan unduhan dan tidak mencoba membuat pratinjau', () => {
    render(<PratinjauFormat {...props} canPreview={false} />);
    expect(screen.getByRole('link', { name: 'Unduh untuk ditinjau' })).toHaveAttribute(
      'href',
      props.downloadUrl,
    );
    expect(screen.queryByRole('button', { name: 'Pratinjau' })).not.toBeInTheDocument();
    expect(fetchFile).not.toHaveBeenCalled();
  });
  it('berkas keluar antrean menampilkan galat, menyediakan coba lagi, dan tidak membuat iframe', async () => {
    fetchFile.mockResolvedValueOnce({ ok: false, status: 404 });
    render(<PratinjauFormat {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Pratinjau' }));
    await screen.findByText('Berkas tidak tersedia atau sudah keluar dari antrean.');
    expect(screen.queryByTitle('Pratinjau Surat Tugas')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));
    await screen.findByTitle('Pratinjau Surat Tugas');
    expect(fetchFile).toHaveBeenCalledTimes(2);
  });
  it('menolak tanggapan yang bukan PDF meskipun metadata meminta pratinjau', async () => {
    fetchFile.mockResolvedValue({
      ...pdf(),
      headers: new Headers({ 'content-type': 'text/html' }),
    });
    render(<PratinjauFormat {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Pratinjau' }));
    await screen.findByText(/Berkas ini belum mendukung pratinjau/);
    expect(createUrl).not.toHaveBeenCalled();
  });
  it('menutup dialog saat permintaan masih berjalan membatalkan dan mengabaikan tanggapan terlambat', async () => {
    let resolve!: (value: unknown) => void;
    fetchFile.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    render(<PratinjauFormat {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Pratinjau' }));
    const signal = fetchFile.mock.calls[0]![1].signal as AbortSignal;
    fireEvent.click(screen.getByRole('button', { name: 'Tutup' }));
    expect(signal.aborted).toBe(true);
    await act(async () => resolve(pdf()));
    expect(createUrl).not.toHaveBeenCalled();
  });
});
