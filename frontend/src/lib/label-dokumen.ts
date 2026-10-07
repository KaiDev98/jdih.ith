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
  DITARIK: { teks: 'Ditarik dari publik', warna: 'slate' },
};

export const LABEL_STATUS_HUKUM: Record<string, string> = {
  BERLAKU: 'Berlaku',
  DIUBAH: 'Diubah',
  DICABUT: 'Dicabut',
};

export const LABEL_AKSES: Record<string, string> = {
  publik: 'Publik (semua orang)',
  internal: 'Internal (Dosen/Staf yang masuk)',
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

/** Tahap yang masih boleh diubah isinya. */
export const TAHAP_BISA_DIUBAH = ['DRAF', 'REVISI'];

export function ukuranBerkas(byte: string | number) {
  const n = Number(byte);
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
  return `${Math.max(1, Math.round(n / 1024))} KB`;
}
