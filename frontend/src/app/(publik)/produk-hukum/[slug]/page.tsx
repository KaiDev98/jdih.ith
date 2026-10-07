import Link from 'next/link';
import type { Metadata } from 'next';
import type { DetailDokumenAuthorized, DetailDokumenPublik } from '@jdih/shared';
import { AlignLeft, ArrowLeft, ArrowRight, CircleCheck, TriangleAlert } from 'lucide-react';
import { ambilDariPeladen } from '@/lib/api-peladen';
import { GalatApi } from '@/lib/api-client';
import { StateMessage } from '@/components/ui';
import { PratinjauDokumen } from '@/components/pratinjau-dokumen';
import { AksiHero } from '@/components/aksi-berkas';

/** Tampilan publik tidak memuat `tingkatAkses`; hanya pengguna berhak yang menerimanya. */
type Detail = DetailDokumenAuthorized | DetailDokumenPublik;
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try { const doc = await ambilDariPeladen<Detail>(`/documents/${encodeURIComponent(slug)}`, { cache: 'no-store' }); return { title: doc.judul, description: doc.deskripsi ?? `${doc.tipe} · ${doc.nomor}` }; } catch { return { title: 'Produk Hukum' }; }
}

const formatTanggal = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const tanggal = (iso: string) => formatTanggal.format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));

const STATUS = {
  BERLAKU: { teks: 'Berlaku', titik: 'bg-daun-500' },
  DIUBAH: { teks: 'Diubah', titik: 'bg-amber-500' },
  DICABUT: { teks: 'Dicabut', titik: 'bg-red-600' },
} as const;

const kosong = 'text-slate-400 italic';

/** Panel deskripsi; selalu tampil, dengan penanda bila belum diisi. */
function PanelDeskripsi({ deskripsi }: { deskripsi: string | null }) {
  return (
    <section aria-labelledby="judul-deskripsi" className="kartu-dokumen flex gap-3 p-5">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-gigi-50 text-gigi-600"><AlignLeft aria-hidden className="size-4" /></span>
      <div className="min-w-0 text-sm leading-relaxed">
        <h2 id="judul-deskripsi" className="font-bold text-tinta">Deskripsi</h2>
        <p className={`mt-1 whitespace-pre-line [overflow-wrap:anywhere] ${deskripsi ? 'text-slate-700' : kosong}`}>{deskripsi ?? 'Belum ada deskripsi untuk dokumen ini.'}</p>
      </div>
    </section>
  );
}

/**
 * Panel keterangan status; selalu tampil. Untuk Diubah/Dicabut, dokumen
 * pengubah/pencabut dan alasannya hanya dikirim API bila pembaca boleh
 * membukanya; selain itu hanya status dan tanggalnya yang disebut.
 */
