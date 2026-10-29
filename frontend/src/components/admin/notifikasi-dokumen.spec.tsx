import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NotifikasiDokumenPanel } from './notifikasi-dokumen';

const state = vi.hoisted(() => ({ api: vi.fn(), role: 'ADMIN' }));
vi.mock('next/navigation', () => ({ usePathname: () => '/admin' }));
vi.mock('@/lib/sesi', () => ({
  useSession: () => ({ csrfToken: 'csrf-test', pengguna: { id: '11', peran: [state.role] } }),
  csrfHeaders: (token: string) => ({ 'x-csrf-token': token }),
}));
vi.mock('@/lib/api-client', async (original) => ({
  ...(await original<object>()),
  ambilApi: state.api,
}));
const item = (id = '91') => ({
  id,
  dokumenId: '5',
  versionId: '50',
  judul: `Dokumen ${id}`,
  action: 'APPROVE',
  catatan: 'Dokumen sesuai',
  createdAt: '2026-10-23 00:00:00',
});
let inbox: ReturnType<typeof item>[];
beforeEach(() => {
  state.role = 'ADMIN';
  inbox = [item()];
  state.api.mockReset();
  state.api.mockImplementation((_url, options) => {
    if (options?.method === 'DELETE') {
      inbox = [];
      return Promise.resolve({ jumlahDihapus: 1 });
    }
    return Promise.resolve([...inbox]);
  });
});
afterEach(cleanup);
async function open() {
  render(<NotifikasiDokumenPanel />);
  await screen.findByRole('button', { name: 'Notifikasi dokumen (1 terbaru)' });
  fireEvent.click(screen.getByRole('button', { name: /Notifikasi dokumen/ }));
  return screen.findByRole('button', { name: 'Hapus notifikasi Dokumen 91' });
}
const mutations = () => state.api.mock.calls.filter(([, options]) => options?.method === 'DELETE');

