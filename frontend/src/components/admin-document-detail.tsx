'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { KeteranganStatus, PreviewDampakPublikasi } from '@jdih/shared';
import { FileText, Paperclip, Pencil } from 'lucide-react';
import { ambilApi, GalatApi } from '@/lib/api-client';
import { csrfHeaders, useSession } from '@/lib/sesi';
import {
  LABEL_AKSES,
  LABEL_STATUS_HUKUM,
  LABEL_TAHAP,
  TAHAP_BISA_DIUBAH,
  ukuranBerkas,
} from '@/lib/label-dokumen';
import { AdminStatusHapus } from '@/components/admin-status-hapus';
import {
  Badge,
  Button,
  Card,
  ConfirmAction,
  PageTitle,
  StateMessage,
  TextAreaField,
} from '@/components/ui';

type Document = {
  id: string;
  kodeDokumen: string;
  slug: string;
  jenisDokumenId: string;
  statusHukum: string;
  currentPublishedVersionId: string | null;
  versionId: string;
  nomorVersi: number;
  statusWorkflow: string;
  tingkatAkses: string;
  nomor: string | null;
  tahun: number | null;
  judul: string;
  deskripsi: string | null;
  pic: string | null;
  unitKerjaId: string | null;
  tanggalPenetapan: string | null;
};
type Detail = {
  document: Document;
  versions: Document[];
  keteranganStatus: KeteranganStatus | null;
  keteranganPublik: KeteranganStatus | null;
};
type Berkas = {
  id: string;
  jenisBerkas: 'UTAMA' | 'LAMPIRAN';
  judul: string | null;
  namaAsli: string;
  sizeBytes: string;
};

const tahapDari = (kode: string) => LABEL_TAHAP[kode] ?? { teks: kode, warna: 'slate' as const };

/**
 * Detail dokumen di panel admin: ringkasan, langkah berikutnya sesuai tahap,
 * berkas, dan riwayat versi. Mengubah isi draf dilakukan di halaman "Ubah draf".
 */
