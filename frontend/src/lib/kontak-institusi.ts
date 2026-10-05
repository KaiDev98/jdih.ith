/**
 * Kontak resmi Institut Teknologi Bacharuddin Jusuf Habibie.
 *
 * Sumber: situs resmi https://ith.ac.id (bagian kontak pada tajuk situs),
 * diambil 2026-10-05. Bila kontak institusi berubah, cukup perbarui berkas ini —
 * seluruh halaman yang menampilkan kontak membacanya dari sini.
 */
export const KONTAK_INSTITUSI = {
  nama: 'Institut Teknologi Bacharuddin Jusuf Habibie',
  /** Ruang kantor JDIH; tampil di footer dan halaman Kontak. */
  kantor: {
    ruang: 'R. Sub Bagian Umum',
    lokasi: 'Kampus 1 ITH',
    urlPeta: 'https://maps.app.goo.gl/iEoaX7dLgpjVVjVJ8',
  },
  // Nomor telepon tidak disimpan di sini: Admin mengubahnya lewat panel
  // (GET /public/contact). Surel tetap dari berkas ini.
  surel: 'humas@ith.ac.id',
  situs: 'https://ith.ac.id',
  /** Jam layanan, waktu setempat Parepare (WITA). */
  jamOperasional: [
    { hari: 'Senin – Kamis', jam: '07.30 – 16.00 WITA' },
    { hari: 'Jumat', jam: '07.30 – 16.30 WITA' },
    { hari: 'Sabtu – Minggu', jam: 'Libur' },
  ],
  mediaSosial: [
    { nama: 'Instagram', label: '@ith.campus', url: 'https://www.instagram.com/ith.campus' },
    { nama: 'YouTube', label: '@humasITH', url: 'https://www.youtube.com/@humasITH' },
  ],
} as const;

/** Bentuk tanpa spasi/tanda baca untuk tautan `tel:`. */
export const tautanTelepon = (telepon: string) => `tel:${telepon.replace(/[^+0-9]/g, '')}`;

