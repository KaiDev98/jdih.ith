'use client';

import Link from '@/components/admin/tautan-panel';
import { useRouterPanel as useRouter } from '@/components/admin/tautan-panel';
import { useEffect, useState } from 'react';
import type {
  KemampuanDokumenAdmin,
  KeteranganStatus,
  PreviewDampakPublikasi,
  StatusPeraturan,
} from '@jdih/shared';
import {
  ArrowLeft,
  Check,
  ExternalLink,
  FilePen,
  FileText,
  FileX2,
  Paperclip,
  Pencil,
} from 'lucide-react';
import { ambilApi, GalatApi } from '@/lib/api-client';
import { csrfHeaders, useSession } from '@/lib/sesi';
import { tautanDetailDokumen, type KonteksDokumen } from '@/lib/panel';
import {
  LABEL_AKSES,
  LABEL_STATUS_HUKUM,
  LABEL_TAHAP,
  TAHAP_BISA_DIUBAH,
  WARNA_STATUS_HUKUM,
  ukuranBerkas,
} from '@/lib/label-dokumen';
import { AdminHapusDokumen } from '@/components/admin-hapus-dokumen';
import { TandaPermohonanSk } from '@/components/admin-daftar-dokumen';
import { cn } from '@/lib/cn';
import { AdminBerkasReview } from '@/components/admin-berkas-review';
import { waktuRelatif } from '@/lib/waktu';
import { pesanKekuranganPengajuan, skemaKesiapanPengajuan } from '@jdih/shared';
import {
  Badge,
  Button,
  Card,
  ConfirmAction,
  Kerangka,
  PageTitle,
  StateMessage,
  TextAreaField,
  kelasTautanSekunder,
} from '@/components/ui';

type Document = KemampuanDokumenAdmin & {
  id: string;
  kodeDokumen: string;
  slug: string;
  jenisDokumenId: string;
  peruntukan?: string | null;
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
  statusPeraturan: StatusPeraturan[];
  kategoriId?: string[];
  riwayatVerifikasi?: { id: string; action: string; catatan: string | null; createdAt: string }[];
};
type Berkas = {
  id: string;
  jenisBerkas: 'UTAMA' | 'LAMPIRAN';
  judul: string | null;
  namaAsli: string;
  sizeBytes: string;
  mimeType?: string;
};

const formatTanggal = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
/** "2026-02-01" menjadi "1 Februari 2026". */
const tanggalBaca = (iso: string | null) =>
  iso ? formatTanggal.format(new Date(`${iso.slice(0, 10)}T00:00:00Z`)) : '—';

const tahapDari = (kode: string) => LABEL_TAHAP[kode] ?? { teks: kode, warna: 'slate' as const };

/**
 * Penunjuk alur dokumen: Draf → Diajukan → Disetujui → Terbit. Tahap REVISI
 * ditandai merah di langkah "Diajukan"; versi ditarik/diganti menutup alur.
 */
