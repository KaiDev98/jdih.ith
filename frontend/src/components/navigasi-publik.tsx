'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Menu, X } from 'lucide-react';

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

const kelasButirDesktop =
  'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-[0.9375rem] font-medium text-slate-700 transition-colors duration-150 hover:bg-institusi-50 hover:text-institusi-800';
const kelasButirSeluler =
  'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-left font-medium text-slate-800 transition-colors duration-150 hover:bg-institusi-50 hover:text-institusi-800';

/**
 * Daftar isi menu Produk Hukum, dipakai bersama oleh dropdown desktop dan menu
 * seluler. SOP tidak langsung menaut ke halaman: menekannya membuka sub-menu
 * yang melipat terbuka dengan halus.
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
  const kelasButir = seluler ? kelasButirSeluler : kelasButirDesktop;

  return (
    <ul className="grid gap-px">
      {MENU_PRODUK_HUKUM.map((entri) =>
        adalahKelompok(entri) ? (
          <li key={entri.label}>
            <button
              type="button"
              aria-expanded={sopTerbuka}
              aria-controls={idSub}
              onClick={() => setSopTerbuka((buka) => !buka)}
              className={`${kelasButir} ${sopTerbuka ? 'bg-institusi-50 text-institusi-800' : ''}`}
            >
              {entri.label}
              <ChevronDown
                aria-hidden
                className={`size-4 shrink-0 transition-transform duration-200 ease-out ${sopTerbuka ? 'rotate-180 text-institusi-700' : 'text-slate-400'}`}
              />
            </button>
            <div
              id={idSub}
              data-state={sopTerbuka ? 'open' : 'closed'}
              aria-hidden={!sopTerbuka}
              inert={!sopTerbuka}
              className="lipatan"
            >
              <div>
                <ul className="mt-px ml-3 grid gap-px border-l border-slate-200 py-1 pl-2">
                  {entri.anak.map((anak) => (
                    <li key={anak.href}>
                      <Link href={anak.href} onClick={onPilih} className={kelasButir}>
                        {anak.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
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
            className={`block rounded-lg text-center font-semibold text-slate-700 tabular-nums transition-colors duration-150 hover:bg-institusi-50 hover:text-institusi-800 ${seluler ? 'px-3 py-3' : 'px-3 py-2 text-[0.9375rem]'}`}
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
 * Panel selalu dirender agar dapat beranimasi saat muncul maupun hilang; saat
 * tertutup ia disembunyikan dari pembaca layar dan tidak dapat difokus.
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
        className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${buka ? 'bg-institusi-50 text-institusi-800' : 'text-slate-700 hover:bg-slate-100 hover:text-tinta'}`}
      >
        {label}
        <ChevronDown
          aria-hidden
          className={`size-4 transition-transform duration-200 ease-out ${buka ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        id={idPanel}
        data-state={buka ? 'open' : 'closed'}
        aria-hidden={!buka}
        inert={!buka}
        className={`menu-mengambang panel-mengambang absolute top-full left-0 z-50 mt-2 ${lebarPanel} p-1.5`}
      >
        {children(() => setBuka(false))}
      </div>
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
  return (
    <ul className="grid gap-px">
      {butir.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            onClick={onPilih}
            className={seluler ? kelasButirSeluler : kelasButirDesktop}
          >
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
const tautanSesudah = [{ label: 'Format Persuratan', href: '/format-persuratan' }];

const kelasTautanDesktop =
  'rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-100 hover:text-tinta';

/**
 * Navigasi utama. Tampilan desktop baru dipakai mulai lebar `xl`, karena dengan
 * tiga dropdown butir menu tidak lagi muat berdampingan dengan logo pada `md`.
 */
