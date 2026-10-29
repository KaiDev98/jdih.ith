import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminUsers } from './admin-users';

const state = vi.hoisted(() => ({ role: 'SUPERADMIN', id: '1', api: vi.fn() }));
vi.mock('@/lib/sesi', () => ({
  useSession: () => ({
    csrfToken: 'csrf',
    pengguna: { id: state.id, peran: [state.role], status: 'AKTIF', izin: ['users.approve'] },
  }),
  csrfHeaders: () => ({}),
}));
vi.mock('@/lib/api-client', async (original) => ({
  ...(await original<object>()),
  ambilApi: state.api,
}));
const accounts = [
  {
    id: '1',
    nama: 'Superadmin Satu',
    email: 'super@ith.ac.id',
    peran: ['SUPERADMIN'],
    status: 'AKTIF',
    unitKerja: 'TIK',
  },
  {
    id: '2',
    nama: 'Admin Unit',
    email: 'admin@ith.ac.id',
    peran: ['ADMIN', 'DOSEN_STAF'],
    status: 'AKTIF',
    unitKerja: 'Akademik',
  },
  {
    id: '3',
    nama: 'Dosen Kampus',
    email: 'dosen@ith.ac.id',
    peran: ['DOSEN_STAF'],
    status: 'AKTIF',
    unitKerja: 'Laboratorium',
  },
];
beforeEach(() => {
  state.role = 'SUPERADMIN';
  state.id = '1';
  state.api
    .mockReset()
    .mockImplementation((url: string) =>
      Promise.resolve(url.endsWith('/accounts') ? accounts : []),
    );
});
afterEach(cleanup);
describe('dua kelompok pengguna', () => {
  it.each(['ADMIN', 'SUPERADMIN'])(
    'menampilkan unit Superadmin secara konsisten pada panel %s',
    async (role) => {
      state.role = role;
      render(<AdminUsers />);
      await screen.findAllByText('Superadmin Satu');
      expect(screen.queryByText('TIK')).not.toBeInTheDocument();
      const row = screen.getByRole('row', { name: /Superadmin Satu/ });
      expect(within(row).getAllByRole('cell')[3]).toHaveTextContent(/^Superadmin$/);
      expect(screen.getByText('· Superadmin')).toBeInTheDocument();
    },
  );
  it('memisahkan pengelola dari Dosen/Staf dan mempertahankan pencarian di kelompok aktif', async () => {
    render(<AdminUsers />);
    await screen.findAllByText('Admin Unit');
    expect(screen.getAllByText('Superadmin Satu')).toHaveLength(2);
    expect(screen.getByRole('columnheader', { name: 'Unit' })).toBeInTheDocument();
    expect(screen.queryByText('Dosen Kampus')).not.toBeInTheDocument();
    const staff = screen.getByRole('button', { name: /^Dosen\/Staf/ });
    fireEvent.click(staff);
    expect(staff).toHaveAttribute('aria-pressed', 'true');
    await screen.findAllByText('Dosen Kampus');
    expect(screen.queryByText('Admin Unit')).not.toBeInTheDocument();
    expect(screen.queryByText('Superadmin Satu')).not.toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Unit' })).toBeInTheDocument();
    expect(screen.getAllByText(/Laboratorium/)).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Tambah Admin' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'tidak ada' } });
    expect(screen.getByText('Tidak ada akun yang cocok pada kelompok ini.')).toBeInTheDocument();
    expect(state.api.mock.calls.every(([, options]) => !options?.method)).toBe(true);
  });
  it.each(['ADMIN', 'SUPERADMIN'])(
    'kelompok Dosen/Staf menampilkan unit pada panel %s',
    async (role) => {
      state.role = role;
      render(<AdminUsers />);
      fireEvent.click(screen.getByRole('button', { name: /^Dosen\/Staf/ }));
      await screen.findAllByText('Dosen Kampus');
      expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
        'Nama',
        'Email',
        'Peran',
        'Unit',
        'Status',
        'Aksi',
      ]);
      expect(screen.getAllByText(/Laboratorium/)).toHaveLength(2);
      expect(screen.getAllByText('Aktif')).toHaveLength(2);
    },
  );
  it('persetujuan pendaftaran memperbarui antrean dan daftar Dosen/Staf dengan konfirmasi', async () => {
    let approved = false;
    state.api.mockImplementation((url: string, options?: { method?: string }) => {
      if (url.endsWith('/approve') && options?.method === 'POST') {
        approved = true;
        return Promise.resolve({});
      }
      return Promise.resolve(
        url.endsWith('/accounts')
          ? accounts
          : url === '/public/units'
            ? [{ id: '7', nama: 'TIK' }]
            : url === '/admin/users' && !approved
              ? [
                  {
                    id: '9',
                    nama: 'Pendaftar Baru',
                    email: 'baru@ith.ac.id',
                    unitKerjaId: '7',
                    unitManual: null,
                  },
                ]
              : [],
      );
    });
    render(<AdminUsers />);
    fireEvent.click(screen.getByRole('button', { name: /^Dosen\/Staf/ }));
    const review = await screen.findByRole('button', { name: 'Tinjau' });
    const pendingRow = within(review.closest('li')!);
    expect(pendingRow.getByText('Dosen/Staf')).toBeInTheDocument();
    expect(pendingRow.getByText('Menunggu')).toBeInTheDocument();
    expect(pendingRow.getByText('Unit: TIK')).toBeInTheDocument();
    fireEvent.click(review);
    fireEvent.click(screen.getByRole('button', { name: 'Setujui' }));
    expect(approved).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Ya, lanjutkan' }));
    await screen.findByText('Akun berhasil disetujui.');
    await screen.findByText('Tidak ada pendaftaran Dosen/Staf yang menunggu verifikasi.');
    expect(
      state.api.mock.calls.filter(([url]) => url.endsWith('/accounts')).length,
    ).toBeGreaterThan(1);
  });
  it('menempatkan Superadmin pertama dan Admin sendiri kedua pada tabel maupun kartu', async () => {
    state.role = 'ADMIN';
    state.id = '2';
    const other = { ...accounts[1], id: '8', nama: 'Admin Lain' };
    state.api.mockImplementation((url: string) =>
      Promise.resolve(url.endsWith('/accounts') ? [other, accounts[1], accounts[0]] : []),
    );
    render(<AdminUsers />);
    await screen.findAllByText('Admin Lain');
    const table = screen.getByRole('table');
    const names = within(table)
      .getAllByRole('row')
      .slice(1)
      .map(
        (row) => within(row).getAllByRole('cell')[0]?.querySelector('span.min-w-0')?.textContent,
      );
    expect(names).toEqual(['Superadmin Satu', 'Admin Unit(Anda)', 'Admin Lain']);
    const cards = screen.getAllByRole('listitem');
    expect(cards[0]?.textContent).toContain('Superadmin Satu');
    expect(cards[1]?.textContent).toContain('Admin Unit');
    expect(screen.queryByRole('button', { name: 'Tambah Admin' })).not.toBeInTheDocument();
  });
  it('Superadmin dapat langsung membuka verifikasi dari ringkasan Pengguna', async () => {
    render(<AdminUsers />);
    await screen.findAllByText('Superadmin Satu');
    fireEvent.click(screen.getByRole('button', { name: 'Buka verifikasi' }));
    expect(screen.getByRole('button', { name: /^Dosen\/Staf/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await screen.findAllByText(/Laboratorium/);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Laboratorium' } });
    expect(
      screen.queryByText('Tidak ada akun yang cocok pada kelompok ini.'),
    ).not.toBeInTheDocument();
  });
});