function JejakAlur({
  tahap,
  diganti,
  langsung = false,
  otomatis = false,
}: {
  tahap: string;
  diganti: boolean;
  langsung?: boolean;
  otomatis?: boolean;
}) {
  const langkah = otomatis
    ? ['Draf', 'Terbit']
    : langsung
      ? ['Draf', 'Disetujui', 'Terbit']
      : ['Draf', 'Diajukan', 'Disetujui', 'Terbit'];
  const posisi =
    (otomatis
      ? { DRAF: 0, REVISI: 0, DIAJUKAN: 0, DISETUJUI: 0, TERBIT: 1, DITARIK: 1 }
      : langsung
        ? { DRAF: 0, REVISI: 0, DIAJUKAN: 0, DISETUJUI: 1, TERBIT: 2, DITARIK: 2 }
        : { DRAF: 0, REVISI: 1, DIAJUKAN: 1, DISETUJUI: 2, TERBIT: 3, DITARIK: 3 })[tahap] ?? 0;
  const selesaiSemua = tahap === 'TERBIT' || tahap === 'DITARIK';
  return (
    <ol aria-label="Alur dokumen" className="flex items-center">
      {langkah.map((nama, i) => {
        const selesai = i < posisi || (selesaiSemua && i === posisi);
        const kini = i === posisi && !selesaiSemua;
        const revisi = kini && tahap === 'REVISI';
        return (
          <li key={nama} className={cn('flex items-center', i < langkah.length - 1 && 'flex-1')}>
            <span className="flex items-center gap-2">
              <span
                aria-current={kini ? 'step' : undefined}
                className={cn(
                  'grid size-6 shrink-0 place-items-center rounded-full text-[0.6875rem] font-bold',
                  selesai &&
                    (diganti || tahap === 'DITARIK'
                      ? 'bg-slate-400 text-white'
                      : 'bg-emerald-500 text-white'),
                  kini &&
                    (revisi
                      ? 'bg-rose-500 text-white'
                      : 'bg-institusi-600 text-white ring-4 ring-institusi-100'),
                  !selesai && !kini && 'bg-white text-slate-400 ring-1 ring-sekat',
                )}
              >
                {selesai ? <Check aria-hidden className="size-3.5" /> : i + 1}
              </span>
              <span
                className={cn(
                  'hidden text-xs font-medium whitespace-nowrap sm:inline',
                  kini
                    ? revisi
                      ? 'text-rose-700'
                      : 'text-tinta'
                    : selesai
                      ? 'text-slate-600'
                      : 'text-slate-400',
                )}
              >
                {revisi ? 'Perlu diperbaiki' : nama}
              </span>
            </span>
            {i < langkah.length - 1 && (
              <span
                aria-hidden
                className={cn('mx-2 h-px flex-1', i < posisi ? 'bg-emerald-300' : 'bg-sekat')}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Detail dokumen di panel admin: ringkasan, langkah berikutnya sesuai tahap,
 * berkas, dan riwayat versi. Mengubah isi draf dilakukan di halaman "Ubah draf".
 */
type PropsDetailDokumen = {
  id: string;
  versionId?: string;
  konteks?: KonteksDokumen;
};

export function AdminDocumentDetail(props: PropsDetailDokumen) {
  // Detail/galat/berkas versi sebelumnya tidak boleh terbawa ke tujuan baru.
  return <DetailDokumen key={`${props.id}:${props.versionId ?? 'terbaru'}`} {...props} />;
}

function DetailDokumen({
  id,
  versionId: requestedVersionId,
  konteks = 'terverifikasi',
}: PropsDetailDokumen) {
  const { pengguna, csrfToken } = useSession();
  const router = useRouter();
  const [detail, setDetail] = useState<Detail>();
  const [berkas, setBerkas] = useState<Berkas[]>([]);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [preview, setPreview] = useState<PreviewDampakPublikasi>();
  const [previewBusy, setPreviewBusy] = useState(false);
  const [judulTarget, setJudulTarget] = useState<Record<string, string>>({});
  const [note, setNote] = useState('');

  useEffect(() => {
    let aktif = true;
    void ambilApi<Detail>(`/admin/documents/${id}`, { kueri: { versionId: requestedVersionId } })
      .then(async (d) => {
        const files = await ambilApi<Berkas[]>(
          `/admin/documents/versions/${d.document.versionId}/files`,
        );
        if (aktif) {
          setDetail(d);
          setBerkas(files);
          setError('');
        }
      })
      .catch((e: unknown) => {
        if (aktif) setError(e instanceof GalatApi ? e.message : 'Detail dokumen tidak tersedia.');
      });
    return () => {
      aktif = false;
    };
  }, [id, requestedVersionId, refresh]);

  const document = detail?.document;
  const versionId = document?.versionId;

  async function post(url: string, body: unknown = {}) {
    await ambilApi(url, { method: 'POST', headers: csrfHeaders(csrfToken), muatan: body });
    window.dispatchEvent(new Event('jdih:workflow'));
    setNote('');
    setRefresh((x) => x + 1);
  }

  async function loadPreview() {
    if (!versionId) return;
    setPreviewBusy(true);
    try {
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
    } catch (e) {
      setError(e instanceof GalatApi ? e.message : 'Tinjauan penerbitan belum dapat dimuat.');
    } finally {
      setPreviewBusy(false);
    }
  }

  async function publish() {
    if (!versionId || !preview) throw new Error('Tinjau dulu sebelum menerbitkan.');
    const langsungTerbit =
      document?.peruntukan === 'PERMOHONAN_SK' && document.statusWorkflow !== 'DISETUJUI';
    await post(`/admin/documents/versions/${versionId}/${langsungTerbit ? 'approve' : 'publish'}`, {
      ...(langsungTerbit ? { catatan: note } : {}),
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
        kategoriId: detail?.kategoriId ?? [],
      },
    });
    router.push(`/admin/dokumen/${id}/ubah`);
  }

  if (error)
    return (
      <StateMessage title="Detail dokumen tidak dapat dibuka" kind="error">
        {error}
        <Button
          tone="secondary"
          onClick={() => {
            setError('');
            setRefresh((n) => n + 1);
          }}
        >
          Coba lagi
        </Button>
      </StateMessage>
    );
  if (!document)
    return (
      <div role="status" aria-label="Memuat dokumen" className="halaman-panel mx-auto w-full">
        <Kerangka className="h-4 w-28" />
        <Kerangka className="mt-3 h-8 w-2/3" />
        <Kerangka className="mt-2 h-4 w-48" />
        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          <Kerangka className="h-64 rounded-2xl lg:col-span-2" />
          <Kerangka className="h-64 rounded-2xl" />
        </div>
      </div>
    );

  const tahap = document.statusWorkflow;
  // Versi TERBIT yang bukan versi tampil berarti sudah digantikan revisinya.
  const diganti = tahap === 'TERBIT' && document.versionId !== document.currentPublishedVersionId;
  const izin = pengguna?.izin ?? [];
  const superadmin = pengguna?.peran.includes('SUPERADMIN') ?? false;
  const label = tahapDari(diganti ? 'DIGANTI' : tahap);
  const bisaDiubah = TAHAP_BISA_DIUBAH.includes(tahap);
  const jalurLangsung = superadmin && document.bolehSetujuiLangsung === true;
  const setujuiLangsung = jalurLangsung && bisaDiubah;
  const versiPublik = [document, ...detail.versions].find(
    (v) => v.versionId === document.currentPublishedVersionId,
  );
  /** Kolom alasan di dalam dialog konfirmasi (kembalikan/tarik). */
  const kolomCatatan = (label: string, idKolom: string) => (
    <TextAreaField
      label={label}
      id={idKolom}
      value={note}
      onChange={(e) => setNote(e.target.value)}
      maxLength={1000}
      rows={3}
    />
  );

  const psk = document.peruntukan === 'PERMOHONAN_SK';
  // Versi yang sedang dibuka adalah versi tampil publik.
  const tampilPublik = tahap === 'TERBIT' && !diganti && document.tingkatAkses === 'publik';

  const fileUtama = berkas.find((b) => b.jenisBerkas === 'UTAMA');
  const lampiran = berkas.filter((b) => b.jenisBerkas === 'LAMPIRAN');
  const kesiapan = skemaKesiapanPengajuan.safeParse({
    judul: document.judul,
    deskripsi: document.deskripsi,
    nomor: document.nomor,
    tahun: document.tahun,
    pic: document.pic,
    tanggalPenetapan: document.tanggalPenetapan?.slice(0, 10),
    tingkatAkses: document.tingkatAkses,
    kategoriId: detail.kategoriId ?? [],
  });
  const kekurangan = [
    ...(!kesiapan.success ? pesanKekuranganPengajuan(kesiapan.error.issues) : []),
    ...(berkas.length !== 1 || !fileUtama
      ? ['Unggah tepat satu file dokumen utama; gabungkan lampiran dalam file tersebut.']
      : []),
  ];

  return (
    <div className="halaman-panel mx-auto w-full">
      <PageTitle
        title={document.judul}
        description={`${document.kodeDokumen} · Versi ${document.nomorVersi}`}
        meta={
          <>
            <Link
              href={
                konteks === 'verifikasi'
                  ? '/admin/dokumen/verifikasi'
                  : konteks === 'pengajuan'
                    ? '/admin/dokumen/pengajuan'
                    : psk
                      ? '/admin/sop-permohonan-sk'
                      : '/admin/dokumen'
              }
              className="mr-1 inline-flex items-center gap-1.5 font-medium text-slate-500 hover:text-tinta"
            >
              <ArrowLeft aria-hidden className="size-4" />
              {konteks === 'verifikasi'
                ? 'Antrean verifikasi'
                : konteks === 'pengajuan'
                  ? 'Draf dan pengajuan'
                  : psk
                    ? 'SOP Permohonan SK'
                    : 'Dokumen'}
            </Link>
            <Badge color={label.warna}>{label.teks}</Badge>
            {psk && <TandaPermohonanSk />}
          </>
        }
        action={
          tampilPublik ? (
            <a
              href={psk ? '/permohonan-sk' : `/produk-hukum/${document.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className={kelasTautanSekunder}
            >
              <ExternalLink aria-hidden className="size-4" />
              Lihat di portal
            </a>
          ) : undefined
        }
      />

      <div className="grid min-w-0 gap-3.5">
        <Card className="detail-alur">
          <div className="alur-kepala flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[0.9375rem] font-semibold text-tinta">Langkah berikutnya</h2>
            <Badge color={label.warna}>{label.teks}</Badge>
          </div>
          <div className="alur-jejak mt-3 rounded-lg border border-sekat bg-kanvas/50 px-3 py-2.5">
            <JejakAlur
              tahap={tahap}
              diganti={diganti}
              langsung={jalurLangsung && tahap !== 'DIAJUKAN'}
              otomatis={psk}
            />
          </div>
          <p className="alur-pesan mt-3 text-sm leading-relaxed text-slate-700">
            {bisaDiubah &&
              (psk
                ? 'Lengkapi data dan file, tinjau dampaknya, lalu setujui untuk langsung menerbitkan SOP sesuai aksesnya.'
                : jalurLangsung
                  ? 'Draf milik Anda dapat disetujui langsung setelah data dan file lengkap, tanpa masuk antrean verifikasi.'
                  : tahap === 'REVISI'
                    ? 'Dokumen dikembalikan untuk diperbaiki. Ubah draf sesuai catatan, lalu ajukan lagi.'
                    : 'Lengkapi data dan unggah dokumen utama, lalu ajukan untuk diverifikasi.')}
            {tahap === 'DIAJUKAN' &&
              (izin.includes('workflow.approve')
                ? 'Periksa ulang data dan berkas. Setujui bila sudah benar, atau kembalikan dengan catatan perbaikan.'
                : 'Dokumen sedang menunggu verifikasi oleh Superadmin. Admin penginput dapat memantau, tetapi tidak menyetujui atau mengembalikan dokumen.')}
            {tahap === 'DISETUJUI' &&
              (izin.includes('workflow.publish')
                ? 'Dokumen sudah disetujui. Tinjau akibatnya pada dokumen lain, lalu terbitkan agar tampil di portal.'
                : 'Dokumen sudah disetujui dan menunggu diterbitkan oleh Superadmin.')}
            {tahap === 'TERBIT' &&
              !diganti &&
              'Dokumen sudah tampil di portal. Untuk mengubah isinya, buat revisi; versi sekarang tetap tampil sampai revisi diterbitkan.'}
            {diganti &&
              'Versi ini sudah digantikan versi terbit yang lebih baru dan tidak lagi tampil di portal. Riwayatnya tetap disimpan.'}
            {tahap === 'DITARIK' && 'Dokumen sudah tidak tampil di portal.'}
          </p>

          <div className="alur-aksi mt-3 flex flex-wrap items-start gap-2">
            {bisaDiubah &&
              (izin.includes('documents.edit') || izin.includes('documents.upload')) && (
                <Link
                  disabled={!document.bolehUbah}
                  href={`/admin/dokumen/${id}/ubah`}
                  className={kelasTautanSekunder}
                >
                  <Pencil aria-hidden className="size-4" /> Ubah draf
                </Link>
              )}
            {bisaDiubah && !jalurLangsung && izin.includes('workflow.submit') && (
              <ConfirmAction
                label="Ajukan untuk diverifikasi"
                disabled={!document.bolehUbah || kekurangan.length > 0}
                title="Ajukan dokumen ini?"
                description={
                  'Dokumen dan satu file utama masuk antrean verifikasi Superadmin. Data tidak bisa diubah sampai dikembalikan untuk perbaikan.'
                }
                onConfirm={() => post(`/admin/documents/versions/${document.versionId}/submit`, {})}
              />
            )}
            {(tahap === 'DIAJUKAN' || setujuiLangsung) && !psk && (
              <ConfirmAction
                label="Setujui"
                disabled={
                  !superadmin ||
                  !izin.includes('workflow.approve') ||
                  (setujuiLangsung && kekurangan.length > 0)
                }
                title="Setujui dokumen ini?"
                description="Pastikan data dan berkas sudah benar. Setelah disetujui, dokumen siap diterbitkan."
                onConfirm={() =>
                  post(`/admin/documents/versions/${document.versionId}/approve`, { catatan: note })
                }
              >
                {kolomCatatan('Alasan persetujuan (opsional)', 'alasan-setuju')}
              </ConfirmAction>
            )}
            {psk && (tahap === 'DIAJUKAN' || setujuiLangsung) && (
              <Button
                disabled={
                  previewBusy ||
                  !superadmin ||
                  !izin.includes('workflow.approve') ||
                  !izin.includes('workflow.publish') ||
                  kekurangan.length > 0
                }
                onClick={() => void loadPreview()}
              >
                {previewBusy ? 'Memuat tinjauan…' : 'Setujui dan terbitkan'}
              </Button>
            )}
            {tahap === 'DIAJUKAN' && (
              <ConfirmAction
                label="Kembalikan untuk diperbaiki"
                disabled={!superadmin || !izin.includes('workflow.return')}
                tone="secondary"
                title="Kembalikan dokumen ini?"
                description="Dokumen kembali ke penginput untuk diperbaiki. Catatan Anda tampil sebagai petunjuk perbaikan."
                confirmLabel="Ya, kembalikan"
                confirmDisabled={!note.trim()}
                onConfirm={() =>
                  post(`/admin/documents/versions/${document.versionId}/return`, {
                    catatan: note,
                  })
                }
              >
                {kolomCatatan('Catatan perbaikan (wajib)', 'catatan-kembali')}
              </ConfirmAction>
            )}
            {tahap === 'DISETUJUI' && (
              <Button
                disabled={!superadmin || !izin.includes('workflow.publish')}
                onClick={() => void loadPreview()}
              >
                Tinjau lalu terbitkan
              </Button>
            )}
            {['TERBIT', 'DITARIK'].includes(tahap) && izin.includes('documents.revise') && (
              <ConfirmAction
                label="Buat revisi"
                disabled={!document.bolehRevisi}
                title="Buat revisi dokumen ini?"
                description="Revisi baru dibuat sebagai draf dengan data yang sama. Dokumen utama perlu diunggah ulang. Versi yang tampil sekarang tetap tampil sampai revisi diterbitkan."
                onConfirm={buatRevisi}
              />
            )}
            {document.currentPublishedVersionId && (
              <ConfirmAction
                disabled={!superadmin || !izin.includes('workflow.withdraw')}
                tone="danger"
                label="Tarik dari portal"
                title="Tarik dokumen dari portal?"
                description={
                  // Penarikan selalu mengenai versi yang sedang tampil, yang
                  // bisa berbeda dari versi yang sedang dibuka di halaman ini.
                  versiPublik && versiPublik.versionId !== document.versionId
                    ? `Versi ${String(versiPublik.nomorVersi)} yang sedang tampil akan ditarik, sehingga dokumen tidak lagi tampil di portal publik.`
                    : 'Dokumen tidak lagi tampil di portal publik. Riwayat dan alasannya tetap tercatat.'
                }
                confirmLabel="Ya, tarik"
                confirmDisabled={!note.trim()}
                onConfirm={() => post(`/admin/documents/${id}/withdraw`, { alasan: note })}
              >
                {kolomCatatan('Alasan penarikan (wajib)', 'alasan-tarik')}
              </ConfirmAction>
            )}
          </div>
          {bisaDiubah && kekurangan.length > 0 && (
            <div role="status" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-semibold">
                {jalurLangsung ? 'Lengkapi sebelum menyetujui:' : 'Lengkapi sebelum mengajukan:'}
              </p>
              <ul className="mt-1 list-disc pl-5">
                {kekurangan.map((k, i) => (
                  <li key={i}>{k}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        {preview && (
          <Card className="border-amber-300">
            <h2 className="text-base font-bold">Sebelum terbit</h2>
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
                label={
                  psk && tahap !== 'DISETUJUI' ? 'Setujui dan terbitkan' : 'Terbitkan sekarang'
                }
                title={
                  psk && tahap !== 'DISETUJUI'
                    ? 'Setujui dan terbitkan SOP ini?'
                    : 'Terbitkan dokumen ini?'
                }
                description="Dokumen akan tampil di portal sesuai aksesnya dan menjadi versi yang berlaku."
                onConfirm={publish}
              >
                {psk &&
                  tahap !== 'DISETUJUI' &&
                  kolomCatatan('Alasan persetujuan (opsional)', 'alasan-setuju-terbit')}
              </ConfirmAction>
              <Button tone="secondary" onClick={() => setPreview(undefined)}>
                Batal
              </Button>
            </div>
          </Card>
        )}

        <div className="detail-grid">
          <div className="detail-utama grid min-w-0 content-start gap-3.5">
            {berkas.length > 0 && (
              <Card className="detail-pratinjau">
                <h2 className="font-semibold">Tinjau file dokumen</h2>
                <AdminBerkasReview
                  key={document.versionId}
                  versionId={document.versionId}
                  berkas={berkas}
                />
              </Card>
            )}
            <Card className="detail-berkas">
              <h2 className="text-base font-bold">Berkas</h2>
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
            <KartuStatusHukum
              id={id}
              statusHukum={document.statusHukum}
              terbit={Boolean(document.currentPublishedVersionId)}
              keterangan={detail.keteranganStatus}
              hubungan={detail.statusPeraturan}
              bolehUpload={
                document.bolehUbah &&
                izin.includes('documents.create') &&
                izin.includes('legal.manage_relations')
              }
            />
          </div>
          <aside
            aria-label="Informasi dan riwayat dokumen"
            className="detail-samping grid min-w-0 content-start gap-3.5"
          >
            <Card className="detail-ringkasan">
              <h2 className="text-base font-bold">Ringkasan</h2>
              <dl className="ringkasan-dokumen mt-3 grid grid-cols-2 gap-x-4 text-sm">
                {[
                  ['Deskripsi singkat', document.deskripsi ?? '—'],
                  ['Nomor', document.nomor ?? '—'],
                  ['Tahun', document.tahun ?? '—'],
                  ['PIC', document.pic ?? '—'],
                  ['Tanggal penetapan', tanggalBaca(document.tanggalPenetapan)],
                  ['Akses', LABEL_AKSES[document.tingkatAkses] ?? document.tingkatAkses],
                  [
                    'Status hukum',
                    LABEL_STATUS_HUKUM[document.statusHukum] ?? document.statusHukum,
                  ],
                  [
                    'Tampil di portal',
                    versiPublik ? `Ya, versi ${versiPublik.nomorVersi}` : 'Belum',
                  ],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    className={
                      k === 'Deskripsi singkat'
                        ? 'col-span-2 border-b border-slate-100 pb-2'
                        : 'min-w-0 border-b border-slate-100 py-2'
                    }
                  >
                    <dt className="shrink-0 text-slate-500">{k}</dt>
                    <dd
                      className={
                        k === 'Deskripsi singkat'
                          ? 'mt-0.5 font-medium text-slate-800'
                          : 'mt-0.5 font-medium text-slate-900 [overflow-wrap:anywhere]'
                      }
                    >
                      {v}
                    </dd>
                  </div>
                ))}
              </dl>
            </Card>
            {Boolean(detail.riwayatVerifikasi?.length) && (
              <Card className="detail-riwayat">
                <h2 className="font-semibold">Hasil dan riwayat verifikasi</h2>
                <ul
                  aria-label="Riwayat verifikasi dokumen"
                  tabIndex={0}
                  className="panel-riwayat-scroll mt-3 grid gap-2 text-sm"
                >
                  {detail.riwayatVerifikasi?.map((r) => (
                    <li key={r.id} className="rounded-lg border p-3">
                      <p className="font-semibold">
                        {r.action === 'RETURN'
                          ? 'Pengajuan dikembalikan untuk perbaikan'
                          : r.action === 'APPROVE'
                            ? 'Pengajuan diterima'
                            : 'Diajukan untuk verifikasi'}{' '}
                        · {waktuRelatif(r.createdAt)}
                      </p>
                      {r.catatan && (
                        <p className="mt-1 whitespace-pre-wrap break-words">Alasan: {r.catatan}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <Card>
              <h2 className="text-base font-bold">Riwayat versi</h2>
              <ul
                aria-label="Riwayat versi dokumen"
                tabIndex={0}
                className="panel-riwayat-scroll mt-3 grid gap-2 text-sm"
              >
                {[document, ...detail.versions]
                  .sort((a, b) => b.nomorVersi - a.nomorVersi)
                  .map((v) => {
                    const t = tahapDari(
                      v.statusWorkflow === 'TERBIT' &&
                        v.versionId !== document.currentPublishedVersionId
                        ? 'DIGANTI'
                        : v.statusWorkflow,
                    );
                    return (
                      <li key={v.versionId}>
                        <Link
                          href={tautanDetailDokumen(id, v.versionId, konteks)}
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
            <AdminHapusDokumen id={id} judul={document.judul} />
          </aside>
        </div>
      </div>
    </div>
  );
}

const LABEL_HUBUNGAN: Record<StatusPeraturan['jenis'], string> = {
  DICABUT_DENGAN: 'Dicabut dengan',
  DIUBAH_DENGAN: 'Diubah dengan',
  MENCABUT: 'Mencabut',
  MENGUBAH: 'Mengubah',
};

/**
 * Status hukum, seperti JDIH BPK: tidak diubah manual. Dokumen ini menjadi
 * Diubah/Dicabut saat dokumen pengubah/pencabutnya terbit. Karena itu kartu
 * ini menyediakan jalan ke "Upload dokumen" yang langsung terhubung sebagai
 * pengubah atau pencabut dokumen ini.
 */
function KartuStatusHukum({
  id,
  statusHukum,
  terbit,
  keterangan,
  hubungan,
  bolehUpload,
}: {
  id: string;
  statusHukum: string;
  terbit: boolean;
  keterangan: KeteranganStatus | null;
  hubungan: StatusPeraturan[];
  bolehUpload: boolean;
}) {
  const kelompok = (Object.keys(LABEL_HUBUNGAN) as StatusPeraturan['jenis'][])
    .map((jenis) => ({ jenis, daftar: hubungan.filter((h) => h.jenis === jenis) }))
    .filter((k) => k.daftar.length > 0);
  const dicabut = statusHukum === 'DICABUT';
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold">Status hukum</h2>
        <Badge color={WARNA_STATUS_HUKUM[statusHukum] ?? 'slate'}>
          {LABEL_STATUS_HUKUM[statusHukum] ?? statusHukum}
        </Badge>
      </div>
      {statusHukum !== 'BERLAKU' && keterangan && (
        <p className="mt-1 text-sm text-slate-600">
          Sejak {keterangan.tanggal}
          {keterangan.alasan ? ` · Alasan: ${keterangan.alasan}` : ''}
        </p>
      )}
      {kelompok.length > 0 ? (
        <dl className="mt-3 grid gap-3 text-sm">
          {kelompok.map(({ jenis, daftar }) => (
            <div key={jenis}>
              <dt className="font-semibold text-slate-800">{LABEL_HUBUNGAN[jenis]}:</dt>
              <dd>
                <ul className="mt-1 grid gap-1">
                  {daftar.map((h) => (
                    <li key={h.dokumen.id}>
                      <Link
                        href={`/admin/dokumen/${h.dokumen.id}`}
                        className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-2 hover:text-institusi-700 hover:decoration-institusi-400"
                      >
                        {h.dokumen.judul}
                      </Link>
                      <span className="ml-1.5 text-xs text-slate-500">
                        {h.dokumen.tipe}
                        {h.dokumen.nomor ? ` · No. ${h.dokumen.nomor}` : ''}
                        {h.dokumen.tahun ? ` Tahun ${String(h.dokumen.tahun)}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-2 text-sm text-slate-600">
          Belum ada dokumen yang mengubah atau mencabut dokumen ini.
        </p>
      )}
      <div className="mt-4 border-t border-slate-100 pt-4">
        <p className="text-sm text-slate-600">
          Status berubah otomatis saat dokumen pengubah atau pencabutnya terbit. Untuk mengubah atau
          mencabut dokumen ini, upload dokumen barunya.
        </p>
        {!terbit ? (
          <p className="mt-2 text-xs text-slate-500">
            Dokumen ini belum terbit, jadi belum dapat diubah atau dicabut.
          </p>
        ) : dicabut ? (
          <p className="mt-2 text-xs text-slate-500">
            Dokumen ini sudah dicabut, jadi tidak dapat diubah atau dicabut lagi.
          </p>
        ) : (
          bolehUpload && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={`/admin/dokumen/baru?mengubah=${id}`}
                className="tekan inline-flex min-h-9 items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3.5 text-[0.8125rem] font-semibold text-amber-900 hover:bg-amber-100"
              >
                <FilePen aria-hidden className="size-4" />
                Upload dokumen pengubah
              </Link>
              <Link
                href={`/admin/dokumen/baru?mencabut=${id}`}
                className="tekan inline-flex min-h-9 items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 text-[0.8125rem] font-semibold text-rose-800 hover:bg-rose-100"
              >
                <FileX2 aria-hidden className="size-4" />
                Upload dokumen pencabut
              </Link>
            </div>
          )
        )}
      </div>
    </Card>
  );
}
