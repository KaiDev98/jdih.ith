import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

/**
 * Hash password memakai scrypt bawaan Node (tanpa dependensi tambahan).
 * Format tersimpan: `scrypt$N$r$p$salt$hash` (base64url), sehingga parameter
 * dapat dinaikkan kelak tanpa merusak hash lama.
 */
const PARAMETER = { N: 16384, r: 8, p: 1 } as const;
const PANJANG_KUNCI = 64;

function turunkan(password: string, salt: Buffer, opsi: ScryptOptions) {
  return new Promise<Buffer>((selesai, gagal) =>
    scrypt(
      password.normalize('NFKC'),
      salt,
      PANJANG_KUNCI,
      { ...opsi, maxmem: 64 * 1024 * 1024 },
      (e, kunci) => (e ? gagal(e) : selesai(kunci)),
    ),
  );
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const kunci = await turunkan(password, salt, PARAMETER);
  const { N, r, p } = PARAMETER;
  return `scrypt$${String(N)}$${String(r)}$${String(p)}$${salt.toString('base64url')}$${kunci.toString('base64url')}`;
}

export async function cocokPassword(password: string, tersimpan: string) {
  const bagian = tersimpan.split('$');
  if (bagian.length !== 6 || bagian[0] !== 'scrypt') return false;
  const [, n, r, p, salt, hash] = bagian as [string, string, string, string, string, string];
  const harapan = Buffer.from(hash, 'base64url');
  if (harapan.length !== PANJANG_KUNCI) return false;
  const kunci = await turunkan(password, Buffer.from(salt, 'base64url'), {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });
  return timingSafeEqual(kunci, harapan);
}

/**
 * Hash palsu untuk menyamakan waktu jawab ketika email tidak terdaftar atau
 * belum punya password, agar keberadaan akun tidak dapat ditebak dari waktu.
 */
let hashPalsu: Promise<string> | undefined;
export function samarkanWaktu(password: string) {
  hashPalsu ??= hashPassword(randomBytes(16).toString('hex'));
  return hashPalsu.then((h) => cocokPassword(password, h)).then(() => false);
}
