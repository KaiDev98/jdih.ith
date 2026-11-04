'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { Download, Eye, LoaderCircle, RotateCw } from 'lucide-react';
import { Button } from './ui';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';

const tanpaLangganan = () => () => undefined;
const kelasUnduh =
  'inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institusi-400';

/** Penampil PDF lokal: tidak mengirim berkas internal ke penampil pihak ketiga. */
export function PratinjauFormat({
  nama,
  previewUrl,
  downloadUrl,
  canPreview,
  fallbackLabel = 'Unduh untuk ditinjau',
}: {
  nama: string;
  previewUrl: string;
  downloadUrl: string;
  canPreview: boolean;
  fallbackLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [hasil, setHasil] = useState<{ key: string; url?: string; error?: string }>();
  const pdfDidukung = useSyncExternalStore(
    tanpaLangganan,
    () => navigator.pdfViewerEnabled !== false,
    () => true,
  );
  useEffect(() => {
    if (!open || !canPreview || !pdfDidukung) return;
    const controller = new AbortController();
    let blobUrl = '';
    void fetch(previewUrl, { credentials: 'include', cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            response.status === 404
              ? 'Berkas tidak tersedia atau sudah keluar dari antrean.'
              : 'Pratinjau belum dapat dimuat.',
          );
        if (response.headers.get('content-type')?.split(';')[0]?.trim() !== 'application/pdf')
          throw new Error('Berkas ini belum mendukung pratinjau. Silakan unduh berkas.');
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        blobUrl = URL.createObjectURL(blob);
        setHasil({ key: previewUrl, url: blobUrl });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setHasil({
            key: previewUrl,
            error: error instanceof Error ? error.message : 'Pratinjau gagal dimuat.',
          });
      });
    return () => {
      controller.abort();
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [open, canPreview, previewUrl, attempt, pdfDidukung]);
  if (!canPreview || !pdfDidukung)
    return (
      <a href={downloadUrl} className={kelasUnduh}>
        <Download aria-hidden className="size-3.5" />
        {fallbackLabel}
      </a>
    );
  const terkini = hasil?.key === previewUrl ? hasil : undefined;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button ukuran="kecil" tone="secondary" onClick={() => setHasil(undefined)}>
          <Eye aria-hidden className="size-3.5" />
          Pratinjau
        </Button>
      </DialogTrigger>
      <DialogContent className="h-[min(86dvh,56rem)] max-w-6xl! grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-slate-200 px-5 py-4 pr-14">
          <DialogTitle className="line-clamp-2 text-base">{nama}</DialogTitle>
          <DialogDescription>Pratinjau format persuratan</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 bg-slate-100">
          {terkini?.url ? (
            <iframe title={`Pratinjau ${nama}`} src={terkini.url} className="size-full border-0" />
          ) : terkini?.error ? (
            <div className="grid h-full place-content-center justify-items-center gap-4 p-6 text-center">
              <p role="alert" className="max-w-md text-sm text-slate-600">
                {terkini.error}
              </p>
              <Button
                tone="secondary"
                ukuran="kecil"
                onClick={() => {
                  setHasil(undefined);
                  setAttempt((n) => n + 1);
                }}
              >
                <RotateCw aria-hidden className="size-4" />
                Coba lagi
              </Button>
            </div>
          ) : (
            <p
              role="status"
              className="flex h-full items-center justify-center gap-2 text-sm text-slate-500"
            >
              <LoaderCircle aria-hidden className="size-4 animate-spin" />
              Memuat pratinjau…
            </p>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-3">
          <span className="text-xs text-slate-500">PDF</span>
          <a href={downloadUrl} className={kelasUnduh}>
            <Download aria-hidden className="size-4" />
            Unduh berkas
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
