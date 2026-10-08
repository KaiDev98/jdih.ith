import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { DocumentPolicyService } from '../../identity/document-policy.service.js';
import { tanggalWita } from '../kunjungan/kunjungan.service.js';
import { StatistikDokumenService } from './statistik-dokumen.service.js';

function siapkan(dokumen: Record<string, unknown> | null = { id: '5', tingkat_akses: 'publik' }) {
  const tulis: unknown[][] = [];
  const repo = {
    pool: {},
    rows: vi.fn(() => Promise.resolve(dokumen ? [dokumen] : [])),
    write: vi.fn((_db: unknown, _sql: string, values: unknown[]) => {
      tulis.push(values);
      return Promise.resolve({});
    }),
  };
  const service = new StatistikDokumenService(repo as never, new DocumentPolicyService());
  return { service, repo, tulis };
}

const permintaan = (cookies: Record<string, string> = {}) => ({ cookies }) as never;
function respons() {
  const kuki: Record<string, string> = {};
  return { kuki, res: { cookie: (n: string, v: string) => (kuki[n] = v) } as never };
}

describe('StatistikDokumenService', () => {
  it('menghitung satu peramban sekali per dokumen per hari', async () => {
    const { service, tulis } = siapkan();
    const pertama = respons();
    expect(await service.catatSekali(permintaan(), pertama.res, '5', 'lihat', false)).toBe(true);
    const nilai = pertama.kuki.jdih_lihat;
    expect(nilai).toBe(`${tanggalWita(new Date())}|5`);
    // Kunjungan ulang di hari yang sama dengan kuki yang sama tidak dihitung.
    const kedua = respons();
    expect(
      await service.catatSekali(permintaan({ jdih_lihat: nilai! }), kedua.res, '5', 'lihat', false),
    ).toBe(false);
    // Dokumen lain tetap dihitung dan ditambahkan ke daftar.
    const ketiga = respons();
    expect(
      await service.catatSekali(
        permintaan({ jdih_lihat: nilai! }),
        ketiga.res,
        '9',
        'lihat',
        false,
      ),
    ).toBe(true);
    expect(ketiga.kuki.jdih_lihat).toBe(`${tanggalWita(new Date())}|5.9`);
    expect(tulis).toEqual([['5'], ['9']]);
  });

  it('kuki dari hari sebelumnya tidak mencegah hitungan baru', async () => {
    const { service } = siapkan();
    const r = respons();
    expect(
      await service.catatSekali(
        permintaan({ jdih_unduh: '2000-01-01|5' }),
        r.res,
        '5',
        'unduh',
        false,
      ),
    ).toBe(true);
  });

  it('dokumen Internal tidak ditemukan bagi pengunjung anonim', async () => {
    const { service } = siapkan({ id: '7', tingkat_akses: 'internal' });
    await expect(service.dokumenTerbaca('internal', undefined)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
