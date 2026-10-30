'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  KeyRound,
  LockKeyhole,
  PenLine,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { AuthArtwork } from './auth-artwork';
import styles from './auth-surface.module.css';

const LABEL = {
  admin: 'Autentikasi Admin',
  superadmin: 'Autentikasi Superadmin',
  staff: 'Autentikasi Dosen dan Staf',
};

const JALUR_PENGELOLA = [
  { audience: 'admin', label: 'Admin', href: '/masuk/admin', ikon: PenLine },
  { audience: 'superadmin', label: 'Superadmin', href: '/masuk/superadmin', ikon: ShieldCheck },
] as const;

const VISUAL = {
  staff: {
    label: 'Ruang Dosen & Staf',
    judul: ['Produk hukum', 'dan persuratan ITH.'],
    deskripsi: 'Peraturan, keputusan, dan format persuratan untuk kebutuhan sivitas ITH.',
  },
  admin: {
    label: 'Administrasi dokumen',
    judul: ['Pengelolaan', 'dokumen hukum.'],
    deskripsi:
      'Siapkan dokumen unit kerja, kelola draf, dan ikuti proses verifikasi pengajuan Anda.',
  },
  superadmin: {
    label: 'Verifikasi & penerbitan',
    judul: ['Verifikasi dan', 'penerbitan dokumen.'],
    deskripsi: 'Tinjau pengajuan, terbitkan dokumen, dan kelola akses pengguna portal JDIH ITH.',
  },
};

const LANGKAH_DAFTAR = [
  {
    judul: 'Identitas Anda',
    deskripsi: 'Nama lengkap dan email yang Anda gunakan.',
    ikon: UserRound,
  },
  { judul: 'Unit kerja', deskripsi: 'Pilih unit atau usulkan nama unit Anda.', ikon: Building2 },
  {
    judul: 'Keamanan akun',
    deskripsi: 'Buat password sebelum mengirim pendaftaran.',
    ikon: KeyRound,
  },
];

