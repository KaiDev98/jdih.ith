import type { Metadata } from 'next';
import { ambilPublik } from '@/lib/api-peladen';
import { PencarianProduk } from '@/components/pencarian-produk';

type Jenis = { id: string; kode: string; nama: string };
type Params = Promise<Record<string, string | string[] | undefined>>;

const teks = (nilai: string | string[] | undefined) => (typeof nilai === 'string' ? nilai : '');

/** Nama jenis dari kode di alamat (mis. ?jenis=PERREK); kosong bila tidak dikenal. */
async function namaJenis(kode: string) {
  if (!kode) return undefined;
  const daftar = await ambilPublik<Jenis[]>('/public/master/jenis_dokumen').catch(
    () => [] as Jenis[],
  );
  return daftar.find((j) => j.kode === kode)?.nama;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Params;
}): Promise<Metadata> {
  const nama = await namaJenis(teks((await searchParams).jenis));
  return {
    title: nama ?? 'Produk Hukum',
    description: `Cari ${nama ?? 'produk hukum'} Institut Teknologi Bacharuddin Jusuf Habibie.`,
  };
}

export default async function HalamanProdukHukum({ searchParams }: { searchParams: Params }) {
  const params = await searchParams;
  const awal = {
    initialQuery: teks(params.q),
    initialYear: teks(params.tahun),
    // `jenis` dan `kategori` berisi kode (mis. SKREK, SOP-SAINS) dari menu Produk Hukum.
    initialJenisKode: teks(params.jenis),
    initialKategoriKode: teks(params.kategori),
    initialStatus: ['BERLAKU', 'DIUBAH', 'DICABUT'].includes(teks(params.statusHukum))
      ? teks(params.statusHukum)
      : '',
  };
  // Kunci memaksa komponen dipasang ulang saat pengguna memilih butir menu lain
  // ketika sudah berada di halaman ini, sehingga penyaring awalnya ikut berganti.
  const kunci = Object.values(awal).join('|');
  return (
    <div className="latar-rak bg-rak">
      <PencarianProduk
        key={kunci}
        {...awal}
        initialJenisNama={await namaJenis(awal.initialJenisKode)}
      />
    </div>
  );
}
