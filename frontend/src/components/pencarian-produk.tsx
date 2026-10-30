'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  Eye,
  Library,
  LoaderCircle,
  Search,
  SearchX,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  type FasetCari,
  type HasilCariAnonim,
  type HasilCariAuthorized,
  type MetaHalaman,
  type UrutanDokumen,
} from '@jdih/shared';
import { LABEL_URUTAN_DOKUMEN } from '@jdih/shared/api';
import { ambilApi, ambilApiBerdaftar, GalatApi } from '@/lib/api-client';
import { useSession } from '@/lib/sesi';
import { cn } from '@/lib/cn';
import { tampilanJenis } from '@/lib/tampilan-jenis';
import { LatarFotoHero } from './latar-foto-hero';
import { LambangProdukHukum } from './lambang-produk-hukum';
import { PilihanDropdown } from './pilihan-dropdown';

type Baris = HasilCariAnonim | HasilCariAuthorized;
interface Master {
  id: string;
  kode?: string;
  nama: string;
}
interface Filter {
  q: string;
  jenisDokumenId: string;
  tahun: string;
  kategoriId: string;
  statusHukum: string;
  urut: UrutanDokumen;
}

const PER_HALAMAN = 15;
const angka = new Intl.NumberFormat('id-ID');
const formatTanggal = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const tanggal = (iso: string) => formatTanggal.format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));

const STATUS = {
  BERLAKU: { teks: 'Berlaku', titik: 'bg-emerald-500', warna: 'text-emerald-700' },
  DIUBAH: { teks: 'Diubah', titik: 'bg-amber-500', warna: 'text-amber-700' },
  DICABUT: { teks: 'Dicabut', titik: 'bg-red-500', warna: 'text-red-700' },
} as const;

/** Urutan yang ditawarkan; "Paling relevan" hanya bermakna ketika ada kata kunci. */
const URUTAN: readonly UrutanDokumen[] = ['terbaru', 'terlama', 'tahun_turun', 'judul'];
const urutBawaan = (q: string): UrutanDokumen => (q ? 'relevansi' : 'terbaru');

/**
 * Label tingkat akses hanya ada pada hasil untuk pengguna yang berhak melihat
 * dokumen Internal; hasil untuk pengunjung anonim tidak membawa ruas itu.
 */
const LABEL_AKSES = {
  publik: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  internal: 'border-amber-200 bg-amber-50 text-amber-800',
} as const;

