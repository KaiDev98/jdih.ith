import { act, fireEvent, render, screen } from '@testing-library/react';
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

  it('offers a download instead of a preview for non-PDF files', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(
      <PratinjauDokumen
        slug="contoh"
        berkas={[{ id: '3', nama: 'tabel.xlsx', label: 'Dokumen utama', pratinjau: false }]}
      />,
    );
    expect(screen.getByText(/Berkas XLSX tidak dapat ditampilkan/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unduh berkas' })).toBeInTheDocument();
    // Tidak ada permintaan pratinjau maupun tautan "Tab baru" untuk berkas ini.
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByTitle('Buka di tab baru')).not.toBeInTheDocument();
  });

  it('does not fetch when the browser cannot show PDFs inline', () => {
    Object.defineProperty(navigator, 'pdfViewerEnabled', { value: false, configurable: true });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<PratinjauDokumen slug="contoh" berkas={berkas} />);
    expect(screen.getByText(/tidak dapat menampilkan PDF/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('defers an offscreen PDF until the preview approaches the viewport', async () => {
    let notify: IntersectionObserverCallback | undefined;
    const disconnect = vi.fn();
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback: IntersectionObserverCallback) { notify = callback; }
      observe() {}
      disconnect = disconnect;
    });
    const fetchMock = vi.fn(async () => ({ ok: true, blob: async () => new Blob(['pdf']) }));
    vi.stubGlobal('fetch', fetchMock);
    render(<PratinjauDokumen slug="contoh" berkas={berkas} />);
    expect(fetchMock).not.toHaveBeenCalled();
    act(() => notify!([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
    expect(await screen.findByTitle('Pratinjau peraturan.pdf')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(disconnect).toHaveBeenCalled();
  });

  it('does not allocate a blob URL when a pending preview is cancelled', async () => {
    let complete: (blob: Blob) => void = () => undefined;
    const pending = new Promise<Blob>(done => { complete = done; });
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, blob: () => pending })));
    const view = render(<PratinjauDokumen slug="contoh" berkas={berkas} />);
    await act(async () => { await Promise.resolve(); });
    view.unmount();
    await act(async () => { complete(new Blob(['pdf'])); await pending; });
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});
