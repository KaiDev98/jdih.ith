import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { skemaHasilCariAnonim } from '@jdih/shared';
import { PencarianProduk } from './pencarian-produk';

const sesi = vi.hoisted(() => ({ nilai: { state: 'anonymous' } as Record<string, unknown> }));
const api = vi.hoisted(() => ({ hasil: [] as unknown[] }));

vi.mock('@/lib/sesi', () => ({ useSession: () => sesi.nilai }));
vi.mock('@/lib/api-client', () => ({
  GalatApi: class GalatApi extends Error {
    status = 400;
  },
  ambilApi: vi.fn(async (path: string) =>
    path.endsWith('jenis_dokumen')
      ? [
          { id: '7', kode: 'PERREK', nama: 'Peraturan Rektor' },
          { id: '5', kode: 'SOP', nama: 'SOP' },
        ]
      : path.endsWith('kategori')
        ? [
            { id: '9', kode: 'SOP-AKADEMIK', nama: 'Akademik' },
            { id: '1', kode: 'SOP-SAINS', nama: 'Jurusan Sains' },
          ]
        : path.endsWith('/facets')
          ? {
              total: 3,
              perJenis: [
                { jenisDokumenId: '7', jumlah: 2 },
                { jenisDokumenId: '5', jumlah: 1 },
              ],
            }
          : path.endsWith('/years')
            ? [2026, 2025]
            : [],
  ),
  ambilApiBerdaftar: vi.fn(async () => ({
    data: api.hasil,
    meta: {
      halaman: 1,
      perHalaman: 20,
      totalButir: api.hasil.length,
      totalHalaman: 1,
      adaSebelumnya: false,
      adaBerikutnya: false,
    },
  })),
}));

const ringkasan = {
  id: '10',
  slug: 'sop-praktikum',
  tipe: 'SOP',
  judul: 'SOP Praktikum',
  nomor: '1/SOP/2026',
  tahun: 2026,
  tanggalPenetapan: '2026-01-03',
  statusHukum: 'BERLAKU',
  dilihat: 4,
};

beforeEach(() => {
  sesi.nilai = { state: 'anonymous' };
  api.hasil = [];
});

describe('kontrak pencarian untuk pengunjung anonim', () => {
  it('menerima ringkasan dokumen publik tanpa label akses apa pun', () => {
    expect(skemaHasilCariAnonim.parse(ringkasan)).toEqual(ringkasan);
  });
  it('menolak bentuk apa pun yang menyiratkan tingkat akses', () => {
    for (const extra of [
      { badge: 'PUBLIK' },
      { badge: 'INTERNAL' },
      { tingkatAkses: 'publik' },
      { tingkatAkses: 'internal' },
    ])
      expect(skemaHasilCariAnonim.safeParse({ ...ringkasan, ...extra }).success).toBe(false);
    // Bentuk lama "judul + badge INTERNAL" tidak lagi sah.
    expect(
      skemaHasilCariAnonim.safeParse({ judul: 'Pedoman Internal', badge: 'INTERNAL' }).success,
    ).toBe(false);
  });
});

describe('tampilan hasil pencarian', () => {
  it('pengunjung anonim tidak melihat label Publik maupun Internal', async () => {
    api.hasil = [ringkasan];
    render(<PencarianProduk />);
    expect(await screen.findByText('SOP Praktikum')).toBeInTheDocument();
    expect(screen.queryByText(/Publik/i)).toBeNull();
    expect(screen.queryByText(/Internal/i)).toBeNull();
  });

  it('pengguna berhak tetap melihat label tingkat akses', async () => {
    sesi.nilai = { state: 'authenticated', pengguna: { status: 'AKTIF' } };
    api.hasil = [{ ...ringkasan, tingkatAkses: 'internal' }];
    render(<PencarianProduk />);
    expect(await screen.findByText('Internal')).toBeInTheDocument();
  });

  it('menampilkan jenis dengan jumlahnya, dan label master sementara nilai request memakai ID', async () => {
    render(<PencarianProduk />);
    const jenis = await screen.findByRole('button', { name: /Peraturan Rektor\s*2/ });
    expect(jenis).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('combobox', { name: 'Kategori' }));
    expect(screen.getByRole('option', { name: 'Akademik' })).toHaveAttribute('data-value', '9');
    fireEvent.click(screen.getByRole('combobox', { name: 'Tahun' }));
    expect(screen.getByRole('option', { name: '2026' })).toHaveAttribute('data-value', '2026');
  });

  it('menerjemahkan kode dari menu menjadi id sebelum pencarian pertama', async () => {
    const { ambilApiBerdaftar } = await import('@/lib/api-client');
    render(<PencarianProduk initialJenisKode="SOP" initialKategoriKode="SOP-SAINS" />);
    await waitFor(() => expect(ambilApiBerdaftar).toHaveBeenCalled());
    const opsi = vi.mocked(ambilApiBerdaftar).mock.calls.at(-1)?.[1] as {
      kueri: Record<string, unknown>;
    };
    expect(opsi.kueri).toMatchObject({ jenisDokumenId: '5', kategoriId: '1' });
    expect(await screen.findByRole('heading', { level: 1, name: 'SOP' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Hapus penyaring Jurusan Sains' }),
    ).toBeInTheDocument();
  });
});
