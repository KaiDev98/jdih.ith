'use client';

import { useId, type Ref } from 'react';
import * as Menu from '@radix-ui/react-dropdown-menu';
import { Check, ChevronDown, type LucideIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import styles from './pemilih-isian-panel.module.css';

export function PemilihIsianPanel({
  label,
  id,
  value,
  opsi,
  onValueChange,
  placeholder = 'Pilih',
  disabled,
  required,
  ikon: Ikon,
  title,
  invalid,
  describedBy,
  onBlur,
  buttonRef,
  name,
}: {
  label: string;
  id?: string;
  value: string;
  opsi: readonly { value: string; label: string; disabled?: boolean }[];
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  ikon?: LucideIcon;
  title?: string;
  invalid?: boolean;
  describedBy?: string;
  onBlur?: () => void;
  buttonRef?: Ref<HTMLButtonElement>;
  name?: string;
}) {
  const uid = useId();
  const triggerId = id ?? `isian-${uid}`;
  const labelId = `${triggerId}-label`;
  const selected = opsi.find((option) => option.value === value);
  return (
    <div className={styles.field}>
      <label id={labelId} htmlFor={triggerId}>
        {label}
      </label>
      {name && <input type="hidden" name={name} value={value} disabled={disabled} />}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            id={triggerId}
            ref={buttonRef}
            type="button"
            value={value}
            disabled={disabled}
            aria-labelledby={`${labelId} ${triggerId}-value`}
            data-invalid={invalid || undefined}
            aria-describedby={
              [
                describedBy,
                required ? `${triggerId}-required` : undefined,
                invalid ? `${triggerId}-invalid` : undefined,
              ]
                .filter(Boolean)
                .join(' ') || undefined
            }
            title={title}
            onBlur={onBlur}
            className={styles.trigger}
          >
            {Ikon && <Ikon aria-hidden size={16} strokeWidth={1.7} />}
            <span id={`${triggerId}-value`} data-placeholder={!selected || value === '' || undefined}>
              {selected?.label ?? placeholder}
            </span>
            <ChevronDown aria-hidden size={16} className={styles.chevron} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          sideOffset={7}
          collisionPadding={12}
          className={styles.content}
          aria-label={label}
        >
          <Menu.RadioGroup
            className={styles.options}
            value={value}
            onValueChange={(next) => {
              if (opsi.some((option) => option.value === next && !option.disabled))
                onValueChange(next);
            }}
          >
            {opsi.map((option) => (
              <Menu.RadioItem
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className={styles.item}
              >
                <span>{option.label}</span>
                <Menu.ItemIndicator className={styles.indicator}>
                  <Check aria-hidden size={15} />
                </Menu.ItemIndicator>
              </Menu.RadioItem>
            ))}
          </Menu.RadioGroup>
          {!opsi.length && <p className={styles.empty}>Belum ada pilihan tersedia.</p>}
        </DropdownMenuContent>
      </DropdownMenu>
      {required && (
        <span id={`${triggerId}-required`} className="sr-only">
          Wajib diisi.
        </span>
      )}
      {invalid && (
        <span id={`${triggerId}-invalid`} className="sr-only">
          Pilihan belum valid.
        </span>
      )}
    </div>
  );
}
