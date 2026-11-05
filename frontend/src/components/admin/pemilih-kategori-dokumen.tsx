'use client';

import type { PilihanKategoriDokumen } from '@jdih/shared';
import { Building2 } from 'lucide-react';
import { PemilihIsianPanel } from './pemilih-isian-panel';

export function PemilihKategoriDokumen({
  id,
  value,
  categories,
  onValueChange,
}: {
  id: string;
  value: string;
  categories: readonly PilihanKategoriDokumen[];
  onValueChange: (value: string) => void;
}) {
  return (
    <PemilihIsianPanel
      label="Kategori (opsional)"
      id={id}
      value={value}
      onValueChange={onValueChange}
      ikon={Building2}
      placeholder="Pilih kategori"
      opsi={[
        { value: '', label: 'Pilih kategori' },
        ...categories
          .filter((category) => category.bolehPilih !== false && category.aktif !== false)
          .map((category) => ({ value: category.id, label: category.nama })),
      ]}
    />
  );
}
