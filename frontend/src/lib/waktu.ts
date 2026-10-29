/** Utilitas waktu panel admin; semua menurut zona WITA (Parepare). */

const ZONA = 'Asia/Makassar';

const formatTanggalPanjang = new Intl.DateTimeFormat('id-ID', {
  timeZone: ZONA,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const formatTanggalPendek = new Intl.DateTimeFormat('id-ID', {
  timeZone: ZONA,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const formatJam = new Intl.DateTimeFormat('id-ID', {
  timeZone: ZONA,
  hour: 'numeric',
  hourCycle: 'h23',
});

/** "Kamis, 16 Oktober 2026". */
export function tanggalPanjang(waktu = new Date()) {
  return formatTanggalPanjang.format(waktu);
}

/** Sapaan menurut jam WITA: pagi, siang, sore, atau malam. */
export function salamWaktu(waktu = new Date()) {
  const jam = Number(formatJam.format(waktu));
  if (jam >= 4 && jam < 11) return 'Selamat pagi';
  if (jam >= 11 && jam < 15) return 'Selamat siang';
  if (jam >= 15 && jam < 18) return 'Selamat sore';
  return 'Selamat malam';
}

/** Nama sapaan: kata pertama, kecuali gelar singkat seperti "Dr." yang ikut kata berikutnya. */
export function namaSapaan(nama: string) {
  const kata = nama.trim().split(/\s+/).filter(Boolean);
  if (kata.length === 0) return '';
  return kata[0]!.endsWith('.') && kata[1] ? `${kata[0]!} ${kata[1]}` : kata[0]!;
}

/**
 * Waktu relatif yang mudah dibaca: "baru saja", "5 menit lalu", "2 jam lalu",
 * "kemarin", "3 hari lalu"; lebih dari seminggu memakai tanggal.
 */
export function waktuRelatif(iso: string | null | undefined, sekarang = new Date()) {
  if (!iso) return '';
  // Basis data mengirim "2026-10-16 03:24:34" (UTC, tanpa zona).
  const waktu = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso.replace(' ', 'T')}Z`);
  if (Number.isNaN(waktu.getTime())) return '';
  const detik = Math.round((sekarang.getTime() - waktu.getTime()) / 1000);
  if (detik < 60) return 'baru saja';
  const menit = Math.floor(detik / 60);
  if (menit < 60) return `${String(menit)} menit lalu`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${String(jam)} jam lalu`;
  const hari = Math.floor(jam / 24);
  if (hari === 1) return 'kemarin';
  if (hari < 7) return `${String(hari)} hari lalu`;
  return formatTanggalPendek.format(waktu);
}
