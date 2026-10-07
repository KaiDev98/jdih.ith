'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Download, LoaderCircle, Maximize2 } from 'lucide-react';

export type BerkasPratinjau = { id: string; nama: string; label: string };

const alamatBerkas = (slug: string, fileId: string, mode: 'inline' | 'download') =>
  `/api/v1/public/documents/${encodeURIComponent(slug)}/files/${encodeURIComponent(fileId)}?mode=${mode}`;

/** Pesan galat tanpa menyiratkan ada berkas yang tertutup bagi pembaca. */
function pesanGagal(status: number, aksi: 'pratinjau' | 'unduh') {
  if (status === 404 || status === 403) return 'Berkas tidak tersedia.';
  if (status === 429)
    return aksi === 'pratinjau'
      ? 'Terlalu banyak pratinjau dalam satu jam. Coba lagi nanti atau unduh berkasnya.'
      : 'Batas unduhan tercapai. Coba lagi setelah satu jam.';
  return aksi === 'pratinjau' ? 'Pratinjau gagal dimuat.' : 'Unduhan gagal.';
}

/** Peramban yang tidak bisa menampilkan PDF di halaman (mis. Chrome Android) menyatakannya di sini. */
const tanpaLangganan = () => () => undefined;
function usePdfDidukung() {
  return useSyncExternalStore(
    tanpaLangganan,
    () => navigator.pdfViewerEnabled !== false,
    () => true,
  );
}
/** iPhone tidak mendukung layar penuh untuk elemen selain video. */
function useLayarPenuhDidukung() {
  return useSyncExternalStore(
    tanpaLangganan,
    () => document.fullscreenEnabled,
    () => false,
  );
}

const tombolKecil =
  'inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60';

/**
 * Pratinjau PDF yang langsung tampil di halaman detail memakai penampil PDF
 * bawaan peramban (zoom, halaman, cetak). Berkas diambil sebagai blob agar hak
 * akses tetap diperiksa API dan galat dapat ditampilkan dengan rapi.
 */
export function PratinjauDokumen({ slug, berkas }: { slug: string; berkas: BerkasPratinjau[] }) {
  const [aktifId, setAktifId] = useState(berkas[0]?.id);
  const [hasil, setHasil] = useState<{ id: string; url?: string; pesan?: string }>();
  const [unduhSibuk, setUnduhSibuk] = useState(false);
  const [galatUnduh, setGalatUnduh] = useState('');
  const bingkai = useRef<HTMLDivElement>(null);
  const didukung = usePdfDidukung();
  const layarPenuh = useLayarPenuhDidukung();
  const aktif = berkas.find((b) => b.id === aktifId) ?? berkas[0];
  const idAktif = aktif?.id;

  useEffect(() => {
    if (!idAktif || !didukung) return;
    const batal = new AbortController();
    let url = '';
    fetch(alamatBerkas(slug, idAktif, 'inline'), { credentials: 'include', signal: batal.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(pesanGagal(response.status, 'pratinjau'));
        url = URL.createObjectURL(await response.blob());
        setHasil({ id: idAktif, url });
      })
      .catch((e: unknown) => {
        if (batal.signal.aborted) return;
        setHasil({
          id: idAktif,
          pesan: e instanceof Error ? e.message : 'Pratinjau gagal dimuat.',
        });
      });
    return () => {
      batal.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [slug, idAktif, didukung]);

  if (!aktif) return null;
  const terkini = hasil?.id === aktif.id ? hasil : undefined;

  async function unduh(b: BerkasPratinjau) {
    setUnduhSibuk(true);
    setGalatUnduh('');
    try {
      const response = await fetch(alamatBerkas(slug, b.id, 'download'), {
        credentials: 'include',
      });
      if (!response.ok) throw new Error(pesanGagal(response.status, 'unduh'));
      const objectUrl = URL.createObjectURL(await response.blob());
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = b.nama;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (e) {
      setGalatUnduh(e instanceof Error ? e.message : 'Unduhan gagal.');
    } finally {
      setUnduhSibuk(false);
    }
  }

  return (
    <section aria-label="Pratinjau dokumen">
      <div className="border-b border-slate-200">
        {berkas.length > 1 ? (
          <div className="-mb-px flex gap-6 overflow-x-auto" aria-label="Pilih berkas">
            {berkas.map((b) => (
              <button
                key={b.id}
                type="button"
                aria-pressed={b.id === aktif.id}
                onClick={() => {
                  setAktifId(b.id);
                  setGalatUnduh('');
                }}
                className={`shrink-0 border-b-2 pt-1 pb-2.5 text-sm font-semibold transition ${
                  b.id === aktif.id
                    ? 'border-institusi-600 text-tinta'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        ) : (
          <h2 className="pt-1 pb-2.5 text-sm font-semibold text-tinta">{aktif.label}</h2>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-xs text-slate-500" title={aktif.nama}>
          {aktif.nama}
        </p>
        <div className="flex shrink-0 items-center gap-1">
          {terkini?.url && layarPenuh && (
            <button
              type="button"
              onClick={() => void bingkai.current?.requestFullscreen().catch(() => undefined)}
              className={`${tombolKecil} text-slate-700 hover:bg-slate-100`}
            >
              <Maximize2 aria-hidden className="size-4" />
              Layar penuh
            </button>
          )}
          <button
            type="button"
            onClick={() => void unduh(aktif)}
            disabled={unduhSibuk}
            className={`${tombolKecil} bg-institusi-600 text-white hover:bg-institusi-700`}
          >
            <Download aria-hidden className="size-4" />
            {unduhSibuk ? 'Mengunduh…' : 'Unduh'}
          </button>
        </div>
      </div>
      {galatUnduh && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {galatUnduh}
        </p>
      )}

      {didukung ? (
        <div
          ref={bingkai}
          className="mt-2 h-[72vh] max-h-208 min-h-104 overflow-hidden rounded-md border border-slate-200 bg-slate-100"
        >
          {terkini?.url ? (
            <iframe
              title={`Pratinjau ${aktif.nama}`}
              src={terkini.url}
              className="size-full border-0"
            />
          ) : terkini?.pesan ? (
            <div className="grid h-full place-items-center p-6 text-center">
              <div className="max-w-sm text-sm">
                <p className="font-semibold text-slate-900">Pratinjau tidak dapat ditampilkan</p>
                <p className="mt-1 text-slate-600">{terkini.pesan}</p>
              </div>
            </div>
          ) : (
            <div role="status" className="grid h-full place-items-center text-sm text-slate-500">
              <span className="flex items-center gap-2">
                <LoaderCircle aria-hidden className="size-4 animate-spin" />
                Memuat pratinjau…
              </span>
            </div>
          )}
        </div>
      ) : (
        <p className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
          Peramban ini tidak dapat menampilkan PDF langsung di halaman. Gunakan tombol Unduh untuk
          membaca berkasnya.
        </p>
      )}
    </section>
  );
}
