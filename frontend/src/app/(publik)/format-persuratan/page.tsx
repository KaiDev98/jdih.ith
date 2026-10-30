import type { Metadata } from 'next';
import type { ItemTemplateAuthorized, ItemTemplatePublik } from '@jdih/shared';
import { ambilBerdaftarDariPeladen } from '@/lib/api-peladen';
import { GalatApi } from '@/lib/api-client';
import { HeroHalaman } from '@/components/hero-halaman';
import { KoleksiBerkas } from '@/components/koleksi-berkas';
import styles from '@/components/koleksi-berkas.module.css';
import {
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
      <div className={styles.pageWidth}>
        <KoleksiBerkas
          key={halaman}
          jenis="format"
          initial={result}
          halaman={halaman}
          galatAwal={error}
        />
      </div>
    </>
  );
}
