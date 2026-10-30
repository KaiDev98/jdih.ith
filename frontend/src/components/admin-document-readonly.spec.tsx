import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminDocumentDetail } from './admin-document-detail';
import { AdminSopPermohonanSk } from './admin-sop-permohonan-sk';

const state = vi.hoisted(() => ({
  peran: ['ADMIN'],
  status: 'DIAJUKAN',
  own: false,
  api: vi.fn(),
  daftar: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock('@/lib/sesi', () => ({
  useSession: () => ({
    pengguna: {
      id: '1',
      status: 'AKTIF',
      peran: state.peran,
      izin: [
        'documents.read_admin',
        'documents.edit',
        'documents.upload',
        'documents.create',
        'documents.revise',
        'workflow.submit',
        'workflow.approve',
        'workflow.return',
      ],
    },
    csrfToken: 'csrf',
  }),
  csrfHeaders: () => ({}),
}));
vi.mock('@/lib/api-client', async (original) => ({
  ...(await original<object>()),
  ambilApi: state.api,
  ambilApiBerdaftar: state.daftar,
}));
afterEach(() => {
  cleanup();
  state.peran = ['ADMIN'];
  state.daftar.mockClear();
});

function setupDetail() {
  state.api.mockImplementation((url: string) =>
    Promise.resolve(
      url.endsWith('/files')
        ? [
            {
              id: '8',
              jenisBerkas: 'UTAMA',
              namaAsli: 'uji.docx',
              sizeBytes: '20',
              mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            },
          ]
        : {
            document: {
              id: '5',
              versionId: '50',
              kodeDokumen: 'DOC-5',
              slug: 'dokumen',
              judul: 'Dokumen tinjauan',
              statusWorkflow: state.status,
              statusHukum: 'BERLAKU',
              tingkatAkses: 'publik',
              nomorVersi: 1,
              currentPublishedVersionId: null,
              tanggalPenetapan: '2026-10-01',
              deskripsi: 'Deskripsi lengkap',
              nomor: '1',
              tahun: 2026,
              pic: 'Hukum',
              bolehUbah: state.own,
              bolehRevisi: state.own,
            },
            kategoriId: ['1'],
            riwayatVerifikasi: [],
            versions: [],
            statusPeraturan: [],
            keteranganStatus: null,
            keteranganPublik: null,
          },
    ),
  );
}

describe('Admin membaca dokumen tanpa tindakan Superadmin; SOP khusus Superadmin', () => {
  it('tombol verifikasi nonaktif bagi Admin meskipun ada izin langsung', async () => {
    state.status = 'DIAJUKAN';
    state.own = true;
    setupDetail();
    render(<AdminDocumentDetail id="5" />);
    await screen.findByRole('heading', { name: 'Dokumen tinjauan' });
    expect(screen.getByRole('button', { name: 'Setujui' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Kembalikan untuk diperbaiki' })).toBeDisabled();
  });
  for (const own of [true, false])
    it(`tindakan draf mengikuti kepemilikan: ${String(own)}`, async () => {
      state.status = 'DRAF';
      state.own = own;
      setupDetail();
      render(<AdminDocumentDetail id="5" />);
      await screen.findByRole('heading', { name: 'Dokumen tinjauan' });
      const edit = screen.getByRole('link', { name: 'Ubah draf' });
      if (own) {
        expect(edit).toHaveAttribute('href', '/admin/dokumen/5/ubah');
        expect(screen.getByRole('button', { name: 'Ajukan untuk diverifikasi' })).toBeEnabled();
      } else {
        expect(edit).not.toHaveAttribute('href');
        expect(screen.getByRole('button', { name: 'Ajukan untuk diverifikasi' })).toBeDisabled();
      }
    });
  it('Admin membuka SOP Permohonan SK dan dapat mengunggah tanpa kewenangan lepas', async () => {
    state.daftar.mockResolvedValue({ data: [], meta: { totalButir: 0, totalHalaman: 0 } });
    render(<AdminSopPermohonanSk />);
    expect(await screen.findByRole('link', { name: 'Unggah dokumen baru' })).toHaveAttribute('href', '/admin/sop-permohonan-sk/baru');
    expect(state.daftar).toHaveBeenCalledWith('/admin/documents', expect.objectContaining({ kueri: expect.objectContaining({ peruntukan: 'PERMOHONAN_SK' }) }));
    expect(screen.queryByRole('button', { name: 'Lepas' })).not.toBeInTheDocument();
    expect(screen.queryByText('Gunakan SOP yang sudah ada')).not.toBeInTheDocument();
  });
  it('daftar SOP Admin dapat dimuat ulang setelah API gagal', async () => {
    state.daftar.mockRejectedValueOnce(new Error('Temporary failure')).mockResolvedValue({ data: [], meta: { totalButir: 0, totalHalaman: 0 } });
    render(<AdminSopPermohonanSk />);
    fireEvent.click(await screen.findByRole('button', { name: 'Coba muat lagi' }));
    await screen.findByText('Belum ada SOP terverifikasi');
    expect(screen.queryByText('Daftar gagal dimuat')).not.toBeInTheDocument();
    expect(state.daftar).toHaveBeenCalledTimes(2);
  });
  it('Superadmin dapat membuka detail dan pengelolaan SOP', async () => {
    state.peran = ['SUPERADMIN'];
    state.daftar.mockResolvedValue({
      data: [
        {
          id: '5',
          versionId: '50',
          judul: 'SOP permohonan',
          tipe: 'SOP',
          statusWorkflow: 'TERBIT',
          statusHukum: 'BERLAKU',
          tingkatAkses: 'publik',
          diganti: false,
          nomorVersi: 1,
          peruntukan: 'PERMOHONAN_SK',
        },
      ],
      meta: { totalButir: 1, totalHalaman: 1 },
    });
    render(<AdminSopPermohonanSk />);
    for (const link of await screen.findAllByRole('link', { name: /SOP permohonan/ }))
      expect(link).toHaveAttribute('href', '/superadmin/dokumen/5?versionId=50');
    expect(screen.getByRole('link', { name: 'Unggah dokumen baru' })).toHaveAttribute(
      'href',
      '/superadmin/sop-permohonan-sk/baru',
    );
    expect(
      screen
        .getAllByRole('button', { name: 'Lepas' })
        .every((button) => !button.matches(':disabled')),
    ).toBe(true);
  });
  it('SOP lama dipilih melalui dropdown berhalaman dan tetap memerlukan konfirmasi', async () => {
    state.peran = ['SUPERADMIN'];
    state.api.mockClear();
    state.daftar.mockImplementation((_path: string, options: { kueri: { kelompok?: string } }) =>
      Promise.resolve({
        data:
          options.kueri.kelompok === 'SOP'
            ? [
                {
                  id: '9',
                  versionId: '90',
                  judul: 'SOP layanan unit',
                  nomor: '12',
                  tipe: 'SOP',
                  nomorVersi: 1,
                  statusWorkflow: 'TERBIT',
                  statusHukum: 'BERLAKU',
                  tingkatAkses: 'publik',
                  diganti: false,
                },
              ]
            : [],
        meta: { totalButir: 1, totalHalaman: 2 },
      }),
    );
    const { container } = render(<AdminSopPermohonanSk />);
    const details = container.querySelector('details')!;
    details.open = true;
    fireEvent(details, new Event('toggle'));
    await screen.findByRole('option', { name: 'SOP layanan unit · No. 12' });
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(state.daftar).toHaveBeenCalledWith(
      '/admin/documents',
      expect.objectContaining({ kueri: expect.objectContaining({ kelompok: 'SOP', halaman: 1 }) }),
    );
    fireEvent.change(screen.getByRole('combobox', { name: 'Pilih SOP' }), {
      target: { value: '9' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Tandai sebagai SOP Permohonan SK' }));
    await screen.findByRole('dialog', { name: 'Jadikan SOP Permohonan SK?' });
    expect(state.api).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Batal' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
