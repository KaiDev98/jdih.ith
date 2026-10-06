'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Menu, X } from 'lucide-react';

/**
 * Isi menu Produk Hukum.
 *
 * Tautan memakai `kode` jenis dokumen dan kategori (lihat database/v2/seed.sql),
 * bukan id. Id bergantung pada urutan penyisipan di tiap basis data, sedangkan
 * kode tetap — jadi tautan yang sama berlaku di lingkungan pengembangan maupun
 * produksi.
 */
interface ButirProduk {
  label: string;
  href: string;
}
interface KelompokProduk {
  label: string;
  anak: readonly ButirProduk[];
}
type EntriProduk = ButirProduk | KelompokProduk;

const kategoriSop = (kode: string) => `/produk-hukum?jenis=SOP&kategori=${kode}`;

export const MENU_PRODUK_HUKUM: readonly EntriProduk[] = [
  { label: 'Peraturan Rektor', href: '/produk-hukum?jenis=PERREK' },
  { label: 'SK Rektor', href: '/produk-hukum?jenis=SKREK' },
  { label: 'Instruksi Rektor', href: '/produk-hukum?jenis=INSREK' },
  { label: 'Surat Edaran', href: '/produk-hukum?jenis=SEREK' },
  {
    label: 'SOP',
    anak: [
      { label: 'Jurusan Sains', href: kategoriSop('SOP-SAINS') },
      { label: 'Jurusan TPI', href: kategoriSop('SOP-TPI') },
      { label: 'Perpustakaan', href: kategoriSop('SOP-PERPUSTAKAAN') },
      { label: 'TIK', href: kategoriSop('SOP-TIK') },
      { label: 'Akademik & Kemahasiswaan', href: kategoriSop('SOP-AKADEMIK') },
      { label: 'BMN', href: kategoriSop('SOP-BMN') },
      { label: 'Kepegawaian', href: kategoriSop('SOP-KEPEGAWAIAN') },
      { label: 'Keuangan', href: kategoriSop('SOP-KEUANGAN') },
      { label: 'LPPM', href: kategoriSop('SOP-LPPM') },
    ],
  },
];

const adalahKelompok = (entri: EntriProduk): entri is KelompokProduk => 'anak' in entri;

/**
 * Daftar isi menu Produk Hukum, dipakai bersama oleh dropdown desktop dan menu
 * seluler. SOP tidak langsung menaut ke halaman: menekannya membuka sub-menu.
 */
