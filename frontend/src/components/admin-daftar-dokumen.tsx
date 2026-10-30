'use client';

import Link from '@/components/admin/tautan-panel';
import { useRouterPanel as useRouter } from '@/components/admin/tautan-panel';
import { useEffect, useState } from 'react';
import { PemilihKoleksiDokumen, type KoleksiDokumen } from './admin/pemilih-koleksi-dokumen';
import {
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FilePlus2,
  FileSignature,
  FileText,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { ambilApi, ambilApiBerdaftar, GalatApi } from '@/lib/api-client';
import { useSession } from '@/lib/sesi';
import { tautanDetailDokumen, type KonteksDokumen } from '@/lib/panel';
import { cn } from '@/lib/cn';
import {
  kodeTahapTampil,
  LABEL_STATUS_HUKUM,
  LABEL_TAHAP,
  LENCANA_AKSES,
  WARNA_STATUS_HUKUM,
} from '@/lib/label-dokumen';
import { waktuRelatif } from '@/lib/waktu';
import {
  Badge,
  Button,
  Card,
  DaftarKerangka,
  Kosong,
  PageTitle,
  StateMessage,
  kelasTautanUtama,
} from '@/components/ui';

export type BarisDokumen = {
  id: string;
  versionId: string;
  nomorVersi: number;
  judul: string;
  nomor: string | null;
  tahun: number | null;
  tipe: string;
  tingkatAkses: string;
  statusWorkflow: string;
  /** Versi TERBIT yang sudah digantikan versi terbit baru. */
  diganti: boolean | number;
  statusHukum: string;
  peruntukan?: string | null;
  diperbarui?: string;
};

type FormatSurat = {
  id: string;
  nama: string;
  slug: string;
  aktif: boolean | number;
  nomorVersi: number | null;
  tingkatAkses: string;
};

/** Lencana tahap; versi lama yang sudah digantikan tidak disebut "Terbit". */
export function LencanaTahap({
  baris,
}: {
  baris: Pick<BarisDokumen, 'statusWorkflow' | 'diganti'>;
}) {
  const kode = kodeTahapTampil(baris.statusWorkflow, baris.diganti);
  return (
    <Badge color={LABEL_TAHAP[kode]?.warna ?? 'slate'}>{LABEL_TAHAP[kode]?.teks ?? kode}</Badge>
  );
}

/** Penanda kecil dokumen yang tampil di halaman SOP Permohonan SK. */
export function TandaPermohonanSk() {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-institusi-50 px-1.5 py-0.5 text-[0.6875rem] font-semibold whitespace-nowrap text-institusi-700 ring-1 ring-institusi-600/15 ring-inset">
      <FileSignature aria-hidden className="size-3" />
      Permohonan SK
    </span>
  );
}

/**
 * Tabel dokumen panel. Seluruh baris dapat diklik; judul tetap tautan biasa
 * agar dapat dibuka dengan papan ketik atau di tab baru. Di layar kecil
 * berubah menjadi kartu bertumpuk agar tidak perlu menggeser tabel.
 */
