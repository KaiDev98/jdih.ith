'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, Info, Inbox, LoaderCircle, X, XCircle } from 'lucide-react';
import { GalatApi } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

/*
 * Komponen dasar panel admin. Satu bahasa visual untuk semua halaman:
 * tombol, isian, kartu, lencana status, dan pesan. Warna mengikuti palet
 * panel (lihat "Panel admin" di globals.css): oranye ITH untuk aksi utama,
 * biru tua untuk navigasi, dan warna status yang konsisten.
 */

const kelasFokus =
  'outline-none focus-visible:ring-3 focus-visible:ring-institusi-500/30 focus-visible:ring-offset-1';

export function Button({
  className = '',
  tone = 'primary',
  ukuran = 'normal',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** `danger-soft`: aksi berbahaya yang tampil tenang di halaman (garis merah). */
  tone?: 'primary' | 'secondary' | 'danger' | 'danger-soft';
  /** `kecil`: untuk aksi di dalam baris tabel atau daftar. */
  ukuran?: 'normal' | 'kecil';
  ref?: React.Ref<HTMLButtonElement>;
}) {
  const tones = {
    primary:
      'bg-institusi-600 text-white shadow-[0_1px_2px_rgb(132_55_15/0.25),inset_0_1px_0_rgb(255_255_255/0.12)] hover:bg-institusi-700 disabled:bg-slate-200 disabled:text-slate-500 disabled:opacity-100',
    secondary:
      'border border-slate-300 bg-white text-slate-800 shadow-[0_1px_2px_rgb(23_35_64/0.05)] hover:border-slate-400 hover:bg-slate-50',
    danger:
      'bg-red-600 text-white shadow-[0_1px_2px_rgb(153_27_27/0.25),inset_0_1px_0_rgb(255_255_255/0.12)] hover:bg-red-700 disabled:bg-slate-200 disabled:text-slate-500 disabled:opacity-100',
    'danger-soft':
      'border border-rose-200 bg-white text-rose-700 shadow-[0_1px_2px_rgb(23_35_64/0.05)] hover:border-rose-300 hover:bg-rose-50',
  };
  return (
    <button
      {...props}
      className={`panel-action inline-flex items-center justify-center gap-2 rounded-lg font-semibold ${ukuran === 'kecil' ? 'min-h-8 px-3 py-1 text-[0.8125rem]' : 'min-h-10 px-4 py-2 text-sm'} transition-[background-color,border-color,transform] duration-150 motion-safe:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:active:scale-100 ${kelasFokus} ${tones[tone]} ${className}`}
    />
  );
}

const kelasIsian =
  'w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 font-normal text-slate-950 shadow-[0_1px_2px_rgb(23_35_64/0.04)] transition-[border-color,box-shadow] duration-150 placeholder:text-slate-400 hover:border-slate-400 focus:border-institusi-500 focus:ring-3 focus:ring-institusi-500/20 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';

/** Tombol "pilih berkas" bawaan peramban dibuat seperti tombol sekunder kecil. */
const kelasBerkas =
  'cursor-pointer py-1.5 text-sm text-slate-600 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200';

const kelasLabel = 'panel-field grid min-w-0 gap-1.5 text-sm font-medium text-slate-800';

export function Field({
  label,
  id,
  className = '',
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label htmlFor={id} className={`${kelasLabel} ${className}`}>
      {label}
      <input
        {...props}
        id={id}
        className={`min-h-10 ${kelasIsian} ${props.type === 'file' ? kelasBerkas : ''}`}
      />
    </label>
  );
}

export function SelectField({
  label,
  id,
  children,
  className = '',
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label htmlFor={id} className={`${kelasLabel} ${className}`}>
      {label}
      <select {...props} id={id} className={`min-h-10 ${kelasIsian}`}>
        {children}
      </select>
    </label>
  );
}

