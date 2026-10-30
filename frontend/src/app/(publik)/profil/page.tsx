import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, FileSignature, Files, LibraryBig, MapPin } from 'lucide-react';
import { HeroHalaman } from '@/components/hero-halaman';
import { KONTAK_INSTITUSI } from '@/lib/kontak-institusi';
import styles from './profil.module.css';

export const metadata: Metadata = {
  title: 'Profil ITH',
  description:
    'Mengenal Institut Teknologi Bacharuddin Jusuf Habibie di Parepare dan layanan dokumentasi hukum melalui JDIH ITH.',
};

const koleksi = [
  {
    judul: 'Produk Hukum',
    keterangan: 'Peraturan, keputusan, instruksi, surat edaran, dan SOP institusi.',
    href: '/produk-hukum',
    Ikon: LibraryBig,
  },
  {
    judul: 'Format Persuratan',
    keterangan: 'Format surat yang dapat diunduh untuk kebutuhan administrasi.',
    href: '/format-persuratan',
    Ikon: Files,
  },
  {
    judul: 'SOP Permohonan SK',
    keterangan: 'Prosedur dan kelengkapan untuk pengajuan Surat Keputusan.',
    href: '/permohonan-sk',
    Ikon: FileSignature,
  },
];

export default function Profil() {
  return (
    <div className={styles.page}>
      <HeroHalaman
        label="Tentang ITH"
        judul="Profil ITH"
        deskripsi="Mengenal institut dan layanan dokumentasi hukumnya."
      />
      <div className={styles.content}>
        <section aria-labelledby="tentang-institut" className={styles.intro}>
          <div className={styles.story}>
            <p className={styles.eyebrow}>Institut Teknologi Bacharuddin Jusuf Habibie</p>
            <h2 id="tentang-institut">Institut teknologi di Kota Parepare.</h2>
            <p className={styles.lead}>
              ITH merupakan perguruan tinggi negeri di Kota Parepare, Sulawesi Selatan, yang
              menyelenggarakan pendidikan di bidang sains dan teknologi.
            </p>
            <p>
              Didirikan pada 2014 dan mulai beroperasi pada 2021, ITH mengembangkan pendidikan,
              penelitian, serta pengabdian kepada masyarakat. Arah pengembangannya menempatkan
              inovasi dalam konteks Indonesia sebagai wilayah maritim.
            </p>
            <dl className={styles.history}>
              <div>
                <dt>Didirikan</dt>
                <dd>2014</dd>
              </div>
              <div>
                <dt>Mulai beroperasi</dt>
                <dd>2021</dd>
              </div>
            </dl>
          </div>
          <aside className={styles.identity} aria-label="Identitas institusi">
            <span className={styles.logo}>
              <Image src="/logo-ith.webp" alt="Logo ITH" width={68} height={72} unoptimized />
            </span>
            <span className={styles.identityLabel}>Perguruan tinggi negeri</span>
            <p className={styles.instituteName}>{KONTAK_INSTITUSI.nama}</p>
            <p className={styles.location}>
              <MapPin size={16} aria-hidden /> Parepare, Sulawesi Selatan
            </p>
            <div className={styles.identityBottom}>
              <span>Kenali institusi lebih dekat</span>
              <a href={KONTAK_INSTITUSI.situs} target="_blank" rel="noopener noreferrer">
                ith.ac.id <ArrowUpRight size={17} aria-hidden />
              </a>
            </div>
          </aside>
        </section>
        <section aria-labelledby="tentang-portal" className={styles.portal}>
          <div className={styles.portalIntro}>
            <p className={styles.eyebrow}>Jaringan Dokumentasi dan Informasi Hukum</p>
            <h2 id="tentang-portal">Satu tempat untuk menelusuri dokumen institusi.</h2>
            <p>
              JDIH ITH membantu sivitas akademika dan masyarakat menemukan produk hukum yang telah
              diterbitkan, format persuratan, serta prosedur permohonan SK.
            </p>
            <p>
              Gunakan pencarian dan penyaring untuk menemukan dokumen yang sesuai. Pada halaman
              detail, periksa nomor, tahun, status hukum, dan informasi perubahan sebelum
              menggunakan dokumen sebagai rujukan.
            </p>
          </div>
          <ul className={styles.collections} aria-label="Koleksi JDIH ITH">
            {koleksi.map(({ judul, keterangan, href, Ikon }) => (
              <li key={href}>
                <Link href={href}>
                  <span className={styles.collectionIcon}>
                    <Ikon size={23} strokeWidth={1.5} aria-hidden />
                  </span>
                  <span>
                    <h3>{judul}</h3>
                    <p>{keterangan}</p>
                  </span>
                  <ArrowRight size={18} className={styles.arrow} aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="akses-dokumen" className={styles.access}>
          <div>
            <p className={styles.eyebrow}>Menggunakan portal</p>
            <h2 id="akses-dokumen">Akses sesuai kebutuhan.</h2>
          </div>
          <div className={styles.accessDetails}>
            <div>
              <h3>Untuk masyarakat</h3>
              <p>Dokumen berakses publik dapat ditelusuri dan diunduh tanpa masuk ke akun.</p>
            </div>
            <div>
              <h3>Untuk Dosen/Staf</h3>
              <p>
                Masuk dengan akun yang telah diverifikasi dan diaktifkan untuk membaca dokumen
                internal. Pendaftaran akun tersedia melalui portal.
              </p>
            </div>
          </div>
          <Link href="/kontak" className={styles.contact}>
            Perlu bantuan? Hubungi pengelola <ArrowRight size={17} aria-hidden />
          </Link>
        </section>
      </div>
    </div>
  );
}