export function TabelDokumen({
  rows,
  aksi,
  konteks = 'terverifikasi',
}: {
  rows: readonly BarisDokumen[];
  /** Aksi tambahan per baris (mis. melepas tanda), di kolom paling kanan. */
  aksi?: (r: BarisDokumen) => React.ReactNode;
  konteks?: KonteksDokumen;
}) {
  const router = useRouter();
  const tautanBaris = (r: BarisDokumen) => tautanDetailDokumen(r.id, r.versionId, konteks);
  return (
    <>
      <ul className="divide-y divide-sekat md:hidden">
        {rows.map((r) => (
          <li key={r.versionId} className="px-4 py-3.5">
            <Link href={tautanBaris(r)} className="block">
              <span className="flex items-start gap-2">
                <span className="min-w-0 flex-1 font-semibold text-tinta [overflow-wrap:anywhere]">
                  {r.judul}
                </span>
                {r.peruntukan === 'PERMOHONAN_SK' && <TandaPermohonanSk />}
              </span>
              <span className="mt-0.5 block text-xs text-slate-500 tabular-nums">
                {r.tipe} · No. {r.nomor ?? '—'} · Versi {r.nomorVersi}
                {r.diperbarui ? ` · ${waktuRelatif(r.diperbarui)}` : ''}
              </span>
              <span className="mt-2 flex flex-wrap gap-1.5">
                <LencanaTahap baris={r} />
                <Badge color={LENCANA_AKSES[r.tingkatAkses]?.warna ?? 'slate'}>
                  {LENCANA_AKSES[r.tingkatAkses]?.teks ?? r.tingkatAkses}
                </Badge>
                <Badge color={WARNA_STATUS_HUKUM[r.statusHukum] ?? 'slate'}>
                  {LABEL_STATUS_HUKUM[r.statusHukum] ?? r.statusHukum}
                </Badge>
              </span>
            </Link>
            {aksi && <div className="mt-3">{aksi(r)}</div>}
          </li>
        ))}
      </ul>
      <div className="panel-table-scroll hidden overflow-x-auto md:block">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-sekat bg-[#fbfaf8]">
            <tr>
              <th className="pl-5">Dokumen</th>
              <th>Jenis &amp; nomor</th>
              <th>Akses</th>
              <th>Tahap</th>
              <th>Status hukum</th>
              <th className={aksi ? '' : 'pr-5 text-right'}>Diperbarui</th>
              {aksi && (
                <th className="pr-5">
                  <span className="sr-only">Aksi</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-sekat">
            {rows.map((r) => (
              <tr
                key={r.versionId}
                onClick={(e) => {
                  // Klik pada tautan/tombol di dalam baris ditangani elemennya sendiri.
                  if ((e.target as HTMLElement).closest('a,button')) return;
                  router.push(tautanBaris(r));
                }}
                className="cursor-pointer"
              >
                <td className="max-w-[26rem] pl-5">
                  <div className="flex items-center gap-2">
                    <Link
                      href={tautanBaris(r)}
                      className="truncate font-semibold text-tinta decoration-institusi-300 underline-offset-4 outline-none hover:text-institusi-700 hover:underline focus-visible:underline"
                      title={r.judul}
                    >
                      {r.judul}
                    </Link>
                    {r.peruntukan === 'PERMOHONAN_SK' && <TandaPermohonanSk />}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">Versi {r.nomorVersi}</div>
                </td>
                <td className="text-slate-700">
                  {r.tipe}
                  <div className="mt-0.5 text-xs text-slate-500 tabular-nums">
                    No. {r.nomor ?? '—'} · {r.tahun ?? '—'}
                  </div>
                </td>
                <td>
                  <Badge color={LENCANA_AKSES[r.tingkatAkses]?.warna ?? 'slate'}>
                    {LENCANA_AKSES[r.tingkatAkses]?.teks ?? r.tingkatAkses}
                  </Badge>
                </td>
                <td>
                  <LencanaTahap baris={r} />
                </td>
                <td>
                  <Badge color={WARNA_STATUS_HUKUM[r.statusHukum] ?? 'slate'}>
                    {LABEL_STATUS_HUKUM[r.statusHukum] ?? r.statusHukum}
                  </Badge>
                </td>
                <td
                  className={cn(
                    'text-xs whitespace-nowrap text-slate-500 tabular-nums',
                    !aksi && 'pr-5 text-right',
                  )}
                >
                  {waktuRelatif(r.diperbarui) || '—'}
                </td>
                {aksi && <td className="pr-5 text-right">{aksi(r)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** Tab penyaring tahap; urutannya mengikuti alur kerja dokumen. */
const TAB_TAHAP: { nilai: string; label: string }[] = [
  { nilai: '', label: 'Semua' },
  { nilai: 'DRAF', label: 'Draf' },
  { nilai: 'DIAJUKAN', label: 'Menunggu verifikasi' },
  { nilai: 'REVISI', label: 'Perlu diperbaiki' },
  { nilai: 'DISETUJUI', label: 'Siap terbit' },
  { nilai: 'TERBIT', label: 'Terbit' },
  { nilai: 'DIGANTI', label: 'Diganti' },
  { nilai: 'DITARIK', label: 'Ditarik' },
];

const PER_HALAMAN = 20;

/**
 * Daftar dokumen panel (semua versi) atau antrean verifikasi. Pencarian
 * menunggu jeda ketik singkat; saat memuat ulang, isi lama tetap tampil dengan
 * bilah kemajuan tipis agar tidak berkedip.
 */
export function DaftarDokumenAdmin({
  verificationOnly = false,
  pengajuan = false,
}: {
  verificationOnly?: boolean;
  pengajuan?: boolean;
}) {
  const { pengguna } = useSession();
  const bolehBuat = pengguna?.izin.includes('documents.create') ?? false;
  const superadmin = pengguna?.peran.includes('SUPERADMIN') ?? false;
  const [rows, setRows] = useState<readonly BarisDokumen[]>();
  const [ketik, setKetik] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [koleksi, setKoleksi] = useState<KoleksiDokumen>('');
  const [formats, setFormats] = useState<FormatSurat[]>([]);
  const formatDipilih = koleksi === 'FORMAT';
  const semuaDokumen = !verificationOnly && !pengajuan;
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [meta, setMeta] = useState({ totalHalaman: 0, totalButir: 0 });

  useEffect(() => {
    if (!verificationOnly) return;
    const muat = () => {
      if (document.visibilityState === 'visible') setRefresh((n) => n + 1);
    };
    const timer = window.setInterval(muat, 30_000);
    window.addEventListener('focus', muat);
    window.addEventListener('jdih:workflow', muat);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', muat);
      window.removeEventListener('jdih:workflow', muat);
    };
  }, [verificationOnly]);

  // Jeda ketik: pencarian baru dikirim setelah pengguna berhenti mengetik.
  useEffect(() => {
    const baru = ketik.trim();
    if (baru === query) return;
    const tunda = window.setTimeout(() => {
      setLoading(true);
      setQuery(baru);
      setPage(1);
    }, 250);
    return () => window.clearTimeout(tunda);
  }, [ketik, query]);

  useEffect(() => {
    let current = true;
    const request = formatDipilih
      ? ambilApi<FormatSurat[]>('/admin/letter-templates').then((data) => {
          const cocok = data.filter(
            (row) =>
              !query ||
              `${row.nama} ${row.slug}`
                .toLocaleLowerCase('id')
                .includes(query.toLocaleLowerCase('id')),
          );
          return {
            data: [] as BarisDokumen[],
            formats: cocok.slice((page - 1) * PER_HALAMAN, page * PER_HALAMAN),
            meta: { totalHalaman: Math.ceil(cocok.length / PER_HALAMAN), totalButir: cocok.length },
          };
        })
      : ambilApiBerdaftar<BarisDokumen>(
          verificationOnly ? '/admin/documents/verification-queue' : '/admin/documents',
          {
            kueri: {
              halaman: page,
              perHalaman: PER_HALAMAN,
              q: query || undefined,
              statusWorkflow: verificationOnly ? undefined : status || undefined,
              cakupan: verificationOnly ? undefined : pengajuan ? 'PENGAJUAN' : 'TERVERIFIKASI',
              ...(semuaDokumen && (koleksi === 'PRODUK_HUKUM' || koleksi === 'SOP')
                ? { kelompok: koleksi }
                : {}),
              ...(semuaDokumen && koleksi === 'PERMOHONAN_SK' ? { peruntukan: koleksi } : {}),
            },
          },
        ).then((r) => ({ ...r, formats: [] as FormatSurat[] }));
    void request
      .then((r) => {
        if (!current) return;
        setRows(r.data);
        setFormats(r.formats);
        setMeta({ totalHalaman: r.meta.totalHalaman, totalButir: r.meta.totalButir });
        setError('');
      })
      .catch((e: unknown) => {
        if (current)
          setError(
            e instanceof GalatApi && e.status === 403
              ? 'Akun Anda tidak memiliki izin untuk melihat daftar ini.'
              : e instanceof GalatApi
                ? e.message
                : 'Daftar dokumen tidak dapat dimuat.',
          );
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [
    query,
    status,
    verificationOnly,
    pengajuan,
    page,
    refresh,
    koleksi,
    formatDipilih,
    semuaDokumen,
  ]);

  const adaSaringan = Boolean(query || status || koleksi);
  const jumlahTampil = formatDipilih ? formats.length : rows?.length;
  const ganti = (aksi: () => void) => {
    setLoading(true);
    aksi();
  };

  return (
    <div className={cn('halaman-panel mx-auto w-full', semuaDokumen && 'halaman-semua-dokumen')}>
      <PageTitle
        title={
          verificationOnly
            ? 'Antrean verifikasi'
            : pengajuan
              ? 'Draf dan pengajuan'
              : 'Semua dokumen'
        }
        description={
          verificationOnly
            ? superadmin
              ? 'Dokumen yang diajukan dan menunggu ditinjau. Buka dokumen untuk menyetujui atau mengembalikannya.'
              : 'Pengajuan dokumen dari seluruh Admin. Anda dapat meninjau informasi; keputusan verifikasi hanya oleh Superadmin.'
            : pengajuan
              ? 'Draf, pengajuan yang menunggu verifikasi, dan dokumen yang perlu diperbaiki.'
              : formatDipilih
                ? 'Format surat aktif dan arsip. Buka pengelolaan format untuk mengunggah atau memperbarui berkas.'
                : 'Dokumen yang sudah diverifikasi Superadmin, termasuk yang siap terbit dan riwayat penerbitannya.'
        }
        action={
          !verificationOnly &&
          (formatDipilih ? pengguna?.izin.includes('templates.manage') : bolehBuat) ? (
            <Link
              href={
                formatDipilih
                  ? '/admin/format-persuratan'
                  : koleksi === 'PERMOHONAN_SK'
                    ? '/admin/sop-permohonan-sk/baru'
                    : '/admin/dokumen/baru'
              }
              className={kelasTautanUtama}
            >
              <FilePlus2 aria-hidden className="size-4" />
              {formatDipilih ? 'Tambah format' : 'Upload dokumen'}
            </Link>
          ) : undefined
        }
      />
      <Card className={cn('overflow-hidden p-0 sm:p-0', semuaDokumen && 'koleksi-dokumen-panel')}>
        <div className="grid gap-3 border-b border-sekat p-4">
          <div className="flex flex-wrap items-center gap-3">
            {semuaDokumen && (
              <PemilihKoleksiDokumen
                value={koleksi}
                onValueChange={(value) =>
                  ganti(() => {
                    setKoleksi(value);
                    setStatus('');
                    setPage(1);
                    setRows(undefined);
                    setFormats([]);
                  })
                }
              />
            )}
            <label
              htmlFor="admin-doc-q"
              className={cn('relative min-w-0 flex-1', semuaDokumen && 'basis-full sm:basis-0')}
            >
              <span className="sr-only">
                {formatDipilih ? 'Cari nama atau slug format' : 'Cari judul, nomor, atau slug'}
              </span>
              <Search
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
              />
              <input
                id="admin-doc-q"
                type="search"
                value={ketik}
                onChange={(e) => setKetik(e.target.value)}
                placeholder={
                  formatDipilih ? 'Cari nama atau slug format' : 'Cari judul, nomor, atau slug'
                }
                className="h-10 w-full rounded-lg border border-sekat bg-kanvas/60 pr-3 pl-9 text-sm text-slate-950 transition-[border-color,box-shadow,background-color] placeholder:text-slate-400 hover:border-slate-300 focus:border-institusi-500 focus:bg-white focus:ring-3 focus:ring-institusi-500/20 focus:outline-none"
              />
            </label>
            {!loading && rows && (
              <span className="hidden shrink-0 text-sm text-slate-500 tabular-nums sm:block">
                {meta.totalButir} {formatDipilih ? 'format' : 'dokumen'}
              </span>
            )}
            {verificationOnly && (
              <Button
                tone="secondary"
                ukuran="kecil"
                disabled={loading}
                onClick={() => ganti(() => setRefresh((n) => n + 1))}
              >
                <RefreshCw aria-hidden className={cn('size-4', loading && 'animate-spin')} />
                Segarkan antrean
              </Button>
            )}
          </div>
          {!verificationOnly && !formatDipilih && (
            <div
              role="tablist"
              aria-label="Saring menurut tahap"
              className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5"
            >
              {TAB_TAHAP.filter(
                (t) =>
                  !t.nilai ||
                  (pengajuan
                    ? ['DRAF', 'REVISI', 'DIAJUKAN'].includes(t.nilai)
                    : ['DISETUJUI', 'TERBIT', 'DIGANTI', 'DITARIK'].includes(t.nilai)),
              ).map((t) => {
                const dipilih = status === t.nilai;
                return (
                  <button
                    key={t.nilai || 'semua'}
                    type="button"
                    role="tab"
                    aria-selected={dipilih}
                    onClick={() =>
                      ganti(() => {
                        setStatus(t.nilai);
                        setPage(1);
                      })
                    }
                    className={cn(
                      'h-8 shrink-0 rounded-full px-3 text-[0.8125rem] font-medium whitespace-nowrap transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-institusi-400',
                      dipilih
                        ? 'bg-tinta text-white'
                        : 'text-slate-600 hover:bg-kanvas hover:text-tinta',
                    )}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div
          aria-hidden
          className={cn(
            'h-0.5',
            loading && rows ? 'bilah-muat bg-institusi-100' : 'bg-transparent',
          )}
        />

        <div className="isi-koleksi-dokumen" aria-busy={loading}>
          {error ? (
            <div className="p-4">
              <StateMessage title="Daftar gagal dimuat" kind="error">
                {error}
              </StateMessage>
            </div>
          ) : !rows ? (
            <div className="px-5 py-1">
              <DaftarKerangka baris={6} label="Memuat dokumen" />
            </div>
          ) : jumlahTampil === 0 ? (
            verificationOnly && !adaSaringan ? (
              <Kosong icon={ClipboardCheck} nada="selesai" title="Antrean kosong">
                Belum ada dokumen berstatus Diajukan. Dokumen yang baru disimpan masih berada di{' '}
                <Link href="/admin/dokumen/pengajuan" className="font-semibold underline">
                  Draf dan Pengajuan
                </Link>
                ; buka detail lalu pilih Ajukan untuk diverifikasi.
              </Kosong>
            ) : adaSaringan ? (
              <Kosong
                icon={Search}
                title="Tidak ada yang cocok"
                action={
                  <Button
                    tone="secondary"
                    ukuran="kecil"
                    onClick={() =>
                      ganti(() => {
                        setKetik('');
                        setQuery('');
                        setStatus('');
                        setKoleksi('');
                        setPage(1);
                      })
                    }
                  >
                    <X aria-hidden className="size-3.5" />
                    Hapus saringan
                  </Button>
                }
              >
                Coba kata kunci lain atau pilih saringan yang berbeda.
              </Kosong>
            ) : (
              <Kosong
                icon={FileText}
                title="Belum ada dokumen"
                action={
                  bolehBuat ? (
                    <Link href="/admin/dokumen/baru" className={kelasTautanUtama}>
                      <FilePlus2 aria-hidden className="size-4" />
                      Upload dokumen pertama
                    </Link>
                  ) : undefined
                }
              >
                {pengajuan
                  ? 'Draf dan pengajuan Anda akan tampil di sini.'
                  : 'Dokumen akan tampil di sini setelah diverifikasi Superadmin.'}
              </Kosong>
            )
          ) : formatDipilih ? (
            <ul className="divide-y divide-sekat" aria-label="Format Persuratan">
              {formats.map((format) => (
                <li key={format.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                  <FileText aria-hidden className="size-5 shrink-0 text-gigi-700" />
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-semibold [overflow-wrap:anywhere]">
                      {format.nama}
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Versi {format.nomorVersi ?? '—'} ·{' '}
                      {format.tingkatAkses === 'INTERNAL' ? 'Dosen/Staf' : 'Publik'}
                    </p>
                  </div>
                  <Badge color={format.aktif ? 'green' : 'slate'}>
                    {format.aktif ? 'Aktif' : 'Arsip'}
                  </Badge>
                  <Link
                    href="/admin/format-persuratan"
                    className="inline-flex min-h-11 items-center text-xs font-semibold text-institusi-700 underline underline-offset-4"
                  >
                    Kelola format
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <TabelDokumen
              rows={rows}
              konteks={verificationOnly ? 'verifikasi' : pengajuan ? 'pengajuan' : 'terverifikasi'}
            />
          )}
        </div>

        {meta.totalHalaman > 1 && rows && (jumlahTampil ?? 0) > 0 && (
          <div className="pagination-koleksi flex items-center justify-between gap-3 border-t border-sekat px-5 py-3">
            <span className="text-sm text-slate-500 tabular-nums">
              Halaman {page} dari {meta.totalHalaman}
            </span>
            <div className="flex gap-2">
              <Button
                tone="secondary"
                ukuran="kecil"
                disabled={page <= 1 || loading}
                onClick={() => ganti(() => setPage((x) => x - 1))}
              >
                <ChevronLeft aria-hidden className="size-4" />
                Sebelumnya
              </Button>
              <Button
                tone="secondary"
                ukuran="kecil"
                disabled={page >= meta.totalHalaman || loading}
                onClick={() => ganti(() => setPage((x) => x + 1))}
              >
                Berikutnya
                <ChevronRight aria-hidden className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

export function AdminDocuments() {
  return <DaftarDokumenAdmin />;
}

export function AdminVerificationQueue() {
  return <DaftarDokumenAdmin verificationOnly />;
}
