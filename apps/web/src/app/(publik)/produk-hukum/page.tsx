import type { Metadata } from 'next';
import { PageTitle } from '@/components/ui';
import { PencarianProduk } from '@/components/pencarian-produk';

export const metadata: Metadata = { title: 'Produk Hukum', description: 'Cari produk hukum Institut Teknologi Bacharuddin Jusuf Habibie.' };

export default async function HalamanProdukHukum({ searchParams }: { searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  const params=await searchParams;
  const initialQuery=typeof params.q==='string'?params.q:'';
  const initialYear=typeof params.tahun==='string'?params.tahun:'';
  return <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"><PageTitle title="Produk Hukum" description="Cari peraturan, keputusan, instruksi, surat edaran, dan SOP ITH berdasarkan metadata yang tersedia." /><PencarianProduk initialQuery={initialQuery} initialYear={initialYear} /></div>;
}
