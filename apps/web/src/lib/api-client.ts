import {
  KODE_GALAT,
  type ButirGalatValidasi,
  type KodeGalat,
  type MetaHalaman,
  type TanggapanGalat,
} from '@jdih/shared';

/**
 * Klien API Portal JDIH ITH.
 *
 * Satu berkas ini menangani dua keadaan yang mudah tertukar dan menjadi sumber
 * bug khas Next.js:
 *
 *  - Di PERAMBAN: alamat relatif `/api/v1/...` sudah cukup, karena Next
 *    meneruskannya ke peladen API pada asal yang sama, sehingga kuki autentikasi
 *    terkirim sendiri.
 *
 *  - Di PELADEN (komponen peladen, generateMetadata, route handler): alamat
 *    relatif tidak bermakna — tidak ada peramban yang melengkapinya. Karena itu
 *    alamat absolut dipakai, dan kuki permintaan masuk WAJIB diteruskan secara
 *    eksplisit, sebab fetch di peladen tidak mewarisinya.
 */

const DI_PELADEN = typeof window === 'undefined';

const PREFIKS = '/api/v1';

function basisUrl(): string {
  if (!DI_PELADEN) return PREFIKS;
  const internal = process.env.API_INTERNAL_URL ?? 'http://localhost:3001';
  return `${internal.replace(/\/+$/, '')}${PREFIKS}`;
}

/** Galat yang sudah diterjemahkan dari bentuk tanggapan baku peladen. */
export class GalatApi extends Error {
  constructor(
    readonly kode: KodeGalat,
    pesan: string,
    readonly status: number,
    readonly butir?: readonly ButirGalatValidasi[],
    readonly rincian?: Readonly<Record<string, unknown>>,
    readonly jejak?: string,
  ) {
    super(pesan);
    this.name = 'GalatApi';
  }

  /** Kesalahan validasi per ruas, siap ditempelkan ke react-hook-form. */
  get galatRuas(): Record<string, string> {
    const hasil: Record<string, string> = {};
    for (const butir of this.butir ?? []) {
      hasil[butir.ruas] ??= butir.pesan;
    }
    return hasil;
  }

  /** Dokumen terbatas: pengguna masih dapat mengajukan permintaan akses. */
  get dapatMintaAkses(): boolean {
    return this.kode === KODE_GALAT.PERLU_PERMINTAAN_AKSES;
  }

  /** Perlu masuk lebih dahulu; peramban dapat mengalihkan ke halaman masuk. */
  get perluMasuk(): boolean {
    return this.kode === KODE_GALAT.TIDAK_TERAUTENTIKASI;
  }
}

export interface OpsiPermintaan extends Omit<RequestInit, 'body'> {
  /** Objek apa pun; diubah menjadi JSON. Untuk unggahan berkas, pakai FormData. */
  muatan?: unknown;
  /** Parameter kueri. Nilai undefined dan null dibuang. */
  kueri?: Record<
    string,
    string | number | boolean | readonly (string | number)[] | undefined | null
  >;
  /**
   * Kuki yang diteruskan dari permintaan masuk. WAJIB diisi pada pemanggilan dari
   * komponen peladen yang memerlukan identitas pengguna; lihat `ambilDariPeladen`.
   */
  kuki?: string;
  /*
   * Ruas `next` (revalidate, tags) tidak dideklarasikan ulang di sini: Next.js
   * sudah memperluas RequestInit dengannya, sehingga `next: { revalidate: 60 }`
   * langsung sah dipakai.
   */
}

function susunKueri(kueri: OpsiPermintaan['kueri']): string {
  if (!kueri) return '';
  const params = new URLSearchParams();

  for (const [kunci, nilai] of Object.entries(kueri)) {
    if (nilai === undefined || nilai === null || nilai === '') continue;
    if (Array.isArray(nilai)) {
      if (nilai.length === 0) continue;
      // Peladen menguraikan daftar bernilai banyak sebagai teks terpisah koma.
      params.set(kunci, nilai.join(','));
    } else {
      params.set(kunci, String(nilai));
    }
  }

  const teks = params.toString();
  return teks ? `?${teks}` : '';
}

