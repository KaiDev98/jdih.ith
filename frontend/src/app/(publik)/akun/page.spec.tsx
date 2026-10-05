import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { state, replace, ambilApi } = vi.hoisted(() => ({
  state: { current: {} as Record<string, unknown> },
  replace: vi.fn(),
  ambilApi: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));
vi.mock('@/lib/sesi', () => ({ useSession: () => state.current }));
vi.mock('@/lib/api-client', () => ({
  ambilApi,
  GalatApi: class GalatApi extends Error {
    status = 500;
  },
}));

import AkunPage from './page';

const penggunaAktif = {
  id: 'pengguna-1',
  nama: 'Pengguna Uji',
  surel: 'pengguna@ith.ac.id',
  status: 'AKTIF',
  unitManual: null,
  unitKerjaId: null,
};

describe('heading hierarchy on the account page', () => {
  beforeEach(() => {
    ambilApi.mockResolvedValue([]);
    replace.mockReset();
  });

  afterEach(() => cleanup());

  it.each([
    ['loading', { state: 'loading' }],
    ['error', { state: 'error', galat: 'Coba lagi.' }],
    ['anonymous fallback', { state: 'anonymous' }],
    ['registration', { state: 'registration' }],
    ['pending account', { state: 'authenticated', pengguna: { ...penggunaAktif, status: 'MENUNGGU_VERIFIKASI' } }],
    ['active account', { state: 'authenticated', pengguna: penggunaAktif }],
  ])('%s has exactly one level-one heading', (_label, value) => {
    state.current = { csrfToken: null, muatUlang: vi.fn(), ...value };

    render(<AkunPage />);

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });
});
