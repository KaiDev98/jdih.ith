import type { MetadataRoute } from 'next';

const urlSitus = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/+$/, '');

/** Mesin pencari hanya menelusuri halaman publik; panel, akun, dan API tidak. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/superadmin', '/masuk', '/daftar', '/akun', '/api/'],
    },
    sitemap: `${urlSitus}/sitemap.xml`,
  };
}