export function TextAreaField({
  label,
  id,
  className = '',
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label htmlFor={id} className={`${kelasLabel} ${className}`}>
      {label}
      <textarea {...props} id={id} className={`min-h-24 py-2 ${kelasIsian}`} />
    </label>
  );
}

/** Warna lencana status. Satu warna untuk satu makna di seluruh panel. */
export type WarnaLencana = 'slate' | 'green' | 'amber' | 'red' | 'blue' | 'violet';
const WARNA_LENCANA: Record<WarnaLencana, { latar: string; titik: string }> = {
  slate: { latar: 'bg-slate-100 text-slate-700 ring-slate-500/15', titik: 'bg-slate-400' },
  green: { latar: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20', titik: 'bg-emerald-500' },
  amber: { latar: 'bg-amber-50 text-amber-800 ring-amber-600/25', titik: 'bg-amber-500' },
  red: { latar: 'bg-rose-50 text-rose-800 ring-rose-600/20', titik: 'bg-rose-500' },
  blue: { latar: 'bg-sky-50 text-sky-800 ring-sky-600/20', titik: 'bg-sky-500' },
  violet: { latar: 'bg-violet-50 text-violet-800 ring-violet-600/20', titik: 'bg-violet-500' },
};

export function Badge({
  children,
  color = 'slate',
}: {
  children: React.ReactNode;
  color?: WarnaLencana;
}) {
  const w = WARNA_LENCANA[color];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset ${w.latar}`}
    >
      <span aria-hidden className={`size-1.5 shrink-0 rounded-full ${w.titik}`} />
      {children}
    </span>
  );
}

export function Card({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'panel-card rounded-xl border border-sekat bg-white p-4 shadow-[0_1px_2px_rgb(28_25_23/0.04)]',
        className,
      )}
    >
      {children}
    </section>
  );
}

/** Kepala kartu: judul (dan keterangan) di kiri, aksi kecil di kanan. */
export function CardHeader({
  title,
  description,
  action,
  icon: Ikon,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        {Ikon && (
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-kanvas text-slate-500">
            <Ikon aria-hidden className="size-4" />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-[0.9375rem] leading-6 font-semibold text-tinta">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
        </div>
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

/** Kerangka pemuatan berkilau pelan; dipakai sebagai pengganti teks "Memuat…". */
export function Kerangka({ className = '' }: { className?: string }) {
  return <span aria-hidden className={`kerangka block ${className}`} />;
}

/** Beberapa baris kerangka untuk daftar atau tabel yang sedang dimuat. */
export function DaftarKerangka({ baris = 4, label = 'Memuat data' }: { baris?: number; label?: string }) {
  return (
    <div role="status" aria-label={label} className="grid divide-y divide-sekat">
      {Array.from({ length: baris }, (_, i) => (
        <div key={i} className="flex items-center gap-4 py-3.5">
          <Kerangka className="size-9 shrink-0 rounded-lg" />
          <div className="grid flex-1 gap-2">
            <Kerangka className={`h-3.5 ${i % 2 ? 'w-2/3' : 'w-1/2'}`} />
            <Kerangka className="h-3 w-1/3" />
          </div>
          <Kerangka className="hidden h-5 w-20 rounded-full sm:block" />
        </div>
      ))}
    </div>
  );
}

/** Keadaan kosong yang ramah: ikon, judul, penjelasan singkat, dan aksi opsional. */
export function Kosong({
  icon: Ikon = Inbox,
  title,
  children,
  action,
  nada = 'netral',
}: {
  icon?: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  /** `selesai`: tidak ada pekerjaan tersisa (ikon hijau). */
  nada?: 'netral' | 'selesai';
}) {
  return (
    <div role="status" className="grid justify-items-center px-4 py-10 text-center">
      <span
        className={`grid size-12 place-items-center rounded-2xl ${nada === 'selesai' ? 'bg-emerald-50 text-emerald-600' : 'bg-kanvas text-slate-400'}`}
      >
        <Ikon aria-hidden className="size-5.5" />
      </span>
      <p className="mt-4 font-semibold text-tinta">{title}</p>
      {children && <div className="mt-1 max-w-sm text-sm leading-relaxed text-slate-500">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function StateMessage({
  title,
  children,
  kind = 'info',
}: {
  title: string;
  children?: React.ReactNode;
  kind?: 'info' | 'error' | 'empty';
}) {
  const Ikon = kind === 'error' ? AlertTriangle : kind === 'empty' ? Inbox : Info;
  return (
    <div
      role={kind === 'error' ? 'alert' : 'status'}
      className={`flex gap-3 rounded-xl border p-4 ${kind === 'error' ? 'border-rose-200 bg-rose-50 text-rose-900' : 'border-slate-200 bg-slate-50/80 text-slate-700'}`}
    >
      <Ikon
        aria-hidden
        className={`mt-0.5 size-5 shrink-0 ${kind === 'error' ? 'text-rose-500' : 'text-slate-400'}`}
      />
      <div className="min-w-0">
        <p className="font-semibold">{title}</p>
        {children && <div className="mt-1 text-sm leading-relaxed">{children}</div>}
      </div>
    </div>
  );
}

export function Feedback({
  value,
  onDismiss,
}: {
  value?: { type: 'success' | 'error'; message: string };
  onDismiss?: () => void;
}) {
  if (!value) return null;
  const sukses = value.type === 'success';
  const Ikon = sukses ? CheckCircle2 : XCircle;
  return (
    <div
      role={sukses ? 'status' : 'alert'}
      className={`flex items-start gap-2.5 rounded-lg border p-3 text-sm ${sukses ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-rose-200 bg-rose-50 text-rose-900'}`}
    >
      <Ikon
        aria-hidden
        className={`mt-px size-4 shrink-0 ${sukses ? 'text-emerald-600' : 'text-rose-500'}`}
      />
      <span className="min-w-0 flex-1">{value.message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Tutup pemberitahuan"
          className="-m-1 rounded p-1 opacity-60 hover:opacity-100"
        >
          <X aria-hidden className="size-4" />
        </button>
      )}
    </div>
  );
}

