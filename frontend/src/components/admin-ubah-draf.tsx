'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { Relasi } from '@jdih/shared';
import { FileText, Paperclip, Search } from 'lucide-react';
import { ambilApi, ambilApiBerdaftar, GalatApi } from '@/lib/api-client';
import { csrfHeaders, useSession } from '@/lib/sesi';
import { LABEL_RELASI, LABEL_TAHAP, TAHAP_BISA_DIUBAH, ukuranBerkas } from '@/lib/label-dokumen';
import {
  Badge,
  Button,
  Card,
  ConfirmAction,
  Field,
  PageTitle,
  SelectField,
  StateMessage,
  TextAreaField,
} from '@/components/ui';

type Versi = {
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
};
type Berkas = {
  id: string;
  jenisBerkas: 'UTAMA' | 'LAMPIRAN';
  judul: string | null;
  namaAsli: string;
  sizeBytes: string;
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
    ambilApi<{ document: Versi }>(`/admin/documents/${id}`)
      .then((d) => setVersi(d.document))
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
    <Link className="font-semibold underline" href={`/admin/dokumen/${id}`}>
      Kembali ke detail dokumen
    </Link>
  );

  if (!TAHAP_BISA_DIUBAH.includes(versi.statusWorkflow))
    return (
      <div className="mx-auto max-w-3xl">
        <PageTitle title="Ubah draf" action={kembali} />
        <StateMessage title={`Dokumen ini sedang berstatus "${tahap.teks}"`}>
          Hanya draf yang bisa diubah. Untuk mengubah dokumen yang sudah terbit, pakai tombol{' '}
          <strong>Buat revisi</strong> di halaman detail.
        </StateMessage>
      </div>
    );

  return (
    <div className="mx-auto max-w-4xl">
      <PageTitle
        title="Ubah draf"
        description={`${versi.judul} · versi ${versi.nomorVersi}`}
        action={kembali}
      />
      <div className="mb-5 flex items-center gap-2 text-sm">
        Tahap saat ini: <Badge color={tahap.warna}>{tahap.teks}</Badge>
      </div>
      <div className="grid gap-5">
        {izin.includes('documents.edit') && (
          <BagianData versi={versi} onTersimpan={() => setMuatUlang((x) => x + 1)} />
        )}
        <BagianBerkas versionId={versi.versionId} bolehUnggah={izin.includes('documents.upload')} />
        {izin.includes('legal.manage_relations') && (
          <BagianHubungan
            dokumenId={id}
            versionId={versi.versionId}
            internal={versi.tingkatAkses === 'internal'}
          />
        )}
      </div>
      <div className="mt-6">
        <Link
          href={`/admin/dokumen/${id}`}
          className="tekan inline-flex min-h-11 items-center rounded-md bg-tinta px-5 font-semibold text-white hover:bg-institusi-800"
        >
          Selesai, kembali ke detail
        </Link>
      </div>
    </div>
  );
}

/** 1. Data dokumen: judul, deskripsi, nomor, tahun, PIC, tanggal, dan akses. */
function BagianData({ versi, onTersimpan }: { versi: Versi; onTersimpan: () => void }) {
  const { csrfToken } = useSession();
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
        },
      });
    } catch (e) {
      throw pesanGalat(e);
    }
    onTersimpan();
  }

  return (
    <Card>
      <h2 className="text-lg font-bold">1. Data dokumen</h2>
      <p className="mt-1 text-sm text-slate-600">
        Nomor, PIC, dan tanggal penetapan boleh kosong selama masih draf, tetapi wajib diisi sebelum
        dokumen diterbitkan.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field
          className="sm:col-span-2"
          label="Judul *"
          id="ubah-judul"
          maxLength={500}
          value={form.judul}
          onChange={(e) => ubah('judul', e.target.value)}
        />
        <div className="grid gap-1 sm:col-span-2">
          <TextAreaField
            label="Deskripsi singkat (opsional)"
            id="ubah-deskripsi"
            maxLength={1000}
            rows={3}
            placeholder="mis. Mengatur tata cara pengajuan cuti bagi dosen dan tenaga kependidikan."
            value={form.deskripsi}
            onChange={(e) => ubah('deskripsi', e.target.value)}
          />
          <p className="text-xs text-slate-500">
            Satu sampai tiga kalimat tentang isi dokumen. Tampil di bawah judul pada halaman publik.
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
        <SelectField
          className="sm:col-span-2"
          label="Siapa yang boleh melihat"
          id="ubah-akses"
          value={form.tingkatAkses}
          onChange={(e) => ubah('tingkatAkses', e.target.value)}
        >
          <option value="publik">Publik: semua orang</option>
          <option value="internal">Internal: hanya Dosen/Staf yang masuk</option>
        </SelectField>
      </div>
      <div className="mt-5">
        <ConfirmAction
          label="Simpan data"
          title="Simpan perubahan data dokumen?"
          description="Perubahan hanya berlaku pada draf ini dan belum tampil di publik."
          disabled={!form.judul.trim()}
          onConfirm={simpan}
        />
      </div>
    </Card>
  );
}

