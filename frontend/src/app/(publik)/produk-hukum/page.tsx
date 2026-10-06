import type { Metadata } from 'next';
import { HeroHalaman } from '@/components/hero-halaman';
import { PencarianProduk } from '@/components/pencarian-produk';

export const metadata: Metadata = { title: 'Produk Hukum', description: 'Cari produk hukum Institut Teknologi Bacharuddin Jusuf Habibie.' };

const teks = (nilai: string | string[] | undefined) => (typeof nilai === 'string' ? nilai : '');

export default async function HalamanProdukHukum({ searchParams }: { searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  const params = await searchParams;
  const awal = {
    initialQuery: teks(params.q),
    initialYear: teks(params.tahun),
    // `jenis` dan `kategori` berisi kode (mis. SKREK, SOP-SAINS) dari menu Produk Hukum.
    initialJenisKode: teks(params.jenis),
    initialKategoriKode: teks(params.kategori),
  };
  // Kunci memaksa komponen dipasang ulang saat pengguna memilih butir menu lain
  // ketika sudah berada di halaman ini, sehingga penyaring awalnya ikut berganti.
  const kunci = [awal.initialQuery, awal.initialYear, awal.initialJenisKode, awal.initialKategoriKode].join('|');
  return <><HeroHalaman label="Jaringan Dokumentasi dan Informasi Hukum" judul="Produk Hukum" deskripsi="Cari peraturan, keputusan, instruksi, surat edaran, dan SOP ITH berdasarkan metadata yang tersedia." /><div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"><PencarianProduk key={kunci} {...awal} /></div></>;
}