export function AuthSurface({
  audience,
  mode = 'login',
  registrationStep = 0,
  children,
}: {
  audience: keyof typeof LABEL;
  mode?: 'login' | 'register';
  registrationStep?: number;
  children: React.ReactNode;
}) {
  const visual =
    mode === 'register'
      ? {
          label: 'Pendaftaran Dosen & Staf',
          judul: ['Akses dimulai', 'dari akun Anda.'],
          deskripsi:
            'Lengkapi tiga langkah berikut. Superadmin akan memeriksa data Anda untuk memberikan akses internal.',
        }
      : VISUAL[audience];
  const surface = useRef<HTMLDivElement>(null);
  const formArea = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const viewport = window.visualViewport;
    let restingHeight = window.innerHeight;
    let restingWidth = window.innerWidth;
    let keyboardOpen = false;
    let animationFrame = 0;
    let appearanceSize = '';
    const rememberAppearance = () => {
      const element = surface.current;
      const card = element?.querySelector('section');
      const content = card?.querySelector<HTMLElement>(`.${styles.formContent}`);
      const brand = element?.querySelector<HTMLElement>(`.${styles.logo}`);
      if (!element || !card || !content || !brand || !formArea.current) return;
      const skin = window.getComputedStyle(element);
      const cardSkin = window.getComputedStyle(card);
      const brandSkin = window.getComputedStyle(brand);
      const header = element.querySelector('header');
      const back = element.querySelector<HTMLElement>(`.${styles.back}`);
      const values: Record<string, string> = {
        '--auth-keyboard-background': skin.backgroundColor,
        '--auth-keyboard-padding': skin.padding,
        '--auth-keyboard-card-background': cardSkin.backgroundColor,
        '--auth-keyboard-card-border': cardSkin.border,
        '--auth-keyboard-card-radius': cardSkin.borderRadius,
        '--auth-keyboard-card-shadow': cardSkin.boxShadow,
        '--auth-keyboard-card-space': window.getComputedStyle(formArea.current).paddingBlock,
        '--auth-keyboard-content-padding': window.getComputedStyle(content).padding,
        '--auth-keyboard-brand-color': brandSkin.color,
      };
      const rememberNode = (node: Element | null, name: string, properties: readonly string[]) => {
        if (!node) return;
        const original = window.getComputedStyle(node);
        for (const property of properties) {
          values[`--auth-keyboard-${name}-${property}`] = original.getPropertyValue(property);
        }
      };
      rememberNode(card.querySelector('nav'), 'nav', ['margin', 'padding']);
      rememberNode(card.querySelector('nav a'), 'nav-link', ['min-height', 'font-size', 'gap']);
      rememberNode(card.querySelector('nav svg'), 'nav-icon', ['display', 'width', 'height']);
      rememberNode(card.querySelector('.auth-heading'), 'heading', ['margin-bottom']);
      rememberNode(card.querySelector('.auth-eyebrow'), 'eyebrow', ['display', 'margin-bottom']);
      rememberNode(card.querySelector('.auth-password-form'), 'password', ['gap']);
      rememberNode(card.querySelector('.auth-fields'), 'fields', ['gap']);
      rememberNode(card.querySelector('.auth-divider'), 'divider', ['margin-block']);
      rememberNode(card.querySelector('.auth-policy'), 'policy', ['display', 'margin-top']);
      rememberNode(card.querySelector('.auth-steps'), 'steps', ['margin-bottom']);
      rememberNode(card.querySelector(`.${styles.cardFoot}`), 'footer', ['display', 'min-height']);
      if (header)
        values['--auth-keyboard-header-padding'] = window.getComputedStyle(header).padding;
      for (const name of ['display', 'height', 'color', 'radius']) {
        values[`--auth-keyboard-masthead-${name}`] = skin.getPropertyValue(
          `--auth-masthead-${name}`,
        );
      }
      const small = brand.querySelector('small');
      if (small) values['--auth-keyboard-brand-caption'] = window.getComputedStyle(small).color;
      if (back) {
        const backSkin = window.getComputedStyle(back);
        values['--auth-keyboard-back-color'] = backSkin.color;
        values['--auth-keyboard-back-background'] = backSkin.backgroundColor;
        values['--auth-keyboard-back-border'] = backSkin.borderColor;
      }
      for (const [name, value] of Object.entries(values)) element.style.setProperty(name, value);
      appearanceSize = `${window.innerWidth}:${window.innerHeight}`;
    };
    // Bekukan kulit tampilan sebelum keyboard mengubah media query tinggi layar.
    if (surface.current) surface.current.dataset.short = String(restingHeight < 620);
    rememberAppearance();
    const sync = () => {
      const element = surface.current;
      if (!element) return;
      const layoutHeight = window.innerHeight;
      const height = viewport?.height ?? layoutHeight;
      const focused = document.activeElement;
      const editing =
        focused instanceof HTMLElement &&
        element.contains(focused) &&
        focused.matches('input, textarea, select, [contenteditable="true"]');
      // Sebagian browser mengecilkan innerHeight bersama visualViewport.
      // Simpan tinggi sebelum mengetik agar keyboard tetap terdeteksi.
      if (Math.abs(window.innerWidth - restingWidth) > 80) {
        restingWidth = window.innerWidth;
        restingHeight = layoutHeight;
      }
      const compressed = height < Math.max(layoutHeight, restingHeight) * 0.78;
      keyboardOpen =
        (viewport?.scale ?? 1) <= 1.05 &&
        (height < layoutHeight * 0.78 || ((editing || keyboardOpen) && compressed));
      if (!editing && !keyboardOpen) restingHeight = layoutHeight;
      element.style.height = `${height}px`;
      element.style.top = `${Math.max(0, viewport?.offsetTop ?? 0)}px`;
      element.dataset.keyboard = String(keyboardOpen);
      element.dataset.short = String((keyboardOpen ? restingHeight : height) < 620);
      if (
        !keyboardOpen &&
        height >= layoutHeight * 0.95 &&
        (editing || appearanceSize !== `${window.innerWidth}:${layoutHeight}`)
      )
        rememberAppearance();
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        const area = formArea.current;
        const active = document.activeElement;
        if (
          !area ||
          !(active instanceof HTMLElement) ||
          !area.contains(active) ||
          !active.matches('input, textarea, select, [contenteditable="true"]')
        )
          return;
        const bounds = area.getBoundingClientRect();
        const field = active.getBoundingClientRect();
        if (field.top < bounds.top + 12) area.scrollTop -= bounds.top + 12 - field.top;
        else if (field.bottom > bounds.bottom - 12)
          area.scrollTop += field.bottom - bounds.bottom + 12;
      });
    };
    sync();
    viewport?.addEventListener('resize', sync);
    viewport?.addEventListener('scroll', sync);
    window.addEventListener('resize', sync);
    document.addEventListener('focusin', sync);
    document.addEventListener('focusout', sync);
    return () => {
      viewport?.removeEventListener('resize', sync);
      viewport?.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
      document.removeEventListener('focusin', sync);
      document.removeEventListener('focusout', sync);
      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <div
      ref={surface}
      className={styles.surface}
      data-auth-viewport
      data-audience={audience}
      data-mode={mode}
    >
      <div className={styles.frame}>
        <header className={styles.topbar}>
          <Link href="/" className={styles.logo} aria-label="JDIH ITH, beranda">
            <span className={styles.logoMark}>
              <Image src="/logo-ith.webp" alt="" width={34} height={40} unoptimized />
            </span>
            <span className={styles.logoCopy}>
              <span className={styles.logoWordmark}>
                JDIH <span className={styles.logoSuffix}>ITH</span>
              </span>
              <small>Portal Hukum ITH</small>
            </span>
          </Link>
          {mode === 'register' && (
            <Link href="/" className={styles.back} aria-label="Kembali ke portal">
              <ArrowLeft size={15} aria-hidden />
              <span className={styles.backLabel}>Kembali ke portal</span>
              <span className={styles.backShort} aria-hidden>
                Ke portal
              </span>
            </Link>
          )}
        </header>

        <div ref={formArea} className={styles.stage} data-auth-scroll>
          <aside className={styles.visual} aria-label="Dokumentasi dan informasi hukum ITH">
            <div className={styles.visualBody}>
              <div className={styles.visualCopy}>
                <p className={styles.visualLabel}>
                  <span aria-hidden />
                  {visual.label}
                </p>
                <p className={styles.visualTitle}>
                  {visual.judul.map((baris) => (
                    <span key={baris}>{baris}</span>
                  ))}
                </p>
                <p className={styles.visualDescription}>{visual.deskripsi}</p>
              </div>
              {mode === 'register' ? (
                <ol className={styles.registrationGuide} aria-label="Panduan pendaftaran">
                  {LANGKAH_DAFTAR.map((item, index) => (
                    <li
                      key={item.judul}
                      aria-current={registrationStep === index ? 'step' : undefined}
                      data-done={index < registrationStep}
                    >
                      <span className={styles.guideIcon} aria-hidden>
                        {index < registrationStep ? (
                          <Check size={19} />
                        ) : (
                          <item.ikon size={19} strokeWidth={1.5} />
                        )}
                      </span>
                      <div>
                        <span className={styles.guideIndex}>0{index + 1}</span>
                        <strong>{item.judul}</strong>
                        <p>{item.deskripsi}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className={styles.visualEmblem}>
                  <AuthArtwork audience={audience} />
                </div>
              )}
            </div>
            <div className={styles.visualFoot}>
              <span>Institut Teknologi B. J. Habibie</span>
              <span>Parepare, Sulawesi Selatan</span>
            </div>
          </aside>
          <div className={styles.formPanel}>
            <section className={styles.form} aria-label={LABEL[audience]}>
              {(mode === 'register' || audience !== 'staff') && (
                <nav
                  className={styles.roleNav}
                  aria-label={
                    mode === 'register' ? 'Akses akun Dosen/Staf' : 'Pilih akses pengelola'
                  }
                >
                  {mode === 'register' ? (
                    <>
                      <Link href="/masuk">Masuk</Link>
                      <Link href="/daftar" aria-current="page">
                        Daftar akun
                      </Link>
                    </>
                  ) : (
                    JALUR_PENGELOLA.map((jalur) => (
                      <Link
                        key={jalur.audience}
                        href={jalur.href}
                        aria-current={audience === jalur.audience ? 'page' : undefined}
                      >
                        <jalur.ikon size={15} strokeWidth={1.7} aria-hidden="true" />
                        {jalur.label}
                      </Link>
                    ))
                  )}
                </nav>
              )}
              <div className={styles.formContent}>{children}</div>
              <div className={styles.cardFoot}>
                <LockKeyhole size={13} aria-hidden />
                <span>Jaringan Dokumentasi dan Informasi Hukum</span>
              </div>
            </section>
          </div>
        </div>

        <footer className={styles.note}>
          <p>Institut Teknologi Bacharuddin Jusuf Habibie</p>
          <p className={styles.noteLocation}>Parepare, Sulawesi Selatan</p>
          <Link href="/produk-hukum">
            Telusuri dokumen publik <ArrowRight size={12} aria-hidden />
          </Link>
        </footer>
      </div>
    </div>
  );
}
