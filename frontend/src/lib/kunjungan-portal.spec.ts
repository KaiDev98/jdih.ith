import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ambilApi } from './api-client';
import { ambilKunjunganPortal } from './kunjungan-portal';
vi.mock('./api-client', () => ({ ambilApi: vi.fn() }));
const data = { hariIni: 1, bulanIni: 2, tahunIni: 3, total: 4 };
const key = 'jdih:kunjungan-tercatat';
beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-30T15:59:00Z'));
  localStorage.clear();
  vi.stubGlobal('navigator', {});
  vi.mocked(ambilApi).mockResolvedValue(data);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  localStorage.clear();
});
describe('pencatatan kunjungan portal', () => {
  it('permintaan bersamaan hanya mengirim satu POST dan menandai setelah server berhasil', async () => {
    let selesai!: (value: unknown) => void;
    vi.mocked(ambilApi).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          selesai = resolve;
        }),
    );
    const first = ambilKunjunganPortal(),
      second = ambilKunjunganPortal();
    expect(first).toBe(second);
    await Promise.resolve();
    expect(ambilApi).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(key)).toBeNull();
    selesai(data);
    await expect(first).resolves.toEqual(data);
    expect(localStorage.getItem(key)).toBe('2026-10-30');
    await ambilKunjunganPortal();
    expect(ambilApi).toHaveBeenLastCalledWith('/public/visits', { cache: 'no-store' });
  });
  it('pergantian hari WITA mencatat hari baru tanpa menutup tab', async () => {
    await ambilKunjunganPortal();
    vi.setSystemTime(new Date('2026-10-30T16:00:00Z'));
    await ambilKunjunganPortal();
    expect(ambilApi).toHaveBeenCalledTimes(2);
    expect(ambilApi).toHaveBeenLastCalledWith('/public/visits', {
      method: 'POST',
      cache: 'no-store',
    });
    expect(localStorage.getItem(key)).toBe('2026-10-31');
  });
  it('lock antar tab memeriksa ulang penanda sebelum mengirim POST', async () => {
    const request = vi.fn(async (_name: string, action: () => Promise<unknown>) => {
      localStorage.setItem(key, '2026-10-30');
      return action();
    });
    vi.stubGlobal('navigator', { locks: { request } });
    await ambilKunjunganPortal();
    expect(request).toHaveBeenCalledTimes(1);
    expect(ambilApi).toHaveBeenCalledWith('/public/visits', { cache: 'no-store' });
  });
  it('gagal atau respons tidak valid tidak menandai kunjungan dan dapat dicoba lagi', async () => {
    vi.mocked(ambilApi)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ total: 999 });
    await expect(ambilKunjunganPortal()).rejects.toThrow('offline');
    expect(localStorage.getItem(key)).toBeNull();
    await expect(ambilKunjunganPortal()).rejects.toThrow();
    expect(localStorage.getItem(key)).toBeNull();
    await expect(ambilKunjunganPortal()).resolves.toEqual(data);
  });
  it('penyimpanan diblokir tetap memakai respons server dan kukinya', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw Error('blocked');
    });
    await expect(ambilKunjunganPortal()).resolves.toEqual(data);
  });
});
