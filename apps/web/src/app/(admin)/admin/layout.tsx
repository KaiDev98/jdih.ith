import type { Metadata } from 'next';
import Link from 'next/link';

/**
 * Tata letak Panel Administrasi.
 *
 * Berbeda dari Portal Publik dalam dua hal yang menentukan:
 *
 *  1. `robots: noindex, nofollow` — panel tidak boleh masuk indeks mesin pencari.
 *
 *  2. Isinya dirender di peramban, bukan di peladen. Panel tidak memerlukan SEO,
 *     sementara tabel berdaftar, penyaring, dan formulir bertahap jauh lebih
 *     enak dipakai bila tidak memuat ulang halaman. Di sinilah TanStack Query
 *     bekerja, sedangkan Portal Publik mengandalkan komponen peladen.
 *
 * Penjaga rute belum dipasang pada tahap setup. Tempatnya nanti: middleware
 * memeriksa keberadaan kuki sesi, dan tata letak ini mengambil identitas
 * pengguna lalu menolak yang tidak memegang izin `panel.akses`. Kaidahnya tetap:
 * penyembunyian menu BUKAN kendali keamanan — setiap titik akhir API tetap
 * memeriksa izin sendiri (docs/05-role-permission.md § E.1 prinsip 4).
 */
export const metadata: Metadata = {
  title: { default: 'Panel Administrasi', template: '%s — Panel Administrasi JDIH ITH' },
  robots: { index: false, follow: false, nocache: true },
};

/** Kerangka menu. Butir yang tampil nanti ditentukan izin akun yang sedang masuk. */
const kelompokMenu = [
  {
    judul: 'Dokumen Hukum',
    butir: [
      { label: 'Semua Dokumen', ke: '/admin/dokumen' },
      { label: 'Menunggu Verifikasi', ke: '/admin/dokumen/verifikasi' },
      { label: 'Permintaan Akses', ke: '/admin/permintaan-akses' },
    ],
  },
  {
    judul: 'Master Data',
    butir: [
      { label: 'Unit Kerja', ke: '/admin/unit-kerja' },
      { label: 'Jenis Peraturan', ke: '/admin/jenis-peraturan' },
    ],
  },
  {
    judul: 'Pengguna dan Akses',
    butir: [
      { label: 'Daftar Pengguna', ke: '/admin/pengguna' },
      { label: 'Peran dan Hak Akses', ke: '/admin/peran' },
    ],
  },
];

export default function TataLetakAdmin({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:block">
        <div className="border-b border-slate-200 px-5 py-4">
          <Link href="/admin" className="block">
            <span className="block text-sm font-semibold text-slate-900">JDIH ITH</span>
            <span className="block text-xs text-slate-500">Panel Administrasi</span>
          </Link>
        </div>

        <nav aria-label="Menu administrasi" className="px-3 py-4 text-sm">
          <Link
            href="/admin"
            className="block rounded-md px-3 py-2 font-medium text-slate-700 hover:bg-slate-50"
          >
            Dasbor
          </Link>

          {kelompokMenu.map((kelompok) => (
            <div key={kelompok.judul} className="mt-5">
              <p className="px-3 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                {kelompok.judul}
              </p>
              <ul className="mt-1 space-y-0.5">
                {kelompok.butir.map((butir) => (
                  <li key={butir.ke}>
                    <Link
                      href={butir.ke}
                      className="block rounded-md px-3 py-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    >
                      {butir.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
          <span className="text-sm font-medium text-slate-700">Panel Administrasi</span>
          <Link href="/" className="text-institusi-700 text-sm hover:underline">
            Lihat portal publik
          </Link>
        </header>
        <main id="isi-utama" className="min-w-0 flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
