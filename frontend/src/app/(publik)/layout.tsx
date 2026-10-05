import Link from 'next/link';
import type { KontakKantor, TahunTersedia } from '@jdih/shared';
import { PublicHeader } from '@/components/navigasi-publik';
import { ambilPublik } from '@/lib/api-peladen';
import { KONTAK_INSTITUSI, tautanTelepon } from '@/lib/kontak-institusi';

const institusi = process.env.NEXT_PUBLIC_NAMA_INSTITUSI ?? 'Institut Teknologi Bacharuddin Jusuf Habibie';

/** Tahun untuk menu "Berdasarkan Tahun". Kegagalan tidak boleh merobohkan seluruh halaman. */
async function ambilTahun(): Promise<TahunTersedia> {
  try { return await ambilPublik<TahunTersedia>('/public/documents/years'); } catch { return []; }
}

/** Nomor telepon kantor diatur Admin; bila gagal dimuat, barisnya cukup tidak tampil. */
async function ambilKontak(): Promise<KontakKantor | null> {
  try { return await ambilPublik<KontakKantor>('/public/contact', { cache: 'no-store' }); } catch { return null; }
}

export default async function TataLetakPublik({ children }: { children: React.ReactNode }) {
  const [tahun, kontak] = await Promise.all([ambilTahun(), ambilKontak()]);
  const { kantor, surel } = KONTAK_INSTITUSI;
  return <div className="flex min-h-screen flex-col bg-white"><PublicHeader tahun={tahun} /><main id="isi-utama" className="flex-1">{children}</main><footer className="mt-16 border-t border-slate-200 bg-slate-50"><div className="mx-auto grid max-w-7xl gap-8 px-4 py-9 sm:px-6 md:grid-cols-3 lg:px-8"><div><p className="text-sm font-semibold text-slate-900">Kantor Kami</p><ul className="mt-3 grid gap-2 text-sm text-slate-600"><li><a className="hover:text-blue-900" href={kantor.urlPeta} target="_blank" rel="noreferrer noopener"><span className="block font-medium text-slate-900">{kantor.ruang}</span>{kantor.lokasi}</a></li>{kontak && <li><a className="hover:text-blue-900" href={tautanTelepon(kontak.telepon)}>{kontak.telepon}</a></li>}<li><a className="hover:text-blue-900 [overflow-wrap:anywhere]" href={`mailto:${surel}`}>{surel}</a></li></ul></div><div><p className="text-sm font-semibold text-slate-900">Jelajahi</p><ul className="mt-3 grid gap-2 text-sm"><li><Link className="text-slate-600 hover:text-blue-900" href="/produk-hukum">Produk Hukum</Link></li><li><Link className="text-slate-600 hover:text-blue-900" href="/format-persuratan">Format Persuratan</Link></li><li><Link className="text-slate-600 hover:text-blue-900" href="/profil">Profil</Link></li><li><Link className="text-slate-600 hover:text-blue-900" href="/kontak">Kontak</Link></li></ul></div><div><p className="text-sm font-semibold text-slate-900">Jam Operasional</p><dl className="mt-3 grid gap-2 text-sm">{KONTAK_INSTITUSI.jamOperasional.map((baris) => <div key={baris.hari} className="flex justify-between gap-4"><dt className="text-slate-600">{baris.hari}</dt><dd className={baris.jam === 'Libur' ? 'font-medium text-slate-500' : 'font-medium text-slate-900'}>{baris.jam}</dd></div>)}</dl></div></div><div className="border-t border-slate-200 py-4 text-center text-xs text-slate-500">© {new Date().getFullYear()} {institusi} · Parepare, Sulawesi Selatan</div></footer></div>;
}
