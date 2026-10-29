'use client';

import { useEffect, useState } from 'react';
import { Button, kelasTautanSekunder } from '@/components/ui';
import { ExternalLink } from 'lucide-react';
import { pesanGagalBerkas } from '@/components/aksi-berkas';

export type BerkasReview = { id: string; namaAsli: string; mimeType?: string };

/** Membuka file versi draf/pengajuan melalui endpoint panel yang memeriksa sesi. */
export function AdminBerkasReview({
  versionId,
  berkas,
}: {
  versionId: string;
  berkas: BerkasReview[];
}) {
  const [pilihan, setPilihan] = useState('');
  const [hasil, setHasil] = useState<{ key: string; url?: string; error?: string }>();
  const [unduhan, setUnduhan] = useState(false);
  const [galat, setGalat] = useState('');
  const aktif = berkas.find((b) => b.id === pilihan) ?? berkas[0];
  const fileId = aktif?.id;
  const pdf =
    aktif?.mimeType === 'application/pdf' ||
    (!aktif?.mimeType && /\.pdf$/i.test(aktif?.namaAsli ?? ''));
  const key = `${versionId}:${fileId ?? ''}`;
  const alamat = (id: string, mode: string) =>
    `/api/v1/admin/documents/versions/${encodeURIComponent(versionId)}/files/${encodeURIComponent(id)}?mode=${mode}`;

  useEffect(() => {
    if (!fileId || !pdf) return;
    const abort = new AbortController();
    let objectUrl = '';
    void fetch(
      `/api/v1/admin/documents/versions/${encodeURIComponent(versionId)}/files/${encodeURIComponent(fileId)}?mode=inline`,
      { credentials: 'include', signal: abort.signal },
    )
      .then(async (r) => {
        if (!r.ok) throw new Error(pesanGagalBerkas(r.status, 'pratinjau'));
        const blob = await r.blob();
        if (abort.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setHasil({ key, url: objectUrl });
      })
      .catch((e: unknown) => {
        if (!abort.signal.aborted)
          setHasil({ key, error: e instanceof Error ? e.message : 'Pratinjau gagal dimuat.' });
      });
    return () => {
      abort.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileId, pdf, versionId, key]);

  async function unduh() {
    if (!aktif) return;
    setUnduhan(true);
    setGalat('');
    try {
      const r = await fetch(alamat(aktif.id, 'download'), { credentials: 'include' });
      if (!r.ok) throw new Error(pesanGagalBerkas(r.status, 'unduh'));
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = aktif.namaAsli;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setGalat(e instanceof Error ? e.message : 'Unduhan gagal.');
    } finally {
      setUnduhan(false);
    }
  }
  if (!aktif) return null;
  const terkini = hasil?.key === key ? hasil : undefined;
  return (
    <div className="review-berkas mt-3 grid min-w-0 gap-3">
      {berkas.length > 1 && (
        <label className="grid gap-1 text-sm">
          Berkas yang ditinjau
          <select
            value={aktif.id}
            onChange={(e) => setPilihan(e.target.value)}
            className="rounded-lg border p-2"
          >
            {berkas.map((b) => (
              <option key={b.id} value={b.id}>
                {b.namaAsli}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <Button className="max-w-full" tone="secondary" disabled={unduhan} onClick={() => void unduh()} title={aktif.namaAsli}>
          <span className="truncate">{unduhan ? 'Mengunduh…' : `Unduh ${aktif.namaAsli}`}</span>
        </Button>
        {pdf && terkini?.url && (
          <a href={terkini.url} target="_blank" rel="noopener noreferrer" className={kelasTautanSekunder}>
            <ExternalLink aria-hidden className="size-4" />
            Buka tab baru
          </a>
        )}
      </div>
      {galat && (
        <p role="alert" className="text-sm text-red-700">
          {galat}
        </p>
      )}
      {pdf ? (
        terkini?.error ? (
          <p role="alert" className="text-sm text-red-700">
            {terkini.error}
          </p>
        ) : terkini?.url ? (
          <iframe
            title={`Pratinjau ${aktif.namaAsli}`}
            src={terkini.url}
            className="pratinjau-panel h-[55dvh] min-h-80 w-full rounded-lg border bg-slate-50"
          />
        ) : (
          <p role="status" className="text-sm text-slate-600">
            Memuat pratinjau dokumen…
          </p>
        )
      ) : (
        <p className="text-sm text-slate-600">
          Unduh file untuk meninjaunya dengan aplikasi dokumen di perangkat Anda.
        </p>
      )}
    </div>
  );
}
