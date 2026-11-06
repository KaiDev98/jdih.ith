import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AdminUbahDraf } from './admin-ubah-draf';
const state = vi.hoisted(() => ({ api: vi.fn(), filesFail: false, empty: false }));
vi.mock('@/lib/sesi', () => ({
  useSession: () => ({ csrfToken: 'csrf', pengguna: { id: '11', status: 'AKTIF', peran: ['ADMIN'], izin: ['documents.read_admin', 'documents.edit', 'documents.upload', 'documents.revise', 'legal.manage_relations'] } }),
  csrfHeaders: () => ({ 'X-CSRF-Token': 'csrf' }),
}));
vi.mock('@/lib/api-client', async (original) => ({ ...(await original<object>()), ambilApi: state.api }));
beforeEach(() => {
  state.filesFail = false;
  state.empty = false;
  state.api.mockReset().mockImplementation((url: string, options?: { method?: string }) => {
    if (url.endsWith('/reuse-main') && options?.method === 'POST') { state.empty = false; return Promise.resolve({ versionId: '50', disalin: true }); }
    if (url.endsWith('/files')) return state.filesFail ? Promise.reject(new Error('Berkas tidak dapat dimuat')) : Promise.resolve(state.empty ? [] : [{ id: '8', jenisBerkas: 'UTAMA', namaAsli: 'utama-sebelumnya.pdf', sizeBytes: '1024', mimeType: 'application/pdf', bolehHapus: 1 }]);
    if (url.endsWith('/relations') || url.endsWith('/kategori')) return Promise.resolve([]);
    return Promise.resolve({ document: { id: '5', versionId: '50', nomorVersi: 2, statusWorkflow: 'DRAF', tingkatAkses: 'publik', judul: 'Draf Revisi', deskripsi: null, nomor: '12', tahun: 2026, pic: 'Hukum', tanggalPenetapan: '2026-11-06', bolehUbah: true }, kategoriId: [] });
  });
});
afterEach(cleanup);

it('draf revisi lama yang kosong dapat memakai dokumen asli dengan konfirmasi dan CSRF tanpa unggah ulang', async () => {
  state.empty = true;
  render(<AdminUbahDraf id="5" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Gunakan Dokumen Asli' }));
  expect(state.api.mock.calls.every(([, options]) => !options?.method)).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Ya, lanjutkan' }));
  await screen.findByText('utama-sebelumnya.pdf');
  expect(state.api).toHaveBeenCalledWith('/admin/documents/versions/50/reuse-main', { method: 'POST', headers: { 'X-CSRF-Token': 'csrf' }, muatan: {} });
  expect(screen.queryByLabelText('Pilih berkas dokumen utama')).not.toBeInTheDocument();
});

it('Ubah Dokumen menempatkan hubungan setelah berkas dan memakai file sebelumnya tanpa meminta unggah ulang', async () => {
  render(<AdminUbahDraf id="5" />);
  await screen.findByRole('heading', { name: 'Ubah Dokumen' });
  const data = screen.getByRole('heading', { name: 'Data Dokumen' });
  const file = screen.getByRole('heading', { name: 'Berkas' });
  const relation = screen.getByRole('heading', { name: 'Hubungan dengan Dokumen Lain' });
  expect(data.compareDocumentPosition(file) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(file.compareDocumentPosition(relation) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(await screen.findByText('utama-sebelumnya.pdf')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Pratinjau' })).toBeEnabled();
  expect(screen.queryByLabelText('Pilih berkas dokumen utama')).not.toBeInTheDocument();
  expect(relation.closest('details')).not.toHaveAttribute('open');
  expect(screen.getByLabelText('Deskripsi Singkat (opsional)')).not.toBeRequired();
  expect(state.api.mock.calls.every(([, options]) => !options?.method)).toBe(true);
});
it('gagal memuat berkas tidak dianggap sebagai draf kosong dan dapat dicoba kembali', async () => {
  state.filesFail = true;
  render(<AdminUbahDraf id="5" />);
  expect(await screen.findByText('Berkas Belum Dapat Dimuat')).toBeInTheDocument();
  expect(screen.queryByLabelText('Pilih berkas dokumen utama')).not.toBeInTheDocument();
  state.filesFail = false;
  fireEvent.click(screen.getByRole('button', { name: 'Coba Lagi' }));
  await screen.findByText('utama-sebelumnya.pdf');
  await waitFor(() => expect(screen.queryByText('Berkas Belum Dapat Dimuat')).not.toBeInTheDocument());
});
