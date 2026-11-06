import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import PermohonanSk from './page';

const api = vi.hoisted(() => ({ contact: vi.fn(), list: vi.fn() }));
vi.mock('@/lib/api-peladen', () => ({ ambilPublik: api.contact, ambilBerdaftarDariPeladen: api.list }));
vi.mock('@/components/hero-halaman', () => ({ HeroHalaman: () => <h1>SOP Permohonan SK</h1> }));
vi.mock('@/components/koleksi-berkas', () => ({ KoleksiBerkas: () => <div>Daftar SOP</div> }));
beforeEach(() => {
  api.list.mockReset().mockResolvedValue({ data: [], meta: { totalButir: 0 } });
  api.contact.mockReset().mockResolvedValue({ butir: [
    { id: '1', jenis: 'TELEPON', label: 'Telepon', nilai: '+62 853-4088-9059' },
    { id: '2', jenis: 'SUREL', label: 'Email', nilai: 'humas@ith.ac.id' },
    { id: '3', jenis: 'TELEPON', label: 'Alternatif', nilai: '+62 812-1234-5678' },
    { id: '4', jenis: 'SUREL', label: 'Alternatif', nilai: 'lain@ith.ac.id' },
  ] });
});
afterEach(cleanup);

it('bantuan ringkas memakai satu telepon dan email dari data nyata, kontak lainnya melalui halaman kontak', async () => {
  render(await PermohonanSk({ searchParams: Promise.resolve({}) }));
  const panel = screen.getByRole('complementary', { name: 'Bantuan Pengajuan SK' });
  expect(within(panel).getAllByRole('link')).toHaveLength(3);
  expect(within(panel).getByRole('link', { name: 'Telepon: +62 853-4088-9059' })).toHaveAttribute('href', 'tel:+6285340889059');
  expect(within(panel).getByRole('link', { name: 'Email: humas@ith.ac.id' })).toHaveAttribute('href', 'mailto:humas@ith.ac.id');
  expect(within(panel).getByRole('link', { name: 'Kontak Pengelola' })).toHaveAttribute('href', '/kontak');
  expect(within(panel).queryByText('lain@ith.ac.id')).not.toBeInTheDocument();
  expect(within(panel).queryByText(/Tanyakan prosedur/)).not.toBeInTheDocument();
});
it('tanpa kontak yang tersedia, bantuan tidak mengarang nomor atau email', async () => {
  api.contact.mockRejectedValue(new Error('Unavailable'));
  render(await PermohonanSk({ searchParams: Promise.resolve({}) }));
  const panel = screen.getByRole('complementary', { name: 'Bantuan Pengajuan SK' });
  expect(within(panel).getAllByRole('link')).toHaveLength(1);
  expect(within(panel).getByRole('link')).toHaveAttribute('href', '/kontak');
});
