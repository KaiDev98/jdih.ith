/**
 * Ikon jenis produk hukum yang bagian-bagiannya dapat dianimasikan terpisah.
 * Bentuknya sama persis dengan ikon lucide (ClipboardList, Mail, ListChecks, Landmark);
 * kelas pada tiap bagian dipakai animasi sorot di globals.css (.tile-jenis).
 */

type Props = { className?: string };

function Svg({ className, children }: Props & { children: React.ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {children}
    </svg>
  );
}

/** Papan instruksi: titik dan baris di papan dapat "tertulis" satu per satu. */
export function IkonInstruksi({ className }: Props) {
  return (
    <Svg className={className}>
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path className="tulis-titik" d="M8 11h.01" />
      <path className="tulis-garis" d="M12 11h4" />
      <path className="tulis-titik ke-2" d="M8 16h.01" />
      <path className="tulis-garis ke-2" d="M12 16h4" />
    </Svg>
  );
}

/**
 * Amplop: badan dan lipatannya dapat berubah bentuk menjadi amplop terbuka,
 * lalu kertas surat menyembul. Bentuk tertutup dan terbuka memakai perintah
 * path yang sama agar perubahannya mulus (lihat .amplop-* di globals.css).
 */
export function IkonSurat({ className }: Props) {
  return (
    <Svg className={className}>
      <path
        className="kertas-surat"
        strokeWidth={1.6}
        d="M7.5 11.5V6.5q0-1 1-1h7q1 0 1 1v5M10 8h4"
      />
      <path
        className="amplop-badan"
        d="M2 6.5Q2 4.5 4 4.5L12 4.5L20 4.5Q22 4.5 22 6.5L22 18Q22 20 20 20L4 20Q2 20 2 18Z"
      />
      <path className="amplop-lipatan" d="M22 7.5L13 13.2Q12 13.8 11 13.2L2 7.5" />
    </Svg>
  );
}

/** Daftar periksa: tanda centang dapat tergores muncul. */
export function IkonSop({ className }: Props) {
  return (
    <Svg className={className}>
      <path d="M13 5h8" />
      <path d="M13 12h8" />
      <path d="M13 19h8" />
      <path className="centang" d="m3 7 2 2 4-4" />
      <path className="centang ke-2" d="m3 17 2 2 4-4" />
    </Svg>
  );
}

/** Gedung senat: tiang-tiangnya dapat tergambar naik satu per satu. */
export function IkonSenat({ className }: Props) {
  return (
    <Svg className={className}>
      <path d="M11.119 2.205a2 2 0 0 1 1.762 0l7.84 3.846A.5.5 0 0 1 20.5 7h-17a.5.5 0 0 1-.22-.949z" />
      <path className="tiang" d="M6 18v-7" />
      <path className="tiang ke-2" d="M10 18v-7" />
      <path className="tiang ke-3" d="M14 18v-7" />
      <path className="tiang ke-4" d="M18 18v-7" />
      <path d="M3 22h18" />
    </Svg>
  );
}

/** Kotak centang kecil penanda unit SOP; centangnya tergores saat butirnya (.unit-sop) disorot. */
export function KotakCentang({ className }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`kotak-centang ${className ?? ''}`}
    >
      <rect x="1.75" y="1.75" width="12.5" height="12.5" rx="3.5" />
      <path className="centang-unit" d="m5 8.2 2 2 4-4.4" />
    </svg>
  );
}
