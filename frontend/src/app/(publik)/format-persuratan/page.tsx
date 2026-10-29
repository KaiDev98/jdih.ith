import type { Metadata } from 'next';
import type { ItemTemplateAuthorized, ItemTemplatePublik } from '@jdih/shared';
import { FileText } from 'lucide-react';
import { ambilBerdaftarDariPeladen } from '@/lib/api-peladen';
import { GalatApi } from '@/lib/api-client';
import { StateMessage } from '@/components/ui';
import { HeroHalaman } from '@/components/hero-halaman';
import { UnduhTemplate } from '@/components/unduh-template';
import styles from '@/components/koleksi-berkas.module.css';
import {
  PaginationBerkas,
  ToolbarBerkas,
  parameterDaftarBerkas,
  type ParameterDaftarBerkas,
} from '@/components/daftar-berkas-publik';

export const metadata: Metadata = {
  title: 'Format Persuratan',
  description: 'Unduh format persuratan Institut Teknologi Bacharuddin Jusuf Habibie.',
};

export default async function FormatPersuratan({
  searchParams,
}: {
  searchParams: Promise<ParameterDaftarBerkas>;
}) {
  const { halaman } = parameterDaftarBerkas(await searchParams);
  let result;
  let error = '';
  try {
    const query = new URLSearchParams({
      halaman: String(halaman),
      perHalaman: '12',
    });
    result = await ambilBerdaftarDariPeladen<ItemTemplateAuthorized | ItemTemplatePublik>(
      `/letter-templates?${query}`,
      { cache: 'no-store' },
    );
  } catch (e) {
    error = e instanceof GalatApi ? e.message : 'Daftar format belum dapat dimuat.';
  }
  return (
    <>
      <HeroHalaman
        label="Unduhan"
        judul="Format Persuratan"
        deskripsi="Format surat resmi ITH yang dapat diunduh dan digunakan."
      />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <ToolbarBerkas judul="Pustaka Format Surat" total={result?.meta.totalButir ?? 0} />
        {error ? (
          <StateMessage title="Daftar format gagal dimuat" kind="error">
            {error}
          </StateMessage>
        ) : !result?.data.length ? (
          <StateMessage title="Belum ada format yang tersedia">
            Format persuratan akan tampil di sini setelah diterbitkan.
          </StateMessage>
        ) : (
          <ul aria-label="Daftar format persuratan" className={styles.formats}>
            {result.data.map((item) => (
              <li key={item.id} className={styles.format}>
                <div className={styles.formatHeader}>
                  <FileText className="size-6" strokeWidth={1.4} aria-hidden />
                  <span>Format surat</span>
                </div>
                <h3 title={item.nama} className="line-clamp-2">
                  {item.nama}
                </h3>
                <div className={styles.formatFooter}>
                  <span>
                    {'tingkatAkses' in item && item.tingkatAkses === 'INTERNAL'
                      ? 'Khusus Dosen/Staf aktif'
                      : 'Siap digunakan'}
                  </span>
                  <UnduhTemplate slug={item.slug} nama={item.nama} />
                </div>
              </li>
            ))}
          </ul>
        )}
        <PaginationBerkas
          path="/format-persuratan"
          q=""
          halaman={halaman}
          totalHalaman={result?.meta.totalHalaman ?? 0}
        />
      </div>
    </>
  );
}
