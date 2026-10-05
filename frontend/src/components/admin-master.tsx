'use client';

import { useEffect, useState } from 'react';
import { ambilApi, GalatApi } from '@/lib/api-client';
import { useSession, csrfHeaders } from '@/lib/sesi';
import { Button, Card, ConfirmAction, Field, PageTitle, StateMessage } from '@/components/ui';

type Table = 'unit_kerja'|'jenis_dokumen'|'kategori'|'tag';
type Row = { id: string; kode?: string; nama: string; urutan?: number; aktif?: boolean; parentId?: string|null };
const labels: Record<Table, string> = { unit_kerja: 'Unit Kerja', jenis_dokumen: 'Jenis Dokumen', kategori: 'Kategori', tag: 'Tag' };
export function AdminMaster({ table }: { table: Table }) {
  const { csrfToken } = useSession(); const [rows,setRows] = useState<Row[]>([]); const [selected,setSelected] = useState<Row>(); const [code,setCode] = useState(''); const [name,setName] = useState(''); const [order,setOrder] = useState('0'); const [error,setError] = useState(''); const [refresh,setRefresh] = useState(0);
  useEffect(() => { void ambilApi<Row[]>(`/admin/master/${table}`).then(setRows).catch((e) => setError(e instanceof GalatApi ? e.message : 'Master tidak dapat dimuat.')); }, [table,refresh]);
  function edit(row?: Row) { setSelected(row); setCode(row?.kode ?? ''); setName(row?.nama ?? ''); setOrder(String(row?.urutan ?? 0)); }
  async function save() { const body = table === 'tag' ? { nama:name } : table === 'jenis_dokumen' ? { kode:code,nama:name,urutan:Number(order) } : { kode:code,nama:name }; await ambilApi(`/admin/master/${table}${selected ? `/${selected.id}` : ''}`, { method:selected?'PATCH':'POST', headers:csrfHeaders(csrfToken), muatan:body }); edit(); setRefresh((x)=>x+1); }
  async function status(row: Row) { await ambilApi(`/admin/master/${table}/${row.id}/status`,{method:'PATCH',headers:csrfHeaders(csrfToken),muatan:{aktif:!row.aktif}}); setRefresh((x)=>x+1); }
  return <div className="mx-auto max-w-6xl"><PageTitle title={labels[table]} description="Kelola master data JDIH ITH. Perubahan memerlukan konfirmasi dan dicatat oleh backend." />
    {error && <StateMessage title="Data master tidak tersedia" kind="error">{error}</StateMessage>}
    <Card className="mb-5"><h2 className="font-semibold">{selected ? 'Ubah item' : 'Tambah item'}</h2><form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={(e)=>{e.preventDefault();}}>{table !== 'tag' && <Field label="Kode" id="master-code" required maxLength={table==='kategori'?60:40} value={code} onChange={(e)=>setCode(e.target.value)} />}<Field label="Nama" id="master-name" required maxLength={table==='tag'?100:200} value={name} onChange={(e)=>setName(e.target.value)} />{table==='jenis_dokumen' && <Field label="Urutan" id="master-order" type="number" min={0} value={order} onChange={(e)=>setOrder(e.target.value)} />}<div className="flex items-end gap-2"><ConfirmAction label={selected?'Simpan perubahan':'Tambah'} title={selected?'Simpan perubahan master?':'Tambah master?'} description="Pastikan kode dan nama sudah benar sebelum menyimpan." disabled={!name.trim() || (table!=='tag'&&!code.trim())} onConfirm={save} />{selected && <Button type="button" tone="secondary" onClick={()=>edit()}>Batal</Button>}</div></form></Card>
    <Card><div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="py-3">Kode</th><th>Nama</th><th>Status</th><th>Aksi</th></tr></thead><tbody className="divide-y">{rows.map((row)=><tr key={row.id}><td className="py-3">{row.kode??'—'}</td><td>{row.nama}</td><td>{row.aktif===undefined?'—':row.aktif?'Aktif':'Nonaktif'}</td><td><div className="flex gap-2">{table!=='tag'&&<Button tone="secondary" onClick={()=>edit(row)}>Ubah</Button>}{table!=='tag' && <ConfirmAction label={row.aktif?'Nonaktifkan':'Aktifkan'} tone={row.aktif?'danger':'secondary'} title="Ubah status master?" description="Perubahan status memengaruhi pilihan yang tersedia pada dokumen baru." onConfirm={()=>status(row)} />}</div></td></tr>)}</tbody></table>{rows.length===0 && <p className="py-5 text-sm text-slate-600">Belum ada data.</p>}</div></Card>
  </div>;
}
