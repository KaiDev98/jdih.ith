'use client';

import { useEffect, useState } from 'react';
import type { ItemAntreanTemplate } from '@jdih/shared';
import { FileCheck2, RefreshCw, Check, UploadCloud } from 'lucide-react';
import Link from '@/components/admin/tautan-panel';
import { ambilApi, ambilApiBerdaftar, GalatApi } from '@/lib/api-client';
import { csrfHeaders, useSession } from '@/lib/sesi';
import { Badge, Button, Card, ConfirmAction, Feedback, StateMessage } from '@/components/ui';
import { PratinjauFormat } from './pratinjau-format';
import { usePanelAnchor } from '@/lib/use-panel-anchor';

/** Antrean format terpisah dari dokumen hukum, dalam halaman verifikasi yang sama. */
export function AdminTemplateVerificationQueue() {
  const { pengguna, csrfToken } = useSession();
  const bolehSetujui =
    pengguna?.status === 'AKTIF' &&
    pengguna.peran.includes('SUPERADMIN') &&
    pengguna.izin.includes('templates.manage');
  const [rows, setRows] = useState<readonly ItemAntreanTemplate[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [refresh, setRefresh] = useState(0);
  const perHalaman = 10;
  usePanelAnchor('antrean-format', !loading && !error);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    let aktif = true;
    void ambilApiBerdaftar<ItemAntreanTemplate>('/admin/letter-templates/verification-queue', {
      kueri: { halaman: page, perHalaman },
    })
      .then((result) => {
        if (!aktif) return;
        if (!result.data.length && page > 1) {
          setPage((n) => n - 1);
          return;
        }
        setRows(result.data);
        setTotal(result.meta.totalButir);
        setError('');
      })
      .catch((e: unknown) => {
        if (aktif)
          setError(e instanceof GalatApi ? e.message : 'Antrean format belum dapat dimuat.');
      })
      .finally(() => {
        if (aktif) setLoading(false);
      });
    return () => {
      aktif = false;
    };
  }, [page, refresh]);

  async function approve(row: ItemAntreanTemplate) {
    if (!bolehSetujui) throw new Error('Persetujuan hanya dapat dilakukan Superadmin aktif.');
    await ambilApi(`/admin/letter-templates/${row.templateSuratId}/versions/${row.id}/verify`, {
      method: 'POST',
      headers: csrfHeaders(csrfToken),
      muatan: {},
    });
    setRows((items) => items.map((item) => item.id === row.id ? { ...item, status: 'APPROVED' } : item));
    setNotice(`${row.nama} versi ${row.nomorVersi} disetujui dan tetap di antrean sampai diterbitkan.`);
    window.dispatchEvent(new Event('jdih:workflow'));
  }

  async function publish(row: ItemAntreanTemplate) {
    if (!bolehSetujui) throw new Error('Penerbitan hanya dapat dilakukan Superadmin aktif.');
    await ambilApi(`/admin/letter-templates/${row.templateSuratId}/versions/${row.id}/publish`, {
      method: 'POST', headers: csrfHeaders(csrfToken), muatan: {},
    });
    setRows((items) => items.filter((item) => item.id !== row.id));
    setTotal((value) => Math.max(0, value - 1));
    setNotice(`${row.nama} versi ${row.nomorVersi} diterbitkan dan keluar dari antrean.`);
    window.dispatchEvent(new Event('jdih:workflow'));
  }

  return (
    <Card className="mb-5 overflow-hidden p-0! sm:p-0!">
      <div className="flex flex-wrap items-center gap-3 border-b border-sekat px-5 py-4">
        <span className="grid size-10 place-items-center rounded-xl bg-institusi-50 text-institusi-700">
          <FileCheck2 aria-hidden className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-tinta">
            Antrean Format Persuratan{' '}
            <span className="ml-1 text-slate-500">{loading ? '—' : total}</span>
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {bolehSetujui
              ? 'Tinjau berkas sebelum menyetujui. Penerbitan tetap tindakan terpisah.'
              : 'Pengajuan dan format yang disetujui dapat ditinjau. Keputusan dan penerbitan hanya oleh Superadmin.'}
          </p>
        </div>
        <Button
          className="basis-full justify-center sm:ml-auto sm:basis-auto"
          tone="secondary"
          ukuran="kecil"
          disabled={loading}
          onClick={() => {
            setLoading(true);
            setRefresh((n) => n + 1);
          }}
        >
          <RefreshCw aria-hidden className="size-4" />
          Segarkan format
        </Button>
      </div>
      {notice && (
        <div className="px-5 pt-4">
          <Feedback value={{ type: 'success', message: notice }} onDismiss={() => setNotice('')} />
        </div>
      )}
      {error ? (
        <div className="p-5">
          <StateMessage kind="error" title="Antrean format gagal dimuat">
            {error}
          </StateMessage>
        </div>
      ) : loading ? (
        <p role="status" className="p-5 text-sm text-slate-500">
          Memuat antrean format…
        </p>
      ) : rows.length === 0 ? (
        <p className="p-5 text-sm text-slate-500">Tidak ada format yang menunggu persetujuan atau penerbitan.</p>
      ) : (
        <ul
          className="max-h-[26rem] divide-y divide-sekat overflow-y-auto overscroll-contain"
          aria-label="Format menunggu persetujuan atau penerbitan"
        >
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
              <div className="min-w-0 flex-1 basis-48">
                <h3 className="text-sm font-semibold text-tinta [overflow-wrap:anywhere]">
                  {row.nama}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Versi {row.nomorVersi} · {row.pengunggah}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge color="slate">
                    {row.tingkatAkses === 'INTERNAL' ? 'Dosen/Staf' : 'Publik'}
                  </Badge>
                  <Badge color={row.status === 'APPROVED' ? 'blue' : 'amber'}>
                    {row.status === 'APPROVED' ? 'Disetujui · Siap Terbit' : 'Menunggu Persetujuan'}
                  </Badge>
                </div>
              </div>
              <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
                <PratinjauFormat
                  nama={row.nama}
                  canPreview={row.mimeType === 'application/pdf'}
                  previewUrl={`/api/v1/admin/letter-templates/verification-queue/${row.templateSuratId}/versions/${row.id}/preview`}
                  downloadUrl={`/api/v1/admin/letter-templates/verification-queue/${row.templateSuratId}/versions/${row.id}/download`}
                />
                {bolehSetujui && row.status === 'PENDING_REVIEW' && (
                  <ConfirmAction
                    label="Setujui" icon={Check}
                    ukuran="kecil"
                    title="Setujui format persuratan?"
                    description={`${row.nama} versi ${row.nomorVersi} akan disetujui tanpa langsung diterbitkan. Versi publik sebelumnya tetap tersedia.`}
                    onConfirm={() => approve(row)}
                  />
                )}
                {bolehSetujui && row.status === 'APPROVED' && (
                  <ConfirmAction label="Terbitkan" icon={UploadCloud} ukuran="kecil"
                    title="Terbitkan format persuratan?"
                    description={`${row.nama} versi ${row.nomorVersi} akan tampil di portal sesuai tingkat aksesnya dan keluar dari antrean. Versi terbit sebelumnya tetap disimpan dalam riwayat.`}
                    onConfirm={() => publish(row)} />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-sekat px-5 py-3">
        <Link
          href="/admin/format-persuratan"
          className="inline-flex min-h-11 items-center text-xs font-semibold text-institusi-700 underline underline-offset-4"
        >
          Kelola Format Persuratan
        </Link>
        {total > perHalaman && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Button
              tone="secondary"
              ukuran="kecil"
              disabled={page === 1 || loading}
              onClick={() => setPage((n) => n - 1)}
            >
              Sebelumnya
            </Button>
            <span>
              {page} / {Math.ceil(total / perHalaman)}
            </span>
            <Button
              tone="secondary"
              ukuran="kecil"
              disabled={page * perHalaman >= total || loading}
              onClick={() => setPage((n) => n + 1)}
            >
              Berikutnya
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
