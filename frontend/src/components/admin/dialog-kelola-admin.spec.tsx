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

async function bukaUnit() {
  await waitFor(() => expect(screen.getByLabelText('Unit kerja')).toBeEnabled());
  fireEvent.keyDown(screen.getByLabelText('Unit kerja'), { key: 'ArrowDown' });
  return screen.findByRole('menuitemradio', { name: 'Bagian Hukum' });
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
    expect(await bukaUnit()).toBeInTheDocument();
    expect(screen.getByRole('menuitemradio', { name: 'Komisi Etik' })).toBeInTheDocument();
    expect(ambilApi).toHaveBeenCalledWith('/public/units');
  });

  it('mewajibkan unit kerja sebelum akun dibuat', async () => {
    siapkan();
    await bukaUnit();
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    isiData();
    fireEvent.click(screen.getByRole('button', { name: 'Buat akun Admin' }));
    expect((await screen.findAllByText('Pilih unit kerja')).length).toBeGreaterThan(0);
    expect(ambilApi).not.toHaveBeenCalledWith('/admin/users/admins', expect.anything());
  });

  it('mengirim unit kerja yang dipilih', async () => {
    siapkan();
    await bukaUnit();
    isiData();
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Bagian Hukum' }));
    fireEvent.click(screen.getByRole('button', { name: 'Buat akun Admin' }));
    const confirm = await screen.findByRole('button', { name: 'Ya, buat Admin' });
    expect(screen.getByRole('dialog')).toHaveTextContent('Bagian Hukum');
    expect(ambilApi).not.toHaveBeenCalledWith('/admin/users/admins', expect.anything());
    fireEvent.click(confirm);
    await waitFor(() =>
      expect(ambilApi).toHaveBeenCalledWith(
        '/admin/users/admins',
        expect.objectContaining({
          method: 'POST',
          muatan: expect.objectContaining({ unitKerjaId: '9014' }),
        }),
      ),
    );
    expect(await screen.findByText('Akun Admin dibuat')).toBeInTheDocument();
  });

  it('mempertahankan isian ketika kembali dari konfirmasi', async () => {
    siapkan();
    await bukaUnit();
    isiData();
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Bagian Hukum' }));
    fireEvent.click(screen.getByRole('button', { name: 'Buat akun Admin' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Periksa kembali' }));
    expect(screen.getByLabelText('Nama lengkap')).toHaveValue('Admin Baru');
    expect(screen.getByLabelText('Email')).toHaveValue('admin.baru@ith.ac.id');
    expect(screen.getByLabelText('Unit kerja')).toHaveValue('9014');
    expect(ambilApi).not.toHaveBeenCalledWith('/admin/users/admins', expect.anything());
  });

  it('menahan klik ganda selama pembuatan akun', async () => {
    siapkan();
    await bukaUnit();
    let selesai!: (value: { email: string }) => void;
    ambilApi.mockImplementation((path: string) =>
      path === '/public/units'
        ? Promise.resolve(UNIT)
        : new Promise((resolve) => {
            selesai = resolve;
          }),
    );
    isiData();
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Bagian Hukum' }));
    fireEvent.click(screen.getByRole('button', { name: 'Buat akun Admin' }));
    const confirm = await screen.findByRole('button', { name: 'Ya, buat Admin' });
    fireEvent.click(confirm);
    await waitFor(() => expect(confirm).toBeDisabled());
    fireEvent.click(confirm);
    expect(ambilApi.mock.calls.filter(([path]) => path === '/admin/users/admins')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Tutup' })).toBeDisabled();
    selesai({ email: 'admin.baru@ith.ac.id' });
    expect(await screen.findByText('Akun Admin dibuat')).toBeInTheDocument();
  });

  it('menampilkan kegagalan API agar formulir dapat diperbaiki', async () => {
    siapkan();
    await bukaUnit();
    ambilApi.mockImplementation((path: string) =>
      path === '/public/units'
        ? Promise.resolve(UNIT)
        : Promise.reject(new Error('Pembuatan gagal')),
    );
    isiData();
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Bagian Hukum' }));
    fireEvent.click(screen.getByRole('button', { name: 'Buat akun Admin' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Ya, buat Admin' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Pembuatan gagal');
    expect(screen.getByLabelText('Email')).toHaveValue('admin.baru@ith.ac.id');
  });
});