export function AdminDocumentDetail({
  id,
  versionId: requestedVersionId,
}: {
  id: string;
  versionId?: string;
}) {
  const { pengguna, csrfToken } = useSession();
  const router = useRouter();
  const [detail, setDetail] = useState<Detail>();
  const [berkas, setBerkas] = useState<Berkas[]>([]);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [preview, setPreview] = useState<PreviewDampakPublikasi>();
  const [judulTarget, setJudulTarget] = useState<Record<string, string>>({});
  const [note, setNote] = useState('');

  useEffect(() => {
    void ambilApi<Detail>(`/admin/documents/${id}`, { kueri: { versionId: requestedVersionId } })
      .then((d) => {
        setDetail(d);
        return ambilApi<Berkas[]>(`/admin/documents/versions/${d.document.versionId}/files`).then(
          setBerkas,
        );
      })
      .catch((e: unknown) =>
        setError(e instanceof GalatApi ? e.message : 'Detail dokumen tidak tersedia.'),
      );
  }, [id, requestedVersionId, refresh]);

  const document = detail?.document;
  const versionId = document?.versionId;

  async function post(url: string, body: unknown = {}) {
    await ambilApi(url, { method: 'POST', headers: csrfHeaders(csrfToken), muatan: body });
    setNote('');
    setRefresh((x) => x + 1);
  }

  async function loadPreview() {
    if (!versionId) return;
    const hasil = await ambilApi<PreviewDampakPublikasi>(
      `/admin/documents/versions/${versionId}/legal-impact`,
    );
    setPreview(hasil);
    const judul: Record<string, string> = {};
    await Promise.all(
      hasil.dampak.map((d) =>
        ambilApi<{ document: { judul: string } }>(`/admin/documents/${d.targetDocumentId}`)
          .then((r) => {
            judul[d.targetDocumentId] = r.document.judul;
          })
          .catch(() => undefined),
      ),
    );
    setJudulTarget(judul);
  }

  async function publish() {
    if (!versionId || !preview) throw new Error('Tinjau dulu sebelum menerbitkan.');
    await post(`/admin/documents/versions/${versionId}/publish`, {
      konfirmasi: {
        tokenKonfirmasi: preview.tokenKonfirmasi,
        disetujui: true,
        dampak: preview.dampak,
      },
    });
    setPreview(undefined);
  }

  async function buatRevisi() {
    if (!document) return;
    await ambilApi(`/admin/documents/${id}/versions`, {
      method: 'POST',
      headers: csrfHeaders(csrfToken),
      muatan: {
        judul: document.judul,
        deskripsi: document.deskripsi,
        nomor: document.nomor,
        tahun: document.tahun,
        pic: document.pic,
        tanggalPenetapan: document.tanggalPenetapan?.slice(0, 10) ?? null,
        tingkatAkses: document.tingkatAkses,
        unitKerjaId: document.unitKerjaId,
      },
    });
    router.push(`/admin/dokumen/${id}/ubah`);
  }

  if (error)
    return (
      <StateMessage title="Detail dokumen tidak dapat dibuka" kind="error">
        {error}
      </StateMessage>
    );
  if (!document) return <StateMessage title="Memuat dokumen…" />;

  const tahap = document.statusWorkflow;
  const izin = pengguna?.izin ?? [];
  const label = tahapDari(tahap);
  const bisaDiubah = TAHAP_BISA_DIUBAH.includes(tahap);
  const versiPublik = [document, ...detail.versions].find(
    (v) => v.versionId === document.currentPublishedVersionId,
  );
  const butuhCatatan =
    (tahap === 'DIAJUKAN' && izin.includes('workflow.return')) ||
    (Boolean(document.currentPublishedVersionId) && izin.includes('workflow.withdraw'));

  const fileUtama = berkas.find((b) => b.jenisBerkas === 'UTAMA');
  const lampiran = berkas.filter((b) => b.jenisBerkas === 'LAMPIRAN');

  return (
    <div className="mx-auto max-w-6xl">
      <PageTitle
        title={document.judul}
        description={`${document.kodeDokumen} · Versi ${document.nomorVersi}`}
        action={
          <Link className="underline" href="/admin/dokumen">
            Kembali ke daftar dokumen
          </Link>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="grid gap-5 lg:col-span-2">
          <Card>
            <h2 className="text-lg font-bold">Langkah berikutnya</h2>
            <div className="mt-2 flex items-center gap-2 text-sm">
              Tahap saat ini: <Badge color={label.warna}>{label.teks}</Badge>
            </div>
            <p className="mt-3 text-sm text-slate-700">
              {bisaDiubah &&
                (tahap === 'REVISI'
                  ? 'Dokumen dikembalikan untuk diperbaiki. Ubah draf sesuai catatan, lalu ajukan lagi.'
                  : 'Lengkapi data dan unggah dokumen utama, lalu ajukan untuk diverifikasi.')}
              {tahap === 'DIAJUKAN' &&
                'Periksa ulang data dan berkas. Setujui bila sudah benar, atau kembalikan dengan catatan perbaikan.'}
              {tahap === 'DISETUJUI' &&
                'Dokumen sudah disetujui. Tinjau akibatnya pada dokumen lain, lalu terbitkan agar tampil di portal.'}
              {tahap === 'TERBIT' &&
                'Dokumen sudah tampil di portal. Untuk mengubah isinya, buat revisi; versi sekarang tetap tampil sampai revisi diterbitkan.'}
              {tahap === 'DITARIK' && 'Dokumen sudah tidak tampil di portal.'}
            </p>

            <div className="mt-5 flex flex-wrap items-start gap-3">
              {bisaDiubah &&
                (izin.includes('documents.edit') || izin.includes('documents.upload')) && (
                  <Link
                    href={`/admin/dokumen/${id}/ubah`}
                    className="tekan inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 font-semibold text-tinta hover:bg-slate-50"
                  >
                    <Pencil aria-hidden className="size-4" /> Ubah draf
                  </Link>
                )}
              {bisaDiubah && izin.includes('workflow.submit') && (
                <ConfirmAction
                  label="Ajukan untuk diverifikasi"
                  title="Ajukan dokumen ini?"
                  description={
                    fileUtama
                      ? 'Dokumen masuk antrean verifikasi dan tidak bisa diubah sampai diverifikasi atau dikembalikan.'
                      : 'Dokumen utama belum diunggah. Dokumen tetap bisa diajukan, tetapi tidak bisa diterbitkan sebelum ada dokumen utama.'
                  }
                  onConfirm={() =>
                    post(`/admin/documents/versions/${document.versionId}/submit`, {})
                  }
                />
              )}
              {tahap === 'DIAJUKAN' && izin.includes('workflow.approve') && (
                <ConfirmAction
                  label="Setujui"
                  title="Setujui dokumen ini?"
                  description="Pastikan data dan berkas sudah benar. Setelah disetujui, dokumen siap diterbitkan."
                  onConfirm={() =>
                    post(`/admin/documents/versions/${document.versionId}/approve`, {})
                  }
                />
              )}
              {tahap === 'DIAJUKAN' && izin.includes('workflow.return') && (
                <ConfirmAction
                  label="Kembalikan untuk diperbaiki"
                  tone="secondary"
                  title="Kembalikan dokumen ini?"
                  description="Dokumen kembali menjadi draf dengan catatan perbaikan Anda."
                  disabled={!note.trim()}
                  onConfirm={() =>
                    post(`/admin/documents/versions/${document.versionId}/return`, {
                      catatan: note,
                    })
                  }
                />
              )}
              {tahap === 'DISETUJUI' && izin.includes('workflow.publish') && (
                <Button onClick={() => void loadPreview()}>Tinjau lalu terbitkan</Button>
              )}
              {['TERBIT', 'DITARIK'].includes(tahap) && izin.includes('documents.revise') && (
                <ConfirmAction
                  label="Buat revisi"
                  title="Buat revisi dokumen ini?"
                  description="Revisi baru dibuat sebagai draf dengan data yang sama. Dokumen utama perlu diunggah ulang. Versi yang tampil sekarang tetap tampil sampai revisi diterbitkan."
                  onConfirm={buatRevisi}
                />
              )}
              {document.currentPublishedVersionId && izin.includes('workflow.withdraw') && (
                <ConfirmAction
                  tone="danger"
                  label="Tarik dari portal"
                  title="Tarik dokumen dari portal?"
                  description="Dokumen tidak lagi tampil di portal publik. Isi alasan penarikan di kolom catatan."
                  disabled={!note.trim()}
                  onConfirm={() => post(`/admin/documents/${id}/withdraw`, { alasan: note })}
                />
              )}
            </div>
            {butuhCatatan && (
              <TextAreaField
                className="mt-4"
                label="Catatan (wajib untuk mengembalikan atau menarik dokumen)"
                id="workflow-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={1000}
              />
            )}
          </Card>

          {preview && (
            <Card className="border-amber-300">
              <h2 className="text-lg font-bold">Sebelum terbit</h2>
              {preview.dampak.length ? (
                <>
                  <p className="mt-1 text-sm">
                    Saat terbit, dokumen lain berikut ikut berubah statusnya:
                  </p>
                  <ul className="mt-3 list-disc pl-5 text-sm">
                    {preview.dampak.map((d) => (
                      <li key={d.targetDocumentId}>
                        <strong>
                          {judulTarget[d.targetDocumentId] ?? `Dokumen #${d.targetDocumentId}`}
                        </strong>
                        : {LABEL_STATUS_HUKUM[d.statusSaatIni] ?? d.statusSaatIni} menjadi{' '}
                        <strong>{LABEL_STATUS_HUKUM[d.statusUsulan] ?? d.statusUsulan}</strong>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="mt-1 text-sm">Tidak ada dokumen lain yang ikut berubah status.</p>
              )}
              <div className="mt-4 flex flex-wrap gap-3">
                <ConfirmAction
                  label="Terbitkan sekarang"
                  title="Terbitkan dokumen ini?"
                  description="Dokumen akan tampil di portal sesuai aksesnya dan menjadi versi yang berlaku."
                  onConfirm={publish}
                />
                <Button tone="secondary" onClick={() => setPreview(undefined)}>
                  Batal
                </Button>
              </div>
            </Card>
          )}

          <Card>
            <h2 className="text-lg font-bold">Berkas</h2>
            {fileUtama || lampiran.length ? (
              <ul className="mt-3 grid gap-2 text-sm">
                {[...(fileUtama ? [fileUtama] : []), ...lampiran].map((b) => (
                  <li
                    key={b.id}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 p-3"
                  >
                    {b.jenisBerkas === 'UTAMA' ? (
                      <FileText aria-hidden className="size-5 shrink-0 text-slate-500" />
                    ) : (
                      <Paperclip aria-hidden className="size-5 shrink-0 text-slate-500" />
                    )}
                    <span className="min-w-0">
                      <span className="block font-medium [overflow-wrap:anywhere]">
                        {b.jenisBerkas === 'UTAMA' ? 'Dokumen utama' : (b.judul ?? 'Lampiran')}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {b.namaAsli} · {ukuranBerkas(b.sizeBytes)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-amber-800">
                Belum ada berkas.{bisaDiubah ? ' Unggah dokumen utama lewat "Ubah draf".' : ''}
              </p>
            )}
          </Card>
        </div>

        <div className="grid content-start gap-5">
          <Card>
            <h2 className="text-lg font-bold">Ringkasan</h2>
            <dl className="mt-3 grid gap-3 text-sm">
              {[
                ['Deskripsi singkat', document.deskripsi ?? '—'],
                ['Nomor', document.nomor ?? '—'],
                ['Tahun', document.tahun ?? '—'],
                ['PIC', document.pic ?? '—'],
                ['Tanggal penetapan', document.tanggalPenetapan?.slice(0, 10) ?? '—'],
                ['Akses', LABEL_AKSES[document.tingkatAkses] ?? document.tingkatAkses],
                ['Status hukum', LABEL_STATUS_HUKUM[document.statusHukum] ?? document.statusHukum],
                ['Tampil di portal', versiPublik ? `Ya, versi ${versiPublik.nomorVersi}` : 'Belum'],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card>
            <h2 className="text-lg font-bold">Riwayat versi</h2>
            <ul className="mt-3 grid gap-2 text-sm">
              {[document, ...detail.versions]
                .sort((a, b) => b.nomorVersi - a.nomorVersi)
                .map((v) => {
                  const t = tahapDari(v.statusWorkflow);
                  return (
                    <li key={v.versionId}>
                      <Link
                        href={`/admin/dokumen/${id}?versionId=${v.versionId}`}
                        className={`flex items-center justify-between gap-2 rounded-lg border p-3 hover:bg-slate-50 ${v.versionId === document.versionId ? 'border-institusi-300 bg-institusi-50' : 'border-slate-200'}`}
                      >
                        <span className="font-medium">Versi {v.nomorVersi}</span>
                        <Badge color={t.warna}>{t.teks}</Badge>
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </Card>
        </div>
      </div>
      <div className="mt-5">
        <AdminStatusHapus
          key={document.statusHukum}
          id={id}
          judul={document.judul}
          statusHukum={document.statusHukum}
          keterangan={detail.keteranganStatus}
          keteranganPublik={
            versiPublik?.tingkatAkses === 'publik' ? detail.keteranganPublik : undefined
          }
          onBerubah={() => setRefresh((x) => x + 1)}
        />
      </div>
    </div>
  );
}
