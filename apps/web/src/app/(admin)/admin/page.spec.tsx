import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { IZIN_BERDAMPAK_TINGGI } from '@jdih/shared';

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

    const kartu = (label: string) => screen.getByText(label).closest('div');

    // Seed V2: 3 persisted roles, 23 permissions.
    expect(kartu('Peran sistem')).toHaveTextContent('3');
    expect(kartu('Kode izin')).toHaveTextContent('23');
    expect(kartu('Izin berdampak tinggi')).toHaveTextContent(String(IZIN_BERDAMPAK_TINGGI.length));
  });

  it('mencantumkan ketiga peran sistem beserta kodenya', () => {
    render(<DasborAdmin />);

    for (const nama of ['Superadmin', 'Admin', 'Dosen/Staf']) {
      expect(screen.getByText(nama)).toBeInTheDocument();
    }
    for (const kode of ['SUPERADMIN', 'ADMIN', 'DOSEN_STAF']) {
      expect(screen.getByText(kode)).toBeInTheDocument();
    }
  });

  it('menjelaskan akun Superadmin hanya melalui operations', () => {
    render(<DasborAdmin />);

    const baris = screen.getByText('Superadmin').closest('tr');
    expect(baris).not.toBeNull();
    expect(baris).toHaveTextContent('tidak dapat dibuat atau dipromosikan melalui aplikasi');
  });

  it('menjelaskan verifikator sebagai Admin dengan permission tambahan', () => {
    render(<DasborAdmin />);

    const baris = screen.getByText('ADMIN').closest('tr');
    expect(baris).toHaveTextContent('permission tambahan');
  });
});
