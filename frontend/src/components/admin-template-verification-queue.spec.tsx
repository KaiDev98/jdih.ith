import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminTemplateVerificationQueue } from './admin-template-verification-queue';
import { AdminVerificationQueue } from './admin-daftar-dokumen';

const state = vi.hoisted(() => ({ role: 'SUPERADMIN', api: vi.fn(), list: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/lib/sesi', () => ({
  useSession: () => ({
    csrfToken: 'csrf',
    pengguna: {
      id: '11',
      status: 'AKTIF',
      peran: [state.role],
      izin: ['documents.read_admin', 'templates.manage'],
    },
  }),
  csrfHeaders: () => ({ 'X-CSRF-Token': 'csrf' }),
}));
vi.mock('@/lib/api-client', async (original) => ({
  ...(await original<object>()),
  ambilApi: state.api,
  ambilApiBerdaftar: state.list,
}));
const row = {
  id: '80',
  templateSuratId: '5',
  nama: 'Surat Tugas',
  nomorVersi: 2,
  tingkatAkses: 'PUBLIK',
  status: 'PENDING_REVIEW',
  pengunggah: 'Admin Keuangan',
  diajukanPada: '2026-11-04 10:00:00',
};
const result = (data = [row], total = data.length) => ({
  data,
  meta: { totalButir: total, totalHalaman: Math.ceil(total / 10) },
});
beforeEach(() => {
  state.role = 'SUPERADMIN';
  state.api.mockReset().mockResolvedValue({});
  state.list.mockReset().mockResolvedValue(result());
});
afterEach(cleanup);

describe('persetujuan format melalui Antrean Verifikasi', () => {
  it('format tampil pada halaman yang sama dengan antrean produk hukum dan SOP', async () => {
    state.list.mockImplementation((url: string) =>
      Promise.resolve(url.includes('letter-templates') ? result() : result([])),
    );
    render(<AdminVerificationQueue />);
    await screen.findByText('Surat Tugas');
    expect(screen.getByRole('heading', { name: 'Antrean Verifikasi' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Antrean Format Persuratan/ })).toBeInTheDocument();
    expect(state.list).toHaveBeenCalledWith(
      '/admin/documents/verification-queue',
      expect.anything(),
    );
  });
  it('Setujui tetap di antrean sampai Terbitkan dengan konfirmasi dan CSRF terpisah', async () => {
    state.list.mockResolvedValueOnce(result()).mockResolvedValue(result([{ ...row, status: 'APPROVED' }]));
    render(<AdminTemplateVerificationQueue />);
    await screen.findByText('Surat Tugas');
    expect(screen.getByRole('link', { name: 'Unduh untuk ditinjau' })).toHaveAttribute(
      'href',
      '/api/v1/admin/letter-templates/verification-queue/5/versions/80/download',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Setujui' }));
    fireEvent.click(screen.getByRole('button', { name: 'Batal' }));
    expect(state.api).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Setujui' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ya, lanjutkan' }));
    await screen.findByText(/versi 2 disetujui/);
    expect(screen.getByText('Surat Tugas')).toBeInTheDocument();
    expect(state.api).toHaveBeenCalledExactlyOnceWith(
      '/admin/letter-templates/5/versions/80/verify',
      { method: 'POST', headers: { 'X-CSRF-Token': 'csrf' }, muatan: {} },
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Terbitkan' }));
    expect(state.api).toHaveBeenCalledTimes(1);
    state.list.mockResolvedValue(result([]));
    fireEvent.click(screen.getByRole('button', { name: 'Ya, lanjutkan' }));
    await screen.findByText(/versi 2 diterbitkan/);
    await screen.findByText('Tidak ada format yang menunggu persetujuan atau penerbitan.');
    expect(state.api).toHaveBeenLastCalledWith('/admin/letter-templates/5/versions/80/publish', {
      method: 'POST', headers: { 'X-CSRF-Token': 'csrf' }, muatan: {},
    });
  });
  it('Admin membaca pengajuannya tanpa tombol persetujuan atau perubahan keputusan', async () => {
    state.role = 'ADMIN';
    state.list.mockResolvedValue(result([{ ...row, status: 'APPROVED' }]));
    render(<AdminTemplateVerificationQueue />);
    await screen.findByText('Surat Tugas');
    expect(screen.queryByRole('button', { name: 'Setujui' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Terbitkan' })).not.toBeInTheDocument();
    expect(state.api).not.toHaveBeenCalled();
  });
  it('galat persetujuan mempertahankan pengajuan dan mencegah klik ganda ketika memproses', async () => {
    let reject!: (error: Error) => void;
    state.api.mockImplementation(
      () =>
        new Promise((_resolve, fail) => {
          reject = fail;
        }),
    );
    render(<AdminTemplateVerificationQueue />);
    await screen.findByText('Surat Tugas');
    fireEvent.click(screen.getByRole('button', { name: 'Setujui' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ya, lanjutkan' }));
    expect(screen.getByRole('button', { name: /Memproses/ })).toBeDisabled();
    expect(state.api).toHaveBeenCalledOnce();
    reject(new Error('Berkas berubah; periksa ulang'));
    await screen.findByText('Berkas berubah; periksa ulang');
    expect(screen.getByText('Surat Tugas')).toBeInTheDocument();
  });
  it('halaman terakhir menyesuaikan setelah format terakhir diterbitkan', async () => {
    state.list
      .mockResolvedValueOnce(result([{ ...row, status: 'APPROVED' }], 11))
      .mockResolvedValueOnce(result([{ ...row, id: '81', status: 'APPROVED' }], 11))
      .mockResolvedValueOnce(result([], 10))
      .mockResolvedValue(result([row], 10));
    render(<AdminTemplateVerificationQueue />);
    await screen.findByText('Surat Tugas');
    fireEvent.click(screen.getByRole('button', { name: 'Berikutnya' }));
    await waitFor(() =>
      expect(state.list).toHaveBeenCalledWith('/admin/letter-templates/verification-queue', {
        kueri: { halaman: 2, perHalaman: 10 },
      }),
    );
    await screen.findByRole('button', { name: 'Terbitkan' });
    fireEvent.click(screen.getByRole('button', { name: 'Terbitkan' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ya, lanjutkan' }));
    await waitFor(() =>
      expect(state.list).toHaveBeenLastCalledWith('/admin/letter-templates/verification-queue', {
        kueri: { halaman: 1, perHalaman: 10 },
      }),
    );
  });
});
