'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  FileSignature,
  Menu,
  Phone,
  School,
  X,
} from 'lucide-react';
import { macamJenis, tampilanJenis } from '@/lib/tampilan-jenis';
import { IkonSop, KotakCentang } from '@/components/ikon-jenis';

/**
 * Isi menu Produk Hukum dan menu SOP.
 *
 * Tautan memakai `kode` jenis dokumen dan kategori, bukan id: id bergantung pada
 * urutan penyisipan di tiap basis data. Kode jenis dapat diubah Superadmin, jadi
 * kedua menu dibangun dari daftar jenis dan kategori SOP yang dimuat peladen;
 * daftar tetap di bawah hanya cadangan bila daftar itu gagal dimuat. SOP berdiri
 * sendiri di navigasi, terpisah dari produk hukum, dengan satu tautan per unit.
 */
interface ButirProduk {
  label: string;
  href: string;
  /** Kode dan nama jenis dokumen, untuk ikon dan warnanya. */
  kode: string;
  nama?: string;
}
/** Jenis dokumen aktif sebagaimana dikirim GET /public/master/jenis_dokumen. */
export type JenisMenu = { kode: string; nama: string };
/** Kategori SOP aktif (GET /public/master/kategori); sekaligus daftar unit kerja. */
export type UnitSopMenu = { kode: string; nama: string };
/** Menu SOP: tautan semua SOP dan satu tautan per unit kerja. */
export type MenuSop = { href: string; unit: readonly { label: string; href: string }[] };

const tautanJenis = (kode: string) => `/produk-hukum?jenis=${encodeURIComponent(kode)}`;

/** Cadangan daftar unit SOP bila daftar kategori gagal dimuat. */
const UNIT_SOP: readonly UnitSopMenu[] = [
  { nama: 'Jurusan Sains', kode: 'SOP-SAINS' },
  { nama: 'Jurusan TPI', kode: 'SOP-TPI' },
  { nama: 'Perpustakaan', kode: 'SOP-PERPUSTAKAAN' },
  { nama: 'TIK', kode: 'SOP-TIK' },
  { nama: 'Akademik & Kemahasiswaan', kode: 'SOP-AKADEMIK' },
  { nama: 'BMN', kode: 'SOP-BMN' },
  { nama: 'Kepegawaian', kode: 'SOP-KEPEGAWAIAN' },
  { nama: 'Keuangan', kode: 'SOP-KEUANGAN' },
  { nama: 'LPPM', kode: 'SOP-LPPM' },
  { nama: 'Bagian Hukum', kode: 'SOP-HUKUM' },
  { nama: 'SPI', kode: 'SOP-SPI' },
  { nama: 'Komisi Etik', kode: 'SOP-KOMISI-ETIK' },
];

export const MENU_PRODUK_HUKUM: readonly ButirProduk[] = [
  { label: 'Peraturan Rektor', kode: 'PERREK', href: tautanJenis('PERREK') },
  { label: 'SK Rektor', kode: 'SKREK', href: tautanJenis('SKREK') },
  { label: 'Instruksi Rektor', kode: 'INSREK', href: tautanJenis('INSREK') },
  { label: 'Surat Edaran', kode: 'SEREK', href: tautanJenis('SEREK') },
  { label: 'Peraturan Senat', kode: 'PERSEN', href: tautanJenis('PERSEN') },
  { label: 'SK Senat', kode: 'SKSEN', href: tautanJenis('SKSEN') },
];

const adalahSop = ({ kode, nama }: JenisMenu) => macamJenis(kode, nama) === 'sop';

/** Menu Produk Hukum dari daftar jenis basis data, tanpa SOP; daftar kosong berarti cadangan. */
export function menuProdukHukum(jenis: readonly JenisMenu[]): readonly ButirProduk[] {
  if (jenis.length === 0) return MENU_PRODUK_HUKUM;
  return jenis
    .filter((j) => !adalahSop(j))
    .map(({ kode, nama }) => ({ label: nama, kode, nama, href: tautanJenis(kode) }));
}

