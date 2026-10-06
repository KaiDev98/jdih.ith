'use client';

import { useCallback, useEffect, useState } from 'react';
import { ambilApi, GalatApi } from '@/lib/api-client';
import { csrfHeaders, useSession } from '@/lib/sesi';
import { Badge, Card, ConfirmAction, Field, StateMessage } from '@/components/ui';

type Akun = {
  id: string;
  nama: string;
  email: string;
  status: string;
  unitKerja: string | null;
  peran: string[];
  createdAt: string;
};

const NAMA_PERAN: Record<string, string> = {
  SUPERADMIN: 'Superadmin',
  ADMIN: 'Admin',
  DOSEN_STAF: 'Dosen/Staf',
};
const STATUS: Record<string, { teks: string; warna: 'green' | 'amber' | 'red' | 'slate' }> = {
  AKTIF: { teks: 'Aktif', warna: 'green' },
  MENUNGGU_VERIFIKASI: { teks: 'Menunggu', warna: 'amber' },
  DITOLAK: { teks: 'Ditolak', warna: 'red' },
  NONAKTIF: { teks: 'Nonaktif', warna: 'slate' },
};

/**
 * Semua akun terdaftar. Pemegang izin users.delete (Admin dan Superadmin) dapat
 * menghapus akun Dosen/Staf maupun Admin; akun sendiri dan akun Superadmin tidak
 * dapat dihapus.
 */
export function DaftarAkun() {
  const { pengguna, csrfToken } = useSession();
  const [akun, setAkun] = useState<Akun[]>();
  const [galat, setGalat] = useState('');
  const [cari, setCari] = useState('');
  const bolehHapus = pengguna?.izin.includes('users.delete') ?? false;

  const muat = useCallback(() => {
    ambilApi<Akun[]>('/admin/users/accounts', { kueri: { halaman: 1, perHalaman: 100 } })
      .then((data) => {
        setAkun(data);
        setGalat('');
      })
      .catch((e: unknown) =>
        setGalat(e instanceof GalatApi ? e.message : 'Daftar akun tidak dapat dimuat.'),
      );
  }, []);
  useEffect(muat, [muat]);

  async function hapus(id: string) {
    await ambilApi(`/admin/users/${id}`, { method: 'DELETE', headers: csrfHeaders(csrfToken) });
    muat();
  }

  const kata = cari.trim().toLowerCase();
  const tampil = (akun ?? []).filter(
    (a) => !kata || a.nama.toLowerCase().includes(kata) || a.email.toLowerCase().includes(kata),
  );

  return (
    <Card className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold">Semua akun</h2>
          <p className="mt-1 text-sm text-slate-600">
            Akun yang terdaftar di portal.
            {bolehHapus && ' Akun yang dihapus langsung keluar dan tidak dapat masuk lagi.'}
          </p>
        </div>
        <Field
          className="w-full sm:w-72"
          label="Cari nama atau email"
          id="cari-akun"
          value={cari}
          onChange={(e) => setCari(e.target.value)}
        />
      </div>
      {galat && (
        <div className="mt-4">
          <StateMessage title="Daftar akun belum dapat dimuat" kind="error">
            {galat}
          </StateMessage>
        </div>
      )}
      {akun === undefined && !galat ? (
        <p className="mt-4 text-sm text-slate-600">Memuat…</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b text-slate-500">
                <th className="py-3">Nama</th>
                <th>Email</th>
                <th>Peran</th>
                <th>Unit</th>
                <th>Status</th>
                {bolehHapus && <th className="sr-only">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {tampil.map((a) => {
                const status = STATUS[a.status] ?? { teks: a.status, warna: 'slate' as const };
                const diri = a.id === pengguna?.id;
                const superadmin = a.peran.includes('SUPERADMIN');
                return (
                  <tr key={a.id}>
                    <td className="py-3 font-medium">
                      {a.nama}
                      {diri && <span className="ml-1.5 text-xs text-slate-500">(Anda)</span>}
                    </td>
                    <td className="[overflow-wrap:anywhere]">{a.email}</td>
                    <td>{a.peran.map((p) => NAMA_PERAN[p] ?? p).join(', ') || '—'}</td>
                    <td>{a.unitKerja ?? '—'}</td>
                    <td>
                      <Badge color={status.warna}>{status.teks}</Badge>
                    </td>
                    {bolehHapus && (
                      <td className="py-2 text-right">
                        {!diri && !superadmin && (
                          <ConfirmAction
                            label="Hapus"
                            tone="danger"
                            title="Hapus akun ini?"
                            description={`Akun ${a.nama} (${a.email}) dihapus, sesi loginnya dicabut, dan tidak dapat masuk lagi. Tindakan ini tercatat di audit.`}
                            confirmLabel="Ya, hapus akun"
                            onConfirm={() => hapus(a.id)}
                          />
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {tampil.length === 0 && (
            <p className="py-6 text-sm text-slate-600">
              {kata ? 'Tidak ada akun yang cocok.' : 'Belum ada akun.'}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
