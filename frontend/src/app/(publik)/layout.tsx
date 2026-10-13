import type { KontakKantor, RingkasanKunjungan, TahunTersedia } from '@jdih/shared';
import { PublicHeader, type JenisMenu, type UnitSopMenu } from '@/components/navigasi-publik';
import { ambilPublik } from '@/lib/api-peladen';
import { FooterPublik } from '@/components/footer-publik';

/** Tahun untuk menu "Berdasarkan Tahun". Kegagalan tidak boleh merobohkan seluruh halaman. */
async function ambilTahun(): Promise<TahunTersedia> {
  try { return await ambilPublik<TahunTersedia>('/public/documents/years'); } catch { return []; }
}

/** Jenis dokumen untuk menu Produk Hukum; bila gagal, menu memakai daftar cadangan. */
async function ambilJenis(): Promise<JenisMenu[]> {
  try { return (await ambilPublik<JenisMenu[]>('/public/master/jenis_dokumen')).map(({ kode, nama }) => ({ kode, nama })); } catch { return []; }
}

/** Kategori SOP untuk sub-menu SOP; bila gagal, menu memakai daftar cadangan. */
async function ambilUnitSop(): Promise<UnitSopMenu[]> {
  try { return (await ambilPublik<UnitSopMenu[]>('/public/master/kategori')).map(({ kode, nama }) => ({ kode, nama })); } catch { return []; }
}

/** Telepon dan surel kantor dikelola Admin; bila gagal dimuat, barisnya cukup tidak tampil. */
async function ambilKontak(): Promise<KontakKantor | null> {
  try { return await ambilPublik<KontakKantor>('/public/contact', { cache: 'no-store' }); } catch { return null; }
}

/** Angka kunjungan awal untuk footer; komponen di peramban memperbaruinya sendiri. */
async function ambilKunjungan(): Promise<RingkasanKunjungan | null> {
  try { return await ambilPublik<RingkasanKunjungan>('/public/visits', { cache: 'no-store' }); } catch { return null; }
}

export default async function TataLetakPublik({ children }: { children: React.ReactNode }) {
  const [tahun, jenis, unitSop, kontak, kunjungan] = await Promise.all([ambilTahun(), ambilJenis(), ambilUnitSop(), ambilKontak(), ambilKunjungan()]);
  return <div className="flex min-h-screen flex-col bg-white"><PublicHeader tahun={tahun} jenis={jenis} unitSop={unitSop} /><main id="isi-utama" className="flex-1">{children}</main><FooterPublik kontak={kontak} kunjungan={kunjungan} /></div>;
}
