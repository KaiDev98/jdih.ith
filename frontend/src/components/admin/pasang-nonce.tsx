'use client';

import { setNonce } from 'get-nonce';

/**
 * Komponen Radix (dialog, sheet, dropdown) menyisipkan elemen <style> untuk
 * mengunci gulir halaman. CSP portal hanya mengizinkan style ber-nonce, jadi
 * nonce permintaan ini (dibawa skrip Next) diteruskan ke Radix sekali saja.
 */
if (typeof document !== 'undefined') {
  const skrip = document.querySelector<HTMLScriptElement>('script[nonce]');
  if (skrip?.nonce) setNonce(skrip.nonce);
}

export function PasangNonce() {
  return null;
}
