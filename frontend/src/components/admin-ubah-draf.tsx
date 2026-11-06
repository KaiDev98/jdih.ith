'use client';

import Link from '@/components/admin/tautan-panel';
import { useCallback, useEffect, useState } from 'react';
import type { KemampuanDokumenAdmin, Relasi, PilihanKategoriDokumen } from '@jdih/shared';
import { ArrowLeft, Check, ChevronDown, Copy, FilePen, FileText, Paperclip, Search, Link2, Save, Trash2, UploadCloud } from 'lucide-react';
import { PemilihKategoriDokumen } from './admin/pemilih-kategori-dokumen';
import { PemilihTingkatAkses } from './admin/pemilih-tingkat-akses';
import { ambilApi, ambilApiBerdaftar, GalatApi } from '@/lib/api-client';
import { csrfHeaders, useSession } from '@/lib/sesi';
import {
  LABEL_JENIS_BERKAS,
  LABEL_RELASI,
  LABEL_TAHAP,
  TAHAP_BISA_DIUBAH,
  TERIMA_BERKAS,
  ukuranBerkas,
} from '@/lib/label-dokumen';
import {
  Badge,
  Button,
  Card,
  ConfirmAction,
  Field,
  PageTitle,
  StateMessage,
  TextAreaField,
} from '@/components/ui';
import { PratinjauFormat } from './pratinjau-format';
import styles from './admin-ubah-draf.module.css';

type Versi = Pick<KemampuanDokumenAdmin, 'bolehUbah'> & {
  id: string;
  versionId: string;
  nomorVersi: number;
  statusWorkflow: string;
  tingkatAkses: string;
  judul: string;
  deskripsi: string | null;
  nomor: string | null;
  tahun: number | null;
  pic: string | null;
  tanggalPenetapan: string | null;
  kategoriId?: string[];
};
type Berkas = {
  id: string;
  jenisBerkas: 'UTAMA' | 'LAMPIRAN';
  judul: string | null;
  namaAsli: string;
  sizeBytes: string;
  mimeType: string;
  bolehHapus: boolean | number;
};
type HasilCari = { id: string; judul: string; nomor: string | null; tipe: string };

const LABEL_RUAS: Record<string, string> = {
  judul: 'Judul',
  deskripsi: 'Deskripsi singkat',
  nomor: 'Nomor',
  tahun: 'Tahun',
  pic: 'PIC',
  tanggalPenetapan: 'Tanggal penetapan',
  tingkatAkses: 'Akses',
};

/** Galat API dengan nama kolom yang dipahami pengguna. */
function pesanGalat(error: unknown) {
  if (error instanceof GalatApi && error.butir?.length)
    return new Error(
      error.butir.map((b) => `${LABEL_RUAS[b.ruas] ?? b.ruas}: ${b.pesan}`).join(' · '),
    );
  return error instanceof Error ? error : new Error('Permintaan gagal. Coba lagi.');
}

/**
 * Halaman ubah draf: semua yang dikerjakan selama dokumen masih draf/perlu
 * diperbaiki, yaitu data dokumen, berkas, dan hubungan dengan dokumen lain.
 */
