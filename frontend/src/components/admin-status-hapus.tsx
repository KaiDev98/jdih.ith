'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { KeteranganStatus } from '@jdih/shared';
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
  keterangan,
  keteranganPublik,
  onBerubah,
}: {
  id: string;
  judul: string;
  statusHukum: string;
  /** Keterangan yang sedang tampil di portal untuk status Diubah/Dicabut. */
  keterangan?: KeteranganStatus | null;
  /** Versi yang dilihat pengunjung tanpa akun; hanya untuk dokumen Publik yang terbit. */
  keteranganPublik?: KeteranganStatus | null;
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
  // Status sama boleh disimpan bila hanya alasannya yang dilengkapi.
  const hanyaAlasan = status === statusHukum;
  const tertutupBagiUmum =
    keteranganPublik !== undefined &&
    Boolean(
      (keterangan?.alasan && !keteranganPublik?.alasan) ||
      (keterangan?.sumber && !keteranganPublik?.sumber),
    );

  async function simpanStatus() {
    await ambilApi(`/admin/documents/${id}/legal-status`, {
      method: 'PATCH',
      headers: csrfHeaders(csrfToken),
      muatan: { statusHukum: status, alasan: alasan.trim() || null },
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
          {statusHukum !== 'BERLAKU' && (
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="font-semibold">Keterangan yang tampil di portal</p>
              <p className="mt-1 text-slate-700">{keterangan?.alasan ?? 'Belum ada alasan.'}</p>
              {keterangan?.sumber && (
                <p className="mt-1 text-slate-600">
                  Oleh:{' '}
                  <Link className="underline" href={`/produk-hukum/${keterangan.sumber.slug}`}>
                    {keterangan.sumber.judul}
                  </Link>
                </p>
              )}
              {tertutupBagiUmum && (
                <p className="mt-2 text-xs text-slate-600">
                  Dokumen pengubah/pencabutnya Internal, jadi pengunjung tanpa akun hanya melihat
                  status dan tanggal. Tulis alasan di bawah bila ingin alasannya tampil untuk umum.
                </p>
              )}
            </div>
          )}
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
            <div className="grid gap-1">
              <TextAreaField
                label="Alasan (opsional)"
                id="status-alasan"
                maxLength={1000}
                placeholder="mis. Dicabut karena digantikan peraturan yang baru."
                value={alasan}
                onChange={(e) => setAlasan(e.target.value)}
              />
              <p className="text-xs text-slate-500">
                Untuk status Diubah/Dicabut, alasan tampil di halaman publik dokumen ini. Untuk
                melengkapi alasan tanpa mengganti status, biarkan status apa adanya lalu simpan.
              </p>
            </div>
            <ConfirmAction
              label={hanyaAlasan ? 'Simpan alasan' : 'Simpan status'}
              title={
                hanyaAlasan
                  ? `Simpan alasan status ${teksStatus}?`
                  : `Ubah status menjadi ${teksStatus}?`
              }
              description={
                hanyaAlasan
                  ? 'Alasan baru langsung tampil di portal publik dan dicatat di riwayat.'
                  : 'Perubahan status langsung tampil di portal publik dan dicatat di riwayat.'
              }
              disabled={hanyaAlasan && (status === 'BERLAKU' || !alasan.trim())}
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
