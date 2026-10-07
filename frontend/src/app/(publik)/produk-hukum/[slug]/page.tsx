import Link from 'next/link';
import type { Metadata } from 'next';
import type { DetailDokumenAuthorized, DetailDokumenPublik } from '@jdih/shared';
import { ambilDariPeladen } from '@/lib/api-peladen';
import { GalatApi } from '@/lib/api-client';
import { StateMessage } from '@/components/ui';
import { PratinjauDokumen } from '@/components/pratinjau-dokumen';

/** Tampilan publik tidak memuat `tingkatAkses`; hanya pengguna berhak yang menerimanya. */
type Detail = DetailDokumenAuthorized | DetailDokumenPublik;
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try { const doc = await ambilDariPeladen<Detail>(`/documents/${encodeURIComponent(slug)}`, { cache: 'no-store' }); return { title: doc.judul, description: doc.deskripsi ?? `${doc.tipe} · ${doc.nomor}` }; } catch { return { title: 'Produk Hukum' }; }
}

const formatTanggal = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const tanggal = (iso: string) => formatTanggal.format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));

const STATUS = {
  BERLAKU: { teks: 'Berlaku', titik: 'bg-green-600', warna: 'text-green-800' },
  DIUBAH: { teks: 'Diubah', titik: 'bg-amber-500', warna: 'text-amber-800' },
  DICABUT: { teks: 'Dicabut', titik: 'bg-red-600', warna: 'text-red-800' },
} as const;

function StatusHukum({ status }: { status: keyof typeof STATUS }) {
  const s = STATUS[status];
  return <span className={`inline-flex items-center gap-1.5 font-medium ${s.warna}`}><span aria-hidden className={`size-2 rounded-full ${s.titik}`} />{s.teks}</span>;
}

/**
 * Pemberitahuan untuk dokumen Diubah/Dicabut. Dokumen pengubah/pencabut dan
 * alasannya hanya dikirim API bila pembaca boleh membukanya; selain itu hanya
 * status dan tanggalnya yang disebut.
 */
function PemberitahuanStatus({ status, keterangan }: { status: 'DIUBAH' | 'DICABUT'; keterangan: Detail['keteranganStatus'] }) {
  const dicabut = status === 'DICABUT';
  return (
    <div role="note" className={`mb-5 rounded-md border px-4 py-3 text-sm leading-relaxed ${dicabut ? 'border-red-200 bg-red-50 text-red-950' : 'border-amber-200 bg-amber-50 text-amber-950'}`}>
      <p>
        <strong className="font-semibold">{dicabut ? 'Dokumen ini telah dicabut' : 'Sebagian isi dokumen ini telah diubah'}</strong>
        {keterangan && ` pada ${tanggal(keterangan.tanggal)}`}
        {keterangan?.sumber && <> oleh <Link className="font-medium underline underline-offset-2" href={`/produk-hukum/${keterangan.sumber.slug}`}>{keterangan.sumber.judul}</Link></>}
        .
      </p>
      {keterangan?.alasan && <p className="mt-1 whitespace-pre-line [overflow-wrap:anywhere]"><span className="font-semibold">Alasan:</span> {keterangan.alasan}</p>}
    </div>
  );
}

export default async function DetailProdukHukum({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let detail: Detail;
  try { detail = await ambilDariPeladen<Detail>(`/documents/${encodeURIComponent(slug)}`, { cache: 'no-store' }); }
  catch (error) { const notFound = error instanceof GalatApi && error.status === 404; return <div className="mx-auto max-w-4xl px-4 py-12"><StateMessage title={notFound ? 'Dokumen tidak ditemukan' : 'Dokumen belum dapat dimuat'} kind={notFound ? 'empty' : 'error'}>{notFound ? 'Dokumen yang Anda cari tidak ditemukan.' : 'Periksa koneksi, lalu coba lagi.'}</StateMessage><Link className="mt-5 inline-block font-semibold text-institusi-900 underline" href="/produk-hukum">Kembali ke Produk Hukum</Link></div>; }
  const tahun = detail.tanggalPenetapan.slice(0, 4);
  // Tingkat akses tidak ditampilkan kepada siapa pun di halaman publik.
  const rincian: [string, React.ReactNode][] = [
    ['Jenis', detail.tipe],
    ['Nomor', detail.nomor],
    ['Tahun', tahun],
    ['Ditetapkan', tanggal(detail.tanggalPenetapan)],
    ['Status', <StatusHukum key="status" status={detail.statusHukum} />],
    ['Penanggung jawab', detail.pic],
  ];
  const berkas = [
    { id: detail.berkasUtama.id, nama: detail.berkasUtama.namaAsli, label: 'Dokumen utama' },
    ...detail.lampiran.map((file, index) => ({ id: file.id, nama: file.namaAsli, label: `Lampiran ${String(index + 1)}` })),
  ];

  return (
    <article className="bg-white">
      <header className="border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <nav aria-label="Jejak halaman" className="text-sm text-slate-500">
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <li><Link href="/" className="hover:text-slate-800 hover:underline">Beranda</Link></li>
              <li aria-hidden>/</li>
              <li><Link href="/produk-hukum" className="hover:text-slate-800 hover:underline">Produk Hukum</Link></li>
              <li aria-hidden>/</li>
              <li aria-current="page" className="text-slate-700">{detail.tipe}</li>
            </ol>
          </nav>
          <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="font-semibold text-institusi-700">{detail.tipe}</span>
            <span aria-hidden className="h-4 w-px bg-slate-300" />
            <StatusHukum status={detail.statusHukum} />
          </div>
          <h1 className="mt-2 max-w-4xl text-2xl leading-snug font-bold tracking-tight text-tinta [overflow-wrap:anywhere] sm:text-3xl">{detail.judul}</h1>
          <p className="mt-2 text-slate-600">Nomor {detail.nomor} Tahun {tahun}</p>
          {detail.deskripsi && <p className="mt-4 max-w-3xl leading-relaxed whitespace-pre-line text-slate-700 [overflow-wrap:anywhere]">{detail.deskripsi}</p>}
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-10 lg:px-8 lg:py-8">
        <div className="min-w-0">
          {detail.statusHukum !== 'BERLAKU' && <PemberitahuanStatus status={detail.statusHukum} keterangan={detail.keteranganStatus} />}
          <PratinjauDokumen slug={detail.slug} berkas={berkas} />
        </div>
        <aside aria-labelledby="judul-rincian" className="min-w-0">
          <h2 id="judul-rincian" className="text-sm font-semibold text-tinta">Rincian dokumen</h2>
          <dl className="mt-3 divide-y divide-slate-200 border-y border-slate-200 text-sm">
            {rincian.map(([label, value]) => (
              <div key={label} className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-3 py-2.5 lg:grid-cols-1 lg:gap-0.5">
                <dt className="text-slate-500">{label}</dt>
                <dd className="text-slate-900 [overflow-wrap:anywhere]">{value}</dd>
              </div>
            ))}
          </dl>
          <Link href="/produk-hukum" className="mt-5 inline-block text-sm font-medium text-institusi-700 hover:underline">← Kembali ke daftar produk hukum</Link>
        </aside>
      </div>
    </article>
  );
}
