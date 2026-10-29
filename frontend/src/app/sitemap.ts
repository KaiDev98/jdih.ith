import type { MetadataRoute } from 'next';
import type { HasilCariAnonim } from '@jdih/shared';
import { ambilApiBerdaftar } from '@/lib/api-client';

const urlSitus = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/+$/, '');

/** Diperbarui paling lama tiap jam; dokumen baru tidak perlu muncul seketika di mesin pencari. */
export const revalidate = 3600;

/** Batas pengaman agar sitemap tidak pernah memuat tanpa ujung. */
const HALAMAN_MAKSIMUM = 50;

/**
 * Hanya dokumen yang dapat dibuka pengunjung anonim: permintaan dikirim tanpa
 * kuki, sehingga API hanya mengembalikan dokumen publik yang terbit. Dokumen
 * Internal tidak pernah tersebut di sini.
 */
async function dokumenPublik(): Promise<HasilCariAnonim[]> {
  const semua: HasilCariAnonim[] = [];
  for (let halaman = 1; halaman <= HALAMAN_MAKSIMUM; halaman += 1) {
    const hasil = await ambilApiBerdaftar<HasilCariAnonim>('/public/documents', {
      kueri: { halaman, perHalaman: 100 },
      next: { revalidate },
    });
    semua.push(...hasil.data);
    if (!hasil.meta.adaBerikutnya) break;
  }
  return semua;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const statis: MetadataRoute.Sitemap = [
    { url: `${urlSitus}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${urlSitus}/produk-hukum`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${urlSitus}/format-persuratan`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${urlSitus}/permohonan-sk`, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${urlSitus}/profil`, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${urlSitus}/kontak`, changeFrequency: 'yearly', priority: 0.4 },
  ];
  // API tidak terjangkau: sitemap tetap berisi halaman statis, bukan galat 500.
  const dokumen = await dokumenPublik().catch(() => []);
  return [
    ...statis,
    ...dokumen.map((d) => ({
      url: `${urlSitus}/produk-hukum/${encodeURIComponent(d.slug)}`,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ];
}
