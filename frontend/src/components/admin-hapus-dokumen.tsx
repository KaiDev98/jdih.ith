'use client';

import { useRouterPanel as useRouter } from '@/components/admin/tautan-panel';
import { Trash2 } from 'lucide-react';
import { ambilApi } from '@/lib/api-client';
import { csrfHeaders, useSession } from '@/lib/sesi';
import { Card, ConfirmAction } from '@/components/ui';

/**
 * Hapus dokumen secara permanen; hanya tampil bila akun memiliki izinnya.
 * Status hukum tidak diubah dari sini; pencabutan mempertahankan dokumen,
 * sedangkan tindakan ini menghapus dokumen beserta berkasnya.
 */
export function AdminHapusDokumen({ id, judul, versionId }: { id: string; judul: string; versionId: string }) {
  const { pengguna, csrfToken } = useSession();
  const router = useRouter();
  const bolehHapus =
    pengguna?.peran.includes('SUPERADMIN') && pengguna.izin.includes('documents.delete');

  async function hapus() {
    await ambilApi(`/admin/documents/${id}`, { method: 'DELETE', headers: csrfHeaders(csrfToken), muatan: { versionId } });
    window.dispatchEvent(new Event('jdih:workflow'));
    router.replace('/admin/dokumen');
  }

  return (
    <Card className="detail-hapus-permanen flex flex-col border-rose-200 bg-rose-50/30">
      <h2 className="flex items-center gap-2 text-sm font-bold text-rose-900">
        <Trash2 aria-hidden className="size-4" /> Hapus Seluruh Dokumen
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Menghapus dokumen beserta semua versi dan berkas. Tidak dapat dibatalkan.
      </p>
      <fieldset disabled={!bolehHapus} className="mt-3 grid min-w-0 gap-3">
        <ConfirmAction
          label="Hapus permanen" icon={Trash2}
          tone="danger"
          title="Hapus seluruh dokumen dan semua versinya?"
          description={`"${judul}" beserta seluruh versi dan berkasnya akan dihapus selamanya.`}
          confirmLabel="Ya, hapus permanen"
          disabled={!bolehHapus}
          onConfirm={hapus}
        />
      </fieldset>
    </Card>
  );
}
