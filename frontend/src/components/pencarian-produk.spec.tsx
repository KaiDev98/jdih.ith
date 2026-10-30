import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { skemaHasilCariAnonim } from '@jdih/shared';
import { PencarianProduk } from './pencarian-produk';

const sesi = vi.hoisted(() => ({ nilai: { state: 'anonymous' } as Record<string, unknown> }));
const api = vi.hoisted(() => ({ hasil: [] as unknown[], sopKosong: false }));
const navigasi = vi.hoisted(() => ({ search: null as string | null }));
vi.mock('next/navigation', () => ({
  useSearchParams: () => (navigasi.search === null ? null : new URLSearchParams(navigasi.search)),
}));

vi.mock('@/lib/sesi', () => ({ useSession: () => sesi.nilai }));
vi.mock('@/lib/api-client', () => ({
  GalatApi: class GalatApi extends Error {
    status = 400;
  },
  ambilApi: vi.fn(async (path: string, opsi?: { kueri?: Record<string, unknown> }) =>
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
              total: api.sopKosong ? (opsi?.kueri?.kategoriId ? 0 : 1) : 3,
              perJenis: api.sopKosong
                ? opsi?.kueri?.kategoriId
                  ? []
                  : [{ jenisDokumenId: '7', jumlah: 1 }]
                : [
                    { jenisDokumenId: '7', jumlah: 2 },
                    { jenisDokumenId: '5', jumlah: 1 },
                  ],
            }
          : path.endsWith('/years')
            ? [2026, 2025]
            : [],
  ),
  ambilApiBerdaftar: vi.fn(async (_path: string, opsi?: { kueri?: Record<string, unknown> }) => {
    const data =
      api.sopKosong && (opsi?.kueri?.jenisDokumenId === '5' || opsi?.kueri?.kategoriId)
        ? []
        : api.hasil;
    return {
      data,
      meta: {
        halaman: 1,
        perHalaman: 20,
        totalButir: data.length,
        totalHalaman: 1,
        adaSebelumnya: false,
        adaBerikutnya: false,
      },
    };
  }),
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
  api.sopKosong = false;
  navigasi.search = null;
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
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
  it('jumlah jenis aktif mengikuti kategori tanpa menutup pilihan jenis lain', async () => {
    const { ambilApiBerdaftar } = await import('@/lib/api-client');
    navigasi.search = 'jenis=SOP&kategori=SOP-SAINS';
    render(<PencarianProduk initialJenisKode="SOP" initialKategoriKode="SOP-SAINS" />);
    await screen.findByText('Tidak ada dokumen yang cocok');
    const sop = screen.getByRole('button', { name: /^SOP\s*0$/ });
    expect(sop).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Peraturan Rektor\s*2/ })).toBeEnabled();
    fireEvent.click(sop);
    expect(vi.mocked(ambilApiBerdaftar).mock.calls.at(-1)?.[1]?.kueri).toMatchObject({
      jenisDokumenId: '5',
      kategoriId: '1',
    });
    expect(
      screen.getByRole('button', { name: 'Hapus penyaring Jurusan Sains' }),
    ).toBeInTheDocument();
  });
  it('SOP unit kosong tidak menolkan jenis lain dan kategori dilepas saat berganti jenis', async () => {
    const { ambilApi, ambilApiBerdaftar } = await import('@/lib/api-client');
    api.sopKosong = true;
    api.hasil = [{ ...ringkasan, tipe: 'Peraturan Rektor', judul: 'Peraturan Akademik' }];
    navigasi.search = 'jenis=SOP&kategori=SOP-SAINS&tahun=2026&statusHukum=BERLAKU';
    render(
      <PencarianProduk
        initialJenisKode="SOP"
        initialKategoriKode="SOP-SAINS"
        initialYear="2026"
        initialStatus="BERLAKU"
      />,
    );
    await screen.findByText('Tidak ada dokumen yang cocok');
    expect(screen.getByRole('button', { name: /^SOP\s*0$/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const peraturan = await screen.findByRole('button', { name: /Peraturan Rektor\s*1/ });
    expect(
      vi
        .mocked(ambilApi)
        .mock.calls.filter(([path]) => path.endsWith('/facets'))
        .at(-1)?.[1]?.kueri,
    ).not.toHaveProperty('kategoriId');
    fireEvent.click(peraturan);
    await screen.findByRole('link', { name: 'Peraturan Akademik' });
    expect(vi.mocked(ambilApiBerdaftar).mock.calls.at(-1)?.[1]?.kueri).toMatchObject({
      jenisDokumenId: '7',
      kategoriId: '',
      tahun: '2026',
      statusHukum: 'BERLAKU',
    });
    expect(
      screen.queryByRole('button', { name: 'Hapus penyaring Jurusan Sains' }),
    ).not.toBeInTheDocument();
    expect(window.location.search).not.toContain('kategori=');
    fireEvent.click(screen.getByRole('button', { name: /Semua jenis\s*1/ }));
    await waitFor(() =>
      expect(vi.mocked(ambilApiBerdaftar).mock.calls.at(-1)?.[1]?.kueri).toMatchObject({
        jenisDokumenId: '',
        kategoriId: '',
      }),
    );
    expect(screen.getByRole('link', { name: 'Peraturan Akademik' })).toBeInTheDocument();
  });
  it('menempatkan Tahun dan Kategori sebelum Jenis produk hukum sesuai urutan baca dan keyboard', async () => {
    render(<PencarianProduk />);
    await screen.findByRole('button', { name: /Peraturan Rektor\s*2/ });
    const year = screen.getByText('Tahun', { exact: true });
    const category = screen.getByText('Kategori', { exact: true });
    const type = screen.getByText('Jenis produk hukum', { exact: true });
    expect(year.compareDocumentPosition(category) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(category.compareDocumentPosition(type) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
  it('seluruh kartu tetap menjadi satu tautan berlabel judul dokumen', async () => {
    api.hasil = [ringkasan];
    render(<PencarianProduk />);
    const card = await screen.findByRole('link', { name: ringkasan.judul });
    expect(card).toHaveAttribute('href', '/produk-hukum/sop-praktikum');
    expect(
      within(card).getByRole('heading', { name: ringkasan.judul, level: 3 }),
    ).toBeInTheDocument();
    expect(within(card).getByText(ringkasan.tipe)).toBeInTheDocument();
    expect(within(card).queryAllByRole('link')).toHaveLength(0);
  });
  it('tetap dapat memuat halaman berikutnya tanpa IntersectionObserver', async () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const { ambilApiBerdaftar } = await import('@/lib/api-client');
    const meta = {
      halaman: 1,
      perHalaman: 15,
      totalButir: 2,
      totalHalaman: 2,
      adaSebelumnya: false,
      adaBerikutnya: true,
    };
    vi.mocked(ambilApiBerdaftar)
      .mockResolvedValueOnce({ data: [ringkasan], meta })
      .mockResolvedValueOnce({
        data: [{ ...ringkasan, id: '11', judul: 'Dokumen berikutnya' }],
        meta: { ...meta, halaman: 2, adaBerikutnya: false },
      });
    render(<PencarianProduk />);
    fireEvent.click(await screen.findByRole('button', { name: 'Muat dokumen berikutnya' }));
    expect(await screen.findByText('Dokumen berikutnya')).toBeInTheDocument();
    expect(screen.getByText('SOP Praktikum')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Muat dokumen berikutnya' }),
    ).not.toBeInTheDocument();
  });
  it('pemuatan otomatis tetap memakai panel pada ponsel dan desktop', async () => {
    const listeners = new Set<() => void>();
    const media = {
      matches: false,
      addEventListener: (_: string, fn: () => void) => listeners.add(fn),
      removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
    };
    vi.stubGlobal('matchMedia', () => media);
    const opsi: IntersectionObserverInit[] = [];
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(_callback: IntersectionObserverCallback, options: IntersectionObserverInit) {
          opsi.push(options);
        }
        observe() {}
        disconnect() {}
      },
    );
    const { ambilApiBerdaftar } = await import('@/lib/api-client');
    vi.mocked(ambilApiBerdaftar).mockResolvedValueOnce({
      data: [ringkasan],
      meta: {
        halaman: 1,
        perHalaman: 15,
        totalButir: 2,
        totalHalaman: 2,
        adaSebelumnya: false,
        adaBerikutnya: true,
      },
    });
    render(<PencarianProduk />);
    await screen.findByRole('button', { name: 'Muat dokumen berikutnya' });
    await waitFor(() =>
      expect(opsi.at(-1)?.root).toBe(screen.getByRole('region', { name: 'Daftar dokumen' })),
    );
    act(() => {
      media.matches = true;
      listeners.forEach((fn) => fn());
    });
    await waitFor(() =>
      expect(opsi.at(-1)?.root).toBe(screen.getByRole('region', { name: 'Daftar dokumen' })),
    );
  });
  it('menu jenis yang sama menghapus pencarian lama meskipun komponen dipakai ulang', async () => {
    const { ambilApiBerdaftar } = await import('@/lib/api-client');
    navigasi.search = 'jenis=PERREK';
    api.hasil = [ringkasan];
    const view = render(<PencarianProduk initialJenisKode="PERREK" />);
    await screen.findByRole('link', { name: ringkasan.judul });
    api.hasil = [];
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zz-tidak-ada' } });
    await screen.findByText('Tidak ada dokumen yang cocok');
    navigasi.search = window.location.search.slice(1);
    view.rerender(<PencarianProduk initialJenisKode="PERREK" />);
    api.hasil = [ringkasan];
    navigasi.search = 'jenis=PERREK';
    view.rerender(<PencarianProduk initialJenisKode="PERREK" />);
    await screen.findByRole('link', { name: ringkasan.judul });
    expect(screen.getByRole('searchbox')).toHaveValue('');
    expect(vi.mocked(ambilApiBerdaftar).mock.calls.at(-1)?.[1]?.kueri).toMatchObject({
      q: '',
      jenisDokumenId: '7',
    });
    api.hasil = [];
    navigasi.search = 'jenis=PERREK&q=zz-tidak-ada';
    view.rerender(<PencarianProduk initialJenisKode="PERREK" />);
    await screen.findByText('Tidak ada dokumen yang cocok');
    expect(screen.getByRole('searchbox')).toHaveValue('zz-tidak-ada');
    api.hasil = [ringkasan];
    navigasi.search = 'jenis=PERREK';
    view.rerender(<PencarianProduk initialJenisKode="PERREK" />);
    await screen.findByRole('link', { name: ringkasan.judul });
  });
  it('pengunjung anonim tidak melihat label Publik maupun Dosen/Staf', async () => {
    api.hasil = [ringkasan];
    render(<PencarianProduk />);
    expect(await screen.findByText('SOP Praktikum')).toBeInTheDocument();
    expect(screen.queryByText(/Publik/i)).toBeNull();
    expect(screen.queryByText(/Internal/i)).toBeNull();
    expect(screen.queryByText('Dosen/Staf')).toBeNull();
  });

  it('pengguna berhak tetap melihat label tingkat akses', async () => {
    sesi.nilai = { state: 'authenticated', pengguna: { status: 'AKTIF' } };
    api.hasil = [{ ...ringkasan, tingkatAkses: 'internal' }];
    render(<PencarianProduk />);
    expect(await screen.findByText('Dosen/Staf')).toBeInTheDocument();
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
