import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { BukaFooter } from './buka-footer';

afterEach(cleanup);
describe('BukaFooter', () => {
  it('membuka dan menutup konten melalui tombol dengan status aksesibilitas yang sesuai', () => {
    render(<BukaFooter label="Jam operasional"><p>Senin sampai Jumat</p><a href="/kontak">Kontak</a></BukaFooter>);
    const button = screen.getByRole('button', { name: 'Jam operasional' });
    const panel = document.getElementById(button.getAttribute('aria-controls')!)!;
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(panel).toHaveAttribute('inert');
    expect(panel).toHaveAttribute('aria-hidden', 'true');
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('region', { name: 'Jam operasional' })).toBe(panel);
    expect(panel).not.toHaveAttribute('inert');
    fireEvent.click(button);
    expect(panel).toHaveAttribute('aria-hidden', 'true');
    expect(panel).toHaveAttribute('inert');
    // Konten tetap terpasang selama penutupan, sehingga animasi tidak terputus.
    expect(screen.getByText('Senin sampai Jumat')).toBeInTheDocument();
  });
  it('setiap panel berdiri sendiri dan klik cepat tidak meninggalkan state yang macet', () => {
    render(<><BukaFooter label="Jam operasional">Jadwal</BukaFooter><BukaFooter label="Kunjungan portal">Angka</BukaFooter></>);
    const jam = screen.getByRole('button', { name: 'Jam operasional' });
    const kunjungan = screen.getByRole('button', { name: 'Kunjungan portal' });
    for (let i = 0; i < 5; i++) fireEvent.click(jam);
    expect(jam).toHaveAttribute('aria-expanded', 'true');
    expect(kunjungan).toHaveAttribute('aria-expanded', 'false');
    expect(jam.getAttribute('aria-controls')).not.toBe(kunjungan.getAttribute('aria-controls'));
  });
});
