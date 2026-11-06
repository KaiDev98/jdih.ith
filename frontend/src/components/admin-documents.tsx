'use client';

import Link from '@/components/admin/tautan-panel';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, AlertTriangle, Check, FileText, Globe2, Pencil, Plus, UploadCloud, X, FilePen } from 'lucide-react';
import { PemilihIsianPanel } from './admin/pemilih-isian-panel';
import { PemilihKategoriDokumen } from './admin/pemilih-kategori-dokumen';
import { PemilihTingkatAkses } from './admin/pemilih-tingkat-akses';
import { ambilApi, GalatApi } from '@/lib/api-client';
import { useSession, csrfHeaders } from '@/lib/sesi';
import { superadminAktif } from '@/lib/panel';
import type { PilihanKategoriDokumen } from '@jdih/shared';
import { jadikanSlug, rapikanSlugKetik } from '@/lib/slug';
import { macamJenis } from '@/lib/tampilan-jenis';
import {
  PanelHubungan,
  type Hubungan,
  type JenisHubungan,
} from '@/components/admin/panel-hubungan';
import {
  Button,
  Card,
  ConfirmAction,
  Field,
  PageTitle,
  StateMessage,
  TextAreaField,
  kelasTautanUtama,
} from '@/components/ui';
import { LABEL_JENIS_BERKAS, POLA_BERKAS_DITERIMA, TERIMA_BERKAS } from '@/lib/label-dokumen';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';

type Master = { id: string; nama: string; kode?: string; aktif?: boolean };

// Daftar dokumen dan antrean verifikasi ada di admin-daftar-dokumen.tsx.
export { AdminDocuments, AdminVerificationQueue, DaftarDokumenAdmin } from './admin-daftar-dokumen';

/** Jenis dokumen SOP, satu-satunya jenis yang boleh menjadi SOP Permohonan SK. */
const jenisSop = (j: { kode?: string; nama: string }) => macamJenis(j.kode ?? '', j.nama) === 'sop';

/** Label ruas formulir untuk pesan galat validasi dari backend. */
const LABEL_RUAS: Record<string, string> = {
  kodeDokumen: 'Kode dokumen',
  slug: 'Slug URL',
  jenisDokumenId: 'Jenis dokumen',
  'versi.judul': 'Judul',
  'versi.deskripsi': 'Deskripsi singkat',
  'versi.nomor': 'Nomor',
  'versi.tahun': 'Tahun',
  'versi.pic': 'PIC',
  'versi.tanggalPenetapan': 'Tanggal penetapan',
  'versi.tingkatAkses': 'Tingkat akses',
  'versi.kategoriId': 'Kategori',
};

/** Ubah galat API menjadi pesan yang menyebut ruasnya, mis. "Slug URL: …". */
function pesanGalat(error: unknown): Error {
  if (error instanceof GalatApi && error.butir?.length)
    return new Error(
      error.butir.map((b) => `${LABEL_RUAS[b.ruas] ?? b.ruas}: ${b.pesan}`).join(' · '),
    );
  return error instanceof Error ? error : new Error('Draf belum dapat dibuat. Coba lagi.');
}

/**
 * Upload dokumen hukum baru. Bila dibuka dari tombol "Upload dokumen pengubah/
 * pencabut" di detail peraturan lama, hubungannya sudah terisi; status
 * peraturan lama berubah saat dokumen ini terbit (seperti JDIH BPK).
 */
