/** Istilah sehari-hari untuk catatan audit; dipakai dasbor dan halaman Audit. */

/** Aksi audit dalam bahasa sehari-hari; kode lain ditampilkan apa adanya. */
export const LABEL_AKSI: Record<string, string> = {
  CREATE: 'membuat',
  CREATE_VERSION: 'membuat versi/revisi',
  UPDATE: 'mengubah',
  UPDATE_VERSION: 'mengubah draf',
  DELETE: 'menghapus',
  DELETE_PERMANENT: 'menghapus permanen',
  ARCHIVE: 'mengarsipkan',
  UPLOAD_MAIN_FILE: 'mengunggah dokumen utama',
  UPLOAD_ATTACHMENT: 'mengunggah lampiran',
  DELETE_FILE: 'menghapus berkas',
  SUBMIT: 'mengajukan verifikasi',
  APPROVE: 'menyetujui',
  RETURN: 'mengembalikan untuk diperbaiki',
  PUBLISH: 'menerbitkan',
  WITHDRAW: 'menarik dari portal',
  CORRECT_STATUS: 'mengubah status hukum',
  STATUS_IMPACT: 'mengubah status hukum lewat relasi',
  UPDATE_STATUS_REASON: 'melengkapi alasan status',
  CREATE_CONTACT: 'menambah kontak kantor',
  UPDATE_CONTACT: 'mengubah kontak kantor',
  DELETE_CONTACT: 'menghapus kontak kantor',
  CREATE_UNIT: 'menambah unit kerja',
  REGISTER: 'mendaftar akun',
  DELETE_ACCOUNT: 'menghapus akun',
  CREATE_ADMIN: 'membuat akun Admin',
  RESET_PASSWORD: 'mengatur ulang password Admin',
  PASSWORD_CHANGE: 'mengganti password',
  DOWNLOAD_INTERNAL: 'mengunduh dokumen Internal',
  LOGIN_SUCCESS: 'masuk',
  LOGIN_UJI: 'masuk',
  LOGIN_FAILURE: 'gagal masuk',
  LOGOUT: 'keluar',
  REFRESH: 'memperbarui sesi',
};

/** Nama modul audit dalam bahasa sehari-hari. */
export const LABEL_MODUL: Record<string, string> = {
  documents: 'dokumen',
  workflow: 'alur verifikasi',
  'legal-relations': 'status hukum',
  identity: 'akun',
  settings: 'pengaturan',
  'letter-templates': 'format surat',
  master: 'master data',
  development: 'pengembangan',
};

/**
 * Waktu audit dari API berbentuk "YYYY-MM-DD HH:MM:SS.ffffff" dalam UTC tanpa
 * penanda zona; dibaca sebagai UTC lalu ditampilkan dalam WITA.
 */
const formatWaktu = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Makassar',
});
export function formatWaktuAudit(nilai: string) {
  const iso = /[zZ]|[+-]\d\d:?\d\d$/.test(nilai) ? nilai : `${nilai.replace(' ', 'T')}Z`;
  const tanggal = new Date(iso);
  return Number.isNaN(tanggal.getTime()) ? nilai : `${formatWaktu.format(tanggal)} WITA`;
}
