'use client';

import { useEffect, useState } from 'react';
import { FilePen, FileX2, Link2, Search, X } from 'lucide-react';
import { ambilApiBerdaftar } from '@/lib/api-client';
import { useSession } from '@/lib/sesi';

export type JenisHubungan = 'MENGUBAH' | 'MENCABUT';
export type TargetHubungan = {
  id: string;
  judul: string;
  tipe?: string;
  nomor: string | null;
  tahun?: number | null;
};
export type Hubungan = { jenis: JenisHubungan; target: TargetHubungan; catatan: string };

type BarisCari = {
  id: string;
  judul: string;
  tipe: string;
  nomor: string | null;
  tahun: number | null;
  statusWorkflow: string;
  statusHukum: string;
};

const kelasIsian =
  'h-10 w-full rounded-lg border border-slate-300 bg-white text-sm text-slate-950 shadow-[0_1px_2px_rgb(23_35_64/0.04)] transition-[border-color,box-shadow] placeholder:text-slate-400 hover:border-slate-400 focus:border-institusi-500 focus:ring-3 focus:ring-institusi-500/20 focus:outline-none';

/**
 * Hubungan dokumen yang sedang diupload dengan peraturan lama: mengubah atau
 * mencabut. Seperti JDIH BPK, status peraturan lama berubah otomatis saat
 * dokumen ini terbit. Hanya peraturan yang sudah terbit dan belum dicabut yang
 * dapat dipilih (backend memeriksanya lagi).
 */
