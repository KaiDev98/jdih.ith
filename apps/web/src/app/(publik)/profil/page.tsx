import type { Metadata } from 'next';
import { Card, PageTitle } from '@/components/ui';

export const metadata: Metadata = { title: 'Tentang ITH', description: 'Profil Institut Teknologi Bacharuddin Jusuf Habibie.' };
export default function Profil() { return <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8"><PageTitle title="Tentang ITH" description="Institut Teknologi Bacharuddin Jusuf Habibie · Parepare, Sulawesi Selatan" /><Card><p className="leading-8 text-slate-700">Portal JDIH ITH menyediakan akses terstruktur ke produk hukum Institut Teknologi Bacharuddin Jusuf Habibie. Informasi pada halaman ini dibatasi pada profil institusi yang telah tersedia.</p><p className="mt-5 text-sm text-slate-500">Konten profil lebih lengkap dapat ditambahkan setelah materi resmi institusi disiapkan.</p></Card></div>; }