export function AdminUbahDraf({ id }: { id: string }) {
  const { pengguna } = useSession();
  const [versi, setVersi] = useState<Versi>();
  const [galat, setGalat] = useState('');
  const [muatUlang, setMuatUlang] = useState(0);

  useEffect(() => {
    ambilApi<{ document: Versi; kategoriId: string[] }>(`/admin/documents/${id}`)
      .then((d) => setVersi({ ...d.document, kategoriId: d.kategoriId }))
      .catch((e: unknown) =>
        setGalat(e instanceof GalatApi ? e.message : 'Dokumen tidak dapat dimuat.'),
      );
  }, [id, muatUlang]);

  if (galat)
    return (
      <StateMessage title="Dokumen tidak dapat dibuka" kind="error">
        {galat}
      </StateMessage>
    );
  if (!versi) return <StateMessage title="Memuat dokumen…" />;

  const izin = pengguna?.izin ?? [];
  const tahap = LABEL_TAHAP[versi.statusWorkflow] ?? {
    teks: versi.statusWorkflow,
    warna: 'slate' as const,
  };
  const kembali = (
    <Link
      className="mr-1 inline-flex items-center gap-1.5 font-medium text-slate-500 hover:text-tinta"
      href={`/admin/dokumen/${id}?versionId=${versi.versionId}`}
    >
      <ArrowLeft aria-hidden className="size-4" />
      Detail Dokumen
    </Link>
  );

  if (!TAHAP_BISA_DIUBAH.includes(versi.statusWorkflow))
    return (
      <div className="mx-auto max-w-3xl">
        <PageTitle title="Ubah Dokumen" meta={kembali} />
        <StateMessage title={`Dokumen ini sedang berstatus "${tahap.teks}"`}>
          Hanya draf yang bisa diubah. Untuk mengubah dokumen yang sudah terbit, pakai tombol{' '}
          <strong>Buat revisi</strong> di halaman detail.
        </StateMessage>
      </div>
    );

  return (
    <div className="halaman-panel mx-auto w-full max-w-6xl">
      <PageTitle
        title="Ubah Dokumen"
        description={`${versi.judul} · versi ${versi.nomorVersi}`}
        meta={
          <>
            {kembali}
            <Badge color={tahap.warna}>{tahap.teks}</Badge>
          </>
        }
      />
      <fieldset disabled={!versi.bolehUbah} className={`${styles.editor} ${izin.includes('documents.edit') ? styles.withData : ''}`}>
          {izin.includes('documents.edit') && (
            <div className={styles.data}>
            <BagianData key={versi.versionId} versi={versi} onTersimpan={() => setMuatUlang((x) => x + 1)} />
            </div>
          )}
          <aside className={styles.side} aria-label="Berkas dan Hubungan Dokumen">
          <div className={styles.sideContent} data-gulir-panel tabIndex={0} role="region" aria-label="Daftar Berkas dan Hubungan Dokumen">
          <BagianBerkas key={versi.versionId} versionId={versi.versionId} nomorVersi={versi.nomorVersi} bolehUnggah={izin.includes('documents.upload')} bolehPakaiAsli={izin.includes('documents.revise')} />
          {izin.includes('legal.manage_relations') && (
            <BagianHubungan
              key={versi.versionId}
              dokumenId={id}
              versionId={versi.versionId}
              internal={versi.tingkatAkses === 'internal'}
            />
          )}
          </div>
          </aside>
        <div className={styles.footer}>
          <Link
            href={`/admin/dokumen/${id}`}
            className="tekan inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-tinta px-5 text-sm font-semibold text-white hover:bg-[#1d3461]"
          >
            <Check aria-hidden className="size-4" /> Selesai, Kembali ke Detail
          </Link>
        </div>
      </fieldset>
    </div>
  );
}

