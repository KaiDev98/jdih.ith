'use client';

import { surelUntukPanel } from '@jdih/shared';

import { useCallback, useEffect, useState } from 'react';
import { ambilApi, GalatApi } from '@/lib/api-client';
import { csrfHeaders, useSession } from '@/lib/sesi';
import { KeyRound, Search } from 'lucide-react';
import { Badge, Card, ConfirmAction, StateMessage } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Badge as LencanaPeran } from '@/components/ui/badge';
import { DialogAturUlangPassword } from '@/components/admin/dialog-kelola-admin';
import { inisial } from '@/components/admin/navigasi-admin';

type Akun = {
  id: string;
  nama: string;
  email: string;
  status: string;
  unitKerja: string | null;
  peran: string[];
  createdAt: string;
};

/** Lingkaran inisial; warnanya mengikuti peran agar mudah dibedakan sekilas. */
function AvatarInisial({ nama, peran }: { nama: string; peran: readonly string[] }) {
  const warna = peran.includes('SUPERADMIN')
    ? 'bg-institusi-50 text-institusi-700 ring-institusi-600/15'
    : peran.includes('ADMIN')
      ? 'bg-sky-50 text-sky-700 ring-sky-600/15'
      : 'bg-kanvas text-slate-600 ring-sekat';
  return (
    <span
      aria-hidden
      className={`grid size-8 shrink-0 place-items-center rounded-full text-[0.6875rem] font-bold ring-1 ring-inset ${warna}`}
    >
      {inisial(nama)}
    </span>
  );
}

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
 * Menonaktifkan akun Dosen/Staf aktif (sesi dicabut, akses Internal hilang)
 * atau mengaktifkannya kembali, dengan alasan yang tercatat di audit. Akun
 * tidak dihapus sehingga riwayatnya tetap utuh.
 */
function UbahStatusAkun({
  akun,
  onSelesai,
  disabled,
}: {
  akun: Akun;
  onSelesai: () => void;
  disabled: boolean;
}) {
  const { csrfToken } = useSession();
  const [alasan, setAlasan] = useState('');
  const nonaktifkan = akun.status === 'AKTIF';
  const idAlasan = `alasan-status-${akun.id}`;
  return (
    <ConfirmAction
      disabled={disabled}
      label={nonaktifkan ? 'Nonaktifkan' : 'Aktifkan kembali'}
      tone={nonaktifkan ? 'danger' : 'secondary'}
      ukuran="kecil"
      title={nonaktifkan ? 'Nonaktifkan akun ini?' : 'Aktifkan kembali akun ini?'}
      description={
        nonaktifkan
          ? `${akun.nama} langsung keluar dan tidak dapat membuka dokumen Dosen/Staf sampai diaktifkan kembali. Akun dan riwayatnya tidak dihapus.`
          : `${akun.nama} dapat masuk kembali dan membuka dokumen Dosen/Staf.`
      }
      confirmLabel={nonaktifkan ? 'Ya, nonaktifkan' : 'Ya, aktifkan'}
      confirmDisabled={!alasan.trim()}
      onConfirm={async () => {
        await ambilApi(`/admin/users/${akun.id}/status`, {
          method: 'PATCH',
          muatan: { status: nonaktifkan ? 'NONAKTIF' : 'AKTIF', alasan: alasan.trim() },
          headers: csrfHeaders(csrfToken),
        });
        setAlasan('');
        onSelesai();
      }}
    >
      <label htmlFor={idAlasan} className="text-sm font-medium text-slate-800">
        Alasan (wajib, tercatat di audit)
      </label>
      <textarea
        id={idAlasan}
        value={alasan}
        onChange={(e) => setAlasan(e.target.value)}
        maxLength={1000}
        rows={3}
        className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-institusi-500 focus:ring-3 focus:ring-institusi-500/20 focus:outline-none"
      />
    </ConfirmAction>
  );
}

/**
 * Daftar akun panel. Perubahan akun hanya untuk Superadmin dengan izin terkait.
 * Akun pengelola disiapkan melalui proses operations, tanpa pendaftaran di UI.
 */