function DaftarProdukHukum({
  onPilih,
  seluler = false,
}: {
  onPilih: () => void;
  seluler?: boolean;
}) {
  const [sopTerbuka, setSopTerbuka] = useState(false);
  const idSub = useId();
  const kelasButir = seluler
    ? 'flex w-full items-center justify-between rounded-md px-3 py-3 text-left font-medium text-slate-800 hover:bg-slate-100'
    : 'flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-institusi-900';

  return (
    <ul className="grid gap-0.5">
      {MENU_PRODUK_HUKUM.map((entri) =>
        adalahKelompok(entri) ? (
          <li key={entri.label}>
            <button
              type="button"
              aria-expanded={sopTerbuka}
              aria-controls={idSub}
              onClick={() => setSopTerbuka((buka) => !buka)}
              className={kelasButir}
            >
              {entri.label}
              <ChevronRight
                aria-hidden
                className={`size-4 shrink-0 transition-transform ${sopTerbuka ? 'rotate-90' : ''}`}
              />
            </button>
            {sopTerbuka && (
              <ul
                id={idSub}
                className="mt-0.5 mb-1 ml-3 grid gap-0.5 border-l border-slate-200 pl-2"
              >
                {entri.anak.map((anak) => (
                  <li key={anak.href}>
                    <Link href={anak.href} onClick={onPilih} className={kelasButir}>
                      {anak.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ) : (
          <li key={entri.href}>
            <Link href={entri.href} onClick={onPilih} className={kelasButir}>
              {entri.label}
            </Link>
          </li>
        ),
      )}
    </ul>
  );
}

/**
 * Daftar tahun untuk menu "Berdasarkan Tahun". Isinya hanya tahun yang memiliki
 * dokumen publik terbit (lihat GET /public/documents/years), sehingga menu ini
 * tidak pernah menyiratkan keberadaan dokumen Internal.
 */
function DaftarTahun({
  tahun,
  onPilih,
  seluler = false,
}: {
  tahun: readonly number[];
  onPilih: () => void;
  seluler?: boolean;
}) {
  if (tahun.length === 0)
    return <p className="px-3 py-2 text-sm text-slate-500">Belum ada dokumen terbit.</p>;
  return (
    <ul className="grid grid-cols-3 gap-1">
      {tahun.map((nilai) => (
        <li key={nilai}>
          <Link
            href={`/produk-hukum?tahun=${nilai}`}
            onClick={onPilih}
            className={
              seluler
                ? 'block rounded-md px-3 py-3 text-center font-medium text-slate-800 hover:bg-slate-100'
                : 'block rounded-md px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-institusi-900'
            }
          >
            {nilai}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * Tombol dropdown pada navigasi desktop: membuka panel, tidak berpindah halaman.
 * Menutup saat mengeklik di luar, menekan Escape, atau memilih salah satu butir.
 */
function DropdownNavigasi({
  label,
  lebarPanel,
  children,
}: {
  label: string;
  lebarPanel: string;
  children: (tutup: () => void) => React.ReactNode;
}) {
  const [buka, setBuka] = useState(false);
  const wadah = useRef<HTMLDivElement>(null);
  const idPanel = useId();

  useEffect(() => {
    if (!buka) return;
    const klikLuar = (event: MouseEvent) => {
      if (!wadah.current?.contains(event.target as Node)) setBuka(false);
    };
    const tombolEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setBuka(false);
    };
    document.addEventListener('mousedown', klikLuar);
    document.addEventListener('keydown', tombolEscape);
    return () => {
      document.removeEventListener('mousedown', klikLuar);
      document.removeEventListener('keydown', tombolEscape);
    };
  }, [buka]);

  return (
    <div ref={wadah} className="relative">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={buka}
        aria-controls={idPanel}
        onClick={() => setBuka((nilai) => !nilai)}
        className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-institusi-900"
      >
        {label}
        <ChevronDown
          aria-hidden
          className={`size-4 transition-transform ${buka ? 'rotate-180' : ''}`}
        />
      </button>
      {buka && (
        <div
          id={idPanel}
          className={`absolute top-full left-0 z-50 mt-1 ${lebarPanel} rounded-lg border border-slate-200 bg-white p-2 shadow-lg`}
        >
          {children(() => setBuka(false))}
        </div>
      )}
    </div>
  );
}

const tautanSebelum = [{ label: 'Beranda', href: '/' }];

/** Isi menu Tentang: profil institusi dan kontak, masing-masing halaman tersendiri. */
export const MENU_TENTANG = [
  { label: 'Profil', href: '/profil' },
  { label: 'Kontak', href: '/kontak' },
] as const;

/** Daftar tautan sederhana di dalam dropdown, dipakai menu Tentang. */
function DaftarTautan({
  butir,
  onPilih,
  seluler = false,
}: {
  butir: readonly { label: string; href: string }[];
  onPilih: () => void;
  seluler?: boolean;
}) {
  const kelas = seluler
    ? 'block rounded-md px-3 py-3 font-medium text-slate-800 hover:bg-slate-100'
    : 'block rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-institusi-900';
  return (
    <ul className="grid gap-0.5">
      {butir.map((item) => (
        <li key={item.href}>
          <Link href={item.href} onClick={onPilih} className={kelas}>
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
const tautanSesudah = [{ label: 'Format Persuratan', href: '/format-persuratan' }];

const kelasTautanDesktop =
  'rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-institusi-900';

/**
 * Navigasi utama. Tampilan desktop baru dipakai mulai lebar `lg`, karena dengan
 * tiga dropdown butir menu tidak lagi muat berdampingan dengan logo pada `md`.
 */
export function NavigasiPublik({ tahun = [] }: { tahun?: readonly number[] }) {
  const [buka, setBuka] = useState(false);
  return (
    <>
      <nav aria-label="Navigasi utama" className="hidden items-center gap-1 lg:flex">
        {tautanSebelum.map((item) => (
          <Link key={item.href} href={item.href} className={kelasTautanDesktop}>
            {item.label}
          </Link>
        ))}
        <DropdownNavigasi label="Tentang" lebarPanel="w-48">
          {(tutup) => <DaftarTautan butir={MENU_TENTANG} onPilih={tutup} />}
        </DropdownNavigasi>
        <DropdownNavigasi label="Produk Hukum" lebarPanel="w-64">
          {(tutup) => <DaftarProdukHukum onPilih={tutup} />}
        </DropdownNavigasi>
        <DropdownNavigasi label="Berdasarkan Tahun" lebarPanel="w-60">
          {(tutup) => <DaftarTahun tahun={tahun} onPilih={tutup} />}
        </DropdownNavigasi>
        {tautanSesudah.map((item) => (
          <Link key={item.href} href={item.href} className={kelasTautanDesktop}>
            {item.label}
          </Link>
        ))}
        <Link
          href="/masuk"
          className="ml-2 inline-flex min-h-10 items-center rounded-md bg-institusi-600 px-4 text-sm font-semibold text-white hover:bg-institusi-700"
        >
          Masuk
        </Link>
      </nav>
      <ButtonMobile buka={buka} setBuka={setBuka} tahun={tahun} />
    </>
  );
}

/** Bagian menu seluler yang dapat dibuka-tutup: Tentang, Produk Hukum, dan Tahun. */
function BagianSeluler({ label, children }: { label: string; children: React.ReactNode }) {
  const [terbuka, setTerbuka] = useState(false);
  const id = useId();
  return (
    <li>
      <button
        type="button"
        aria-expanded={terbuka}
        aria-controls={id}
        onClick={() => setTerbuka((nilai) => !nilai)}
        className="flex w-full items-center justify-between rounded-md px-3 py-3 text-left font-medium text-slate-800 hover:bg-slate-100"
      >
        {label}
        <ChevronDown
          aria-hidden
          className={`size-4 transition-transform ${terbuka ? 'rotate-180' : ''}`}
        />
      </button>
      {terbuka && (
        <div id={id} className="ml-3 border-l border-slate-200 pl-2">
          {children}
        </div>
      )}
    </li>
  );
}

function ButtonMobile({
  buka,
  setBuka,
  tahun,
}: {
  buka: boolean;
  setBuka: (next: boolean) => void;
  tahun: readonly number[];
}) {
  const tutup = () => setBuka(false);
  const kelasTautan = 'block rounded-md px-3 py-3 font-medium text-slate-800 hover:bg-slate-100';

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label={buka ? 'Tutup menu' : 'Buka menu'}
        aria-expanded={buka}
        aria-controls="menu-mobile"
        onClick={() => setBuka(!buka)}
        className="grid size-11 place-items-center rounded-md border border-slate-300 text-slate-800 focus-visible:outline-2 focus-visible:outline-institusi-800"
      >
        {buka ? <X aria-hidden /> : <Menu aria-hidden />}
      </button>
      {buka && (
        <nav
          id="menu-mobile"
          aria-label="Navigasi utama seluler"
          className="absolute inset-x-0 top-full z-40 max-h-[calc(100vh-76px)] overflow-y-auto border-b border-slate-200 bg-white p-4 shadow-lg"
        >
          <ul className="mx-auto grid max-w-7xl gap-1">
            {tautanSebelum.map((item) => (
              <li key={item.href}>
                <Link onClick={tutup} href={item.href} className={kelasTautan}>
                  {item.label}
                </Link>
              </li>
            ))}
            <BagianSeluler label="Tentang">
              <DaftarTautan butir={MENU_TENTANG} onPilih={tutup} seluler />
            </BagianSeluler>
            <BagianSeluler label="Produk Hukum">
              <DaftarProdukHukum onPilih={tutup} seluler />
            </BagianSeluler>
            <BagianSeluler label="Berdasarkan Tahun">
              <DaftarTahun tahun={tahun} onPilih={tutup} seluler />
            </BagianSeluler>
            {tautanSesudah.map((item) => (
              <li key={item.href}>
                <Link onClick={tutup} href={item.href} className={kelasTautan}>
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                onClick={tutup}
                href="/masuk"
                className="mt-1 block rounded-md bg-institusi-600 px-3 py-3 text-center font-semibold text-white"
              >
                Masuk
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
}

export function PublicHeader({ tahun = [] }: { tahun?: readonly number[] }) {
  return (
    <header className="relative z-20 border-b border-slate-200 bg-white">
      <div className="mx-auto flex min-h-[76px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="JDIH ITH, beranda" className="flex min-w-0 items-center gap-3">
          <Image src="/logo-ith.webp" alt="" width={500} height={527} unoptimized className="h-10 w-auto shrink-0" />
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-base font-bold text-slate-950">JDIH ITH</span>
            <span className="mt-1 hidden text-xs text-slate-600 sm:block">
              Institut Teknologi Bacharuddin Jusuf Habibie
            </span>
          </span>
        </Link>
        <NavigasiPublik tahun={tahun} />
      </div>
    </header>
  );
}
