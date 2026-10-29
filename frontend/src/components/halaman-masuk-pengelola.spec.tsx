import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HalamanMasukPengelola } from './halaman-masuk-pengelola';

const sesi = vi.hoisted(() => ({
  state: 'authenticated',
  pengguna: { peran: ['ADMIN'] },
  replace: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: sesi.replace }) }));
vi.mock('@/lib/sesi', () => ({ useSession: () => sesi }));
vi.mock('./form-masuk-password', () => ({
  FormMasukPassword: ({ jalur }: { jalur: string }) => <form aria-label={`Login ${jalur}`} />,
}));

afterEach(() => {
  cleanup();
  sesi.replace.mockClear();
});

describe('halaman masuk per peran pengelola', () => {
  it.each([
    ['ADMIN', 'superadmin'],
    ['SUPERADMIN', 'admin'],
  ] as const)('sesi %s tetap dapat membuka login %s', (peran, jalur) => {
    sesi.state = 'authenticated';
    sesi.pengguna.peran = [peran];

    render(<HalamanMasukPengelola jalur={jalur} />);

    expect(screen.getByRole('form', { name: `Login ${jalur}` })).toBeInTheDocument();
    expect(sesi.replace).not.toHaveBeenCalled();
  });

  it.each([
    ['ADMIN', 'admin'],
    ['SUPERADMIN', 'superadmin'],
  ] as const)('sesi %s pada login sendiri membuka panel %s', (peran, jalur) => {
    sesi.state = 'authenticated';
    sesi.pengguna.peran = [peran];

    render(<HalamanMasukPengelola jalur={jalur} />);

    expect(sesi.replace).toHaveBeenCalledWith(`/${jalur}`);
  });

  it('menunggu sesi selesai sebelum mengalihkan halaman', () => {
    sesi.state = 'loading';
    sesi.pengguna.peran = ['SUPERADMIN'];
    const view = render(<HalamanMasukPengelola jalur="superadmin" />);
    expect(sesi.replace).not.toHaveBeenCalled();

    sesi.state = 'authenticated';
    view.rerender(<HalamanMasukPengelola jalur="superadmin" />);
    expect(sesi.replace).toHaveBeenCalledWith('/superadmin');
  });
});
