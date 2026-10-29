'use client';

import Link from '@/components/admin/tautan-panel';
import { useEffect, useState } from 'react';
import {
  ArrowRight,
  CheckCheck,
  ClipboardCheck,
  FilePlus2,
  FileSignature,
  FileText,
  Globe2,
  PencilLine,
  Phone,
  Send,
  UserCheck,
} from 'lucide-react';
import { ambilApi, ambilApiBerdaftar } from '@/lib/api-client';
import { useSession } from '@/lib/sesi';
import { tautanDetailDokumen } from '@/lib/panel';
import { kodeTahapTampil, LABEL_TAHAP } from '@/lib/label-dokumen';
import { namaSapaan, salamWaktu, tanggalPanjang, waktuRelatif } from '@/lib/waktu';
import { Badge, Card, DaftarKerangka, Kerangka, kelasTautanUtama } from '@/components/ui';

type Dokumen = {
  id: string;
  versionId: string;
  judul: string;
  tipe: string;
  nomor: string | null;
  nomorVersi?: number;
  statusWorkflow: string;
  diganti?: boolean | number;
  diperbarui?: string;
};
type Pendaftar = { id: string; nama: string; email: string };
type Daftar = { data: readonly Dokumen[]; total: number };

type Ikon = React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;

/** Satu pekerjaan yang menunggu akun ini. */
type Tindakan = {
  kunci: string;
  judul: string;
  keterangan: string;
  aksi: string;
  href: string;
  ikon: Ikon;
  nada: string;
};

const ANGKA = new Intl.NumberFormat('id-ID');

