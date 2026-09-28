import {
  LABEL_STATUS_KEBERLAKUAN,
  STATUS_KEBERLAKUAN,
  WARNA_STATUS_KEBERLAKUAN,
} from '@jdih/shared';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Beranda',
  description:
    'Cari dan unduh peraturan, keputusan, pedoman, serta SOP di lingkungan Institut ' +
    'Teknologi Bacharuddin Jusuf Habibie, Parepare.',
};

/** Memeriksa apakah peladen API sudah dapat dihubungi, untuk halaman verifikasi setup. */
async function periksaApi(): Promise<{ terhubung: boolean; keterangan: string }> {
  const internal = process.env.API_INTERNAL_URL ?? 'http://localhost:3001';
  try {
    const tanggapan = await fetch(`${internal}/api/v1/kesehatan/siap`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    });
    const isi = (await tanggapan.json()) as { status?: string };
    return tanggapan.ok
      ? { terhubung: true, keterangan: `Peladen API menjawab: ${isi.status ?? 'ok'}` }
      : {
          terhubung: false,
          keterangan:
            `Peladen API menjawab dengan status ${tanggapan.status}. ` +
            'Biasanya berarti MySQL belum dinyalakan dari XAMPP Control Panel.',
        };
  } catch (galat) {
    return {
      terhubung: false,
      keterangan:
        galat instanceof Error && galat.name === 'TimeoutError'
          ? 'Peladen API tidak menjawab dalam 3 detik.'
          : `Peladen API belum dapat dihubungi pada ${internal}. Jalankan "npm run dev" di akar proyek.`,
    };
  }
}

export default async function Beranda() {
  const api = await periksaApi();

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <section className="text-center">
        <p className="text-institusi-700 text-sm font-semibold tracking-wide uppercase">
          Jaringan Dokumentasi dan Informasi Hukum
        </p>
        <h1 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">
          Institut Teknologi Bacharuddin Jusuf Habibie
        </h1>
        <p className="mt-2 text-slate-600">Parepare, Sulawesi Selatan</p>

        <form action="/pencarian" className="mx-auto mt-8 flex max-w-2xl gap-2">
          <label htmlFor="q" className="sr-only">
            Kata kunci pencarian
          </label>
          <input
            id="q"
            name="q"
            type="search"
            placeholder="Cari peraturan, nomor, atau kata kunci…"
            className="focus:border-institusi-600 flex-1 rounded-md border border-slate-300 px-4 py-3 text-slate-900 placeholder:text-slate-400"
          />
          <button
            type="submit"
            className="bg-institusi-700 hover:bg-institusi-800 rounded-md px-6 py-3 font-medium text-white"
          >
            Cari
          </button>
        </form>
      </section>

      {/* ── Penanda status setup. Blok ini dihapus setelah modul dokumen jadi. ── */}
      <section className="mt-14 rounded-lg border border-slate-200 bg-slate-50 p-6">
        <h2 className="text-lg font-semibold text-slate-900">Status Pemasangan</h2>
        <p className="mt-1 text-sm text-slate-600">
          Blok ini hanya alat bantu selama pengembangan dan dihapus begitu modul dokumen tersedia.
        </p>

        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <dt className="font-medium text-slate-700">Aplikasi web (Next.js)</dt>
            <dd className="mt-1 flex items-center gap-2 text-slate-600">
              <span aria-hidden className="size-2 rounded-full bg-green-600" />
              Berjalan — halaman ini dirender di peladen
            </dd>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <dt className="font-medium text-slate-700">Peladen API (NestJS)</dt>
            <dd className="mt-1 flex items-start gap-2 text-slate-600">
              <span
                aria-hidden
                className={`mt-1.5 size-2 shrink-0 rounded-full ${
                  api.terhubung ? 'bg-green-600' : 'bg-amber-500'
                }`}
              />
              <span>{api.keterangan}</span>
            </dd>
          </div>
        </dl>

        <div className="mt-6">
          <p className="text-sm font-medium text-slate-700">
            Penanda status keberlakuan yang tersedia
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Diambil dari <code>@jdih/shared</code>, membuktikan paket kontrak bersama sudah
            tersambung ke kedua sisi.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {STATUS_KEBERLAKUAN.map((status) => (
              <li
                key={status}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
              >
                <span
                  aria-hidden
                  className="size-2 rounded-full"
                  style={{ backgroundColor: WARNA_STATUS_KEBERLAKUAN[status] }}
                />
                {LABEL_STATUS_KEBERLAKUAN[status]}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
