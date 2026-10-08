import { describe, expect, it } from 'vitest';
import { skemaPasswordBaru } from '@jdih/shared';
import { buatPasswordAcak } from './dialog-kelola-admin';

describe('buatPasswordAcak', () => {
  it('selalu memenuhi aturan password dan tidak berulang', () => {
    const hasil = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const p = buatPasswordAcak();
      expect(p).toHaveLength(14);
      expect(skemaPasswordBaru.safeParse(p).success).toBe(true);
      expect(p).not.toMatch(/[0O1lI]/);
      hasil.add(p);
    }
    expect(hasil.size).toBe(200);
  });
});
