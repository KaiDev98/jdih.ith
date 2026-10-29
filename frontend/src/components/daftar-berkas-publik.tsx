import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export type ParameterDaftarBerkas = Record<string, string | string[] | undefined>;

export function parameterDaftarBerkas(raw: ParameterDaftarBerkas) {
  const page = Number(raw.halaman);
  return {
    halaman: Number.isSafeInteger(page) && page > 0 ? page : 1,
    q: typeof raw.q === 'string' ? raw.q.trim().slice(0, 200) : '',
  };
}

export function ToolbarBerkas({ total, judul }: { total: number; judul: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
      <h2 className="text-lg font-semibold tracking-tight text-tinta">{judul}</h2>
      <p className="text-sm text-slate-500 tabular-nums" aria-live="polite">
        {total} berkas tersedia
      </p>
    </div>
  );
}

export function PaginationBerkas({
  halaman,
  totalHalaman,
  q,
  path,
}: {
  halaman: number;
  totalHalaman: number;
  q: string;
  path: string;
}) {
  if (totalHalaman < 2) return null;
  const href = (page: number) =>
    `${path}?${new URLSearchParams({ halaman: String(page), ...(q ? { q } : {}) })}`;
  const kelas =
    'inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-tinta hover:bg-slate-50';
  return (
    <nav
      aria-label="Halaman daftar berkas"
      className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5"
    >
      <p className="text-sm text-slate-500 tabular-nums">
        Halaman {halaman} dari {totalHalaman}
      </p>
      <div className="flex gap-2">
        {halaman > 1 && (
          <Link href={href(halaman - 1)} className={kelas}>
            <ArrowLeft aria-hidden className="size-4" /> Sebelumnya
          </Link>
        )}
        {halaman < totalHalaman && (
          <Link href={href(halaman + 1)} className={kelas}>
            Berikutnya <ArrowRight aria-hidden className="size-4" />
          </Link>
        )}
      </div>
    </nav>
  );
}
