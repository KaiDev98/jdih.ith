import { describe, expect, it } from 'vitest';
import { koneksiV2Sah } from './v2-connection-policy.js';
describe('batas lingkungan database V2', () => {
  it('menerima produksi hanya dalam lingkungan produksi dan nama aktual sama', () => {
    expect(koneksiV2Sah('8.4.11', 'jdih_ith_v2_prod', 'jdih_ith_v2_prod', true)).toBe(true);
    expect(koneksiV2Sah('8.4.11', 'jdih_ith_v2_prod', 'jdih_ith_v2_prod', false)).toBe(false);
    expect(koneksiV2Sah('8.4.11', 'jdih_ith_v2_dev', 'jdih_ith_v2_dev', true)).toBe(false);
  });
  it('menolak legacy, server salah dan database yang berbeda', () => {
    expect(koneksiV2Sah('8.4.11', 'jdih_ith_v2_test_load', 'jdih_ith_v2_test_load', false)).toBe(true);
    expect(koneksiV2Sah('8.0.1', 'jdih_ith_v2_dev', 'jdih_ith_v2_dev', false)).toBe(false);
    expect(koneksiV2Sah('8.4.11', 'jdih_ith_v2_prod', 'jdih_ith_v2_dev', false)).toBe(false);
    expect(koneksiV2Sah('8.4.11', 'jdih_ith', 'jdih_ith', false)).toBe(false);
  });
});
