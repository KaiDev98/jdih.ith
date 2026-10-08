import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DasborAdmin from './page';

const izin = { daftar: [] as string[] };
vi.mock('@/lib/sesi', () => ({
  useSession: () => ({ pengguna: { nama: 'Admin Uji', izin: izin.daftar } }),
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
            ? { sukses: true, data: [{ id: '1' }, { id: '2' }] }
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
  afterEach(() => vi.unstubAllGlobals());

  it('menampilkan angka nyata, antrean, dan aktivitas sesuai izin', async () => {
    izin.daftar = ['documents.read_admin', 'documents.create', 'users.read', 'audit.read'];
    siapkanApi();
    render(<DasborAdmin />);
    expect(screen.getByRole('heading', { level: 1, name: 'Halo, Admin Uji' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Buat dokumen/ })).toHaveAttribute(
      'href',
      '/admin/dokumen/baru',
    );
    expect(
      await screen.findByRole('link', { name: /Menunggu verifikasi\s*3/ }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /Total dokumen\s*12/ })).toBeInTheDocument();
    expect(
      await screen.findByRole('link', { name: /Akun menunggu persetujuan\s*2/ }),
    ).toBeInTheDocument();
    expect(await screen.findByText('SK Uji')).toBeInTheDocument();
    expect(await screen.findByText(/menerbitkan · alur verifikasi/)).toBeInTheDocument();
    expect(screen.getByText(/WITA/)).toBeInTheDocument();
  });

  it('menyembunyikan bagian yang tidak diizinkan', () => {
    izin.daftar = ['templates.manage'];
    siapkanApi();
    render(<DasborAdmin />);
    expect(screen.queryByText('Perlu diverifikasi')).not.toBeInTheDocument();
    expect(screen.queryByText('Aktivitas terbaru')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Buat dokumen/ })).not.toBeInTheDocument();
  });
});
