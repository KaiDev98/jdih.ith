import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import DasborAdmin from './page';

/**
 * Uji asap dasbor administrasi.
 *
 * Nilainya bukan pada memeriksa tata letak, melainkan membuktikan satu rangkaian
 * utuh benar-benar tersambung: berkas TSX dikompilasi, React dirender pada jsdom,
 * dan nilai dari paket @jdih/shared — yang diturunkan dari berkas seed SQL —
 * benar-benar terbaca di sisi peramban. Bila salah satu mata rantai itu putus,
 * uji ini gagal lebih dahulu sebelum masalahnya sampai ke peramban sungguhan.
 */
describe('DasborAdmin', () => {
  it('merender judul halaman', () => {
    render(<DasborAdmin />);
    expect(screen.getByRole('heading', { level: 1, name: 'Dasbor' })).toBeInTheDocument();
  });

  it('menampilkan jumlah izin dan peran dari paket kontrak bersama', () => {
    render(<DasborAdmin />);

    // Pencarian dilingkupi ke kartunya masing-masing. Mencari teks "4" begitu saja
    // akan bertabrakan dengan kolom Tingkat pada tabel peran di bawahnya.
    const kartu = (label: string) => screen.getByText(label).closest('div');

    // Nilai yang sama dengan database/jdih_ith_seed.sql: 4 peran, 76 izin,
    // 27 di antaranya berdampak tinggi.
    expect(kartu('Peran sistem')).toHaveTextContent('4');
    expect(kartu('Kode izin')).toHaveTextContent('76');
    expect(kartu('Izin berdampak tinggi')).toHaveTextContent('27');
  });

  it('mencantumkan keempat peran sistem beserta kodenya', () => {
    render(<DasborAdmin />);

    for (const nama of ['Superadmin', 'Admin', 'Dosen/Staf', 'Pengunjung Publik']) {
      expect(screen.getByText(nama)).toBeInTheDocument();
    }
    for (const kode of ['superadmin', 'admin', 'dosen_staf', 'pengunjung']) {
      expect(screen.getByText(kode)).toBeInTheDocument();
    }
  });

  it('menandai Superadmin sebagai wajib 2FA dan tanpa batas unit', () => {
    render(<DasborAdmin />);

    const baris = screen.getByText('Superadmin').closest('tr');
    expect(baris).not.toBeNull();
    expect(baris).toHaveTextContent('Wajib');
    expect(baris).toHaveTextContent('Tanpa batas unit');
  });

  it('menandai Admin sebagai dibatasi cakupan unit kerja', () => {
    render(<DasborAdmin />);

    const baris = screen.getByText('admin').closest('tr');
    expect(baris).toHaveTextContent('Dibatasi unit kerja');
  });
});
