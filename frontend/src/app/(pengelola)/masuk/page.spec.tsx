import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MasukPage from './page';

const sesi = vi.hoisted(() => ({
  state: 'authenticated',
  pengguna: { peran: ['ADMIN'] } as { peran: string[] } | undefined,
  replace: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: sesi.replace }) }));
vi.mock('@/lib/sesi', () => ({ useSession: () => sesi }));

afterEach(() => {
  cleanup();
  sesi.replace.mockClear();
});

describe('tujuan halaman masuk mengikuti peran sesi', () => {
  it.each([
    [['ADMIN'], '/admin'],
    [['SUPERADMIN'], '/superadmin'],
    [['ADMIN', 'SUPERADMIN'], '/superadmin'],
    [['DOSEN_STAF'], '/akun'],
  ])('mengalihkan %j ke %s', (peran, tujuan) => {
    sesi.state = 'authenticated';
    sesi.pengguna = { peran: peran as string[] };

    render(<MasukPage />);

    expect(sesi.replace).toHaveBeenCalledWith(tujuan);
  });
  it('pengunjung mendapat formulir email/password, tautan daftar dan Google khusus ITH', () => {
    sesi.state = 'anonymous';
    sesi.pengguna = undefined;
    render(<MasukPage />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Daftar akun' })).toHaveAttribute('href', '/daftar');
    expect(screen.getByRole('link', { name: 'Masuk dengan Google' })).toHaveAttribute(
      'href',
      '/api/v1/auth/google',
    );
    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Superadmin' })).not.toBeInTheDocument();
    expect(screen.getByText('Masuk dengan Google khusus akun @ith.ac.id.')).toBeInTheDocument();
  });
});
