import { cookies } from 'next/headers';

import {
  ambilApi,
  ambilApiBerdaftar,
  type HasilBerdaftar,
  type OpsiPermintaan,
} from './api-client';

/**
 * Pemanggilan API dari sisi peladen (komponen peladen, generateMetadata,
 * route handler).
 *
 * Hanya boleh diimpor dari kode yang berjalan di peladen — `next/headers` tidak
 * tersedia di peramban.
 *
 * Mengapa fungsi terpisah: `fetch` di peladen TIDAK mewarisi kuki permintaan
 * yang sedang ditangani. Tanpa penerusan eksplisit, halaman yang dirender di
 * peladen akan selalu tampak seperti diakses pengunjung anonim — dokumen internal
 * hilang dari daftar, dan pengguna yang sudah masuk tampak belum masuk. Kekeliruan
 * ini sulit disadari karena halamannya tetap tampil, hanya isinya kurang.
 */

async function tajukKuki(): Promise<string> {
  const simpanan = await cookies();
  return simpanan
    .getAll()
    .map((kuki) => `${kuki.name}=${kuki.value}`)
    .join('; ');
}

/** Seperti `ambilApi`, dengan kuki permintaan masuk diteruskan. */
export async function ambilDariPeladen<T>(jalur: string, opsi: OpsiPermintaan = {}): Promise<T> {
  return ambilApi<T>(jalur, { ...opsi, kuki: await tajukKuki() });
}

/** Seperti `ambilApiBerdaftar`, dengan kuki permintaan masuk diteruskan. */
export async function ambilBerdaftarDariPeladen<T>(
  jalur: string,
  opsi: OpsiPermintaan = {},
): Promise<HasilBerdaftar<T>> {
  return ambilApiBerdaftar<T>(jalur, { ...opsi, kuki: await tajukKuki() });
}

/**
 * Pemanggilan untuk data yang sama bagi semua orang — misalnya daftar dokumen
 * publik, statistik, atau halaman profil. Kuki TIDAK diteruskan, sehingga Next
 * boleh menyimpan hasilnya di cache dan menyajikannya kepada seluruh pengunjung.
 *
 * Memakai ini pada data yang bergantung identitas akan membuat tanggapan satu
 * pengguna tersaji kepada pengguna lain, jadi pilihannya harus disengaja.
 */
export async function ambilPublik<T>(jalur: string, opsi: OpsiPermintaan = {}): Promise<T> {
  return ambilApi<T>(jalur, {
    // Dokumen yang baru terbit harus segera tampak; satu menit cukup untuk
    // meredam lonjakan tanpa membuat isi portal terasa basi.
    next: { revalidate: 60 },
    ...opsi,
  });
}
