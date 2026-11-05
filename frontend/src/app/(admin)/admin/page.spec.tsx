import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DasborAdmin from './page';

const izin = { daftar: [] as string[], peran: ['ADMIN'] };
vi.mock('@/lib/sesi', () => ({
  useSession: () => ({ pengguna: { nama: 'Admin Uji', izin: izin.daftar, peran: izin.peran } }),
}));

const berdaftar = (data: unknown[], totalButir: number) => ({
  sukses: true,
  data,
  meta: {
    halaman: 1,
    perHalaman: 5,
    totalButir,
    totalHalaman: 1,
    adaSebelumnya: false,
    adaBerikutnya: false,
  },
});

function siapkanApi() {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      const json = url.includes('/verification-queue')
        ? berdaftar(
            [
              {
                id: '7',
                versionId: 'v7',
                judul: 'SK Uji',
                tipe: 'SK Rektor',
                nomor: '1',
                statusWorkflow: 'DIAJUKAN',
              },
            ],
            3,
          )
        : url.includes('/admin/documents')
          ? berdaftar([], 12)
          : url.includes('/admin/users')
            ? {
                sukses: true,
                data: [
                  { id: '1', nama: 'Dosen Satu', email: 'satu@ith.ac.id' },
                  { id: '2', nama: 'Dosen Dua', email: 'dua@ith.ac.id' },
                ],
              }
            : berdaftar(
                [
                  {
                    id: '1',
                    actor: 'Admin Uji',
                    module: 'workflow',
                    action: 'PUBLISH',
                    createdAt: '2026-10-08 04:00:00.000000',
                  },
                ],
                1,
              );
      return Promise.resolve(
        new Response(JSON.stringify(json), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    }),
  );
}

