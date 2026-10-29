'use client';

import * as Menu from '@radix-ui/react-dropdown-menu';
import {
  BookOpen,
  Check,
  ChevronDown,
  Files,
  FileSignature,
  FileText,
  ScrollText,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import styles from './pemilih-koleksi-dokumen.module.css';

export type KoleksiDokumen = '' | 'PRODUK_HUKUM' | 'SOP' | 'FORMAT' | 'PERMOHONAN_SK';
const PILIHAN = [
  { nilai: '', label: 'Semua dokumen hukum', ikon: Files },
  { nilai: 'PRODUK_HUKUM', label: 'Produk Hukum', ikon: BookOpen },
  { nilai: 'SOP', label: 'SOP', ikon: ScrollText },
  { nilai: 'FORMAT', label: 'Format Persuratan', ikon: FileText },
  { nilai: 'PERMOHONAN_SK', label: 'SOP Permohonan SK', ikon: FileSignature },
] as const;

export function PemilihKoleksiDokumen({
  value,
  onValueChange,
  superadmin,
}: {
  value: KoleksiDokumen;
  onValueChange: (value: KoleksiDokumen) => void;
  superadmin: boolean;
}) {
  const pilihan = PILIHAN.filter((item) => superadmin || item.nilai !== 'PERMOHONAN_SK');
  const aktif = pilihan.find((item) => item.nilai === value) ?? PILIHAN[0];
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Jenis koleksi: ${aktif.label}`}
          className={styles.trigger}
        >
          <aktif.ikon size={16} strokeWidth={1.7} aria-hidden />
          <span>{aktif.label}</span>
          <ChevronDown size={15} className={styles.chevron} aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={8}
        collisionPadding={12}
        className={styles.content}
        aria-label="Pilih jenis koleksi"
      >
        <Menu.Label className={styles.label}>Tampilkan koleksi</Menu.Label>
        <Menu.RadioGroup
          value={value}
          onValueChange={(next) => {
            const item = pilihan.find((option) => option.nilai === next);
            if (item) onValueChange(item.nilai);
          }}
        >
          {pilihan.map((item) => (
            <Menu.RadioItem key={item.nilai || 'semua'} value={item.nilai} className={styles.item}>
              <item.ikon size={17} strokeWidth={1.7} aria-hidden />
              <span>{item.label}</span>
              <Menu.ItemIndicator className={styles.indicator}>
                <Check size={15} aria-hidden />
              </Menu.ItemIndicator>
            </Menu.RadioItem>
          ))}
        </Menu.RadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
