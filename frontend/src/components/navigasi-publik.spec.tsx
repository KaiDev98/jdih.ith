import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NavigasiPublik } from './navigasi-publik';

const desktop = () => screen.getByRole('navigation', { name: 'Navigasi utama' });
const alamat = vi.hoisted(() => ({ path: '/', query: '' }));
vi.mock('next/navigation', () => ({
  usePathname: () => alamat.path,
  useSearchParams: () => new URLSearchParams(alamat.query),
}));
afterEach(() => {
  alamat.path = '/';
  alamat.query = '';
});

describe('orientasi dan keyboard navigasi publik', () => {
  it('menandai halaman aktif pada tautan langsung', () => {
    alamat.path = '/format-persuratan';
    render(<NavigasiPublik />);
    expect(within(desktop()).getByRole('link', { name: 'Format Persuratan' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(desktop()).getByRole('link', { name: 'Beranda' })).not.toHaveAttribute(
      'aria-current',
    );
  });
  it.each([
    ['jenis=SOP', 'SOP'],
    ['tahun=2026', 'Berdasarkan Tahun'],
    ['', 'Produk Hukum'],
  ])('menandai kelompok sesuai alamat %s', (query, label) => {
    alamat.path = '/produk-hukum';
    alamat.query = query;
    render(<NavigasiPublik />);
    expect(within(desktop()).getByRole('button', { name: label })).toHaveAttribute(
      'data-current',
      'true',
    );
  });
  it('Escape menutup dropdown dan mengembalikan fokus ke pemicunya', () => {
    render(<NavigasiPublik />);
    const tombol = within(desktop()).getByRole('button', { name: 'Produk Hukum' });
    fireEvent.click(tombol);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(tombol).toHaveAttribute('aria-expanded', 'false');
    expect(tombol).toHaveFocus();
  });
  it('menu seluler dapat ditutup lewat Escape atau klik di luar', () => {
    render(<NavigasiPublik />);
    const tombol = screen.getByRole('button', { name: 'Buka menu' });
    fireEvent.click(tombol);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(tombol).toHaveAttribute('aria-expanded', 'false');
    expect(tombol).toHaveFocus();
    fireEvent.click(tombol);
    fireEvent.pointerDown(document.body);
    expect(tombol).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('menu Produk Hukum', () => {
  it('Produk Hukum adalah tombol dropdown, bukan tautan ke halaman', () => {
    render(<NavigasiPublik />);
    const tombol = within(desktop()).getByRole('button', { name: 'Produk Hukum' });
    expect(tombol).toHaveAttribute('aria-expanded', 'false');
    expect(within(desktop()).queryByRole('link', { name: 'Produk Hukum' })).toBeNull();
  });

  it('menampilkan produk hukum Rektor dan Senat saat ditekan, tanpa SOP', () => {
    render(<NavigasiPublik />);
    fireEvent.click(within(desktop()).getByRole('button', { name: 'Produk Hukum' }));
    const harapan: [string, string][] = [
      ['Peraturan Rektor', 'PERREK'],
      ['SK Rektor', 'SKREK'],
      ['Instruksi Rektor', 'INSREK'],
      ['Surat Edaran', 'SEREK'],
      ['Peraturan Senat', 'PERSEN'],
      ['SK Senat', 'SKSEN'],
    ];
    for (const [label, kode] of harapan)
      expect(within(desktop()).getByRole('link', { name: label })).toHaveAttribute(
        'href',
        `/produk-hukum?jenis=${kode}`,
      );
    expect(within(desktop()).queryByRole('link', { name: 'SOP' })).toBeNull();
  });

  it('memakai kode jenis dari basis data bila kode diubah Superadmin', () => {
    render(
      <NavigasiPublik
        jenis={[
          { kode: 'PR', nama: 'Peraturan Rektor' },
          { kode: 'EDREK', nama: 'Surat Edaran Rektor' },
          { kode: 'SOP', nama: 'SOP' },
        ]}
      />,
    );
    fireEvent.click(within(desktop()).getByRole('button', { name: 'Produk Hukum' }));
    expect(within(desktop()).getByRole('link', { name: 'Peraturan Rektor' })).toHaveAttribute(
      'href',
      '/produk-hukum?jenis=PR',
    );
    expect(within(desktop()).getByRole('link', { name: 'Surat Edaran Rektor' })).toHaveAttribute(
      'href',
      '/produk-hukum?jenis=EDREK',
    );
  });
});

describe('menu SOP', () => {
  it('SOP adalah dropdown tersendiri, terpisah dari Produk Hukum', () => {
    render(<NavigasiPublik />);
    const tombol = within(desktop()).getByRole('button', { name: 'SOP' });
    expect(tombol).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(tombol);
    expect(tombol).toHaveAttribute('aria-expanded', 'true');
    expect(within(desktop()).getByRole('link', { name: 'Semua SOP' })).toHaveAttribute(
      'href',
      '/produk-hukum?jenis=SOP',
    );
  });

  it('menampilkan LPPM-PM, Lab, dan Senat tanpa Komisi Kemahasiswaan atau mengganti kode lama', () => {
    render(<NavigasiPublik />);
    fireEvent.click(within(desktop()).getByRole('button', { name: 'SOP' }));
    const harapan: [string, string][] = [
      ['Jurusan Sains', 'SOP-SAINS'],
      ['Jurusan TPI', 'SOP-TPI'],
      ['Perpustakaan', 'SOP-PERPUSTAKAAN'],
      ['TIK', 'SOP-TIK'],
      ['Akademik & Kemahasiswaan', 'SOP-AKADEMIK'],
      ['BMN', 'SOP-BMN'],
      ['Kepegawaian', 'SOP-KEPEGAWAIAN'],
      ['Keuangan', 'SOP-KEUANGAN'],
      ['LPPM-PM', 'SOP-LPPM'],
      ['Bagian Hukum', 'SOP-HUKUM'],
      ['SPI', 'SOP-SPI'],
      ['Komisi Etik Kemahasiswaan', 'SOP-KOMISI-ETIK'],
      ['Laboratorium', 'SOP-LAB'],
      ['Senat', 'SOP-SENAT'],
    ];
    for (const [label, kode] of harapan)
      expect(within(desktop()).getByRole('link', { name: label })).toHaveAttribute(
        'href',
        `/produk-hukum?jenis=SOP&kategori=${kode}`,
      );
    expect(within(desktop()).queryByRole('link', { name: 'Komisi Kemahasiswaan' })).toBeNull();
  });

  it('mengikuti kode jenis SOP dan kategori SOP di basis data', () => {
    render(
      <NavigasiPublik
        jenis={[
          { kode: 'PR', nama: 'Peraturan Rektor' },
          { kode: 'SOP-ITH', nama: 'SOP' },
        ]}
        unitSop={[
          { kode: 'SOP-HUKUM', nama: 'Bagian Hukum' },
          { kode: 'SOP-SPI', nama: 'Satuan Pengawas Internal' },
        ]}
      />,
    );
    fireEvent.click(within(desktop()).getByRole('button', { name: 'SOP' }));
    expect(
      within(desktop()).getByRole('link', { name: 'Satuan Pengawas Internal' }),
    ).toHaveAttribute('href', '/produk-hukum?jenis=SOP-ITH&kategori=SOP-SPI');
    expect(within(desktop()).queryByRole('link', { name: 'TIK' })).toBeNull();
  });

  it('tidak tampil bila jenis SOP tidak aktif', () => {
    render(<NavigasiPublik jenis={[{ kode: 'PR', nama: 'Peraturan Rektor' }]} />);
    expect(within(desktop()).queryByRole('button', { name: 'SOP' })).toBeNull();
  });
});

describe('menu Produk Hukum (tutup)', () => {
  it('Escape menutup dropdown', () => {
    render(<NavigasiPublik />);
    const tombol = within(desktop()).getByRole('button', { name: 'Produk Hukum' });
    fireEvent.click(tombol);
    expect(tombol).toHaveAttribute('aria-expanded', 'true');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(tombol).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('menu Berdasarkan Tahun', () => {
  it('adalah dropdown berisi tahun yang menaut ke Produk Hukum tersaring', () => {
    render(<NavigasiPublik tahun={[2026, 2025, 2024]} />);
    const tombol = within(desktop()).getByRole('button', { name: 'Berdasarkan Tahun' });
    expect(tombol).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(tombol);
    for (const nilai of [2026, 2025, 2024])
      expect(within(desktop()).getByRole('link', { name: String(nilai) })).toHaveAttribute(
        'href',
        `/produk-hukum?tahun=${nilai}`,
      );
  });

  it('menampilkan keterangan bila belum ada tahun', () => {
    render(<NavigasiPublik tahun={[]} />);
    fireEvent.click(within(desktop()).getByRole('button', { name: 'Berdasarkan Tahun' }));
    expect(within(desktop()).getByText('Belum ada dokumen terbit.')).toBeInTheDocument();
  });

  it('membuka satu dropdown tidak membuka yang lain', () => {
    render(<NavigasiPublik tahun={[2026]} />);
    fireEvent.click(within(desktop()).getByRole('button', { name: 'Berdasarkan Tahun' }));
    expect(within(desktop()).getByRole('button', { name: 'Produk Hukum' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });
});

describe('menu Tentang', () => {
  it('adalah dropdown berisi Profil dan Kontak, bukan tautan langsung', () => {
    render(<NavigasiPublik />);
    const tombol = within(desktop()).getByRole('button', { name: 'Tentang' });
    expect(tombol).toHaveAttribute('aria-expanded', 'false');
    expect(within(desktop()).queryByRole('link', { name: 'Tentang' })).toBeNull();
    fireEvent.click(tombol);
    expect(within(desktop()).getByRole('link', { name: 'Profil' })).toHaveAttribute(
      'href',
      '/profil',
    );
    expect(within(desktop()).getByRole('link', { name: 'Kontak' })).toHaveAttribute(
      'href',
      '/kontak',
    );
  });
});

describe('tombol utama navigasi', () => {
  it('menampilkan SOP Permohonan SK, bukan tombol Masuk', () => {
    render(<NavigasiPublik />);
    expect(within(desktop()).getByRole('link', { name: 'SOP Permohonan SK' })).toHaveAttribute(
      'href',
      '/permohonan-sk',
    );
    expect(screen.queryByRole('link', { name: 'Masuk' })).toBeNull();
  });
});
