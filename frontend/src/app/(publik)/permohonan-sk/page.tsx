import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Eye, FileSignature, Mail, Phone } from 'lucide-react';
import type { HasilCariAnonim, KontakKantor } from '@jdih/shared';
import { ambilApiBerdaftar } from '@/lib/api-client';
import { ambilPublik } from '@/lib/api-peladen';
import { HeroHalaman } from '@/components/hero-halaman';
import { TandaStatus } from '@/components/tanda-status';
import { macamJenis } from '@/lib/tampilan-jenis';
import { tautanTelepon } from '@/lib/kontak-institusi';

export const metadata: Metadata = {
  title: 'SOP Permohonan SK',
  description:
    'Prosedur resmi pengajuan Surat Keputusan (SK) di Institut Teknologi Bacharuddin Jusuf Habibie.',
};

type Jenis = { id: string; kode: string; nama: string };

/** Judul SOP yang dianggap SOP Permohonan SK, termasuk penulisan "Surat Keputusan". */
const POLA_JUDUL = /permohonan\s+(sk|surat\s+keputusan)\b/i;
const ANGKA = new Intl.NumberFormat('id-ID');

/**
 * Halaman SOP Permohonan SK. Isinya tidak ditulis tangan: dokumen SOP resmi
 * dicari di antara SOP publik yang terbit (judul memuat "Permohonan SK" atau
 * "Permohonan Surat Keputusan"), sehingga halaman ini selalu menampilkan versi
 * yang berlaku. Selama SOP itu belum terbit, halaman mengatakannya dan
 * menunjukkan kontak untuk bertanya.
 */
