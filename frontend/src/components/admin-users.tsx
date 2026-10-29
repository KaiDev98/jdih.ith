'use client';

import { surelUntukPanel } from '@jdih/shared';

import { useEffect, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  RefreshCw,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { ambilApi, GalatApi } from '@/lib/api-client';
import { useSession, csrfHeaders } from '@/lib/sesi';
import {
  Badge,
  Button,
  Card,
  ConfirmAction,
  Feedback,
  PageTitle,
  SelectField,
  StateMessage,
  TextAreaField,
} from '@/components/ui';
import { DaftarAkun } from '@/components/admin-akun';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type Unit = { id: string; nama: string; kode: string };
type PendingUser = {
  id: string;
  nama: string;
  email: string;
  unitManual: string | null;
  unitKerjaId: string | null;
  status: 'MENUNGGU_VERIFIKASI';
};

/**
 * Pengguna: antrean pendaftaran Dosen/Staf (ringkas bila kosong) lalu daftar
 * semua akun. Persetujuan dan penolakan dilakukan di dialog Tinjau.
 */
export function AdminUsers() {
  const { csrfToken, pengguna } = useSession();
  const superadmin = pengguna?.status === 'AKTIF' && pengguna.peran.includes('SUPERADMIN');
  const [rows, setRows] = useState<PendingUser[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [selected, setSelected] = useState<PendingUser>();
  const [unitId, setUnitId] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [termuat, setTermuat] = useState(false);
  const [kelompok, setKelompok] = useState<'ADMIN' | 'DOSEN_STAF'>('ADMIN');
  useEffect(() => {
    let aktif = true;
    void Promise.all([
      ambilApi<PendingUser[]>('/admin/users', { kueri: { halaman: 1, perHalaman: 100 } }),
      ambilApi<Unit[]>('/public/units'),
    ])
      .then(([users, unitRows]) => {
        if (!aktif) return;
        setRows(users);
        setUnits(unitRows);
        setError('');
        setTermuat(true);
      })
      .catch((e) => {
        if (aktif) setError(e instanceof GalatApi ? e.message : 'Antrean tidak dapat dimuat.');
      });
    return () => {
      aktif = false;
    };
  }, [refresh]);
  useEffect(() => {
    const segarkan = () => {
      if (document.visibilityState === 'visible') setRefresh((x) => x + 1);
    };
    const timer = window.setInterval(segarkan, 30_000);
    window.addEventListener('focus', segarkan);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', segarkan);
    };
  }, []);
  async function decide(path: string, body: unknown) {
    await ambilApi(path, { method: 'POST', headers: csrfHeaders(csrfToken), muatan: body });
    setNotice(
      path.endsWith('/approve') ? 'Akun berhasil disetujui.' : 'Pendaftaran berhasil ditolak.',
    );
    setSelected(undefined);
    setReason('');
    setRefresh((x) => x + 1);
  }
  return (
    <div className="halaman-panel mx-auto w-full">
      <PageTitle
        title="Pengguna"
        description="Akun pengelola dan Dosen/Staf tersusun dalam dua kelompok agar mudah ditemukan."
        action={
          <Button tone="secondary" ukuran="kecil" onClick={() => setRefresh((x) => x + 1)}>
            <RefreshCw aria-hidden className="size-3.5" /> Segarkan pengguna
          </Button>
        }
      />
      {superadmin && (
        <div className="mb-4 flex flex-wrap items-center gap-4 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-4 sm:px-5">
          <UserCheck aria-hidden className="size-6 shrink-0 text-amber-800" />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-slate-900">Verifikasi akun Dosen/Staf</h2>
            <p className="mt-1 text-sm text-slate-600">
              {error
                ? 'Antrean belum dapat dimuat. Silakan segarkan.'
                : termuat
                  ? `${rows.length} pendaftaran menunggu pemeriksaan.`
                  : 'Memuat antrean pendaftaran…'}{' '}
              Hanya Superadmin yang dapat menyetujui atau menolak akun.
            </p>
          </div>
          <Button tone="secondary" onClick={() => setKelompok('DOSEN_STAF')}>
            Buka verifikasi <ArrowRight aria-hidden className="size-4" />
          </Button>
        </div>
      )}
      <div aria-label="Kelompok pengguna" className="mb-4 grid gap-2 sm:grid-cols-2">
        {(
          [
            {
              id: 'ADMIN',
              nama: 'Admin',
              keterangan: 'Admin dan Superadmin portal',
              ikon: ShieldCheck,
            },
            {
              id: 'DOSEN_STAF',
              nama: 'Dosen/Staf',
              keterangan: 'Akun Dosen/Staf dan pendaftaran baru',
              ikon: GraduationCap,
            },
          ] as const
        ).map(({ id, nama, keterangan, ikon: Ikon }) => (
          <button
            key={id}
            type="button"
            aria-pressed={kelompok === id}
            onClick={() => setKelompok(id)}
            className="panel-user-group flex min-h-20 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-institusi-500 aria-pressed:border-institusi-400 aria-pressed:bg-institusi-50/60"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-50 text-slate-600">
              <Ikon aria-hidden className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-slate-900">{nama}</span>
              <span className="mt-0.5 block text-xs text-slate-500">{keterangan}</span>
            </span>
            {id === 'DOSEN_STAF' && rows.length > 0 && (
              <Badge color="amber">{rows.length} menunggu</Badge>
            )}
          </button>
        ))}
      </div>
      <div className="grid gap-4">
        {notice && (
          <Feedback value={{ type: 'success', message: notice }} onDismiss={() => setNotice('')} />
        )}
        {error && (
          <StateMessage title="Antrean belum dapat dimuat" kind="error">
            {error}
          </StateMessage>
        )}
        {kelompok === 'DOSEN_STAF' &&
          (!termuat && !error ? (
            <StateMessage title="Memuat antrean verifikasi…" />
          ) : termuat && rows.length === 0 ? (
            <div className="flex items-center gap-3 rounded-xl border border-slate-200/90 bg-white px-4 py-3 text-sm text-slate-600 shadow-[0_1px_2px_rgb(23_35_64/0.04)]">
              <CheckCircle2 aria-hidden className="size-4.5 shrink-0 text-emerald-500" />
              Tidak ada pendaftaran Dosen/Staf yang menunggu verifikasi.
            </div>
          ) : (
            rows.length > 0 && (
              <Card className="p-0! sm:p-0!">
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3 sm:px-5">
                  <h2 className="text-sm font-semibold text-slate-900">Menunggu verifikasi</h2>
                  <Badge color="amber">{rows.length}</Badge>
                  <Button tone="secondary" ukuran="kecil" onClick={() => setRefresh((x) => x + 1)}>
                    <RefreshCw aria-hidden className="size-3.5" /> Segarkan
                  </Button>
                </div>
                <ul className="divide-y divide-slate-100">
                  {rows.map((row) => (
                    <li
                      key={row.id}
                      className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900">{row.nama}</p>
                        <p className="mt-0.5 text-xs text-slate-500 [overflow-wrap:anywhere]">
                          {surelUntukPanel(row.email, pengguna?.peran ?? [], {
                            pemilikId: row.id,
                            pelihatId: pengguna?.id,
                          })}
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          <Badge>Dosen/Staf</Badge>
                          <Badge color="amber">Menunggu</Badge>
                        </div>
                        <p className="mt-1.5 text-xs text-slate-600">
                          Unit:{' '}
                          {units.find((u) => u.id === row.unitKerjaId)?.nama ??
                            row.unitManual ??
                            'Belum ditetapkan'}
                        </p>
                      </div>
                      <Button
                        tone="secondary"
                        ukuran="kecil"
                        onClick={() => {
                          setSelected(row);
                          setUnitId(row.unitKerjaId ?? '');
                          setReason('');
                        }}
                      >
                        Tinjau
                      </Button>
                    </li>
                  ))}
                </ul>
              </Card>
            )
          ))}
        <DaftarAkun key={kelompok} kelompok={kelompok} refreshToken={refresh} />
      </div>

      {selected && (
        <Dialog
          open
          onOpenChange={(value) => {
            if (!value) setSelected(undefined);
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Tinjau pendaftaran</DialogTitle>
              <DialogDescription>
                Periksa informasi pendaftar dan tentukan unit kerjanya.
              </DialogDescription>
            </DialogHeader>
            <dl className="mt-3 grid gap-1 rounded-lg bg-slate-50 p-3 text-sm">
              <div className="font-semibold text-slate-900">{selected.nama}</div>
              <div className="text-slate-600 [overflow-wrap:anywhere]">
                {surelUntukPanel(selected.email, pengguna?.peran ?? [], {
                  pemilikId: selected.id,
                  pelihatId: pengguna?.id,
                })}
              </div>
              <div className="text-slate-600">
                Unit diusulkan:{' '}
                {units.find((u) => u.id === selected.unitKerjaId)?.nama ??
                  selected.unitManual ??
                  '—'}
              </div>
            </dl>
            <div className="mt-4 grid gap-4">
              <SelectField
                label="Unit kerja untuk persetujuan"
                id="approve-unit"
                value={unitId}
                disabled={!superadmin}
                onChange={(e) => setUnitId(e.target.value)}
              >
                <option value="">Pilih unit</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nama}
                  </option>
                ))}
              </SelectField>
              <TextAreaField
                label="Alasan penolakan (wajib untuk menolak)"
                id="reject-reason"
                value={reason}
                disabled={!superadmin}
                onChange={(e) => setReason(e.target.value)}
                maxLength={1000}
              />
              <div className="flex flex-wrap justify-end gap-2">
                <Button tone="secondary" onClick={() => setSelected(undefined)}>
                  Tutup
                </Button>
                <ConfirmAction
                  label="Tolak"
                  tone="danger"
                  title="Tolak pendaftaran ini?"
                  description="Alasan penolakan akan dicatat pada audit."
                  disabled={
                    !superadmin || !pengguna.izin.includes('users.reject') || !reason.trim()
                  }
                  onConfirm={() => decide(`/admin/users/${selected.id}/reject`, { alasan: reason })}
                />
                <ConfirmAction
                  label="Setujui"
                  title="Setujui akun Dosen/Staf?"
                  description="Akun akan diaktifkan untuk mengakses dokumen khusus Dosen/Staf."
                  disabled={!superadmin || !pengguna.izin.includes('users.approve') || !unitId}
                  onConfirm={() =>
                    decide(`/admin/users/${selected.id}/approve`, { unitKerjaId: unitId })
                  }
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
