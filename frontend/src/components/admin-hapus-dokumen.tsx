'use client';

import { useRouterPanel as useRouter } from '@/components/admin/tautan-panel';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { ambilApi } from '@/lib/api-client';
import { csrfHeaders, useSession } from '@/lib/sesi';
import { Card, ConfirmAction, Field } from '@/components/ui';

/**
 * Hapus dokumen secara permanen; hanya tampil bila akun memiliki izinnya.
 * Status hukum tidak diubah dari sini: Diubah/Dicabut hanya terjadi lewat
 * dokumen pengubah/pencabut yang terbit (lihat kartu Status hukum).
 */
export function AdminHapusDokumen({ id, judul }: { id: string; judul: string }) {
  const { pengguna, csrfToken } = useSession();
  const router = useRouter();
  const [ketikJudul, setKetikJudul] = useState('');
  const bolehHapus = pengguna?.peran.includes('SUPERADMIN') && pengguna.izin.includes('documents.delete');

  async function hapus() {
    await ambilApi(`/admin/documents/${id}`, { method: 'DELETE', headers: csrfHeaders(csrfToken) });
    router.replace('/admin/dokumen');
  }

  return (
    <Card className="border-rose-200 bg-rose-50/30">
      <details className="panel-lanjutan">
        <summary className="flex cursor-pointer items-center justify-between gap-3 rounded-md text-sm font-semibold text-rose-900 outline-none focus-visible:ring-2 focus-visible:ring-rose-400">
          Tindakan lanjutan
          <ChevronDown aria-hidden className="size-4 shrink-0 transition-transform" />
        </summary>
      <h2 className="mt-3 text-sm font-bold text-rose-900">Hapus permanen</h2>
      <p className="mt-1 text-sm text-slate-600">
        Dokumen, seluruh versi, dan berkasnya dihapus dan tidak lagi tampil di web. Tindakan ini
        tidak dapat dibatalkan.
      </p>
      <fieldset disabled={!bolehHapus} className="mt-4 grid min-w-0 gap-3">
        <Field
          label="Ketik judul dokumen untuk konfirmasi"
          id="hapus-judul"
          autoComplete="off"
          value={ketikJudul}
          onChange={(e) => setKetikJudul(e.target.value)}
        />
        <ConfirmAction
          label="Hapus permanen"
          tone="danger"
          title="Hapus dokumen ini secara permanen?"
          description={`"${judul}" beserta seluruh versi dan berkasnya akan dihapus selamanya.`}
          confirmLabel="Ya, hapus permanen"
          disabled={ketikJudul.trim() !== judul.trim()}
          onConfirm={hapus}
        />
      </fieldset>
      </details>
    </Card>
  );
}
