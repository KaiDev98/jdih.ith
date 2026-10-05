import type { Metadata } from 'next';
import type { ItemTemplateAuthorized, ItemTemplatePublik } from '@jdih/shared';
import { ambilBerdaftarDariPeladen } from '@/lib/api-peladen';
import { GalatApi } from '@/lib/api-client';
import { Card, PageTitle, StateMessage } from '@/components/ui';
import { UnduhTemplate } from '@/components/unduh-template';

export const metadata: Metadata = { title: 'Format Persuratan', description: 'Unduh format persuratan Institut Teknologi Bacharuddin Jusuf Habibie.' };
interface TemplateResult { data: readonly (ItemTemplateAuthorized | ItemTemplatePublik)[]; meta: { totalButir: number } }

export default async function FormatPersuratan() {
  let result: TemplateResult | undefined; let error = '';
  try { result = await ambilBerdaftarDariPeladen<ItemTemplateAuthorized | ItemTemplatePublik>('/letter-templates?halaman=1&perHalaman=100', { cache: 'no-store' }); }
  catch (e) { error = e instanceof GalatApi ? e.message : 'Daftar format belum dapat dimuat.'; }
  return <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8"><PageTitle title="Format Persuratan" description="Format dokumen resmi yang dapat diunduh. Format Internal tersedia setelah masuk dengan akun Dosen/Staf aktif." />
    {error ? <StateMessage title="Daftar format gagal dimuat" kind="error">{error}</StateMessage> : !result?.data.length ? <StateMessage title="Belum ada format yang tersedia">Format persuratan akan tampil di sini setelah diterbitkan.</StateMessage> : <div className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="grid grid-cols-[1fr_auto] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-bold tracking-wide text-slate-600 uppercase"><span>Judul</span><span>Aksi</span></div><ul>{result.data.map((item) => <li key={item.id} className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-slate-100 px-5 py-4 last:border-0"><div><p className="font-semibold text-slate-950">{item.nama}</p>{'tingkatAkses' in item && item.tingkatAkses === 'INTERNAL' && <span className="mt-1 inline-block text-xs text-slate-600">Internal · Dosen/Staf aktif</span>}</div><UnduhTemplate slug={item.slug} nama={`${item.nama}.docx`} /></li>)}</ul></div>}
    <p className="mt-4 text-xs text-slate-500">Format menggunakan berkas versi aktif. Daftar ini tidak menampilkan riwayat, detail, atau pratinjau template.</p>
  </div>;
}