export default async function PermohonanSk() {
  const [jenis, kontak] = await Promise.all([
    ambilPublik<Jenis[]>('/public/master/jenis_dokumen').catch(() => [] as Jenis[]),
    ambilPublik<KontakKantor>('/public/contact', { cache: 'no-store' }).catch(() => null),
  ]);
  const sop = jenis.find((j) => macamJenis(j.kode, j.nama) === 'sop');
  const semuaSop = sop ? `/produk-hukum?jenis=${encodeURIComponent(sop.kode)}` : '/produk-hukum';

  let dokumen: HasilCariAnonim[] = [];
  let gagal = false;
  if (sop) {
    try {
      const hasil = await ambilApiBerdaftar<HasilCariAnonim>('/public/documents', {
        kueri: { jenisDokumenId: sop.id, q: 'Permohonan', halaman: 1, perHalaman: 20 },
        next: { revalidate: 60 },
      });
      dokumen = hasil.data.filter((d) => POLA_JUDUL.test(d.judul));
    } catch {
      gagal = true;
    }
  }
  const [utama, ...terkait] = dokumen;

  return (
    <div className="latar-rak bg-rak">
      <HeroHalaman
        label="Standar Operasional Prosedur"
        judul="SOP Permohonan SK"
        deskripsi="Prosedur resmi pengajuan Surat Keputusan (SK) di lingkungan Institut Teknologi Bacharuddin Jusuf Habibie."
      >
        <Link
          href={semuaSop}
          className="group inline-flex items-center gap-2 text-sm font-semibold text-white/85 hover:text-white"
        >
          <ArrowLeft aria-hidden className="gerak size-4 group-hover:-translate-x-0.5" />
          Semua SOP
        </Link>
      </HeroHalaman>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:px-8 lg:py-14">
        <section aria-labelledby="judul-dokumen-sop" className="min-w-0">
          {utama ? (
            <KartuDokumen dokumen={utama} />
          ) : (
            <BelumTerbit gagal={gagal} semuaSop={semuaSop} />
          )}
          {terkait.length > 0 && (
            <div className="mt-8">
              <h2 className="text-sm font-semibold text-slate-600">Dokumen terkait</h2>
              <ul className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-xl border border-tinta/10 bg-white">
                {terkait.map((d) => (
                  <li key={d.id}>
                    <Link
                      href={`/produk-hukum/${d.slug}`}
                      className="group flex items-center gap-4 px-5 py-4 transition-colors duration-150 hover:bg-slate-50"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold [overflow-wrap:anywhere] group-hover:text-institusi-700">
                          {d.judul}
                        </span>
                        <span className="mt-0.5 block text-sm text-slate-500 tabular-nums">
                          No. {d.nomor}
                          {d.tahun ? ` · ${d.tahun}` : ''}
                        </span>
                      </span>
                      <TandaStatus status={d.statusHukum} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <aside aria-labelledby="judul-bantuan" className="panel h-fit p-5 sm:p-6">
          <h2 id="judul-bantuan" className="font-bold">
            Butuh bantuan?
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
            Hubungi kami untuk pertanyaan seputar pengajuan SK.
          </p>
          {kontak && kontak.butir.length > 0 && (
            <ul className="mt-4 grid gap-2">
              {kontak.butir.map((b) => {
                const Ikon = b.jenis === 'TELEPON' ? Phone : Mail;
                return (
                  <li key={b.id}>
                    <a
                      href={b.jenis === 'TELEPON' ? tautanTelepon(b.nilai) : `mailto:${b.nilai}`}
                      className="group flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 transition-colors duration-150 hover:border-institusi-300 hover:bg-institusi-50"
                    >
                      <Ikon
                        aria-hidden
                        className="size-4 shrink-0 text-slate-500 group-hover:text-institusi-700"
                      />
                      <span className="min-w-0">
                        <span className="block text-xs text-slate-500">
                          {b.label ?? (b.jenis === 'TELEPON' ? 'Telepon' : 'Email')}
                        </span>
                        <span className="block text-sm font-medium text-tinta [overflow-wrap:anywhere] tabular-nums">
                          {b.nilai}
                        </span>
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
          <Link
            href="/kontak"
            className="group mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-institusi-700 hover:text-institusi-800"
          >
            Halaman kontak
            <ArrowRight aria-hidden className="gerak size-3.5 group-hover:translate-x-1" />
          </Link>
        </aside>
      </div>
    </div>
  );
}

/** Dokumen SOP Permohonan SK yang berlaku, dengan tombol untuk membukanya. */
function KartuDokumen({ dokumen }: { dokumen: HasilCariAnonim }) {
  return (
    <article className="panel p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-3">
          <span
            aria-hidden
            className="grid size-11 place-items-center rounded-xl bg-institusi-50 text-institusi-700"
          >
            <FileSignature className="size-5" />
          </span>
          <span className="huruf-label text-[0.6875rem] text-institusi-700">Dokumen resmi</span>
        </span>
        <TandaStatus status={dokumen.statusHukum} />
      </div>
      <h2
        id="judul-dokumen-sop"
        className="mt-5 text-2xl leading-snug font-extrabold tracking-[-0.015em] [overflow-wrap:anywhere]"
      >
        {dokumen.judul}
      </h2>
      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600 tabular-nums">
        <span>
          No. {dokumen.nomor}
          {dokumen.tahun ? ` · ${dokumen.tahun}` : ''}
        </span>
        <span
          className="inline-flex items-center gap-1 text-slate-500"
          title={`${ANGKA.format(dokumen.dilihat)} orang telah melihat`}
        >
          <Eye aria-hidden className="size-3.5" />
          {ANGKA.format(dokumen.dilihat)}
          <span className="sr-only"> orang telah melihat</span>
        </span>
      </p>
      <div className="mt-7 border-t border-slate-100 pt-6">
        <Link
          href={`/produk-hukum/${dokumen.slug}`}
          className="tekan group inline-flex min-h-11 items-center gap-2 rounded-md bg-tinta px-5 font-semibold text-white hover:bg-institusi-800"
        >
          Buka dokumen SOP
          <ArrowRight aria-hidden className="gerak size-4 group-hover:translate-x-1" />
        </Link>
      </div>
    </article>
  );
}

/** Keadaan ketika SOP Permohonan SK belum terbit (atau daftar gagal dimuat). */
function BelumTerbit({ gagal, semuaSop }: { gagal: boolean; semuaSop: string }) {
  return (
    <div className="panel p-6 sm:p-8">
      <span
        aria-hidden
        className="grid size-11 place-items-center rounded-xl bg-slate-100 text-slate-500"
      >
        <FileSignature className="size-5" />
      </span>
      <h2 id="judul-dokumen-sop" className="mt-5 text-xl leading-snug font-extrabold">
        {gagal ? 'Dokumen belum dapat dimuat' : 'SOP Permohonan SK belum diterbitkan'}
      </h2>
      <p className="mt-2 max-w-xl leading-relaxed text-slate-600">
        {gagal
          ? 'Terjadi gangguan saat memuat dokumen. Silakan muat ulang halaman ini beberapa saat lagi.'
          : 'Dokumen resmi akan tampil di halaman ini setelah diterbitkan oleh Bagian Hukum. Sementara itu, SOP lain dapat dilihat di daftar SOP.'}
      </p>
      <div className="mt-6 border-t border-slate-100 pt-6">
        <Link
          href={semuaSop}
          className="tekan group inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 bg-white px-5 font-semibold text-tinta hover:border-institusi-300 hover:bg-institusi-50"
        >
          Lihat semua SOP
          <ArrowRight aria-hidden className="gerak size-4 group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}
