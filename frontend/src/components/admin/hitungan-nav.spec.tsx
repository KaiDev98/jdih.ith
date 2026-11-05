import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useHitunganNav } from './hitungan-nav';
const state = vi.hoisted(() => ({ role: 'SUPERADMIN', list: vi.fn(), api: vi.fn() }));
vi.mock('next/navigation', () => ({ usePathname: () => '/superadmin' }));
vi.mock('@/lib/api-client', () => ({ ambilApiBerdaftar: state.list, ambilApi: state.api }));
vi.mock('@/lib/sesi', () => ({ useSession: () => ({ pengguna: { id: '7', peran: [state.role] } }) }));
const permissions = ['documents.read_admin', 'users.read'];
beforeEach(() => {
  state.role = 'SUPERADMIN';
  state.api.mockReset().mockResolvedValue([]);
  state.list.mockReset().mockImplementation(async (path: string) => ({ meta: { totalButir: path.includes('removal') ? 4 : path.includes('letter-templates') ? 3 : 2 } }));
});
afterEach(cleanup);
describe('verification navigation badge', () => {
  it('counts legal/SOP, format and pending removal queues under the Superadmin route', async () => {
    const { result } = renderHook(() => useHitunganNav(permissions));
    await waitFor(() => expect(result.current['/superadmin/dokumen/verifikasi']).toBe(9));
    expect(state.list).toHaveBeenCalledWith('/admin/removal-requests', { kueri: { status: 'PENDING', halaman: 1, perHalaman: 1 } });
  });
  it('shows removal-only work for Admin and refreshes immediately after workflow and focus', async () => {
    state.role = 'ADMIN';
    let total = 1;
    state.list.mockImplementation(async (path: string) => ({ meta: { totalButir: path.includes('removal') ? total : 0 } }));
    const { result } = renderHook(() => useHitunganNav(permissions));
    await waitFor(() => expect(result.current['/admin/dokumen/verifikasi']).toBe(1));
    total = 2;
    act(() => window.dispatchEvent(new Event('jdih:workflow')));
    await waitFor(() => expect(result.current['/admin/dokumen/verifikasi']).toBe(2));
    total = 0;
    act(() => window.dispatchEvent(new Event('focus')));
    await waitFor(() => expect(result.current['/admin/dokumen/verifikasi']).toBe(0));
  });
  it('omits an incomplete total on failure and recovers when the tab becomes visible', async () => {
    state.list.mockRejectedValueOnce(new Error('Unavailable'));
    const { result } = renderHook(() => useHitunganNav(permissions));
    await waitFor(() => expect(state.api).toHaveBeenCalled());
    expect(result.current['/superadmin/dokumen/verifikasi']).toBeUndefined();
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    await waitFor(() => expect(result.current['/superadmin/dokumen/verifikasi']).toBe(9));
  });
});
