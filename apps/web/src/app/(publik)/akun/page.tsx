'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, ConfirmAction, Field, SelectField, StateMessage } from '@/components/ui';
import { ambilApi, GalatApi } from '@/lib/api-client';
import { useSession } from '@/lib/sesi';

type Unit = { id: string; nama: string };
export default function AkunPage() {
  const session = useSession(); const router = useRouter();
  const [units, setUnits] = useState<Unit[]>([]); const [mode, setMode] = useState<'unit'|'manual'>('unit');
  const [unit, setUnit] = useState(''); const [manual, setManual] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [done, setDone] = useState(false);
  useEffect(() => { if (session.state === 'anonymous') router.replace('/masuk'); }, [session.state, router]);
  useEffect(() => { void ambilApi<Unit[]>('/public/units').then(setUnits).catch(() => setUnits([])); }, []);
  async function register() {
    setBusy(true); setError('');
    try { await ambilApi('/auth/register', { method: 'POST', headers: { 'X-CSRF-Token': session.csrfToken ?? '' }, muatan: mode === 'unit' ? { unitKerjaId: unit } : { unitManual: manual } }); setDone(true); await session.muatUlang(); }
    catch (e) { setError(e instanceof GalatApi ? e.message : 'Pendaftaran belum dapat disimpan.'); throw e; }
    finally { setBusy(false); }
  }
  if (session.state === 'loading') return <main className="mx-auto max-w-3xl px-4 py-12"><StateMessage title="Memeriksa status akun…" /></main>;
  if (session.state === 'error') return <main className="mx-auto max-w-3xl px-4 py-12"><StateMessage title="Status akun belum tersedia" kind="error">{session.galat}</StateMessage></main>;
  if (done || (session.state === 'authenticated' && session.pengguna?.status === 'MENUNGGU_VERIFIKASI')) return <main className="mx-auto max-w-3xl px-4 py-12"><Card><StateMessage title="Pendaftaran menunggu verifikasi">DOSEN/STAF dengan status MENUNGGU_VERIFIKASI belum memiliki akses Internal. Administrator perlu menyetujui akun terlebih dahulu.</StateMessage><Link href="/" className="mt-5 inline-block underline">Kembali ke portal</Link></Card></main>;
  if (session.state === 'authenticated' && session.pengguna) return <main className="mx-auto max-w-3xl px-4 py-12"><Card><h1 className="text-2xl font-bold">Akun Anda</h1><dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-slate-500">Nama</dt><dd className="font-semibold">{session.pengguna.nama}</dd></div><div><dt className="text-slate-500">Email</dt><dd>{session.pengguna.surel}</dd></div><div><dt className="text-slate-500">Status</dt><dd>{session.pengguna.status}</dd></div><div><dt className="text-slate-500">Unit</dt><dd>{session.pengguna.unitManual ?? session.pengguna.unitKerjaId ?? 'Belum terdaftar'}</dd></div></dl>{session.pengguna.status === 'AKTIF' && <Link href="/admin" className="mt-6 inline-block font-semibold underline">Buka panel sesuai izin</Link>}</Card></main>;
  if (session.state !== 'registration') return <main className="mx-auto max-w-3xl px-4 py-12"><StateMessage title="Tidak ada pendaftaran yang dapat dilengkapi">Masuk melalui Google institusi untuk melanjutkan.</StateMessage><Link href="/masuk" className="mt-4 inline-block underline">Ke halaman masuk</Link></main>;
  return <main className="mx-auto max-w-2xl px-4 py-12"><Card><h1 className="text-2xl font-bold">Lengkapi pendaftaran DOSEN/STAF</h1><p className="mt-2 text-sm leading-6 text-slate-600">Akun akan berstatus MENUNGGU_VERIFIKASI sampai disetujui Admin. Status ini belum memberi akses Internal.</p><div className="mt-6 grid gap-4"><SelectField label="Jenis unit" id="mode" value={mode} onChange={(e) => setMode(e.target.value as 'unit'|'manual')}><option value="unit">Pilih unit yang tersedia</option><option value="manual">Unit belum tercantum</option></SelectField>{mode === 'unit' ? <SelectField label="Unit kerja" id="unit" required value={unit} onChange={(e) => setUnit(e.target.value)}><option value="">Pilih unit</option>{units.map((item) => <option key={item.id} value={item.id}>{item.nama}</option>)}</SelectField> : <Field label="Nama unit kerja" id="unit-manual" required maxLength={200} value={manual} onChange={(e) => setManual(e.target.value)} />}<p role="alert" className="text-sm text-red-800">{error}</p><ConfirmAction label={busy?'Mengirim…':'Kirim untuk verifikasi'} title="Kirim pendaftaran untuk verifikasi?" description="Data unit kerja yang dipilih akan dikirim untuk persetujuan administrator. Status pending belum memberikan akses Internal." disabled={busy || (mode === 'unit' && !unit) || (mode === 'manual' && !manual.trim())} onConfirm={register}/></div></Card></main>;
}
