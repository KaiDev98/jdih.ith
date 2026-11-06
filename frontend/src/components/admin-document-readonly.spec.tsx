import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminDocumentDetail } from './admin-document-detail';
import { AdminSopPermohonanSk } from './admin-sop-permohonan-sk';

const state = vi.hoisted(() => ({
  peran: ['ADMIN'],
  status: 'DIAJUKAN',
  own: false,
  current: null as string | null,
  hukum: 'BERLAKU',
  versions: [] as { versionId: string; nomorVersi: number; statusWorkflow: string }[],
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
        'workflow.withdraw',
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
  state.current = null;
  state.hukum = 'BERLAKU';
  state.versions = [];
  state.daftar.mockClear();
});

function setupDetail(deskripsi: string | null = 'Deskripsi lengkap') {
  state.daftar.mockResolvedValue({ data: [], meta: { totalButir: 0, totalHalaman: 0 } });
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
              statusHukum: state.hukum,
              tingkatAkses: 'publik',
              nomorVersi: 1,
              currentPublishedVersionId: state.current,
              tanggalPenetapan: '2026-10-01',
              deskripsi,
              nomor: '1',
              tahun: 2026,
              pic: 'Hukum',
              bolehUbah: state.own,
              bolehRevisi: state.own,
            },
            kategoriId: ['1'],
            riwayatVerifikasi: [],
            versions: state.versions,
            statusPeraturan: [],
            keteranganStatus: null,
            keteranganPublik: null,
          },
    ),
  );
}

