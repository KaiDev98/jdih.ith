import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminShell } from './admin-shell';

const state = vi.hoisted(() => ({ pathname: '/admin/kategori', peran: ['ADMIN'], replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  usePathname: () => state.pathname,
  useSearchParams: () => new URLSearchParams('q=contoh'),
  useRouter: () => ({ replace: state.replace }),
}));
vi.mock('@/lib/sesi', () => ({ useSession: () => ({ state: 'authenticated', pengguna: { status: 'AKTIF', peran: state.peran, izin: ['documents.read_admin'] } }) }));
vi.mock('./admin/header-admin', () => ({ HeaderAdmin: () => null }));
vi.mock('./admin/sidebar-admin', () => ({ SidebarAdmin: () => null }));
vi.mock('./admin/palet-perintah', () => ({ PaletPerintah: () => null }));
vi.mock('./admin/pasang-nonce', () => ({ PasangNonce: () => null }));
vi.mock('./admin/hitungan-nav', () => ({ useHitunganNav: () => ({}), useSidebarCiut: () => [false, vi.fn()] }));
afterEach(() => { cleanup(); state.replace.mockClear(); });

describe('akses halaman dan namespace panel', () => {
  for (const peran of ['ADMIN', 'SUPERADMIN']) it(`halaman Audit hanya dapat dibuka Superadmin: ${peran}`, () => {
    state.pathname = peran === 'ADMIN' ? '/admin/audit' : '/superadmin/audit';
    state.peran = [peran];
    render(<AdminShell><p>Riwayat audit khusus</p></AdminShell>);
    if (peran === 'ADMIN') expect(screen.queryByText('Riwayat audit khusus')).not.toBeInTheDocument();
    else expect(screen.getByText('Riwayat audit khusus')).toBeInTheDocument();
  });
  it('mengembalikan area isi ke atas ketika berpindah halaman panel', () => {
    state.pathname = '/admin/format-persuratan'; state.peran = ['ADMIN'];
    const view = render(<AdminShell><p>Halaman pertama</p></AdminShell>);
    const main = screen.getByRole('main');
    main.scrollTop = 600;
    main.scrollLeft = 120;
    state.pathname = '/admin/dokumen';
    view.rerender(<AdminShell><p>Halaman berikutnya</p></AdminShell>);
    expect(main.scrollTop).toBe(0);
    expect(main.scrollLeft).toBe(0);
    expect(screen.getByText('Halaman berikutnya')).toBeInTheDocument();
  });
  it('Format Persuratan Admin tidak diberi pemberitahuan hanya baca', () => {
    state.pathname = '/admin/format-persuratan'; state.peran = ['ADMIN'];
    render(<AdminShell><p>Pengelolaan format</p></AdminShell>);
    expect(screen.getByText('Pengelolaan format')).toBeInTheDocument();
    expect(screen.queryByText(/Perubahan hanya dapat dilakukan oleh Superadmin/)).not.toBeInTheDocument();
  });
  for (const peran of ['ADMIN', 'SUPERADMIN']) it(`akses halaman SOP mengikuti peran ${peran}`, () => {
    state.pathname = peran === 'ADMIN' ? '/admin/sop-permohonan-sk' : '/superadmin/sop-permohonan-sk';
    state.peran = [peran];
    render(<AdminShell><p>Pengelolaan SOP</p></AdminShell>);
    expect(screen.getByText('Pengelolaan SOP')).toBeInTheDocument();
    expect(screen.queryByText('Akses panel tidak tersedia')).not.toBeInTheDocument();
  });
  it('halaman kategori dapat dibuka Admin dan diberi penjelasan hanya baca', () => {
    state.pathname = '/admin/kategori'; state.peran = ['ADMIN'];
    render(<AdminShell><p>Informasi kategori</p></AdminShell>);
    expect(screen.getByText('Informasi kategori')).toBeInTheDocument();
    expect(screen.getByText(/Perubahan hanya dapat dilakukan oleh Superadmin/)).toBeInTheDocument();
  });
  for (const [role, from, to] of [
    ['SUPERADMIN', '/admin/kategori', '/superadmin/kategori'],
    ['ADMIN', '/superadmin/kategori', '/admin/kategori'],
  ]) it(`mengoreksi prefix panel untuk ${role} tanpa kehilangan query`, async () => {
    state.pathname = from!; state.peran = [role!];
    render(<AdminShell><p>Informasi kategori</p></AdminShell>);
    await waitFor(() => expect(state.replace).toHaveBeenCalledWith(`${to}?q=contoh`));
    expect(screen.queryByText('Informasi kategori')).not.toBeInTheDocument();
  });
});