/** Menu SOP dari jenis SOP dan kategorinya; `null` bila jenis SOP tidak aktif. */
export function menuSop(
  jenis: readonly JenisMenu[],
  unitSop: readonly UnitSopMenu[] = [],
): MenuSop | null {
  const kode = jenis.length === 0 ? 'SOP' : jenis.find(adalahSop)?.kode;
  if (!kode) return null;
  return {
    href: tautanJenis(kode),
    unit: (unitSop.length ? unitSop : UNIT_SOP).map((u) => ({
      label: u.nama,
      href: `${tautanJenis(kode)}&kategori=${encodeURIComponent(u.kode)}`,
    })),
  };
}

/** Butir teratas menu seluler (Beranda, bagian yang dapat dibuka, dst.). */
const kelasButirSeluler =
  'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-left font-medium text-slate-800 transition-colors duration-150 hover:bg-institusi-50 hover:text-institusi-800';

/** Butir di dalam dropdown: ikon dalam kotak, label, lalu panah yang muncul saat disorot. */
const kelasButirMenu = (seluler: boolean) =>
  `butir-menu group flex w-full items-center gap-3 rounded-lg px-2 text-left font-medium transition-colors duration-150 hover:bg-slate-50 hover:text-tinta focus-visible:bg-slate-50 focus-visible:outline-none ${seluler ? 'py-2 text-slate-800' : 'py-1.5 text-sm text-slate-700'}`;

function KotakIkon({
  ikon: Ikon,
  kelas,
}: {
  ikon: React.ComponentType<{ className?: string }>;
  kelas: string;
}) {
  return (
    <span
      aria-hidden
      className={`ikon-menu grid size-8 shrink-0 place-items-center rounded-lg ${kelas}`}
    >
      <Ikon className="size-4" />
    </span>
  );
}

const PanahMenu = () => (
  <ChevronRight aria-hidden className="panah-menu size-4 shrink-0 text-institusi-600" />
);

/** Tautan penutup dropdown menuju halaman lengkapnya, dipisah garis tipis. */
function TautanSemua({
  href,
  label,
  onPilih,
}: {
  href: string;
  label: string;
  onPilih: () => void;
}) {
  return (
    <div className="mt-1.5 border-t border-slate-100 pt-1.5">
      <Link
        href={href}
        onClick={onPilih}
        className="group flex items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm font-semibold text-institusi-700 transition-colors duration-150 hover:bg-institusi-50 hover:text-institusi-800"
      >
        {label}
        <ArrowRight
          aria-hidden
          className="size-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5"
        />
      </Link>
    </div>
  );
}

/**
 * Daftar isi menu Produk Hukum, dipakai bersama oleh dropdown desktop dan menu
 * seluler. Setiap jenis memakai ikon dan warna yang sama dengan tile beranda.
 */
function DaftarProdukHukum({
  entri: daftar,
  onPilih,
  seluler = false,
}: {
  entri: readonly ButirProduk[];
  onPilih: () => void;
  seluler?: boolean;
}) {
  return (
    <div>
      <ul className="grid gap-0.5">
        {daftar.map((entri) => {
          const { ikon, kotak } = tampilanJenis(entri.kode, entri.nama);
          return (
            <li key={entri.href}>
              <Link href={entri.href} onClick={onPilih} className={kelasButirMenu(seluler)}>
                <KotakIkon ikon={ikon} kelas={kotak} />
                <span className="min-w-0 flex-1">{entri.label}</span>
                <PanahMenu />
              </Link>
            </li>
          );
        })}
      </ul>
      <TautanSemua href="/produk-hukum" label="Semua produk hukum" onPilih={onPilih} />
    </div>
  );
}

/**
 * Isi menu SOP: unit kerja dalam dua kolom (satu kolom di menu seluler). Tiap
 * unit diawali kotak centang kecil yang tercentang saat disorot, karena SOP
 * pada dasarnya daftar periksa kerja.
 */
