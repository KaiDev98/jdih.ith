import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { connection } from 'next/server';

import { SessionProvider } from '@/lib/sesi';

import './globals.css';

/**
 * Archivo variabel (berat + lebar). Lebar sempit dipakai untuk label punggung
 * ordner dan label indeks, lebar normal untuk teks. Di-host sendiri oleh
 * next/font sehingga lolos CSP `font-src 'self'`.
 */
const archivo = localFont({
  src: './fonts/archivo-latin-variable.woff2',
  weight: '100 900',
  style: 'normal',
  declarations: [{ prop: 'font-stretch', value: '62% 125%' }],
  variable: '--font-archivo',
  display: 'swap',
  fallback: ['Arial'],
});

const namaSitus = process.env.NEXT_PUBLIC_NAMA_SITUS ?? 'JDIH ITH Parepare';
const namaInstitusi =
  process.env.NEXT_PUBLIC_NAMA_INSTITUSI ?? 'Institut Teknologi Bacharuddin Jusuf Habibie';
const urlSitus = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

// Render per request for nonce CSP. Unlike force-dynamic, connection() keeps
// explicit caching available for identity-independent public metadata.

/**
 * Metadata akar.
 *
 * `title.template` membuat setiap halaman cukup menyebut judulnya sendiri, dan
 * nama portal ditambahkan otomatis — penting karena judul halaman adalah salah
 * satu isyarat terkuat bagi mesin pencari pada halaman dokumen hukum.
 */
export const metadata: Metadata = {
  metadataBase: new URL(urlSitus),
  title: {
    default: `${namaSitus} — Jaringan Dokumentasi dan Informasi Hukum`,
    template: `%s — ${namaSitus}`,
  },
  description:
    `Basis data dan portal produk hukum ${namaInstitusi}, Parepare. ` +
    'Cari, telusuri, dan unduh peraturan, keputusan, pedoman, serta standar ' +
    'operasional prosedur di lingkungan kampus.',
  applicationName: namaSitus,
  authors: [{ name: namaInstitusi }],
  keywords: [
    'JDIH',
    'JDIHN',
    'peraturan kampus',
    'produk hukum',
    'ITH',
    'Institut Teknologi Bacharuddin Jusuf Habibie',
    'Parepare',
  ],
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    siteName: namaSitus,
    url: urlSitus,
  },
  robots: {
    // Halaman panel administrasi menimpa nilai ini dengan noindex pada tata
    // letaknya sendiri.
    index: true,
    follow: true,
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Pembesaran tidak dibatasi: membatasinya menyulitkan pengguna berpenglihatan
  // terbatas dan melanggar WCAG 2.1 AA.
  maximumScale: 5,
};

export default async function TataLetakAkar({ children }: { children: React.ReactNode }) {
  await connection();
  return (
    <html lang="id" className={archivo.variable} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <a href="#isi-utama" className="lewati-ke-isi">
          Lewati ke isi utama
        </a>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
