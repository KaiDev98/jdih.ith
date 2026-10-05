'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button, Feedback } from './ui';

export function UnduhTemplate({ slug, nama }: { slug: string; nama: string }) {
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function download() { setBusy(true); setError(''); try { const response = await fetch(`/api/v1/letter-templates/${encodeURIComponent(slug)}/download`, { credentials: 'include' }); if (!response.ok) throw new Error(response.status === 404 || response.status === 403 ? 'Format tidak tersedia atau akun Anda belum memiliki akses.' : 'Unduhan gagal.'); const blob = await response.blob(); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = nama; link.click(); URL.revokeObjectURL(url); } catch (e) { setError(e instanceof Error ? e.message : 'Unduhan gagal.'); } finally { setBusy(false); } }
  return <div className="grid justify-items-start gap-2"><Button type="button" disabled={busy} onClick={() => void download()}><Download aria-hidden className="mr-2 size-4" />{busy ? 'Mengunduh…' : 'Download'}</Button><Feedback value={error ? { type: 'error', message: error } : undefined} /></div>;
}
