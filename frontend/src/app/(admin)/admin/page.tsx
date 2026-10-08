'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, ClipboardCheck, FilePlus2, Files, History, UserCheck } from 'lucide-react';
import { ambilApi, ambilApiBerdaftar } from '@/lib/api-client';
import { useSession } from '@/lib/sesi';
import { LABEL_TAHAP } from '@/lib/label-dokumen';
import { formatWaktuAudit, LABEL_AKSI, LABEL_MODUL } from '@/lib/label-audit';
import { Badge, Card, PageTitle } from '@/components/ui';

type Dokumen = {
  id: string;
  judul: string;
  tipe: string;
  nomor: string | null;
  statusWorkflow: string;
};
type Audit = {
  id: string;
  actor: string | null;
  module: string;
  action: string;
  createdAt: string;
};

/**
 * Dasbor admin: angka yang perlu ditindaklanjuti, dokumen yang menunggu
 * verifikasi, dan aktivitas terbaru. Setiap bagian hanya tampil bila akun
 * memiliki izinnya; bagian yang gagal dimuat cukup disembunyikan.
 */
export default function DasborAdmin() {
  const { pengguna } = useSession();
  const izin = pengguna?.izin ?? [];
  const bolehDokumen = izin.includes('documents.read_admin');
  const bolehPengguna = izin.includes('users.read');
  const bolehAudit = izin.includes('audit.read');

  const [antrean, setAntrean] = useState<{ data: readonly Dokumen[]; total: number }>();
  const [totalDokumen, setTotalDokumen] = useState<number>();
  const [menungguAkun, setMenungguAkun] = useState<number>();
  const [aktivitas, setAktivitas] = useState<readonly Audit[]>();

  useEffect(() => {
    if (bolehDokumen) {
      ambilApiBerdaftar<Dokumen>('/admin/documents/verification-queue', {
        kueri: { halaman: 1, perHalaman: 5 },
      })
        .then((r) => setAntrean({ data: r.data, total: r.meta.totalButir }))
        .catch(() => setAntrean({ data: [], total: 0 }));
      ambilApiBerdaftar<Dokumen>('/admin/documents', { kueri: { halaman: 1, perHalaman: 1 } })
        .then((r) => setTotalDokumen(r.meta.totalButir))
        .catch(() => undefined);
    }
    if (bolehPengguna)
      ambilApi<unknown[]>('/admin/users', { kueri: { halaman: 1, perHalaman: 100 } })
        .then((r) => setMenungguAkun(r.length))
        .catch(() => undefined);
    if (bolehAudit)
      ambilApiBerdaftar<Audit>('/admin/audit', { kueri: { halaman: 1, perHalaman: 6 } })
        .then((r) => setAktivitas(r.data))
        .catch(() => setAktivitas([]));
  }, [bolehDokumen, bolehPengguna, bolehAudit]);

  const angka: {
    label: string;
    nilai?: number;
    href: string;
    ikon: typeof Files;
    sorot?: boolean;
  }[] = [
    ...(bolehDokumen
      ? [
          {
            label: 'Menunggu verifikasi',
            nilai: antrean?.total,
            href: '/admin/dokumen/verifikasi',
            ikon: ClipboardCheck,
            sorot: (antrean?.total ?? 0) > 0,
          },
          { label: 'Total dokumen', nilai: totalDokumen, href: '/admin/dokumen', ikon: Files },
        ]
      : []),
    ...(bolehPengguna
      ? [
          {
            label: 'Akun menunggu persetujuan',
            nilai: menungguAkun,
            href: '/admin/pengguna',
            ikon: UserCheck,
            sorot: (menungguAkun ?? 0) > 0,
          },
        ]
      : []),
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageTitle
        title={`Halo, ${pengguna?.nama ?? 'Admin'}`}
        description="Ringkasan pekerjaan yang perlu Anda tindak lanjuti."
        action={
          izin.includes('documents.create') ? (
            <Link
              href="/admin/dokumen/baru"
              className="tekan inline-flex min-h-10 items-center gap-2 rounded-md bg-institusi-600 px-4 text-sm font-semibold text-white hover:bg-institusi-700"
            >
              <FilePlus2 aria-hidden className="size-4" />
              Buat dokumen
            </Link>
          ) : undefined
        }
      />

      {angka.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          {angka.map(({ label, nilai, href, ikon: Ikon, sorot }) => (
            <Link
              key={label}
              href={href}
              className={`group rounded-xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow ${sorot ? 'border-institusi-300' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-600">{label}</span>
                <Ikon
                  aria-hidden
                  className={`size-5 ${sorot ? 'text-institusi-600' : 'text-slate-400'}`}
                />
              </span>
              <span className="mt-2 block text-3xl font-extrabold text-tinta tabular-nums">
                {nilai ?? '—'}
              </span>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
        {bolehDokumen && (
          <Card>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold">Perlu diverifikasi</h2>
              <Link
                href="/admin/dokumen/verifikasi"
                className="inline-flex items-center gap-1 text-sm font-semibold text-institusi-700 hover:underline"
              >
                Semua <ArrowRight aria-hidden className="size-3.5" />
              </Link>
            </div>
            {antrean === undefined ? (
              <p className="mt-4 text-sm text-slate-500">Memuat…</p>
            ) : antrean.data.length === 0 ? (
              <p className="mt-4 text-sm text-slate-600">
                Tidak ada dokumen yang menunggu verifikasi.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100">
                {antrean.data.map((d) => {
                  const tahap = LABEL_TAHAP[d.statusWorkflow];
                  return (
                    <li key={d.id}>
                      <Link
                        href={`/admin/dokumen/${d.id}`}
                        className="flex items-center justify-between gap-3 py-3 hover:text-institusi-800"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{d.judul}</span>
                          <span className="block text-xs text-slate-500">
                            {d.tipe}
                            {d.nomor ? ` · No. ${d.nomor}` : ''}
                          </span>
                        </span>
                        {tahap && <Badge color={tahap.warna}>{tahap.teks}</Badge>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        )}

        {bolehAudit && (
          <Card>
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <History aria-hidden className="size-5 text-slate-400" />
                Aktivitas terbaru
              </h2>
              <Link
                href="/admin/audit"
                className="inline-flex items-center gap-1 text-sm font-semibold text-institusi-700 hover:underline"
              >
                Audit <ArrowRight aria-hidden className="size-3.5" />
              </Link>
            </div>
            {aktivitas === undefined ? (
              <p className="mt-4 text-sm text-slate-500">Memuat…</p>
            ) : aktivitas.length === 0 ? (
              <p className="mt-4 text-sm text-slate-600">Belum ada aktivitas.</p>
            ) : (
              <ul className="mt-3 grid gap-3">
                {aktivitas.map((a) => (
                  <li key={a.id} className="text-sm">
                    <span className="font-medium text-slate-900">{a.actor ?? 'Sistem'}</span>{' '}
                    <span className="text-slate-700">
                      {LABEL_AKSI[a.action] ?? a.action.toLowerCase()} ·{' '}
                      {LABEL_MODUL[a.module] ?? a.module}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {formatWaktuAudit(a.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