describe('Admin membaca dokumen tanpa tindakan Superadmin; SOP khusus Superadmin', () => {
  it.each([['ADMIN', 'DRAF'], ['SUPERADMIN', 'DRAF'], ['ADMIN', 'TERBIT'], ['SUPERADMIN', 'TERBIT']])('%s tidak dapat menghapus induk dari versi lama saat revisi %s', async (role, stage) => {
    state.peran = [role!]; state.status = 'TERBIT'; state.current = stage === 'TERBIT' ? '51' : '50'; state.own = true;
    state.versions = [{ versionId: '51', nomorVersi: 2, statusWorkflow: stage! }];
    setupDetail();
    render(<AdminDocumentDetail id="5" />);
    await screen.findByRole('link', { name: 'Buka Versi Terbaru' });
    expect(screen.queryByRole('button', { name: 'Hapus permanen' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Hapus Seluruh Dokumen' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Minta Penghapusan|Minta Pencabutan dan Penghapusan/ })).not.toBeInTheDocument();
    if (role === 'ADMIN' && stage === 'TERBIT')
      expect(screen.getByRole('button', { name: 'Minta Hapus Versi 1' })).toBeEnabled();
    else expect(screen.queryByRole('button', { name: 'Minta Hapus Versi 1' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Buka Versi Terbaru' })).toHaveAttribute('href', `/${role === 'SUPERADMIN' ? 'superadmin' : 'admin'}/dokumen/5?versionId=51`);
  });
  it.each([['ADMIN', 'DRAF'], ['ADMIN', 'REVISI'], ['SUPERADMIN', 'DRAF'], ['SUPERADMIN', 'REVISI']])('%s %s tidak menampilkan atau memuat permintaan pencabutan/penghapusan', async (role, status) => {
    state.peran = [role!]; state.status = status!; state.own = true;
    setupDetail();
    render(<AdminDocumentDetail id="5" />);
    await screen.findByRole('heading', { name: 'Dokumen tinjauan' });
    expect(screen.queryByRole('heading', { name: /Permintaan Pencabutan/ })).not.toBeInTheDocument();
    expect(state.daftar.mock.calls.some(([url]) => String(url).includes('removal-requests'))).toBe(false);
  });
  it.each(['ADMIN', 'SUPERADMIN'])('%s dapat melanjutkan verifikasi dengan deskripsi kosong', async (role) => {
    state.peran = [role];
    state.status = role === 'ADMIN' ? 'DRAF' : 'DIAJUKAN';
    state.own = true;
    setupDetail(null);
    render(<AdminDocumentDetail id="5" />);
    await screen.findByRole('heading', { name: 'Dokumen tinjauan' });
    expect(screen.getByRole('button', { name: role === 'ADMIN' ? 'Ajukan untuk diverifikasi' : 'Setujui' })).toBeEnabled();
    expect(screen.queryByText(/Deskripsi wajib/)).not.toBeInTheDocument();
  });
  it('pencabutan langsung memakai versi terbit, alasan wajib dan konfirmasi; status Dicabut tetap menyimpan berkas', async () => {
    state.peran = ['SUPERADMIN']; state.status = 'TERBIT'; state.own = true; state.current = '50';
    setupDetail(); render(<AdminDocumentDetail id="5" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Cabut Dokumen' }));
    expect(screen.getByRole('button', { name: 'Ya, cabut' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Alasan pencabutan (wajib)'), { target: { value: 'Pencabutan tanpa pengganti' } });
    state.hukum = 'DICABUT';
    fireEvent.click(screen.getByRole('button', { name: 'Ya, cabut' }));
    await waitFor(() => expect(state.api).toHaveBeenCalledWith('/admin/documents/5/revoke', {
      method: 'POST', headers: {}, muatan: { versionId: '50', alasan: 'Pencabutan tanpa pengganti' },
    }));
    await screen.findByText('Dokumen ini telah dicabut. Berkas dan riwayatnya tetap tersimpan.');
    expect(screen.queryByRole('button', { name: 'Cabut Dokumen' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Berkas' })).toBeInTheDocument();
    expect(state.api).toHaveBeenCalledWith('/admin/documents/versions/50/files');
  });
  it('tombol verifikasi nonaktif bagi Admin meskipun ada izin langsung', async () => {
    state.status = 'DIAJUKAN';
    state.own = true;
    setupDetail();
    render(<AdminDocumentDetail id="5" />);
    await screen.findByRole('heading', { name: 'Dokumen tinjauan' });
    expect(screen.getByRole('button', { name: 'Setujui' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Kembalikan untuk diperbaiki' })).toBeDisabled();
    const pair = screen.getByLabelText('Status hukum dan permintaan dokumen');
    expect(pair).toContainElement(screen.getByRole('heading', { name: 'Status hukum' }));
    expect(pair).toContainElement(screen.getByRole('heading', { name: /Permintaan Pencabutan & Penghapusan/ }));
  });
  it('Status Hukum langsung mengikuti Berkas; Hapus dan Permintaan berada dalam kolom riwayat Superadmin', async () => {
    state.peran = ['SUPERADMIN'];
    state.status = 'TERBIT';
    state.current = '50';
    state.own = true;
    setupDetail();
    render(<AdminDocumentDetail id="5" />);
    await screen.findByRole('heading', { name: 'Dokumen tinjauan' });
    const pair = screen.getByLabelText('Status hukum dan penghapusan permanen');
    const status = screen.getByRole('heading', { name: 'Status hukum' });
    const remove = screen.getByRole('heading', { name: 'Hapus Seluruh Dokumen' });
    const requests = screen.getByRole('heading', { name: /Permintaan Pencabutan & Penghapusan/ });
    const left = screen.getByRole('group', { name: 'Berkas dan Status Hukum' });
    const right = screen.getByLabelText('Informasi dan riwayat dokumen');
    expect(pair.children[0]).toBe(left);
    expect(pair.children[1]).toBe(right);
    expect(left).toContainElement(status);
    expect(status.closest('.panel-card')?.previousElementSibling).toBe(screen.getByRole('heading', { name: 'Berkas' }).closest('.detail-berkas'));
    expect(right).toContainElement(remove);
    expect(right).toContainElement(requests);
    expect(remove.closest('.panel-card')?.nextElementSibling).toContainElement(requests);
    expect(screen.getByRole('button', { name: 'Hapus permanen' })).toBeDisabled();
    expect(state.api.mock.calls.every(([, options]) => !options?.method)).toBe(true);
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
        expect(screen.getByRole('button', { name: 'Hapus Draf' })).toBeEnabled();
        expect(screen.getByRole('heading', { name: 'Berkas' }).closest('.detail-berkas')).toContainElement(screen.getByRole('button', { name: 'Hapus Draf' }));
      } else {
        expect(edit).not.toHaveAttribute('href');
        expect(screen.getByRole('button', { name: 'Ajukan untuk diverifikasi' })).toBeDisabled();
        expect(screen.queryByRole('button', { name: 'Hapus Draf' })).not.toBeInTheDocument();
      }
    });
  for (const status of ['DRAF', 'REVISI', 'DIAJUKAN'])
    it(`Superadmin ${status} tidak melihat Hapus Permanen; hapus draf hanya di panel Berkas saat dapat diubah`, async () => {
      state.peran = ['SUPERADMIN'];
      state.status = status;
      state.own = true;
      setupDetail();
      render(<AdminDocumentDetail id="5" konteks="pengajuan" />);
      await screen.findByRole('heading', { name: 'Dokumen tinjauan' });
      expect(screen.queryByRole('heading', { name: 'Hapus permanen' })).not.toBeInTheDocument();
      const button = screen.queryByRole('button', { name: 'Hapus Draf' });
      if (status === 'DIAJUKAN') expect(button).not.toBeInTheDocument();
      else expect(screen.getByRole('heading', { name: 'Berkas' }).closest('.detail-berkas')).toContainElement(button);
    });
  for (const role of ['ADMIN', 'SUPERADMIN'])
    it(`${role} menghapus versi draf dari Berkas setelah konfirmasi, tanpa memakai hapus permanen`, async () => {
      state.peran = [role]; state.status = 'DRAF'; state.own = true;
      setupDetail();
      render(<AdminDocumentDetail id="5" konteks="pengajuan" />);
      const remove = await screen.findByRole('button', { name: 'Hapus Draf' });
      fireEvent.click(remove);
      fireEvent.click(screen.getByRole('button', { name: 'Batal' }));
      expect(state.api.mock.calls.some(([, options]) => options?.method === 'DELETE')).toBe(false);
      fireEvent.click(remove);
      fireEvent.click(screen.getByRole('button', { name: 'Ya, hapus draf' }));
      await waitFor(() => expect(state.api).toHaveBeenCalledWith('/admin/documents/5/drafts/50', expect.objectContaining({ method: 'DELETE' })));
      expect(state.api.mock.calls.some(([url, options]) => url === '/admin/documents/5' && options?.method === 'DELETE')).toBe(false);
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
