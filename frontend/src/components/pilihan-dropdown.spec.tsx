import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PilihanDropdown } from './pilihan-dropdown';

const opsi = [
  { value: '', label: 'Semua tahun' },
  { value: '2026', label: '2026' },
  { value: '2025', label: '2025' },
];

describe('PilihanDropdown', () => {
  it('menampilkan pilihan terpilih dan membuka daftar saat ditekan', () => {
    render(<PilihanDropdown label="Tahun" opsi={opsi} />);
    const tombol = screen.getByRole('combobox', { name: 'Tahun' });
    expect(tombol).toHaveTextContent('Semua tahun');
    expect(tombol).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('option', { name: '2026' })).toBeNull();
    fireEvent.click(tombol);
    expect(tombol).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('option', { name: 'Semua tahun' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('memilih dengan klik, memanggil onChange, lalu menutup', () => {
    const onChange = vi.fn();
    render(<PilihanDropdown label="Tahun" opsi={opsi} value="" onChange={onChange} />);
    const tombol = screen.getByRole('combobox', { name: 'Tahun' });
    fireEvent.click(tombol);
    fireEvent.click(screen.getByRole('option', { name: '2025' }));
    expect(onChange).toHaveBeenCalledWith('2025');
    expect(tombol).toHaveAttribute('aria-expanded', 'false');
  });

  it('dapat dipakai dengan papan ketik dan mengisi nilai formulir', () => {
    const { container } = render(<PilihanDropdown label="Tahun" name="tahun" opsi={opsi} />);
    const tombol = screen.getByRole('combobox', { name: 'Tahun' });
    fireEvent.keyDown(tombol, { key: 'ArrowDown' });
    expect(tombol).toHaveAttribute('aria-expanded', 'true');
    fireEvent.keyDown(tombol, { key: 'ArrowDown' });
    expect(tombol).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: '2026' }).id,
    );
    fireEvent.keyDown(tombol, { key: 'Enter' });
    expect(tombol).toHaveTextContent('2026');
    expect(container.querySelector('input[name="tahun"]')).toHaveValue('2026');
  });

  it('Escape menutup tanpa mengubah pilihan', () => {
    render(<PilihanDropdown label="Tahun" opsi={opsi} defaultValue="2025" />);
    const tombol = screen.getByRole('combobox', { name: 'Tahun' });
    fireEvent.click(tombol);
    fireEvent.keyDown(tombol, { key: 'ArrowUp' });
    fireEvent.keyDown(tombol, { key: 'Escape' });
    expect(tombol).toHaveAttribute('aria-expanded', 'false');
    expect(tombol).toHaveTextContent('2025');
  });
});
