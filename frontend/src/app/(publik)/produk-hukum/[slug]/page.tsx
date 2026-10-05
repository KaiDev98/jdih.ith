import Link from 'next/link';
import type { Metadata } from 'next';
import type { DetailDokumenAuthorized } from '@jdih/shared';
import { ambilDariPeladen } from '@/lib/api-peladen';
import { GalatApi } from '@/lib/api-client';
import { Badge, Card, StateMessage } from '@/components/ui';
import { FileProduk } from '@/components/file-produk';

type Detail = DetailDokumenAuthorized;
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try { const doc = await ambilDariPeladen<Detail>(`/documents/${encodeURIComponent(slug)}`, { cache: 'no-store' }); return { title: doc.judul, description: `${doc.tipe} · ${doc.nomor}` }; } catch { return { title: 'Produk Hukum' }; }
}

export default async function DetailProdukHukum({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let detail: Detail;
  try { detail = await ambilDariPeladen<Detail>(`/documents/${encodeURIComponent(slug)}`, { cache: 'no-store' }); }
  catch (error) { const notFound = error instanceof GalatApi && error.status === 404; return <div className="mx-auto max-w-4xl px-4 py-12"><StateMessage title={notFound ? 'Dokumen tidak ditemukan' : 'Dokumen belum dapat dimuat'} kind={notFound ? 'empty' : 'error'}>{notFound ? 'Dokumen tidak tersedia atau akun Anda belum memiliki akses.' : 'Periksa koneksi, lalu coba lagi.'}</StateMessage><Link className="mt-5 inline-block font-semibold text-blue-900 underline" href="/produk-hukum">Kembali ke Produk Hukum</Link></div>; }
  const statusText: Record<string, string> = { BERLAKU: 'Berlaku', DIUBAH: 'Diubah', DICABUT: 'Dicabut' };
  const akses = detail.tingkatAkses === 'publik' ? 'PUBLIK' : detail.tingkatAkses === 'internal' ? 'INTERNAL' : 'RAHASIA';
  return <article className="mx-auto max-w-4xl px-4 py-9 sm:px-6 lg:px-8"><Link href="/produk-hukum" className="text-sm font-semibold text-blue-900 hover:underline">← Kembali ke Produk Hukum</Link><header className="mt-6 border-b border-slate-200 pb-6"><div className="flex flex-wrap gap-2"><Badge color={akses === 'PUBLIK' ? 'green' : akses === 'INTERNAL' ? 'amber' : 'red'}>{akses}</Badge><Badge color={detail.statusHukum === 'BERLAKU' ? 'green' : detail.statusHukum === 'DIUBAH' ? 'amber' : 'red'}>{statusText[detail.statusHukum]}</Badge></div><p className="mt-4 text-sm font-semibold text-slate-600">{detail.tipe}</p><h1 className="mt-2 text-3xl leading-tight font-bold text-slate-950 sm:text-4xl">{detail.judul}</h1></header>
    <dl className="grid gap-x-8 gap-y-5 border-b border-slate-200 py-6 sm:grid-cols-2">{[['Nomor', detail.nomor], ['Tanggal Penetapan', new Date(`${detail.tanggalPenetapan}T00:00:00`).toLocaleDateString('id-ID', { dateStyle: 'long' })], ['Status', statusText[detail.statusHukum]], ['PIC', detail.pic]].map(([label, value]) => <div key={label}><dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{label}</dt><dd className="mt-1 font-medium text-slate-950">{value}</dd></div>)}</dl>
    <section className="py-7"><h2 className="text-xl font-bold text-slate-950">Berkas dokumen</h2><Card className="mt-4"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-semibold text-slate-950">Dokumen Utama</h3><p className="mt-1 break-all text-sm text-slate-600">{detail.berkasUtama.namaAsli}</p></div><FileProduk slug={detail.slug} fileId={detail.berkasUtama.id} nama={detail.berkasUtama.namaAsli} /></div></Card>
      {detail.lampiran.length > 0 && <div className="mt-6"><h3 className="font-semibold text-slate-900">Lampiran ({detail.lampiran.length})</h3><ul className="mt-3 grid gap-3">{detail.lampiran.map((file, index) => <li key={file.id}><Card><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold text-slate-500">Lampiran {index + 1}</p><p className="mt-1 break-all font-medium text-slate-950">{file.namaAsli}</p></div><FileProduk slug={detail.slug} fileId={file.id} nama={file.namaAsli} /></div></Card></li>)}</ul></div>}
    </section></article>;
}
