import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminDocumentCreate } from './admin-documents';
import { AdminDocumentDetail } from './admin-document-detail';
import { DaftarDokumenAdmin } from './admin-daftar-dokumen';
import { NotifikasiDokumenPanel } from './admin/notifikasi-dokumen';
import { AdminBerkasReview } from './admin-berkas-review';

const state = vi.hoisted(() => ({ api: vi.fn(), daftar: vi.fn(), role: 'ADMIN', fetch: vi.fn() }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/admin',
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('@/lib/sesi', () => ({
  useSession: () => ({
    csrfToken: 'csrf',
    pengguna: {
      id: '11',
      peran: [state.role],
      status: 'AKTIF',
      izin: [
        'documents.read_admin',
        'documents.create',
        'documents.edit',
        'workflow.submit',
        'workflow.approve',
        'workflow.publish',
        'workflow.return',
      ],
    },
  }),
  csrfHeaders: () => ({}),
}));
vi.mock('@/lib/api-client', async (original) => ({
  ...(await original<object>()),
  ambilApi: state.api,
  ambilApiBerdaftar: state.daftar,
}));
vi.mock('@/components/admin/panel-hubungan', () => ({ PanelHubungan: () => null }));
beforeEach(() => {
  state.role = 'ADMIN';
  state.api.mockReset();
  state.daftar.mockReset();
  state.fetch.mockReset();
  vi.stubGlobal('fetch', state.fetch);
  state.daftar.mockResolvedValue({ data: [], meta: { totalHalaman: 0, totalButir: 0 } });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('pengajuan dokumen pada panel', () => {
  it('SOP Permohonan SK menyediakan pilihan Publik dan Dosen/Staf', async () => {
    state.role = 'SUPERADMIN';
    state.api.mockImplementation((url: string) =>
      Promise.resolve(
        url.endsWith('/kategori') ? [] : [{ id: '1', kode: 'SOP', nama: 'SOP', aktif: true }],
      ),
    );
    render(<AdminDocumentCreate mode="permohonan-sk" />);
    await screen.findByRole('option', { name: 'SOP' });
    expect(screen.getByRole('radio', { name: 'Publik' })).toBeChecked();
    fireEvent.click(screen.getByRole('radio', { name: 'Dosen/Staf' }));
    expect(screen.getByRole('radio', { name: 'Dosen/Staf' })).toBeChecked();
  });
  it('SOP ditinjau dan dikonfirmasi sebelum satu permintaan persetujuan sekaligus terbit', async () => {
    state.role = 'SUPERADMIN';
    state.api.mockImplementation((url: string, options?: { method?: string }) => {
      if (url.endsWith('/legal-impact'))
        return Promise.resolve({
          versiId: '50',
          tokenKonfirmasi: 'preview',
          dampak: [],
          perluKonfirmasi: true,
        });
      if (options?.method) return Promise.resolve({ statusWorkflow: 'TERBIT' });
      if (url.endsWith('/files'))
        return Promise.resolve([
          {
            id: '8',
            jenisBerkas: 'UTAMA',
            namaAsli: 'sop.docx',
            sizeBytes: '30',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          },
        ]);
      return Promise.resolve({
        document: {
          id: '5',
          versionId: '50',
          kodeDokumen: 'SOP',
          judul: 'SOP khusus',
          peruntukan: 'PERMOHONAN_SK',
          nomorVersi: 1,
          statusWorkflow: 'DRAF',
          statusHukum: 'BERLAKU',
          tingkatAkses: 'internal',
          bolehUbah: true,
          bolehSetujuiLangsung: true,
          deskripsi: 'Prosedur lengkap',
          nomor: '1',
          tahun: 2026,
          pic: 'Hukum',
          tanggalPenetapan: '2026-10-29',
        },
        versions: [],
        kategoriId: ['3'],
        statusPeraturan: [],
        riwayatVerifikasi: [],
      });
    });
    render(<AdminDocumentDetail id="5" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Setujui dan terbitkan' }));
    await screen.findByText('Tidak ada dokumen lain yang ikut berubah status.');
    expect(state.api.mock.calls.filter(([, options]) => options?.method)).toHaveLength(0);
    fireEvent.click(screen.getAllByRole('button', { name: 'Setujui dan terbitkan' })[1]!);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(state.api.mock.calls.filter(([, options]) => options?.method)).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Ya, lanjutkan' }));
    await waitFor(() =>
      expect(state.api).toHaveBeenCalledWith(
        '/admin/documents/versions/50/approve',
        expect.objectContaining({
          method: 'POST',
          muatan: expect.objectContaining({
            konfirmasi: { tokenKonfirmasi: 'preview', dampak: [], disetujui: true },
          }),
        }),
      ),
    );
    expect(state.api.mock.calls.some(([url]) => String(url).endsWith('/publish'))).toBe(false);
  });
  it('semua unit kerja terlihat, tetapi pilihan di luar hak Admin nonaktif', async () => {
    state.api.mockImplementation((url: string) =>
      Promise.resolve(
        url.endsWith('/kategori')
          ? [
              { id: '3', kode: 'TIK', nama: 'TIK', aktif: true, bolehPilih: true },
              { id: '4', kode: 'HKM', nama: 'Hukum', aktif: true, bolehPilih: false },
              { id: '5', kode: 'LAMA', nama: 'Unit lama', aktif: false, bolehPilih: false },
            ]
          : [{ id: '1', kode: 'SOP', nama: 'SOP', aktif: true }],
      ),
    );
    render(<AdminDocumentCreate />);
    expect(await screen.findByRole('option', { name: 'TIK' })).toBeEnabled();
    expect(screen.getByRole('option', { name: 'Hukum (di luar hak akses)' })).toBeDisabled();
    expect(screen.getByRole('option', { name: 'Unit lama (nonaktif)' })).toBeDisabled();
  });
  for (const role of ['SUPERADMIN', 'ADMIN']) {
    it(`${role}: draf milik Superadmin hanya menampilkan persetujuan langsung untuk peran yang sesuai`, async () => {
      state.role = role;
      state.api.mockImplementation((url: string) =>
        Promise.resolve(
          url.endsWith('/files')
            ? [
                {
                  id: '8',
                  jenisBerkas: 'UTAMA',
                  namaAsli: 'dokumen.docx',
                  sizeBytes: '30',
                  mimeType:
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                },
              ]
            : {
                document: {
                  id: '5',
                  versionId: '50',
                  kodeDokumen: 'SOP',
                  judul: 'Draf Superadmin',
                  nomorVersi: 1,
                  statusWorkflow: 'DRAF',
                  statusHukum: 'BERLAKU',
                  tingkatAkses: 'publik',
                  bolehUbah: true,
                  bolehSetujuiLangsung: true,
                  deskripsi: 'Prosedur lengkap',
                  nomor: '1',
                  tahun: 2026,
                  pic: 'TIK',
                  tanggalPenetapan: '2026-10-25',
                },
                versions: [],
                kategoriId: ['3'],
                statusPeraturan: [],
                riwayatVerifikasi: [],
              },
        ),
      );
      render(<AdminDocumentDetail id="5" />);
      await screen.findByRole('heading', { name: 'Draf Superadmin' });
      expect(screen.getByRole('link', { name: 'Ubah draf' })).toHaveAttribute('href');
      if (role === 'ADMIN') {
        expect(screen.queryByRole('button', { name: 'Setujui' })).not.toBeInTheDocument();
        expect(
          screen.getByRole('button', { name: 'Ajukan untuk diverifikasi' }),
        ).toBeInTheDocument();
      } else {
        expect(
          screen.queryByRole('button', { name: 'Ajukan untuk diverifikasi' }),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByRole('button', { name: 'Kembalikan untuk diperbaiki' }),
        ).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Setujui' }));
        expect(state.api.mock.calls.filter(([, options]) => options?.method)).toHaveLength(0);
        fireEvent.click(screen.getByRole('button', { name: 'Ya, lanjutkan' }));
        await waitFor(() =>
          expect(state.api).toHaveBeenCalledWith(
            '/admin/documents/versions/50/approve',
            expect.objectContaining({ method: 'POST' }),
          ),
        );
        expect(state.api.mock.calls.some(([url]) => String(url).endsWith('/submit'))).toBe(false);
      }
    });
  }
  it('Superadmin dapat mengonfirmasi persetujuan tanpa alasan; pengembalian tetap memerlukan catatan', async () => {
    state.role = 'SUPERADMIN';
    state.api.mockImplementation((url: string) =>
      Promise.resolve(
        url.endsWith('/files')
          ? []
          : {
              document: {
                id: '5',
                versionId: '50',
                kodeDokumen: 'SOP',
                judul: 'SOP pengujian',
                nomorVersi: 1,
                statusWorkflow: 'DIAJUKAN',
                statusHukum: 'BERLAKU',
                tingkatAkses: 'publik',
                bolehUbah: false,
                tanggalPenetapan: null,
              },
              versions: [],
              kategoriId: [],
              statusPeraturan: [],
              riwayatVerifikasi: [],
            },
      ),
    );
    render(<AdminDocumentDetail id="5" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Setujui' }));
    expect(screen.getByRole('textbox', { name: 'Alasan persetujuan (opsional)' })).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Ya, lanjutkan' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Ya, lanjutkan' }));
    await waitFor(() =>
      expect(state.api).toHaveBeenCalledWith(
        '/admin/documents/versions/50/approve',
        expect.objectContaining({ method: 'POST', muatan: { catatan: '' } }),
      ),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Kembalikan untuk diperbaiki' }));
    expect(screen.getByRole('textbox', { name: 'Catatan perbaikan (wajib)' })).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Ya, kembalikan' })).toBeDisabled();
  });
  it('antrean dimuat ulang ketika tab difokuskan dan tombol segarkan dipakai', async () => {
    render(<DaftarDokumenAdmin verificationOnly />);
    await screen.findByText('Antrean kosong');
    state.daftar.mockResolvedValue({
      data: [
        {
          id: '5',
          versionId: '50',
          nomorVersi: 1,
          judul: 'Pengajuan Admin lain',
          tipe: 'SOP',
          nomor: '1',
          statusWorkflow: 'DIAJUKAN',
          statusHukum: 'BERLAKU',
          tingkatAkses: 'publik',
          diganti: false,
        },
      ],
      meta: { totalHalaman: 1, totalButir: 1 },
    });
    fireEvent(window, new Event('focus'));
    expect(
      (await screen.findAllByRole('link', { name: /Pengajuan Admin lain/ })).length,
    ).toBeGreaterThan(0);
    expect(state.daftar).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole('button', { name: 'Segarkan antrean' }));
    await waitFor(() => expect(state.daftar).toHaveBeenCalledTimes(3));
  });
  it('form SOP Permohonan SK tidak dapat dibuka Admin meski punya izin membuat dokumen', () => {
    render(<AdminDocumentCreate mode="permohonan-sk" />);
    expect(
      screen.getByText('Pengelolaan SOP Permohonan SK hanya untuk Superadmin.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Buat draf' })).not.toBeInTheDocument();
    expect(state.api).not.toHaveBeenCalled();
  });
  it('pratinjau draf memakai API panel dan membebaskan blob ketika ditutup', async () => {
    const revoke = vi.fn();
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:review-pdf', revokeObjectURL: revoke });
    state.fetch.mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(['%PDF-1.7'])),
    });
    const view = render(
      <AdminBerkasReview
        versionId="50"
        berkas={[{ id: '8', namaAsli: 'sop.pdf', mimeType: 'application/pdf' }]}
      />,
    );
    expect(await screen.findByTitle('Pratinjau sop.pdf')).toHaveAttribute('src', 'blob:review-pdf');
    expect(screen.getByRole('link', { name: 'Buka tab baru' })).toHaveAttribute(
      'href',
      'blob:review-pdf',
    );
    expect(screen.getByRole('link', { name: 'Buka tab baru' })).toHaveAttribute('target', '_blank');
    expect(state.fetch).toHaveBeenCalledWith(
      '/api/v1/admin/documents/versions/50/files/8?mode=inline',
      expect.objectContaining({ credentials: 'include' }),
    );
    view.unmount();
    expect(revoke).toHaveBeenCalledWith('blob:review-pdf');
  });
  it('form tidak menyimpan data atau membuka konfirmasi sebelum seluruh isian dan file lengkap', async () => {
    state.api.mockImplementation(() =>
      Promise.resolve([{ id: '1', nama: 'SOP', kode: 'SOP', aktif: true }]),
    );
    render(<AdminDocumentCreate />);
    await screen.findAllByRole('option', { name: 'SOP' });
    fireEvent.click(screen.getByRole('button', { name: 'Buat draf' }));
    expect(screen.getByRole('alert')).toHaveTextContent('File dokumen utama');
    expect(screen.getByRole('alert')).toHaveTextContent('Deskripsi singkat');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(state.api.mock.calls.every(([, options]) => !options?.method)).toBe(true);
    const input = document.getElementById('doc-file');
    expect(input).not.toHaveAttribute('multiple');
  });
  it('daftar terverifikasi tidak menawarkan filter draf; draf memakai cakupan sendiri', async () => {
    const view = render(<DaftarDokumenAdmin />);
    await screen.findByText('Belum ada dokumen');
    expect(screen.queryByRole('tab', { name: 'Draf' })).not.toBeInTheDocument();
    view.unmount();
    render(<DaftarDokumenAdmin pengajuan />);
    await screen.findByText('Belum ada dokumen');
    expect(screen.getByRole('tab', { name: 'Draf' })).toBeInTheDocument();
    expect(state.daftar).toHaveBeenLastCalledWith(
      '/admin/documents',
      expect.objectContaining({ kueri: expect.objectContaining({ cakupan: 'PENGAJUAN' }) }),
    );
  });
  it('Admin melihat alasan pengembalian dan tombol pengajuan nonaktif tanpa file', async () => {
    state.api.mockImplementation((url: string) =>
      Promise.resolve(
        url.endsWith('/files')
          ? []
          : {
              document: {
                id: '5',
                versionId: '50',
                kodeDokumen: 'SOP',
                judul: 'SOP pengujian',
                nomorVersi: 1,
                statusWorkflow: 'REVISI',
                statusHukum: 'BERLAKU',
                tingkatAkses: 'publik',
                bolehUbah: true,
                tanggalPenetapan: null,
              },
              versions: [],
              kategoriId: [],
              statusPeraturan: [],
              riwayatVerifikasi: [
                {
                  id: '9',
                  action: 'RETURN',
                  catatan: 'Tanda tangan belum lengkap',
                  createdAt: '2026-10-23 00:00:00',
                },
              ],
            },
      ),
    );
    render(<AdminDocumentDetail id="5" />);
    expect(await screen.findByText('Alasan: Tanda tangan belum lengkap')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ajukan untuk diverifikasi' })).toBeDisabled();
    expect(state.fetch).not.toHaveBeenCalled();
  });
  it('notifikasi menampilkan keputusan beserta alasan dan membuka versi dokumen yang benar', async () => {
    state.api.mockResolvedValue([
      {
        id: '9',
        dokumenId: '5',
        versionId: '50',
        judul: 'SOP pengujian',
        action: 'APPROVE',
        catatan: 'File dan metadata sudah sesuai',
        createdAt: '2026-10-23 00:00:00',
      },
    ]);
    render(<NotifikasiDokumenPanel />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Notifikasi dokumen/ })).toHaveAccessibleName(
        'Notifikasi dokumen (1 terbaru)',
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: /Notifikasi dokumen/ }));
    expect(await screen.findByText('Alasan: File dan metadata sudah sesuai')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Pengajuan diterima/ })).toHaveAttribute(
      'href',
      '/admin/dokumen/5?versionId=50',
    );
  });
});

