import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PemilihKoleksiDokumen } from './pemilih-koleksi-dokumen';

afterEach(cleanup);
describe('menu penyaring koleksi', () => {
  it('membuka dengan keyboard, menandai pilihan aktif dan menutup dengan Escape', async () => {
    const onValueChange = vi.fn();
    render(<PemilihKoleksiDokumen value="SOP" onValueChange={onValueChange} superadmin={false} />);
    const trigger = screen.getByRole('button', { name: 'Jenis koleksi: SOP' });
    trigger.focus();
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    const menu = await screen.findByRole('menu');
    expect(screen.getByRole('menuitemradio', { name: 'SOP' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(
      screen.queryByRole('menuitemradio', { name: 'SOP Permohonan SK' }),
    ).not.toBeInTheDocument();
    fireEvent.keyDown(menu, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(onValueChange).not.toHaveBeenCalled();
  });
  it('mengirim koleksi yang dipilih sekali dan menyediakan SOP khusus Superadmin', async () => {
    const onValueChange = vi.fn();
    render(<PemilihKoleksiDokumen value="" onValueChange={onValueChange} superadmin />);
    fireEvent.keyDown(screen.getByRole('button', { name: /^Jenis koleksi:/ }), { key: 'Enter' });
    fireEvent.click(await screen.findByRole('menuitemradio', { name: 'SOP Permohonan SK' }));
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith('PERMOHONAN_SK');
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });
});
