'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ambilApi, ambilApiBerdaftar } from '@/lib/api-client';
import { useSession } from '@/lib/sesi';
import { alamatPanel } from '@/lib/panel';

/** Angka penanda per alamat menu, mis. { '/admin/dokumen/verifikasi': 3 }. */
export type HitunganNav = Readonly<Record<string, number>>;

const JEDA_PEMBARUAN = 60_000;

/**
 * Jumlah pekerjaan yang menunggu, untuk lencana di menu: dokumen yang
 * diajukan (antrean verifikasi) dan pendaftaran akun Dosen/Staf. Dimuat ulang
 * setiap pindah halaman (mis. setelah menyetujui dokumen) dan tiap menit
 * selama tab terlihat. Hanya meminta data yang memang boleh dibaca akun ini;
 * kegagalan cukup membuat lencananya tidak tampil.
 */
export function useHitunganNav(izin: readonly string[]): HitunganNav {
  const pathname = usePathname();
  const { pengguna } = useSession();
  const [hitungan, setHitungan] = useState<HitunganNav>({});
  const bolehAntrean = ['workflow.approve', 'workflow.return', 'documents.read_admin'].some((i) =>
    izin.includes(i),
  );
  const bolehAkun = izin.includes('users.read') || izin.includes('documents.read_admin');

  useEffect(() => {
    let aktif = true;
    async function muat() {
      const hasil: Record<string, number> = {};
      await Promise.all([
        bolehAntrean
          ? ambilApiBerdaftar('/admin/documents/verification-queue', {
              kueri: { halaman: 1, perHalaman: 1 },
            })
              .then((r) => {
                hasil['/admin/dokumen/verifikasi'] = r.meta.totalButir;
              })
              .catch(() => undefined)
          : undefined,
        bolehAkun
          ? ambilApi<unknown[]>('/admin/users', { kueri: { halaman: 1, perHalaman: 100 } })
              .then((r) => {
                hasil['/admin/pengguna'] = r.length;
              })
              .catch(() => undefined)
          : undefined,
      ]);
      if (aktif) setHitungan(hasil);
    }
    void muat();
    const pewaktu = window.setInterval(() => {
      if (document.visibilityState === 'visible') void muat();
    }, JEDA_PEMBARUAN);
    return () => {
      aktif = false;
      window.clearInterval(pewaktu);
    };
  }, [pathname, bolehAntrean, bolehAkun]);

  return Object.fromEntries(Object.entries(hitungan).map(([href, jumlah]) => [alamatPanel(pengguna?.peran ?? [], href), jumlah]));
}

const KUNCI_CIUT = 'jdih:sidebar-ciut';

/** Preferensi sidebar diciutkan (hanya ikon), diingat per peramban. */
export function useSidebarCiut(): [boolean, (nilai: boolean) => void] {
  const [ciut, setCiut] = useState(false);
  useEffect(() => {
    try {
      // Dibaca setelah terpasang agar tampilan peladen dan peramban sama.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCiut(window.localStorage.getItem(KUNCI_CIUT) === '1');
    } catch {
      // Penyimpanan diblokir: tetap lebar.
    }
  }, []);
  return [
    ciut,
    (nilai: boolean) => {
      setCiut(nilai);
      try {
        window.localStorage.setItem(KUNCI_CIUT, nilai ? '1' : '0');
      } catch {
        // Abaikan; preferensi hanya berlaku sampai halaman dimuat ulang.
      }
    },
  ];
}
