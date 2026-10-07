import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PratinjauDokumen } from './pratinjau-dokumen';

const berkas = [
  { id: '1', nama: 'peraturan.pdf', label: 'Dokumen utama' },
  { id: '2', nama: 'lampiran-1.pdf', label: 'Lampiran 1' },
];

describe('PratinjauDokumen', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:pdf-fixture'),
      revokeObjectURL: vi.fn(),
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(navigator, 'pdfViewerEnabled');
  });

  it('shows the main file inline right away and switches to an attachment', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, blob: async () => new Blob(['pdf']) }));
    vi.stubGlobal('fetch', fetchMock);
    render(<PratinjauDokumen slug="contoh" berkas={berkas} />);

    expect(await screen.findByTitle('Pratinjau peraturan.pdf')).toHaveAttribute(
      'src',
      'blob:pdf-fixture',
    );
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/public/documents/contoh/files/1?mode=inline',
      expect.objectContaining({ credentials: 'include' }),
    );

    fireEvent.click(screen.getByRole('button', { name: /^Lampiran 1/ }));
    expect(await screen.findByTitle('Pratinjau lampiran-1.pdf')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/v1/public/documents/contoh/files/2?mode=inline',
      expect.anything(),
    );
    expect(screen.getByRole('button', { name: /^Lampiran 1/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('explains a rate-limited preview instead of showing a raw error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 429 })),
    );
    render(<PratinjauDokumen slug="contoh" berkas={berkas.slice(0, 1)} />);
    expect(await screen.findByText(/Terlalu banyak pratinjau/)).toBeInTheDocument();
  });

  it('does not fetch when the browser cannot show PDFs inline', () => {
    Object.defineProperty(navigator, 'pdfViewerEnabled', { value: false, configurable: true });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<PratinjauDokumen slug="contoh" berkas={berkas} />);
    expect(screen.getByText(/tidak dapat menampilkan PDF/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
