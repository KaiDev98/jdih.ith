import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AntreanPermintaanPenghapusan, FormPermintaanPenghapusan } from './admin-removal-requests';
const state = vi.hoisted(() => ({ role: 'ADMIN', api: vi.fn(), list: vi.fn() }));
vi.mock('@/lib/api-client', async (original) => ({
  ...(await original<object>()),
  ambilApi: state.api,
  ambilApiBerdaftar: state.list,
}));
vi.mock('@/lib/sesi', () => ({
  useSession: () => ({
    pengguna: {
      peran: [state.role],
      izin: ['documents.read_admin', 'documents.delete', 'workflow.withdraw'],
    },
    csrfToken: 'csrf',
  }),
  csrfHeaders: () => ({ 'x-csrf-token': 'csrf' }),
}));
const request = {
  id: '9',
  sumber: 'DOCUMENT',
  resourceId: '5',
  versionId: '50',
  judul: 'Peraturan pengujian',
  jenis: 'DELETE',
  alasan: 'Salah unggah',
  status: 'PENDING',
  pemohon: 'Admin Hukum',
  catatan: null,
  createdAt: '2026-11-04T00:00:00Z',
};
beforeEach(() => {
  state.role = 'ADMIN';
  state.api.mockReset().mockResolvedValue({});
  state.list.mockReset().mockResolvedValue({ data: [request], meta: { totalButir: 1 } });
});
afterEach(cleanup);
describe('permintaan penarikan dan penghapusan', () => {
  it('permintaan versi lama mengikat versionId dan tidak menawarkan penghapusan seluruh dokumen', async () => {
    render(<FormPermintaanPenghapusan sumber="DOCUMENT" resourceId="5" judul="SK Lama" bisaTarik={false} versionId="50" nomorVersi={1} />);
    expect(screen.queryByRole('button', { name: 'Minta Penghapusan' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Minta Hapus Versi 1' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Revisi terbaru, dokumen di portal dan versi lain tetap tersedia.');
    fireEvent.change(screen.getByLabelText('Alasan permintaan'), { target: { value: 'Versi pengganti sudah terbit' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kirim permintaan' }));
    await screen.findByText(/Permintaan terkirim/);
    expect(state.api).toHaveBeenCalledWith('/admin/documents/5/removal-requests', { method: 'POST', headers: { 'x-csrf-token': 'csrf' }, muatan: { jenis: 'DELETE_VERSION', alasan: 'Versi pengganti sudah terbit', versionId: '50' } });
  });
  it('Superadmin melihat konfirmasi hapus satu versi dengan revisi tetap tersedia', async () => {
    state.role = 'SUPERADMIN';
    state.list.mockResolvedValue({ data: [{ ...request, jenis: 'DELETE_VERSION', judul: 'SK Lama · Versi 1' }], meta: { totalButir: 1 } });
    render(<AntreanPermintaanPenghapusan />);
    fireEvent.click(await screen.findByRole('button', { name: 'Setujui & Hapus Versi' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Induk dokumen, revisi terbaru dan publikasi tetap tersedia.');
    fireEvent.click(screen.getByRole('button', { name: 'Ya, lanjutkan' }));
    await screen.findByText('Versi lama berhasil dihapus. Revisi terbaru tetap tersedia.');
    expect(state.api).toHaveBeenCalledWith('/admin/removal-requests/9/decision', { method: 'POST', headers: { 'x-csrf-token': 'csrf' }, muatan: { keputusan: 'APPROVE', catatan: '' } });
  });
  it('menampilkan kegagalan dengan hitungan tidak tersedia dan dapat dimuat ulang', async () => {
    state.list.mockRejectedValueOnce(new Error('Temporary failure')).mockResolvedValue({ data: [request], meta: { totalButir: 1 } });
    render(<AntreanPermintaanPenghapusan />);
    await screen.findByText('Permintaan gagal dimuat');
    expect(screen.getByRole('heading', { name: /Permintaan Pencabutan & Penghapusan/ })).toHaveTextContent('—');
    fireEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));
    await screen.findByText('Peraturan pengujian');
    expect(screen.queryByText('Permintaan gagal dimuat')).not.toBeInTheDocument();
  });
  it('tautan keputusan membuka riwayat pada permintaan yang tepat dan dapat kembali ke seluruh daftar', async () => {
    render(<AntreanPermintaanPenghapusan requestId="9" showHistory />);
    await screen.findByText('Peraturan pengujian');
    expect(state.list).toHaveBeenCalledWith('/admin/removal-requests', expect.objectContaining({ kueri: expect.objectContaining({ requestId: '9', status: 'ALL' }) }));
    fireEvent.click(screen.getByRole('button', { name: 'Semua permintaan' }));
    await waitFor(() => expect(state.list).toHaveBeenLastCalledWith('/admin/removal-requests', expect.objectContaining({ kueri: expect.objectContaining({ requestId: undefined, status: 'ALL' }) })));
  });
  it('memerlukan alasan dan konfirmasi, membatalkan tanpa menulis, lalu mengirim CSRF satu kali', async () => {
    let done!: () => void;
    state.api.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          done = resolve;
        }),
    );
    render(
      <FormPermintaanPenghapusan
        sumber="DOCUMENT"
        resourceId="5"
        judul="Peraturan pengujian"
        bisaTarik
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Minta Penghapusan' }));
    expect(screen.getByRole('button', { name: 'Kirim permintaan' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Batal' }));
    expect(state.api).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Minta Penghapusan' }));
    fireEvent.change(screen.getByLabelText('Alasan permintaan'), {
      target: { value: 'Salah unggah' },
    });
    const confirm = screen.getByRole('button', { name: 'Kirim permintaan' });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(state.api).toHaveBeenCalledExactlyOnceWith('/admin/documents/5/removal-requests', {
      method: 'POST',
      headers: { 'x-csrf-token': 'csrf' },
      muatan: { jenis: 'DELETE', alasan: 'Salah unggah' },
    });
    done();
    await screen.findByText(/Permintaan terkirim/);
    expect(screen.getByRole('button', { name: 'Minta Penghapusan' })).toBeDisabled();
  });
  it('format hanya meminta penghapusan walaupun bisaTarik=true; mempertahankan alasan jika gagal', async () => {
    state.api.mockRejectedValue(new Error('Masih ada permintaan menunggu'));
    render(
      <FormPermintaanPenghapusan
        sumber="TEMPLATE"
        resourceId="7"
        judul="Format tugas"
        bisaTarik
      />,
    );
    expect(screen.queryByRole('button', { name: 'Minta Pencabutan' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Minta Penarikan' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Minta Penghapusan' }));
    fireEvent.change(screen.getByLabelText('Alasan permintaan'), {
      target: { value: 'Format salah' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Kirim permintaan' }));
    await screen.findByText('Masih ada permintaan menunggu');
    expect(state.api).toHaveBeenCalledExactlyOnceWith('/admin/letter-templates/7/removal-requests', {
      method: 'POST', headers: { 'x-csrf-token': 'csrf' }, muatan: { jenis: 'DELETE', alasan: 'Format salah' },
    });
    expect(screen.getByLabelText('Alasan permintaan')).toHaveValue('Format salah');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
  it('panel khusus format berjudul Permintaan Penghapusan', async () => {
    render(<AntreanPermintaanPenghapusan sumber="TEMPLATE" />);
    expect(await screen.findByRole('heading', { name: /^Permintaan Penghapusan/ })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Pencabutan/ })).not.toBeInTheDocument();
  });
  it('Admin hanya memantau, walaupun mempunyai izin keputusan langsung', async () => {
    render(<AntreanPermintaanPenghapusan />);
    await screen.findByText('Peraturan pengujian');
    expect(screen.queryByRole('button', { name: 'Setujui & hapus' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tidak setujui' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Lihat riwayat' }));
    await waitFor(() =>
      expect(state.list).toHaveBeenLastCalledWith(
        '/admin/removal-requests',
        expect.objectContaining({ kueri: expect.objectContaining({ status: 'ALL' }) }),
      ),
    );
  });
  it('Superadmin dapat menyimpan catatan opsional, lalu menampilkan hasil tindakan', async () => {
    state.role = 'SUPERADMIN';
    render(<AntreanPermintaanPenghapusan />);
    fireEvent.click(await screen.findByRole('button', { name: 'Setujui & hapus' }));
    expect(state.api).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Ya, lanjutkan' })).toBeEnabled();
    fireEvent.change(screen.getByLabelText('Catatan keputusan (opsional)'), {
      target: { value: 'Sesuai alasan pemohon' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Ya, lanjutkan' }));
    await screen.findByText('Dokumen berhasil dihapus.');
    expect(state.api).toHaveBeenCalledExactlyOnceWith('/admin/removal-requests/9/decision', {
      method: 'POST',
      headers: { 'x-csrf-token': 'csrf' },
      muatan: { keputusan: 'APPROVE', catatan: 'Sesuai alasan pemohon' },
    });
  });
  it.each(['Setujui & hapus', 'Tidak setujui'])('memproses %s tanpa catatan, tetap dengan konfirmasi dan CSRF', async (label) => {
    state.role = 'SUPERADMIN';
    render(<AntreanPermintaanPenghapusan />);
    fireEvent.click(await screen.findByRole('button', { name: label }));
    expect(state.api).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Ya, lanjutkan' }));
    await waitFor(() => expect(state.api).toHaveBeenCalledExactlyOnceWith('/admin/removal-requests/9/decision', {
      method: 'POST', headers: { 'x-csrf-token': 'csrf' },
      muatan: { keputusan: label === 'Tidak setujui' ? 'DECLINE' : 'APPROVE', catatan: '' },
    }));
  });
  it('hasil penarikan menyediakan tautan ke dokumen tersimpan dan menjelaskan masa tampil keputusan', async () => {
    state.list.mockResolvedValue({ data: [{ ...request, jenis: 'WITHDRAW', status: 'APPROVED' }], meta: { totalButir: 1 } });
    render(<AntreanPermintaanPenghapusan showHistory />);
    expect(await screen.findByRole('link', { name: 'Lihat dokumen ditarik' })).toHaveAttribute('href', '/admin/dokumen/5?versionId=50');
    expect(screen.getByText(/Keputusan tampil selama 24 jam/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Setujui & tarik' })).not.toBeInTheDocument();
  });
  it('Admin meminta pencabutan dokumen terbit dengan alasan dan konfirmasi, tanpa permintaan penarikan baru', async () => {
    render(<FormPermintaanPenghapusan sumber="DOCUMENT" resourceId="5" judul="Peraturan pengujian" bisaTarik />);
    expect(screen.queryByRole('button', { name: 'Minta Penarikan' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Minta Pencabutan' }));
    expect(screen.getByText(/dokumen tetap tersedia dengan status Dicabut/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kirim permintaan' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Alasan permintaan'), { target: { value: 'Tidak berlaku lagi tanpa pengganti' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kirim permintaan' }));
    await waitFor(() => expect(state.api).toHaveBeenCalledExactlyOnceWith('/admin/documents/5/removal-requests', {
      method: 'POST', headers: { 'x-csrf-token': 'csrf' }, muatan: { jenis: 'REVOKE', alasan: 'Tidak berlaku lagi tanpa pengganti' },
    }));
  });
  it('Superadmin menyetujui pencabutan tanpa catatan dan hasilnya tetap menaut ke dokumen Dicabut', async () => {
    state.role = 'SUPERADMIN';
    state.list.mockResolvedValue({ data: [{ ...request, jenis: 'REVOKE' }], meta: { totalButir: 1 } });
    render(<AntreanPermintaanPenghapusan showHistory />);
    fireEvent.click(await screen.findByRole('button', { name: 'Setujui & Cabut' }));
    expect(screen.getByText(/tetap tersedia dengan status Dicabut/)).toBeInTheDocument();
    state.list.mockResolvedValue({ data: [{ ...request, jenis: 'REVOKE', status: 'APPROVED' }], meta: { totalButir: 1 } });
    fireEvent.click(screen.getByRole('button', { name: 'Ya, lanjutkan' }));
    await screen.findByText('Dokumen berhasil dicabut. Dokumen tetap tersedia dengan status Dicabut.');
    expect(await screen.findByRole('link', { name: 'Lihat Dokumen Dicabut' })).toHaveAttribute('href', '/superadmin/dokumen/5?versionId=50');
    expect(state.api).toHaveBeenCalledExactlyOnceWith('/admin/removal-requests/9/decision', {
      method: 'POST', headers: { 'x-csrf-token': 'csrf' }, muatan: { keputusan: 'APPROVE', catatan: '' },
    });
  });
});
