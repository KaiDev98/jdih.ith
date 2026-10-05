import { z } from 'zod';

/**
 * Nomor telepon kantor yang tampil di portal publik. Hanya nomor telepon yang
 * dapat diubah Admin; alamat dan surel tetap dari konfigurasi portal.
 */
export const skemaTeleponKantor = z
  .string()
  .trim()
  .min(6, 'Nomor telepon terlalu pendek')
  .max(32, 'Nomor telepon terlalu panjang')
  .regex(/^\+?[0-9][0-9 ()-]*[0-9]$/, 'Gunakan angka, spasi, tanda hubung, atau awalan +');

export const skemaUbahKontakKantor = z.strictObject({ telepon: skemaTeleponKantor });
export type UbahKontakKantor = z.infer<typeof skemaUbahKontakKantor>;

export const skemaKontakKantor = z.strictObject({ telepon: z.string() });
export type KontakKantor = z.infer<typeof skemaKontakKantor>;
