'use client';

import { useEffect, useState } from 'react';
import type { PermintaanPenghapusan, SumberPermintaanPenghapusan } from '@jdih/shared';
import { FileX2, History, RefreshCw, Trash2, XCircle } from 'lucide-react';
import Link from '@/components/admin/tautan-panel';
import { ambilApi, ambilApiBerdaftar, GalatApi } from '@/lib/api-client';
import { csrfHeaders, useSession } from '@/lib/sesi';
import { usePanelAnchor } from '@/lib/use-panel-anchor';
import { Badge, Button, Card, ConfirmAction, Feedback, StateMessage, TextAreaField } from './ui';

export function FormPermintaanPenghapusan({
  sumber,
  resourceId,
  judul,
  bisaTarik,
}: {
  sumber: SumberPermintaanPenghapusan;
  resourceId: string;
  judul: string;
  bisaTarik: boolean;
}) {
  const { csrfToken } = useSession();
  const [alasan, setAlasan] = useState('');
  const [terkirim, setTerkirim] = useState(false);
  const jenisPencabutan = sumber === 'DOCUMENT' ? 'REVOKE' : 'WITHDRAW';
  useEffect(() => {
    if (!terkirim) return;
    let active = true;
    const periksa = () => {
      if (document.visibilityState !== 'visible') return;
      void ambilApiBerdaftar<PermintaanPenghapusan>('/admin/removal-requests', {
        kueri: { sumber, resourceId, status: 'PENDING', perHalaman: 1 },
      })
        .then((result) => {
          if (active && result.meta.totalButir === 0) setTerkirim(false);
        })
        .catch(() => undefined);
    };
    const timer = window.setInterval(periksa, 30_000);
    window.addEventListener('focus', periksa);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', periksa);
    };
  }, [terkirim, sumber, resourceId]);
  async function kirim(jenis: PermintaanPenghapusan['jenis']) {
    await ambilApi(
      `/admin/${sumber === 'DOCUMENT' ? 'documents' : 'letter-templates'}/${resourceId}/removal-requests`,
      {
        method: 'POST',
        headers: csrfHeaders(csrfToken),
        muatan: { jenis, alasan },
      },
    );
    setAlasan('');
    setTerkirim(true);
    window.dispatchEvent(new Event('jdih:workflow'));
  }
  return (
    <div className="flex flex-wrap gap-2">
      {([jenisPencabutan, 'DELETE'] as const)
        .filter((jenis) => jenis === 'DELETE' || bisaTarik)
        .map((jenis) => (
          <ConfirmAction
            key={jenis}
            icon={jenis !== 'DELETE' ? FileX2 : Trash2}
            ukuran="kecil"
            tone={jenis === 'DELETE' ? 'danger' : 'secondary'}
            label={jenis === 'REVOKE' ? 'Minta Pencabutan' : jenis === 'WITHDRAW' ? 'Minta Penarikan' : 'Minta Penghapusan'}
            title={
              jenis === 'REVOKE' ? 'Minta Pencabutan Dokumen?' : jenis === 'WITHDRAW' ? 'Minta Penarikan dari Portal?' : 'Minta Penghapusan Dokumen?'
            }
            description={`Permintaan untuk “${judul}” dikirim ke Superadmin. ${jenis === 'REVOKE' ? 'Setelah disetujui, dokumen tetap tersedia dengan status hukum Dicabut, tanpa dokumen pengganti. Alasan permintaan menjadi keterangan pencabutan jika Superadmin tidak mengisi catatan keputusan.' : jenis === 'WITHDRAW' ? 'Dokumen tetap tersedia sampai penarikan disetujui.' : 'Penghapusan seluruh versi dan berkas baru dilakukan setelah persetujuan Superadmin.'}`}
            disabled={terkirim}
            confirmLabel="Kirim permintaan"
            confirmDisabled={!alasan.trim()}
            onConfirm={() => kirim(jenis)}
          >
            <TextAreaField
              label="Alasan permintaan"
              rows={3}
              maxLength={1000}
              value={alasan}
              onChange={(event) => setAlasan(event.target.value)}
            />
          </ConfirmAction>
        ))}
      {terkirim && (
        <p role="status" className="w-full text-xs leading-5 text-institusi-700">
          Permintaan terkirim. Pantau keputusan di Antrean Verifikasi.
        </p>
      )}
    </div>
  );
}