describe('DasborAdmin', () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); izin.peran = ['ADMIN']; });

  for (const peran of ['ADMIN', 'SUPERADMIN']) it(`membatasi terbaru menjadi 15 dan menggeser item terlama setelah pembaruan untuk ${peran}`, async () => {
    izin.peran = [peran]; izin.daftar = ['documents.read_admin'];
    const row = (id: number) => ({ id: String(id), versionId: String(id + 100), judul: `Dokumen terbaru ${id}`, tipe: 'SK Rektor', nomor: String(id), statusWorkflow: 'TERBIT' });
    let terbaru = Array.from({ length: 16 }, (_, i) => row(16 - i));
    let gagal = false;
    const request = vi.fn(async (url: string) => {
      const latest = new URL(String(url), 'http://localhost').searchParams.get('perHalaman') === '15';
      if (latest && gagal) throw new Error('Offline');
      return new Response(JSON.stringify(berdaftar(latest ? terbaru : [], terbaru.length)), { headers: { 'Content-Type': 'application/json' } });
    });
    vi.stubGlobal('fetch', request);
    render(<DasborAdmin />);
    const list = await screen.findByRole('list', { name: 'Dokumen terakhir diperbarui' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(15);
    expect(within(list).queryByText('Dokumen terbaru 1')).not.toBeInTheDocument();
    expect(request.mock.calls.some(([url]) => String(url).includes('perHalaman=15'))).toBe(true);
    terbaru = [row(17), ...terbaru];
    act(() => window.dispatchEvent(new Event('jdih:workflow')));
    await within(list).findByText('Dokumen terbaru 17');
    expect(within(list).getAllByRole('listitem')).toHaveLength(15);
    expect(within(list).queryByText('Dokumen terbaru 2')).not.toBeInTheDocument();
    gagal = true;
    const before = request.mock.calls.length;
    act(() => window.dispatchEvent(new Event('focus')));
    await waitFor(() => expect(request.mock.calls.length).toBeGreaterThan(before));
    expect(within(list).getByText('Dokumen terbaru 17')).toBeInTheDocument();
    expect(request.mock.calls.some(([url]) => String(url).includes('/audit'))).toBe(false);
  });

  it('respons terbaru yang terlambat tidak mengganti data dari pembaruan yang lebih baru', async () => {
    izin.daftar = ['documents.read_admin'];
    const responses: ((response: Response) => void)[] = [];
    vi.stubGlobal('fetch', vi.fn((url: string) => new URL(String(url), 'http://localhost').searchParams.get('perHalaman') === '15'
      ? new Promise<Response>((resolve) => responses.push(resolve))
      : Promise.resolve(new Response(JSON.stringify(berdaftar([], 0)), { headers: { 'Content-Type': 'application/json' } }))));
    render(<DasborAdmin />);
    await waitFor(() => expect(responses).toHaveLength(1));
    act(() => window.dispatchEvent(new Event('focus')));
    await waitFor(() => expect(responses).toHaveLength(2));
    const response = (judul: string) => new Response(JSON.stringify(berdaftar([{ id: '5', versionId: '50', judul, tipe: 'SOP', statusWorkflow: 'TERBIT' }], 1)), { headers: { 'Content-Type': 'application/json' } });
    await act(async () => responses[1]!(response('Data paling baru')));
    await screen.findByText('Data paling baru');
    await act(async () => responses[0]!(response('Respons lama')));
    expect(screen.getByText('Data paling baru')).toBeInTheDocument();
    expect(screen.queryByText('Respons lama')).not.toBeInTheDocument();
  });

  it('Admin tetap tidak ditawari verifikasi Dosen/Staf walaupun diberi users.approve langsung', async () => {
    izin.peran = ['ADMIN']; izin.daftar = ['documents.read_admin', 'users.read', 'users.approve'];
    siapkanApi(); render(<DasborAdmin />);
    await screen.findByRole('link', { name: /Akun menunggu\s*2/ });
    expect(screen.queryByRole('link', { name: /Tinjau akun/ })).not.toBeInTheDocument();
    expect(screen.getByText('Tidak ada dokumen yang perlu direvisi saat ini.')).toBeInTheDocument();
    expect(screen.queryByText('Tidak ada dokumen atau akun yang menunggu Anda saat ini.')).not.toBeInTheDocument();
  });

  for (const peran of ['ADMIN', 'SUPERADMIN']) it(`pintasan SOP khusus Superadmin: ${peran}`, () => {
    izin.peran = [peran]; izin.daftar = ['documents.read_admin', 'documents.create'];
    siapkanApi(); render(<DasborAdmin />);
    const sop = screen.queryByRole('link', { name: /SOP Permohonan SK/ });
    expect(sop).toHaveAttribute('href', peran === 'ADMIN' ? '/admin/sop-permohonan-sk' : '/superadmin/sop-permohonan-sk');
  });

  it('menampilkan angka nyata dan pekerjaan yang menunggu sesuai izin', async () => {
    izin.peran = ['SUPERADMIN'];
    izin.daftar = [
      'documents.read_admin',
      'documents.create',
      'users.read',
      'users.approve',
      'audit.read',
      'workflow.approve',
    ];
    siapkanApi();
    render(<DasborAdmin />);
    expect(
      screen.getByRole('heading', { level: 1, name: /^Selamat (pagi|siang|sore|malam), Admin$/ }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Upload dokumen/ })[0]).toHaveAttribute(
      'href',
      '/superadmin/dokumen/baru',
    );
    expect(await screen.findByRole('link', { name: /Menunggu verifikasi\s*3/ })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /Tampil di portal\s*12/ })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /Akun menunggu\s*2/ })).toBeInTheDocument();
    // Dokumen yang diajukan dan pendaftaran akun muncul sebagai pekerjaan.
    expect(await screen.findByRole('link', { name: /SK Uji.*Verifikasi/ })).toHaveAttribute(
      'href',
      '/superadmin/dokumen/verifikasi/7?versionId=v7',
    );
    expect(await screen.findByRole('link', { name: /Dosen Satu.*Tinjau akun/ })).toBeInTheDocument();
    const terbaru = screen.getByRole('heading', { name: 'Terakhir Diperbarui' });
    const tindakan = screen.getByRole('heading', { name: 'Perlu Tindakan' });
    expect(terbaru.compareDocumentPosition(tindakan) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  for (const peran of ['ADMIN', 'SUPERADMIN']) it(`${peran} tidak melihat atau meminta audit di dashboard meskipun memiliki audit.read`, async () => {
    izin.peran = [peran];
    izin.daftar = ['documents.read_admin', 'audit.read'];
    siapkanApi();
    render(<DasborAdmin />);
    await screen.findByText('Semua beres');
    expect(screen.queryByText('Aktivitas terbaru')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Audit' })).not.toBeInTheDocument();
    await waitFor(() => expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).includes('/admin/audit'))).toBe(false));
  });

  it('tidak menawarkan verifikasi kepada akun yang hanya memantau', async () => {
    izin.daftar = ['documents.read_admin'];
    siapkanApi();
    render(<DasborAdmin />);
    expect(await screen.findByText('Semua beres')).toBeInTheDocument();
    expect(screen.queryByText('SK Uji')).not.toBeInTheDocument();
  });

  it('menyembunyikan bagian yang tidak diizinkan', () => {
    izin.daftar = ['templates.manage'];
    siapkanApi();
    render(<DasborAdmin />);
    expect(screen.queryByText('Perlu Tindakan')).not.toBeInTheDocument();
    expect(screen.queryByText('Aktivitas terbaru')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Upload dokumen/ })).not.toBeInTheDocument();
  });
});
