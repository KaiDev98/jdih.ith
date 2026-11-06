import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminTemplates } from './admin-templates';
import { GalatApi } from '@/lib/api-client';

const state = vi.hoisted(() => ({
  role: 'ADMIN',
  permissions: ['templates.manage'],
  api: vi.fn(),
}));
vi.mock('@/lib/sesi', () => ({
  useSession: () => ({
    pengguna: { id: '11', status: 'AKTIF', peran: [state.role], izin: state.permissions },
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
    createdBy: '11',
    nama: 'Surat Tugas',
    slug: 'surat-tugas',
    aktif: 1,
    nomorVersi: 2,
    tingkatAkses: 'PUBLIK',
    pendingVersionId: null,
    pendingNomorVersi: null,
    pendingTingkatAkses: null,
  },
  {
    id: '2',
    createdBy: '11',
    nama: 'Surat Lama',
    slug: 'surat-lama',
    aktif: 0,
    nomorVersi: 1,
    tingkatAkses: 'INTERNAL',
    pendingVersionId: null,
    pendingNomorVersi: null,
    pendingTingkatAkses: null,
  },
];
beforeEach(() => {
  state.role = 'ADMIN';
  state.permissions = ['templates.manage'];
  state.api.mockReset().mockResolvedValue(rows);
});
afterEach(cleanup);

describe('pustaka Format Persuratan', () => {
  it('memvalidasi metadata dengan kontrak shared sebelum mengunggah dan menyamakan batas isian', async () => {
    render(<AdminTemplates />);
    await screen.findByText('Surat Tugas');
    expect(screen.getByLabelText('Nama')).toHaveAttribute('maxlength', '200');
    fireEvent.change(screen.getByLabelText('Nama'), { target: { value: 'a'.repeat(201) } });
    fireEvent.click(screen.getByText('Alamat dan deskripsi'));
    expect(screen.getByLabelText('Slug')).toHaveAttribute('maxlength', '191');
    fireEvent.change(screen.getByLabelText(/^Berkas/), { target: { files: [new File(['data'], 'baru.pdf')] } });
    fireEvent.click(screen.getByRole('button', { name: 'Buat template' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ya, lanjutkan' }));
    await screen.findByText('Nama maksimal 200 karakter.');
    expect(state.api.mock.calls.every(([, options]) => !options?.method)).toBe(true);
    expect(screen.getByLabelText('Nama')).toHaveValue('a'.repeat(201));
  });
  it.each([
    [{ ruas: 'nama', pesan: 'Nama format tidak sah.' }, 'Nama format tidak sah.'],
  ])('menjelaskan kegagalan validasi API tanpa mengulang unggahan atau menghilangkan berkas: %j', async (butir, pesan) => {
    state.api.mockImplementation((_url: string, options?: { method?: string }) => options?.method
      ? Promise.reject(new GalatApi('VALIDASI_GAGAL', 'Data yang dikirim tidak lolos pemeriksaan.', 422, [butir])) : Promise.resolve(rows));
    render(<AdminTemplates />);
    await screen.findByText('Surat Tugas');
    fireEvent.change(screen.getByLabelText('Nama'), { target: { value: 'Format Surat Tugas' } });
    fireEvent.change(screen.getByLabelText(/^Berkas/), { target: { files: [new File(['data'], 'tugas.pdf')] } });
    fireEvent.click(screen.getByRole('button', { name: 'Buat template' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ya, lanjutkan' }));
    await screen.findByText((text) => text.startsWith(pesan));
    expect(screen.getByLabelText('Nama')).toHaveValue('Format Surat Tugas');
    expect((screen.getByLabelText(/^Berkas/) as HTMLInputElement).files?.[0]?.name).toBe('tugas.pdf');
    expect(state.api.mock.calls.filter(([, options]) => options?.method)).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Ya, lanjutkan' })).toBeEnabled();
  });
  it('API lama yang hanya menolak modeSlug dicoba sekali dengan metadata lama, CSRF dan berkas yang sama', async () => {
    let writes = 0;
    state.api.mockImplementation((_url: string, options?: { method?: string }) => {
      if (!options?.method) return Promise.resolve(rows);
      if (++writes === 1) return Promise.reject(new GalatApi('VALIDASI_GAGAL', 'Data yang dikirim tidak lolos pemeriksaan.', 422, [{ ruas: '(akar)', pesan: 'Unrecognized key: "modeSlug"' }]));
      return Promise.resolve({});
    });
    render(<AdminTemplates />);
    await screen.findByText('Surat Tugas');
    fireEvent.change(screen.getByLabelText('Nama'), { target: { value: 'Format Surat Tugas' } });
    fireEvent.change(screen.getByLabelText(/^Berkas/), { target: { files: [new File(['data'], 'tugas.pdf')] } });
    fireEvent.click(screen.getByRole('button', { name: 'Buat template' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ya, lanjutkan' }));
    await screen.findByText('Format diunggah dan menunggu persetujuan Superadmin.');
    const calls = state.api.mock.calls.filter(([, options]) => options?.method);
    expect(calls).toHaveLength(2);
    const initial = calls[0]?.[1]?.muatan as FormData;
    const legacy = calls[1]?.[1]?.muatan as FormData;
    expect(initial.get('modeSlug')).toBe('otomatis');
    expect(legacy.get('modeSlug')).toBeNull();
    for (const key of ['nama', 'slug', 'tingkatAkses', 'deskripsi', 'file']) expect(legacy.get(key)).toEqual(initial.get(key));
    expect(calls[1]?.[1]?.headers).toEqual({ 'X-CSRF-Token': 'csrf' });
  });
  it('tidak mencoba ulang jika modeSlug ditolak bersama kesalahan isian lain', async () => {
    state.api.mockImplementation((_url: string, options?: { method?: string }) => options?.method
      ? Promise.reject(new GalatApi('VALIDASI_GAGAL', 'Validasi gagal', 422, [{ ruas: '(akar)', pesan: 'Unrecognized key: "modeSlug"' }, { ruas: 'nama', pesan: 'Nama tidak sah' }])) : Promise.resolve(rows));
    render(<AdminTemplates />);
    await screen.findByText('Surat Tugas');
    fireEvent.change(screen.getByLabelText('Nama'), { target: { value: 'Format Surat Tugas' } });
    fireEvent.change(screen.getByLabelText(/^Berkas/), { target: { files: [new File(['data'], 'tugas.pdf')] } });
    fireEvent.click(screen.getByRole('button', { name: 'Buat template' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ya, lanjutkan' }));
    await screen.findByText(/Layanan unggah masih memakai versi lama/);
    expect(state.api.mock.calls.filter(([, options]) => options?.method)).toHaveLength(1);
  });
  it('Superadmin hanya mendapat Hapus; keterangan pencabutan lama tetap dapat ditinjau', async () => {
    state.role = 'SUPERADMIN';
    const format = { ...rows[0], currentVersionId: '20', dicabut: 1, pencabutan: { tanggal: '2026-11-06', alasan: 'Pencabutan lama' } };
    state.api.mockResolvedValue([format]);
    render(<AdminTemplates />);
    expect(await screen.findByRole('button', { name: 'Hapus' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Cabut Format' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Dicabut 1' }));
    expect(screen.getByRole('button', { name: 'Keterangan pencabutan Surat Tugas' })).toBeEnabled();
  });
  it('Admin pemilik hanya meminta penghapusan format terbit, tanpa pencabutan atau penarikan', async () => {
    state.api.mockResolvedValue([{ ...rows[0], currentVersionId: '20', pernahTerbit: 1 }]);
    render(<AdminTemplates />);
    expect(await screen.findByRole('button', { name: 'Minta Penghapusan' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Minta Pencabutan' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Minta Penarikan' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cabut Format' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Minta Penghapusan' }));
    expect(screen.getByRole('button', { name: 'Kirim permintaan' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Alasan permintaan'), { target: { value: 'Format tidak digunakan lagi' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kirim permintaan' }));
    await screen.findByText(/Permintaan terkirim/);
    expect(state.api).toHaveBeenCalledWith('/admin/letter-templates/1/removal-requests', {
      method: 'POST', headers: { 'X-CSRF-Token': 'csrf' }, muatan: { jenis: 'DELETE', alasan: 'Format tidak digunakan lagi' },
    });
    expect(state.api.mock.calls.filter(([, options]) => options?.method)).toHaveLength(1);
  });
  it('menutup permintaan penghapusan bila versi terbit berubah ketika dialog terbuka', async () => {
    state.api.mockResolvedValue([{ ...rows[0], currentVersionId: '20' }]);
    render(<AdminTemplates />);
    fireEvent.click(await screen.findByRole('button', { name: 'Minta Penghapusan' }));
    state.api.mockResolvedValue([{ ...rows[0], currentVersionId: '21', nomorVersi: 3 }]);
    fireEvent.focus(window);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(state.api.mock.calls.every(([, options]) => !options?.method)).toBe(true);
  });
  it('Admin tidak mendapat kontrol perubahan untuk format milik akun lain meski respons lama memuatnya', async () => {
    state.api.mockResolvedValue([{ ...rows[0], createdBy: '99' }]);
    render(<AdminTemplates />);
    await screen.findByText('Surat Tugas');
    expect(screen.getByRole('button', { name: 'Versi baru' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Hapus' })).toBeDisabled();
  });
  it('filter status tetap tersedia tanpa bilah pencarian atau izin mengubah', async () => {
    state.permissions = [];
    render(<AdminTemplates />);
    await screen.findByText('Surat Tugas');
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Nonaktif 1' }));
    expect(screen.queryByText('Surat Tugas')).not.toBeInTheDocument();
    expect(screen.getByText('Surat Lama')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Buat template' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Hapus' })).toBeDisabled();
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
  it('alamat manual yang bentrok tetap mempertahankan nama, slug dan berkas dengan pesan konflik', async () => {
    const message = 'Alamat format sudah digunakan. Ganti Slug pada bagian Alamat dan deskripsi, atau pilih Ikuti nama lagi.';
    state.api.mockImplementation((_url: string, options?: { method?: string }) => options?.method
      ? Promise.reject(new GalatApi('KONFLIK', message, 409)) : Promise.resolve(rows));
    render(<AdminTemplates />);
    await screen.findByText('Surat Tugas');
    fireEvent.change(screen.getByLabelText('Nama'), { target: { value: 'Format Baru' } });
    fireEvent.click(screen.getByText('Alamat dan deskripsi'));
    fireEvent.change(screen.getByLabelText('Slug'), { target: { value: 'alamat-dipakai' } });
    fireEvent.change(screen.getByLabelText(/^Berkas/), { target: { files: [new File(['data'], 'baru.pdf')] } });
    fireEvent.click(screen.getByRole('button', { name: 'Buat template' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ya, lanjutkan' }));
    await screen.findByText(message);
    expect(screen.getByLabelText('Nama')).toHaveValue('Format Baru');
    expect(screen.getByLabelText('Slug')).toHaveValue('alamat-dipakai');
    expect((screen.getByLabelText(/^Berkas/) as HTMLInputElement).files?.[0]?.name).toBe('baru.pdf');
    const call = state.api.mock.calls.find(([, options]) => options?.method === 'POST');
    expect((call?.[1]?.muatan as FormData).get('modeSlug')).toBe('manual');
  });
  it('Admin mengirim format untuk verifikasi dan tidak dapat menyetujui format tertunda', async () => {
    state.api.mockResolvedValue([
      { ...rows[0], pendingVersionId: 'v3', pendingNomorVersi: 3, pendingTingkatAkses: 'PUBLIK' },
      rows[1],
    ]);
    render(<AdminTemplates />);
    await screen.findByText('Surat Tugas');
    expect(screen.getByRole('button', { name: 'Menunggu persetujuan 1' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Setujui' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unggah perbaikan' })).toBeEnabled();

    fireEvent.change(screen.getByLabelText('Nama'), { target: { value: 'Surat Izin' } });
    fireEvent.change(screen.getByLabelText(/^Berkas/), {
      target: { files: [new File(['data'], 'izin.docx')] },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Buat template' }));
    expect(screen.getAllByText(/menunggu persetujuan Superadmin/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Batal' }));
    expect(state.api.mock.calls.some(([, options]) => options?.method)).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Buat template' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ya, lanjutkan' }));
    await screen.findByText(/diunggah dan menunggu persetujuan Superadmin/);
    expect(state.api).toHaveBeenCalledWith(
      '/admin/letter-templates',
      expect.objectContaining({ method: 'POST', headers: { 'X-CSRF-Token': 'csrf' } }),
    );
    const upload = state.api.mock.calls.find(([, options]) => options?.method === 'POST');
    expect((upload?.[1]?.muatan as FormData).get('modeSlug')).toBe('otomatis');
  });
  it('persetujuan dipindahkan ke Antrean Verifikasi, bukan dilakukan di pengelolaan format', async () => {
    state.role = 'SUPERADMIN';
    state.api.mockResolvedValue([{ ...rows[0], pendingVersionId: '3', pendingNomorVersi: 3 }]);
    render(<AdminTemplates />);
    await screen.findByText('Surat Tugas');
    expect(screen.queryByRole('button', { name: 'Setujui' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Antrean Verifikasi' })).toHaveAttribute(
      'href',
      '/superadmin/dokumen/verifikasi',
    );
  });
  it('Terbitkan hanya muncul setelah disetujui dan tetap perlu konfirmasi tersendiri', async () => {
    state.role = 'SUPERADMIN';
    state.api.mockResolvedValue([
      { ...rows[0], pendingVersionId: '3', pendingNomorVersi: 3, pendingStatus: 'APPROVED' },
    ]);
    render(<AdminTemplates />);
    await screen.findByText('Surat Tugas');
    expect(screen.queryByRole('button', { name: 'Setujui' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Unduh untuk ditinjau' })).toHaveAttribute(
      'href',
      '/api/v1/admin/letter-templates/1/versions/3/download',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Terbitkan' }));
    expect(state.api.mock.calls.some(([, options]) => options?.method)).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Ya, lanjutkan' }));
    await screen.findByText(/berhasil diterbitkan/);
    expect(state.api).toHaveBeenCalledWith(
      '/admin/letter-templates/1/versions/3/publish',
      expect.objectContaining({ method: 'POST' }),
    );
  });
  it.each(['ADMIN', 'SUPERADMIN'])(
    'unggahan %s selalu menunggu persetujuan, tanpa penerbitan otomatis',
    async (role) => {
      state.role = role;
      render(<AdminTemplates />);
      await screen.findByText('Surat Tugas');
      fireEvent.change(screen.getByLabelText('Nama'), { target: { value: 'Surat Izin' } });
      fireEvent.change(screen.getByLabelText(/^Berkas/), {
        target: { files: [new File(['data'], 'izin.docx')] },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Buat template' }));
      fireEvent.click(screen.getByRole('button', { name: 'Ya, lanjutkan' }));
      await screen.findByText(/diunggah dan menunggu persetujuan Superadmin/);
      expect(state.api.mock.calls.some(([url]) => /\/(verify|publish)$/.test(String(url)))).toBe(
        false,
      );
    },
  );
  it('Admin tidak mendapat tombol keputusan meskipun format sudah disetujui', async () => {
    state.api.mockResolvedValue([
      { ...rows[0], pendingVersionId: '3', pendingNomorVersi: 3, pendingStatus: 'APPROVED' },
    ]);
    render(<AdminTemplates />);
    await screen.findByText('Surat Tugas');
    expect(screen.queryByRole('button', { name: 'Setujui' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Terbitkan' })).not.toBeInTheDocument();
  });

  it.each(['ADMIN', 'SUPERADMIN'])(
    '%s dapat menghapus format setelah konfirmasi, tanpa mengetik nama atau mengarsipkan',
    async (role) => {
      state.role = role;
      let deleted = false;
      state.api.mockImplementation((_url: string, options?: { method?: string }) => {
        if (options?.method === 'DELETE') {
          deleted = true;
          return Promise.resolve({ id: '1', deleted: true });
        }
        return Promise.resolve(
          deleted
            ? rows.slice(1)
            : [
                { ...rows[0], aktif: 0, pendingVersionId: '3', pendingStatus: 'PENDING_REVIEW' },
                rows[1],
              ],
        );
      });
      render(<AdminTemplates />);
      await screen.findByText('Surat Tugas');
      expect(screen.queryByRole('button', { name: 'Arsipkan' })).not.toBeInTheDocument();
      fireEvent.click(screen.getAllByRole('button', { name: 'Hapus' })[0]!);
      expect(state.api.mock.calls.some(([, options]) => options?.method)).toBe(false);
      fireEvent.click(screen.getByRole('button', { name: 'Batal' }));
      expect(state.api.mock.calls.some(([, options]) => options?.method)).toBe(false);
      fireEvent.click(screen.getAllByRole('button', { name: 'Hapus' })[0]!);
      fireEvent.click(screen.getByRole('button', { name: 'Ya, hapus' }));
      await screen.findByText('Surat Tugas berhasil dihapus.');
      await waitFor(() => expect(screen.queryByText('Surat Tugas')).not.toBeInTheDocument());
      expect(screen.getByText('Surat Lama')).toBeInTheDocument();
      expect(state.api).toHaveBeenCalledWith('/admin/letter-templates/1', {
        method: 'DELETE',
        headers: { 'X-CSRF-Token': 'csrf' },
        muatan: {},
      });
    },
  );

  it('penghapusan yang gagal mempertahankan baris dan dapat dicoba ulang tanpa klik ganda', async () => {
    let rejectDelete!: (error: Error) => void;
    state.api.mockImplementation((_url: string, options?: { method?: string }) =>
      options?.method === 'DELETE'
        ? new Promise((_resolve, reject) => {
            rejectDelete = reject;
          })
        : Promise.resolve([
            { ...rows[0], aktif: 0, pendingVersionId: '3', pendingStatus: 'PENDING_REVIEW' },
            rows[1],
          ]),
    );
    render(<AdminTemplates />);
    await screen.findByText('Surat Tugas');
    fireEvent.click(screen.getAllByRole('button', { name: 'Hapus' })[0]!);
    fireEvent.click(screen.getByRole('button', { name: 'Ya, hapus' }));
    expect(screen.getByRole('button', { name: /Memproses/ })).toBeDisabled();
    expect(state.api.mock.calls.filter(([, options]) => options?.method === 'DELETE')).toHaveLength(
      1,
    );
    rejectDelete(new Error('Penghapusan gagal'));
    await screen.findByText('Penghapusan gagal');
    expect(screen.getByText('Surat Tugas')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ya, hapus' })).toBeEnabled();
  });

  it.each(['PENDING_REVIEW', 'APPROVED'])(
    'Hapus hanya tersedia sebelum keputusan Superadmin (%s)',
    async (status) => {
      state.api.mockResolvedValue([
        {
          ...rows[0],
          aktif: 0,
          currentVersionId: null,
          nomorVersi: null,
          pendingVersionId: '3',
          pendingNomorVersi: 1,
          pendingStatus: status,
        },
      ]);
      render(<AdminTemplates />);
      await screen.findByText('Surat Tugas');
      if (status === 'APPROVED') {
        expect(screen.queryByRole('button', { name: 'Hapus' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Minta Penghapusan' })).toBeEnabled();
      }
      else expect(screen.getByRole('button', { name: 'Hapus' })).toBeEnabled();
    },
  );
});
