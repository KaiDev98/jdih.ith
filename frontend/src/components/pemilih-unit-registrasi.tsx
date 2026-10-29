'use client';

import type { Ref } from 'react';
import * as Menu from '@radix-ui/react-dropdown-menu';
import { Building2, Check, ChevronDown, PenLine } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import styles from './pemilih-unit-registrasi.module.css';

export function PemilihUnitRegistrasi({
  id,
  value,
  units,
  onValueChange,
  onBlur,
  buttonRef,
  invalid,
  describedBy,
}: {
  id: string;
  value: string;
  units: readonly { id: string; nama: string }[];
  onValueChange: (value: string) => void;
  onBlur: () => void;
  buttonRef: Ref<HTMLButtonElement>;
  invalid: boolean;
  describedBy?: string;
}) {
  const label =
    value === 'manual'
      ? 'Unit belum tercantum / lainnya'
      : units.find((unit) => unit.id === value)?.nama;
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          ref={buttonRef}
          id={id}
          type="button"
          value={value}
          onBlur={onBlur}
          data-invalid={invalid}
          aria-describedby={describedBy}
          className={styles.trigger}
        >
          <Building2 size={16} strokeWidth={1.6} aria-hidden />
          <span data-placeholder={!label || undefined}>{label ?? 'Pilih unit kerja'}</span>
          <ChevronDown size={16} className={styles.chevron} aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={7}
        collisionPadding={12}
        className={styles.content}
        aria-label="Pilihan unit kerja"
        onCloseAutoFocus={(event) => {
          const active = document.activeElement;
          // Jangan mengambil fokus kembali bila pengguna sudah mulai mengisi
          // unit manual ketika animasi penutupan menu masih berlangsung.
          if (
            active instanceof HTMLElement &&
            active !== document.body &&
            active !== document.getElementById(id) &&
            !active.closest('[role="menu"]')
          ) {
            event.preventDefault();
          }
        }}
      >
        <Menu.Label className={styles.menuLabel}>Unit kerja ITH</Menu.Label>
        <Menu.RadioGroup
          value={value}
          onValueChange={(next) => {
            if (next === 'manual' || units.some((unit) => unit.id === next)) onValueChange(next);
          }}
        >
          {units.map((unit) => (
            <Menu.RadioItem key={unit.id} value={unit.id} className={styles.item}>
              <Building2 size={16} strokeWidth={1.5} aria-hidden />
              <span>{unit.nama}</span>
              <Menu.ItemIndicator className={styles.indicator}>
                <Check size={15} aria-hidden />
              </Menu.ItemIndicator>
            </Menu.RadioItem>
          ))}
          <Menu.Separator className={styles.separator} />
          <Menu.RadioItem value="manual" className={styles.item}>
            <PenLine size={16} strokeWidth={1.5} aria-hidden />
            <span>Unit belum tercantum / lainnya</span>
            <Menu.ItemIndicator className={styles.indicator}>
              <Check size={15} aria-hidden />
            </Menu.ItemIndicator>
          </Menu.RadioItem>
        </Menu.RadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
