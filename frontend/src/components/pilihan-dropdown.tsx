'use client';

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface OpsiPilihan {
  value: string;
  label: string;
}

const berlanggananKosong = () => () => {};

/** Jarak panel dari tombol, dan jarak minimum panel dari tepi layar. */
const CELAH = 6;
const TEPI = 8;

/**
 * Pilihan dropdown pengganti `<select>` bawaan, agar daftar pilihannya dapat
 * muncul dan hilang dengan animasi yang sama seperti dropdown navigasi.
 *
 * Mengikuti pola "select-only combobox" (WAI-ARIA APG): fokus tetap di tombol,
 * panah atas/bawah, Home/End, dan huruf awal memindahkan sorotan; Enter/Spasi
 * memilih; Escape atau Tab menutup. Panel dirender di `document.body` dengan
 * posisi tetap supaya tidak terpotong wadah yang `overflow: hidden` (mis. hero
 * beranda), dan membuka ke atas bila ruang di bawah tidak cukup. Bila diberi
 * `name`, nilainya ikut terkirim bersama formulir lewat masukan tersembunyi.
 */
export function PilihanDropdown({
  label,
  opsi,
  value,
  defaultValue = '',
  onChange,
  name,
  id,
  ikon: Ikon,
  varian = 'kotak',
  sembunyikanLabel = false,
  className,
}: {
  label: string;
  opsi: readonly OpsiPilihan[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  name?: string;
  id?: string;
  ikon?: LucideIcon;
  /** `kotak`: kotak putih bergaris (panel penyaring). `pil`: pil kaca di atas hero. */
  varian?: 'kotak' | 'pil';
  sembunyikanLabel?: boolean;
  className?: string;
}) {
  const idAcak = useId();
  const idTombol = id ?? `pilihan-${idAcak}`;
  const idLabel = `${idTombol}-label`;
  const idDaftar = `${idTombol}-daftar`;
  const idOpsi = (i: number) => `${idTombol}-opsi-${i}`;

  const [nilaiSendiri, setNilaiSendiri] = useState(defaultValue);
  const nilai = value ?? nilaiSendiri;
  const indeksTerpilih = opsi.findIndex((o) => o.value === nilai);
  const terpilih = opsi[indeksTerpilih];

  const [buka, setBuka] = useState(false);
  const [aktif, setAktif] = useState(-1);
  const [posisi, setPosisi] = useState<React.CSSProperties>({});
  const [sisi, setSisi] = useState<'bawah' | 'atas'>('bawah');
  const tombol = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLUListElement>(null);
  const ketikan = useRef({ teks: '', waktu: 0 });

  // Panel dirender lewat portal ke document.body, yang baru ada di peramban.
  const terpasang = useSyncExternalStore(
    berlanggananKosong,
    () => true,
    () => false,
  );

  const hitungPosisi = useCallback(() => {
    const t = tombol.current;
    const p = panel.current;
    if (!t || !p) return;
    const r = t.getBoundingClientRect();
    const tinggi = p.offsetHeight;
    const lebar = Math.max(p.offsetWidth, r.width);
    const ruangBawah = window.innerHeight - r.bottom;
    const keAtas = ruangBawah < tinggi + CELAH + TEPI && r.top > ruangBawah;
    const kiri = Math.max(TEPI, Math.min(r.left, window.innerWidth - lebar - TEPI));
    setSisi(keAtas ? 'atas' : 'bawah');
    setPosisi({
      left: kiri,
      minWidth: r.width,
      ...(keAtas ? { bottom: window.innerHeight - r.top + CELAH } : { top: r.bottom + CELAH }),
    });
  }, []);

  useLayoutEffect(() => {
    if (buka) hitungPosisi();
  }, [buka, hitungPosisi]);

  // Selama terbuka: ikuti tombol saat halaman/wadah digulir atau layar berubah,
  // dan tutup bila mengeklik di luar tombol maupun panel.
  useEffect(() => {
    if (!buka) return;
    let bingkai = 0;
    const ikuti = () => {
      cancelAnimationFrame(bingkai);
      bingkai = requestAnimationFrame(hitungPosisi);
    };
    const klikLuar = (e: MouseEvent) => {
      const sasaran = e.target as Node;
      if (!tombol.current?.contains(sasaran) && !panel.current?.contains(sasaran)) setBuka(false);
    };
    window.addEventListener('scroll', ikuti, true);
    window.addEventListener('resize', ikuti);
    document.addEventListener('mousedown', klikLuar);
    return () => {
      cancelAnimationFrame(bingkai);
      window.removeEventListener('scroll', ikuti, true);
      window.removeEventListener('resize', ikuti);
      document.removeEventListener('mousedown', klikLuar);
    };
  }, [buka, hitungPosisi]);

  // Butir yang disorot papan ketik selalu terlihat di dalam panel yang bergulir.
  useEffect(() => {
    if (buka && aktif >= 0)
      document.getElementById(idOpsi(aktif))?.scrollIntoView?.({ block: 'nearest' });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- idOpsi turunan idTombol yang tetap
  }, [buka, aktif]);

  function bukaPanel(sorot = indeksTerpilih >= 0 ? indeksTerpilih : 0) {
    setAktif(sorot);
    setBuka(true);
  }
  function pilih(i: number) {
    const o = opsi[i];
    if (!o) return;
    if (value === undefined) setNilaiSendiri(o.value);
    if (o.value !== nilai) onChange?.(o.value);
    setBuka(false);
    tombol.current?.focus();
  }
  function cariHuruf(huruf: string) {
    const sekarang = Date.now();
    const k = ketikan.current;
    k.teks = sekarang - k.waktu > 600 ? huruf : k.teks + huruf;
    k.waktu = sekarang;
    const cocok = (o: OpsiPilihan) => o.label.toLowerCase().startsWith(k.teks.toLowerCase());
    const mulai = k.teks.length === 1 ? aktif + 1 : Math.max(aktif, 0);
    const urutan = [...opsi.slice(mulai), ...opsi.slice(0, mulai)];
    const ketemu = urutan.find(cocok);
    if (ketemu) {
      const i = opsi.indexOf(ketemu);
      if (buka) setAktif(i);
      else bukaPanel(i);
    }
  }

  function tekanTombol(e: React.KeyboardEvent<HTMLButtonElement>) {
    const akhir = opsi.length - 1;
    if (!buka) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        bukaPanel();
      } else if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        bukaPanel(e.key === 'Home' ? 0 : akhir);
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        cariHuruf(e.key);
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setAktif((i) => Math.min(i + 1, akhir));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setAktif((i) => Math.max(i - 1, 0));
        break;
      case 'Home':
      case 'PageUp':
        e.preventDefault();
        setAktif(0);
        break;
      case 'End':
      case 'PageDown':
        e.preventDefault();
        setAktif(akhir);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        pilih(aktif);
        break;
      case 'Escape':
        e.preventDefault();
        setBuka(false);
        break;
      case 'Tab':
        setBuka(false);
        break;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) cariHuruf(e.key);
    }
  }

  const pil = varian === 'pil';

  return (
    <div className={cn('relative min-w-0', className)}>
      <span
        id={idLabel}
        className={
          sembunyikanLabel
            ? 'sr-only'
            : 'mb-2 block text-xs font-semibold tracking-wide text-slate-500 uppercase'
        }
      >
        {label}
      </span>
      {name && <input type="hidden" name={name} value={nilai} />}
      <span className="relative block">
        {Ikon && (
          <Ikon
            aria-hidden
            className={cn(
              'pointer-events-none absolute top-1/2 size-4 -translate-y-1/2',
              pil ? 'left-4 text-gigi-100' : 'left-3 text-slate-400',
            )}
          />
        )}
        <button
          ref={tombol}
          id={idTombol}
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={buka}
          aria-controls={idDaftar}
          aria-labelledby={idLabel}
          aria-activedescendant={buka && aktif >= 0 ? idOpsi(aktif) : undefined}
          onClick={() => (buka ? setBuka(false) : bukaPanel())}
          onKeyDown={tekanTombol}
          className={cn(
            'pemicu-pilihan block w-full cursor-pointer truncate text-left text-sm outline-none',
            pil
              ? cn(
                  'min-h-11 rounded-full border pr-10 font-semibold text-white sm:min-w-52',
                  Ikon ? 'pl-10' : 'pl-4',
                  buka
                    ? 'border-white/60 bg-white/25'
                    : 'border-white/30 bg-white/15 hover:border-white/45 hover:bg-white/25',
                  'focus-visible:ring-3 focus-visible:ring-white/40',
                )
              : cn(
                  'h-10 rounded-lg border bg-white pr-9 text-tinta',
                  Ikon ? 'pl-9' : 'pl-3',
                  buka
                    ? 'border-institusi-500 ring-3 ring-institusi-500/20'
                    : 'border-slate-200 hover:border-slate-300',
                  'focus-visible:border-institusi-500 focus-visible:ring-3 focus-visible:ring-institusi-500/20',
                ),
          )}
        >
          {terpilih?.label ?? opsi[0]?.label ?? ''}
        </button>
        <ChevronDown
          aria-hidden
          className={cn(
            'pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 transition-transform duration-200 ease-out',
            pil ? 'right-4 text-white/80' : 'right-3 text-slate-400',
            buka && 'rotate-180',
          )}
        />
      </span>
      {terpasang &&
        createPortal(
          <ul
            ref={panel}
            id={idDaftar}
            role="listbox"
            aria-labelledby={idLabel}
            tabIndex={-1}
            data-state={buka ? 'open' : 'closed'}
            data-sisi={sisi}
            aria-hidden={!buka}
            inert={!buka}
            style={posisi}
            className="menu-mengambang panel-mengambang gulir-hasil fixed z-[60] max-h-72 overflow-y-auto p-1.5"
          >
            {opsi.map((o, i) => {
              const dipilih = i === indeksTerpilih;
              return (
                <li
                  key={o.value || '__kosong'}
                  id={idOpsi(i)}
                  role="option"
                  aria-selected={dipilih}
                  data-value={o.value}
                  onMouseMove={() => aktif !== i && setAktif(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pilih(i)}
                  className={cn(
                    'flex cursor-pointer items-center justify-between gap-4 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors duration-100',
                    dipilih ? 'font-semibold text-institusi-800' : 'text-slate-700',
                    i === aktif && (dipilih ? 'bg-institusi-50' : 'bg-slate-100 text-tinta'),
                  )}
                >
                  {o.label}
                  <Check
                    aria-hidden
                    className={cn('size-4 shrink-0 text-institusi-600', !dipilih && 'invisible')}
                  />
                </li>
              );
            })}
          </ul>,
          document.body,
        )}
    </div>
  );
}