/** Ubin angka; bila ada pekerjaan menunggu, diberi garis oranye dan ajakan meninjau. */
function Ubin({
  label,
  nilai,
  keterangan,
  href,
  ikon: IkonUbin,
  sorot,
}: {
  label: string;
  nilai?: number;
  keterangan: string;
  href: string;
  ikon: Ikon;
  sorot?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group relative flex flex-col justify-between rounded-xl border bg-white p-3.5 shadow-[0_1px_2px_rgb(28_25_23/0.04)] transition-[border-color,box-shadow,transform] duration-200 outline-none hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-18px_rgb(28_25_23/0.3)] focus-visible:ring-2 focus-visible:ring-institusi-400 sm:p-4 ${sorot ? 'border-institusi-200' : 'border-sekat hover:border-slate-300'}`}
    >
      <span className="flex items-center justify-between gap-3">
        <span className="text-xs leading-snug font-medium text-slate-600 sm:text-[0.8125rem]">
          {label}
        </span>
        <span
          aria-hidden
          className={`grid size-7 shrink-0 place-items-center rounded-lg ${sorot ? 'bg-institusi-50 text-institusi-600' : 'bg-kanvas text-slate-400'}`}
        >
          <IkonUbin className="size-4" />
        </span>
      </span>
      <span className="mt-2 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span className="text-[1.75rem] leading-none font-bold tracking-[-0.03em] text-tinta tabular-nums">
          {nilai === undefined ? <Kerangka className="h-7 w-10" /> : ANGKA.format(nilai)}
        </span>
        <span className="text-xs text-slate-500">
          {sorot ? (
            <span className="inline-flex items-center gap-1 font-semibold text-institusi-700">
              Tinjau sekarang
              <ArrowRight
                aria-hidden
                className="size-3.5 transition-transform group-hover:translate-x-0.5"
              />
            </span>
          ) : (
            keterangan
          )}
        </span>
      </span>
    </Link>
  );
}

/** Kepala kartu ringkas khusus dashboard. */
function KepalaDasbor({
  title,
  action,
  ikon: IkonJudul,
}: {
  title: string;
  action?: React.ReactNode;
  ikon?: Ikon;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-tinta">
        {IkonJudul && <IkonJudul aria-hidden className="size-4 text-slate-400" />}
        {title}
      </h2>
      {action}
    </div>
  );
}

/** Keadaan kosong tetap informatif tanpa memenuhi tinggi kartu. */
function PesanDasbor({
  title,
  children,
  selesai = false,
}: {
  title: string;
  children: React.ReactNode;
  selesai?: boolean;
}) {
  const IkonPesan = selesai ? CheckCheck : FileText;
  return (
    <div className="flex items-start gap-3 border-t border-sekat px-4 py-4">
      <span
        className={`grid size-8 shrink-0 place-items-center rounded-lg ${selesai ? 'bg-emerald-50 text-emerald-600' : 'bg-kanvas text-slate-400'}`}
      >
        <IkonPesan aria-hidden className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-tinta">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{children}</p>
      </div>
    </div>
  );
}

const kelasDaftarDasbor =
  'overflow-y-auto overscroll-contain [scrollbar-gutter:stable] [scrollbar-width:thin] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-institusi-400';

/** Pintasan ke pekerjaan yang sering dilakukan. */
function Pintasan({
  href,
  ikon: IkonPintasan,
  label,
  keterangan,
}: {
  href: string;
  ikon: Ikon;
  label: string;
  keterangan: string;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-11 items-center gap-2.5 rounded-lg px-2 py-2 transition-colors duration-150 outline-none hover:bg-kanvas focus-visible:ring-2 focus-visible:ring-institusi-400"
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-sekat bg-white text-slate-500 transition-colors group-hover:border-institusi-200 group-hover:text-institusi-600">
        <IkonPintasan aria-hidden className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-tinta">{label}</span>
        <span className="block truncate text-xs text-slate-500" title={keterangan}>
          {keterangan}
        </span>
      </span>
      <ArrowRight
        aria-hidden
        className="size-4 shrink-0 text-slate-300 transition-[color,transform] group-hover:translate-x-0.5 group-hover:text-slate-500"
      />
    </Link>
  );
}

/**
 * Dasbor panel: sapaan, angka yang perlu ditindaklanjuti, daftar pekerjaan
 * yang menunggu akun ini (sesuai izinnya), pintasan, dokumen yang terakhir
 * diperbarui. Bagian yang tidak diizinkan tidak tampil;
 * bagian yang gagal dimuat cukup kosong.
 */
export default function DasborAdmin() {
  const { pengguna } = useSession();
  const izin: readonly string[] = pengguna?.izin ?? [];
  const punya = (...kode: string[]) => kode.some((k) => izin.includes(k));
  const bolehDokumen = punya('documents.read_admin');
  const bolehPengguna = punya('users.read');
  const bolehVerifikasi = punya('workflow.approve', 'workflow.return');
  const bolehTerbit = punya('workflow.publish');
  const bolehUbah = punya('documents.edit');
  const bolehSetujuiAkun = punya('users.approve');

  const [antrean, setAntrean] = useState<Daftar>();
  const [revisi, setRevisi] = useState<Daftar>();
  const [disetujui, setDisetujui] = useState<Daftar>();
  const [terbit, setTerbit] = useState<number>();
  const [terbaru, setTerbaru] = useState<readonly Dokumen[]>();
  const [pendaftar, setPendaftar] = useState<readonly Pendaftar[]>();

  useEffect(() => {
    const daftar = (
      kueri: Record<string, string | number>,
      simpan: (d: Daftar) => void,
      jalur = '/admin/documents',
    ) =>
      ambilApiBerdaftar<Dokumen>(jalur, { kueri: { halaman: 1, perHalaman: 5, ...kueri } })
        .then((r) => simpan({ data: r.data, total: r.meta.totalButir }))
        .catch(() => simpan({ data: [], total: 0 }));
    if (bolehDokumen) {
      void daftar({}, setAntrean, '/admin/documents/verification-queue');
      void daftar({ statusWorkflow: 'REVISI', cakupan: 'PENGAJUAN' }, setRevisi);
      void daftar({ statusWorkflow: 'DISETUJUI' }, setDisetujui);
      void daftar({ statusWorkflow: 'TERBIT', perHalaman: 1 }, (d) => setTerbit(d.total));
      void daftar({ perHalaman: 6 }, (d) => setTerbaru(d.data));
    }
    if (bolehPengguna)
      ambilApi<Pendaftar[]>('/admin/users', { kueri: { halaman: 1, perHalaman: 100 } })
        .then(setPendaftar)
        .catch(() => setPendaftar([]));
  }, [bolehDokumen, bolehPengguna]);

  const tautanDokumen = (d: Dokumen) => tautanDetailDokumen(d.id, d.versionId,
    d.statusWorkflow === 'DIAJUKAN' ? 'verifikasi' : ['DRAF', 'REVISI'].includes(d.statusWorkflow) ? 'pengajuan' : 'terverifikasi');
  const ketDokumen = (d: Dokumen) => `${d.tipe}${d.nomor ? ` · No. ${d.nomor}` : ''}`;
  const tindakan: Tindakan[] = [
    ...(bolehVerifikasi
      ? (antrean?.data ?? []).map((d) => ({
          kunci: `v${d.versionId}`,
          judul: d.judul,
          keterangan: ketDokumen(d),
          aksi: 'Verifikasi',
          href: tautanDokumen(d),
          ikon: ClipboardCheck,
          nada: 'bg-amber-50 text-amber-600',
        }))
      : []),
    ...(bolehTerbit
      ? (disetujui?.data ?? []).map((d) => ({
          kunci: `t${d.versionId}`,
          judul: d.judul,
          keterangan: `${ketDokumen(d)} · siap diterbitkan`,
          aksi: 'Terbitkan',
          href: tautanDokumen(d),
          ikon: Send,
          nada: 'bg-sky-50 text-sky-600',
        }))
      : []),
    ...(bolehUbah
      ? (revisi?.data ?? []).map((d) => ({
          kunci: `r${d.versionId}`,
          judul: d.judul,
          keterangan: `${ketDokumen(d)} · dikembalikan untuk diperbaiki`,
          aksi: 'Perbaiki',
          href: tautanDokumen(d),
          ikon: PencilLine,
          nada: 'bg-rose-50 text-rose-600',
        }))
      : []),
    ...(bolehSetujuiAkun
      ? (pendaftar ?? []).slice(0, 5).map((p) => ({
          kunci: `p${p.id}`,
          judul: p.nama,
          keterangan: `Pendaftaran Dosen/Staf · ${p.email}`,
          aksi: 'Tinjau akun',
          href: '/admin/pengguna',
          ikon: UserCheck,
          nada: 'bg-violet-50 text-violet-600',
        }))
      : []),
  ];
  const tindakanDimuat =
    (!bolehDokumen || (antrean && revisi && disetujui)) && (!bolehPengguna || pendaftar);

  const pintasan = [
    punya('documents.create') && {
      href: '/admin/dokumen/baru',
      ikon: FilePlus2,
      label: 'Upload dokumen',
      keterangan: 'Buat draf produk hukum baru',
    },
      pengguna?.peran.includes('SUPERADMIN') === true && bolehDokumen && {
        href: '/admin/sop-permohonan-sk',
        ikon: FileSignature,
        label: 'SOP Permohonan SK',
        keterangan: 'Kelola dokumen halaman khusus',
      },
    punya('templates.manage') && {
      href: '/admin/format-persuratan',
      ikon: FileText,
      label: 'Format persuratan',
      keterangan: 'Unggah template surat',
    },
    punya('contact.manage') && {
      href: '/admin/kontak',
      ikon: Phone,
      label: 'Kontak kantor',
      keterangan: 'Telepon dan surel di portal',
    },
  ].filter((x) => x !== false);

  return (
    <div className="halaman-panel mx-auto w-full">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-slate-500">{tanggalPanjang()}</p>
          <h1 className="mt-1 text-[1.375rem] leading-tight font-bold tracking-[-0.02em] text-tinta sm:text-2xl">
            {salamWaktu()}, {namaSapaan(pengguna?.nama ?? '') || 'Admin'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {tindakanDimuat && tindakan.length > 0
              ? `Ada ${ANGKA.format(tindakan.length)} pekerjaan yang menunggu Anda.`
              : 'Berikut ringkasan portal JDIH hari ini.'}
          </p>
        </div>
        {punya('documents.create') && (
          <Link href="/admin/dokumen/baru" className={kelasTautanUtama}>
            <FilePlus2 aria-hidden className="size-4" />
            Upload dokumen
          </Link>
        )}
      </div>

      {(bolehDokumen || bolehPengguna) && (
        <div
          className={`grid gap-3 ${bolehDokumen ? (bolehPengguna ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3 [&>a:last-child]:col-span-2 sm:[&>a:last-child]:col-span-1') : 'grid-cols-1'}`}
        >
          {bolehDokumen && (
            <>
              <Ubin
                label="Menunggu verifikasi"
                nilai={antrean?.total}
                keterangan="Dokumen yang diajukan"
                href="/admin/dokumen/verifikasi"
                ikon={ClipboardCheck}
                sorot={bolehVerifikasi && (antrean?.total ?? 0) > 0}
              />
              <Ubin
                label="Siap diterbitkan"
                nilai={disetujui?.total}
                keterangan="Sudah disetujui"
                href="/admin/dokumen"
                ikon={Send}
                sorot={bolehTerbit && (disetujui?.total ?? 0) > 0}
              />
              <Ubin
                label="Tampil di portal"
                nilai={terbit}
                keterangan="Versi terbit yang aktif"
                href="/admin/dokumen"
                ikon={Globe2}
              />
            </>
          )}
          {bolehPengguna && (
            <Ubin
              label="Akun menunggu"
              nilai={pendaftar?.length}
              keterangan="Pendaftaran Dosen/Staf"
              href="/admin/pengguna"
              ikon={UserCheck}
              sorot={bolehSetujuiAkun && (pendaftar?.length ?? 0) > 0}
            />
          )}
        </div>
      )}

      <div className="dasbor-grid mt-4">
        <div className="contents">
          {(bolehDokumen || bolehPengguna) && (
            <Card className="p-0 sm:p-0">
              <KepalaDasbor title="Perlu tindakan" />
              {!tindakanDimuat ? (
                <div className="px-4 pb-2">
                  <DaftarKerangka baris={2} label="Memuat pekerjaan" />
                </div>
              ) : tindakan.length === 0 ? (
                <PesanDasbor selesai title="Semua beres">
                  Tidak ada dokumen atau akun yang menunggu Anda saat ini.
                </PesanDasbor>
              ) : (
                <ul
                  tabIndex={0}
                  aria-label="Pekerjaan yang perlu tindakan"
                  className={`max-h-60 divide-y divide-sekat border-t border-sekat ${kelasDaftarDasbor}`}
                >
                  {tindakan.map((t) => (
                    <li key={t.kunci}>
                      <Link
                        href={t.href}
                        className="group flex min-h-14 items-center gap-3 px-4 py-2.5 transition-colors duration-150 outline-none hover:bg-[#faf9f6] focus-visible:bg-[#faf9f6] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-institusi-400"
                      >
                        <span
                          className={`grid size-8 shrink-0 place-items-center rounded-lg ${t.nada}`}
                        >
                          <t.ikon aria-hidden className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className="block truncate text-sm font-semibold text-tinta"
                            title={t.judul}
                          >
                            {t.judul}
                          </span>
                          <span
                            className="block truncate text-xs text-slate-500"
                            title={t.keterangan}
                          >
                            {t.keterangan}
                          </span>
                        </span>
                        <span className="hidden shrink-0 items-center gap-1 text-xs font-semibold text-institusi-700 sm:inline-flex">
                          {t.aksi}
                          <ArrowRight
                            aria-hidden
                            className="size-3.5 transition-transform group-hover:translate-x-0.5"
                          />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {bolehDokumen && (
            <Card className="p-0 sm:p-0">
              <KepalaDasbor
                title="Terakhir diperbarui"
                action={
                  <Link
                    href="/admin/dokumen"
                    className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-institusi-700 hover:underline sm:min-h-7"
                  >
                    Semua dokumen <ArrowRight aria-hidden className="size-3.5" />
                  </Link>
                }
              />
              {terbaru === undefined ? (
                <div className="px-4 pb-2">
                  <DaftarKerangka baris={4} label="Memuat dokumen" />
                </div>
              ) : terbaru.length === 0 ? (
                <PesanDasbor title="Belum ada dokumen">
                  Dokumen yang diunggah akan tampil di sini.
                </PesanDasbor>
              ) : (
                <ul
                  tabIndex={0}
                  aria-label="Dokumen terakhir diperbarui"
                  className={`max-h-80 divide-y divide-sekat border-t border-sekat ${kelasDaftarDasbor}`}
                >
                  {terbaru.map((d) => {
                    const tahap = LABEL_TAHAP[kodeTahapTampil(d.statusWorkflow, d.diganti)];
                    return (
                      <li key={d.versionId}>
                        <Link
                          href={tautanDokumen(d)}
                          className="flex min-h-14 items-center gap-3 px-4 py-2.5 transition-colors duration-150 outline-none hover:bg-[#faf9f6] focus-visible:bg-[#faf9f6] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-institusi-400"
                        >
                          <span className="min-w-0 flex-1">
                            <span
                              className="block truncate text-sm font-medium text-tinta"
                              title={d.judul}
                            >
                              {d.judul}
                            </span>
                            <span className="block truncate text-xs text-slate-500">
                              {ketDokumen(d)}
                              {d.nomorVersi ? ` · Versi ${String(d.nomorVersi)}` : ''}
                            </span>
                          </span>
                          {tahap && <Badge color={tahap.warna}>{tahap.teks}</Badge>}
                          <span className="hidden w-24 shrink-0 text-right text-xs text-slate-500 tabular-nums md:block">
                            {waktuRelatif(d.diperbarui)}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          )}
        </div>

        <div className="dasbor-pintasan min-w-0">
          {pintasan.length > 0 && (
            <Card className="p-2 sm:p-2">
              <h2 className="px-2 pt-1 pb-1 text-sm font-semibold text-tinta">Pintasan</h2>
              <div className="pintasan-grid grid">
                {pintasan.map((p) => (
                  <Pintasan key={p.href} {...p} />
                ))}
              </div>
            </Card>
          )}
        </div>


      </div>
    </div>
  );
}
