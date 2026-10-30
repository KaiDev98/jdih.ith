import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminHapusDokumen } from './admin-hapus-dokumen';

const state = vi.hoisted(() => ({
  role: 'SUPERADMIN',
  permission: true,
  api: vi.fn(),
  replace: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: state.replace }) }));
vi.mock('@/lib/api-client', async (original) => ({
  ...(await original<object>()),
  ambilApi: state.api,
}));
vi.mock('@/lib/sesi', () => ({
  useSession: () => ({
    csrfToken: 'csrf',
    pengguna: { peran: [state.role], izin: state.permission ? ['documents.delete'] : [] },
  }),
  csrfHeaders: () => ({ 'x-csrf-token': 'csrf' }),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  state.role = 'SUPERADMIN';
  state.permission = true;
});

describe('hapus dokumen tanpa mengetik judul', () => {
  it('menampilkan tombol langsung dan hanya menghapus setelah konfirmasi', async () => {
    state.api.mockResolvedValue({ dihapus: true });
    render(<AdminHapusDokumen id="5" judul="Dokumen pengujian" />);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Hapus permanen' }));
    expect(
      screen.getByRole('dialog', { name: 'Hapus dokumen ini secara permanen?' }),
    ).toHaveTextContent('Dokumen pengujian');
    expect(state.api).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Batal' }));
    expect(state.api).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Hapus permanen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ya, hapus permanen' }));
    await waitFor(() =>
      expect(state.replace).toHaveBeenCalledWith('/superadmin/dokumen', undefined),
    );
    expect(state.api).toHaveBeenCalledExactlyOnceWith('/admin/documents/5', {
      method: 'DELETE',
      headers: { 'x-csrf-token': 'csrf' },
    });
  });

  for (const [role, permission] of [
    ['ADMIN', true],
    ['DOSEN_STAF', true],
    ['SUPERADMIN', false],
  ] as const) {
    it(`menonaktifkan tindakan untuk ${role}, izin ${String(permission)}`, () => {
      state.role = role;
      state.permission = permission;
      render(<AdminHapusDokumen id="5" judul="Dokumen" />);
      expect(screen.getByRole('button', { name: 'Hapus permanen' })).toBeDisabled();
      expect(state.api).not.toHaveBeenCalled();
    });
  }

  it('menahan klik ganda selama proses', async () => {
    let selesai!: () => void;
    state.api.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          selesai = resolve;
        }),
    );
    render(<AdminHapusDokumen id="5" judul="Dokumen" />);
    fireEvent.click(screen.getByRole('button', { name: 'Hapus permanen' }));
    const confirm = screen.getByRole('button', { name: 'Ya, hapus permanen' });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(state.api).toHaveBeenCalledTimes(1);
    expect(confirm).toBeDisabled();
    selesai();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('menampilkan kegagalan dan tetap berada di dokumen', async () => {
    state.api.mockRejectedValue(new Error('Berkas gagal dihapus'));
    render(<AdminHapusDokumen id="5" judul="Dokumen" />);
    fireEvent.click(screen.getByRole('button', { name: 'Hapus permanen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ya, hapus permanen' }));
    await waitFor(() =>
      expect(screen.getByRole('dialog')).toHaveTextContent('Berkas gagal dihapus'),
    );
    expect(state.replace).not.toHaveBeenCalled();
  });
});
