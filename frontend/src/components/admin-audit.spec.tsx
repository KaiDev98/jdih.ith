import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminAudit } from './admin-audit';

const state = vi.hoisted(() => ({
  peran: ['ADMIN'],
  daftar: vi.fn(),
}));
vi.mock('@/lib/sesi', () => ({
  useSession: () => ({
    pengguna: { id: '1', peran: state.peran, status: 'AKTIF', izin: ['audit.read'] },
  }),
}));
vi.mock('@/lib/api-client', async (original) => ({
  ...(await original<object>()),
  ambilApiBerdaftar: state.daftar,
}));

beforeEach(() => {
  state.peran = ['ADMIN'];
  state.daftar.mockReset().mockResolvedValue({
    data: [
      {
        id: '1',
        actor: 'Superadmin Uji',
        module: 'master',
        action: 'UPDATE',
        entityType: 'kategori',
        entityId: '10',
        createdAt: '2026-10-21 01:30:00.000000',
      },
    ],
    meta: { totalButir: 60 },
  });
});

describe('Audit khusus Superadmin', () => {
  it('Admin dengan audit.read tidak menampilkan data atau memanggil API audit', () => {
    const { container } = render(<AdminAudit />);
    expect(container).toBeEmptyDOMElement();
    expect(state.daftar).not.toHaveBeenCalled();
  });
  it('Superadmin dapat membaca tabel serta menyaring dan mengganti halaman', async () => {
    state.peran = ['SUPERADMIN'];
    render(<AdminAudit />);
    expect(
      await screen.findByRole('table', { name: 'Riwayat audit, waktu dalam WITA' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Pelaku' })).toBeInTheDocument();
    expect(screen.getAllByText('Superadmin Uji')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Berikutnya' }));
    await waitFor(() =>
      expect(state.daftar).toHaveBeenLastCalledWith('/admin/audit', {
        kueri: { halaman: 2, perHalaman: 30, module: undefined },
      }),
    );
    fireEvent.click(screen.getByRole('tab', { name: /master/i }));
    await waitFor(() =>
      expect(state.daftar).toHaveBeenLastCalledWith('/admin/audit', {
        kueri: { halaman: 1, perHalaman: 30, module: 'master' },
      }),
    );
  });
});
