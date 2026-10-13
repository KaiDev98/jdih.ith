import { FileText, Gavel, Scale, Stamp } from 'lucide-react';
import { IkonInstruksi, IkonSenat, IkonSop, IkonSurat } from '@/components/ikon-jenis';

/** Macam produk hukum; menentukan ikon, warna, dan gerak sorotnya. */
export type MacamJenis =
  | 'peraturan'
  | 'keputusan'
  | 'instruksi'
  | 'edaran'
  | 'peraturan-senat'
  | 'keputusan-senat'
  | 'sop';

/** Ikon, warna latar ikon, dan warna titik untuk setiap jenis produk hukum. */
export type TampilanJenis = {
  ikon: React.ComponentType<{ className?: string }>;
  kotak: string;
  titik: string;
  /** Kosong untuk jenis yang tidak dikenali (ikon dokumen umum). */
  macam?: MacamJenis;
};

const MACAM: Record<MacamJenis, Omit<TampilanJenis, 'macam'>> = {
  peraturan: { ikon: Scale, kotak: 'bg-[#e8f0fb] text-[#1d4f99]', titik: 'bg-[#1d4f99]' },
  keputusan: { ikon: Stamp, kotak: 'bg-[#e7f4ea] text-[#2e7d3a]', titik: 'bg-[#2e7d3a]' },
  instruksi: {
    ikon: IkonInstruksi,
    kotak: 'bg-institusi-50 text-institusi-700',
    titik: 'bg-[#e8792a]',
  },
  edaran: { ikon: IkonSurat, kotak: 'bg-[#fdf6dc] text-[#a07a05]', titik: 'bg-[#f2c230]' },
  'peraturan-senat': {
    ikon: IkonSenat,
    kotak: 'bg-[#f1edfb] text-[#5b3fa8]',
    titik: 'bg-[#5b3fa8]',
  },
  'keputusan-senat': { ikon: Gavel, kotak: 'bg-[#fbeef1] text-[#9f2f4c]', titik: 'bg-[#9f2f4c]' },
  sop: { ikon: IkonSop, kotak: 'bg-slate-100 text-slate-700', titik: 'bg-[#5b6472]' },
};
const BAWAAN: TampilanJenis = {
  ikon: FileText,
  kotak: 'bg-slate-100 text-slate-700',
  titik: 'bg-slate-400',
};

/**
 * Kode jenis dapat diubah Superadmin di menu Jenis Dokumen (mis. PERREK menjadi
 * PR), jadi kode yang dikenal hanya jalan pintas; penentu utamanya nama jenis.
 */
const KODE: Record<string, MacamJenis> = {
  PERREK: 'peraturan',
  PR: 'peraturan',
  SKREK: 'keputusan',
  SK: 'keputusan',
  INSREK: 'instruksi',
  IR: 'instruksi',
  SEREK: 'edaran',
  EDREK: 'edaran',
  SE: 'edaran',
  PERSEN: 'peraturan-senat',
  SKSEN: 'keputusan-senat',
  SOP: 'sop',
};
// Senat diperiksa lebih dulu agar "Peraturan Senat" tidak terbaca sebagai Peraturan Rektor.
const POLA_NAMA: [RegExp, MacamJenis][] = [
  [/senat.*(keputusan|\bsk\b)|(keputusan|\bsk\b).*senat/i, 'keputusan-senat'],
  [/senat/i, 'peraturan-senat'],
  [/edaran/i, 'edaran'],
  [/instruksi/i, 'instruksi'],
  [/\bsop\b|prosedur/i, 'sop'],
  [/keputusan|\bsk\b/i, 'keputusan'],
  [/peraturan/i, 'peraturan'],
];

export function macamJenis(kode?: string, nama?: string): MacamJenis | undefined {
  const dariKode = kode ? KODE[kode.trim().toUpperCase()] : undefined;
  if (dariKode) return dariKode;
  return nama ? POLA_NAMA.find(([pola]) => pola.test(nama))?.[1] : undefined;
}

export function tampilanJenis(kode?: string, nama?: string): TampilanJenis {
  const macam = macamJenis(kode, nama);
  return macam ? { ...MACAM[macam], macam } : BAWAAN;
}
