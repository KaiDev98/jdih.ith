'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouterPanel as useRouter } from '@/components/admin/tautan-panel';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { CornerDownLeft, FileText, LoaderCircle, Search, Zap } from 'lucide-react';
import { ambilApiBerdaftar } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { kodeTahapTampil, LABEL_TAHAP } from '@/lib/label-dokumen';
import { AKSI_CEPAT, type ButirNav, type KelompokNav } from './navigasi-admin';

type HasilDokumen = {
  id: string;
  versionId: string;
  judul: string;
  tipe: string;
  nomor: string | null;
  nomorVersi: number;
  statusWorkflow: string;
  diganti: boolean | number;
};

type Pilihan = {
  kunci: string;
  kelompok: 'Halaman' | 'Aksi cepat' | 'Dokumen';
  label: string;
  keterangan?: string;
  href: string;
  ikon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  tahap?: string;
  disabled?: boolean;
};

/** Huruf kecil tanpa diakritik, agar "sk" cocok dengan "SK" dan seterusnya. */
const normal = (teks: string) =>
  teks
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

const cocok = (butir: ButirNav, kata: string) =>
  !kata || normal(`${butir.label} ${butir.kataKunci ?? ''}`).includes(kata);

/**
 * Palet perintah panel admin (Ctrl+K atau "/"): lompat ke halaman, jalankan
 * aksi cepat, atau cari dokumen menurut judul, nomor, atau slug. Sepenuhnya
 * dapat dipakai dengan papan ketik: panah atas/bawah memilih, Enter membuka,
 * Esc menutup. Hanya menampilkan apa yang boleh dibuka akun ini.
 */
