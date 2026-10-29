import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ api: vi.fn(), list: vi.fn() }));
vi.mock('next/headers', () => ({ cookies: async () => ({ getAll: () => [{ name: 'jdih_session', value: 'private-user' }] }) }));
vi.mock('./api-client', () => ({ ambilApi: state.api, ambilApiBerdaftar: state.list }));
import { ambilBerdaftarDariPeladen, ambilDariPeladen, ambilPublik } from './api-peladen';
beforeEach(() => { state.api.mockReset().mockResolvedValue({}); state.list.mockReset().mockResolvedValue({}); });
describe('batas cache SSR', () => {
  it('data berizin selalu no-store meskipun pemanggil memasukkan cache', async () => {
    await ambilDariPeladen('/documents/1', { cache: 'force-cache', next: { revalidate: 60 } });
    await ambilBerdaftarDariPeladen('/admin/documents', { cache: 'force-cache', next: { revalidate: 60 } });
    for (const mock of [state.api, state.list]) expect(mock).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ cache: 'no-store', next: undefined, kuki: 'jdih_session=private-user' }));
  });
  it('metadata publik dapat direvalidasi dan tidak meneruskan cookie sesi', async () => {
    await ambilPublik('/public/master/kategori');
    expect(state.api).toHaveBeenCalledWith('/public/master/kategori', { next: { revalidate: 60 } });
    expect(state.api.mock.calls[0]?.[1]).not.toHaveProperty('kuki');
  });
});
