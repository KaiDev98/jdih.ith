import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DialogTambahAdmin } from './dialog-kelola-admin';

const ambilApi = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api-client', async (asli) => ({
  ...(await asli<typeof import('@/lib/api-client')>()),
  ambilApi,
}));
vi.mock('@/lib/sesi', async (asli) => ({
  ...(await asli<typeof import('@/lib/sesi')>()),
  useSession: () => ({ csrfToken: 'token' }),
}));

const UNIT = [
  { id: '9014', nama: 'Bagian Hukum' },
  { id: '9015', nama: 'Komisi Etik' },
];

function siapkan() {
  ambilApi.mockReset();
  ambilApi.mockImplementation((jalur: string) =>
    Promise.resolve(jalur === '/public/units' ? UNIT : { email: 'admin.baru@ith.ac.id' }),
  );
  render(<DialogTambahAdmin buka onBukaChange={() => {}} onDibuat={() => {}} />);
}

function isiData() {
  fireEvent.change(screen.getByLabelText('Nama lengkap'), { target: { value: 'Admin Baru' } });
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'admin.baru@ith.ac.id' },
  });
  fireEvent.change(screen.getByLabelText('Password awal'), {
    target: { value: 'AwalKuat2026' },
  });
}

describe('DialogTambahAdmin', () => {
  it('menawarkan unit kerja dari daftar unit SOP', async () => {
    siapkan();
    expect(await screen.findByRole('option', { name: 'Bagian Hukum' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Komisi Etik' })).toBeInTheDocument();
    expect(ambilApi).toHaveBeenCalledWith('/public/units');
  });

  it('mewajibkan unit kerja sebelum akun dibuat', async () => {
    siapkan();
    await screen.findByRole('option', { name: 'Bagian Hukum' });
    isiData();
    fireEvent.click(screen.getByRole('button', { name: 'Buat akun Admin' }));
    expect(await screen.findByText('Pilih unit kerja')).toBeInTheDocument();
    expect(ambilApi).not.toHaveBeenCalledWith('/admin/users/admins', expect.anything());
  });

  it('mengirim unit kerja yang dipilih', async () => {
    siapkan();
    await screen.findByRole('option', { name: 'Bagian Hukum' });
    isiData();
    fireEvent.change(screen.getByLabelText('Unit kerja'), { target: { value: '9014' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buat akun Admin' }));
    await waitFor(() =>
      expect(ambilApi).toHaveBeenCalledWith(
        '/admin/users/admins',
        expect.objectContaining({
          method: 'POST',
          muatan: expect.objectContaining({ unitKerjaId: '9014' }),
        }),
      ),
    );
  });
});