export function PaletPerintah({
  buka,
  onBukaChange,
  menu,
  izin,
  peran,
}: {
  buka: boolean;
  onBukaChange: (buka: boolean) => void;
  menu: readonly KelompokNav[];
  izin: readonly string[];
  peran: readonly string[];
}) {
  const router = useRouter();
  const [kueri, setKueri] = useState('');
  // Hasil disimpan bersama kata pencariannya; hasil untuk kata lama tidak dipakai.
  const [hasil, setHasil] = useState<{ kata: string; data: readonly HasilDokumen[] }>();
  const [aktifMentah, setAktif] = useState(0);
  const daftar = useRef<HTMLUListElement>(null);
  const bolehDokumen = izin.includes('documents.read_admin');
  const kata = normal(kueri.trim());
  const cariDokumen = buka && bolehDokumen && kata.length >= 2;
  const dokumen = useMemo(
    () => (cariDokumen && hasil?.kata === kata ? hasil.data : []),
    [cariDokumen, hasil, kata],
  );
  const memuat = cariDokumen && hasil?.kata !== kata;

  // Pintasan papan ketik global: Ctrl/⌘+K di mana pun, "/" bila tidak sedang mengetik.
  useEffect(() => {
    function tekan(e: KeyboardEvent) {
      const sasaran = e.target as HTMLElement | null;
      const mengetik =
        !!sasaran &&
        (sasaran.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(sasaran.tagName));
      if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        onBukaChange(!buka);
      } else if (e.key === '/' && !mengetik && !buka) {
        e.preventDefault();
        onBukaChange(true);
      }
    }
    window.addEventListener('keydown', tekan);
    return () => window.removeEventListener('keydown', tekan);
  }, [buka, onBukaChange]);

  // Cari dokumen setelah pengguna berhenti mengetik sejenak.
  useEffect(() => {
    if (!cariDokumen) return;
    let berlaku = true;
    const tunda = window.setTimeout(() => {
      ambilApiBerdaftar<HasilDokumen>('/admin/documents', {
        kueri: { halaman: 1, perHalaman: 6, q: kueri.trim() },
      })
        .then((r) => {
          if (berlaku) setHasil({ kata, data: r.data });
        })
        .catch(() => {
          if (berlaku) setHasil({ kata, data: [] });
        });
    }, 220);
    return () => {
      berlaku = false;
      window.clearTimeout(tunda);
    };
  }, [cariDokumen, kata, kueri]);

  const pilihan = useMemo<Pilihan[]>(() => {
    const halaman = menu
      .flatMap((k) => k.butir.map((b) => ({ ...b, grup: k.judul })))
      .filter((b) => cocok(b, kata))
      .map<Pilihan>((b) => ({
        kunci: `h:${b.href}`,
        kelompok: 'Halaman',
        label: b.label,
        keterangan: b.disabled ? (b.disabledReason ?? b.grup) : b.grup,
        href: b.href,
        ikon: b.ikon,
        disabled: b.disabled,
      }));
    const superadmin = peran.includes('SUPERADMIN');
    const aksi = AKSI_CEPAT.filter((a) => a.izin.some((i) => izin.includes(i)) || (a.href === '/admin/dokumen/verifikasi' && bolehDokumen))
      .filter((a) => superadmin || !a.superadminOnly)
      .filter((a) => cocok(a, kata))
      .map<Pilihan>((a) => ({
        kunci: `a:${a.href}`,
        kelompok: 'Aksi cepat',
        label: a.label,
        href: a.href,
        ikon: Zap,
      }));
    // Satu dokumen bisa punya beberapa versi di daftar; cukup disebut sekali.
    const terlihat = new Set<string>();
    const dok = dokumen
      .filter((d) => (terlihat.has(d.id) ? false : (terlihat.add(d.id), true)))
      .map<Pilihan>((d) => ({
        kunci: `d:${d.versionId}`,
        kelompok: 'Dokumen',
        label: d.judul,
        keterangan: `${d.tipe}${d.nomor ? ` · No. ${d.nomor}` : ''} · Versi ${String(d.nomorVersi)}`,
        href: `/admin/dokumen/${d.id}?versionId=${d.versionId}`,
        ikon: FileText,
        tahap: kodeTahapTampil(d.statusWorkflow, d.diganti),
      }));
    return [...aksi, ...halaman, ...dok];
  }, [menu, izin, kata, dokumen, peran, bolehDokumen]);

  // Pilihan aktif kembali ke atas saat mengetik; dijaga tetap dalam jangkauan hasil.
  const aktif = Math.min(aktifMentah, Math.max(pilihan.length - 1, 0));
  useEffect(() => {
    daftar.current
      ?.querySelector<HTMLElement>(`[data-indeks="${String(aktif)}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [aktif]);

  function buka_(p: Pilihan | undefined) {
    if (!p || p.disabled) return;
    onBukaChange(false);
    router.push(p.href);
  }

  function tekanTombol(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setAktif((i) => (pilihan.length ? (i + 1) % pilihan.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setAktif((i) => (pilihan.length ? (i - 1 + pilihan.length) % pilihan.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      buka_(pilihan[aktif]);
    }
  }

  const idDaftar = 'palet-hasil';
  let indeks = -1;
  const kelompok = (['Aksi cepat', 'Halaman', 'Dokumen'] as const)
    .map((nama) => ({ nama, isi: pilihan.filter((p) => p.kelompok === nama) }))
    .filter((k) => k.isi.length > 0);

  return (
    <DialogPrimitive.Root
      open={buka}
      onOpenChange={(b) => {
        onBukaChange(b);
        if (!b) setKueri('');
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="ui-overlay fixed inset-0 z-50 bg-slate-950/30 backdrop-blur-[2px]" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="ui-menu fixed top-[12vh] left-1/2 z-50 flex max-h-[min(34rem,76vh)] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 flex-col overflow-hidden rounded-2xl border border-sekat bg-white shadow-[0_24px_64px_-16px_rgb(28_25_23/0.35)] outline-none"
          data-state="open"
        >
          <DialogPrimitive.Title className="sr-only">Cari di panel</DialogPrimitive.Title>
          <div className="flex items-center gap-3 border-b border-sekat px-4">
            <Search aria-hidden className="size-4.5 shrink-0 text-slate-400" />
            <input
              autoFocus
              role="combobox"
              aria-expanded
              aria-controls={idDaftar}
              aria-activedescendant={pilihan[aktif] ? `palet-${pilihan[aktif].kunci}` : undefined}
              aria-label="Cari halaman, aksi, atau dokumen"
              placeholder={bolehDokumen ? 'Cari halaman, aksi, atau dokumen…' : 'Cari halaman atau aksi…'}
              value={kueri}
              onChange={(e) => {
                setKueri(e.target.value);
                setAktif(0);
              }}
              onKeyDown={tekanTombol}
              className="h-14 min-w-0 flex-1 bg-transparent text-[0.9375rem] text-tinta placeholder:text-slate-400 focus:outline-none"
            />
            {memuat && <LoaderCircle aria-hidden className="size-4 shrink-0 animate-spin text-slate-400" />}
            <kbd className="hidden rounded border border-sekat bg-kanvas px-1.5 font-sans text-[0.6875rem] text-slate-500 sm:inline">
              Esc
            </kbd>
          </div>

          <ul ref={daftar} id={idDaftar} role="listbox" aria-label="Hasil" className="flex-1 overflow-y-auto p-2">
            {kelompok.length === 0 ? (
              <li className="px-3 py-10 text-center text-sm text-slate-500">
                {memuat ? 'Mencari…' : 'Tidak ada yang cocok dengan pencarian ini.'}
              </li>
            ) : (
              kelompok.map((k) => (
                <li key={k.nama} role="presentation" className="pb-1">
                  <p className="px-3 pt-2 pb-1.5 text-xs font-medium text-slate-400">{k.nama}</p>
                  <ul role="group" aria-label={k.nama}>
                    {k.isi.map((p) => {
                      indeks += 1;
                      const i = indeks;
                      const dipilih = i === aktif;
                      const tahap = p.tahap ? LABEL_TAHAP[p.tahap] : undefined;
                      return (
                        <li
                          key={p.kunci}
                          id={`palet-${p.kunci}`}
                          role="option"
                          aria-selected={dipilih}
                          aria-disabled={p.disabled || undefined}
                          data-indeks={i}
                          onMouseMove={() => setAktif(i)}
                          onClick={() => buka_(p)}
                          className={cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm',
                            p.disabled ? 'cursor-not-allowed opacity-55' : 'cursor-pointer',
                            dipilih ? 'bg-kanvas text-tinta' : 'text-slate-700',
                          )}
                        >
                          <span
                            className={cn(
                              'grid size-8 shrink-0 place-items-center rounded-lg border',
                              dipilih
                                ? 'border-institusi-200 bg-white text-institusi-600'
                                : 'border-sekat bg-white text-slate-400',
                            )}
                          >
                            <p.ikon aria-hidden className="size-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">{p.label}</span>
                            {p.keterangan && (
                              <span className="block truncate text-xs text-slate-500">{p.keterangan}</span>
                            )}
                          </span>
                          {tahap && (
                            <span className="hidden shrink-0 text-xs text-slate-500 sm:inline">{tahap.teks}</span>
                          )}
                          {dipilih && <CornerDownLeft aria-hidden className="size-4 shrink-0 text-slate-400" />}
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))
            )}
          </ul>

          <div className="hidden items-center gap-4 border-t border-sekat bg-kanvas/60 px-4 py-2.5 text-xs text-slate-500 sm:flex">
            <span>
              <kbd className="font-sans font-semibold">↑ ↓</kbd> memilih
            </span>
            <span>
              <kbd className="font-sans font-semibold">Enter</kbd> membuka
            </span>
            <span>
              <kbd className="font-sans font-semibold">Esc</kbd> menutup
            </span>
            {bolehDokumen && kata.length < 2 && (
              <span className="ml-auto">Ketik minimal 2 huruf untuk mencari dokumen</span>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
