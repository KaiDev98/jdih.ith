import Link from 'next/link';

const namaSitus = process.env.NEXT_PUBLIC_NAMA_SITUS ?? 'JDIH ITH Parepare';
const namaInstitusi =
  process.env.NEXT_PUBLIC_NAMA_INSTITUSI ?? 'Institut Teknologi Bacharuddin Jusuf Habibie';

/**
 * Tata letak Portal Publik.
 *
 * Kerangka bilah atas dan kaki halaman. Butir menu masih ditulis tetap di sini;
 * pada tahap berikutnya isinya diambil dari tabel `menu` dan `menu_item` melalui
 * API, sebagaimana dirancang pada docs/06-fitur-dan-menu.md § F.2 — sehingga
 * penambahan jenis peraturan tidak memerlukan perubahan kode.
 */
export default function TataLetakPublik({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="flex items-center gap-3">
            <span
              aria-hidden
              className="bg-institusi-700 grid size-10 shrink-0 place-items-center rounded-md text-sm font-bold text-white"
            >
              ITH
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-semibold text-slate-900">{namaSitus}</span>
              <span className="block text-xs text-slate-500">
                Jaringan Dokumentasi dan Informasi Hukum
              </span>
            </span>
          </Link>

          <nav aria-label="Menu utama" className="hidden items-center gap-1 text-sm md:flex">
            {[
              { label: 'Beranda', ke: '/' },
              { label: 'Profil', ke: '/profil/tentang-jdih' },
              { label: 'Produk Hukum', ke: '/peraturan' },
              { label: 'Informasi Hukum', ke: '/informasi' },
              { label: 'Statistik', ke: '/statistik' },
            ].map((butir) => (
              <Link
                key={butir.ke}
                href={butir.ke}
                className="hover:text-institusi-700 rounded-md px-3 py-2 text-slate-700 hover:bg-slate-50"
              >
                {butir.label}
              </Link>
            ))}
            <Link
              href="/masuk"
              className="bg-institusi-700 hover:bg-institusi-800 ml-2 rounded-md px-4 py-2 font-medium text-white"
            >
              Masuk
            </Link>
          </nav>
        </div>
      </header>

      <main id="isi-utama" className="flex-1">
        {children}
      </main>

      <footer className="mt-16 border-t border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 text-sm md:grid-cols-4">
          <div>
            <p className="font-semibold text-slate-900">{namaSitus}</p>
            <p className="mt-2 text-slate-600">{namaInstitusi}</p>
            <p className="mt-1 text-slate-600">Parepare, Sulawesi Selatan</p>
          </div>
          <div>
            <p className="font-semibold text-slate-900">Produk Hukum</p>
            <ul className="mt-2 space-y-1 text-slate-600">
              <li>
                <Link className="hover:text-institusi-700" href="/jenis/statuta">
                  Statuta
                </Link>
              </li>
              <li>
                <Link className="hover:text-institusi-700" href="/jenis/peraturan-rektor">
                  Peraturan Rektor
                </Link>
              </li>
              <li>
                <Link className="hover:text-institusi-700" href="/jenis/keputusan-rektor">
                  Keputusan Rektor
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-slate-900">Informasi</p>
            <ul className="mt-2 space-y-1 text-slate-600">
              <li>
                <Link className="hover:text-institusi-700" href="/profil/tentang-jdih">
                  Tentang JDIH
                </Link>
              </li>
              <li>
                <Link className="hover:text-institusi-700" href="/profil/alur-layanan">
                  Alur Layanan
                </Link>
              </li>
              <li>
                <Link className="hover:text-institusi-700" href="/faq">
                  Tanya Jawab
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-slate-900">Jaringan</p>
            <ul className="mt-2 space-y-1 text-slate-600">
              <li>
                <a
                  className="hover:text-institusi-700"
                  href="https://jdihn.go.id"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  JDIH Nasional
                </a>
              </li>
              <li>
                <a
                  className="hover:text-institusi-700"
                  href="https://peraturan.bpk.go.id"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Peraturan BPK
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-200 px-4 py-4 text-center text-xs text-slate-500">
          &copy; {new Date().getFullYear()} {namaInstitusi}. Versi aplikasi 1.0.
        </div>
      </footer>
    </>
  );
}