function DaftarSop({
  menu,
  onPilih,
  seluler = false,
}: {
  menu: MenuSop;
  onPilih: () => void;
  seluler?: boolean;
}) {
  return (
    <div>
      {!seluler && (
        <div className="flex items-center gap-3 px-2 pt-1 pb-2.5">
          <KotakIkon ikon={IkonSop} kelas="bg-slate-100 text-slate-700" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-tinta">Standar Operasional Prosedur</p>
            <p className="text-xs text-slate-500">Pilih unit kerja</p>
          </div>
        </div>
      )}
      <ul
        className={`grid gap-0.5 ${seluler ? '' : 'grid-cols-2 border-t border-slate-100 pt-1.5'}`}
      >
        {menu.unit.map((u) => (
          <li key={u.href}>
            <Link
              href={u.href}
              onClick={onPilih}
              className={`unit-sop group flex items-center gap-2.5 rounded-lg px-2 text-slate-700 transition-colors duration-150 hover:bg-slate-50 hover:text-tinta focus-visible:bg-slate-50 focus-visible:outline-none ${seluler ? 'py-2' : 'py-1.5 text-sm'}`}
            >
              <KotakCentang className="size-4 shrink-0 text-slate-300 transition-colors duration-200 group-hover:text-institusi-400" />
              <span className="min-w-0 flex-1">{u.label}</span>
            </Link>
          </li>
        ))}
      </ul>
      <TautanSemua href={menu.href} label="Semua SOP" onPilih={onPilih} />
    </div>
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
    <div className={seluler ? 'py-1' : 'p-1'}>
      {!seluler && (
        <p className="mb-2 px-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">
          Pilih tahun
        </p>
      )}
      <ul className="grid grid-cols-3 gap-1.5">
        {tahun.map((nilai) => (
          <li key={nilai}>
            <Link
              href={`/produk-hukum?tahun=${nilai}`}
              onClick={onPilih}
              className={`block rounded-lg border border-slate-200 text-center text-sm font-semibold text-slate-700 tabular-nums transition-colors duration-150 hover:border-institusi-300 hover:bg-institusi-50 hover:text-institusi-800 ${seluler ? 'py-2.5' : 'py-2'}`}
            >
              {nilai}
            </Link>
          </li>
        ))}
      </ul>
    </div>
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
  rataKanan = false,
  children,
}: {
  label: string;
  lebarPanel: string;
  /** Panel lebar di sisi kanan navigasi dibuka rata kanan agar tidak keluar layar. */
  rataKanan?: boolean;
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
        className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors duration-150 ${buka ? 'bg-institusi-50 text-institusi-800' : 'text-slate-700 hover:bg-slate-100 hover:text-tinta'}`}
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
        className={`menu-mengambang panel-mengambang gulir-hasil absolute top-full ${rataKanan ? 'right-0' : 'left-0'} z-50 mt-2 max-h-[calc(100dvh-6rem)] overflow-y-auto overscroll-contain ${lebarPanel} p-1.5`}
      >
        {children(() => setBuka(false))}
      </div>
    </div>
  );
}

const tautanSebelum = [{ label: 'Beranda', href: '/' }];

/** Isi menu Tentang: profil institusi dan kontak, masing-masing halaman tersendiri. */
export const MENU_TENTANG = [
  { label: 'Profil', href: '/profil', ikon: School },
  { label: 'Kontak', href: '/kontak', ikon: Phone },
] as const;

/** Daftar tautan sederhana di dalam dropdown, dipakai menu Tentang. */
function DaftarTautan({
  butir,
  onPilih,
  seluler = false,
}: {
  butir: readonly {
    label: string;
    href: string;
    ikon: React.ComponentType<{ className?: string }>;
  }[];
  onPilih: () => void;
  seluler?: boolean;
}) {
  return (
    <ul className="grid gap-0.5">
      {butir.map((item) => (
        <li key={item.href}>
          <Link href={item.href} onClick={onPilih} className={kelasButirMenu(seluler)}>
            <KotakIkon
              ikon={item.ikon}
              kelas="bg-slate-100 text-slate-600 group-hover:bg-institusi-50 group-hover:text-institusi-700"
            />
            <span className="min-w-0 flex-1">{item.label}</span>
            <PanahMenu />
          </Link>
        </li>
      ))}
    </ul>
  );
}
const tautanSesudah = [{ label: 'Format Persuratan', href: '/format-persuratan' }];

/**
 * Tombol utama navigasi: SOP Permohonan SK, prosedur yang paling sering dicari
 * pengunjung, dengan halamannya sendiri. Portal publik sengaja tidak memuat
 * tombol Masuk; pengelola dan Dosen/Staf masuk lewat tautan langsung.
 */
function TombolPermohonanSk({
  onPilih,
  seluler = false,
}: {
  onPilih?: () => void;
  seluler?: boolean;
}) {
  return (
    <Link
      href="/permohonan-sk"
      onClick={onPilih}
      className={`tekan group inline-flex items-center justify-center gap-2 rounded-lg bg-institusi-600 font-semibold whitespace-nowrap text-white hover:bg-institusi-700 ${seluler ? 'mt-2 flex w-full px-3 py-3' : 'ml-2 min-h-10 px-3.5 text-sm'}`}
    >
      <FileSignature aria-hidden className="size-4 shrink-0" />
      SOP Permohonan SK
    </Link>
  );
}

const kelasTautanDesktop =
  'rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap text-slate-700 transition-colors duration-150 hover:bg-slate-100 hover:text-tinta';

/**
 * Navigasi utama. Tampilan desktop baru dipakai mulai lebar `xl`, karena dengan
 * tiga dropdown butir menu tidak lagi muat berdampingan dengan logo pada `md`.
 */
export function NavigasiPublik({
  tahun = [],
  jenis = [],
  unitSop = [],
}: {
  tahun?: readonly number[];
  jenis?: readonly JenisMenu[];
  unitSop?: readonly UnitSopMenu[];
}) {
  const [buka, setBuka] = useState(false);
  const produk = menuProdukHukum(jenis);
  const sop = menuSop(jenis, unitSop);
  return (
    <>
      <nav aria-label="Navigasi utama" className="hidden items-center gap-1 xl:flex 2xl:gap-2">
        {tautanSebelum.map((item) => (
          <Link key={item.href} href={item.href} className={kelasTautanDesktop}>
            {item.label}
          </Link>
        ))}
        <DropdownNavigasi label="Tentang" lebarPanel="w-52">
          {(tutup) => <DaftarTautan butir={MENU_TENTANG} onPilih={tutup} />}
        </DropdownNavigasi>
        <DropdownNavigasi label="Produk Hukum" lebarPanel="w-72">
          {(tutup) => <DaftarProdukHukum entri={produk} onPilih={tutup} />}
        </DropdownNavigasi>
        {sop && (
          <DropdownNavigasi label="SOP" lebarPanel="w-[30rem]">
            {(tutup) => <DaftarSop menu={sop} onPilih={tutup} />}
          </DropdownNavigasi>
        )}
        <DropdownNavigasi label="Berdasarkan Tahun" lebarPanel="w-60">
          {(tutup) => <DaftarTahun tahun={tahun} onPilih={tutup} />}
        </DropdownNavigasi>
        {tautanSesudah.map((item) => (
          <Link key={item.href} href={item.href} className={kelasTautanDesktop}>
            {item.label}
          </Link>
        ))}
        <TombolPermohonanSk />
      </nav>
      <ButtonMobile buka={buka} setBuka={setBuka} tahun={tahun} produk={produk} sop={sop} />
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
  produk,
  sop,
}: {
  buka: boolean;
  setBuka: (next: boolean) => void;
  tahun: readonly number[];
  produk: readonly ButirProduk[];
  sop: MenuSop | null;
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
            <DaftarProdukHukum entri={produk} onPilih={tutup} seluler />
          </BagianSeluler>
          {sop && (
            <BagianSeluler label="SOP">
              <DaftarSop menu={sop} onPilih={tutup} seluler />
            </BagianSeluler>
          )}
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
            <TombolPermohonanSk onPilih={tutup} seluler />
          </li>
        </ul>
      </nav>
    </div>
  );
}

export function PublicHeader({
  tahun = [],
  jenis = [],
  unitSop = [],
}: {
  tahun?: readonly number[];
  jenis?: readonly JenisMenu[];
  unitSop?: readonly UnitSopMenu[];
}) {
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
      <div className="mx-auto flex min-h-[72px] max-w-[92rem] items-center justify-between gap-6 px-4 sm:px-6 lg:px-[clamp(2.5rem,20vw-13.5rem,4rem)]">
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
            {/* Satu baris di tablet; dua baris pendek di desktop agar navigasi lengkap muat. */}
            <span className="mt-1.5 hidden text-[0.6875rem] leading-none font-semibold tracking-[0.08em] text-slate-500 uppercase [font-stretch:87.5%] sm:block xl:mt-1 xl:leading-[1.3]">
              <span className="xl:block">Institut Teknologi</span>{' '}
              <span className="xl:block">Bacharuddin Jusuf Habibie</span>
            </span>
          </span>
        </Link>
        <NavigasiPublik tahun={tahun} jenis={jenis} unitSop={unitSop} />
      </div>
      <div aria-hidden className="garis-logo h-0.5" />
    </header>
  );
}
