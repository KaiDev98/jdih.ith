import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { skemaHasilCariAnonim, skemaHasilCariInternalAnonim } from '@jdih/shared';
import { PencarianProduk } from './pencarian-produk';

vi.mock('@/lib/sesi', () => ({ useSession: () => ({ state: 'anonymous' }) }));
vi.mock('@/lib/api-client', () => ({
  GalatApi: class GalatApi extends Error { status = 400; },
  ambilApi: vi.fn(async (path: string) => path.endsWith('jenis_dokumen') ? [{id:'7',nama:'Peraturan Rektor'}] : path.endsWith('kategori') ? [{id:'9',nama:'Akademik'}] : [{id:'3',nama:'Rektorat'}]),
  ambilApiBerdaftar: vi.fn(async () => ({ data: [{ judul: 'Pedoman Internal', badge: 'INTERNAL' }], meta: { halaman: 1, perHalaman: 20, totalButir: 1, totalHalaman: 1, adaSebelumnya: false, adaBerikutnya: false } })),
}));

describe('pencarian anonim', () => {
  it('menerima shape Internal anonim dengan hanya judul dan badge', () => {
    expect(skemaHasilCariInternalAnonim.parse({ judul: 'Pedoman Internal', badge: 'INTERNAL' })).toEqual({ judul: 'Pedoman Internal', badge: 'INTERNAL' });
  });
  it('menolak id, slug, file, URL detail, dan metadata tambahan secara strict', () => {
    for (const extra of [
      { id: '1' }, { slug: 'pedoman' }, { file: 'x.pdf' }, { urlDetail: '/produk-hukum/x' },
      { nomor: '1/2026' }, { tahun: 2026 }, { tipe: 'Pedoman' }, { unit: 'Unit' }, { statusHukum: 'BERLAKU' },
      { kemampuan: { preview: true, download: true } },
    ]) expect(skemaHasilCariInternalAnonim.safeParse({ judul: 'Pedoman Internal', badge: 'INTERNAL', ...extra }).success).toBe(false);
  });
  it('tidak memiliki shape hasil Secret untuk pencarian anonim', () => {
    expect(skemaHasilCariAnonim.safeParse({ judul: 'Rahasia', badge: 'RAHASIA' }).success).toBe(false);
    expect(skemaHasilCariAnonim.safeParse({ judul: 'Rahasia', badge: 'INTERNAL', tingkatAkses: 'rahasia' }).success).toBe(false);
  });
  it('menampilkan INTERNAL sebagai teks saja tanpa tautan yang dapat dibuka', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ sukses: true, data: [] }), { status: 200, headers: { 'content-type': 'application/json' } })));
    render(<PencarianProduk />);
    expect(await screen.findByText('Pedoman Internal')).toBeInTheDocument();
    expect(screen.getByText('Pedoman Internal').closest('a')).toBeNull();
    expect(screen.getByText('Masuk dengan akun Dosen/Staf ITH aktif untuk melihat dokumen ini.')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('INTERNAL')).toBeInTheDocument());
    vi.unstubAllGlobals();
  });
  it('menampilkan label master yang manusiawi sementara nilai request tetap memakai ID', async () => {
    render(<PencarianProduk />);
    const type = await screen.findByRole('combobox', { name: 'Jenis Produk Hukum' });
    const category = screen.getByRole('combobox', { name: 'Kategori' });
    expect(type.querySelector('option[value="7"]')?.textContent).toBe('Peraturan Rektor');
    expect(category.querySelector('option[value="9"]')?.textContent).toBe('Akademik');
  });
});