/** 1. Data dokumen: judul, deskripsi, nomor, tahun, PIC, tanggal, dan akses. */
function BagianData({ versi, onTersimpan }: { versi: Versi; onTersimpan: () => void }) {
  const { csrfToken } = useSession();
  const [categories, setCategories] = useState<PilihanKategoriDokumen[]>([]);
  const [category, setCategory] = useState(versi.kategoriId?.[0] ?? '');
  const [galatKategori, setGalatKategori] = useState('');
  useEffect(() => {
    let aktif = true;
    void ambilApi<PilihanKategoriDokumen[]>('/admin/document-options/kategori')
      .then((r) => { if (aktif) setCategories(r); })
      .catch(() => { if (aktif) setGalatKategori('Pilihan kategori belum dapat dimuat. Muat ulang halaman.'); });
    return () => { aktif = false; };
  }, []);
  const [form, setForm] = useState({
    judul: versi.judul,
    deskripsi: versi.deskripsi ?? '',
    nomor: versi.nomor ?? '',
    tahun: versi.tahun == null ? '' : String(versi.tahun),
    pic: versi.pic ?? '',
    tanggalPenetapan: versi.tanggalPenetapan?.slice(0, 10) ?? '',
    tingkatAkses: versi.tingkatAkses === 'internal' ? 'internal' : 'publik',
  });
  const ubah = (kunci: keyof typeof form, nilai: string) =>
    setForm((f) => ({ ...f, [kunci]: nilai }));

  async function simpan() {
    try {
      await ambilApi(`/admin/documents/versions/${versi.versionId}`, {
        method: 'PATCH',
        headers: csrfHeaders(csrfToken),
        muatan: {
          judul: form.judul,
          deskripsi: form.deskripsi.trim() || null,
          nomor: form.nomor || null,
          tahun: form.tahun ? Number(form.tahun) : null,
          pic: form.pic || null,
          tanggalPenetapan: form.tanggalPenetapan || null,
          tingkatAkses: form.tingkatAkses,
          kategoriId: category ? [category] : [],
        },
      });
    } catch (e) {
      throw pesanGalat(e);
    }
    onTersimpan();
  }

  return (
    <Card>
      <h2 className="flex items-center gap-2 text-sm font-semibold"><FilePen aria-hidden className="size-4 text-slate-500" />Data Dokumen</h2>
      <p className="mt-1 text-sm text-slate-600">
        Perbarui data draf. Deskripsi dan kategori boleh dikosongkan.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4">
        <Field
          className="col-span-2"
          label="Judul"
          id="ubah-judul"
          placeholder="Isi dengan Judul Dokumen"
          maxLength={500}
          value={form.judul}
          onChange={(e) => ubah('judul', e.target.value)}
        />
        <div className="col-span-2 grid gap-1">
          <TextAreaField
            label="Deskripsi Singkat (opsional)"
            id="ubah-deskripsi"
            maxLength={1000}
            rows={2}
            className="[&_textarea]:min-h-[4.25rem]"
            placeholder="Deskripsi singkat tentang dokumen"
            value={form.deskripsi}
            onChange={(e) => ubah('deskripsi', e.target.value)}
          />
          <p className="text-xs text-slate-500">
            Boleh dikosongkan. Jika diisi, ringkasan tampil di bawah judul pada halaman publik.
            {form.deskripsi.length > 0 && ` ${String(form.deskripsi.length)}/1000`}
          </p>
        </div>
        <Field
          label="Nomor"
          id="ubah-nomor"
          value={form.nomor}
          onChange={(e) => ubah('nomor', e.target.value)}
        />
        <Field
          label="Tahun"
          id="ubah-tahun"
          inputMode="numeric"
          maxLength={4}
          value={form.tahun}
          onChange={(e) => ubah('tahun', e.target.value.replace(/\D/g, ''))}
        />
        <Field
          label="PIC (penanggung jawab)"
          id="ubah-pic"
          value={form.pic}
          onChange={(e) => ubah('pic', e.target.value)}
        />
        <Field
          label="Tanggal penetapan"
          id="ubah-tanggal"
          type="date"
          value={form.tanggalPenetapan}
          onChange={(e) => ubah('tanggalPenetapan', e.target.value)}
        />
        <div className="col-span-2 sm:col-span-1"><PemilihKategoriDokumen
          id="ubah-kategori"
          value={category}
          onValueChange={setCategory}
          categories={categories}
        />
        {galatKategori && <p role="alert" className="text-sm text-red-700">{galatKategori}</p>}</div>
        <div className="col-span-2 sm:col-span-1"><PemilihTingkatAkses
          id="ubah-akses"
          value={form.tingkatAkses === 'internal' ? 'internal' : 'publik'}
          onValueChange={(value) => ubah('tingkatAkses', value)}
        /></div>
      </div>
      <div className="mt-4 flex justify-end [&>div]:w-full sm:[&>div]:w-auto">
        <ConfirmAction
          label="Simpan data" icon={Save}
          title="Simpan perubahan data dokumen?"
          description="Perubahan hanya berlaku pada draf ini dan belum tampil di publik."
          disabled={!form.judul.trim()}
          onConfirm={simpan}
        />
      </div>
    </Card>
  );
}