function PesanError(error: unknown) {
  return error instanceof GalatApi
    ? error.message
    : error instanceof Error
      ? error.message
      : 'Permintaan gagal. Silakan coba lagi.';
}

export function ConfirmAction({
  label,
  title,
  description,
  confirmLabel = 'Ya, lanjutkan',
  tone = 'primary',
  ukuran = 'normal',
  disabled,
  confirmDisabled,
  children,
  onConfirm,
}: {
  label: string;
  title: string;
  description: string;
  confirmLabel?: string;
  tone?: 'primary' | 'secondary' | 'danger';
  /** Ukuran tombol pemicu; dialog konfirmasi selalu berukuran normal. */
  ukuran?: 'normal' | 'kecil';
  disabled?: boolean;
  /** Menonaktifkan tombol konfirmasi di dalam dialog, mis. selama alasan belum diisi. */
  confirmDisabled?: boolean;
  /** Isian tambahan di dalam dialog, di bawah deskripsi (mis. kolom alasan). */
  children?: React.ReactNode;
  onConfirm: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string }>();
  const cancel = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const processing = useRef(false);
  useEffect(() => {
    if (ukuran !== 'kecil' || feedback?.type !== 'success') return;
    const pewaktu = window.setTimeout(() => setFeedback(undefined), 4000);
    return () => window.clearTimeout(pewaktu);
  }, [ukuran, feedback]);
  async function confirm() {
    if (processing.current || confirmDisabled) return;
    processing.current = true;
    setBusy(true);
    setFeedback(undefined);
    try {
      await onConfirm();
      setFeedback({ type: 'success', message: 'Perubahan berhasil disimpan.' });
      setOpen(false);
    } catch (error) {
      setFeedback({ type: 'error', message: PesanError(error) });
    } finally {
      processing.current = false;
      setBusy(false);
    }
  }
  // Di dalam halaman, tombol "bahaya" tampil tenang (garis merah); merah penuh
  // hanya di dialog konfirmasi, tepat sebelum tindakan benar-benar dijalankan.
  const bahaya = tone === 'danger';
  return (
    <div className="grid gap-2">
      <Button
        type="button"
        tone={bahaya ? 'danger-soft' : tone}
        ukuran={ukuran}
        disabled={disabled || busy}
        onClick={(event) => {
          trigger.current = event.currentTarget;
          setFeedback(undefined);
          setOpen(true);
        }}
      >
        {label}
      </Button>
      {!open &&
        (ukuran === 'kecil' && feedback?.type === 'success' ? (
          // Tombol kecil berada di sel tabel/daftar: umpan balik sukses melayang
          // di pojok layar agar baris tidak melebar, lalu hilang sendiri.
          <div
            data-state="open"
            className="ui-menu fixed right-4 bottom-4 z-50 w-[min(22rem,calc(100vw-2rem))] text-left shadow-lg"
          >
            <Feedback value={feedback} onDismiss={() => setFeedback(undefined)} />
          </div>
        ) : (
          <Feedback value={feedback} />
        ))}
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!processing.current) setOpen(value);
        }}
      >
        <DialogContent
          closeDisabled={busy}
          aria-busy={busy}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            cancel.current?.focus();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (trigger.current?.isConnected) trigger.current.focus();
          }}
        >
          <DialogHeader>
            <span
              aria-hidden
              className="ui-dialog-icon mb-1"
              data-tone={bahaya ? 'danger' : 'primary'}
            >
              {bahaya ? <AlertTriangle className="size-5" /> : <ArrowRight className="size-5" />}
            </span>
            <span className="text-[10px] font-semibold tracking-[0.16em] text-slate-400 uppercase">
              Konfirmasi tindakan
            </span>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {children && <div className="grid gap-4">{children}</div>}
          {feedback?.type === 'error' && <Feedback value={feedback} />}
          <DialogFooter>
            <Button
              ref={cancel}
              type="button"
              tone="secondary"
              disabled={busy}
              onClick={() => setOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="button"
              tone={tone}
              disabled={busy || confirmDisabled}
              onClick={() => void confirm()}
            >
              {busy ? (
                <LoaderCircle aria-hidden className="size-4 animate-spin" />
              ) : (
                <ArrowRight aria-hidden className="size-4" />
              )}
              {busy ? 'Memproses…' : confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function PageTitle({
  title,
  description,
  action,
  meta,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  /** Baris kecil di atas judul, mis. lencana tahap atau tautan kembali. */
  meta?: React.ReactNode;
}) {
  return (
    <div className="panel-title mb-4 flex flex-wrap items-end justify-between gap-x-5 gap-y-3">
      <div className="min-w-0 flex-1 basis-80">
        {meta && <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">{meta}</div>}
        <h1 className="text-[1.375rem] leading-tight font-bold tracking-[-0.02em] text-tinta [overflow-wrap:anywhere] sm:text-2xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-4xl text-sm leading-relaxed text-slate-500">
            {description}
          </p>
        )}
      </div>
      {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}

/** Tautan bergaya tombol utama, untuk aksi yang berpindah halaman. */
export const kelasTautanUtama =
  'panel-action tekan inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-institusi-600 px-4 text-sm font-semibold text-white shadow-[0_1px_2px_rgb(132_55_15/0.25),inset_0_1px_0_rgb(255_255_255/0.12)] hover:bg-institusi-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-institusi-500';
/** Tautan bergaya tombol sekunder. */
export const kelasTautanSekunder =
  'panel-action tekan inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 shadow-[0_1px_2px_rgb(23_35_64/0.05)] hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-institusi-500';