export function NavigasiPublik({ tahun = [] }: { tahun?: readonly number[] }) {
  const [buka, setBuka] = useState(false);
  return (
    <>
      <nav aria-label="Navigasi utama" className="hidden items-center gap-1 xl:flex">
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
          className="tekan ml-2 inline-flex min-h-10 items-center rounded-lg bg-institusi-600 px-4 text-sm font-semibold text-white hover:bg-institusi-700"
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
        className={`${kelasButirSeluler} ${terbuka ? 'bg-institusi-50 text-institusi-800' : ''}`}
      >
        {label}
        <ChevronDown
          aria-hidden
          className={`size-4 transition-transform duration-200 ease-out ${terbuka ? 'rotate-180 text-institusi-700' : 'text-slate-400'}`}
        />
      </button>
      <div
        id={id}
        data-state={terbuka ? 'open' : 'closed'}
        aria-hidden={!terbuka}
        inert={!terbuka}
        className="lipatan"
      >
        <div>
          <div className="mt-px ml-3 border-l border-slate-200 py-1 pl-2">{children}</div>
        </div>
      </div>
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

  return (
    <div className="xl:hidden">
      <button
        type="button"
        aria-label={buka ? 'Tutup menu' : 'Buka menu'}
        aria-expanded={buka}
        aria-controls="menu-mobile"
        onClick={() => setBuka(!buka)}
        className="tekan grid size-11 place-items-center rounded-lg border border-slate-300 text-slate-800 hover:bg-slate-50"
      >
        {buka ? <X aria-hidden /> : <Menu aria-hidden />}
      </button>
      <nav
        id="menu-mobile"
        aria-label="Navigasi utama seluler"
        data-state={buka ? 'open' : 'closed'}
        aria-hidden={!buka}
        inert={!buka}
        className="menu-seluler absolute inset-x-0 top-full z-40 overflow-y-auto border-b border-slate-200 bg-white px-4 pt-3 pb-5 shadow-[0_16px_32px_-16px_rgb(23_35_64/0.25)]"
      >
        <ul className="mx-auto grid max-w-7xl gap-px">
          {tautanSebelum.map((item) => (
            <li key={item.href}>
              <Link onClick={tutup} href={item.href} className={kelasButirSeluler}>
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
              <Link onClick={tutup} href={item.href} className={kelasButirSeluler}>
                {item.label}
              </Link>
            </li>
          ))}
          <li>
            <Link
              onClick={tutup}
              href="/masuk"
              className="tekan mt-2 block rounded-lg bg-institusi-600 px-3 py-3 text-center font-semibold text-white hover:bg-institusi-700"
            >
              Masuk
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}

export function PublicHeader({ tahun = [] }: { tahun?: readonly number[] }) {
  // Navbar menempel di atas saat halaman digulir; bayangan tipis muncul begitu
  // halaman tidak lagi di posisi paling atas, agar terpisah dari isi di bawahnya.
  const [tergulir, setTergulir] = useState(false);
  useEffect(() => {
    const periksa = () => setTergulir(window.scrollY > 4);
    periksa();
    window.addEventListener('scroll', periksa, { passive: true });
    return () => window.removeEventListener('scroll', periksa);
  }, []);
  return (
    <header
      className={`sticky top-0 z-30 bg-white transition-shadow duration-200 ${tergulir ? 'shadow-[0_6px_20px_-12px_rgb(23_35_64/0.25)]' : ''}`}
    >
      <div className="mx-auto flex min-h-[72px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          aria-label="JDIH ITH, beranda"
          className="group flex min-w-0 items-center gap-3 sm:gap-3.5"
        >
          <Image
            src="/logo-ith.webp"
            alt=""
            width={500}
            height={527}
            unoptimized
            className="h-11 w-auto shrink-0 sm:h-12"
          />
          <span aria-hidden className="hidden h-9 w-px shrink-0 bg-slate-200 sm:block" />
          <span className="min-w-0">
            <span className="block truncate text-xl leading-none font-extrabold tracking-[-0.02em] text-tinta sm:text-[1.375rem]">
              JDIH <span className="text-institusi-600">ITH</span>
            </span>
            <span className="mt-1.5 hidden text-[0.6875rem] leading-none font-semibold tracking-[0.08em] text-slate-500 uppercase [font-stretch:87.5%] sm:block">
              Institut Teknologi Bacharuddin Jusuf Habibie
            </span>
          </span>
        </Link>
        <NavigasiPublik tahun={tahun} />
      </div>
      <div aria-hidden className="garis-logo h-0.5" />
    </header>
  );
}
