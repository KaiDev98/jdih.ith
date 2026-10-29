import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TautanPanel from './tautan-panel';
import { HalamanMasukPengelola } from '../halaman-masuk-pengelola';
import { FormMasukPassword } from '../form-masuk-password';

const state = vi.hoisted(() => ({
  peran: ['SUPERADMIN'], authenticated: true, replace: vi.fn(), api: vi.fn().mockResolvedValue({}),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: state.replace }) }));
vi.mock('@/lib/sesi', () => ({ useSession: () => ({ state: state.authenticated ? 'authenticated' : 'anonymous', pengguna: { peran: state.peran }, muatUlang: vi.fn().mockResolvedValue(undefined) }) }));
vi.mock('@/lib/api-client', async (original) => ({ ...(await original<object>()), ambilApi: state.api }));
afterEach(() => { cleanup(); state.replace.mockClear(); state.api.mockClear(); });

describe('alamat panel ketika login dan bernavigasi', () => {
  it('tautan Superadmin mempertahankan namespace dan query; kontrol nonaktif tidak menjadi tautan navigasi', () => {
    state.peran = ['SUPERADMIN'];
    render(<><TautanPanel href="/admin/dokumen/1?versionId=5">Detail</TautanPanel><TautanPanel href="/admin/sop-permohonan-sk/baru" disabled>Unggah SOP</TautanPanel></>);
    expect(screen.getByRole('link', { name: 'Detail' })).toHaveAttribute('href', '/superadmin/dokumen/1?versionId=5');
    expect(screen.getByRole('link', { name: 'Unggah SOP' })).not.toHaveAttribute('href');
  });
  for (const role of ['ADMIN', 'SUPERADMIN']) it(`sesi ${role} langsung diarahkan ke panelnya`, async () => {
    state.authenticated = true;
    state.peran = [role];
    render(<HalamanMasukPengelola jalur={role === 'SUPERADMIN' ? 'superadmin' : 'admin'} />);
    await waitFor(() => expect(state.replace).toHaveBeenCalledWith(role === 'SUPERADMIN' ? '/superadmin' : '/admin'));
  });
  for (const jalur of ['admin', 'superadmin'] as const) it(`login password ${jalur} mengarah ke namespace yang sesuai`, async () => {
    state.authenticated = false;
    render(<FormMasukPassword jalur={jalur} />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'pengelola@ith.ac.id' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password-uji-123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Masuk' }));
    await waitFor(() => expect(state.replace).toHaveBeenCalledWith(`/${jalur}`));
  });
});
