import { describe, expect, it } from 'vitest';

import { cn } from './cn';

describe('cn', () => {
  it('menggabungkan beberapa kelas', () => {
    expect(cn('px-2', 'text-sm')).toBe('px-2 text-sm');
  });

  it('membuang nilai bohong', () => {
    expect(cn('px-2', false && 'hidden', undefined, null, '')).toBe('px-2');
  });

  it('menerima objek dan array bersyarat', () => {
    expect(cn(['px-2', 'py-1'], { 'font-bold': true, italic: false })).toBe('px-2 py-1 font-bold');
  });

  it('menyelesaikan pertentangan: kelas terakhir yang menang', () => {
    // Inilah alasan twMerge dipakai. Tanpa itu, kedua kelas ikut terpasang dan
    // pemenangnya ditentukan urutan pada berkas CSS, bukan urutan penulisan.
    expect(cn('px-2', 'px-4')).toBe('px-4');
    expect(cn('text-slate-500', 'text-institusi-700')).toBe('text-institusi-700');
  });

  it('tidak mencampuradukkan properti yang berbeda', () => {
    expect(cn('px-2', 'py-4')).toBe('px-2 py-4');
  });
});