/** 2. Satu file utama; lampiran lama tetap terlihat untuk koreksi draf. */
function BagianBerkas({ versionId, nomorVersi, bolehUnggah, bolehPakaiAsli }: { versionId: string; nomorVersi: number; bolehUnggah: boolean; bolehPakaiAsli: boolean }) {
  const { csrfToken } = useSession();
  const [berkas, setBerkas] = useState<Berkas[]>();
  const [utama, setUtama] = useState<File>();
  const [galat, setGalat] = useState('');

  const muat = useCallback(() => {
    ambilApi<Berkas[]>(`/admin/documents/versions/${versionId}/files`)
      .then((rows) => { setBerkas(rows); setGalat(''); })
      .catch((e: unknown) => setGalat(e instanceof Error ? e.message : 'Berkas belum dapat dimuat.'));
  }, [versionId]);
  useEffect(muat, [muat]);

  async function unggah(file: File, jenis: 'UTAMA' | 'LAMPIRAN', judul?: string) {
    const data = new FormData();
    data.set('file', file);
    data.set('jenisBerkas', jenis);
    if (judul?.trim()) data.set('judul', judul.trim());
    data.set('urutan', '0');
    try {
      await ambilApi(`/admin/documents/versions/${versionId}/files`, {
        method: 'POST',
        headers: csrfHeaders(csrfToken),
        muatan: data,
      });
    } catch (e) {
      throw pesanGalat(e);
    }
    muat();
  }

  async function hapus(fileId: string) {
    await ambilApi(`/admin/documents/versions/${versionId}/files/${fileId}`, {
      method: 'DELETE',
      headers: csrfHeaders(csrfToken),
    });
    muat();
  }

  const fileUtama = berkas?.find((b) => b.jenisBerkas === 'UTAMA');
  const daftarLampiran = berkas?.filter((b) => b.jenisBerkas === 'LAMPIRAN') ?? [];
  const kelasInput =
    'w-full min-w-0 cursor-pointer text-sm text-slate-600 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-slate-700 file:ring-1 file:ring-slate-300 hover:file:bg-slate-50';

  const baris = (b: Berkas, Ikon: typeof FileText) => (
    <li
      key={b.id}
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-3"
    >
      <span className="flex min-w-0 flex-1 items-center gap-3 text-sm">
        <Ikon aria-hidden className="size-5 shrink-0 text-slate-500" />
        <span className="min-w-0">
          <span className="block font-medium [overflow-wrap:anywhere]">
            {b.judul ?? b.namaAsli}
          </span>
          <span className="block text-xs text-slate-500">
            {b.judul ? `${b.namaAsli} · ` : ''}
            {ukuranBerkas(b.sizeBytes)}
          </span>
        </span>
      </span>
      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
        <PratinjauFormat nama={b.namaAsli} canPreview={b.mimeType === 'application/pdf'} fallbackLabel="Unduh"
          previewUrl={`/api/v1/admin/documents/versions/${versionId}/files/${b.id}?mode=inline`}
          downloadUrl={`/api/v1/admin/documents/versions/${versionId}/files/${b.id}`} />
      {bolehUnggah && Number(b.bolehHapus) === 1 ? (
        <ConfirmAction
          label="Hapus" icon={Trash2}
          ukuran="kecil"
          tone="danger"
          title="Hapus berkas ini?"
          description={`${b.namaAsli} dilepas dari draf ini agar dapat diganti. Berkas versi sebelumnya tetap tersimpan.`}
          confirmLabel="Ya, hapus"
          onConfirm={() => hapus(b.id)}
        />
      ) : null}
      </div>
    </li>
  );

  if (galat) return <Card><StateMessage title="Berkas Belum Dapat Dimuat" kind="error">{galat}<Button tone="secondary" ukuran="kecil" onClick={() => { setGalat(''); muat(); }}>Coba Lagi</Button></StateMessage></Card>;

  return (
    <Card>
      <h2 className="flex items-center gap-2 text-sm font-semibold"><FileText aria-hidden className="size-4 text-slate-500" />Berkas</h2>
      <p className="mt-1 text-xs leading-5 text-slate-500">
        Format {LABEL_JENIS_BERKAS}. PDF mendukung pratinjau.
      </p>

      <h3 className="mt-4 text-sm font-medium">Dokumen Utama</h3>
      <p className="mt-1 text-xs leading-5 text-slate-500">
        {fileUtama ? 'Dokumen asli sudah terisi dan tetap digunakan jika hanya datanya yang direvisi. Jika ingin mengganti dokumen, hapus berkas draf ini lalu unggah penggantinya. Versi terbit tetap utuh.' : 'Unggah satu berkas utama sebelum mengajukan verifikasi. Revisi baru otomatis menyertakan berkas versi sebelumnya jika tersedia.'}
      </p>
      {berkas === undefined ? (
        <p className="mt-3 text-sm text-slate-500">Memuat…</p>
      ) : fileUtama ? (
        <ul className="mt-3">{baris(fileUtama, FileText)}</ul>
      ) : bolehUnggah ? (
        <div className="mt-3 grid gap-3">
          {nomorVersi > 1 && bolehPakaiAsli && <ConfirmAction label="Gunakan Dokumen Asli" icon={Copy} tone="secondary" ukuran="kecil"
            title="Gunakan dokumen asli untuk revisi ini?" description="Berkas versi terbit sebelumnya disalin ke draf revisi. Versi terbit tetap utuh."
            onConfirm={async () => { await ambilApi(`/admin/documents/versions/${versionId}/reuse-main`, { method: 'POST', headers: csrfHeaders(csrfToken), muatan: {} }); muat(); }} />}
          <input
            id="unggah-utama"
            type="file"
            accept={TERIMA_BERKAS}
            aria-label="Pilih berkas dokumen utama"
            onChange={(e) => setUtama(e.target.files?.[0])}
            className={kelasInput}
          />
          <ConfirmAction
            label="Unggah dokumen utama" icon={UploadCloud}
            title="Unggah dokumen utama?"
            description={`${utama?.name ?? ''} diunggah sebagai dokumen utama.`}
            disabled={!utama}
            onConfirm={async () => {
              if (utama) await unggah(utama, 'UTAMA');
              setUtama(undefined);
            }}
          />
        </div>
      ) : (
        <p className="mt-3 text-sm text-amber-800">Belum ada dokumen utama.</p>
      )}

      {daftarLampiran.length > 0 && <div className="mt-5">
        <p className="text-sm text-amber-900">Berkas lama: gabungkan lampiran dalam satu file utama sebelum mengajukan ulang.</p>
        <ul className="mt-3 grid gap-2">{daftarLampiran.map((b) => baris(b, Paperclip))}</ul>
      </div>}
    </Card>
  );
}