describe('penghapusan notifikasi', () => {
  for (const [role, action, path, label] of [
    ['SUPERADMIN', 'SUBMIT', '/superadmin/dokumen/verifikasi/5?versionId=50', 'Tinjau pengajuan'],
    ['ADMIN', 'APPROVE', '/admin/dokumen/5?versionId=50', 'Buka dokumen'],
    ['ADMIN', 'RETURN', '/admin/dokumen/pengajuan/5?versionId=50', 'Buka dokumen'],
  ]) {
    it(`${label} membuka versi tepat dalam konteks ${action}`, async () => {
      state.role = role!;
      inbox = [{ ...item(), action: action! }];
      await open();
      const link = screen.getByRole('link', { name: new RegExp(label!) });
      expect(link).toHaveAttribute('href', path);
      // Tautan tetap dapat dibuka melalui keyboard atau tab baru.
      expect(link.tagName).toBe('A');
      expect(link).not.toHaveAttribute('target');
      expect(mutations()).toHaveLength(0);
    });
  }
  it('Superadmin hanya melihat pengajuan masuk dan tetap dapat menghapus notifikasinya', async () => {
    state.role = 'SUPERADMIN';
    inbox = [
      { ...item('91'), action: 'SUBMIT', catatan: 'Tanda tangan diperbaiki' },
      item('90'),
      { ...item('89'), action: 'RETURN' },
    ];
    fireEvent.click(await open());
    fireEvent.click(screen.getByRole('button', { name: 'Batal' }));
    expect(screen.getByRole('heading', { name: 'Pengajuan masuk' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Tinjau pengajuan/ })).toBeInTheDocument();
    expect(screen.queryByText('Disetujui')).not.toBeInTheDocument();
    expect(screen.queryByText('Perlu perbaikan')).not.toBeInTheDocument();
    expect(screen.queryByText('Dokumen 90')).not.toBeInTheDocument();
    expect(screen.queryByText('Dokumen 89')).not.toBeInTheDocument();
    expect(screen.getByText('Catatan pengajuan')).toBeInTheDocument();
    expect(screen.getByText('Tanda tangan diperbaiki')).toBeInTheDocument();
  });
  it('Admin melihat keputusan dan catatan perbaikan tanpa kategori pengajuan baru', async () => {
    inbox = [item('91'), { ...item('90'), action: 'RETURN' }, { ...item('89'), action: 'SUBMIT' }];
    render(<NotifikasiDokumenPanel />);
    await screen.findByRole('button', { name: 'Notifikasi dokumen (2 terbaru)' });
    fireEvent.click(screen.getByRole('button', { name: /Notifikasi dokumen/ }));
    expect(await screen.findByRole('heading', { name: 'Notifikasi dokumen' })).toBeInTheDocument();
    expect(screen.getAllByText('Disetujui')).toHaveLength(2);
    expect(screen.getAllByText('Perlu perbaikan')).toHaveLength(2);
    expect(screen.queryByText('Pengajuan baru')).not.toBeInTheDocument();
    expect(screen.queryByText('Dokumen 89')).not.toBeInTheDocument();
  });
  it('tombol hapus terpisah dari tautan dan pembatalan tidak menulis data', async () => {
    const remove = await open();
    expect(remove.closest('a')).toBeNull();
    fireEvent.click(remove);
    expect(
      await screen.findByRole('dialog', { name: 'Hapus notifikasi ini?' }),
    ).toBeInTheDocument();
    expect(mutations()).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Batal' }));
    await waitFor(() =>
      expect(screen.queryByText('Hapus notifikasi ini?')).not.toBeInTheDocument(),
    );
    expect(mutations()).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Hapus notifikasi Dokumen 91' })).toBeInTheDocument();
  });
  it('menghapus dengan CSRF setelah konfirmasi dan memperbarui isi, hitungan serta feedback', async () => {
    fireEvent.click(await open());
    fireEvent.click(screen.getByRole('button', { name: 'Ya, hapus notifikasi' }));
    expect(await screen.findByText('Notifikasi berhasil dihapus.')).toBeInTheDocument();
    expect(mutations()).toEqual([
      [
        '/admin/documents/notifications/91',
        {
          method: 'DELETE',
          headers: { 'x-csrf-token': 'csrf-test' },
        },
      ],
    ]);
    expect(screen.getByText('Belum ada notifikasi dokumen.')).toBeInTheDocument();
    expect(screen.queryByText('Dokumen 91')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hapus semua' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tutup menu' }));
    expect(await screen.findByRole('button', { name: 'Notifikasi dokumen' })).toBeInTheDocument();
  });
  it('menampilkan loading, menahan penutupan saat proses, dan mempertahankan notifikasi saat gagal', async () => {
    let rejectDelete: (e: Error) => void = () => {};
    await open();
    state.api.mockImplementation((_url, options) =>
      options?.method === 'DELETE'
        ? new Promise((_resolve, reject) => {
            rejectDelete = reject;
          })
        : Promise.resolve([...inbox]),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Hapus notifikasi Dokumen 91' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ya, hapus notifikasi' }));
    expect(screen.getByRole('button', { name: 'Menghapus…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Batal' })).toBeDisabled();
    const dialog = screen.getByRole('dialog', { name: 'Hapus notifikasi ini?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Tutup' }));
    expect(dialog).toBeInTheDocument();
    await act(async () => rejectDelete(new Error('Network error')));
    expect(
      await screen.findByText('Notifikasi belum berhasil dihapus. Silakan coba lagi.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ya, hapus notifikasi' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Batal' }));
    expect(
      await screen.findByRole('button', { name: 'Hapus notifikasi Dokumen 91' }),
    ).toBeInTheDocument();
  });
  it('hapus semua memakai ID snapshot saat dialog dibuka dan mempertahankan notifikasi baru', async () => {
    await open();
    fireEvent.click(screen.getByRole('button', { name: 'Hapus semua' }));
    expect(
      await screen.findByRole('dialog', { name: 'Hapus semua notifikasi?' }),
    ).toBeInTheDocument();
    inbox = [item('92'), item('91')];
    fireEvent(window, new Event('jdih:workflow'));
    await act(async () => {});
    state.api.mockImplementation((_url, options) => {
      if (options?.method === 'DELETE') {
        inbox = [item('92')];
        return Promise.resolve({ jumlahDihapus: 1 });
      }
      return Promise.resolve([...inbox]);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Ya, hapus semua' }));
    expect(
      await screen.findByText('Semua notifikasi sebelumnya berhasil dihapus.'),
    ).toBeInTheDocument();
    expect(mutations()[0]).toEqual([
      '/admin/documents/notifications',
      {
        method: 'DELETE',
        headers: { 'x-csrf-token': 'csrf-test' },
        muatan: { sampaiId: '91' },
      },
    ]);
    expect(screen.getByText('Dokumen 92')).toBeInTheDocument();
    expect(screen.queryByText('Dokumen 91')).not.toBeInTheDocument();
  });
  it('respons polling lama tidak memunculkan kembali notifikasi yang sudah dihapus', async () => {
    await open();
    let resolveOld: (value: unknown) => void = () => {};
    state.api.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve;
        }),
    );
    fireEvent(window, new Event('jdih:workflow'));
    fireEvent.click(screen.getByRole('button', { name: 'Hapus notifikasi Dokumen 91' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ya, hapus notifikasi' }));
    await screen.findByText('Notifikasi berhasil dihapus.');
    await act(async () => resolveOld([item('91')]));
    expect(screen.getByText('Belum ada notifikasi dokumen.')).toBeInTheDocument();
    expect(screen.queryByText('Dokumen 91')).not.toBeInTheDocument();
  });
});
