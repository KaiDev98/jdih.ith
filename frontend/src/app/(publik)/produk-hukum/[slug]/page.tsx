import Link from 'next/link';
import type { Metadata } from 'next';
import type { DetailDokumenAuthorized, DetailDokumenPublik } from '@jdih/shared';
import { ambilDariPeladen } from '@/lib/api-peladen';
import { GalatApi } from '@/lib/api-client';
import { Badge, Card, StateMessage } from '@/components/ui';
import { FileProduk } from '@/components/file-produk';
import { HeroHalaman } from '@/components/hero-halaman';

/** Tampilan publik tidak memuat `tingkatAkses`; hanya pengguna berhak yang menerimanya. */
type Detail = DetailDokumenAuthorized | DetailDokumenPublik;
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try { const doc = await ambilDariPeladen<Detail>(`/documents/${encodeURIComponent(slug)}`, { cache: 'no-store' }); return { title: doc.judul, description: `${doc.tipe} · ${doc.nomor}` }; } catch { return { title: 'Produk Hukum' }; }
}

export default async function DetailProdukHukum({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let detail: Detail;
  try { detail = await ambilDariPeladen<Detail>(`/documents/${encodeURIComponent(slug)}`, { cache: 'no-store' }); }
  catch (error) { const notFound = error instanceof GalatApi && error.status === 404; return <div className="mx-auto max-w-4xl px-4 py-12"><StateMessage title={notFound ? 'Dokumen tidak ditemukan' : 'Dokumen belum dapat dimuat'} kind={notFound ? 'empty' : 'error'}>{notFound ? 'Dokumen yang Anda cari tidak ditemukan.' : 'Periksa koneksi, lalu coba lagi.'}</StateMessage><Link className="mt-5 inline-block font-semibold text-institusi-900 underline" href="/produk-hukum">Kembali ke Produk Hukum</Link></div>; }
  const statusText: Record<string, string> = { BERLAKU: 'Berlaku', DIUBAH: 'Diubah', DICABUT: 'Dicabut' };
  const warnaStatus = detail.statusHukum === 'BERLAKU' ? 'green' : detail.statusHukum === 'DIUBAH' ? 'amber' : 'red';
  // Informasi yang ditampilkan sengaja dibatasi pada enam butir ini. Tingkat akses
  // tidak ditampilkan kepada siapa pun di halaman publik.
  const informasi: [string, React.ReactNode][] = [
    ['Tipe', detail.tipe],
    ['Judul', detail.judul],
    ['Nomor', detail.nomor],
    ['Tahun Penetapan', detail.tanggalPenetapan.slice(0, 4)],
    ['Status', <Badge key="status" color={warnaStatus}>{statusText[detail.statusHukum]}</Badge>],
    ['PIC', detail.pic],
  ];
  return <article><HeroHalaman label={detail.tipe} judul={detail.judul}><Link href="/produk-hukum" className="text-sm font-semibold text-white underline decoration-white/50 underline-offset-4 hover:decoration-white">← Kembali ke Produk Hukum</Link></HeroHalaman><div className="mx-auto max-w-4xl px-4 py-3 sm:px-6 lg:px-8">
    <dl className="grid gap-x-8 gap-y-5 border-b border-slate-200 py-6 sm:grid-cols-2">{informasi.map(([label, value]) => <div key={label} className={label === 'Judul' ? 'min-w-0 sm:col-span-2' : 'min-w-0'}><dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{label}</dt><dd className="mt-1 font-medium text-slate-950 [overflow-wrap:anywhere]">{value}</dd></div>)}</dl>
    <section className="py-7"><h2 className="text-xl font-bold text-slate-950">Berkas dokumen</h2><Card className="mt-4"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-semibold text-slate-950">Dokumen Utama</h3><p className="mt-1 break-all text-sm text-slate-600">{detail.berkasUtama.namaAsli}</p></div><FileProduk slug={detail.slug} fileId={detail.berkasUtama.id} nama={detail.berkasUtama.namaAsli} /></div></Card>
      {detail.lampiran.length > 0 && <div className="mt-6"><h3 className="font-semibold text-slate-900">Lampiran ({detail.lampiran.length})</h3><ul className="mt-3 grid gap-3">{detail.lampiran.map((file, index) => <li key={file.id}><Card><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold text-slate-500">Lampiran {index + 1}</p><p className="mt-1 break-all font-medium text-slate-950">{file.namaAsli}</p></div><FileProduk slug={detail.slug} fileId={file.id} nama={file.namaAsli} /></div></Card></li>)}</ul></div>}
    </section></div></article>;
}