const statusLabel = {
  PENDING: 'Menunggu keputusan',
  APPROVED: 'Disetujui',
  DECLINED: 'Tidak disetujui',
  OBSOLETE: 'Sudah ditangani',
};
export function AntreanPermintaanPenghapusan({
  sumber,
  resourceId,
  onProcessed,
  requestId,
  showHistory = false,
}: {
  sumber?: SumberPermintaanPenghapusan;
  resourceId?: string;
  onProcessed?: (row: PermintaanPenghapusan, keputusan: 'APPROVE' | 'DECLINE') => void;
  requestId?: string;
  showHistory?: boolean;
}) {
  const { pengguna, csrfToken } = useSession();
  const superadmin = pengguna?.peran.includes('SUPERADMIN') === true;
  const [rows, setRows] = useState<readonly PermintaanPenghapusan[]>([]);
  const [page, setPage] = useState(1);
  const [semua, setSemua] = useState(showHistory);
  const [targetRequest, setTargetRequest] = useState(requestId);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [catatan, setCatatan] = useState<Record<string, string>>({});
  usePanelAnchor('permintaan-penghapusan', !loading && !error);
  useEffect(() => {
    const muat = () => {
      if (document.visibilityState === 'visible') setRefresh((n) => n + 1);
    };
    const timer = window.setInterval(muat, 30_000);
    window.addEventListener('jdih:workflow', muat);
    window.addEventListener('focus', muat);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('jdih:workflow', muat);
      window.removeEventListener('focus', muat);
    };
  }, []);
  useEffect(() => {
    let active = true;
    void ambilApiBerdaftar<PermintaanPenghapusan>('/admin/removal-requests', {
      kueri: {
        sumber,
        resourceId,
        requestId: targetRequest,
        halaman: page,
        perHalaman: 5,
        status: semua ? 'ALL' : 'PENDING',
      },
    })
      .then((result) => {
        if (!active) return;
        if (!result.data.length && page > 1) {
          setPage((p) => p - 1);
          return;
        }
        setRows(result.data);
        setTotal(result.meta.totalButir);
        setError('');
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof GalatApi ? e.message : 'Permintaan belum dapat dimuat.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [sumber, resourceId, targetRequest, page, semua, refresh]);
  async function putuskan(row: PermintaanPenghapusan, keputusan: 'APPROVE' | 'DECLINE') {
    await ambilApi(`/admin/removal-requests/${row.id}/decision`, {
      method: 'POST',
      headers: csrfHeaders(csrfToken),
      muatan: { keputusan, catatan: catatan[`${row.id}:${keputusan}`] ?? '' },
    });
    setCatatan({});
    setNotice(
      keputusan === 'DECLINE'
        ? 'Permintaan tidak disetujui. Keputusan telah disimpan untuk Admin.'
        : row.jenis === 'REVOKE'
          ? 'Dokumen berhasil dicabut. Dokumen tetap tersedia dengan status Dicabut.'
        : row.jenis === 'WITHDRAW'
          ? 'Dokumen berhasil ditarik dari portal.'
          : 'Dokumen berhasil dihapus.',
    );
    window.dispatchEvent(new Event('jdih:workflow'));
    onProcessed?.(row, keputusan);
  }
  return (
    <Card className="mb-5 overflow-hidden p-0! sm:p-0!">
      <div className="flex flex-wrap items-center gap-3 border-b border-sekat px-5 py-4">
        <span className="grid size-10 place-items-center rounded-xl bg-rose-50 text-rose-700">
          <FileX2 aria-hidden className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">
            Permintaan {sumber === 'TEMPLATE' ? 'Penarikan' : 'Pencabutan'} &amp; Penghapusan{' '}
            <span className="text-slate-500">{loading || error ? '—' : total}</span>
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {superadmin
              ? 'Tinjau alasan Admin. Persetujuan langsung menjalankan tindakan yang diminta.'
              : 'Pantau permintaan Anda dan catatan keputusan Superadmin.'}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Keputusan tampil selama 24 jam setelah diproses. Permintaan yang masih menunggu tetap tersedia.
          </p>
        </div>
        <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
          {targetRequest && <Button ukuran="kecil" tone="secondary" onClick={() => { setTargetRequest(undefined); setPage(1); }}>Semua permintaan</Button>}
          <Button
            className="flex-1 sm:flex-none"
            ukuran="kecil"
            tone="secondary"
            onClick={() => {
              setSemua((value) => !value);
              setPage(1);
            }}
          >
            <History aria-hidden className="size-4" />
            {semua ? 'Menunggu saja' : 'Lihat riwayat'}
          </Button>
          <Button
            ukuran="kecil"
            tone="secondary"
            aria-label="Segarkan permintaan"
            disabled={loading}
            onClick={() => {
            setError('');
              setLoading(true);
              setRefresh((n) => n + 1);
            }}
          >
            <RefreshCw aria-hidden className="size-4" />
          </Button>
        </div>
      </div>
      {notice && (
        <div className="px-5 pt-4">
          <Feedback value={{ type: 'success', message: notice }} onDismiss={() => setNotice('')} />
        </div>
      )}
      {error ? (
        <div className="p-5">
          <StateMessage kind="error" title="Permintaan gagal dimuat">
            {error}
            <Button tone="secondary" ukuran="kecil" disabled={loading} onClick={() => { setError(''); setLoading(true); setRefresh((n) => n + 1); }}>Coba lagi</Button>
          </StateMessage>
        </div>
      ) : loading ? (
        <p role="status" className="p-5 text-sm text-slate-500">
          Memuat permintaan…
        </p>
      ) : !rows.length ? (
        <p className="p-5 text-sm text-slate-500">
          {semua ? 'Belum ada permintaan menunggu atau keputusan dalam 24 jam terakhir.' : 'Belum ada permintaan yang menunggu keputusan.'}
        </p>
      ) : (
        <ul
          className="max-h-[26rem] divide-y divide-sekat overflow-y-auto overscroll-contain"
          data-gulir-panel
          aria-label="Daftar permintaan pencabutan dan penghapusan"
        >
          {rows.map((row) => {
            const bolehPutuskan =
              superadmin &&
              pengguna?.izin.includes(
                row.sumber === 'TEMPLATE'
                  ? 'templates.manage'
                  : row.jenis !== 'DELETE'
                    ? 'workflow.withdraw'
                    : 'documents.delete',
              );
            return (
              <li key={row.id} className="grid gap-3 px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 basis-full sm:basis-0">
                    <h3 className="text-sm font-semibold [overflow-wrap:anywhere]">{row.judul}</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {row.pemohon} · {row.sumber === 'TEMPLATE' ? 'Format Persuratan' : 'Dokumen'}{' '}
                      · {row.jenis === 'REVOKE' ? 'Cabut Dokumen' : row.jenis === 'WITHDRAW' ? 'Tarik dari portal (penarikan)' : 'Hapus dokumen'}
                    </p>
                  </div>
                  <Badge color={row.status === 'PENDING' ? 'amber' : 'slate'}>
                    {statusLabel[row.status]}{row.status === 'APPROVED' && row.jenis === 'REVOKE' ? ' · Dicabut' : ''}
                  </Badge>
                </div>
                <p className="whitespace-pre-wrap text-sm text-slate-600 [overflow-wrap:anywhere]">
                  {row.alasan}
                </p>
                {row.catatan && (
                  <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600 [overflow-wrap:anywhere]">
                    <strong>Catatan Superadmin:</strong> {row.catatan}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {(row.status === 'PENDING' || (row.status === 'APPROVED' && row.jenis !== 'DELETE')) && (
                    <Link
                      href={
                        row.sumber === 'TEMPLATE'
                          ? '/admin/format-persuratan'
                          : `/admin/dokumen/${row.resourceId}?versionId=${row.versionId ?? ''}`
                      }
                      className="inline-flex min-h-11 items-center text-xs font-semibold text-institusi-700 underline underline-offset-4"
                    >
                      {row.status === 'PENDING' ? 'Tinjau dokumen' : row.jenis === 'REVOKE' ? 'Lihat Dokumen Dicabut' : 'Lihat dokumen ditarik'}
                    </Link>
                  )}
                  {row.status === 'PENDING' &&
                    bolehPutuskan &&
                    (['APPROVE', 'DECLINE'] as const).map((keputusan) => (
                      <ConfirmAction
                        key={keputusan}
                        icon={keputusan === 'DECLINE' ? XCircle : row.jenis !== 'DELETE' ? FileX2 : Trash2}
                        ukuran="kecil"
                        tone={keputusan === 'APPROVE' ? 'danger' : 'secondary'}
                        label={
                          keputusan === 'DECLINE'
                            ? 'Tidak setujui'
                            : row.jenis === 'REVOKE'
                              ? 'Setujui & Cabut'
                            : row.jenis === 'WITHDRAW'
                              ? 'Setujui & tarik'
                              : 'Setujui & hapus'
                        }
                        title={
                          keputusan === 'DECLINE'
                            ? 'Tidak menyetujui permintaan?'
                            : row.jenis === 'REVOKE'
                              ? 'Setujui pencabutan dokumen?'
                            : row.jenis === 'WITHDRAW'
                              ? 'Setujui penarikan dokumen?'
                              : 'Setujui penghapusan dokumen?'
                        }
                        description={
                          keputusan === 'DECLINE'
                            ? 'Dokumen tetap seperti semula. Catatan akan tampil untuk Admin pemohon.'
                            : row.jenis === 'REVOKE'
                              ? `“${row.judul}” tetap tersedia dengan status hukum Dicabut. Berkas dan riwayat tetap tersimpan. Catatan keputusan menjadi keterangan pencabutan; bila kosong, alasan Admin digunakan.`
                            : row.jenis === 'WITHDRAW'
                              ? `“${row.judul}” langsung ditarik dari portal. Riwayat tetap tersimpan.`
                              : `“${row.judul}” beserta seluruh versinya dihapus dari aplikasi. Untuk dokumen hukum, berkas dihapus permanen. Tindakan ini tidak dapat dibatalkan.`
                        }
                        onConfirm={() => putuskan(row, keputusan)}
                      >
                        <TextAreaField
                          label="Catatan keputusan (opsional)"
                          maxLength={1000}
                          value={catatan[`${row.id}:${keputusan}`] ?? ''}
                          onChange={(event) =>
                            setCatatan((notes) => ({
                              ...notes,
                              [`${row.id}:${keputusan}`]: event.target.value,
                            }))
                          }
                          rows={3}
                        />
                      </ConfirmAction>
                    ))}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {total > 5 && (
        <div className="flex items-center justify-end gap-3 border-t border-sekat px-5 py-3 text-xs">
          <Button
            ukuran="kecil"
            tone="secondary"
            disabled={page === 1}
            onClick={() => setPage((n) => n - 1)}
          >
            Sebelumnya
          </Button>
          <span>
            {page} / {Math.ceil(total / 5)}
          </span>
          <Button
            ukuran="kecil"
            tone="secondary"
            disabled={page * 5 >= total}
            onClick={() => setPage((n) => n + 1)}
          >
            Berikutnya
          </Button>
        </div>
      )}
    </Card>
  );
}
