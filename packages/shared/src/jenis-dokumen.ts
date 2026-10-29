/** Klasifikasi tampilan jenis; kode dikenal diprioritaskan, lalu nama master. */
export type MacamJenis = 'peraturan' | 'keputusan' | 'instruksi' | 'edaran' | 'peraturan-senat' | 'keputusan-senat' | 'sop';
const KODE: Record<string, MacamJenis> = { PERREK: 'peraturan', PR: 'peraturan', SKREK: 'keputusan', SK: 'keputusan', INSREK: 'instruksi', IR: 'instruksi', SEREK: 'edaran', EDREK: 'edaran', SE: 'edaran', PERSEN: 'peraturan-senat', SKSEN: 'keputusan-senat', SOP: 'sop' };
const POLA_NAMA: [RegExp, MacamJenis][] = [
  [/senat.*(keputusan|\bsk\b)|(keputusan|\bsk\b).*senat/i, 'keputusan-senat'],
  [/senat/i, 'peraturan-senat'], [/edaran/i, 'edaran'], [/instruksi/i, 'instruksi'],
  [/\bsop\b|prosedur/i, 'sop'], [/keputusan|\bsk\b/i, 'keputusan'], [/peraturan/i, 'peraturan'],
];
export function macamJenis(kode?: string, nama?: string): MacamJenis | undefined {
  const dariKode = kode ? KODE[kode.trim().toUpperCase()] : undefined;
  if (dariKode) return dariKode;
  return nama ? POLA_NAMA.find(([pola]) => pola.test(nama))?.[1] : undefined;
}
