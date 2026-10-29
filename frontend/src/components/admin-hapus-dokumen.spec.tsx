import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminHapusDokumen } from './admin-hapus-dokumen';

const state = vi.hoisted(() => ({ role: 'SUPERADMIN', api: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock('@/lib/api-client', async (original) => ({ ...(await original<object>()), ambilApi: state.api }));
vi.mock('@/lib/sesi', () => ({
  useSession: () => ({ csrfToken: 'csrf', pengguna: { peran: [state.role], izin: ['documents.delete'] } }),
  csrfHeaders: () => ({}),
}));
afterEach(() => { cleanup(); state.api.mockClear(); });

describe('tindakan lanjutan pada panel ringkas', () => {
  for (const role of ['ADMIN', 'SUPERADMIN']) {
    it(`${role}: membuka bagian lanjutan tidak menghapus data dan tetap memerlukan izin serta konfirmasi`, () => {
      state.role = role;
      const { container } = render(<AdminHapusDokumen id="5" judul="Dokumen pengujian" />);
      const details = container.querySelector('details')!;
      expect(details.open).toBe(false);
      fireEvent.click(screen.getByText('Tindakan lanjutan'));
      expect(details.open).toBe(true);
      const input = screen.getByLabelText('Ketik judul dokumen untuk konfirmasi');
      expect(screen.getByRole('button', { name: 'Hapus permanen' })).toBeDisabled();
      if (role === 'ADMIN') expect(input).toBeDisabled();
      else {
        fireEvent.change(input, { target: { value: 'Dokumen pengujian' } });
        fireEvent.click(screen.getByRole('button', { name: 'Hapus permanen' }));
        expect(screen.getByRole('dialog', { name: 'Hapus dokumen ini secara permanen?' })).toBeInTheDocument();
      }
      expect(state.api).not.toHaveBeenCalled();
    });
  }
});
