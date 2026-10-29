/**
 * Slug URL: huruf kecil, angka, dan tanda hubung saja (sesuai skemaSlug di
 * packages/shared). Dipakai untuk mengisi slug otomatis dari judul atau nama.
 */
export function jadikanSlug(teks: string, panjang = 160) {
  return teks
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, panjang)
    .replace(/-+$/g, '');
}

/**
 * Merapikan slug yang diketik manual: karakter lain menjadi tanda hubung.
 * Tanda hubung di ujung dibiarkan selama mengetik dan dibuang saat dikirim.
 */
export function rapikanSlugKetik(teks: string) {
  return teks
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-/, '');
}