function PanelStatus({ status, keterangan }: { status: Detail['statusHukum']; keterangan: Detail['keteranganStatus'] }) {
  const gaya = {
    BERLAKU: { kartu: 'border-emerald-200 bg-emerald-50', ikon: 'bg-emerald-100 text-emerald-700', judul: 'text-emerald-900', teks: 'Dokumen ini berlaku', Ikon: CircleCheck },
    DIUBAH: { kartu: 'border-amber-200 bg-amber-50', ikon: 'bg-amber-100 text-amber-700', judul: 'text-amber-900', teks: 'Sebagian isi dokumen ini telah diubah', Ikon: TriangleAlert },
    DICABUT: { kartu: 'border-red-200 bg-red-50', ikon: 'bg-red-100 text-red-700', judul: 'text-red-900', teks: 'Dokumen ini telah dicabut', Ikon: TriangleAlert },
  }[status];
  const berlaku = status === 'BERLAKU';
  return (
    <section aria-labelledby="judul-status" className={`flex gap-3 rounded-2xl border p-5 ${gaya.kartu}`}>
      <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${gaya.ikon}`}><gaya.Ikon aria-hidden className="size-4" /></span>
      <div className="min-w-0 text-sm leading-relaxed text-slate-700">
        <h2 id="judul-status" className={`font-bold ${gaya.judul}`}>{gaya.teks}</h2>
        {berlaku ? (
          <p className="mt-1">Belum ada perubahan atau pencabutan atas dokumen ini.</p>
        ) : (
          <p className="mt-1">
            {keterangan ? `Sejak ${tanggal(keterangan.tanggal)}` : 'Status ini ditetapkan oleh Bagian Hukum'}
            {keterangan?.sumber && <> oleh <Link className="font-semibold text-tinta underline decoration-slate-300 underline-offset-2 hover:decoration-tinta" href={`/produk-hukum/${keterangan.sumber.slug}`}>{keterangan.sumber.judul}</Link>{keterangan.sumber.nomor && ` (Nomor ${keterangan.sumber.nomor})`}</>}.
          </p>
        )}
        <p className="mt-2 whitespace-pre-line [overflow-wrap:anywhere]">
          <span className="font-semibold text-slate-800">Alasan: </span>
          {keterangan?.alasan ? <span className="text-slate-800">{keterangan.alasan}</span> : <span className={kosong}>{berlaku ? 'Tidak ada.' : 'Belum ada keterangan alasan.'}</span>}
        </p>
      </div>
    </section>
  );
}

export default async function DetailProdukHukum({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let detail: Detail;
  try { detail = await ambilDariPeladen<Detail>(`/documents/${encodeURIComponent(slug)}`, { cache: 'no-store' }); }
  catch (error) { const notFound = error instanceof GalatApi && error.status === 404; return <div className="mx-auto max-w-4xl px-4 py-12"><StateMessage title={notFound ? 'Dokumen tidak ditemukan' : 'Dokumen belum dapat dimuat'} kind={notFound ? 'empty' : 'error'}>{notFound ? 'Dokumen yang Anda cari tidak ditemukan.' : 'Periksa koneksi, lalu coba lagi.'}</StateMessage><Link className="mt-5 inline-block font-semibold text-institusi-900 underline" href="/produk-hukum">Kembali ke Produk Hukum</Link></div>; }
  const tahun = detail.tanggalPenetapan.slice(0, 4);
  const status = STATUS[detail.statusHukum];
  // Tingkat akses tidak ditampilkan kepada siapa pun di halaman publik.
  const fakta: [string, React.ReactNode][] = [
    ['Nomor', `${detail.nomor} Tahun ${tahun}`],
    ['Ditetapkan', tanggal(detail.tanggalPenetapan)],
    ['Status', <span key="status" className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-0.5 text-sm font-semibold text-tinta"><span aria-hidden className={`size-2 rounded-full ${status.titik}`} />{status.teks}</span>],
    ['Penanggung jawab', detail.pic],
  ];
  const berkas = [
    { id: detail.berkasUtama.id, nama: detail.berkasUtama.namaAsli, label: 'Dokumen utama' },
    ...detail.lampiran.map((file, index) => ({ id: file.id, nama: file.namaAsli, label: `Lampiran ${String(index + 1)}` })),
  ];

  return (
    <article className="bg-slate-50">
      <header className="hero-dokumen relative overflow-hidden text-white">
        <div aria-hidden className="absolute -top-40 -right-24 size-[28rem] rounded-full border-[48px] border-white/5" />
        <div className="relative mx-auto max-w-7xl px-4 pt-8 pb-7 sm:px-6 lg:px-8 lg:pt-10">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
            <Link href="/produk-hukum" className="inline-flex items-center gap-1.5 font-medium text-white/80 transition hover:text-white"><ArrowLeft aria-hidden className="size-4" />Produk Hukum</Link>
            <span aria-hidden className="text-white/40">/</span>
            <span className="rounded-full bg-white/15 px-3 py-0.5 font-semibold text-white">{detail.tipe}</span>
          </div>
          <h1 className="mt-4 max-w-4xl text-2xl leading-tight font-bold tracking-tight [overflow-wrap:anywhere] sm:text-3xl lg:text-4xl">{detail.judul}</h1>
          <div className="mt-6"><AksiHero slug={detail.slug} fileId={detail.berkasUtama.id} nama={detail.berkasUtama.namaAsli} /></div>
          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-white/20 pt-5 lg:grid-cols-4">
            {fakta.map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-xs font-medium text-white/70">{label}</dt>
                <dd className="mt-1 font-semibold [overflow-wrap:anywhere]">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <PratinjauDokumen
          slug={detail.slug}
          berkas={berkas}
          bawahSamping={
            <>
            <PanelDeskripsi deskripsi={detail.deskripsi} />
            <PanelStatus status={detail.statusHukum} keterangan={detail.statusHukum === 'BERLAKU' ? null : detail.keteranganStatus} />
            <p className="px-2 text-sm leading-relaxed text-slate-600">
              Ada pertanyaan tentang dokumen ini?{' '}
              <Link href="/kontak" className="inline-flex items-center gap-1 font-semibold text-institusi-700 hover:underline">Hubungi Bagian Hukum<ArrowRight aria-hidden className="size-3.5" /></Link>
            </p>
            </>
          }
        />
      </div>
    </article>
  );
}
