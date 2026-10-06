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
  // Telepon dan surel tidak disimpan di sini: Admin mengelolanya lewat panel
  // (GET /public/contact).
  situs: 'https://ith.ac.id',
  /**
   * Jam layanan, waktu setempat Parepare (WITA). `nomorHari` mengikuti
   * Date.getDay() (0 = Minggu); `buka`/`tutup` dalam format 24 jam "HH:MM",
   * null bila libur. Dipakai footer untuk menandai status buka saat ini.
   */
  jamOperasional: [
    { hari: 'Senin – Kamis', jam: '07.30 – 16.00 WITA', nomorHari: [1, 2, 3, 4], buka: '07:30', tutup: '16:00' },
    { hari: 'Jumat', jam: '07.30 – 16.30 WITA', nomorHari: [5], buka: '07:30', tutup: '16:30' },
    { hari: 'Sabtu – Minggu', jam: 'Libur', nomorHari: [6, 0], buka: null, tutup: null },
  ],
  mediaSosial: [
    { nama: 'Instagram', label: '@ith.campus', url: 'https://www.instagram.com/ith.campus' },
    { nama: 'YouTube', label: '@humasITH', url: 'https://www.youtube.com/@humasITH' },
  ],
} as const;

/** Bentuk tanpa spasi/tanda baca untuk tautan `tel:`. */
export const tautanTelepon = (telepon: string) => `tel:${telepon.replace(/[^+0-9]/g, '')}`;

