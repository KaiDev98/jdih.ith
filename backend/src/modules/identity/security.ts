import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { skemaIzin, type KodeIzin, type PenggunaAktif, type TingkatAkses } from '@jdih/shared';

export const acak = () => randomBytes(32).toString('base64url');
export const hashToken = (token: string) => createHash('sha256').update(token).digest();
export const tokenValid = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);
export function sama(a: unknown, b: string): boolean {
  if (typeof a !== 'string') return false;
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export const csrfToken = (token: string, key: string) =>
  createHmac('sha256', key)
    .update('csrf:' + token)
    .digest('base64url');
export function cekCsrf(
  origin: unknown,
  header: unknown,
  token: unknown,
  allowed: string,
  key: string,
) {
  if (origin !== allowed || !tokenValid(token) || !sama(header, csrfToken(token, key)))
    throw new ForbiddenException('CSRF tidak sah');
}
export function izinEfektif(
  role: string[],
  overrides: { kode: string; efek: string }[],
): KodeIzin[] {
  const allowed = new Set(role);
  for (const i of overrides) if (i.efek === 'ALLOW') allowed.add(i.kode);
  for (const i of overrides) if (i.efek === 'DENY') allowed.delete(i.kode);
  return [...allowed].filter((k): k is KodeIzin => skemaIzin.safeParse(k).success);
}
export function cekIzin(user: PenggunaAktif | undefined, codes: readonly KodeIzin[], any = false) {
  if (!user) throw new UnauthorizedException();
  if (
    user.status !== 'AKTIF' ||
    !(any ? codes.some((c) => user.izin.includes(c)) : codes.every((c) => user.izin.includes(c)))
  )
    throw new ForbiddenException();
}
export interface ResourceDokumen {
  id: string;
  tingkatAkses: TingkatAkses;
  published: boolean;
  current: boolean;
  deleted: boolean;
}
/** Input resource must come from a trusted repository, never request body. */
export function cekAksesDokumen(resource: ResourceDokumen, user?: PenggunaAktif) {
  if (!resource.published || !resource.current || resource.deleted) throw new NotFoundException();
  if (resource.tingkatAkses === 'publik') return;
  const active = user?.status === 'AKTIF';
  const staff = active && user.peran.includes('DOSEN_STAF');
  const admin = active && user.peran.some((r) => r === 'ADMIN' || r === 'SUPERADMIN');
  // Dibandingkan sebagai string agar nilai di luar tipe tetap jatuh ke penolakan.
  if (String(resource.tingkatAkses) === 'internal') {
    if (staff || (admin && user.izin.includes('documents.read_admin'))) return;
    // 404, bukan 403: jawaban 403 membedakan "ada tetapi tertutup" dari "tidak
    // ada", sehingga keberadaan dokumen Internal dapat ditebak dari luar.
    throw new NotFoundException();
  }
  // Tingkat akses lain (termasuk nilai di luar tipe) selalu ditolak.
  throw new NotFoundException();
}
