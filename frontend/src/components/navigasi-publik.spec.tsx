import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NavigasiPublik } from './navigasi-publik';

const desktop = () => screen.getByRole('navigation', { name: 'Navigasi utama' });

describe('menu Produk Hukum', () => {
  it('Produk Hukum adalah tombol dropdown, bukan tautan ke halaman', () => {
    render(<NavigasiPublik />);
    const tombol = within(desktop()).getByRole('button', { name: 'Produk Hukum' });
    expect(tombol).toHaveAttribute('aria-expanded', 'false');
    expect(within(desktop()).queryByRole('link', { name: 'Produk Hukum' })).toBeNull();
  });

  it('menampilkan Peraturan Rektor, SK Rektor, Instruksi Rektor, Surat Edaran, dan SOP saat ditekan', () => {
    render(<NavigasiPublik />);
    fireEvent.click(within(desktop()).getByRole('button', { name: 'Produk Hukum' }));
    expect(within(desktop()).getByRole('link', { name: 'Peraturan Rektor' })).toHaveAttribute(
      'href',
      '/produk-hukum?jenis=PERREK',
    );
    expect(within(desktop()).getByRole('link', { name: 'SK Rektor' })).toHaveAttribute(
      'href',
      '/produk-hukum?jenis=SKREK',
    );
    expect(within(desktop()).getByRole('link', { name: 'Instruksi Rektor' })).toHaveAttribute(
      'href',
      '/produk-hukum?jenis=INSREK',
    );
    expect(within(desktop()).getByRole('link', { name: 'Surat Edaran' })).toHaveAttribute(
      'href',
      '/produk-hukum?jenis=SEREK',
    );
    // SOP sendiri juga dropdown, bukan tautan.
    expect(within(desktop()).getByRole('button', { name: 'SOP' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(within(desktop()).queryByRole('link', { name: 'SOP' })).toBeNull();
  });

  it('SOP membuka sembilan sub-menu unit', () => {
    render(<NavigasiPublik />);
    fireEvent.click(within(desktop()).getByRole('button', { name: 'Produk Hukum' }));
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
      ['LPPM', 'SOP-LPPM'],
    ];
    for (const [label, kode] of harapan)
      expect(within(desktop()).getByRole('link', { name: label })).toHaveAttribute(
        'href',
        `/produk-hukum?jenis=SOP&kategori=${kode}`,
      );
  });

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
