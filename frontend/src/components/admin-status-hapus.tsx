'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ambilApi } from '@/lib/api-client';
import { csrfHeaders, useSession } from '@/lib/sesi';
import { Card, ConfirmAction, Field, SelectField, TextAreaField } from '@/components/ui';

const STATUS = [
  { nilai: 'BERLAKU', teks: 'Berlaku' },
  { nilai: 'DIUBAH', teks: 'Diubah' },
  { nilai: 'DICABUT', teks: 'Dicabut' },
] as const;

/**
 * Ubah status hukum (Berlaku/Diubah/Dicabut) secara langsung dan hapus dokumen
 * secara permanen. Masing-masing hanya tampil bila akun memiliki izinnya.
 */
export function AdminStatusHapus({
  id,
  judul,
  statusHukum,
  onBerubah,
}: {
  id: string;
  judul: string;
  statusHukum: string;
  onBerubah: () => void;
}) {
  const { pengguna, csrfToken } = useSession();
  const router = useRouter();
  const izin = pengguna?.izin ?? [];
  const [status, setStatus] = useState(statusHukum);
  const [alasan, setAlasan] = useState('');
  const [ketikJudul, setKetikJudul] = useState('');
  const bolehStatus = izin.includes('legal.correct_status');
  const bolehHapus = izin.includes('documents.delete');
  if (!bolehStatus && !bolehHapus) return null;
  const teksStatus = STATUS.find((s) => s.nilai === status)?.teks ?? status;

  async function simpanStatus() {
    await ambilApi(`/admin/documents/${id}/legal-status`, {
      method: 'PATCH',
      headers: csrfHeaders(csrfToken),
      muatan: { statusHukum: status, alasan },
    });
    setAlasan('');
    onBerubah();
  }

  async function hapus() {
    await ambilApi(`/admin/documents/${id}`, { method: 'DELETE', headers: csrfHeaders(csrfToken) });
    router.replace('/admin/dokumen');
  }

  return (
    <div className="mb-5 grid gap-5 lg:grid-cols-2">
      {bolehStatus && (
        <Card>
          <h2 className="text-lg font-bold">Status hukum</h2>
          <p className="mt-1 text-sm text-slate-600">
            Status tampil di portal publik pada daftar dan detail dokumen.
          </p>
          <div className="mt-4 grid gap-3">
            <SelectField
              label="Status"
              id="status-hukum"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {STATUS.map((s) => (
                <option key={s.nilai} value={s.nilai}>
                  {s.teks}
                </option>
              ))}
            </SelectField>
            <TextAreaField
              label="Alasan perubahan"
              id="status-alasan"
              maxLength={1000}
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
            />
            <ConfirmAction
              label="Simpan status"
              title={`Ubah status menjadi ${teksStatus}?`}
              description="Perubahan status langsung tampil di portal publik dan dicatat di riwayat."
              disabled={status === statusHukum || !alasan.trim()}
              onConfirm={simpanStatus}
            />
          </div>
        </Card>
      )}
      {bolehHapus && (
        <Card className="border-red-200">
          <h2 className="text-lg font-bold text-red-900">Hapus permanen</h2>
          <p className="mt-1 text-sm text-slate-600">
            Dokumen, seluruh versi, dan berkasnya dihapus dan tidak lagi tampil di web. Tindakan ini
            tidak dapat dibatalkan.
          </p>
          <div className="mt-4 grid gap-3">
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
          </div>
        </Card>
      )}
    </div>
  );
}
