'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Eye, FileSearch, Search } from 'lucide-react';
import type { HasilCariAnonim, HasilCariAuthorized, MetaHalaman } from '@jdih/shared';
import { ambilApi, ambilApiBerdaftar, GalatApi } from '@/lib/api-client';
import { useSession } from '@/lib/sesi';
import { Badge, Button, Card, Field, SelectField, StateMessage } from '@/components/ui';

type Baris = HasilCariAnonim | HasilCariAuthorized;
interface Hasil { data: readonly Baris[]; meta: MetaHalaman }
interface Filter { q: string; jenisDokumenId: string; tahun: string; kategoriId: string; statusHukum: string }
interface Master { id: string; kode?: string; nama: string }

/**
 * Label tingkat akses hanya ada pada hasil untuk pengguna yang berhak melihat
 * dokumen Internal. Hasil untuk pengunjung anonim tidak membawa ruas itu sama
 * sekali, sehingga tidak ada label apa pun yang ditampilkan kepada mereka.
 */
const LABEL_AKSES = {
  publik: { teks: 'Publik', warna: 'green' },
  internal: { teks: 'Internal', warna: 'amber' },
} as const;

const STATUS_HUKUM = {
  BERLAKU: { teks: 'Berlaku', warna: 'green' },
  DIUBAH: { teks: 'Diubah', warna: 'amber' },
  DICABUT: { teks: 'Dicabut', warna: 'red' },
} as const;

