import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Mail, MessageSquareText, Phone } from 'lucide-react';
import styles from '@/components/koleksi-berkas.module.css';
import type { HasilCariAnonim, HasilCariAuthorized, KontakKantor } from '@jdih/shared';
import { ambilBerdaftarDariPeladen, ambilPublik } from '@/lib/api-peladen';
import { HeroHalaman } from '@/components/hero-halaman';
import { KoleksiBerkas } from '@/components/koleksi-berkas';
import { tautanTelepon } from '@/lib/kontak-institusi';
import {
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
      <div className={styles.pageWidth}>
        <KoleksiBerkas
          key={halaman}
          jenis="sk"
          initial={result}
          halaman={halaman}
          galatAwal={gagal ? 'Dokumen belum dapat dimuat. Silakan coba lagi.' : ''}
        />
        <aside aria-labelledby="judul-bantuan" className={styles.helpPanel}>
          <div className={styles.helpLead}>
            <span className={styles.helpSymbol} aria-hidden>
              <MessageSquareText size={20} strokeWidth={1.5} />
            </span>
            <div>
              <h2 id="judul-bantuan">Bantuan Pengajuan SK</h2>
              <p>Tanyakan prosedur atau kelengkapan berkas.</p>
            </div>
          </div>
          {!!kontak?.butir.length && (
            <div className={styles.helpContacts}>
              <ul aria-label="Kontak bantuan pengajuan SK" className={styles.helpContactList}>
                {kontak.butir.map((b) => (
                  <li key={b.id}>
                    <a
                      href={b.jenis === 'TELEPON' ? tautanTelepon(b.nilai) : `mailto:${b.nilai}`}
                      className={styles.helpContact}
                    >
                      <span className={styles.helpContactIcon} aria-hidden>
                        {b.jenis === 'TELEPON' ? (
                          <Phone size={18} strokeWidth={1.7} />
                        ) : (
                          <Mail size={18} strokeWidth={1.7} />
                        )}
                      </span>
                      <span className={styles.helpContactText}>
                        <span>{b.label || (b.jenis === 'TELEPON' ? 'Telepon' : 'Email')}</span>
                        <span>{b.nilai}</span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Link href="/kontak" className={styles.helpMore}>
            Kontak pengelola <ArrowRight size={16} aria-hidden />
          </Link>
        </aside>
      </div>
    </div>
  );
}
