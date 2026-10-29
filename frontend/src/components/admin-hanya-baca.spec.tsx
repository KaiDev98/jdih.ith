import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminMaster } from './admin-master';
import { AdminTemplates } from './admin-templates';
import { AdminKontak } from './admin-kontak';
import { AdminUsers } from './admin-users';
import { ProfilAdmin } from './admin/profil-admin';

const state = vi.hoisted(() => ({
  pengguna: { id: '1', nama: 'Admin Uji', surel: 'sendiri@ith.ac.id', avatarUrl: null, status: 'AKTIF', peran: ['ADMIN'], izin: ['documents.read_admin', 'master.manage', 'templates.manage', 'contact.manage', 'users.delete', 'users.set_status', 'users.approve'] },
  api: vi.fn(),
}));
vi.mock('@/lib/sesi', () => ({ useSession: () => ({ pengguna: state.pengguna, csrfToken: 'csrf' }), csrfHeaders: () => ({}) }));
vi.mock('@/lib/api-client', async (original) => ({ ...(await original<object>()), ambilApi: state.api }));

beforeEach(() => {
  state.pengguna.peran = ['ADMIN'];
  state.api.mockReset().mockImplementation((url: string) => Promise.resolve(
    url === '/public/contact' ? { butir: [{ id: '1', jenis: 'SUREL', label: null, nilai: 'hukum@ith.ac.id' }] } :
    url === '/admin/letter-templates' ? [{ id: '1', nama: 'Surat tugas', slug: 'surat-tugas', aktif: true, nomorVersi: 1, tingkatAkses: 'PUBLIK' }] :
    url === '/admin/users/accounts' ? [{ id: '2', nama: 'Admin Lain', email: 'lain@ith.ac.id', status: 'AKTIF', peran: ['ADMIN'] }] :
    url === '/admin/users' ? [{ id: '3', nama: 'Dosen Baru', email: 'baru@ith.ac.id', status: 'MENUNGGU_VERIFIKASI', unitKerjaId: '1' }] :
    [{ id: '1', nama: 'Keuangan', kode: 'KEU', aktif: true }],
  ));
});
afterEach(cleanup);

