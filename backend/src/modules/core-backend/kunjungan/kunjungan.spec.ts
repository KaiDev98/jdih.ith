import { describe, expect, it, vi } from 'vitest';
import { bukanManusia, KunjunganController } from './kunjungan.controller.js';
import { KunjunganService, tanggalWita } from './kunjungan.service.js';

describe('tanggalWita', () => {
  it('memakai tanggal Parepare (UTC+8), bukan UTC', () => {
    // 23.30 UTC tanggal 5 = 07.30 WITA tanggal 6.
    expect(tanggalWita(new Date('2026-10-05T23:30:00Z'))).toBe('2026-10-06');
    expect(tanggalWita(new Date('2026-10-05T15:59:00Z'))).toBe('2026-10-05');
  });
});

describe('KunjunganService', () => {
  it('menaikkan jumlah hari ini dan meringkas hari, bulan, tahun, total', async () => {
    const sql: { sql: string; values: unknown[] }[] = [];
    const repo = {
      pool: {},
      write: vi.fn((_db: unknown, q: string, values: unknown[]) => {
        sql.push({ sql: q, values });
        return Promise.resolve({});
      }),
      rows: vi.fn((_db: unknown, q: string, values: unknown[]) => {
        sql.push({ sql: q, values });
        return Promise.resolve([
          { hariIni: '109', bulanIni: '13467', tahunIni: '37384', total: '156482' },
        ]);
      }),
    };
    const service = new KunjunganService(repo as never);
    const waktu = new Date('2026-10-06T02:00:00Z');
    await service.catat(waktu);
    expect(sql[0]!.sql).toContain('ON DUPLICATE KEY UPDATE jumlah=jumlah+1');
    expect(sql[0]!.values).toEqual(['2026-10-06']);
    await expect(service.ringkasan(waktu)).resolves.toEqual({
      hariIni: 109,
      bulanIni: 13467,
      tahunIni: 37384,
      total: 156482,
    });
    expect(sql[1]!.values).toEqual(['2026-10-06', '2026-10-01', '2026-01-01', '2026-10-06']);
  });

  it('mengembalikan nol saat belum ada kunjungan', async () => {
    const repo = {
      pool: {},
      rows: vi.fn(() =>
        Promise.resolve([{ hariIni: null, bulanIni: null, tahunIni: null, total: null }]),
      ),
    };
    await expect(new KunjunganService(repo as never).ringkasan()).resolves.toEqual({
      hariIni: 0,
      bulanIni: 0,
      tahunIni: 0,
      total: 0,
    });
  });
});

describe('KunjunganController.catat', () => {
  const ringkasan = { hariIni: 1, bulanIni: 1, tahunIni: 1, total: 1 };
  function siapkan(kuki?: string) {
    const service = {
      catat: vi.fn(() => Promise.resolve()),
      ringkasan: vi.fn(() => Promise.resolve(ringkasan)),
    };
    const config = { get: vi.fn(() => false) };
    const res = { setHeader: vi.fn(), cookie: vi.fn() };
    const req = {
      cookies: kuki ? { jdih_kunjungan: kuki } : {},
      get: () => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/141.0 Safari/537.36',
    };
    const controller = new KunjunganController(service as never, config as never);
    return { controller, service, res, req };
  }

  it('menghitung peramban yang belum tercatat hari ini lalu memasang kuki', async () => {
    const { controller, service, res, req } = siapkan();
    await expect(controller.catat(req as never, res as never)).resolves.toEqual(ringkasan);
    expect(service.catat).toHaveBeenCalledTimes(1);
    expect(res.cookie).toHaveBeenCalledWith(
      'jdih_kunjungan',
      tanggalWita(new Date()),
      expect.objectContaining({ httpOnly: true }),
    );
  });

  it('tidak menghitung ulang peramban yang sudah tercatat hari ini', async () => {
    const { controller, service, res, req } = siapkan(tanggalWita(new Date()));
    await controller.catat(req as never, res as never);
    expect(service.catat).not.toHaveBeenCalled();
    expect(res.cookie).not.toHaveBeenCalled();
  });
});

describe('bukanManusia', () => {
  it('mengenali bot, perayap, dan peramban otomatis', () => {
    for (const agen of [
      'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'Mozilla/5.0 (X11; Linux x86_64) HeadlessChrome/141.0 Safari/537.36',
      'curl/8.4.0',
      'facebookexternalhit/1.1',
      'Mozilla/5.0 (Linux; Android 11; moto g power (2022)) Chrome-Lighthouse',
      undefined,
    ])
      expect(bukanManusia(agen)).toBe(true);
  });

  it('menghitung peramban manusia biasa', () => {
    for (const agen of [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0',
    ])
      expect(bukanManusia(agen)).toBe(false);
  });
});
