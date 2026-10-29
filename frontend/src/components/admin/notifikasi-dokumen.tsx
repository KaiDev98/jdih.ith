'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  ArrowUpRight,
  Bell,
  BellRing,
  Check,
  CheckCheck,
  ClipboardCheck,
  FileText,
  Inbox,
  LoaderCircle,
  MessageSquareText,
  RefreshCw,
  TriangleAlert,
  Trash2,
  Undo2,
} from 'lucide-react';
import type { HasilHapusNotifikasi, NotifikasiDokumen } from '@jdih/shared';
import { alamatPanel, tautanDetailDokumen } from '@/lib/panel';
import { ambilApi } from '@/lib/api-client';
import { csrfHeaders, useSession } from '@/lib/sesi';
import { Feedback } from '@/components/ui';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { waktuRelatif } from '@/lib/waktu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import styles from './notifikasi-dokumen.module.css';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

const TAMPILAN = {
  SUBMIT: {
    ikon: ClipboardCheck,
    label: 'Pengajuan baru',
    teks: 'Pengajuan baru menunggu verifikasi',
    warna: 'text-sky-700',
    latar: 'bg-sky-50 ring-sky-100',
    titik: 'bg-sky-500',
  },
  APPROVE: {
    ikon: CheckCheck,
    label: 'Disetujui',
    teks: 'Pengajuan diterima',
    warna: 'text-emerald-700',
    latar: 'bg-emerald-50 ring-emerald-100',
    titik: 'bg-emerald-500',
  },
  RETURN: {
    ikon: Undo2,
    label: 'Perlu perbaikan',
    teks: 'Pengajuan dikembalikan untuk perbaikan',
    warna: 'text-rose-700',
    latar: 'bg-rose-50 ring-rose-100',
    titik: 'bg-rose-500',
  },
} as const;

