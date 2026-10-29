import { Library } from 'lucide-react';
import { cn } from '@/lib/cn';
import { tampilanJenis } from '@/lib/tampilan-jenis';
import styles from './lambang-produk-hukum.module.css';

/** Lambang dekoratif memakai identitas jenis yang sama dengan menu dan kartu. */
export function LambangProdukHukum({ kode, nama }: { kode?: string; nama?: string }) {
  const { ikon: Ikon, kotak, macam } = tampilanJenis(kode, nama);
  const Simbol = kode || nama ? Ikon : Library;

  return (
    <span aria-hidden className={cn(styles.lambang, 'masuk-ringan tunda-1')} data-jenis={macam ?? 'semua'}>
      <span className={cn(styles.bidang, kotak, 'ikon-jenis-masuk')}>
        <Simbol className={styles.simbol} />
      </span>
    </span>
  );
}
