'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ExternalLink, FileText, LoaderCircle, Maximize2, Paperclip } from 'lucide-react';
import { alamatBerkas, pesanGagalBerkas, UnduhKecil } from './aksi-berkas';

export type BerkasPratinjau = { id: string; nama: string; label: string };

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

/**
 * Ruang baca dokumen: penampil PDF di kolom utama dan daftar berkas di samping.
 * Memilih berkas di daftar langsung mengganti isi penampil. Penampil memakai
 * PDF bawaan peramban; berkas diambil sebagai blob agar hak akses tetap
 * diperiksa API dan galat dapat ditampilkan dengan rapi.
 */
export function PratinjauDokumen({
  slug,
  berkas,
  bawahSamping,
}: {
  slug: string;
  berkas: BerkasPratinjau[];
  /** Isi di bawah daftar berkas pada kolom samping. */
  bawahSamping?: React.ReactNode;
}) {
  const [aktifId, setAktifId] = useState(berkas[0]?.id);
  const [hasil, setHasil] = useState<{ id: string; url?: string; pesan?: string }>();
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
        if (!response.ok) throw new Error(pesanGagalBerkas(response.status, 'pratinjau'));
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
  const tombolAlat =
    'inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-tinta';

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
      <aside
        aria-labelledby="judul-berkas"
        className="grid min-w-0 gap-4 lg:col-start-2 lg:row-start-1"
      >
        <section className="kartu-dokumen p-2">
          <h2 id="judul-berkas" className="px-3 pt-3 pb-2 text-sm font-bold text-tinta">
            Berkas ({berkas.length})
          </h2>
          <ul className="grid gap-1">
            {berkas.map((b, i) => {
              const dipilih = b.id === aktif.id;
              const Ikon = i === 0 ? FileText : Paperclip;
              return (
                <li
                  key={b.id}
                  className={`flex items-center gap-1 rounded-xl pr-1 transition ${dipilih ? 'bg-institusi-50 ring-1 ring-institusi-200' : 'hover:bg-slate-50'}`}
                >
                  <button
                    type="button"
                    aria-pressed={dipilih}
                    onClick={() => setAktifId(b.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-left"
                  >
                    <span
                      className={`grid size-9 shrink-0 place-items-center rounded-lg ${dipilih ? 'bg-institusi-600 text-white' : 'bg-slate-100 text-slate-500'}`}
                    >
                      <Ikon aria-hidden className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-tinta">{b.label}</span>
                      <span className="block truncate text-xs text-slate-500" title={b.nama}>
                        {b.nama}
                      </span>
                    </span>
                  </button>
                  <UnduhKecil slug={slug} fileId={b.id} nama={b.nama} />
                </li>
              );
            })}
          </ul>
        </section>
        {bawahSamping}
      </aside>

      <div className="grid min-w-0 gap-5 lg:col-start-1 lg:row-start-1">
        <section
          id="pratinjau"
          aria-label="Pratinjau dokumen"
          className="kartu-dokumen scroll-mt-24 p-3 sm:p-4"
        >
          <div className="flex items-center justify-between gap-3 px-1 pb-3">
            <p className="min-w-0 truncate text-sm">
              <span className="font-semibold text-tinta">{aktif.label}</span>
              <span className="hidden text-slate-500 sm:inline"> · {aktif.nama}</span>
            </p>
            <div className="flex shrink-0 items-center gap-1">
              <a
                href={alamatBerkas(slug, aktif.id, 'inline')}
                target="_blank"
                rel="noopener noreferrer"
                className={tombolAlat}
                title="Buka di tab baru"
              >
                <ExternalLink aria-hidden className="size-4" />
                <span className="sr-only sm:not-sr-only">Tab baru</span>
              </a>
              {terkini?.url && layarPenuh && (
                <button
                  type="button"
                  onClick={() => void bingkai.current?.requestFullscreen().catch(() => undefined)}
                  className={tombolAlat}
                  title="Layar penuh"
                >
                  <Maximize2 aria-hidden className="size-4" />
                  <span className="sr-only sm:not-sr-only">Layar penuh</span>
                </button>
              )}
            </div>
          </div>

          {didukung ? (
            <div
              ref={bingkai}
              className="h-[60vh] max-h-160 min-h-96 overflow-hidden rounded-xl bg-[#2a2a2e]"
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
                    <p className="font-semibold text-white">Pratinjau tidak dapat ditampilkan</p>
                    <p className="mt-1 text-slate-300">{terkini.pesan}</p>
                  </div>
                </div>
              ) : (
                <div
                  role="status"
                  className="grid h-full place-items-center text-sm text-slate-300"
                >
                  <span className="flex items-center gap-2">
                    <LoaderCircle aria-hidden className="size-4 animate-spin" />
                    Memuat pratinjau…
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="rounded-xl bg-slate-50 px-4 py-4 text-sm text-slate-700">
              Peramban ini tidak dapat menampilkan PDF langsung di halaman. Unduh berkas atau buka
              di tab baru untuk membacanya.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
