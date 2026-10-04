import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AdminShell } from './admin-shell';

const session = vi.hoisted(() => ({ state: 'authenticated', pengguna: { id: '7', nama: 'Dosen', surel: 'dosen@ith.ac.id', status: 'MENUNGGU_VERIFIKASI', unitKerjaId: null, unitManual: null, peran: ['DOSEN_STAF'], izin: [], avatarUrl: null }, csrfToken: null, muatUlang: vi.fn() }));
vi.mock('@/lib/sesi', () => ({ useSession: () => session, csrfHeaders: () => ({}) }));
vi.mock('next/navigation', () => ({ usePathname: () => '/admin', useRouter: () => ({ replace: vi.fn() }) }));

describe('AdminShell account eligibility', () => {
  it('does not treat pending DOSEN_STAF as Internal eligible or show the admin panel', () => {
    render(<AdminShell><p>Panel content</p></AdminShell>);
    expect(screen.getByText(/MENUNGGU_VERIFIKASI belum memiliki akses Internal/)).toBeInTheDocument();
    expect(screen.queryByText('Panel content')).not.toBeInTheDocument();
  });
});