/** 2. Berkas: dokumen utama (wajib) dan lampiran (opsional). */
function BagianBerkas({ versionId, bolehUnggah }: { versionId: string; bolehUnggah: boolean }) {
  const { csrfToken } = useSession();
  const [berkas, setBerkas] = useState<Berkas[]>();
  const [utama, setUtama] = useState<File>();
  const [lampiran, setLampiran] = useState<File>();
  const [judulLampiran, setJudulLampiran] = useState('');

  const muat = useCallback(() => {
    ambilApi<Berkas[]>(`/admin/documents/versions/${versionId}/files`)
      .then(setBerkas)
      .catch(() => setBerkas([]));
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
    'text-sm file:mr-3 file:rounded-md file:border-0 file:bg-institusi-600 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-institusi-700';

  const baris = (b: Berkas, Ikon: typeof FileText) => (
    <li
      key={b.id}
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-3"
    >
      <span className="flex min-w-0 items-center gap-3">
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
      {bolehUnggah && (
        <ConfirmAction
          label="Hapus"
          tone="danger"
          title="Hapus berkas ini?"
          description={`${b.namaAsli} dihapus dari draf. Anda bisa mengunggah berkas lain setelahnya.`}
          confirmLabel="Ya, hapus"
          onConfirm={() => hapus(b.id)}
        />
      )}
    </li>
  );

  return (
    <Card>
      <h2 className="text-lg font-bold">2. Berkas</h2>
      <p className="mt-1 text-sm text-slate-600">Format PDF.</p>

      <h3 className="mt-5 font-semibold">Dokumen utama (wajib)</h3>
      <p className="text-sm text-slate-600">
        Berkas pokok produk hukum, misalnya PDF surat keputusan yang sudah ditandatangani. Hanya
        satu; untuk mengganti, hapus dulu yang lama.
      </p>
      {berkas === undefined ? (
        <p className="mt-3 text-sm text-slate-500">Memuat…</p>
      ) : fileUtama ? (
        <ul className="mt-3">{baris(fileUtama, FileText)}</ul>
      ) : bolehUnggah ? (
        <div className="mt-3 grid gap-3 sm:flex sm:items-start">
          <input
            id="unggah-utama"
            type="file"
            accept="application/pdf,.pdf"
            aria-label="Pilih berkas dokumen utama"
            onChange={(e) => setUtama(e.target.files?.[0])}
            className={kelasInput}
          />
          <ConfirmAction
            label="Unggah dokumen utama"
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

      <h3 className="mt-6 font-semibold">Lampiran (opsional)</h3>
      <p className="text-sm text-slate-600">
        Berkas tambahan, misalnya tabel atau formulir pendukung. Boleh lebih dari satu.
      </p>
      {daftarLampiran.length > 0 && (
        <ul className="mt-3 grid gap-2">{daftarLampiran.map((b) => baris(b, Paperclip))}</ul>
      )}
      {bolehUnggah && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field
            label="Nama lampiran (opsional)"
            id="judul-lampiran"
            placeholder="mis. Lampiran I: Kalender"
            value={judulLampiran}
            onChange={(e) => setJudulLampiran(e.target.value)}
          />
          <div className="grid content-end gap-3">
            <input
              id="unggah-lampiran"
              type="file"
              accept="application/pdf,.pdf"
              aria-label="Pilih berkas lampiran"
              onChange={(e) => setLampiran(e.target.files?.[0])}
              className={kelasInput}
            />
          </div>
          <div className="sm:col-span-2">
            <ConfirmAction
              label="Unggah lampiran"
              title="Unggah lampiran?"
              description={`${lampiran?.name ?? ''} ditambahkan sebagai lampiran.`}
              disabled={!lampiran}
              onConfirm={async () => {
                if (lampiran) await unggah(lampiran, 'LAMPIRAN', judulLampiran);
                setLampiran(undefined);
                setJudulLampiran('');
              }}
            />
          </div>
        </div>
      )}
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
      ambilApiBerdaftar<HasilCari>('/admin/documents', {
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
  }, [cari, dokumenId]);

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
    <Card>
      <h2 className="text-lg font-bold">3. Hubungan dengan dokumen lain (opsional)</h2>
      <p className="mt-1 text-sm text-slate-600">
        Isi bila dokumen ini mencabut, mengubah, atau berdasarkan dokumen lain. Contoh: SK baru yang
        mencabut SK lama. Sebelum terbit, Anda akan diminta memastikan akibatnya.
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
                label="Hapus"
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
          <div className="flex items-center gap-2 rounded-md border border-slate-300 px-3 focus-within:outline-2 focus-within:outline-institusi-600">
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
                    ? 'Dokumen ini Internal, jadi alasan hanya terlihat oleh Dosen/Staf yang masuk.'
                    : `Tampil di halaman "${pilihan.judul}" pada panel Keterangan status.`}
                </p>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <ConfirmAction
                label="Tambahkan hubungan"
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
    </Card>
  );
}
