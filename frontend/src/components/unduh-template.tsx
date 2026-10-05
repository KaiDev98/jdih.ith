'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button, Feedback } from './ui';

/**
 * Nama berkas diambil dari tajuk Content-Disposition peladen, bukan dirakit di
 * sini. Format persuratan dapat berupa DOCX, PDF, atau jenis lain, sehingga
 * ekstensi tidak boleh ditebak; peladen yang tahu nama dan jenis aslinya.
 */
function namaDariTajuk(tajuk: string | null): string | null {
  if (!tajuk) return null;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(tajuk);
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1]);
    } catch {
      // Jatuh ke bentuk ASCII di bawah.
    }
  }
  const ascii = /filename="([^"]+)"/i.exec(tajuk);
  return ascii?.[1] ?? null;
}

export function UnduhTemplate({ slug, nama }: { slug: string; nama: string }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function download() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(
        `/api/v1/letter-templates/${encodeURIComponent(slug)}/download`,
        {
          credentials: 'include',
        },
      );
      // Pesan sengaja netral: tidak menyiratkan ada format yang dibatasi aksesnya.
      if (!response.ok)
        throw new Error(response.status === 404 ? 'Format tidak tersedia.' : 'Unduhan gagal.');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = namaDariTajuk(response.headers.get('content-disposition')) ?? nama;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unduhan gagal.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="grid justify-items-start gap-2">
      <Button type="button" disabled={busy} onClick={() => void download()}>
        <Download aria-hidden className="mr-2 size-4" />
        {busy ? 'Mengunduh…' : 'Download'}
      </Button>
      <Feedback value={error ? { type: 'error', message: error } : undefined} />
    </div>
  );
}
