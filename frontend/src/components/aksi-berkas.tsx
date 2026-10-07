'use client';

import { useState } from 'react';
import { Check, Download, Link2 } from 'lucide-react';

export const alamatBerkas = (slug: string, fileId: string, mode: 'inline' | 'download') =>
  `/api/v1/public/documents/${encodeURIComponent(slug)}/files/${encodeURIComponent(fileId)}?mode=${mode}`;

/** Pesan galat tanpa menyiratkan ada berkas yang tertutup bagi pembaca. */
export function pesanGagalBerkas(status: number, aksi: 'pratinjau' | 'unduh') {
  if (status === 404 || status === 403) return 'Berkas tidak tersedia.';
  if (status === 429)
    return aksi === 'pratinjau'
      ? 'Terlalu banyak pratinjau dalam satu jam. Coba lagi nanti atau unduh berkasnya.'
      : 'Batas unduhan tercapai. Coba lagi setelah satu jam.';
  return aksi === 'pratinjau' ? 'Pratinjau gagal dimuat.' : 'Unduhan gagal.';
}

export function useUnduh(slug: string, fileId: string, nama: string) {
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState('');
  async function unduh() {
    setSibuk(true);
    setGalat('');
    try {
      const response = await fetch(alamatBerkas(slug, fileId, 'download'), {
        credentials: 'include',
      });
      if (!response.ok) throw new Error(pesanGagalBerkas(response.status, 'unduh'));
      const objectUrl = URL.createObjectURL(await response.blob());
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = nama;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (e) {
      setGalat(e instanceof Error ? e.message : 'Unduhan gagal.');
    } finally {
      setSibuk(false);
    }
  }
  return { sibuk, galat, unduh };
}

type Berkas = { slug: string; fileId: string; nama: string };

/** Aksi utama di hero oranye: unduh dokumen utama dan salin tautan halaman. */
export function AksiHero({ slug, fileId, nama }: Berkas) {
  const { sibuk, galat, unduh } = useUnduh(slug, fileId, nama);
  const [tersalin, setTersalin] = useState(false);
  async function salin() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setTersalin(true);
      window.setTimeout(() => setTersalin(false), 2000);
    } catch {
      setTersalin(false);
    }
  }
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void unduh()}
          disabled={sibuk}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-institusi-600 px-6 text-sm font-semibold text-white shadow-sm shadow-black/20 transition hover:bg-institusi-500 disabled:opacity-70"
        >
          <Download aria-hidden className="size-4" />
          {sibuk ? 'Mengunduh…' : 'Unduh dokumen'}
        </button>
        <button
          type="button"
          onClick={() => void salin()}
          className="inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold text-white ring-1 ring-white/40 transition hover:bg-white/10"
        >
          {tersalin ? (
            <Check aria-hidden className="size-4" />
          ) : (
            <Link2 aria-hidden className="size-4" />
          )}
          <span aria-live="polite">{tersalin ? 'Tautan tersalin' : 'Salin tautan'}</span>
        </button>
      </div>
      {galat && (
        <p role="alert" className="text-sm font-medium text-white">
          {galat}
        </p>
      )}
    </div>
  );
}

/** Tombol unduh kecil untuk satu berkas di daftar berkas. */
export function UnduhKecil({ slug, fileId, nama }: Berkas) {
  const { sibuk, galat, unduh } = useUnduh(slug, fileId, nama);
  return (
    <span className="grid justify-items-end">
      <button
        type="button"
        onClick={() => void unduh()}
        disabled={sibuk}
        aria-label={`Unduh ${nama}`}
        title="Unduh"
        className="grid size-9 place-items-center rounded-full text-slate-500 transition hover:bg-institusi-100 hover:text-institusi-800 disabled:opacity-60"
      >
        <Download aria-hidden className="size-4" />
      </button>
      {galat && <span className="text-xs text-red-700">{galat}</span>}
    </span>
  );
}
