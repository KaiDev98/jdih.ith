import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ambilKunjunganPortal } from '@/lib/kunjungan-portal';
import { KunjunganFooter } from './kunjungan-footer';
vi.mock('@/lib/kunjungan-portal', () => ({ ambilKunjunganPortal: vi.fn() }));
const data = { hariIni: 1, bulanIni: 2, tahunIni: 3, total: 4 };
beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  vi.mocked(ambilKunjunganPortal).mockResolvedValue(data);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});
describe('footer kunjungan aktual', () => {
  it('menggunakan hasil server, memperbarui berkala dan saat tab terlihat lagi', async () => {
    render(<KunjunganFooter awal={null} />);
    await act(async () => {});
    expect(screen.getByText('4 total kunjungan')).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });
    expect(ambilKunjunganPortal).toHaveBeenCalledTimes(2);
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(ambilKunjunganPortal).toHaveBeenCalledTimes(3);
  });
  it('tidak mengarang nol saat API gagal dan dapat mencoba lagi', async () => {
    vi.mocked(ambilKunjunganPortal).mockRejectedValueOnce(new Error('offline'));
    render(<KunjunganFooter awal={null} />);
    await act(async () => {});
    expect(screen.getByText('Data belum tersedia')).toBeInTheDocument();
    expect(screen.queryByText('0 total kunjungan')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Kunjungan portal/ }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));
    });
    expect(screen.getByText('4 total kunjungan')).toBeInTheDocument();
  });
  it('tab tersembunyi tidak mencatat sampai benar-benar dibuka', async () => {
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    render(<KunjunganFooter awal={data} />);
    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });
    expect(ambilKunjunganPortal).not.toHaveBeenCalled();
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(ambilKunjunganPortal).toHaveBeenCalledTimes(1);
  });
  it('mempertahankan data terakhir ketika pembaruan gagal', async () => {
    vi.mocked(ambilKunjunganPortal).mockRejectedValue(new Error('offline'));
    render(<KunjunganFooter awal={data} />);
    await act(async () => {});
    expect(screen.getByText('4 total kunjungan')).toBeInTheDocument();
    expect(screen.getByText(/Menampilkan data terakhir/)).toBeInTheDocument();
  });
});
