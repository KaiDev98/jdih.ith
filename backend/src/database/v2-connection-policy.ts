/** Cocokkan server dan database aktual dengan konfigurasi yang sudah divalidasi. */
export function koneksiV2Sah(version: unknown, actual: unknown, expected: string, production: boolean) {
  const allowed = production ? expected === 'jdih_ith_v2_prod' : /^jdih_ith_v2_(dev|test[a-z0-9_]*)$/.test(expected);
  return String(version).startsWith('8.4.') && actual === expected && allowed;
}