/** Hubungan yang mengubah status dokumen lain dan karena itu bisa diberi alasan. */
const RELASI_BERALASAN = ['MENCABUT', 'MENGUBAH'];

/** 3. Hubungan dengan dokumen lain: cari lewat judul, pilih jenis hubungan. */
function BagianHubungan({
  dokumenId,
  versionId,
  internal,
}: {
  dokumenId: string;
  versionId: string;
  internal: boolean;
}) {
  const { csrfToken } = useSession();
  const [relasi, setRelasi] = useState<(Relasi & { judulTarget?: string })[]>([]);
  const [cari, setCari] = useState('');
  const [hasil, setHasil] = useState<HasilCari[]>([]);
  const [pilihan, setPilihan] = useState<HasilCari>();
  const [jenis, setJenis] = useState('MENCABUT');
  const [alasan, setAlasan] = useState('');
  const beralasan = RELASI_BERALASAN.includes(jenis);

  const muat = useCallback(() => {
    ambilApi<Relasi[]>(`/admin/versions/${versionId}/relations`)
      .then(async (rows) => {
        const lengkap = await Promise.all(
          rows.map(async (r) => {
            const judulTarget = await ambilApi<{ document: { judul: string } }>(
              `/admin/documents/${r.targetDocumentId}`,
            )
              .then((d) => d.document.judul)
              .catch(() => undefined);
            return { ...r, judulTarget };
          }),
        );
        setRelasi(lengkap);
      })
      .catch(() => setRelasi([]));
  }, [versionId]);
  useEffect(muat, [muat]);

  useEffect(() => {
    if (cari.trim().length < 2) return;
    let aktif = true;
    const jeda = setTimeout(() => {
      ambilApiBerdaftar<HasilCari>(beralasan ? '/admin/documents/relation-targets' : '/admin/documents', {
        kueri: { q: cari.trim(), halaman: 1, perHalaman: 8 },
      })
        .then((r) => {
          if (aktif) setHasil(r.data.filter((d) => d.id !== dokumenId));
        })
        .catch(() => {
          if (aktif) setHasil([]);
        });
    }, 250);
    return () => {
      aktif = false;
      clearTimeout(jeda);
    };
  }, [cari, dokumenId, beralasan]);

  async function tambah() {
    if (!pilihan) return;
    await ambilApi(`/admin/versions/${versionId}/relations`, {
      method: 'POST',
      headers: csrfHeaders(csrfToken),
      muatan: {
        targetDocumentId: pilihan.id,
        jenisRelasi: jenis,
        ...(beralasan && alasan.trim() ? { catatan: alasan.trim() } : {}),
      },
    });
    setPilihan(undefined);
    setAlasan('');
    setCari('');
    setHasil([]);
    muat();
  }

  async function hapus(relasiId: string) {
    await ambilApi(`/admin/versions/${versionId}/relations/${relasiId}`, {
      method: 'DELETE',
      headers: csrfHeaders(csrfToken),
    });
    muat();
  }

  return (
    <Card className="p-0! sm:p-0!">
      <details className="group" open={relasi.length > 0 || undefined}>
        <summary className="flex min-h-14 cursor-pointer list-none items-center gap-2 px-5 py-4 [&::-webkit-details-marker]:hidden sm:px-6">
          <Link2 aria-hidden className="size-4 shrink-0 text-slate-500" />
          <h2 className="text-sm font-semibold">Hubungan dengan Dokumen Lain</h2>
          <span className="text-xs text-slate-400">Opsional</span>
          <ChevronDown aria-hidden className="ml-auto size-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
        </summary>
      <div className="border-t border-sekat px-5 pt-4 pb-5 sm:px-6">
      <p className="text-xs leading-5 text-slate-500">
        Tambahkan jika dokumen mengubah, mencabut, atau mengacu pada dokumen lain. Dampaknya dikonfirmasi sebelum terbit.
      </p>

      {relasi.length > 0 && (
        <ul className="mt-4 grid gap-2">
          {relasi.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm"
            >
              <span className="min-w-0">
                Dokumen ini{' '}
                <strong>
                  {(LABEL_RELASI[r.jenisRelasi]?.teks ?? r.jenisRelasi).toLowerCase()}
                </strong>{' '}
                <span className="font-medium">
                  {r.judulTarget ?? `dokumen #${r.targetDocumentId}`}
                </span>
                {r.catatan && (
                  <span className="mt-1 block text-slate-600">Alasan: {r.catatan}</span>
                )}
              </span>
              <ConfirmAction
                label="Hapus" icon={Trash2}
                tone="danger"
                title="Hapus hubungan ini?"
                description="Hubungan dihapus dari draf ini."
                confirmLabel="Ya, hapus"
                onConfirm={() => hapus(r.id)}
              />
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 grid gap-4">
        <div className="grid gap-1.5">
          <label htmlFor="cari-dokumen-lain" className="text-sm font-medium text-slate-800">
            Cari dokumen lain berdasarkan judul atau nomor
          </label>
          <div className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 focus-within:border-sky-400 focus-within:ring-3 focus-within:ring-sky-100">
            <Search aria-hidden className="size-4 text-slate-400" />
            <input
              id="cari-dokumen-lain"
              type="search"
              placeholder="Ketik minimal 2 huruf"
              value={cari}
              onChange={(e) => {
                setCari(e.target.value);
                setPilihan(undefined);
                if (e.target.value.trim().length < 2) setHasil([]);
              }}
              className="min-h-10 w-full border-0 bg-transparent outline-none"
            />
          </div>
          {!pilihan && hasil.length > 0 && (
            <ul className="grid gap-1 rounded-md border border-slate-200 p-1">
              {hasil.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => setPilihan(d)}
                    className="w-full rounded px-3 py-2 text-left text-sm hover:bg-institusi-50"
                  >
                    <span className="font-medium">{d.judul}</span>
                    <span className="block text-xs text-slate-500">
                      {d.tipe}
                      {d.nomor ? ` · No. ${d.nomor}` : ''}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!pilihan && cari.trim().length >= 2 && hasil.length === 0 && (
            <p className="text-sm text-slate-500">Tidak ada dokumen yang cocok.</p>
          )}
        </div>

        {pilihan && (
          <div className="grid gap-3 rounded-lg border border-institusi-200 bg-institusi-50 p-4">
            <p className="text-sm">
              Dipilih: <strong>{pilihan.judul}</strong>{' '}
              <button
                type="button"
                className="ml-1 underline"
                onClick={() => setPilihan(undefined)}
              >
                ganti
              </button>
            </p>
            <fieldset className="grid gap-2">
              <legend className="mb-1 text-sm font-medium">Dokumen ini…</legend>
              {Object.entries(LABEL_RELASI).map(([kode, info]) => (
                <label
                  key={kode}
                  className="flex cursor-pointer gap-3 rounded-md border border-slate-200 bg-white p-3 text-sm has-[:checked]:border-institusi-600"
                >
                  <input
                    type="radio"
                    name="jenis-hubungan"
                    value={kode}
                    checked={jenis === kode}
                    onChange={() => setJenis(kode)}
                    className="mt-0.5 accent-institusi-600"
                  />
                  <span>
                    <span className="font-semibold">
                      {info.teks} &ldquo;{pilihan.judul}&rdquo;
                    </span>
                    <span className="block text-slate-600">{info.akibat}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            {beralasan && (
              <div className="grid gap-1">
                <TextAreaField
                  label={`Alasan ${jenis === 'MENCABUT' ? 'dicabut' : 'diubah'} (opsional)`}
                  id="alasan-hubungan"
                  maxLength={1000}
                  rows={2}
                  placeholder="mis. Disesuaikan dengan Statuta ITH yang baru."
                  value={alasan}
                  onChange={(e) => setAlasan(e.target.value)}
                />
                <p className="text-xs text-slate-600">
                  {internal
                    ? 'Dokumen ini khusus Dosen/Staf, jadi alasan hanya terlihat oleh Dosen/Staf yang masuk.'
                    : `Tampil di halaman "${pilihan.judul}" pada panel Keterangan status.`}
                </p>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <ConfirmAction
                label="Tambahkan hubungan" icon={Link2}
                title="Tambahkan hubungan ini?"
                description={`Dokumen ini ${(LABEL_RELASI[jenis]?.teks ?? '').toLowerCase()} "${pilihan.judul}". ${LABEL_RELASI[jenis]?.akibat ?? ''}`}
                onConfirm={tambah}
              />
              <Button type="button" tone="secondary" onClick={() => setPilihan(undefined)}>
                Batal
              </Button>
            </div>
          </div>
        )}
      </div>
      </div>
      </details>
    </Card>
  );
}
