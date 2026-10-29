'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, History } from 'lucide-react';
import { ambilApiBerdaftar, GalatApi } from '@/lib/api-client';
import { useSession } from '@/lib/sesi';
import { superadminAktif } from '@/lib/panel';
import { cn } from '@/lib/cn';
import { LABEL_AKSI, LABEL_MODUL } from '@/lib/label-audit';
import { inisial } from '@/components/admin/navigasi-admin';
import { Button, Card, DaftarKerangka, Kosong, PageTitle, StateMessage } from '@/components/ui';

type AuditRow = {
  id: string;
  actor: string | null;
  module: string;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
};

/** Modul yang benar-benar dicatat backend. */
const MODUL = [
  'documents',
  'workflow',
  'legal-relations',
  'identity',
  'letter-templates',
  'master',
  'settings',
];
const PER_HALAMAN = 30;

/** Nama objek audit yang mudah dibaca; kode tabel lain ditampilkan apa adanya. */
const LABEL_OBJEK: Record<string, string> = {
  dokumen: 'Dokumen',
  dokumen_versi: 'Versi dokumen',
  dokumen_berkas: 'Berkas',
  dokumen_relasi: 'Relasi',
  pengguna: 'Akun',
  template_surat: 'Format surat',
  template_surat_versi: 'Versi format surat',
  jenis_dokumen: 'Jenis dokumen',
  kategori: 'Kategori',
  tag: 'Tag',
  kontak_kantor_butir: 'Kontak kantor',
};

