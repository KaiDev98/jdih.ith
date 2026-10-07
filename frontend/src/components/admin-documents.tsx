'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ambilApi, ambilApiBerdaftar, GalatApi } from '@/lib/api-client';
import { useSession, csrfHeaders } from '@/lib/sesi';
import {
  Button,
  Card,
  ConfirmAction,
  Field,
  PageTitle,
  SelectField,
  StateMessage,
  TextAreaField,
} from '@/components/ui';

type Master = { id: string; nama: string; aktif?: boolean };
type AdminDocumentRow = {
  id: string;
  versionId: string;
  judul: string;
  nomor: string | null;
  tahun: number | null;
  tipe: string;
  tingkatAkses: string;
  statusWorkflow: string;
  statusHukum: string;
};
export function AdminDocuments() {
  return <DaftarDokumenAdmin />;
}

export function DaftarDokumenAdmin({ verificationOnly = false }: { verificationOnly?: boolean }) {
  const [rows, setRows] = useState<readonly AdminDocumentRow[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  useEffect(() => {
    let current = true;
    void ambilApiBerdaftar<AdminDocumentRow>(
      verificationOnly ? '/admin/documents/verification-queue' : '/admin/documents',
      {
        kueri: {
          halaman: page,
          perHalaman: 30,
          q: query || undefined,
          statusWorkflow: verificationOnly ? undefined : status || undefined,
        },
      },
    )
      .then((r) => {
        if (current) {
          setRows(r.data);
          setTotalPages(r.meta.totalHalaman);
          setError('');
        }
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
  }, [query, status, verificationOnly, refresh, page]);
  return (
    <div className="mx-auto max-w-6xl">
      <PageTitle
        title={verificationOnly ? 'Antrean verifikasi dokumen' : 'Dokumen Hukum'}
        description={
          verificationOnly
            ? 'Versi berstatus DIAJUKAN yang dapat ditinjau sesuai izin Anda.'
            : 'Daftar semua versi dokumen dengan filter status workflow.'
        }
        action={
          !verificationOnly && (
            <Link
              href="/admin/dokumen/baru"
              className="inline-flex min-h-11 items-center rounded-md bg-institusi-600 px-4 font-semibold text-white"
            >
              Buat dokumen
            </Link>
          )
        }
      />
      <Card>
        <form
          className="mb-4 grid gap-3 sm:grid-cols-[1fr_220px_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            setLoading(true);
            setRefresh((x) => x + 1);
          }}
        >
          <Field
            className="min-w-0"
            label="Cari judul, nomor, atau slug"
            id="admin-doc-q"
            value={query}
            onChange={(e) => {
              setLoading(true);
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Kata kunci"
          />
          {!verificationOnly && (
            <SelectField
              label="Status workflow"
              id="admin-doc-status"
              value={status}
              onChange={(e) => {
                setLoading(true);
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Semua status</option>
              {['DRAF', 'DIAJUKAN', 'REVISI', 'DISETUJUI', 'TERBIT', 'DITARIK'].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </SelectField>
          )}
          <div className="self-end">
            <Button type="submit">Muat ulang</Button>
          </div>
        </form>
        {error && (
          <StateMessage title="Daftar gagal dimuat" kind="error">
            {error}
          </StateMessage>
        )}
        {loading && <StateMessage title="Memuat dokumen…" />}
        {!loading && !error && rows.length === 0 && (
          <StateMessage title="Tidak ada dokumen">
            Tidak ada baris yang cocok dengan filter.
          </StateMessage>
        )}
        {!loading && !error && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b text-slate-600">
                  <th className="py-3">Dokumen</th>
                  <th>Jenis / nomor</th>
                  <th>Akses</th>
                  <th>Status workflow</th>
                  <th>Status hukum</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => (
                  <tr key={r.versionId}>
                    <td className="py-3">
                      <Link
                        className="font-semibold text-institusi-900 underline"
                        href={`/admin/dokumen/${r.id}?versionId=${r.versionId}`}
                      >
                        {r.judul}
                      </Link>
                      <div className="text-xs text-slate-500">Versi ID {r.versionId}</div>
                    </td>
                    <td>
                      {r.tipe} · {r.nomor ?? '—'} · {r.tahun ?? '—'}
                    </td>
                    <td>{r.tingkatAkses.toUpperCase()}</td>
                    <td>{r.statusWorkflow}</td>
                    <td>{r.statusHukum}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <Button
              tone="secondary"
              disabled={page <= 1 || loading}
              onClick={() => {
                setLoading(true);
                setPage((p) => p - 1);
              }}
            >
              Sebelumnya
            </Button>
            <span className="text-sm">
              Halaman {page} dari {totalPages}
            </span>
            <Button
              tone="secondary"
              disabled={page >= totalPages || loading}
              onClick={() => {
                setLoading(true);
                setPage((p) => p + 1);
              }}
            >
              Berikutnya
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

export function AdminVerificationQueue() {
  return <DaftarDokumenAdmin verificationOnly />;
}

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

/** Slug URL dari judul: huruf kecil, angka, dan tanda hubung saja. */
function jadikanSlug(teks: string) {
  return teks
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 160)
    .replace(/-+$/g, '');
}

export function AdminDocumentCreate() {
  const { csrfToken } = useSession();
  const [types, setTypes] = useState<Master[]>([]);
  const [categories, setCategories] = useState<Master[]>([]);
  const [code, setCode] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManual, setSlugManual] = useState(false);
  const [kodeManual, setKodeManual] = useState(false);
  const [cobaKirim, setCobaKirim] = useState(false);
  const [type, setType] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [access, setAccess] = useState<'publik' | 'internal'>('publik');
  const [number, setNumber] = useState('');
  const [year, setYear] = useState('');
  const [pic, setPic] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState('');
  const [file, setFile] = useState<File>();
  const [error, setError] = useState('');
  const [created, setCreated] = useState<{ id: string; versionId: string; unggah?: string }>();

  useEffect(() => {
    void Promise.all([
      ambilApi<Master[]>('/admin/master/jenis_dokumen'),
      ambilApi<Master[]>('/admin/master/kategori'),
    ])
      .then(([a, b]) => {
        setTypes(a);
        setCategories(b);
      })
      .catch((e: unknown) =>
        setError(e instanceof GalatApi ? e.message : 'Data pilihan tidak dapat dimuat.'),
      );
  }, []);

  function ubahJudul(nilai: string) {
    setTitle(nilai);
    if (!slugManual) setSlug(jadikanSlug(nilai));
    if (!kodeManual) setCode(jadikanSlug(nilai).toUpperCase().slice(0, 64));
  }

  async function create() {
    let result: { id: string; versionId: string };
    try {
      result = await ambilApi<{ id: string; versionId: string }>('/admin/documents', {
        method: 'POST',
        headers: csrfHeaders(csrfToken),
        muatan: {
          kodeDokumen: code,
          slug: slug.replace(/-+$/, ''),
          jenisDokumenId: type,
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
    setCreated({ ...result, unggah });
  }

  // Kolom wajib yang masih kosong; tombol Buat draf menyebutnya bila ditekan.
  const kosong = [
    !title.trim() && 'Judul',
    !type && 'Jenis dokumen',
    !code.trim() && 'Kode dokumen',
    !slug.replace(/-+$/, '').trim() && 'Slug URL',
  ].filter((x): x is string => Boolean(x));

  if (created)
    return (
      <div className="mx-auto max-w-3xl">
        <StateMessage title="Draf dokumen dibuat">
          {created.unggah === 'ok'
            ? 'Draf dan berkas dokumen utama berhasil disimpan. Lanjutkan pengajuan verifikasi dari halaman detail.'
            : created.unggah
              ? `Draf tersimpan, tetapi berkas belum terunggah (${created.unggah}). Unggah ulang dari halaman detail.`
              : 'Draf tersimpan. Unggah berkas dokumen utama dari halaman detail sebelum mengajukan verifikasi.'}
        </StateMessage>
        <Link
          className="mt-5 inline-block font-semibold underline"
          href={`/admin/dokumen/${created.id}`}
        >
          Buka detail draf
        </Link>
      </div>
    );

  return (
    <div className="mx-auto max-w-4xl">
      <PageTitle
        title="Buat dokumen hukum"
        description="Dokumen disimpan sebagai draf. Lengkapi data dan unggah berkasnya, lalu ajukan verifikasi dari halaman detail."
      />
      {error && (
        <StateMessage title="Data form belum tersedia" kind="error">
          {error}
        </StateMessage>
      )}
      <Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            className="sm:col-span-2"
            label="Judul *"
            id="doc-title"
            required
            value={title}
            onChange={(e) => ubahJudul(e.target.value)}
            maxLength={500}
          />
          <div className="grid gap-1 sm:col-span-2">
            <TextAreaField
              label="Deskripsi singkat (opsional)"
              id="doc-description"
              rows={3}
              maxLength={1000}
              placeholder="mis. Mengatur tata cara pengajuan cuti bagi dosen dan tenaga kependidikan."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <p className="text-xs text-slate-500">
              Satu sampai tiga kalimat tentang isi dokumen, agar pembaca tahu isinya sebelum membuka
              berkas. Tampil di bawah judul pada halaman publik.
            </p>
          </div>
          <SelectField
            label="Jenis dokumen *"
            id="doc-type"
            required
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">Pilih jenis</option>
            {types
              .filter((x) => x.aktif !== false)
              .map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nama}
                </option>
              ))}
          </SelectField>
          <SelectField
            label="Tingkat akses"
            id="doc-access"
            value={access}
            onChange={(e) => setAccess(e.target.value as typeof access)}
          >
            <option value="publik">Publik</option>
            <option value="internal">Internal</option>
          </SelectField>
          <div className="grid gap-1">
            <Field
              label="Kode dokumen *"
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
            <p className="text-xs text-slate-500">
              Terisi otomatis dari judul; boleh diubah. Kode unik untuk administrasi, tidak tampil
              ke publik.
            </p>
          </div>
          <div className="grid gap-1">
            <Field
              label="Slug URL *"
              id="doc-slug"
              required
              placeholder="terisi otomatis dari judul"
              value={slug}
              onChange={(e) => {
                setSlugManual(true);
                // Dirapikan saat diketik; tanda hubung di ujung dibuang saat dikirim.
                setSlug(
                  e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9-]+/g, '-')
                    .replace(/-{2,}/g, '-')
                    .replace(/^-/, ''),
                );
              }}
              maxLength={160}
            />
            <p className="text-xs text-slate-500">Alamat halaman: /produk-hukum/{slug || '…'}</p>
          </div>
          <Field
            label="Nomor (opsional saat draf)"
            id="doc-number"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
          />
          <Field
            label="Tahun"
            id="doc-year"
            inputMode="numeric"
            maxLength={4}
            placeholder="mis. 2026"
            value={year}
            onChange={(e) => setYear(e.target.value.replace(/\D/g, ''))}
          />
          <Field label="PIC" id="doc-pic" value={pic} onChange={(e) => setPic(e.target.value)} />
          <Field
            label="Tanggal penetapan"
            id="doc-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <SelectField
            label="Kategori"
            id="doc-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Tanpa kategori</option>
            {categories.map((x) => (
              <option key={x.id} value={x.id}>
                {x.nama}
              </option>
            ))}
          </SelectField>
          <div className="grid gap-1.5 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 sm:col-span-2">
            <label htmlFor="doc-file" className="text-sm font-medium text-slate-800">
              Berkas dokumen utama (PDF)
            </label>
            <input
              id="doc-file"
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => setFile(e.target.files?.[0])}
              className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-institusi-600 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-institusi-700"
            />
            <p className="text-xs text-slate-500">
              Opsional sekarang; bisa juga diunggah nanti dari halaman detail draf. Lampiran
              tambahan diunggah dari halaman detail.
            </p>
          </div>
        </div>
        <div className="mt-6 grid gap-3">
          {cobaKirim && kosong.length > 0 && (
            <p
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900"
            >
              Lengkapi dulu: {kosong.join(', ')}.
            </p>
          )}
          {kosong.length > 0 ? (
            <div>
              <Button type="button" onClick={() => setCobaKirim(true)}>
                Buat draf
              </Button>
            </div>
          ) : (
            <ConfirmAction
              label="Buat draf"
              title="Buat draf dokumen?"
              description={
                file
                  ? `Draf dibuat lalu berkas ${file.name} diunggah sebagai dokumen utama.`
                  : 'Draf ini belum dapat diakses sebagai dokumen terbit. Pastikan data dasarnya benar.'
              }
              onConfirm={create}
            />
          )}
        </div>
      </Card>
    </div>
  );
}