export function NotifikasiDokumenPanel() {
  const pathname = usePathname();
  const { csrfToken, pengguna } = useSession();
  const superadmin = pengguna?.peran.includes('SUPERADMIN') ?? false;
  const [buka, setBuka] = useState(false);
  const [data, setData] = useState<NotifikasiDokumen[]>();
  const [error, setError] = useState('');
  const [ulangi, setUlangi] = useState(0);
  const [target, setTarget] = useState<
    { mode: 'one'; id: string; judul: string } | { mode: 'all'; sampaiId: string }
  >();
  const [sibuk, setSibuk] = useState(false);
  const [galatHapus, setGalatHapus] = useState('');
  const [sukses, setSukses] = useState('');
  const generasi = useRef(0);
  const sedangMenghapus = useRef(false);
  const pemicuHapus = useRef<HTMLButtonElement | null>(null);
  const judulDaftar = useRef<HTMLHeadingElement | null>(null);
  async function hapus() {
    if (!target || sedangMenghapus.current) return;
    sedangMenghapus.current = true;
    generasi.current++;
    setSibuk(true);
    setGalatHapus('');
    setSukses('');
    try {
      const hasil = await ambilApi<HasilHapusNotifikasi>(
        `/admin/documents/notifications${target.mode === 'one' ? `/${target.id}` : ''}`,
        {
          method: 'DELETE',
          headers: csrfHeaders(csrfToken),
          ...(target.mode === 'all' ? { muatan: { sampaiId: target.sampaiId } } : {}),
        },
      );
      generasi.current++;
      setData((lama) =>
        lama?.filter((r) =>
          target.mode === 'one' ? r.id !== target.id : BigInt(r.id) > BigInt(target.sampaiId),
        ),
      );
      setSukses(
        hasil.jumlahDihapus > 0
          ? target.mode === 'all'
            ? 'Semua notifikasi sebelumnya berhasil dihapus.'
            : 'Notifikasi berhasil dihapus.'
          : 'Notifikasi sudah dihapus sebelumnya.',
      );
      setTarget(undefined);
    } catch {
      setGalatHapus('Notifikasi belum berhasil dihapus. Silakan coba lagi.');
    } finally {
      sedangMenghapus.current = false;
      setSibuk(false);
      setUlangi((n) => n + 1);
    }
  }
  useEffect(() => {
    let aktif = true;
    const muat = () => {
      if (sedangMenghapus.current) return;
      const saatMemuat = generasi.current;
      void ambilApi<NotifikasiDokumen[]>('/admin/documents/notifications')
        .then((r) => {
          if (aktif && saatMemuat === generasi.current) {
            setData(r);
            setError('');
          }
        })
        .catch(() => {
          if (aktif && saatMemuat === generasi.current)
            setError('Notifikasi belum dapat dimuat. Coba buka kembali panel ini.');
        });
    };
    muat();
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') muat();
    }, 30_000);
    window.addEventListener('jdih:workflow', muat);
    window.addEventListener('focus', muat);
    return () => {
      aktif = false;
      window.clearInterval(interval);
      window.removeEventListener('jdih:workflow', muat);
      window.removeEventListener('focus', muat);
    };
  }, [pathname, buka, ulangi]);
  const daftar = data?.filter((r) => (superadmin ? r.action === 'SUBMIT' : r.action !== 'SUBMIT'));
  const jumlah = daftar?.length ?? 0;
  const kategori: (keyof typeof TAMPILAN)[] = superadmin ? ['SUBMIT'] : ['APPROVE', 'RETURN'];
  return (
    <Sheet
      open={buka}
      onOpenChange={(nilai) => {
        if (!target && !sibuk) setBuka(nilai);
      }}
    >
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Notifikasi dokumen${jumlah ? ` (${jumlah} terbaru)` : ''}`}
          title="Buka notifikasi dokumen"
          className={cn(
            styles.pemicu,
            'relative size-10 gap-2 rounded-full border transition-colors sm:w-auto sm:px-3',
            jumlah
              ? 'border-institusi-200 bg-institusi-50 text-institusi-700 hover:border-institusi-300 hover:bg-institusi-100'
              : 'border-sekat bg-white text-slate-600 hover:bg-slate-50',
          )}
        >
          <span className="relative grid size-5 place-items-center">
            <Bell
              key={daftar?.[0]?.id ?? 'kosong'}
              aria-hidden
              className={cn('size-5!', jumlah > 0 && styles.lonceng)}
            />
          </span>
          <span className="hidden text-[0.8125rem] font-semibold sm:inline">Notifikasi</span>
          {jumlah > 0 && (
            <span
              aria-hidden
              className="absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full bg-institusi-600 px-1 py-0.5 text-[10px] leading-4 font-bold text-white ring-2 ring-kanvas sm:static sm:min-w-6 sm:text-[11px] sm:ring-0"
            >
              {jumlah}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-[min(29rem,100vw)] overflow-hidden border-0 bg-[#f8f9fc] shadow-[-20px_0_80px_-24px_rgb(15_23_42/30%)] sm:rounded-l-3xl"
        kelasTutup="top-5 right-5 rounded-full bg-white/10 text-white hover:bg-white/20 hover:text-white focus-visible:ring-white"
      >
        <div className={cn(styles.kepala, 'relative shrink-0 px-5 pt-7 pb-6 text-white sm:px-7')}>
          <div className="mb-5 flex items-center gap-3">
            <span className="relative grid size-11 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15 ring-inset">
              <BellRing aria-hidden className="size-5 text-institusi-300" />
              {jumlah > 0 && (
                <span
                  aria-hidden
                  className="absolute -top-1 -right-1 size-2.5 rounded-full bg-institusi-400 ring-4 ring-[#243553]"
                >
                  <span className={styles.sinyal} />
                </span>
              )}
            </span>
            <span className="text-[11px] font-semibold tracking-[0.15em] text-slate-300 uppercase">
              {superadmin ? 'Pusat verifikasi' : 'Ruang informasi Anda'}
            </span>
          </div>
          <SheetTitle className="text-[1.65rem] leading-tight font-semibold tracking-tight">
            {superadmin ? 'Pengajuan masuk' : 'Notifikasi dokumen'}
          </SheetTitle>
          <SheetDescription className="mt-2 max-w-xs text-sm leading-relaxed text-slate-300">
            {superadmin
              ? 'Tinjau pengajuan baru dan dokumen yang diajukan kembali setelah diperbaiki.'
              : 'Pantau hasil verifikasi dan catatan perbaikan untuk dokumen Anda.'}
          </SheetDescription>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-slate-200">
            <span aria-hidden className="size-1.5 rounded-full bg-institusi-400" />
            {daftar
              ? `${jumlah} ${superadmin ? 'pengajuan menunggu pemeriksaan' : 'notifikasi terbaru'}`
              : 'Mengambil pembaruan dokumen'}
          </div>
        </div>

        {jumlah > 0 && (
          <div
            className={cn(
              'grid shrink-0 divide-x divide-sekat border-b border-sekat bg-white px-2 py-4',
              superadmin ? 'grid-cols-1' : 'grid-cols-2',
            )}
          >
            {kategori.map((action) => {
              const t = TAMPILAN[action];
              return (
                <div key={action} className="grid justify-items-center gap-1 px-1">
                  <span className="text-xl leading-none font-semibold text-tinta tabular-nums">
                    {daftar?.filter((r) => r.action === action).length}
                  </span>
                  <span className="mt-1 inline-flex items-center gap-1.5 text-[10px] font-medium text-slate-500 sm:text-[11px]">
                    <span aria-hidden className={cn('size-1.5 rounded-full', t.titik)} />
                    {t.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-5 pb-6 sm:px-5">
          <h2 ref={judulDaftar} tabIndex={-1} className="sr-only">
            Daftar notifikasi
          </h2>
          {sukses && (
            <div className="mb-4">
              <Feedback
                value={{ type: 'success', message: sukses }}
                onDismiss={() => setSukses('')}
              />
            </div>
          )}
          {error && (
            <div
              role="alert"
              className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
            >
              <div className="flex gap-2.5">
                <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
                <p>{error}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 text-amber-900 hover:bg-amber-100"
                onClick={() => setUlangi((n) => n + 1)}
              >
                <RefreshCw aria-hidden />
                Coba lagi
              </Button>
            </div>
          )}
          {!daftar && !error && (
            <div role="status" aria-label="Memuat notifikasi" className="grid gap-3">
              <span className="sr-only">Memuat notifikasi…</span>
              {[0, 1, 2].map((n) => (
                <div key={n} aria-hidden className="rounded-2xl border border-sekat bg-white p-4">
                  <div className="flex gap-3">
                    <span className="size-10 shrink-0 animate-pulse rounded-xl bg-slate-100" />
                    <div className="flex-1 space-y-3 py-1">
                      <div className="h-2.5 w-24 animate-pulse rounded bg-slate-100" />
                      <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
                      <div className="h-2.5 w-3/4 animate-pulse rounded bg-slate-100" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {daftar?.length === 0 && (
            <div className="flex min-h-72 flex-col items-center justify-center px-5 text-center">
              <span className="grid size-20 place-items-center rounded-full bg-white shadow-sm ring-1 ring-sekat">
                <span className="grid size-14 place-items-center rounded-full bg-institusi-50 text-institusi-600">
                  <Inbox aria-hidden className="size-7" />
                </span>
              </span>
              <p className="mt-5 font-semibold text-tinta">
                {superadmin ? 'Tidak ada pengajuan baru.' : 'Belum ada notifikasi dokumen.'}
              </p>
              <p className="mt-2 max-w-64 text-sm leading-relaxed text-slate-500">
                {superadmin
                  ? 'Pengajuan dari Admin akan muncul di sini saat siap diverifikasi.'
                  : 'Hasil persetujuan dan catatan perbaikan akan muncul di sini.'}
              </p>
            </div>
          )}
          {jumlah > 0 && (
            <>
              <div className="mb-3 flex items-center justify-between px-1">
                <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  {superadmin ? 'Siap ditinjau' : 'Aktivitas terbaru'}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                  onClick={(e) => {
                    if (!daftar?.[0]) return;
                    pemicuHapus.current = e.currentTarget;
                    setGalatHapus('');
                    setTarget({ mode: 'all', sampaiId: daftar[0].id });
                  }}
                >
                  <Trash2 aria-hidden /> Hapus semua
                </Button>
              </div>
              <ul className="grid content-start gap-3">
                {daftar?.map((r, index) => {
                  const t = TAMPILAN[r.action];
                  const Ikon = t.ikon;
                  // Navigasi dokumen penuh juga memuat ulang detail saat notifikasi
                  // menunjuk URL yang sedang terbuka; tidak memakai cache router.
                  return (
                    <li key={r.id} className="relative">
                      <a
                        href={alamatPanel(
                          pengguna?.peran ?? [],
                          tautanDetailDokumen(r.dokumenId, r.versionId,
                            r.action === 'SUBMIT' ? 'verifikasi' : r.action === 'RETURN' ? 'pengajuan' : 'terverifikasi'),
                        )}
                        className={cn(
                          styles.kartu,
                          'group block rounded-2xl border bg-white p-4 outline-none hover:border-institusi-300 focus-visible:ring-2 focus-visible:ring-institusi-500 focus-visible:ring-offset-2',
                          index === 0 ? 'border-institusi-200' : 'border-sekat',
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={cn(
                              'grid size-10 shrink-0 place-items-center rounded-xl ring-1 ring-inset',
                              t.latar,
                              t.warna,
                            )}
                          >
                            <Ikon aria-hidden className="size-5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pr-8">
                              <span className={cn('text-[11px] font-semibold', t.warna)}>
                                {t.label}
                              </span>
                              {index === 0 && (
                                <span className="rounded-full bg-institusi-50 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-institusi-700 uppercase">
                                  Terbaru
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-xs leading-relaxed text-slate-500">{t.teks}</p>
                            <p className="mt-2 text-sm leading-relaxed font-semibold text-tinta [overflow-wrap:anywhere]">
                              {r.judul}
                            </p>
                          </div>
                        </div>
                        {r.catatan && (
                          <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                            <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
                              <MessageSquareText aria-hidden className="size-3" />
                              {r.action === 'SUBMIT' ? 'Catatan pengajuan' : 'Catatan pemeriksaan'}
                            </div>
                            <p className="text-xs leading-relaxed whitespace-pre-wrap text-slate-600 [overflow-wrap:anywhere]">
                              {r.action === 'SUBMIT' ? r.catatan : `Alasan: ${r.catatan}`}
                            </p>
                          </div>
                        )}
                        <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                          <span className="text-[11px] text-slate-500">
                            {waktuRelatif(r.createdAt)}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 group-hover:text-institusi-700">
                            <FileText aria-hidden className="size-3" />
                            {superadmin ? 'Tinjau pengajuan' : 'Buka dokumen'}
                            <ArrowUpRight aria-hidden className={cn(styles.panah, 'size-3.5')} />
                          </span>
                        </div>
                      </a>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2.5 right-2.5 size-8 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        aria-label={`Hapus notifikasi ${r.judul}`}
                        title="Hapus notifikasi"
                        onClick={(e) => {
                          pemicuHapus.current = e.currentTarget;
                          setGalatHapus('');
                          setTarget({ mode: 'one', id: r.id, judul: r.judul });
                        }}
                      >
                        <Trash2 aria-hidden />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
        <div className="flex shrink-0 items-center justify-center gap-2 border-t border-sekat bg-white px-5 py-3.5 text-[11px] text-slate-500">
          <Check aria-hidden className="size-3.5 text-emerald-600" />
          Diperbarui otomatis setiap 30 detik
        </div>
        <Dialog
          open={!!target}
          onOpenChange={(nilai) => {
            if (!nilai && !sedangMenghapus.current) setTarget(undefined);
          }}
        >
          <DialogContent
            closeDisabled={sibuk}
            aria-busy={sibuk}
            onCloseAutoFocus={(e) => {
              e.preventDefault();
              (pemicuHapus.current?.isConnected
                ? pemicuHapus.current
                : judulDaftar.current
              )?.focus();
            }}
          >
            <DialogHeader>
              <span className="ui-dialog-icon mb-1" data-tone="danger">
                <Trash2 aria-hidden className="size-5" />
              </span>
              <DialogTitle>
                {target?.mode === 'all' ? 'Hapus semua notifikasi?' : 'Hapus notifikasi ini?'}
              </DialogTitle>
              <DialogDescription>
                {target?.mode === 'one'
                  ? `Notifikasi “${target.judul}” akan dihapus dari daftar Anda.`
                  : 'Semua notifikasi yang sudah ada akan dihapus dari daftar Anda. Notifikasi baru tetap akan masuk.'}{' '}
                Dokumen dan riwayat verifikasi tetap tersimpan.
              </DialogDescription>
            </DialogHeader>
            {galatHapus && <Feedback value={{ type: 'error', message: galatHapus }} />}
            <DialogFooter>
              <Button variant="outline" disabled={sibuk} onClick={() => setTarget(undefined)}>
                Batal
              </Button>
              <Button
                variant="destructive"
                disabled={sibuk}
                onClick={() => {
                  void hapus();
                }}
              >
                {sibuk ? (
                  <LoaderCircle aria-hidden className="animate-spin" />
                ) : (
                  <Trash2 aria-hidden />
                )}
                {sibuk
                  ? 'Menghapus…'
                  : target?.mode === 'all'
                    ? 'Ya, hapus semua'
                    : 'Ya, hapus notifikasi'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}