/** Sorot kata kunci di dalam teks tanpa memakai HTML mentah. */
function Sorot({ teks, kata }: { teks: string; kata: string }) {
  const bersih = kata.trim();
  if (bersih.length < 2) return <>{teks}</>;
  const pola = new RegExp(`(${bersih.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return (
    <>
      {teks.split(pola).map((bagian, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="rounded-sm bg-institusi-100 px-0.5 text-inherit">
            {bagian}
          </mark>
        ) : (
          bagian
        ),
      )}
    </>
  );
}

function JudulBagian({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
      {children}
    </h3>
  );
}

function Kerangka() {
  return (
    <ul aria-hidden className="grid gap-3">
      {[0, 1, 2, 3].map((i) => (
        <li
          key={i}
          className="flex min-w-0 gap-4 rounded-xl border border-tinta/10 bg-white px-5 py-5"
        >
          <span className="size-11 shrink-0 animate-pulse rounded-xl bg-slate-100" />
          <span className="grid min-w-0 flex-1 gap-2.5">
            <span className="h-3 w-40 max-w-full animate-pulse rounded bg-slate-100" />
            <span className="h-4 w-3/4 animate-pulse rounded bg-slate-200/70" />
            <span className="h-3 w-56 max-w-full animate-pulse rounded bg-slate-100" />
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Halaman daftar produk hukum: kepala halaman terang, panel penyaring di kiri,
 * dan daftar hasil di kanan. Penyaring berlaku langsung tanpa tombol terapkan.
 * Hasil bergulir dalam panel dengan tinggi terbatas pada semua perangkat.
 * Pemuatan berikutnya mengikuti area gulir tersebut dan tetap tersedia
 * melalui tombol untuk pengguna keyboard atau browser tanpa pengamat gulir.
 */
export function PencarianProduk({
  initialQuery = '',
  initialYear = '',
  initialJenisKode = '',
  initialKategoriKode = '',
  initialStatus = '',
  initialJenisNama,
}: {
  initialQuery?: string;
  initialYear?: string;
  initialJenisKode?: string;
  initialKategoriKode?: string;
  initialStatus?: string;
  /** Nama jenis dari server agar judul tidak berkedip sebelum data master tiba. */
  initialJenisNama?: string;
}) {
  const session = useSession();
  const alamat = useSearchParams();
  const kueriAlamat = alamat?.toString();
  const [alamatDitulis, setAlamatDitulis] = useState<string | null>(null);
  const [alamatDiterapkan, setAlamatDiterapkan] = useState<string>();
  const [filter, setFilter] = useState<Filter>({
    q: initialQuery,
    jenisDokumenId: '',
    tahun: initialYear,
    kategoriId: '',
    statusHukum: initialStatus,
    urut: urutBawaan(initialQuery),
  });
  const [ketik, setKetik] = useState(initialQuery);
  const [halaman, setHalaman] = useState(1);
  const [jenis, setJenis] = useState<Master[]>([]);
  const [kategori, setKategori] = useState<Master[]>([]);
  const [tahunTersedia, setTahunTersedia] = useState<number[]>([]);
  // Pencarian pertama ditahan sampai data master tiba, karena kode dari menu
  // (mis. SOP-SAINS) baru dapat diterjemahkan menjadi id setelah master dimuat.
  const [masterSiap, setMasterSiap] = useState(false);
  const [hasil, setHasil] = useState<{
    kunci: string;
    /** Halaman terakhir yang sudah tergabung ke `data`. */
    halaman: number;
    data?: readonly Baris[];
    meta?: MetaHalaman;
    galat?: string;
    /** Galat saat memuat halaman lanjutan; daftar yang sudah tampil tetap dipertahankan. */
    galatLanjut?: string;
  }>();
  const [faset, setFaset] = useState<FasetCari>();
  const [ulang, setUlang] = useState(0);
  const [ulangLanjut, setUlangLanjut] = useState(0);
  const [panelBuka, setPanelBuka] = useState(false);
  const gulirHasil = useRef<HTMLDivElement>(null);
  const ujungHasil = useRef<HTMLDivElement>(null);

  const ubah = useCallback(
    (perubahan: Partial<Filter>) => {
      const next = { ...filter, ...perubahan };
      setFilter(next);
      setHalaman(1);
      const params = new URLSearchParams();
      const jenisKode = jenis.find((item) => item.id === next.jenisDokumenId)?.kode;
      const kategoriKode = kategori.find((item) => item.id === next.kategoriId)?.kode;
      if (jenisKode) params.set('jenis', jenisKode);
      if (next.q) params.set('q', next.q);
      if (next.tahun) params.set('tahun', next.tahun);
      if (kategoriKode) params.set('kategori', kategoriKode);
      if (next.statusHukum) params.set('statusHukum', next.statusHukum);
      if (next.urut !== urutBawaan(next.q)) params.set('urut', next.urut);
      setAlamatDitulis(params.toString());
      window.history.replaceState(null, '', `/produk-hukum${params.size ? `?${params}` : ''}`);
    },
    [filter, jenis, kategori],
  );

  useEffect(() => {
    let aktif = true;
    void Promise.all([
      ambilApi<Master[]>('/public/master/jenis_dokumen').catch(() => [] as Master[]),
      ambilApi<Master[]>('/public/master/kategori').catch(() => [] as Master[]),
      ambilApi<number[]>('/public/documents/years').catch(() => [] as number[]),
    ]).then(([j, k, t]) => {
      if (!aktif) return;
      setJenis(j);
      setKategori(k);
      setTahunTersedia(Array.isArray(t) ? t.filter((x) => typeof x === 'number') : []);
      const jenisDokumenId = j.find((item) => item.kode === initialJenisKode)?.id ?? '';
      const kategoriId = k.find((item) => item.kode === initialKategoriKode)?.id ?? '';
      setFilter((lama) => ({ ...lama, jenisDokumenId, kategoriId }));
      setMasterSiap(true);
    });
    return () => {
      aktif = false;
    };
  }, [initialJenisKode, initialKategoriKode]);

  // Next may reuse this component when a menu returns to its original URL.
  // Read external navigation from the URL rather than unchanged initial props.
  if (masterSiap && kueriAlamat !== undefined && kueriAlamat !== alamatDiterapkan) {
    setAlamatDiterapkan(kueriAlamat);
    setAlamatDitulis(null);
    if (kueriAlamat !== alamatDitulis) {
      const params = new URLSearchParams(kueriAlamat);
      const q = params.get('q')?.trim() ?? '';
      const status = params.get('statusHukum') ?? '';
      const urut = params.get('urut');
      const next: Filter = {
        q,
        jenisDokumenId: jenis.find((j) => j.kode === params.get('jenis'))?.id ?? '',
        kategoriId: kategori.find((k) => k.kode === params.get('kategori'))?.id ?? '',
        tahun: params.get('tahun') ?? '',
        statusHukum: Object.hasOwn(STATUS, status) ? status : '',
        urut:
          urut && (URUTAN.includes(urut as UrutanDokumen) || (q && urut === 'relevansi'))
            ? (urut as UrutanDokumen)
            : urutBawaan(q),
      };
      setFilter(next);
      setKetik(q);
      setHalaman(1);
    }
  }

  // Kata kunci diterapkan sendiri setelah berhenti mengetik sebentar.
  useEffect(() => {
    if (ketik === filter.q) return;
    const t = window.setTimeout(() => {
      ubah({
        q: ketik,
        urut: filter.urut === urutBawaan(filter.q) ? urutBawaan(ketik) : filter.urut,
      });
    }, 400);
    return () => window.clearTimeout(t);
  }, [ketik, filter.q, filter.urut, ubah]);

  const siap = masterSiap && session.state !== 'loading';
  // Kunci daftar tanpa nomor halaman: bila berubah, daftar dimulai lagi dari halaman 1.
  const kunci = JSON.stringify([filter, session.state, session.pengguna?.status, ulang]);
  const [kunciHalaman, setKunciHalaman] = useState(kunci);
  if (kunciHalaman !== kunci) {
    setKunciHalaman(kunci);
    setHalaman(1);
  }

  useEffect(() => {
    if (!siap) return;
    let aktif = true;
    if (halaman === 1 && gulirHasil.current) gulirHasil.current.scrollTop = 0;
    ambilApiBerdaftar<Baris>('/public/search/documents', {
      cache: 'no-store',
      kueri: { ...filter, halaman, perHalaman: PER_HALAMAN },
    })
      .then((r) => {
        if (!aktif) return;
        setHasil((lama) =>
          halaman > 1 && lama?.kunci === kunci && lama.data
            ? { kunci, halaman, data: [...lama.data, ...r.data], meta: r.meta }
            : { kunci, halaman, data: r.data, meta: r.meta },
        );
      })
      .catch((e: unknown) => {
        if (!aktif) return;
        const pesan = e instanceof GalatApi ? e.message : 'Daftar dokumen tidak dapat dimuat.';
        setHasil((lama) =>
          halaman > 1 && lama?.kunci === kunci
            ? { ...lama, galatLanjut: pesan }
            : { kunci, halaman, galat: pesan },
        );
      });
    return () => {
      aktif = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- kunci merangkum filter dan sesi
  }, [siap, kunci, halaman, ulangLanjut]);

  // Mengganti jenis melepas kategori: hitung pilihan jenis tanpa kategori aktif.
  // Jenis terpilih memakai total hasil aktual agar kategori tetap tercermin.
  const kunciFaset = JSON.stringify([filter.q, filter.tahun, filter.statusHukum, session.state]);
  useEffect(() => {
    if (!siap) return;
    let aktif = true;
    ambilApi<FasetCari>('/public/search/documents/facets', {
      cache: 'no-store',
      kueri: {
        q: filter.q,
        tahun: filter.tahun,
        statusHukum: filter.statusHukum,
      },
    })
      .then((f) => {
        if (aktif) setFaset(f);
      })
      .catch(() => undefined);
    return () => {
      aktif = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- kunciFaset merangkum ruas yang dipakai
  }, [siap, kunciFaset]);

  const memuat = !hasil || hasil.kunci !== kunci;
  const galatLanjut = memuat ? undefined : hasil.galatLanjut;
  const memuatLanjut = !memuat && !galatLanjut && hasil.halaman < halaman;
  const adaLanjut = !memuat && !!hasil.meta && hasil.halaman < hasil.meta.totalHalaman;
  const jumlahJenis = useMemo(
    () => new Map(faset?.perJenis.map((p) => [p.jenisDokumenId, p.jumlah]) ?? []),
    [faset],
  );

  // Every viewport uses the bounded results region, including phones.
  // Pengamat dipasang ulang setiap kali satu halaman selesai dimuat, sehingga bila
  // ujungnya masih terlihat (daftar pendek), halaman berikutnya langsung menyusul.
  useEffect(() => {
    const ujung = ujungHasil.current;
    if (!ujung || !adaLanjut || memuatLanjut || galatLanjut) return;
    if (typeof IntersectionObserver === 'undefined') return;
    const berikutnya = (hasil?.halaman ?? 0) + 1;
    const pengamat = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) setHalaman(berikutnya);
      },
      {
        root: gulirHasil.current,
        rootMargin: '0px 0px 240px 0px',
      },
    );
    pengamat.observe(ujung);
    return () => {
      pengamat.disconnect();
    };
  }, [adaLanjut, memuatLanjut, galatLanjut, hasil?.halaman]);

  const jenisAktif = jenis.find((j) => j.id === filter.jenisDokumenId);
  const namaJenis = jenisAktif?.nama ?? (masterSiap ? undefined : initialJenisNama);
  const kodeJenis = jenisAktif?.kode ?? (masterSiap ? undefined : initialJenisKode);
  const namaKategori = kategori.find((k) => k.id === filter.kategoriId)?.nama;
  const judul = namaJenis ?? 'Semua produk hukum';
  const total = hasil?.meta?.totalButir;
  const chipAktif = [
    filter.q && {
      kunci: 'q',
      teks: `“${filter.q}”`,
      hapus: () => (setKetik(''), ubah({ q: '', urut: 'terbaru' })),
    },
    filter.tahun && {
      kunci: 'tahun',
      teks: `Tahun ${filter.tahun}`,
      hapus: () => ubah({ tahun: '' }),
    },
    filter.statusHukum && {
      kunci: 'status',
      teks: STATUS[filter.statusHukum as keyof typeof STATUS]?.teks ?? filter.statusHukum,
      hapus: () => ubah({ statusHukum: '' }),
    },
    namaKategori && {
      kunci: 'kategori',
      teks: namaKategori,
      hapus: () => ubah({ kategoriId: '' }),
    },
  ].filter(Boolean) as { kunci: string; teks: string; hapus: () => void }[];

  const tahunPilihan = [
    ...new Set([...tahunTersedia, ...(filter.tahun ? [Number(filter.tahun)] : [])]),
  ]
    .filter((t) => Number.isInteger(t))
    .sort((a, b) => b - a);

  return (
    <>
      <header className="hero-produk hero-beranda text-white">
        <LatarFotoHero />
        <div className="mx-auto max-w-7xl px-4 pt-8 pb-10 sm:px-6 lg:px-8 lg:pt-10 lg:pb-12">
          <nav aria-label="Jejak halaman" className="masuk-ringan tunda-1 text-sm text-white/70">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <Link href="/" className="hover:text-white">
                  Beranda
                </Link>
              </li>
              <li aria-hidden className="text-white/40">
                /
              </li>
              <li>
                {namaJenis ? (
                  <button
                    type="button"
                    onClick={() => ubah({ jenisDokumenId: '' })}
                    className="hover:text-white"
                  >
                    Produk Hukum
                  </button>
                ) : (
                  <span aria-current="page" className="text-white">
                    Produk Hukum
                  </span>
                )}
              </li>
              {namaJenis && (
                <>
                  <li aria-hidden className="text-white/40">
                    /
                  </li>
                  <li aria-current="page" className="text-white">
                    {namaJenis}
                  </li>
                </>
              )}
            </ol>
          </nav>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
            <div className="min-w-0 basis-full pl-15 sm:pl-20 lg:flex-1 lg:basis-0">
              <div className="min-w-0">
                <div className="relative">
                  <div className="absolute top-1/2 -left-15 -translate-y-1/2 sm:-left-20">
                    <LambangProdukHukum
                      key={kodeJenis ?? namaJenis ?? 'semua'}
                      kode={kodeJenis}
                      nama={namaJenis}
                    />
                  </div>
                  <h1 className="text-[1.75rem] leading-tight font-extrabold tracking-[-0.02em] [overflow-wrap:anywhere] sm:text-4xl">
                    <span className="topeng-baris">
                      <span className="isi-baris">{judul}</span>
                    </span>
                  </h1>
                </div>
                <p className="masuk tunda-3 mt-1.5 max-w-2xl text-gigi-100">
                  {namaJenis
                    ? `${namaJenis} Institut Teknologi Bacharuddin Jusuf Habibie yang telah diterbitkan.`
                    : 'Peraturan, keputusan, instruksi, surat edaran, dan SOP Institut Teknologi Bacharuddin Jusuf Habibie.'}
                </p>
              </div>
            </div>
            <p className="masuk tunda-4 flex items-baseline gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-white/80 ring-1 ring-white/15 backdrop-blur-sm">
              <span className="text-2xl font-extrabold text-white tabular-nums">
                {total === undefined ? '—' : angka.format(total)}
              </span>
              dokumen terbit
            </p>
          </div>
        </div>
      </header>

      <div className="portal-results-layout mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[17.5rem_minmax(0,1fr)] lg:items-start lg:gap-8 lg:px-8">
        <aside aria-label="Penyaring" className="lg:sticky lg:top-24">
          <div className="panel p-4 sm:p-5">
            <form
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                ubah({ q: ketik, urut: urutBawaan(ketik) });
              }}
            >
              <label htmlFor="cari-daftar" className="sr-only">
                Kata kunci
              </label>
              <span className="relative block">
                <Search
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="cari-daftar"
                  type="search"
                  autoComplete="off"
                  value={ketik}
                  onChange={(e) => setKetik(e.target.value)}
                  placeholder={namaJenis ? `Cari di ${namaJenis}…` : 'Judul, nomor, atau tahun…'}
                  className="portal-filter-input h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pr-9 pl-9 text-sm text-tinta transition-colors outline-none placeholder:text-slate-400 hover:border-slate-300 focus:border-institusi-500 focus:bg-white focus:ring-3 focus:ring-institusi-500/20 [&::-webkit-search-cancel-button]:appearance-none"
                />
                {ketik && (
                  <button
                    type="button"
                    aria-label="Hapus kata kunci"
                    onClick={() => {
                      setKetik('');
                      ubah({ q: '', urut: 'terbaru' });
                    }}
                    className="portal-filter-clear absolute top-1/2 right-1.5 grid size-7 -translate-y-1/2 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-tinta"
                  >
                    <X aria-hidden className="size-4" />
                  </button>
                )}
              </span>
            </form>

            <button
              type="button"
              aria-expanded={panelBuka}
              aria-controls="isi-penyaring"
              onClick={() => setPanelBuka((b) => !b)}
              className="portal-filter-toggle mt-3 flex w-full items-center justify-between rounded-lg px-1 py-1 text-sm font-semibold text-tinta lg:hidden"
            >
              <span className="flex items-center gap-2">
                <SlidersHorizontal aria-hidden className="size-4 text-slate-500" />
                Penyaring
                {chipAktif.length > 0 && (
                  <span className="rounded-full bg-institusi-600 px-1.5 text-xs text-white">
                    {chipAktif.length}
                  </span>
                )}
              </span>
              <ChevronDown
                aria-hidden
                className={cn(
                  'size-4 text-slate-400 transition-transform',
                  panelBuka && 'rotate-180',
                )}
              />
            </button>

            <div
              id="isi-penyaring"
              className={cn('mt-5 grid gap-6 max-lg:mt-4', !panelBuka && 'max-lg:hidden')}
            >
              <PilihanDropdown
                label="Tahun"
                value={filter.tahun}
                onChange={(v) => ubah({ tahun: v })}
                opsi={[
                  { value: '', label: 'Semua tahun' },
                  ...tahunPilihan.map((t) => ({ value: String(t), label: String(t) })),
                ]}
              />

              <PilihanDropdown
                label="Kategori"
                value={filter.kategoriId}
                onChange={(v) => ubah({ kategoriId: v })}
                opsi={[
                  { value: '', label: 'Semua kategori' },
                  ...kategori.map((k) => ({ value: k.id, label: k.nama })),
                ]}
              />

              <section>
                <JudulBagian>Jenis produk hukum</JudulBagian>
                <ul className="grid gap-0.5">
                  {[{ id: '', nama: 'Semua jenis' } as Master, ...jenis].map((j) => {
                    const dipilih = filter.jenisDokumenId === j.id;
                    const jumlah =
                      dipilih && !memuat && hasil.meta
                        ? hasil.meta.totalButir
                        : !faset
                          ? undefined
                          : j.id
                            ? (jumlahJenis.get(j.id) ?? 0)
                            : faset.total;
                    const kosong = jumlah === 0 && !dipilih;
                    const { titik } = tampilanJenis(j.kode, j.nama);
                    return (
                      <li key={j.id || 'semua'}>
                        <button
                          type="button"
                          aria-pressed={dipilih}
                          onClick={() =>
                            ubah({
                              jenisDokumenId: j.id,
                              ...(j.id !== filter.jenisDokumenId ? { kategoriId: '' } : {}),
                            })
                          }
                          className={cn(
                            'portal-filter-option flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                            dipilih
                              ? 'bg-institusi-50 font-semibold text-institusi-900'
                              : kosong
                                ? 'text-slate-400 hover:bg-slate-50'
                                : 'text-slate-700 hover:bg-slate-50 hover:text-tinta',
                          )}
                        >
                          <span
                            aria-hidden
                            className={cn(
                              'size-2 shrink-0 rounded-full',
                              j.id ? titik : 'bg-slate-300',
                              kosong && 'opacity-40',
                            )}
                          />
                          <span className="min-w-0 flex-1 truncate">{j.nama}</span>
                          {jumlah !== undefined && (
                            <span
                              className={cn(
                                'text-xs tabular-nums',
                                dipilih ? 'font-semibold text-institusi-700' : 'text-slate-400',
                              )}
                            >
                              {angka.format(jumlah)}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>

              <section>
                <JudulBagian>Status hukum</JudulBagian>
                <div className="grid grid-cols-2 gap-1.5" role="group" aria-label="Status hukum">
                  {[
                    { v: '', t: 'Semua' },
                    ...Object.entries(STATUS).map(([v, s]) => ({ v, t: s.teks })),
                  ].map(({ v, t }) => {
                    const dipilih = filter.statusHukum === v;
                    const s = STATUS[v as keyof typeof STATUS];
                    return (
                      <button
                        key={v || 'semua'}
                        type="button"
                        aria-pressed={dipilih}
                        onClick={() => ubah({ statusHukum: v })}
                        className={cn(
                          'portal-status-option flex h-9 items-center justify-center gap-1.5 rounded-lg border text-sm font-medium transition-colors',
                          dipilih
                            ? 'border-tinta bg-tinta text-white'
                            : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:text-tinta',
                        )}
                      >
                        {s && <span aria-hidden className={cn('size-1.5 rounded-full', s.titik)} />}
                        {t}
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>
          </div>
        </aside>

        <section aria-label="Hasil" className="min-w-0">
          <div className="portal-result-toolbar mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <p aria-live="polite" className="mr-1 text-sm text-slate-600">
                {total === undefined ? (
                  'Memuat…'
                ) : (
                  <>
                    Menampilkan{' '}
                    <strong className="font-semibold text-tinta tabular-nums">
                      {angka.format(total)}
                    </strong>{' '}
                    dokumen
                  </>
                )}
              </p>
              {chipAktif.map((c) => (
                <button
                  key={c.kunci}
                  type="button"
                  onClick={c.hapus}
                  aria-label={`Hapus penyaring ${c.teks}`}
                  className="portal-filter-chip inline-flex h-7 max-w-60 items-center gap-1.5 rounded-full border border-slate-200 bg-white pr-2 pl-3 text-xs font-medium text-slate-700 transition-colors hover:border-slate-300 hover:text-tinta"
                >
                  <span className="truncate">{c.teks}</span>
                  <X aria-hidden className="size-3.5 shrink-0 text-slate-400" />
                </button>
              ))}
            </div>
            <PilihanDropdown
              label="Urutkan"
              sembunyikanLabel
              className="w-48"
              value={filter.urut}
              onChange={(v) => ubah({ urut: v as UrutanDokumen })}
              opsi={(filter.q ? (['relevansi', ...URUTAN] as UrutanDokumen[]) : URUTAN).map(
                (u) => ({ value: u, label: LABEL_URUTAN_DOKUMEN[u] }),
              )}
            />
          </div>

          <div
            ref={gulirHasil}
            data-gulir-dokumen
            aria-busy={memuat || memuatLanjut}
            role="region"
            aria-label="Daftar dokumen"
            tabIndex={0}
            className="portal-results-scroll gulir-hasil -mx-1.5 -mt-1 max-h-[max(26rem,calc(100dvh-13rem))] overflow-y-auto overscroll-contain px-1.5 pt-1 pb-4"
          >
            {memuat ? (
              <Kerangka />
            ) : hasil?.galat ? (
              <div
                role="alert"
                className="panel grid place-items-center gap-3 px-6 py-14 text-center"
              >
                <p className="font-semibold text-tinta">Daftar dokumen belum dapat dimuat</p>
                <p className="text-sm text-slate-600">{hasil.galat}</p>
                <button
                  type="button"
                  onClick={() => setUlang((x) => x + 1)}
                  className="tekan rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-tinta hover:bg-slate-50"
                >
                  Coba lagi
                </button>
              </div>
            ) : !hasil?.data?.length ? (
              <div className="panel grid place-items-center px-6 py-16 text-center">
                <span className="grid size-14 place-items-center rounded-full bg-slate-100 text-slate-400">
                  <SearchX aria-hidden className="size-6" />
                </span>
                <h2 className="mt-4 font-bold text-tinta">
                  {chipAktif.length
                    ? 'Tidak ada dokumen yang cocok'
                    : `Belum ada ${namaJenis ?? 'dokumen'} yang diterbitkan`}
                </h2>
                <p className="mt-1 max-w-sm text-sm text-slate-600">
                  {chipAktif.length
                    ? 'Coba kata kunci lain atau longgarkan penyaring.'
                    : 'Dokumen akan tampil di sini setelah diterbitkan oleh Bagian Hukum.'}
                </p>
              </div>
            ) : (
              <ul className="grid gap-3">
                {hasil.data.map((row) => {
                  const status = STATUS[row.statusHukum];
                  const kodeJenis = jenis.find((j) => j.nama === row.tipe)?.kode;
                  const { ikon: Ikon, kotak } = tampilanJenis(kodeJenis, row.tipe);
                  const akses = 'tingkatAkses' in row ? row.tingkatAkses : undefined;
                  return (
                    <li key={row.id}>
                      <Link
                        href={`/produk-hukum/${row.slug}`}
                        aria-labelledby={`judul-hasil-${row.id}`}
                        className="kartu-dokumen group relative flex items-center gap-4 rounded-xl border border-tinta/10 bg-white px-4 py-4 outline-none focus-visible:ring-2 focus-visible:ring-institusi-500 focus-visible:ring-offset-2 sm:px-5 sm:py-5"
                      >
                        <div className="min-w-0 flex-1 pl-15">
                          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                            <span className="font-semibold text-slate-700">{row.tipe}</span>
                            <span aria-hidden>·</span>
                            <span className="tabular-nums">
                              No. <Sorot teks={row.nomor} kata={filter.q} />
                            </span>
                            {akses && (
                              <span
                                className={cn(
                                  'rounded-full border px-2 py-px text-[0.6875rem] font-semibold',
                                  LABEL_AKSES[akses],
                                )}
                              >
                                {akses === 'internal' ? 'Dosen/Staf' : 'Publik'}
                              </span>
                            )}
                          </p>
                          <div className="relative mt-1">
                            <span
                              aria-hidden
                              className={cn(
                                'absolute top-1/2 -left-15 grid size-11 -translate-y-1/2 place-items-center rounded-xl transition-transform group-hover:scale-105',
                                kotak,
                              )}
                            >
                              <Ikon className="size-5" />
                            </span>
                            <h3
                              id={`judul-hasil-${row.id}`}
                              className="text-base leading-snug font-bold text-tinta transition-colors [overflow-wrap:anywhere] group-hover:text-institusi-800 sm:text-[1.0625rem]"
                            >
                              <Sorot teks={row.judul} kata={filter.q} />
                            </h3>
                          </div>
                          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                            <span className="inline-flex items-center gap-1.5">
                              <CalendarDays aria-hidden className="size-3.5" />
                              {tanggal(row.tanggalPenetapan)}
                            </span>
                            <span className="inline-flex items-center gap-1.5 tabular-nums">
                              <Eye aria-hidden className="size-3.5" />
                              {angka.format(row.dilihat)} dilihat
                            </span>
                            <span
                              className={cn(
                                'inline-flex items-center gap-1.5 font-medium sm:hidden',
                                status.warna,
                              )}
                            >
                              <span
                                aria-hidden
                                className={cn('size-1.5 rounded-full', status.titik)}
                              />
                              {status.teks}
                            </span>
                          </p>
                        </div>
                        <div className="hidden shrink-0 items-center gap-4 sm:flex">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 text-sm font-medium',
                              status.warna,
                            )}
                          >
                            <span aria-hidden className={cn('size-2 rounded-full', status.titik)} />
                            {status.teks}
                          </span>
                          <ArrowRight
                            aria-hidden
                            className="size-4 -translate-x-1 text-slate-300 transition-all group-hover:translate-x-0 group-hover:text-institusi-600"
                          />
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
            {!memuat && !!hasil.data?.length && (hasil.meta?.totalHalaman ?? 1) > 1 && (
              <div className="px-4 pt-3 text-center text-sm text-slate-500">
                {galatLanjut ? (
                  <p
                    role="alert"
                    className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2"
                  >
                    <span>{galatLanjut}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setHasil((lama) => lama && { ...lama, galatLanjut: undefined });
                        setUlangLanjut((x) => x + 1);
                      }}
                      className="font-semibold text-institusi-700 hover:text-institusi-800"
                    >
                      Coba lagi
                    </button>
                  </p>
                ) : memuatLanjut ? (
                  <p className="inline-flex items-center gap-2">
                    <LoaderCircle aria-hidden className="size-4 animate-spin text-slate-400" />
                    Memuat dokumen berikutnya…
                  </p>
                ) : adaLanjut ? (
                  <button
                    type="button"
                    onClick={() => setHalaman(hasil.halaman + 1)}
                    className="tekan inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-tinta hover:bg-slate-50"
                  >
                    Muat dokumen berikutnya
                  </button>
                ) : (
                  <p>
                    Semua{' '}
                    <span className="font-semibold text-slate-600 tabular-nums">
                      {angka.format(hasil.data.length)}
                    </span>{' '}
                    dokumen sudah ditampilkan.
                  </p>
                )}
                <div ref={ujungHasil} aria-hidden />
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
