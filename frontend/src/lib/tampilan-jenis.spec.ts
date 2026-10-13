import { describe, expect, it } from 'vitest';
import { macamJenis } from './tampilan-jenis';

describe('macamJenis', () => {
  it('mengenali kode bawaan maupun kode yang diubah Superadmin', () => {
    expect(macamJenis('PERREK')).toBe('peraturan');
    expect(macamJenis('PR')).toBe('peraturan');
    expect(macamJenis('SK')).toBe('keputusan');
    expect(macamJenis('EDREK')).toBe('edaran');
  });

  it('memakai nama jenis bila kodenya tidak dikenal', () => {
    expect(macamJenis('X1', 'Peraturan Rektor')).toBe('peraturan');
    expect(macamJenis('X2', 'Keputusan Rektor')).toBe('keputusan');
    expect(macamJenis('X3', 'SK Rektor')).toBe('keputusan');
    expect(macamJenis('X4', 'Instruksi Rektor')).toBe('instruksi');
    expect(macamJenis('X5', 'Surat Edaran Rektor')).toBe('edaran');
    expect(macamJenis('X6', 'Standar Operasional Prosedur')).toBe('sop');
    expect(macamJenis('X7', 'Pedoman')).toBeUndefined();
  });

  it('membedakan produk Senat dari produk Rektor', () => {
    expect(macamJenis('PERSEN')).toBe('peraturan-senat');
    expect(macamJenis('SKSEN')).toBe('keputusan-senat');
    expect(macamJenis('PS1', 'Peraturan Senat')).toBe('peraturan-senat');
    expect(macamJenis('KS1', 'SK Senat')).toBe('keputusan-senat');
    expect(macamJenis('KS2', 'Keputusan Senat Akademik')).toBe('keputusan-senat');
    expect(macamJenis('PR2', 'Peraturan Rektor')).toBe('peraturan');
  });
});
