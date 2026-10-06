import { describe, expect, it } from 'vitest';
import { statusLayanan } from './footer-publik';

// WITA = UTC+8. Senin 5 Oktober 2026.
const wita = (tanggal: string, jam: string) => new Date(`${tanggal}T${jam}:00+08:00`);

describe('statusLayanan', () => {
  it('buka pada jam kerja Senin–Kamis', () => {
    expect(statusLayanan(wita('2026-10-05', '09:00'))).toEqual({
      buka: true,
      teks: 'Sedang buka, tutup pukul 16.00 WITA.',
    });
  });

  it('Jumat buka sampai 16.30', () => {
    expect(statusLayanan(wita('2026-10-09', '16:15')).buka).toBe(true);
    expect(statusLayanan(wita('2026-10-09', '16:30')).buka).toBe(false);
  });

  it('sebelum jam buka menyebut buka hari ini', () => {
    expect(statusLayanan(wita('2026-10-06', '06:45')).teks).toBe(
      'Sedang tutup, buka hari ini pukul 07.30 WITA.',
    );
  });

  it('selepas tutup menyebut buka besok', () => {
    expect(statusLayanan(wita('2026-10-08', '16:00')).teks).toBe(
      'Sedang tutup, buka besok pukul 07.30 WITA.',
    );
  });

  it('akhir pekan menyebut buka Senin', () => {
    expect(statusLayanan(wita('2026-10-10', '10:00')).teks).toBe(
      'Sedang tutup, buka Senin pukul 07.30 WITA.',
    );
    expect(statusLayanan(wita('2026-10-11', '10:00')).teks).toBe(
      'Sedang tutup, buka besok pukul 07.30 WITA.',
    );
  });
});
