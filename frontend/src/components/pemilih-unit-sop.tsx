'use client';

import { useRouter } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { PilihanDropdown } from './pilihan-dropdown';

/**
 * Pemilih unit kerja pada panel SOP beranda: memilih satu unit langsung
 * membuka daftar SOP unit tersebut. Jumlah SOP terbit ikut tampil di samping
 * nama unit agar pengunjung tahu unit mana yang sudah memiliki SOP.
 */
export function PemilihUnitSop({
  unit,
}: {
  unit: readonly { href: string; nama: string; jumlah: number | null }[];
}) {
  const router = useRouter();
  return (
    <PilihanDropdown
      id="unit-sop-beranda"
      label="Unit kerja"
      sembunyikanLabel
      ikon={Building2}
      className="w-full sm:w-64"
      opsi={[
        { value: '', label: 'Pilih unit kerja' },
        ...unit.map((u) => ({
          value: u.href,
          label: u.jumlah ? `${u.nama} · ${String(u.jumlah)} SOP` : u.nama,
        })),
      ]}
      onChange={(href) => {
        if (href) router.push(href);
      }}
    />
  );
}
