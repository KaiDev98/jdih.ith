import { BookOpen, PenLine, ShieldCheck } from 'lucide-react';
import styles from './auth-surface.module.css';

/** Ilustrasi arsip dibuat sebagai vektor; simbol penanda mengikuti jalur akun. */
export function AuthArtwork({ audience }: { audience: 'staff' | 'admin' | 'superadmin' }) {
  const Simbol =
    audience === 'superadmin' ? ShieldCheck : audience === 'admin' ? PenLine : BookOpen;

  return (
    <svg
      className={styles.artwork}
      viewBox="0 0 560 320"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <g className={styles.artBack}>
        <path d="M204 22H442V274H204V22Z" fill="#24425e" stroke="#617b91" />
        <path d="M228 48H414M228 60H342" stroke="#7890a2" strokeWidth="1.5" />
        <path d="M172 38H410V290H172V38Z" fill="#36536b" stroke="#9daeb9" />
        <path d="M192 60H326" stroke="#a8b7c1" strokeWidth="1.5" />
      </g>
      <g className={styles.artPaper}>
        <path d="M136 58H336L378 100V294H136V58Z" fill="#f4eee2" stroke="#e5d9c5" />
        <path d="M336 58V100H378" fill="#ddd1bd" />
        <path d="M336 58V100H378" stroke="#c9bba3" />
        <text x="160" y="88" className={styles.artDocumentLabel}>
          JDIH / ITH
        </text>
        <path d="M160 105H308" stroke="#d5c7b1" />
        <text x="212" y="212" textAnchor="middle" className={styles.artSectionMark}>
          §
        </text>
        <path d="M274 140H348M274 154H348M274 168H326" stroke="#a79579" strokeWidth="1.5" />
        <path d="M160 240H350M160 253H302" stroke="#c4b49a" strokeWidth="1.5" />
        <text x="160" y="278" className={styles.artDocumentCaption}>
          DOKUMENTASI HUKUM
        </text>
        <path d="M162 44H182V94L172 87L162 94V44Z" className={styles.artBookmark} />
      </g>
      <g className={styles.artSeal}>
        <circle cx="402" cy="224" r="47" fill="#102b43" />
        <circle cx="402" cy="224" r="39" className={styles.artSealSurface} />
        <circle cx="402" cy="224" r="31" stroke="#17344f" strokeOpacity="0.25" />
        <Simbol x="383" y="205" width="38" height="38" color="#18344f" strokeWidth="1.4" />
      </g>
      <path d="M124 310H440" stroke="#95a9b9" strokeOpacity="0.22" />
    </svg>
  );
}