describe('dropdown koleksi Semua Dokumen', () => {
  async function pilihKoleksi(label: string) {
    fireEvent.keyDown(screen.getByRole('button', { name: /^Jenis koleksi:/ }), {
      key: 'ArrowDown',
    });
    fireEvent.click(await screen.findByRole('menuitemradio', { name: label }));
  }
  it('mengirim filter SOP ke API dan menyembunyikan SOP khusus dari Admin', async () => {
    render(<DaftarDokumenAdmin />);
    await screen.findByText('Belum ada dokumen');
    fireEvent.keyDown(screen.getByRole('button', { name: /^Jenis koleksi:/ }), {
      key: 'ArrowDown',
    });
    await screen.findByRole('menu');
    expect(
      screen.queryByRole('menuitemradio', { name: 'SOP Permohonan SK' }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'SOP' }));
    await waitFor(() =>
      expect(state.daftar).toHaveBeenLastCalledWith(
        '/admin/documents',
        expect.objectContaining({
          kueri: expect.objectContaining({ kelompok: 'SOP', halaman: 1, cakupan: 'TERVERIFIKASI' }),
        }),
      ),
    );
    await pilihKoleksi('Produk Hukum');
    await waitFor(() =>
      expect(state.daftar).toHaveBeenLastCalledWith(
        '/admin/documents',
        expect.objectContaining({ kueri: expect.objectContaining({ kelompok: 'PRODUK_HUKUM' }) }),
      ),
    );
  });
  it('Superadmin dapat memilih SOP khusus dan format memakai data template serta pagination sendiri', async () => {
    state.role = 'SUPERADMIN';
    state.api.mockResolvedValue(
      Array.from({ length: 25 }, (_, index) => ({
        id: String(index + 1),
        nama: `Format ${index}`,
        slug: `format-${index}`,
        aktif: true,
        nomorVersi: 1,
        tingkatAkses: 'PUBLIK',
      })),
    );
    render(<DaftarDokumenAdmin />);
    await screen.findByText('Belum ada dokumen');
    await pilihKoleksi('SOP Permohonan SK');
    await waitFor(() =>
      expect(state.daftar).toHaveBeenLastCalledWith(
        '/admin/documents',
        expect.objectContaining({
          kueri: expect.objectContaining({ peruntukan: 'PERMOHONAN_SK' }),
        }),
      ),
    );
    await pilihKoleksi('Format Persuratan');
    expect(await screen.findByText('Format 0')).toBeInTheDocument();
    expect(screen.queryByText('Format 20')).not.toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Berikutnya' }));
    expect(await screen.findByText('Format 20')).toBeInTheDocument();
    expect(screen.queryByText('Format 0')).not.toBeInTheDocument();
    expect(screen.getByText('Halaman 2 dari 2')).toBeInTheDocument();
  });
});