export function AdminDocumentCreate({
  hubunganAwal,
  mode = 'umum',
}: {
  hubunganAwal?: { jenis: JenisHubungan; targetId: string };
  /**
   * `permohonan-sk`: dibuka dari menu SOP Permohonan SK. Jenis dikunci ke SOP,
   * akses Publik atau Dosen/Staf, dan ditandai untuk halaman SOP Permohonan SK.
   */
  mode?: 'umum' | 'permohonan-sk';
} = {}) {
  const khusus = mode === 'permohonan-sk';
  const { csrfToken, pengguna } = useSession();
  const aksesKhusus = !khusus || (pengguna?.status === 'AKTIF' && pengguna.peran.some((role) => role === 'ADMIN' || role === 'SUPERADMIN'));
  const [types, setTypes] = useState<Master[]>([]);
  const [categories, setCategories] = useState<PilihanKategoriDokumen[]>([]);
  // SOP Permohonan SK memakai judul baku; kode dan alamat ikut terisi darinya.
  const judulAwal = khusus ? 'SOP Permohonan Surat Keputusan' : '';
  const [code, setCode] = useState(jadikanSlug(judulAwal).toUpperCase().slice(0, 64));
  const [slug, setSlug] = useState(jadikanSlug(judulAwal));
  const [slugManual, setSlugManual] = useState(false);
  const [kodeManual, setKodeManual] = useState(false);
  const [cobaKirim, setCobaKirim] = useState(false);
  const [type, setType] = useState('');
  const [title, setTitle] = useState(judulAwal);
  const [description, setDescription] = useState('');
  const [access, setAccess] = useState<'publik' | 'internal'>('publik');
  const [number, setNumber] = useState('');
  const [year, setYear] = useState('');
  const [pic, setPic] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState('');
  const [file, setFile] = useState<File>();
  const [seret, setSeret] = useState(false);
  // Kode dan slug terisi otomatis dari judul; kolomnya dibuka hanya bila diubah.
  const [aturAlamat, setAturAlamat] = useState(false);
  const [error, setError] = useState('');
  const [hubungan, setHubungan] = useState<Hubungan>();
  const [hasilTerbuka, setHasilTerbuka] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const judulHasil = useRef<HTMLHeadingElement>(null);
  const [created, setCreated] = useState<{
    id: string;
    versionId: string;
    unggah?: string;
    relasi?: string;
  }>();

  useEffect(() => {
    if (!aksesKhusus) return;
    void Promise.all([
      ambilApi<Master[]>('/admin/document-options/jenis_dokumen'),
      ambilApi<PilihanKategoriDokumen[]>('/admin/document-options/kategori'),
    ])
      .then(([a, b]) => {
        setTypes(a);
        setCategories(b);
        if (khusus) {
          const sop = a.find((x) => x.aktif !== false && jenisSop(x));
          if (sop) setType(sop.id);
          else
            setError(
              'Jenis dokumen SOP tidak ditemukan atau nonaktif. Aktifkan lewat menu Jenis Dokumen.',
            );
        }
      })
      .catch((e: unknown) =>
        setError(e instanceof GalatApi ? e.message : 'Data pilihan tidak dapat dimuat.'),
      );
  }, [khusus, aksesKhusus]);

  // Isi awal dari tombol di detail peraturan lama (?mengubah= / ?mencabut=).
  useEffect(() => {
    if (!hubunganAwal) return;
    void ambilApi<{
      document: {
        id: string;
        judul: string;
        nomor: string | null;
        tahun: number | null;
        bolehJadiTargetRelasi: boolean;
      };
    }>(`/admin/documents/${hubunganAwal.targetId}`)
      .then(({ document: d }) => {
        if (!d.bolehJadiTargetRelasi) throw new Error('Dokumen target tidak diizinkan');
        setHubungan({
          jenis: hubunganAwal.jenis,
          target: { id: d.id, judul: d.judul, nomor: d.nomor, tahun: d.tahun },
          catatan: '',
        });
      })
      .catch(() => setError('Peraturan yang akan diubah atau dicabut tidak ditemukan.'));
  }, [hubunganAwal]);

  function ubahJudul(nilai: string) {
    setTitle(nilai);
    if (!slugManual) setSlug(jadikanSlug(nilai));
    if (!kodeManual) setCode(jadikanSlug(nilai).toUpperCase().slice(0, 64));
  }

  async function create() {
    if (created) throw new Error('Draf ini sudah tersimpan. Buka detailnya atau pilih Unggah Dokumen Lain.');
    let result: { id: string; versionId: string };
    try {
      result = await ambilApi<{ id: string; versionId: string }>('/admin/documents', {
        method: 'POST',
        headers: csrfHeaders(csrfToken),
        muatan: {
          kodeDokumen: code,
          slug: slug.replace(/-+$/, ''),
          jenisDokumenId: type,
          ...(khusus ? { peruntukan: 'PERMOHONAN_SK' } : {}),
          versi: {
            judul: title,
            deskripsi: description.trim() || undefined,
            nomor: number || undefined,
            tahun: year ? Number(year) : undefined,
            pic: pic || undefined,
            tanggalPenetapan: date || undefined,
            tingkatAkses: access,
            kategoriId: category ? [category] : [],
          },
        },
      });
    } catch (e) {
      throw pesanGalat(e);
    }
    // Berkas utama diunggah setelah draf ada. Bila gagal, draf tetap tersimpan dan
    // berkas dapat diunggah ulang dari halaman detail.
    let unggah: string | undefined;
    if (file) {
      try {
        const data = new FormData();
        data.set('file', file);
        data.set('jenisBerkas', 'UTAMA');
        data.set('urutan', '0');
        await ambilApi(`/admin/documents/versions/${result.versionId}/files`, {
          method: 'POST',
          headers: csrfHeaders(csrfToken),
          muatan: data,
        });
        unggah = 'ok';
      } catch (e) {
        unggah = pesanGalat(e).message;
      }
    }
    // Hubungan dengan peraturan lama disimpan pada versi draf ini; statusnya
    // baru berubah saat dokumen ini terbit.
    let relasi: string | undefined;
    if (hubungan) {
      try {
        await ambilApi(`/admin/versions/${result.versionId}/relations`, {
          method: 'POST',
          headers: csrfHeaders(csrfToken),
          muatan: {
            targetDocumentId: hubungan.target.id,
            jenisRelasi: hubungan.jenis,
            ...(hubungan.catatan.trim() ? { catatan: hubungan.catatan.trim() } : {}),
          },
        });
        relasi = 'ok';
      } catch (e) {
        relasi = pesanGalat(e).message;
      }
    }
    setCreated({ ...result, unggah, relasi });
    setHasilTerbuka(true);
  }

  function unggahLagi() {
    setHasilTerbuka(false);
    setCreated(undefined);
    setTitle(judulAwal);
    setCode(jadikanSlug(judulAwal).toUpperCase().slice(0, 64));
    setSlug(jadikanSlug(judulAwal));
    setSlugManual(false);
    setKodeManual(false);
    setType(khusus ? types.find((j) => j.aktif !== false && jenisSop(j))?.id ?? '' : '');
    setDescription('');
    setAccess('publik');
    setNumber('');
    setYear('');
    setPic('');
    setDate('');
    setCategory('');
    setFile(undefined);
    setSeret(false);
    setAturAlamat(false);
    setCobaKirim(false);
    setError('');
    setHubungan(undefined);
    setFormKey((value) => value + 1);
    if (!hasilTerbuka) window.requestAnimationFrame(() => document.getElementById('doc-title')?.focus());
  }

  // Kolom wajib yang masih kosong; tombol Buat draf menyebutnya bila ditekan.
  const kosong = [
    !title.trim() && 'Judul',
    !type && 'Jenis dokumen',
    !code.trim() && 'Kode dokumen',
    !slug.replace(/-+$/, '').trim() && 'Slug URL',
    !number.trim() && 'Nomor',
    !year.trim() && 'Tahun',
    !pic.trim() && 'PIC',
    !date && 'Tanggal penetapan',
    !file && 'File dokumen utama',
  ].filter((x): x is string => Boolean(x));

  if (!aksesKhusus)
    return (
      <StateMessage title="Akses panel tidak tersedia">
        Unggah SOP Permohonan SK tersedia untuk Admin dan Superadmin aktif.
      </StateMessage>
    );

  const berkasGagal = !!created && created.unggah !== 'ok';
  const relasiGagal = !!created && !!hubungan && created.relasi !== 'ok';
  const ukuran = (byte: number) =>
    byte >= 1024 * 1024
      ? `${(byte / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
      : `${Math.max(1, Math.round(byte / 1024))} KB`;
  const kelengkapan = [
    { teks: 'Judul', ok: Boolean(title.trim()) },
    { teks: 'Jenis dokumen', ok: Boolean(type) },
    { teks: 'Kode & alamat halaman', ok: Boolean(code.trim() && slug.replace(/-+$/, '')) },
    {
      teks: 'Nomor, tahun, PIC dan tanggal',
      ok: Boolean(number.trim() && year.trim() && pic.trim() && date),
    },
    { teks: 'Satu file dokumen utama (wajib)', ok: Boolean(file) },
    ...(hubungan
      ? [
          {
            teks: `${hubungan.jenis === 'MENCABUT' ? 'Mencabut' : 'Mengubah'}: ${hubungan.target.judul}`,
            ok: true,
            opsional: true,
          },
        ]
      : []),
  ];

  return (
    <div className="halaman-panel mx-auto w-full">
      <PageTitle
        title={khusus ? 'Unggah SOP Permohonan SK' : 'Upload Dokumen Hukum'}
        description={
          khusus
            ? 'Pilih akses Publik atau Dosen/Staf. Ajukan draf untuk ditinjau Superadmin; Setelah disetujui, Superadmin menerbitkan SOP melalui tindakan terpisah.'
            : superadminAktif(pengguna)
              ? 'Simpan sebagai draf, setujui dari halaman detail, lalu terbitkan melalui Antrean Verifikasi.'
              : 'Simpan sebagai draf, lalu ajukan verifikasi dari halaman detail.'
        }
        meta={
          khusus ? (
            <Link
              href="/admin/sop-permohonan-sk"
              className="inline-flex items-center gap-1.5 font-medium text-slate-500 hover:text-tinta"
            >
              <ArrowLeft aria-hidden className="size-4" />
              SOP Permohonan SK
            </Link>
          ) : undefined
        }
      />
      {created && (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <span aria-hidden className={`grid size-9 shrink-0 place-items-center rounded-xl ${berkasGagal || relasiGagal ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
              {berkasGagal || relasiGagal ? <AlertTriangle className="size-4" /> : <Check className="size-4" />}
            </span>
            <p role="status" className="min-w-0 flex-1 text-sm text-slate-700">
              Draf tersimpan{berkasGagal || relasiGagal ? '; lengkapi dari halaman detail.' : ' dan berkas berhasil diunggah.'}
            </p>
            <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
              <Link href={`/admin/dokumen/pengajuan/${created.id}?versionId=${created.versionId}`} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-institusi-700 hover:underline">
                Buka Detail Draf <ArrowRight aria-hidden className="size-4" />
              </Link>
              <Button id="draft-upload-again" tone="secondary" ukuran="kecil" onClick={unggahLagi}>
                <Plus aria-hidden className="size-4" /> Unggah Dokumen Lain
              </Button>
            </div>
          </div>
          <Dialog open={hasilTerbuka} onOpenChange={setHasilTerbuka}>
            <DialogContent className="max-w-lg gap-5 p-5 sm:p-6"
              onOpenAutoFocus={(event) => { event.preventDefault(); judulHasil.current?.focus(); }}
              onCloseAutoFocus={(event) => {
                event.preventDefault();
                (document.getElementById('draft-upload-again') ?? document.getElementById('doc-title'))?.focus();
              }}>
              <DialogHeader>
                <span aria-hidden className={`mb-1 grid size-11 place-items-center rounded-2xl ${berkasGagal || relasiGagal ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                  {berkasGagal || relasiGagal ? <AlertTriangle className="size-5" /> : <Check className="size-5" strokeWidth={2.5} />}
                </span>
                <DialogTitle ref={judulHasil} tabIndex={-1} className="outline-none">Draf Berhasil Disimpan</DialogTitle>
                <DialogDescription>
                  {berkasGagal || relasiGagal
                    ? 'Draf aman tersimpan. Lengkapi bagian yang belum berhasil dari halaman detail.'
                    : superadminAktif(pengguna)
                      ? 'Buka detail untuk menyetujui draf, lalu terbitkan melalui Antrean Verifikasi.'
                      : 'Buka detail draf untuk mengajukan verifikasi kepada Superadmin.'}
                </DialogDescription>
              </DialogHeader>
              <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200">
                <div className="bg-slate-50/70 px-4 py-3.5">
                  <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">{khusus ? 'SOP Permohonan SK' : 'Dokumen Hukum'}</p>
                  <p className="mt-1 text-sm leading-6 font-semibold text-slate-900 [overflow-wrap:anywhere]">{title}</p>
                </div>
                <div className="flex items-center gap-3 border-t border-slate-200 px-4 py-3">
                  <FileText aria-hidden className="size-5 shrink-0 text-slate-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-700" title={file?.name}>{file?.name ?? 'Dokumen utama'}</p>
                    <p className={`mt-0.5 text-xs ${berkasGagal ? 'text-amber-700' : 'text-emerald-700'}`}>{berkasGagal ? 'Berkas belum terunggah' : 'Berkas berhasil diunggah'}</p>
                  </div>
                  {!berkasGagal && <Check aria-hidden className="size-4 shrink-0 text-emerald-600" />}
                </div>
              </div>
              {berkasGagal && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900 [overflow-wrap:anywhere]">{created.unggah ?? 'Unggah dokumen utama dari halaman detail draf.'}</p>}
              {hubungan && <p role={relasiGagal ? 'alert' : undefined} className={`text-sm leading-6 [overflow-wrap:anywhere] ${relasiGagal ? 'rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900' : 'text-slate-600'}`}>
                {relasiGagal
                  ? `Hubungan dengan “${hubungan.target.judul}” belum tersimpan (${created.relasi ?? 'galat'}). Tambahkan dari halaman Ubah Draf.`
                  : `Hubungan ${hubungan.jenis === 'MENCABUT' ? 'mencabut' : 'mengubah'} “${hubungan.target.judul}” tersimpan; statusnya berubah saat dokumen ini terbit.`}
              </p>}
              <p className="flex items-start gap-2 text-xs leading-5 text-slate-500"><Globe2 aria-hidden className="mt-0.5 size-3.5 shrink-0" />Dokumen belum tampil di portal sampai disetujui dan diterbitkan.</p>
              <DialogFooter>
                <Button tone="secondary" onClick={unggahLagi}><Plus aria-hidden className="size-4" /> Unggah Dokumen Lain</Button>
                <Link className={`${kelasTautanUtama} gap-2 rounded-xl!`} href={`/admin/dokumen/pengajuan/${created.id}?versionId=${created.versionId}`}>
                  Buka Detail Draf <ArrowRight aria-hidden className="size-4" />
                </Link>
              </DialogFooter>
              <Link className="justify-self-center text-xs font-medium text-slate-500 underline-offset-4 hover:text-institusi-700 hover:underline" href={khusus ? '/admin/sop-permohonan-sk' : '/admin/dokumen/pengajuan'}>
                {khusus ? 'Kembali ke SOP Permohonan SK' : 'Ke Daftar Draf'}
              </Link>
            </DialogContent>
          </Dialog>
        </>
      )}
      {error && (
        <div className="mb-4">
          <StateMessage title="Data form belum tersedia" kind="error">
            {error}
          </StateMessage>
        </div>
      )}
      <fieldset
        key={formKey}
        disabled={!!created || !pengguna?.izin.includes('documents.create')}
        className="formulir-panel grid min-w-0 grid-cols-[minmax(0,1fr)] items-start gap-5 [&>*]:min-w-0 lg:grid-cols-[minmax(0,1fr)_20rem]"
      >
        <Card>
          <div className="isian-dokumen grid gap-3">
            {hubungan && <PanelHubungan nilai={hubungan} onUbah={setHubungan} />}
            <Field
              label="Judul"
              id="doc-title"
              required
              placeholder="Isi dengan Judul Dokumen"
              value={title}
              onChange={(e) => ubahJudul(e.target.value)}
              maxLength={500}
            />
            <TextAreaField
              label="Deskripsi Singkat (opsional)"
              id="doc-description"
              rows={2}
              maxLength={1000}
              className="[&_textarea]:min-h-[4.25rem]"
              placeholder="Deskripsi singkat tentang dokumen"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <div className="grid gap-4 sm:grid-cols-3">
              <PemilihIsianPanel
                label="Jenis dokumen"
                id="doc-type"
                required
                value={type}
                disabled={khusus}
                title={khusus ? 'SOP Permohonan SK selalu berjenis SOP' : undefined}
                onValueChange={setType}
                ikon={FileText}
                placeholder="Pilih jenis"
                opsi={types.filter((x) => x.aktif !== false).map((x) => ({ value: x.id, label: x.nama }))}
              />
              <PemilihKategoriDokumen
                id="doc-category"
                value={category}
                onValueChange={setCategory}
                categories={categories}
              />
              <PemilihTingkatAkses id="doc-access" value={access} onValueChange={setAccess} />
            </div>

            {!khusus &&
              pengguna?.peran.includes('ADMIN') &&
              !pengguna.peran.includes('SUPERADMIN') && (
                <p className="-mt-2 text-xs text-slate-500">
                  Kategori boleh dikosongkan. Jika diperlukan, pilih kategori sesuai unit kerja akun Anda.
                </p>
              )}

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <Field
                label="Nomor"
                required
                id="doc-number"
                placeholder="Nomor dokumen"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
              />
              <Field
                label="Tahun"
                required
                id="doc-year"
                inputMode="numeric"
                maxLength={4}
                placeholder="mis. 2026"
                value={year}
                onChange={(e) => setYear(e.target.value.replace(/\D/g, ''))}
              />
              <Field
                label="Tanggal penetapan"
                required
                id="doc-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <Field
                label="PIC"
                required
                id="doc-pic"
                value={pic}
                onChange={(e) => setPic(e.target.value)}
              />
            </div>

            {/* Kode dan alamat terisi otomatis dari judul; cukup ditinjau, diubah bila perlu. */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-3.5 py-3">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm">
                <span className="min-w-0">
                  <span className="text-slate-500">Alamat </span>
                  <span className="font-mono text-[0.8125rem] text-slate-800 [overflow-wrap:anywhere]">
                    /produk-hukum/{slug || <span className="text-slate-400">…</span>}
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="text-slate-500">Kode </span>
                  <span className="font-mono text-[0.8125rem] text-slate-800 [overflow-wrap:anywhere]">
                    {code || <span className="text-slate-400">…</span>}
                  </span>
                </span>
                <button
                  type="button"
                  aria-expanded={aturAlamat}
                  aria-controls="atur-alamat"
                  onClick={() => setAturAlamat((x) => !x)}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[0.8125rem] font-semibold text-institusi-700 hover:bg-institusi-50"
                >
                  <Pencil aria-hidden className="size-3.5" />
                  {aturAlamat ? 'Selesai' : 'Ubah'}
                </button>
              </div>
              {!title && <p className="mt-1 text-xs text-slate-500">Terisi otomatis dari judul.</p>}
              {aturAlamat && (
                <div id="atur-alamat" className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Field
                    label="Kode dokumen"
                    id="doc-code"
                    required
                    placeholder="mis. SK-REK-2026-012"
                    value={code}
                    onChange={(e) => {
                      setKodeManual(true);
                      setCode(e.target.value);
                    }}
                    maxLength={64}
                  />
                  <Field
                    label="Slug URL"
                    id="doc-slug"
                    required
                    value={slug}
                    onChange={(e) => {
                      setSlugManual(true);
                      setSlug(rapikanSlugKetik(e.target.value));
                    }}
                    maxLength={160}
                  />
                  <p className="text-xs text-slate-500 sm:col-span-2">
                    Kode hanya untuk administrasi dan tidak tampil ke publik. Slug menjadi alamat
                    halaman dokumen di portal.
                  </p>
                </div>
              )}
            </div>
            {!hubungan && <PanelHubungan onUbah={setHubungan} />}
          </div>
        </Card>

        <Card className="asisten-dokumen lg:sticky lg:top-4">
          <h2 className="text-sm font-semibold text-slate-900">Dokumen utama</h2>
          <label
            htmlFor="doc-file"
            onDragOver={(e) => {
              e.preventDefault();
              setSeret(true);
            }}
            onDragLeave={() => setSeret(false)}
            onDrop={(e) => {
              e.preventDefault();
              setSeret(false);
              if (e.dataTransfer.files.length !== 1) {
                setError('Pilih tepat satu file dokumen untuk setiap pengajuan.');
                return;
              }
              const berkas = e.dataTransfer.files[0];
              if (berkas && POLA_BERKAS_DITERIMA.test(berkas.name)) setFile(berkas);
            }}
            className={`panel-upload mt-3 flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors duration-150 focus-within:ring-3 focus-within:ring-institusi-500/20 ${seret ? 'border-institusi-400 bg-institusi-50' : 'border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-white'}`}
          >
            <span
              aria-hidden
              className="grid size-10 place-items-center rounded-full bg-white text-institusi-600 shadow-[0_1px_3px_rgb(23_35_64/0.12)]"
            >
              <UploadCloud className="size-5" />
            </span>
            <span className="text-sm font-semibold text-slate-800">Pilih berkas</span>
            <span className="text-xs text-slate-500">
              {LABEL_JENIS_BERKAS} · wajib satu file · gabungkan lampiran di dalamnya
            </span>
            <input
              id="doc-file"
              type="file"
              accept={TERIMA_BERKAS}
              onChange={(e) => setFile(e.target.files?.[0])}
              className="sr-only"
            />
          </label>
          {file && (
            <div className="mt-2 flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2">
              <FileText aria-hidden className="size-4 shrink-0 text-institusi-600" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-900">
                  {file.name}
                </span>
                <span className="block text-xs text-slate-500">{ukuran(file.size)}</span>
              </span>
              <button
                type="button"
                aria-label="Batalkan berkas"
                onClick={() => setFile(undefined)}
                className="grid size-7 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X aria-hidden className="size-4" />
              </button>
            </div>
          )}

          <h2 className="mt-5 text-sm font-semibold text-slate-900">Kelengkapan</h2>
          <ul className="mt-2 grid gap-1.5 text-sm">
            {kelengkapan.map((k) => (
              <li key={k.teks} className="flex items-center gap-2.5">
                <span
                  aria-hidden
                  className={`grid size-4.5 shrink-0 place-items-center rounded-full transition-colors duration-200 ${k.ok ? 'bg-emerald-500 text-white' : 'ring-1 ring-slate-300 ring-inset'}`}
                >
                  {k.ok && <Check className="size-3" strokeWidth={3} />}
                </span>
                <span className={k.ok ? 'text-slate-800' : 'text-slate-500'}>{k.teks}</span>
                <span className="sr-only">
                  {k.ok ? 'sudah' : k.opsional ? 'belum, opsional' : 'belum'}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-5 grid gap-3">
            {cobaKirim && kosong.length > 0 && (
              <p
                role="alert"
                className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900"
              >
                Lengkapi dulu: {kosong.join(', ')}.
              </p>
            )}
            {created ? (
              <p className="text-sm leading-6 text-slate-500">Draf sudah tersimpan. Buka detailnya untuk melanjutkan.</p>
            ) : kosong.length > 0 ? (
              <Button
                type="button"
                className="w-full"
                onClick={() => {
                  setCobaKirim(true);
                  if (kosong.some((k) => k === 'Kode dokumen' || k === 'Slug URL'))
                    setAturAlamat(true);
                }}
              >
                Buat draf
              </Button>
            ) : (
              <ConfirmAction
                label="Buat draf" icon={FilePen}
                title="Buat draf dokumen?"
                description={[
                  file
                    ? `Draf dibuat lalu berkas ${file.name} diunggah sebagai dokumen utama.`
                    : 'Draf ini belum dapat diakses sebagai dokumen terbit. Pastikan data dasarnya benar.',
                  hubungan &&
                    `Dokumen ini akan ${hubungan.jenis === 'MENCABUT' ? 'mencabut' : 'mengubah'} "${hubungan.target.judul}" setelah terbit.`,
                ]
                  .filter(Boolean)
                  .join(' ')}
                onConfirm={create}
              />
            )}
          </div>
        </Card>
      </fieldset>
    </div>
  );
}
