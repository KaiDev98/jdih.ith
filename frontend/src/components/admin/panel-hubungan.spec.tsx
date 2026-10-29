import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PanelHubungan } from './panel-hubungan';

const state = vi.hoisted(() => ({ daftar: vi.fn().mockResolvedValue({ data: [] }) }));
vi.mock('@/lib/api-client', () => ({ ambilApiBerdaftar: state.daftar }));
vi.mock('@/lib/sesi', () => ({ useSession: () => ({ pengguna: { peran: ['ADMIN'] } }) }));
afterEach(() => { cleanup(); state.daftar.mockClear(); });

describe('pemilihan peraturan milik Admin', () => {
  it('memakai endpoint target yang memeriksa kepemilikan dan menjelaskan batas akses', async () => {
    render(<PanelHubungan onUbah={vi.fn()} />);
    expect(screen.getByText(/Hanya dokumen dan versi terbit milik Anda sendiri/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Pilih peraturan' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Cari peraturan yang diubah atau dicabut' }), { target: { value: 'SK' } });
    await waitFor(() => expect(state.daftar).toHaveBeenCalledWith('/admin/documents/relation-targets', expect.objectContaining({ kueri: expect.objectContaining({ q: 'SK' }) })));
  });
});
