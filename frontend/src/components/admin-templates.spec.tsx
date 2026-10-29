import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminTemplates } from './admin-templates';

const state = vi.hoisted(() => ({
  role: 'ADMIN',
  permissions: ['templates.manage'],
  api: vi.fn(),
}));
vi.mock('@/lib/sesi', () => ({
  useSession: () => ({
    pengguna: { status: 'AKTIF', peran: [state.role], izin: state.permissions },
    csrfToken: 'csrf',
  }),
  csrfHeaders: () => ({ 'X-CSRF-Token': 'csrf' }),
}));
vi.mock('@/lib/api-client', async (original) => ({
  ...(await original<object>()),
  ambilApi: state.api,
}));
const rows = [
  {
    id: '1',
    nama: 'Surat Tugas',
    slug: 'surat-tugas',
    aktif: 1,
    nomorVersi: 2,
    tingkatAkses: 'PUBLIK',
  },
  {
    id: '2',
    nama: 'Surat Lama',
    slug: 'surat-lama',
    aktif: 0,
    nomorVersi: 1,
    tingkatAkses: 'INTERNAL',
  },
];
beforeEach(() => {
  state.role = 'ADMIN';
  state.permissions = ['templates.manage'];
  state.api.mockReset().mockResolvedValue(rows);
});
afterEach(cleanup);

describe('pustaka Format Persuratan', () => {
  it('filter status tetap tersedia tanpa bilah pencarian atau izin mengubah', async () => {
    state.permissions = [];
    render(<AdminTemplates />);
    await screen.findByText('Surat Tugas');
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Arsip 1' }));
    expect(screen.queryByText('Surat Tugas')).not.toBeInTheDocument();
    expect(screen.getByText('Surat Lama')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Buat template' })).toBeDisabled();
    expect(state.api.mock.calls.every(([, options]) => !options?.method)).toBe(true);
  });
  it('mengosongkan pilihan berkas ketika berpindah ke versi baru', async () => {
    render(<AdminTemplates />);
    await screen.findByText('Surat Tugas');
    fireEvent.change(screen.getByLabelText(/^Berkas/), {
      target: { files: [new File(['data'], 'lama.docx')] },
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'Versi baru' })[0]!);
    expect(screen.getByRole('heading', { name: 'Versi baru: Surat Tugas' })).toBeInTheDocument();
    expect(screen.queryByText('lama.docx')).not.toBeInTheDocument();
    expect((screen.getByLabelText(/^Berkas/) as HTMLInputElement).value).toBe('');
    expect(screen.getByRole('button', { name: 'Unggah versi' })).toBeDisabled();
  });
  it('mempertahankan formulir dan menampilkan kegagalan unggahan', async () => {
    state.api.mockImplementation((_url: string, options?: { method?: string }) =>
      options?.method ? Promise.reject(new Error('Berkas tidak valid')) : Promise.resolve(rows),
    );
    render(<AdminTemplates />);
    await screen.findByText('Surat Tugas');
    fireEvent.change(screen.getByLabelText('Nama'), { target: { value: 'Surat Izin' } });
    fireEvent.change(screen.getByLabelText(/^Berkas/), {
      target: { files: [new File(['data'], 'izin.docx')] },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Buat template' }));
    expect(state.api.mock.calls.some(([, options]) => options?.method)).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Ya, lanjutkan' }));
    await screen.findByText('Berkas tidak valid');
    expect(screen.getByLabelText('Nama')).toHaveValue('Surat Izin');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Ya, lanjutkan' })).toBeEnabled(),
    );
  });
});
