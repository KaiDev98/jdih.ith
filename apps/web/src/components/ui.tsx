'use client';

import { useEffect, useRef, useState } from 'react';
import { GalatApi } from '@/lib/api-client';

export function Button({ className = '', tone = 'primary', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'primary' | 'secondary' | 'danger'; ref?: React.Ref<HTMLButtonElement> }) {
  const tones = { primary: 'bg-blue-800 text-white hover:bg-blue-900', secondary: 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50', danger: 'bg-red-700 text-white hover:bg-red-800' };
  return <button {...props} className={`inline-flex min-h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${tones[tone]} ${className}`} />;
}

export function Field({ label, id, className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label htmlFor={id} className={`grid min-w-0 gap-1.5 text-sm font-medium text-slate-800 ${className}`}>{label}<input {...props} id={id} className="min-h-10 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 font-normal text-slate-950 placeholder:text-slate-400 focus:border-blue-700 focus:outline-2 focus:outline-offset-2 focus:outline-blue-700" /></label>;
}

export function SelectField({ label, id, children, className = '', ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return <label htmlFor={id} className={`grid min-w-0 gap-1.5 text-sm font-medium text-slate-800 ${className}`}>{label}<select {...props} id={id} className="min-h-10 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 font-normal text-slate-950 focus:border-blue-700 focus:outline-2 focus:outline-offset-2 focus:outline-blue-700">{children}</select></label>;
}

export function TextAreaField({ label, id, className = '', ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return <label htmlFor={id} className={`grid min-w-0 gap-1.5 text-sm font-medium text-slate-800 ${className}`}>{label}<textarea {...props} id={id} className="min-h-24 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 font-normal text-slate-950 focus:border-blue-700 focus:outline-2 focus:outline-offset-2 focus:outline-blue-700" /></label>;
}

export function Badge({ children, color = 'slate' }: { children: React.ReactNode; color?: 'slate' | 'green' | 'amber' | 'red' | 'blue' }) {
  const colors = { slate: 'bg-slate-100 text-slate-700', green: 'bg-green-100 text-green-900', amber: 'bg-amber-100 text-amber-900', red: 'bg-red-100 text-red-900', blue: 'bg-blue-100 text-blue-900' };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${colors[color]}`}>{children}</span>;
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) { return <section className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>{children}</section>; }

export function StateMessage({ title, children, kind = 'info' }: { title: string; children?: React.ReactNode; kind?: 'info' | 'error' | 'empty' }) {
  return <div role={kind === 'error' ? 'alert' : 'status'} className={`rounded-lg border p-4 ${kind === 'error' ? 'border-red-200 bg-red-50 text-red-900' : 'border-slate-200 bg-slate-50 text-slate-700'}`}><p className="font-semibold">{title}</p>{children && <div className="mt-1 text-sm">{children}</div>}</div>;
}

export function Feedback({ value, onDismiss }: { value?: { type: 'success' | 'error'; message: string }; onDismiss?: () => void }) {
  if (!value) return null;
  return <div role={value.type === 'error' ? 'alert' : 'status'} className={`rounded-md border p-3 text-sm ${value.type === 'error' ? 'border-red-300 bg-red-50 text-red-900' : 'border-green-300 bg-green-50 text-green-900'}`}>{value.message}{onDismiss && <button type="button" onClick={onDismiss} aria-label="Tutup pemberitahuan" className="float-right font-bold">×</button>}</div>;
}

function PesanError(error: unknown) { return error instanceof GalatApi ? error.message : error instanceof Error ? error.message : 'Permintaan gagal. Silakan coba lagi.'; }

export function ConfirmAction({ label, title, description, confirmLabel = 'Ya, lanjutkan', tone = 'primary', disabled, onConfirm }: {
  label: string; title: string; description: string; confirmLabel?: string; tone?: 'primary' | 'secondary' | 'danger'; disabled?: boolean;
  onConfirm: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false); const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string }>();
  const dialog = useRef<HTMLDivElement>(null); const cancel = useRef<HTMLButtonElement>(null); const trigger = useRef<HTMLElement | null>(null);
  useEffect(() => { if (open) { trigger.current = document.activeElement as HTMLElement | null; cancel.current?.focus(); } else trigger.current?.focus(); }, [open]);
  useEffect(() => { if (!open) return; const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !busy) setOpen(false); if (event.key === 'Tab' && dialog.current) { const items = [...dialog.current.querySelectorAll<HTMLElement>('button:not(:disabled),[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])')]; const first = items[0], last = items[items.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); } } }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [open, busy]);
  async function confirm() { setBusy(true); setFeedback(undefined); try { await onConfirm(); setFeedback({ type: 'success', message: 'Perubahan berhasil disimpan.' }); setOpen(false); } catch (error) { setFeedback({ type: 'error', message: PesanError(error) }); } finally { setBusy(false); } }
  return <div className="grid gap-2"><Button type="button" tone={tone} disabled={disabled || busy} onClick={(event) => { trigger.current = event.currentTarget; setOpen(true); }}>{label}</Button><Feedback value={feedback} />{open && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setOpen(false); }}><div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description" className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"><h2 id="confirm-title" className="text-lg font-bold">{title}</h2><p id="confirm-description" className="mt-2 text-sm text-slate-600">{description}</p><div className="mt-6 flex justify-end gap-3"><Button ref={cancel} type="button" tone="secondary" disabled={busy} onClick={() => setOpen(false)}>Batal</Button><Button type="button" tone={tone} disabled={busy} onClick={() => void confirm()}>{busy ? 'Memproses…' : confirmLabel}</Button></div></div></div>}</div>;
}

export function PageTitle({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-bold tracking-tight text-slate-950">{title}</h1>{description && <p className="mt-2 max-w-3xl text-slate-600">{description}</p>}</div>{action}</div>;
}
