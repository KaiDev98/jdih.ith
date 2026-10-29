import { render, screen, waitFor } from '@testing-library/react';
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
  afterEach(() => { vi.unstubAllGlobals(); izin.peran = ['ADMIN']; });

  for (const peran of ['ADMIN', 'SUPERADMIN']) it(`pintasan SOP khusus Superadmin: ${peran}`, () => {
    izin.peran = [peran]; izin.daftar = ['documents.read_admin', 'documents.create'];
    siapkanApi(); render(<DasborAdmin />);
    const sop = screen.queryByRole('link', { name: /SOP Permohonan SK/ });
    if (peran === 'ADMIN') expect(sop).not.toBeInTheDocument();
    else expect(sop).toHaveAttribute('href', '/superadmin/sop-permohonan-sk');
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
    expect(screen.queryByText('Perlu tindakan')).not.toBeInTheDocument();
    expect(screen.queryByText('Aktivitas terbaru')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Upload dokumen/ })).not.toBeInTheDocument();
  });
});
