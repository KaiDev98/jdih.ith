import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, FileSignature, Mail, Phone } from 'lucide-react';
import styles from '@/components/koleksi-berkas.module.css';
import type { HasilCariAnonim, HasilCariAuthorized, KontakKantor } from '@jdih/shared';
import { ambilBerdaftarDariPeladen, ambilPublik } from '@/lib/api-peladen';
import { HeroHalaman } from '@/components/hero-halaman';
import { TandaStatus } from '@/components/tanda-status';
import { StateMessage } from '@/components/ui';
import { tautanTelepon } from '@/lib/kontak-institusi';
import {
  PaginationBerkas,
  ToolbarBerkas,
  parameterDaftarBerkas,
  type ParameterDaftarBerkas,
} from '@/components/daftar-berkas-publik';

export const metadata: Metadata = {
  title: 'SOP Permohonan SK',
  description:
    'Prosedur resmi pengajuan Surat Keputusan (SK) di Institut Teknologi Bacharuddin Jusuf Habibie.',
};

export default async function PermohonanSk({
  searchParams,
}: {
  searchParams: Promise<ParameterDaftarBerkas>;
}) {
  const { halaman } = parameterDaftarBerkas(await searchParams);
  const kontak = await ambilPublik<KontakKantor>('/public/contact', { cache: 'no-store' }).catch(
    () => null,
  );
  let result;
  let gagal = false;
  try {
    const query = new URLSearchParams({
      halaman: String(halaman),
      perHalaman: '12',
    });
    result = await ambilBerdaftarDariPeladen<HasilCariAnonim | HasilCariAuthorized>(
      `/public/documents/permohonan-sk?${query}`,
    );
  } catch {
    gagal = true;
  }
  return (
    <div className="bg-rak">
      <HeroHalaman
        label="Standar Operasional Prosedur"
        judul="SOP Permohonan SK"
        deskripsi="Prosedur resmi pengajuan Surat Keputusan (SK) di lingkungan Institut Teknologi Bacharuddin Jusuf Habibie."
      />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <ToolbarBerkas judul="Prosedur Permohonan SK" total={result?.meta.totalButir ?? 0} />
        {gagal ? (
          <StateMessage title="Dokumen belum dapat dimuat" kind="error">
            Silakan muat ulang halaman beberapa saat lagi.
          </StateMessage>
        ) : !result?.data.length ? (
          <StateMessage title="Belum ada SOP yang tersedia">
            SOP Permohonan SK akan tampil setelah diterbitkan.
          </StateMessage>
        ) : (
          <ul aria-label="Daftar SOP Permohonan SK" className={styles.procedures}>
            {result.data.map((dokumen) => (
              <li key={dokumen.id} className={styles.procedure}>
                <div className={styles.procedureHeader}>
                  <span className={styles.procedureIcon} aria-hidden>
                    <FileSignature size={23} strokeWidth={1.5} />
                  </span>
                  <TandaStatus status={dokumen.statusHukum} />
                </div>
                <div className={styles.procedureContent}>
                  <h3 title={dokumen.judul} className="line-clamp-3">
                    {dokumen.judul}
                  </h3>
                  <div className={styles.procedureMeta}>
                    <span>No. {dokumen.nomor}</span>
                    {dokumen.tahun && <span>Tahun {dokumen.tahun}</span>}
                  </div>
                  {'tingkatAkses' in dokumen && dokumen.tingkatAkses === 'internal' && (
                    <p className={styles.procedureAccess}>Khusus Dosen/Staf aktif</p>
                  )}
                </div>
                <Link href={`/produk-hukum/${dokumen.slug}`} className={styles.procedureLink}>
                  Buka dokumen <ArrowRight aria-hidden className="size-4" />
                </Link>
              </li>
            ))}
          </ul>
        )}
        <PaginationBerkas
          path="/permohonan-sk"
          q=""
          halaman={halaman}
          totalHalaman={result?.meta.totalHalaman ?? 0}
        />
        <aside
          aria-labelledby="judul-bantuan"
          className="mt-8 rounded-xl border border-slate-200 bg-white px-5 py-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="judul-bantuan" className="text-sm font-semibold text-tinta">
                Bantuan pengajuan SK
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Hubungi pengelola untuk pertanyaan seputar prosedur.
              </p>
            </div>
            <Link
              href="/kontak"
              className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-institusi-700"
            >
              Halaman kontak <ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>
          {!!kontak?.butir.length && (
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-100 pt-3">
              {kontak.butir.map((b) => (
                <li key={b.id}>
                  <a
                    href={b.jenis === 'TELEPON' ? tautanTelepon(b.nilai) : `mailto:${b.nilai}`}
                    className="inline-flex min-h-11 items-center gap-2 text-sm text-slate-600"
                  >
                    {b.jenis === 'TELEPON' ? (
                      <Phone aria-hidden className="size-4" />
                    ) : (
                      <Mail aria-hidden className="size-4" />
                    )}
                    <span className="[overflow-wrap:anywhere]">{b.nilai}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
