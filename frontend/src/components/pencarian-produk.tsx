'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FileSearch, Search } from 'lucide-react';
import type { HasilCariAnonim, HasilCariAuthorized, MetaHalaman } from '@jdih/shared';
import { ambilApi, ambilApiBerdaftar, GalatApi } from '@/lib/api-client';
import { useSession } from '@/lib/sesi';
import { Badge, Button, Card, Field, SelectField, StateMessage } from '@/components/ui';

type Baris = HasilCariAnonim | HasilCariAuthorized;
interface Hasil { data: readonly Baris[]; meta: MetaHalaman }
interface Filter { q: string; jenisDokumenId: string; tahun: string; unitKerjaId: string; kategoriId: string; statusHukum: string }

export function PencarianProduk({ initialQuery = '', initialYear = '' }: { initialQuery?: string; initialYear?: string }) {
  const session = useSession();
  const [filter, setFilter] = useState<Filter>({ q: initialQuery, jenisDokumenId: '', tahun: initialYear, unitKerjaId: '', kategoriId: '', statusHukum: '' });
  const [data, setData] = useState<Hasil>(); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [page, setPage] = useState(1);
  const [units, setUnits] = useState<{ id: string; nama: string }[]>([]);
  const [types,setTypes]=useState<{id:string;nama:string}[]>([]);const [categories,setCategories]=useState<{id:string;nama:string}[]>([]);
  useEffect(() => { let current=true;void Promise.all([ambilApi<{id:string;nama:string}[]>('/public/master/unit_kerja'),ambilApi<{id:string;nama:string}[]>('/public/master/jenis_dokumen'),ambilApi<{id:string;nama:string}[]>('/public/master/kategori')]).then(([u,t,c])=>{if(current){setUnits(u);setTypes(t);setCategories(c);}}).catch(()=>{if(current){setUnits([]);setTypes([]);setCategories([]);}});return()=>{current=false;}; }, []);
  const load = useCallback(async (nextPage = page, values = filter) => {
    setLoading(true); setError('');
    try {
      const result = await ambilApiBerdaftar<Baris>('/public/search/documents', { cache: 'no-store', kueri: { ...values, halaman: nextPage, perHalaman: 20, urut: 'relevansi' } });
      setData(result); setPage(nextPage);
      const params = new URLSearchParams(); for (const [key, value] of Object.entries(values)) if (value) params.set(key, value);
      window.history.replaceState(null, '', `/produk-hukum${params.size ? `?${params}` : ''}`);
    } catch (e) { setError(e instanceof GalatApi ? e.message : 'Pencarian tidak dapat dimuat.'); }
    finally { setLoading(false); }
  }, [page, filter]);
  const loadRef = useRef(load);
  useEffect(() => { loadRef.current = load; }, [load]);
  useEffect(() => { if (session.state !== 'loading') {
    void loadRef.current(1);
  } }, [session.state, session.pengguna?.status]);
  function update(key: keyof Filter, value: string) { setFilter((current) => ({ ...current, [key]: value })); }
  return <div className="grid min-w-0 gap-7 lg:grid-cols-[270px_1fr]">
    <Card className="h-fit min-w-0"><form className="grid min-w-0 gap-4" onSubmit={(event) => { event.preventDefault(); void load(1); }}><div><h2 className="font-bold text-slate-950">Cari Produk Hukum</h2><p className="mt-1 text-sm text-slate-600">Telusuri metadata dokumen.</p></div>
      <Field label="Kata kunci" id="search-q" type="search" placeholder="Judul, nomor, tahun, tag…" value={filter.q} onChange={(e) => update('q', e.target.value)} />
      <Field label="Tahun" id="search-year" inputMode="numeric" maxLength={4} placeholder="2026" value={filter.tahun} onChange={(e) => update('tahun', e.target.value)} />
      <SelectField label="Status hukum" id="search-legal-status" value={filter.statusHukum} onChange={(e) => update('statusHukum', e.target.value)}><option value="">Semua status</option><option value="BERLAKU">Berlaku</option><option value="DIUBAH">Diubah</option><option value="DICABUT">Dicabut</option></SelectField>
      <SelectField label="Unit kerja" id="search-unit" value={filter.unitKerjaId} onChange={(e) => update('unitKerjaId', e.target.value)}><option value="">Semua unit</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.nama}</option>)}</SelectField>
      <SelectField label="Jenis Produk Hukum" id="search-type-id" value={filter.jenisDokumenId} onChange={(e) => update('jenisDokumenId', e.target.value)}><option value="">Semua jenis</option>{types.map(t=><option key={t.id} value={t.id}>{t.nama}</option>)}</SelectField>
      <SelectField label="Kategori" id="search-category-id" value={filter.kategoriId} onChange={(e) => update('kategoriId', e.target.value)}><option value="">Semua kategori</option>{categories.map(c=><option key={c.id} value={c.id}>{c.nama}</option>)}</SelectField>
      <Button type="submit"><Search aria-hidden className="mr-2 size-4" />Terapkan pencarian</Button>
    </form></Card>
    <section aria-labelledby="hasil-title" className="min-w-0"><div className="mb-4 flex flex-wrap items-end justify-between gap-2"><div><h2 id="hasil-title" className="text-xl font-bold text-slate-950">Hasil Produk Hukum</h2><p className="mt-1 text-sm text-slate-600">{data ? `${data.meta.totalButir} hasil` : 'Dokumen terbit yang dapat diakses'}</p></div></div>
      {loading && <StateMessage title="Memuat hasil pencarian…">Mohon tunggu.</StateMessage>}
      {!loading && error && <StateMessage title="Pencarian gagal" kind="error">{error}<button type="button" className="ml-2 underline" onClick={() => void load()}>Coba lagi</button></StateMessage>}
      {!loading && !error && data?.data.length === 0 && <StateMessage title="Belum ada hasil">Ubah kata kunci atau filter, lalu coba kembali.</StateMessage>}
      {!loading && !error && data && data.data.length > 0 && <div className="grid min-w-0 gap-3">{data.data.map((row, index) => 'badge' in row && row.badge === 'INTERNAL' ? <div key={`internal-${index}`} className="min-w-0 rounded-xl border border-amber-300 bg-amber-50 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><h3 className="min-w-0 text-lg font-semibold text-slate-950 [overflow-wrap:anywhere]">{row.judul}</h3><Badge color="amber">INTERNAL</Badge></div><p className="mt-3 text-sm text-slate-700">Masuk dengan akun Dosen/Staf ITH aktif untuk melihat dokumen ini.</p></div> : <Card key={'id' in row ? row.id : index} className="p-5 min-w-0"><div className="flex flex-wrap items-center gap-2"><Badge color="green">PUBLIK</Badge><span className="text-sm text-slate-600">{row.tipe}</span></div><h3 className="mt-3 min-w-0 text-lg font-bold text-slate-950 [overflow-wrap:anywhere]"><Link href={`/produk-hukum/${row.slug}`} className="break-words hover:text-blue-900 hover:underline">{row.judul}</Link></h3><p className="mt-2 text-sm text-slate-600">{row.nomor}{row.tahun ? ` · ${row.tahun}` : ''}</p><div className="mt-4 flex items-center justify-between"><Badge color={row.statusHukum === 'BERLAKU' ? 'green' : row.statusHukum === 'DIUBAH' ? 'amber' : 'red'}>{row.statusHukum === 'BERLAKU' ? 'Berlaku' : row.statusHukum === 'DIUBAH' ? 'Diubah' : 'Dicabut'}</Badge><Link href={`/produk-hukum/${row.slug}`} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-900">Lihat detail <FileSearch aria-hidden className="size-4" /></Link></div></Card>)}</div>}
      {data && data.meta.totalHalaman > 1 && <div className="mt-6 flex items-center justify-between"><Button tone="secondary" disabled={!data.meta.adaSebelumnya || loading} onClick={() => void load(page - 1)}>Sebelumnya</Button><span className="text-sm text-slate-600">Halaman {page} dari {data.meta.totalHalaman}</span><Button tone="secondary" disabled={!data.meta.adaBerikutnya || loading} onClick={() => void load(page + 1)}>Berikutnya</Button></div>}
    </section>
  </div>;
}
