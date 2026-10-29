import { describe, expect, it } from 'vitest';
import { namaSapaan, salamWaktu, waktuRelatif } from './waktu';

describe('waktu panel', () => {
  const sekarang = new Date('2026-10-16T04:00:00Z'); // 12.00 WITA

  it('menyapa sesuai jam WITA', () => {
    expect(salamWaktu(new Date('2026-10-16T00:30:00Z'))).toBe('Selamat pagi'); // 08.30
    expect(salamWaktu(sekarang)).toBe('Selamat siang');
    expect(salamWaktu(new Date('2026-10-16T08:00:00Z'))).toBe('Selamat sore'); // 16.00
    expect(salamWaktu(new Date('2026-10-16T12:00:00Z'))).toBe('Selamat malam'); // 20.00
  });

  it('memakai nama depan, termasuk gelar singkat', () => {
    expect(namaSapaan('Andi Rahman')).toBe('Andi');
    expect(namaSapaan('Dr. Hasnah Yusuf')).toBe('Dr. Hasnah');
    expect(namaSapaan('  ')).toBe('');
  });

  it('menulis waktu relatif yang mudah dibaca', () => {
    expect(waktuRelatif('2026-10-16T03:59:30Z', sekarang)).toBe('baru saja');
    expect(waktuRelatif('2026-10-16T03:55:00Z', sekarang)).toBe('5 menit lalu');
    expect(waktuRelatif('2026-10-16T01:00:00Z', sekarang)).toBe('3 jam lalu');
    expect(waktuRelatif('2026-10-15T03:00:00Z', sekarang)).toBe('kemarin');
    expect(waktuRelatif('2026-10-12T04:00:00Z', sekarang)).toBe('4 hari lalu');
    expect(waktuRelatif('2026-09-01T04:00:00Z', sekarang)).toMatch(/2026/);
    expect(waktuRelatif(null, sekarang)).toBe('');
    // Format basis data: UTC tanpa penanda zona.
    expect(waktuRelatif('2026-10-16 02:00:00.123456', sekarang)).toBe('2 jam lalu');
  });
});