const ZONA = 'Asia/Makassar';
const formatHari = new Intl.DateTimeFormat('id-ID', {
  timeZone: ZONA,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const formatJam = new Intl.DateTimeFormat('id-ID', {
  timeZone: ZONA,
  hour: '2-digit',
  minute: '2-digit',
});
const kunciHari = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Waktu audit dari API: UTC tanpa penanda zona. */
const bacaWaktu = (nilai: string) =>
  new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(nilai) ? nilai : `${nilai.replace(' ', 'T')}Z`);

/** "Hari ini", "Kemarin", atau tanggal lengkap. */
function judulHari(waktu: Date) {
  const hari = kunciHari.format(waktu);
  const sekarang = new Date();
  if (hari === kunciHari.format(sekarang)) return 'Hari ini';
  if (hari === kunciHari.format(new Date(sekarang.getTime() - 86_400_000))) return 'Kemarin';
  return formatHari.format(waktu);
}

/** Warna titik per modul, agar jenis kegiatan mudah dikenali sekilas. */
const WARNA_MODUL: Record<string, string> = {
  documents: 'bg-sky-500',
  workflow: 'bg-institusi-500',
  'legal-relations': 'bg-amber-500',
  identity: 'bg-violet-500',
  'letter-templates': 'bg-emerald-500',
  master: 'bg-slate-400',
  settings: 'bg-slate-400',
};

/**
 * Riwayat audit sebagai linimasa per hari: siapa melakukan apa, pada apa, dan
 * jam berapa. Disaring per modul; nyaman dibaca juga di layar kecil.
 */
export function AdminAudit() {
  const { pengguna } = useSession();
  const bolehAudit = superadminAktif(pengguna) && pengguna?.izin.includes('audit.read');
  const [rows, setRows] = useState<readonly AuditRow[]>();
  const [modul, setModul] = useState('');
  const [halaman, setHalaman] = useState(1);
  const [total, setTotal] = useState(0);
  const [galat, setGalat] = useState('');
  const [memuat, setMemuat] = useState(true);

  useEffect(() => {
    if (!bolehAudit) return;
    let aktif = true;
    void ambilApiBerdaftar<AuditRow>('/admin/audit', {
      kueri: { halaman, perHalaman: PER_HALAMAN, module: modul || undefined },
    })
      .then((r) => {
        if (!aktif) return;
        setRows(r.data);
        setTotal(r.meta.totalButir);
        setGalat('');
      })
      .catch((e: unknown) => {
        if (aktif)
          setGalat(e instanceof GalatApi ? e.message : 'Riwayat audit tidak dapat dimuat.');
      })
      .finally(() => {
        if (aktif) setMemuat(false);
      });
    return () => {
      aktif = false;
    };
  }, [modul, halaman, bolehAudit]);

  const kelompok = useMemo(() => {
    const hasil: { judul: string; isi: (AuditRow & { jam: string })[] }[] = [];
    for (const r of rows ?? []) {
      const waktu = bacaWaktu(r.createdAt);
      const judul = Number.isNaN(waktu.getTime()) ? 'Tanpa tanggal' : judulHari(waktu);
      const jam = Number.isNaN(waktu.getTime()) ? '' : formatJam.format(waktu);
      const akhir = hasil.at(-1);
      if (akhir?.judul === judul) akhir.isi.push({ ...r, jam });
      else hasil.push({ judul, isi: [{ ...r, jam }] });
    }
    return hasil;
  }, [rows]);

  const totalHalaman = Math.max(1, Math.ceil(total / PER_HALAMAN));
  const pindah = (aksi: () => void) => {
    setMemuat(true);
    aksi();
  };

  if (!bolehAudit) return null;

  return (
    <div className="halaman-panel mx-auto w-full">
      <PageTitle
        title="Audit"
        description="Riwayat tindakan di panel: siapa melakukan apa dan kapan."
      />
      <Card className="overflow-hidden p-0 sm:p-0">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-sekat px-4 py-3">
          <p className="shrink-0 text-xs text-slate-500 tabular-nums">
            {rows ? `${String(total)} catatan` : ' '}
          </p>
          <div
            role="tablist"
            aria-label="Saring menurut modul"
            className="-mx-1 flex min-w-0 max-w-full gap-1 overflow-x-auto px-1 pb-0.5"
          >
            {['', ...MODUL].map((m) => {
              const dipilih = modul === m;
              return (
                <button
                  key={m || 'semua'}
                  type="button"
                  role="tab"
                  aria-selected={dipilih}
                  onClick={() =>
                    pindah(() => {
                      setHalaman(1);
                      setModul(m);
                    })
                  }
                  className={cn(
                    'h-8 shrink-0 rounded-full px-3 text-[0.8125rem] font-medium whitespace-nowrap capitalize transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-institusi-400',
                    dipilih
                      ? 'bg-tinta text-white'
                      : 'text-slate-600 hover:bg-kanvas hover:text-tinta',
                  )}
                >
                  {m ? (LABEL_MODUL[m] ?? m) : 'Semua'}
                </button>
              );
            })}
          </div>
        </div>
        <div
          aria-hidden
          className={cn('h-0.5', memuat && rows ? 'bilah-muat bg-institusi-100' : 'bg-transparent')}
        />

        {galat ? (
          <div className="p-4">
            <StateMessage title="Audit gagal dimuat" kind="error">
              {galat}
            </StateMessage>
          </div>
        ) : !rows ? (
          <div className="px-5 py-1">
            <DaftarKerangka baris={6} label="Memuat riwayat audit" />
          </div>
        ) : rows.length === 0 ? (
          <Kosong icon={History} title="Belum ada catatan">
            Tindakan di panel akan tercatat di sini.
          </Kosong>
        ) : (
          <div
            role="region"
            aria-label="Catatan audit"
            tabIndex={0}
            className="max-h-[30rem] overflow-auto overscroll-contain [scrollbar-gutter:stable] [scrollbar-width:thin] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-institusi-400 lg:max-h-[min(30rem,calc(100dvh-22rem))]"
          >
            <table className="hidden w-full min-w-[760px] table-fixed text-left text-sm md:table">
              <caption className="sr-only">Riwayat audit, waktu dalam WITA</caption>
              <thead className="sticky top-0 z-20 border-b border-sekat bg-[#fbfaf8] text-xs text-slate-500">
                <tr>
                  <th className="w-24 px-4 py-3">Waktu</th>
                  <th className="w-[23%] px-4 py-3">Pelaku</th>
                  <th className="w-[22%] px-4 py-3">Tindakan</th>
                  <th className="w-[20%] px-4 py-3">Modul</th>
                  <th className="px-4 py-3">Objek</th>
                </tr>
              </thead>
              {kelompok.map((k) => (
                <tbody key={k.judul} className="divide-y divide-sekat">
                  <tr className="bg-kanvas/60">
                    <th
                      colSpan={5}
                      scope="rowgroup"
                      className="px-4 py-2 text-xs font-semibold text-slate-500"
                    >
                      {k.judul} · WITA
                    </th>
                  </tr>
                  {k.isi.map((r) => (
                    <tr key={r.id} className="hover:bg-[#faf9f6]">
                      <td className="px-4 py-2.5 text-xs text-slate-500 tabular-nums">
                        {r.jam || '—'}
                      </td>
                      <td
                        className="truncate px-4 py-2.5 font-medium text-tinta"
                        title={r.actor ?? 'Sistem'}
                      >
                        {r.actor ?? 'Sistem'}
                      </td>
                      <td className="truncate px-4 py-2.5" title={LABEL_AKSI[r.action] ?? r.action}>
                        {LABEL_AKSI[r.action] ?? r.action.toLowerCase().replaceAll('_', ' ')}
                      </td>
                      <td
                        className="truncate px-4 py-2.5 capitalize text-slate-500"
                        title={LABEL_MODUL[r.module] ?? r.module}
                      >
                        {LABEL_MODUL[r.module] ?? r.module}
                      </td>
                      <td
                        className="truncate px-4 py-2.5 text-xs text-slate-500"
                        title={`${LABEL_OBJEK[r.entityType] ?? r.entityType}${r.entityId ? ` #${r.entityId}` : ''}`}
                      >
                        {LABEL_OBJEK[r.entityType] ?? r.entityType}
                        {r.entityId ? ` #${r.entityId}` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
            <div className="grid gap-1 px-4 py-2 md:hidden">
              {kelompok.map((k) => (
                <section key={k.judul} aria-label={k.judul}>
                  <h2 className="sticky top-0 z-10 -mx-1 bg-white/95 px-1 py-2 text-xs font-semibold text-slate-500 backdrop-blur">
                    {k.judul} · WITA
                  </h2>
                  <ol className="grid">
                    {k.isi.map((r) => (
                      <li
                        key={r.id}
                        className="flex items-start gap-3 rounded-lg px-1 py-2.5 hover:bg-[#faf9f6]"
                      >
                        <span
                          aria-hidden
                          className="relative grid size-8 shrink-0 place-items-center rounded-full bg-kanvas text-[0.6875rem] font-bold text-slate-600 ring-1 ring-sekat"
                        >
                          {r.actor ? inisial(r.actor) : 'S'}
                          <span
                            className={cn(
                              'absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-white',
                              WARNA_MODUL[r.module] ?? 'bg-slate-400',
                            )}
                          />
                        </span>
                        <div className="min-w-0 flex-1 text-sm">
                          <p className="leading-snug text-slate-700">
                            <span className="font-semibold text-tinta">{r.actor ?? 'Sistem'}</span>{' '}
                            {LABEL_AKSI[r.action] ?? r.action.toLowerCase().replaceAll('_', ' ')}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            <span className="capitalize">{LABEL_MODUL[r.module] ?? r.module}</span>
                            {' · '}
                            {LABEL_OBJEK[r.entityType] ?? r.entityType}
                            {r.entityId ? ` #${r.entityId}` : ''}
                          </p>
                        </div>
                        <time className="shrink-0 pt-0.5 text-xs text-slate-500 tabular-nums">
                          {r.jam}
                        </time>
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
            </div>
          </div>
        )}

        {rows && rows.length > 0 && totalHalaman > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-sekat px-4 py-3">
            <span className="text-sm text-slate-500 tabular-nums">
              Halaman {halaman} dari {totalHalaman}
            </span>
            <div className="flex gap-2">
              <Button
                tone="secondary"
                ukuran="kecil"
                disabled={halaman <= 1 || memuat}
                onClick={() => pindah(() => setHalaman((p) => p - 1))}
              >
                <ChevronLeft aria-hidden className="size-4" />
                Sebelumnya
              </Button>
              <Button
                tone="secondary"
                ukuran="kecil"
                disabled={halaman >= totalHalaman || memuat}
                onClick={() => pindah(() => setHalaman((p) => p + 1))}
              >
                Berikutnya
                <ChevronRight aria-hidden className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
