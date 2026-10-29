import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminDocumentDetail } from './admin-document-detail';
import { DaftarDokumenAdmin } from './admin-daftar-dokumen';

const state = vi.hoisted(() => ({ api: vi.fn(), daftar: vi.fn(), push: vi.fn(), role: 'SUPERADMIN' }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: state.push }) }));
vi.mock('@/lib/sesi', () => ({
  useSession: () => ({ pengguna: { id: '11', peran: [state.role], izin: ['documents.read_admin'], status: 'AKTIF' } }),
  csrfHeaders: () => ({}),
}));
vi.mock('@/lib/api-client', async (original) => ({
  ...(await original<object>()), ambilApi: state.api, ambilApiBerdaftar: state.daftar,
}));

function detail(id = '5', versionId = '50') {
  return {
    document: { id, versionId, judul: `Dokumen ${id} versi ${versionId}`, kodeDokumen: `DOC-${id}`, nomorVersi: 1,
      statusWorkflow: 'DIAJUKAN', statusHukum: 'BERLAKU', tingkatAkses: 'publik', tanggalPenetapan: null },
    versions: [], kategoriId: [], riwayatVerifikasi: [], statusPeraturan: [],
  };
}
const row = { id: '5', versionId: '50', judul: 'Dokumen antrean', nomorVersi: 1,
  tipe: 'SOP', statusWorkflow: 'DIAJUKAN', statusHukum: 'BERLAKU', tingkatAkses: 'publik', diganti: false };

beforeEach(() => {
  state.role = 'SUPERADMIN';
  state.push.mockReset();
  state.api.mockReset().mockImplementation((url: string) => Promise.resolve(url.endsWith('/files') ? [] : detail()));
  state.daftar.mockReset().mockResolvedValue({ data: [row], meta: { totalHalaman: 1, totalButir: 1 } });
});
afterEach(cleanup);

describe('navigasi detail dan pemisahan daftar dokumen', () => {
  for (const role of ['ADMIN', 'SUPERADMIN']) {
    it(`klik judul dan baris antrean mempertahankan halaman asal untuk ${role}`, async () => {
      state.role = role;
      render(<DaftarDokumenAdmin verificationOnly />);
      const links = await screen.findAllByRole('link', { name: /Dokumen antrean/ });
      const root = role === 'ADMIN' ? '/admin' : '/superadmin';
      links.forEach((link) => expect(link).toHaveAttribute('href', `${root}/dokumen/verifikasi/5?versionId=50`));
      fireEvent.click(screen.getByRole('cell', { name: 'Menunggu verifikasi' }));
      expect(state.push).toHaveBeenCalledWith(`${root}/dokumen/verifikasi/5?versionId=50`, undefined);
      expect(state.daftar).toHaveBeenCalledWith('/admin/documents/verification-queue', expect.anything());
    });
  }
  for (const konteks of ['verifikasi', 'pengajuan'] as const) {
    it(`tautan kembali dan riwayat versi tetap dalam ${konteks}`, async () => {
      render(<AdminDocumentDetail id="5" versionId="50" konteks={konteks} />);
      await screen.findByRole('heading', { name: 'Dokumen 5 versi 50' });
      expect(screen.getByRole('link', { name: konteks === 'verifikasi' ? 'Antrean verifikasi' : 'Draf dan pengajuan' }))
        .toHaveAttribute('href', `/superadmin/dokumen/${konteks}`);
      expect(screen.getByRole('link', { name: /Versi 1/ }))
        .toHaveAttribute('href', `/superadmin/dokumen/${konteks}/5?versionId=50`);
      expect(state.api).toHaveBeenCalledWith('/admin/documents/5', { kueri: { versionId: '50' } });
    });
  }
  it('Semua Dokumen meminta cakupan terverifikasi secara eksplisit', async () => {
    state.daftar.mockResolvedValue({ data: [], meta: { totalHalaman: 0, totalButir: 0 } });
    render(<DaftarDokumenAdmin />);
    await screen.findByText('Belum ada dokumen');
    expect(state.daftar).toHaveBeenCalledWith('/admin/documents', {
      kueri: expect.objectContaining({ cakupan: 'TERVERIFIKASI' }),
    });
    expect(screen.queryByRole('tab', { name: 'Menunggu verifikasi' })).not.toBeInTheDocument();
  });
  it('perpindahan versi tidak menampilkan detail atau tindakan dari versi sebelumnya', async () => {
    const view = render(<AdminDocumentDetail id="5" versionId="50" />);
    await screen.findByRole('heading', { name: 'Dokumen 5 versi 50' });
    let resolve: (value: unknown) => void = () => {};
    state.api.mockImplementation((url: string) => url.endsWith('/files') ? Promise.resolve([]) : new Promise((r) => { resolve = r; }));
    view.rerender(<AdminDocumentDetail id="5" versionId="51" />);
    expect(screen.queryByRole('heading', { name: 'Dokumen 5 versi 50' })).not.toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Memuat dokumen' })).toBeInTheDocument();
    await act(async () => resolve(detail('5', '51')));
    expect(await screen.findByRole('heading', { name: 'Dokumen 5 versi 51' })).toBeInTheDocument();
    expect(state.api).toHaveBeenCalledWith('/admin/documents/versions/51/files');
  });
  it('galat dokumen sebelumnya tidak menghalangi dokumen dari notifikasi berikutnya', async () => {
    state.api.mockRejectedValueOnce(new Error('Tidak tersedia'));
    const view = render(<AdminDocumentDetail id="5" versionId="50" />);
    await screen.findByText('Detail dokumen tidak dapat dibuka');
    state.api.mockImplementation((url: string) => Promise.resolve(url.endsWith('/files') ? [] : detail('6', '60')));
    view.rerender(<AdminDocumentDetail id="6" versionId="60" />);
    expect(await screen.findByRole('heading', { name: 'Dokumen 6 versi 60' })).toBeInTheDocument();
    expect(screen.queryByText('Detail dokumen tidak dapat dibuka')).not.toBeInTheDocument();
  });
  it('kegagalan memuat detail dapat dicoba ulang', async () => {
    state.api.mockRejectedValueOnce(new Error('Koneksi putus'));
    render(<AdminDocumentDetail id="5" versionId="50" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Coba lagi' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Dokumen 5 versi 50' })).toBeInTheDocument());
  });
});