export function PanelHubungan({
  nilai,
  onUbah,
}: {
  nilai?: Hubungan;
  onUbah: (h: Hubungan | undefined) => void;
}) {
  const [buka, setBuka] = useState(false);
  const { pengguna } = useSession();
  const [cari, setCari] = useState('');
  const [hasil, setHasil] = useState<BarisCari[]>([]);

  useEffect(() => {
    if (!buka || cari.trim().length < 2) return;
    let aktif = true;
    const jeda = setTimeout(() => {
      ambilApiBerdaftar<BarisCari>('/admin/documents/relation-targets', {
        kueri: { q: cari.trim(), halaman: 1, perHalaman: 20 },
      })
        .then((r) => {
          if (!aktif) return;
          const unik = new Map<string, BarisCari>();
          for (const d of r.data)
            if (d.statusWorkflow === 'TERBIT' && d.statusHukum !== 'DICABUT' && !unik.has(d.id))
              unik.set(d.id, d);
          setHasil([...unik.values()].slice(0, 8));
        })
        .catch(() => {
          if (aktif) setHasil([]);
        });
    }, 250);
    return () => {
      aktif = false;
      clearTimeout(jeda);
    };
  }, [cari, buka]);

  if (nilai) {
    const cabut = nilai.jenis === 'MENCABUT';
    const Ikon = cabut ? FileX2 : FilePen;
    return (
      <div
        className={`rounded-lg border p-3.5 ${cabut ? 'border-rose-200 bg-rose-50/60' : 'border-amber-200 bg-amber-50/60'}`}
      >
        <div className="flex flex-wrap items-start gap-3">
          <span
            aria-hidden
            className={`grid size-9 shrink-0 place-items-center rounded-lg bg-white ${cabut ? 'text-rose-600' : 'text-amber-600'}`}
          >
            <Ikon className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-slate-700">
              Dokumen ini akan{' '}
              <strong className={cabut ? 'text-rose-800' : 'text-amber-800'}>
                {cabut ? 'mencabut' : 'mengubah'}
              </strong>
              :
            </p>
            <p className="mt-0.5 font-semibold text-slate-900 [overflow-wrap:anywhere]">
              {nilai.target.judul}
            </p>
            <p className="text-xs text-slate-500">
              {[
                nilai.target.tipe,
                nilai.target.nomor && `No. ${nilai.target.nomor}`,
                nilai.target.tahun,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div
              role="radiogroup"
              aria-label="Jenis hubungan"
              className="grid grid-cols-2 rounded-lg bg-white/80 p-0.5 ring-1 ring-slate-200"
            >
              {(['MENGUBAH', 'MENCABUT'] as const).map((j) => (
                <button
                  key={j}
                  type="button"
                  role="radio"
                  aria-checked={nilai.jenis === j}
                  onClick={() => onUbah({ ...nilai, jenis: j })}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${nilai.jenis === j ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  {j === 'MENGUBAH' ? 'Mengubah' : 'Mencabut'}
                </button>
              ))}
            </div>
            <button
              type="button"
              aria-label="Batalkan hubungan"
              onClick={() => onUbah(undefined)}
              className="grid size-8 place-items-center rounded-md text-slate-400 hover:bg-white hover:text-slate-700"
            >
              <X aria-hidden className="size-4" />
            </button>
          </div>
        </div>
        <label className="mt-3 grid gap-1 text-sm font-medium text-slate-800">
          Alasan (opsional, tampil di halaman publik dokumen lama)
          <input
            value={nilai.catatan}
            maxLength={1000}
            placeholder={
              cabut ? 'mis. Diganti dengan peraturan yang baru.' : 'mis. Penyesuaian besaran biaya.'
            }
            onChange={(e) => onUbah({ ...nilai, catatan: e.target.value })}
            className={`${kelasIsian} px-3 font-normal`}
          />
        </label>
        <p className="mt-2 text-xs text-slate-500">
          Status dokumen lama menjadi <strong>{cabut ? 'Dicabut' : 'Diubah'}</strong> saat dokumen
          ini terbit, dan keduanya saling ditautkan di halaman publik.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-dashed border-slate-300 px-3.5 py-3">
      {!buka ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm text-slate-600">
            <Link2 aria-hidden className="size-4 text-slate-400" />
            Dokumen ini mengubah atau mencabut peraturan lain?
          </p>
          <button
            type="button"
            onClick={() => setBuka(true)}
            className="rounded-md px-2 py-1 text-[0.8125rem] font-semibold text-institusi-700 hover:bg-institusi-50"
          >
            Pilih peraturan
          </button>
        </div>
      ) : (
        <div className="grid gap-2">
          <label htmlFor="cari-hubungan" className="relative">
            <span className="sr-only">Cari peraturan yang diubah atau dicabut</span>
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
            />
            <input
              id="cari-hubungan"
              autoFocus
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder="Cari judul atau nomor peraturan yang sudah terbit"
              className={`${kelasIsian} pr-9 pl-9`}
            />
            <button
              type="button"
              aria-label="Tutup pencarian"
              onClick={() => {
                setBuka(false);
                setCari('');
                setHasil([]);
              }}
              className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded text-slate-400 hover:text-slate-700"
            >
              <X aria-hidden className="size-4" />
            </button>
          </label>
          {cari.trim().length >= 2 && (
            <ul className="max-h-60 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200 bg-white">
              {hasil.length === 0 ? (
                <li className="px-3 py-2.5 text-sm text-slate-500">
                  Tidak ada peraturan terbit yang cocok.
                </li>
              ) : (
                hasil.map((d) => (
                  <li key={d.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onUbah({
                          jenis: 'MENGUBAH',
                          target: {
                            id: d.id,
                            judul: d.judul,
                            tipe: d.tipe,
                            nomor: d.nomor,
                            tahun: d.tahun,
                          },
                          catatan: '',
                        });
                        setBuka(false);
                        setCari('');
                        setHasil([]);
                      }}
                      className="block w-full px-3 py-2 text-left hover:bg-slate-50"
                    >
                      <span className="block text-sm font-medium text-slate-900">{d.judul}</span>
                      <span className="block text-xs text-slate-500">
                        {d.tipe}
                        {d.nomor ? ` · No. ${d.nomor}` : ''}
                        {d.tahun ? ` · ${String(d.tahun)}` : ''}
                        {d.statusHukum === 'DIUBAH' ? ' · sudah pernah diubah' : ''}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      )}
      {!pengguna?.peran.includes('SUPERADMIN') && <p className="mt-2 text-xs text-slate-500">Hanya dokumen dan versi terbit milik Anda sendiri yang dapat dipilih sebagai target.</p>}
    </div>
  );
}