function adalahTanggapanGalat(nilai: unknown): nilai is TanggapanGalat {
  return (
    typeof nilai === 'object' &&
    nilai !== null &&
    'sukses' in nilai &&
    (nilai as { sukses: unknown }).sukses === false &&
    'galat' in nilai
  );
}

/**
 * Melakukan satu permintaan dan mengembalikan SELURUH badan tanggapan, termasuk
 * pembungkus `{ sukses, data, meta }`. Kegagalan dilemparkan sebagai `GalatApi`,
 * bukan dikembalikan sebagai nilai — sehingga pemanggil tidak dapat lupa
 * memeriksanya.
 */
async function permintaan<T>(jalur: string, opsi: OpsiPermintaan = {}): Promise<T> {
  const { muatan, kueri, kuki, headers, ...sisa } = opsi;

  const tajuk = new Headers(headers);
  tajuk.set('Accept', 'application/json');

  let badan: BodyInit | undefined;
  if (muatan instanceof FormData) {
    // Content-Type sengaja tidak diatur: peramban harus menambahkan boundary sendiri.
    badan = muatan;
  } else if (muatan !== undefined) {
    tajuk.set('Content-Type', 'application/json');
    badan = JSON.stringify(muatan);
  }

  if (kuki) tajuk.set('Cookie', kuki);

  const tanggapan = await fetch(`${basisUrl()}${jalur}${susunKueri(kueri)}`, {
    ...sisa,
    headers: tajuk,
    body: badan,
    // Kuki autentikasi harus ikut terkirim pada permintaan dari peramban.
    credentials: DI_PELADEN ? undefined : 'include',
  });

  if (tanggapan.status === 204) return undefined as T;

  const jenisIsi = tanggapan.headers.get('content-type') ?? '';
  if (!jenisIsi.includes('application/json')) {
    if (tanggapan.ok) return (await tanggapan.blob()) as T;
    throw new GalatApi(
      KODE_GALAT.GALAT_PELADEN,
      `Peladen mengembalikan tanggapan tak terduga (${tanggapan.status}).`,
      tanggapan.status,
    );
  }

  const isi: unknown = await tanggapan.json();

  if (!tanggapan.ok || adalahTanggapanGalat(isi)) {
    if (adalahTanggapanGalat(isi)) {
      throw new GalatApi(
        isi.galat.kode,
        isi.galat.pesan,
        tanggapan.status,
        isi.galat.butir,
        isi.galat.rincian,
        isi.jejak,
      );
    }
    throw new GalatApi(
      KODE_GALAT.GALAT_PELADEN,
      `Permintaan gagal dengan status ${tanggapan.status}.`,
      tanggapan.status,
    );
  }

  return isi as T;
}

/**
 * Permintaan biasa: mengembalikan ruas `data` dari tanggapan baku.
 * Inilah bentuk yang dipakai hampir di seluruh tempat.
 */
export async function ambilApi<T>(jalur: string, opsi: OpsiPermintaan = {}): Promise<T> {
  const isi = await permintaan<unknown>(jalur, opsi);

  // Tanggapan berhasil selalu berbentuk { sukses: true, data, ... }.
  if (typeof isi === 'object' && isi !== null && 'data' in isi) {
    return (isi as { data: T }).data;
  }
  // Blob dan tanggapan 204 tidak berpembungkus.
  return isi as T;
}

/** Hasil titik akhir berdaftar, beserta metadata halamannya. */
export interface HasilBerdaftar<T> {
  readonly data: readonly T[];
  readonly meta: MetaHalaman;
}

/**
 * Permintaan berdaftar: mempertahankan `meta` agar penghalamanan dapat dirender.
 * `ambilApi` akan membuang bagian itu, karena hanya mengembalikan `data`.
 */
export function ambilApiBerdaftar<T>(
  jalur: string,
  opsi: OpsiPermintaan = {},
): Promise<HasilBerdaftar<T>> {
  return permintaan<HasilBerdaftar<T>>(jalur, opsi);
}

export { PREFIKS as PREFIKS_API };
