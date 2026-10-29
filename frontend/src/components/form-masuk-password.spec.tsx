import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FormMasukPassword } from './form-masuk-password';

const state = vi.hoisted(() => ({ api: vi.fn(), replace: vi.fn(), muatUlang: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: state.replace }) }));
vi.mock('@/lib/sesi', () => ({ useSession: () => ({ muatUlang: state.muatUlang }) }));
vi.mock('@/lib/api-client', async (original) => ({
  ...(await original<object>()),
  ambilApi: state.api,
}));
beforeEach(() => {
  state.api.mockReset().mockResolvedValue({});
  state.replace.mockReset();
  state.muatUlang.mockReset().mockResolvedValue(undefined);
});
afterEach(cleanup);
describe('pengalaman formulir login pengelola', () => {
  it('tombol tampilkan password tidak mengirim formulir dan galat terhubung ke isian', async () => {
    render(<FormMasukPassword jalur="admin" />);
    fireEvent.click(screen.getByRole('button', { name: 'Tampilkan password' }));
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text');
    expect(state.api).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Masuk' }));
    await screen.findByText('Masukkan alamat email yang valid.');
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-describedby', 'galat-email');
    expect(screen.getByLabelText('Password')).toHaveAttribute('aria-describedby', 'galat-password');
    expect(state.api).not.toHaveBeenCalled();
  });
  it.each(['admin', 'superadmin', 'staff'] as const)(
    'jalur %s tetap menggunakan endpoint dan tujuan peran yang benar',
    async (jalur) => {
      let selesai!: () => void;
      state.api.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            selesai = resolve;
          }),
      );
      render(<FormMasukPassword jalur={jalur} />);
      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'akun@ith.ac.id' } });
      fireEvent.change(screen.getByLabelText('Password'), {
        target: { value: 'uji-password-123' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Masuk' }));
      expect(await screen.findByRole('button', { name: 'Memeriksa…' })).toBeDisabled();
      expect(state.api).toHaveBeenCalledWith(
        jalur === 'staff' ? '/auth/login/staff' : jalur === 'admin' ? '/auth/login' : '/auth/login/superadmin',
        expect.objectContaining({ method: 'POST' }),
      );
      selesai();
      await waitFor(() => expect(state.replace).toHaveBeenCalledWith(jalur === 'staff' ? '/akun' : '/' + jalur));
      expect(state.muatUlang).toHaveBeenCalledOnce();
    },
  );
});
