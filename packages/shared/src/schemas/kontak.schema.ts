import { z } from 'zod';

/**
 * Kontak kantor yang tampil di portal publik (footer dan halaman Kontak).
 * Admin dapat menambah, mengubah, dan menghapus butir telepon maupun surel.
 * Alamat kantor tetap dari konfigurasi portal.
 */
export const JENIS_KONTAK = ['TELEPON', 'SUREL'] as const;
export const skemaJenisKontak = z.enum(JENIS_KONTAK);
export type JenisKontak = z.infer<typeof skemaJenisKontak>;

/** Batas jumlah butir agar footer tetap ringkas. */
export const BATAS_BUTIR_KONTAK = 10;

export const skemaTeleponKantor = z
  .string()
  .trim()
  .min(6, 'Nomor telepon terlalu pendek')
  .max(32, 'Nomor telepon terlalu panjang')
  .regex(/^\+?[0-9][0-9 ()-]*[0-9]$/, 'Gunakan angka, spasi, tanda hubung, atau awalan +');

export const skemaSurelKantor = z
  .string()
  .trim()
  .max(254, 'Alamat email terlalu panjang')
  .pipe(z.email('Alamat email tidak valid'));

const skemaLabelKontak = z
  .string()
  .trim()
  .max(100, 'Label terlalu panjang')
  .nullish()
  .transform((nilai) => (nilai?.length ? nilai : null));

/** Muatan tambah/ubah satu butir; validasi nilai mengikuti jenisnya. */
export const skemaSimpanButirKontak = z.discriminatedUnion('jenis', [
  z.strictObject({ jenis: z.literal('TELEPON'), label: skemaLabelKontak, nilai: skemaTeleponKantor }),
  z.strictObject({ jenis: z.literal('SUREL'), label: skemaLabelKontak, nilai: skemaSurelKantor }),
]);
export type SimpanButirKontak = z.input<typeof skemaSimpanButirKontak>;

export const skemaButirKontak = z.strictObject({
  id: z.string(),
  jenis: skemaJenisKontak,
  label: z.string().nullable(),
  nilai: z.string(),
});
export type ButirKontak = z.infer<typeof skemaButirKontak>;

export const skemaKontakKantor = z.strictObject({ butir: z.array(skemaButirKontak) });
export type KontakKantor = z.infer<typeof skemaKontakKantor>;
