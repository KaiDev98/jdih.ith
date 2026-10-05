'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, Eye, X } from 'lucide-react';
import { Button, Feedback } from './ui';

export function FileProduk({ slug, fileId, nama }: { slug: string; fileId: string; nama: string }) {
  const [show, setShow] = useState(false); const [url, setUrl] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [downloadError, setDownloadError] = useState('');
  const dialog=useRef<HTMLElement>(null); const closeButton=useRef<HTMLButtonElement>(null); const opener=useRef<HTMLElement|null>(null);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  useEffect(()=>{if(!show){opener.current?.focus();return;}closeButton.current?.focus();const key=(event:KeyboardEvent)=>{if(event.key==='Escape')setShow(false);if(event.key==='Tab'&&dialog.current){const items=[...dialog.current.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],iframe,[tabindex]:not([tabindex="-1"])')];if(event.shiftKey&&document.activeElement===items[0]){event.preventDefault();items.at(-1)?.focus();}else if(!event.shiftKey&&document.activeElement===items.at(-1)){event.preventDefault();items[0]?.focus();}}};const keepFocus=(event:FocusEvent)=>{if(dialog.current&&event.target instanceof Node&&!dialog.current.contains(event.target))closeButton.current?.focus();};window.addEventListener('keydown',key);document.addEventListener('focusin',keepFocus);return()=>{window.removeEventListener('keydown',key);document.removeEventListener('focusin',keepFocus);};},[show]);
  async function preview() {
    setShow(true); setBusy(true); setError(''); setUrl('');
    try { const response = await fetch(`/api/v1/public/documents/${encodeURIComponent(slug)}/files/${encodeURIComponent(fileId)}?mode=inline`, { credentials: 'include' }); if (!response.ok) throw new Error(response.status === 404 || response.status === 403 ? 'Berkas tidak tersedia atau akun ini tidak memiliki akses.' : 'Pratinjau gagal dimuat.'); const blob = await response.blob(); setUrl(URL.createObjectURL(blob)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Pratinjau gagal dimuat.'); }
    finally { setBusy(false); }
  }
  async function download() {
    setDownloadError('');
    try { const response = await fetch(`/api/v1/public/documents/${encodeURIComponent(slug)}/files/${encodeURIComponent(fileId)}?mode=download`, { credentials: 'include' }); if (!response.ok) throw new Error(response.status === 404 || response.status === 403 ? 'Berkas tidak tersedia atau akun ini tidak memiliki akses.' : 'Unduhan gagal.'); const blob = await response.blob(); const objectUrl = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = objectUrl; a.download = nama; a.click(); window.setTimeout(()=>URL.revokeObjectURL(objectUrl),1000); }
    catch (e) { setDownloadError(e instanceof Error ? e.message : 'Unduhan gagal.'); }
  }
  return <div className="grid justify-items-start gap-2 sm:flex sm:flex-wrap sm:items-center"><div className="flex flex-wrap gap-2"><Button type="button" tone="secondary" onClick={(event)=>{opener.current=event.currentTarget;void preview();}}><Eye aria-hidden className="mr-2 size-4" />Preview</Button><Button type="button" onClick={() => void download()}><Download aria-hidden className="mr-2 size-4" />Download</Button></div><Feedback value={downloadError ? { type: 'error', message: downloadError } : undefined} />{show && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-3 sm:p-6" role="presentation"><section ref={dialog} role="dialog" aria-modal="true" aria-labelledby="preview-title" className="flex h-[min(92vh,900px)] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"><header className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><h2 id="preview-title" className="truncate font-bold text-slate-950">Pratinjau · {nama}</h2><button ref={closeButton} type="button" aria-label="Tutup pratinjau" onClick={() => setShow(false)} className="grid size-10 place-items-center rounded-md hover:bg-slate-100"><X aria-hidden /></button></header><div className="min-h-0 flex-1 bg-slate-100 p-2">{busy ? <p role="status" className="p-5 text-slate-700">Memuat berkas…</p> : error ? <div className="p-5"><Feedback value={{ type: 'error', message: error }} /></div> : url ? <iframe title={`Pratinjau PDF ${nama}`} src={url} className="h-full w-full rounded-md bg-white" /> : <p className="p-5 text-slate-700">Pratinjau belum tersedia.</p>}</div></section></div>}</div>;
}
