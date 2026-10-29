'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, ConfirmAction, Field, SelectField, StateMessage } from '@/components/ui';
import { ambilApi, GalatApi } from '@/lib/api-client';
import { useSession } from '@/lib/sesi';
import { ProfilPengguna } from '@/components/profil-pengguna';

type Unit = { id: string; nama: string };
export default function AkunPage() {
  const session = useSession();
  const router = useRouter();
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitsLoaded, setUnitsLoaded] = useState(false);
  const [mode, setMode] = useState<'unit' | 'manual'>('unit');
  const [unit, setUnit] = useState('');
  const [manual, setManual] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (session.state === 'anonymous') router.replace('/masuk');
  }, [session.state, router]);
  useEffect(() => {
    void ambilApi<Unit[]>('/public/units')
      .then(setUnits)
      .catch(() => setUnits([]))
      .finally(() => setUnitsLoaded(true));
  }, []);
  async function register() {
    setBusy(true);
    setError('');
    try {
      await ambilApi('/auth/register', {
        method: 'POST',
        headers: { 'X-CSRF-Token': session.csrfToken ?? '' },
        muatan: mode === 'unit' ? { unitKerjaId: unit } : { unitManual: manual },
      });
      setDone(true);
      await session.muatUlang();
    } catch (e) {
      setError(e instanceof GalatApi ? e.message : 'Pendaftaran belum dapat disimpan.');
      throw e;
    } finally {
      setBusy(false);
    }
  }
  if (session.state === 'loading')
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="sr-only">Akun Anda</h1>
        <StateMessage title="Memeriksa status akun…" />
      </div>
    );
  if (session.state === 'error')
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="sr-only">Status akun Anda</h1>
        <StateMessage title="Status akun belum tersedia" kind="error">
          {session.galat}
        </StateMessage>
      </div>
    );
  if (session.state === 'authenticated' && session.pengguna)
    return (
      <ProfilPengguna
        pengguna={session.pengguna}
        unit={
          units.find((item) => item.id === session.pengguna?.unitKerjaId)?.nama ??
          session.pengguna.unitManual ??
          (session.pengguna.unitKerjaId
            ? unitsLoaded
              ? 'Unit kerja belum tersedia'
              : 'Memuat unit kerja…'
            : 'Belum terdaftar')
        }
      />
    );
  if (done)
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="sr-only">Status pendaftaran Anda</h1>
        <Card>
          <StateMessage title="Pendaftaran menunggu verifikasi">
            Pendaftaran berhasil dikirim kepada Superadmin. Dokumen publik tetap dapat Anda akses
            selama menunggu.
          </StateMessage>
          <Link href="/" className="mt-5 inline-block underline">
            Kembali ke portal
          </Link>
        </Card>
      </div>
    );
  if (session.state !== 'registration')
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="sr-only">Lengkapi pendaftaran DOSEN/STAF</h1>
        <StateMessage title="Tidak ada pendaftaran yang dapat dilengkapi">
          Masuk melalui Google institusi untuk melanjutkan.
        </StateMessage>
        <Link href="/masuk" className="mt-4 inline-block underline">
          Ke halaman masuk
        </Link>
      </div>
    );
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Card>
        <h1 className="text-2xl font-bold">Lengkapi pendaftaran DOSEN/STAF</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Akun akan menunggu verifikasi sampai disetujui Superadmin. Selama menunggu, dokumen khusus
          Dosen/Staf belum dapat dibuka.
        </p>
        <div className="mt-6 grid gap-4">
          <SelectField
            label="Jenis unit"
            id="mode"
            value={mode}
            onChange={(e) => setMode(e.target.value as 'unit' | 'manual')}
          >
            <option value="unit">Pilih unit yang tersedia</option>
            <option value="manual">Unit belum tercantum</option>
          </SelectField>
          {mode === 'unit' ? (
            <SelectField
              label="Unit kerja"
              id="unit"
              required
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            >
              <option value="">Pilih unit</option>
              {units.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nama}
                </option>
              ))}
            </SelectField>
          ) : (
            <Field
              label="Nama unit kerja"
              id="unit-manual"
              required
              maxLength={200}
              value={manual}
              onChange={(e) => setManual(e.target.value)}
            />
          )}
          <p role="alert" className="text-sm text-red-800">
            {error}
          </p>
          <ConfirmAction
            label={busy ? 'Mengirim…' : 'Kirim untuk verifikasi'}
            title="Kirim pendaftaran untuk verifikasi?"
            description="Data unit kerja yang dipilih akan dikirim untuk persetujuan Superadmin. Selama menunggu verifikasi, dokumen khusus Dosen/Staf belum dapat dibuka."
            disabled={busy || (mode === 'unit' && !unit) || (mode === 'manual' && !manual.trim())}
            onConfirm={register}
          />
        </div>
      </Card>
    </div>
  );
}
