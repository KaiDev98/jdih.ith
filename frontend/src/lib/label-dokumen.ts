/**
 * Istilah sehari-hari untuk kode teknis dokumen di panel admin. Satu sumber
 * agar halaman detail dan halaman ubah draf memakai kata yang sama.
 */

export const LABEL_TAHAP: Record<
  string,
  { teks: string; warna: 'slate' | 'amber' | 'blue' | 'green' | 'red' }
> = {
  DRAF: { teks: 'Draf', warna: 'slate' },
  DIAJUKAN: { teks: 'Menunggu verifikasi', warna: 'amber' },
  REVISI: { teks: 'Perlu diperbaiki', warna: 'red' },
  DISETUJUI: { teks: 'Disetujui, siap terbit', warna: 'blue' },
  TERBIT: { teks: 'Terbit', warna: 'green' },
  /** Bukan status di basis data: versi TERBIT yang sudah digantikan versi terbit baru. */
  DIGANTI: { teks: 'Diganti versi baru', warna: 'slate' },
  DITARIK: { teks: 'Ditarik dari publik', warna: 'slate' },
};

/**
 * Kode tahap untuk ditampilkan. Versi lama tetap berstatus TERBIT di basis data
 * setelah revisinya terbit, tetapi sudah tidak tampil di portal; label "Terbit"
 * untuknya menyesatkan.
 */
export function kodeTahapTampil(statusWorkflow: string, diganti: boolean | number | undefined) {
  return statusWorkflow === 'TERBIT' && Boolean(Number(diganti ?? 0)) ? 'DIGANTI' : statusWorkflow;
}

export const LABEL_STATUS_HUKUM: Record<string, string> = {
  BERLAKU: 'Berlaku',
  DIUBAH: 'Diubah',
  DICABUT: 'Dicabut',
};

/** Warna lencana status hukum: hijau berlaku, kuning diubah, merah dicabut. */
export const WARNA_STATUS_HUKUM: Record<string, 'green' | 'amber' | 'red'> = {
  BERLAKU: 'green',
  DIUBAH: 'amber',
  DICABUT: 'red',
};

/** Lencana tingkat akses di tabel: biru publik, ungu internal. */
export const LENCANA_AKSES: Record<string, { teks: string; warna: 'blue' | 'violet' }> = {
  publik: { teks: 'Publik', warna: 'blue' },
  internal: { teks: 'Dosen/Staf', warna: 'violet' },
};

export const LABEL_AKSES: Record<string, string> = {
  publik: 'Publik (semua orang)',
  internal: 'Dosen/Staf (yang sudah masuk)',
};

/** Jenis hubungan antardokumen beserta akibatnya saat dokumen ini terbit. */
export const LABEL_RELASI: Record<string, { teks: string; akibat: string }> = {
  MENCABUT: {
    teks: 'Mencabut',
    akibat: 'Dokumen yang dipilih otomatis berstatus Dicabut saat dokumen ini terbit.',
  },
  MENGUBAH: {
    teks: 'Mengubah',
    akibat: 'Dokumen yang dipilih otomatis berstatus Diubah saat dokumen ini terbit.',
  },
  DASAR_HUKUM: {
    teks: 'Berdasarkan',
    akibat: 'Dokumen yang dipilih menjadi dasar hukum dokumen ini. Statusnya tidak berubah.',
  },
  TERKAIT: {
    teks: 'Terkait dengan',
    akibat: 'Hanya penanda keterkaitan. Status dokumen yang dipilih tidak berubah.',
  },
};

/**
 * Jenis berkas yang diterima backend untuk Produk Hukum dan Format Persuratan.
 * Backend tetap memeriksa isi berkas; ini hanya penyaring awal di peramban.
 */
export const TERIMA_BERKAS =
  '.pdf,.docx,.xlsx,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation';
export const POLA_BERKAS_DITERIMA = /\.(pdf|docx|xlsx|pptx)$/i;
export const LABEL_JENIS_BERKAS = 'PDF, DOCX, XLSX, atau PPTX';

/** Tahap yang masih boleh diubah isinya. */
export const TAHAP_BISA_DIUBAH = ['DRAF', 'REVISI'];

export function ukuranBerkas(byte: string | number) {
  const n = Number(byte);
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
  return `${Math.max(1, Math.round(n / 1024))} KB`;
}