export function DaftarAkun({
  kelompok = 'ADMIN',
  refreshToken = 0,
}: {
  kelompok?: 'ADMIN' | 'DOSEN_STAF';
  refreshToken?: number;
}) {
  const { pengguna, csrfToken } = useSession();
  const [akun, setAkun] = useState<Akun[]>();
  const [galat, setGalat] = useState('');
  const [cari, setCari] = useState('');
  const bolehHapus =
    !!pengguna?.peran.includes('SUPERADMIN') && pengguna.izin.includes('users.delete');
  const bolehUbahStatus =
    !!pengguna?.peran.includes('SUPERADMIN') && pengguna.izin.includes('users.set_status');
  // Hanya Superadmin yang mengelola akun Admin (dicek ulang di backend).
  const superadminAktif = pengguna?.peran.includes('SUPERADMIN') ?? false;
  const [aturUlang, setAturUlang] = useState<Akun>();
  const adaAksi = true;

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
  useEffect(muat, [muat, refreshToken]);

  async function hapus(id: string) {
    await ambilApi(`/admin/users/${id}`, { method: 'DELETE', headers: csrfHeaders(csrfToken) });
    muat();
  }

  const kata = cari.trim().toLowerCase();
  const tampil = (akun ?? [])
    .filter((a) => {
      const pengelola = a.peran.some((p) => p === 'ADMIN' || p === 'SUPERADMIN');
      return (
        (kelompok === 'ADMIN' ? pengelola : !pengelola && a.peran.includes('DOSEN_STAF')) &&
        (!kata ||
          a.nama.toLowerCase().includes(kata) ||
          a.email.toLowerCase().includes(kata) ||
          (a.peran.includes('SUPERADMIN') ? 'superadmin' : a.unitKerja?.toLowerCase())?.includes(
            kata,
          ))
      );
    })
    .sort((a, b) => {
      const urutan = (a: Akun) =>
        a.peran.includes('SUPERADMIN') ? 0 : a.id === pengguna?.id ? 1 : 2;
      return urutan(a) - urutan(b);
    });

  /** Lencana peran: Superadmin oranye, Admin biru, Dosen/Staf abu. */
  const lencanaPeran = (peran: readonly string[]) => (
    <span className="flex flex-wrap gap-1">
      {peran.length
        ? peran.map((p) => (
            <LencanaPeran
              key={p}
              variant={p === 'SUPERADMIN' ? 'superadmin' : p === 'ADMIN' ? 'admin' : 'default'}
            >
              {NAMA_PERAN[p] ?? p}
            </LencanaPeran>
          ))
        : '—'}
    </span>
  );
  /** Tombol aksi satu akun; akun sendiri dan Superadmin tidak dapat diubah dari sini. */
  const aksi = (a: Akun) => {
    const diri = a.id === pengguna?.id;
    const superadmin = a.peran.includes('SUPERADMIN');
    return (
      <>
        {!diri && !superadmin && a.peran.includes('ADMIN') && (
          <Button
            variant="outline"
            size="sm"
            disabled={!superadminAktif}
            onClick={() => setAturUlang(a)}
          >
            <KeyRound />
            Atur ulang password
          </Button>
        )}
        {/* Backend hanya mengubah status akun Dosen/Staf: Aktif <-> Nonaktif. */}
        {!diri &&
          a.peran.length === 1 &&
          a.peran[0] === 'DOSEN_STAF' &&
          (a.status === 'AKTIF' || a.status === 'NONAKTIF') && (
            <UbahStatusAkun akun={a} onSelesai={muat} disabled={!bolehUbahStatus} />
          )}
        {!diri && !superadmin && (
          <ConfirmAction
            disabled={!bolehHapus}
            label="Hapus"
            tone="danger"
            ukuran="kecil"
            title="Hapus akun ini?"
            description={`Akun ${a.nama} (${surelUntukPanel(a.email, pengguna?.peran ?? [], { pemilikId: a.id, pelihatId: pengguna?.id })}) dihapus, sesi loginnya dicabut, dan tidak dapat masuk lagi. Tindakan ini tercatat di audit.`}
            confirmLabel="Ya, hapus akun"
            onConfirm={() => hapus(a.id)}
          />
        )}
      </>
    );
  };

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900">
            {kelompok === 'ADMIN' ? 'Akun Admin' : 'Akun Dosen/Staf'}
            {akun && (
              <span className="ml-1.5 text-xs font-normal text-slate-500 tabular-nums">
                {tampil.length}
              </span>
            )}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {kelompok === 'ADMIN'
              ? 'Akun Admin dan Superadmin pengelola portal.'
              : 'Akun Dosen/Staf yang terdaftar melalui email atau Google ITH.'}
            {bolehHapus && ' Akun yang dihapus langsung keluar dan tidak dapat masuk lagi.'}
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <label htmlFor="cari-akun" className="relative w-full sm:w-64">
            <span className="sr-only">Cari nama, email, atau unit</span>
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
            />
            <input
              id="cari-akun"
              type="search"
              placeholder="Cari nama, email, atau unit"
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white pr-3 pl-9 text-sm text-slate-950 shadow-[0_1px_2px_rgb(23_35_64/0.04)] transition-[border-color,box-shadow] placeholder:text-slate-400 hover:border-slate-400 focus:border-institusi-500 focus:ring-3 focus:ring-institusi-500/20 focus:outline-none"
            />
          </label>
        </div>
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
        <>
          {/* Layar kecil: kartu bertumpuk agar tidak perlu menggeser tabel. */}
          <ul className="mt-4 divide-y divide-slate-100 md:hidden">
            {tampil.map((a) => {
              const status = STATUS[a.status] ?? { teks: a.status, warna: 'slate' as const };
              const diri = a.id === pengguna?.id;
              return (
                <li key={a.id} className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <AvatarInisial nama={a.nama} peran={a.peran} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900">
                        {a.nama}
                        {diri && (
                          <span className="ml-1.5 text-xs font-normal text-slate-500">(Anda)</span>
                        )}
                      </p>
                      <p className="mt-0.5 text-sm text-slate-600 [overflow-wrap:anywhere]">
                        {surelUntukPanel(a.email, pengguna?.peran ?? [], {
                          pemilikId: a.id,
                          pelihatId: pengguna?.id,
                        })}
                      </p>
                    </div>
                    <Badge color={status.warna}>{status.teks}</Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                    {lencanaPeran(a.peran)}
                    <span>
                      ·{' '}
                      {a.peran.includes('SUPERADMIN')
                        ? 'Superadmin'
                        : (a.unitKerja ?? 'Unit belum ditetapkan')}
                    </span>
                  </div>
                  {adaAksi && <div className="mt-3 flex flex-wrap gap-2">{aksi(a)}</div>}
                </li>
              );
            })}
          </ul>
          <div className="panel-table-scroll mt-4 hidden overflow-x-auto md:block">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b text-slate-500">
                  <th className="py-3">Nama</th>
                  <th>Email</th>
                  <th>Peran</th>
                  <th>Unit</th>
                  <th>Status</th>
                  {adaAksi && <th className="sr-only">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y">
                {tampil.map((a) => {
                  const status = STATUS[a.status] ?? { teks: a.status, warna: 'slate' as const };
                  const diri = a.id === pengguna?.id;
                  return (
                    <tr key={a.id}>
                      <td className="py-3 font-medium">
                        <span className="flex items-center gap-3">
                          <AvatarInisial nama={a.nama} peran={a.peran} />
                          <span className="min-w-0">
                            {a.nama}
                            {diri && (
                              <span className="ml-1.5 text-xs font-normal text-slate-500">
                                (Anda)
                              </span>
                            )}
                          </span>
                        </span>
                      </td>
                      <td className="[overflow-wrap:anywhere]">
                        {surelUntukPanel(a.email, pengguna?.peran ?? [], {
                          pemilikId: a.id,
                          pelihatId: pengguna?.id,
                        })}
                      </td>
                      <td>{lencanaPeran(a.peran)}</td>
                      <td>
                        {a.peran.includes('SUPERADMIN') ? 'Superadmin' : (a.unitKerja ?? '—')}
                      </td>
                      <td>
                        <Badge color={status.warna}>{status.teks}</Badge>
                      </td>
                      {adaAksi && (
                        <td className="py-2 text-right">
                          <div className="flex justify-end gap-2">{aksi(a)}</div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {tampil.length === 0 && (
            <p className="py-6 text-sm text-slate-600">
              {kata
                ? 'Tidak ada akun yang cocok pada kelompok ini.'
                : `Belum ada akun ${kelompok === 'ADMIN' ? 'Admin' : 'Dosen/Staf'}.`}
            </p>
          )}
        </>
      )}
      <DialogAturUlangPassword akun={aturUlang} onTutup={() => setAturUlang(undefined)} />
    </Card>
  );
}
