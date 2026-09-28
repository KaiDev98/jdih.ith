import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Menggabungkan kelas Tailwind sekaligus menyelesaikan pertentangan di antaranya.
 *
 * Tanpa twMerge, `cn('px-2', 'px-4')` menghasilkan kedua kelas dan yang menang
 * ditentukan urutan pada berkas CSS — bukan urutan penulisan. Dengan twMerge,
 * kelas terakhir yang menang, sebagaimana diharapkan.
 */
export function cn(...masukan: ClassValue[]): string {
  return twMerge(clsx(masukan));
}
