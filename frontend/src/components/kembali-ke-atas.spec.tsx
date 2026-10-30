import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KembaliKeAtas } from './kembali-ke-atas';
vi.mock('next/navigation', () => ({ usePathname: () => '/produk-hukum' }));
beforeEach(() => {
  vi.stubGlobal('scrollY', 0);
  vi.stubGlobal('scrollTo', vi.fn());
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe('kembali ke atas', () => {
  it('tidak mengganggu fokus ketika posisi masih di atas', () => {
    render(<KembaliKeAtas />);
    expect(screen.queryByRole('button', { name: 'Kembali ke atas' })).not.toBeInTheDocument();
  });
  it('menggulir halaman dan daftar aktif dengan halus', async () => {
    const area = document.createElement('div');
    area.dataset.gulirDokumen = '';
    area.scrollTop = 300;
    const scroll = vi.fn();
    area.scrollTo = scroll;
    document.body.append(area);
    try {
      render(<KembaliKeAtas />);
      fireEvent.scroll(area);
      fireEvent.click(await screen.findByRole('button', { name: 'Kembali ke atas' }));
      expect(scroll).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
      expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    } finally {
      area.remove();
    }
  });
  it('menghormati reduced motion', async () => {
    vi.stubGlobal('scrollY', 400);
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    render(<KembaliKeAtas />);
    fireEvent.click(await screen.findByRole('button', { name: 'Kembali ke atas' }));
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'instant' });
  });
});