describe('Halaman informasi Admin tetap terbuka dengan kontrol perubahan nonaktif', () => {
  it('Admin melihat email sendiri lengkap pada profil', async () => {
    render(<ProfilAdmin />);
    expect(await screen.findByText('sendiri@ith.ac.id')).toBeInTheDocument();
    expect(screen.queryByText('s***@ith.ac.id')).not.toBeInTheDocument();
  });
  it('daftar akun menampilkan email sendiri lengkap dan menyensor email akun lain', async () => {
    state.api.mockImplementation((url: string) => Promise.resolve(url === '/admin/users/accounts' ? [
      { id: '1', nama: 'Admin Uji', email: 'sendiri@ith.ac.id', status: 'AKTIF', peran: ['ADMIN'] },
      { id: '2', nama: 'Admin Lain', email: 'lain@ith.ac.id', status: 'AKTIF', peran: ['ADMIN'] },
    ] : []));
    render(<AdminUsers />);
    await screen.findAllByText('sendiri@ith.ac.id');
    await screen.findAllByText('l***@ith.ac.id');
    expect(document.body.textContent).not.toContain('lain@ith.ac.id');
    expect(screen.queryByText('s***@ith.ac.id')).not.toBeInTheDocument();
  });
  it('menampilkan master data dan menonaktifkan tombol serta formulir meskipun Admin punya izin langsung', async () => {
    render(<AdminMaster table="kategori" />);
    expect(await screen.findAllByText('Keuangan')).toHaveLength(2);
    for (const button of screen.getAllByRole('button', { name: 'Ubah' })) expect(button).toBeDisabled();
    expect(screen.getByLabelText('Nama')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Tambah' })).toBeDisabled();
    expect(state.api.mock.calls.every(([, options]) => !options?.method)).toBe(true);
  });
  it('Superadmin tetap dapat mengisi master data', async () => {
    state.pengguna.peran = ['SUPERADMIN'];
    render(<AdminMaster table="kategori" />);
    await screen.findAllByText('Keuangan');
    expect(screen.getByLabelText('Nama')).toBeEnabled();
    fireEvent.change(screen.getByLabelText('Nama'), { target: { value: 'Hukum' } });
    fireEvent.change(screen.getByLabelText('Kode'), { target: { value: 'HKM' } });
    expect(screen.getByRole('button', { name: 'Tambah' })).toBeEnabled();
  });
  it('Admin dapat membuat format dan mengelola format yang sudah ada', async () => {
    render(<AdminTemplates />);
    expect(await screen.findByText('Surat tugas')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Versi baru' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Arsipkan' })).toBeEnabled();
    fireEvent.change(screen.getByLabelText('Nama'), { target: { value: 'Surat izin' } });
    fireEvent.change(screen.getByLabelText(/^Berkas/), { target: { files: [new File(['%PDF-1.7'], 'format.pdf', { type: 'application/pdf' })] } });
    fireEvent.click(screen.getByRole('button', { name: 'Buat template' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(state.api.mock.calls.every(([, options]) => !options?.method)).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Ya, lanjutkan' }));
    await waitFor(() => expect(state.api).toHaveBeenCalledWith('/admin/letter-templates', expect.objectContaining({ method: 'POST', muatan: expect.any(FormData) })));
  });
  it('Admin dapat mengunggah versi baru dengan konfirmasi', async () => {
    render(<AdminTemplates />);
    fireEvent.click(await screen.findByRole('button', { name: 'Versi baru' }));
    expect(screen.getByRole('heading', { name: 'Versi baru: Surat tugas' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/^Berkas/), { target: { files: [new File(['%PDF-1.7'], 'format.pdf', { type: 'application/pdf' })] } });
    fireEvent.click(screen.getByRole('button', { name: 'Unggah versi' }));
    expect(state.api.mock.calls.every(([, options]) => !options?.method)).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Ya, lanjutkan' }));
    await waitFor(() => expect(state.api).toHaveBeenCalledWith('/admin/letter-templates/1/versions', expect.objectContaining({ method: 'POST', muatan: expect.any(FormData) })));
  });
  it('Admin dapat mengarsipkan format dengan konfirmasi', async () => {
    render(<AdminTemplates />);
    fireEvent.click(await screen.findByRole('button', { name: 'Arsipkan' }));
    expect(state.api.mock.calls.every(([, options]) => !options?.method)).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Ya, lanjutkan' }));
    await waitFor(() => expect(state.api).toHaveBeenCalledWith('/admin/letter-templates/1/archive', expect.objectContaining({ method: 'POST' })));
  });
  it('kontak tetap hanya dapat dibaca Admin', async () => {
    render(<AdminKontak />);
    expect(await screen.findByText('hukum@ith.ac.id')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ubah' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Hapus' })).toBeDisabled();
  });
  it('Admin dapat meninjau informasi akun, tetapi tidak dapat menyetujui atau mengelolanya', async () => {
    render(<AdminUsers />);
    await screen.findAllByText('l***@ith.ac.id');
    expect(document.body.textContent).not.toContain('lain@ith.ac.id');
    expect(document.body.textContent).not.toContain('baru@ith.ac.id');
    expect(screen.queryByRole('button', { name: /Tambah Admin/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Dosen\/Staf/ }));
    await screen.findByText('Dosen Baru');
    fireEvent.click(screen.getByRole('button', { name: 'Tinjau' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Setujui' })).toBeDisabled());
    expect(screen.getByLabelText('Unit kerja untuk persetujuan')).toBeDisabled();
    expect(document.body.textContent).not.toContain('baru@ith.ac.id');
    expect(state.api.mock.calls.every(([, options]) => !options?.method)).toBe(true);
  });
  it('Superadmin melihat email akun lengkap', async () => {
    state.pengguna.peran = ['SUPERADMIN'];
    render(<AdminUsers />);
    await screen.findAllByText('lain@ith.ac.id');
    fireEvent.click(screen.getByRole('button', { name: /^Dosen\/Staf/ }));
    await screen.findByText('Dosen Baru');
    expect(document.body.textContent).toContain('baru@ith.ac.id');
    expect(document.body.textContent).not.toContain('l***@ith.ac.id');
  });
});