export function PencarianProduk({
  initialQuery = '',
  initialYear = '',
  initialJenisKode = '',
  initialKategoriKode = '',
}: {
  initialQuery?: string;
  initialYear?: string;
  initialJenisKode?: string;
  initialKategoriKode?: string;
}) {
  const session = useSession();
  const [filter, setFilter] = useState<Filter>({ q: initialQuery, jenisDokumenId: '', tahun: initialYear, kategoriId: '', statusHukum: '' });
  const [data, setData] = useState<Hasil>(); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [page, setPage] = useState(1);
  const [types, setTypes] = useState<Master[]>([]); const [categories, setCategories] = useState<Master[]>([]);
  // Pencarian pertama ditahan sampai data master tiba, karena kode dari menu
  // (mis. SOP-SAINS) baru dapat diterjemahkan menjadi id setelah master dimuat.
  const [masterSiap, setMasterSiap] = useState(false);

  useEffect(() => {
    let current = true;
    void Promise.all([
      ambilApi<Master[]>('/public/master/jenis_dokumen'),
      ambilApi<Master[]>('/public/master/kategori'),
    ])
      .then(([t, c]) => {
        if (!current) return;
        setTypes(t); setCategories(c);
        const jenisDokumenId = t.find((item) => item.kode === initialJenisKode)?.id ?? '';
        const kategoriId = c.find((item) => item.kode === initialKategoriKode)?.id ?? '';
        setFilter((lama) => ({ ...lama, jenisDokumenId, kategoriId }));
      })
      .catch(() => { if (current) { setTypes([]); setCategories([]); } })
      .finally(() => { if (current) setMasterSiap(true); });
    return () => { current = false; };
  }, [initialJenisKode, initialKategoriKode]);

  const load = useCallback(async (nextPage = page, values = filter) => {
    setLoading(true); setError('');
    try {
      const result = await ambilApiBerdaftar<Baris>('/public/search/documents', { cache: 'no-store', kueri: { ...values, halaman: nextPage, perHalaman: 20, urut: 'relevansi' } });
      setData(result); setPage(nextPage);
      // Alamat memakai kode, bukan id, agar dapat dibagikan dan tetap berlaku di basis data lain.
      const params = new URLSearchParams();
      if (values.q) params.set('q', values.q);
      if (values.tahun) params.set('tahun', values.tahun);
      const jenisKode = types.find((item) => item.id === values.jenisDokumenId)?.kode;
      const kategoriKode = categories.find((item) => item.id === values.kategoriId)?.kode;
      if (jenisKode) params.set('jenis', jenisKode);
      if (kategoriKode) params.set('kategori', kategoriKode);
      if (values.statusHukum) params.set('statusHukum', values.statusHukum);
      window.history.replaceState(null, '', `/produk-hukum${params.size ? `?${params}` : ''}`);
    } catch (e) { setError(e instanceof GalatApi ? e.message : 'Pencarian tidak dapat dimuat.'); }
    finally { setLoading(false); }
  }, [page, filter, types, categories]);
  const loadRef = useRef(load);
  useEffect(() => { loadRef.current = load; }, [load]);
  useEffect(() => {
    if (session.state !== 'loading' && masterSiap) void loadRef.current(1);
  }, [session.state, session.pengguna?.status, masterSiap]);

  function update(key: keyof Filter, value: string) { setFilter((current) => ({ ...current, [key]: value })); }

  const namaJenis = types.find((item) => item.id === filter.jenisDokumenId)?.nama;
  const namaKategori = categories.find((item) => item.id === filter.kategoriId)?.nama;
  const judulHasil = [namaJenis, namaKategori].filter(Boolean).join(' · ') || 'Hasil Produk Hukum';

  return <div className="grid min-w-0 gap-7 lg:grid-cols-[270px_1fr]">
    <Card className="h-fit min-w-0"><form className="grid min-w-0 gap-4" onSubmit={(event) => { event.preventDefault(); void load(1); }}><div><h2 className="font-bold text-slate-950">Cari Produk Hukum</h2><p className="mt-1 text-sm text-slate-600">Telusuri metadata dokumen.</p></div>
      <Field label="Kata kunci" id="search-q" type="search" placeholder="Judul, nomor, tahun, tag…" value={filter.q} onChange={(e) => update('q', e.target.value)} />
      <Field label="Tahun" id="search-year" inputMode="numeric" maxLength={4} placeholder="2026" value={filter.tahun} onChange={(e) => update('tahun', e.target.value)} />
      <SelectField label="Status hukum" id="search-legal-status" value={filter.statusHukum} onChange={(e) => update('statusHukum', e.target.value)}><option value="">Semua status</option><option value="BERLAKU">Berlaku</option><option value="DIUBAH">Diubah</option><option value="DICABUT">Dicabut</option></SelectField>
      <SelectField label="Jenis Produk Hukum" id="search-type-id" value={filter.jenisDokumenId} onChange={(e) => update('jenisDokumenId', e.target.value)}><option value="">Semua jenis</option>{types.map(t=><option key={t.id} value={t.id}>{t.nama}</option>)}</SelectField>
      <SelectField label="Kategori" id="search-category-id" value={filter.kategoriId} onChange={(e) => update('kategoriId', e.target.value)}><option value="">Semua kategori</option>{categories.map(c=><option key={c.id} value={c.id}>{c.nama}</option>)}</SelectField>
      <Button type="submit"><Search aria-hidden className="mr-2 size-4" />Terapkan pencarian</Button>
    </form></Card>
    <section aria-labelledby="hasil-title" className="min-w-0"><div className="mb-4 flex flex-wrap items-end justify-between gap-2"><div><h2 id="hasil-title" className="text-xl font-bold text-slate-950">{judulHasil}</h2><p className="mt-1 text-sm text-slate-600">{data ? `${data.meta.totalButir} hasil` : 'Dokumen terbit'}</p></div></div>
      {loading && <StateMessage title="Memuat hasil pencarian…">Mohon tunggu.</StateMessage>}
      {!loading && error && <StateMessage title="Pencarian gagal" kind="error">{error}<button type="button" className="ml-2 underline" onClick={() => void load()}>Coba lagi</button></StateMessage>}
      {!loading && !error && data?.data.length === 0 && <StateMessage title="Belum ada hasil">Ubah kata kunci atau filter, lalu coba kembali.</StateMessage>}
      {!loading && !error && data && data.data.length > 0 && <div className="grid min-w-0 gap-3">{data.data.map((row) => {
        const akses = 'tingkatAkses' in row ? LABEL_AKSES[row.tingkatAkses] : undefined;
        const status = STATUS_HUKUM[row.statusHukum];
        return <Card key={row.id} className="p-5 min-w-0"><div className="flex flex-wrap items-center gap-2">{akses && <Badge color={akses.warna}>{akses.teks}</Badge>}<span className="text-sm text-slate-600">{row.tipe}</span></div><h3 className="mt-3 min-w-0 text-lg font-bold text-slate-950 [overflow-wrap:anywhere]"><Link href={`/produk-hukum/${row.slug}`} className="break-words hover:text-institusi-900 hover:underline">{row.judul}</Link></h3><p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600 tabular-nums"><span>{row.nomor}{row.tahun ? ` · ${row.tahun}` : ''}</span><span className="inline-flex items-center gap-1 text-slate-500" title={`${row.dilihat.toLocaleString('id-ID')} orang telah melihat`}><Eye aria-hidden className="size-3.5" />{row.dilihat.toLocaleString('id-ID')}<span className="sr-only"> orang telah melihat</span></span></p><div className="mt-4 flex items-center justify-between"><Badge color={status.warna}>{status.teks}</Badge><Link href={`/produk-hukum/${row.slug}`} className="inline-flex items-center gap-2 text-sm font-semibold text-institusi-900">Lihat detail <FileSearch aria-hidden className="size-4" /></Link></div></Card>;
      })}</div>}
      {data && data.meta.totalHalaman > 1 && <div className="mt-6 flex items-center justify-between"><Button tone="secondary" disabled={!data.meta.adaSebelumnya || loading} onClick={() => void load(page - 1)}>Sebelumnya</Button><span className="text-sm text-slate-600">Halaman {page} dari {data.meta.totalHalaman}</span><Button tone="secondary" disabled={!data.meta.adaBerikutnya || loading} onClick={() => void load(page + 1)}>Berikutnya</Button></div>}
    </section>
  </div>;
}
