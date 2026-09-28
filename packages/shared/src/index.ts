/**
 * @jdih/shared — kontrak bersama Portal JDIH ITH Parepare.
 *
 * Paket ini memuat segala sesuatu yang HARUS sama antara peladen (NestJS) dan
 * peramban (Next.js): enumerasi domain, kode izin, definisi peran, bentuk
 * tanggapan API, dan skema validasi Zod.
 *
 * Kaidah yang dipegang: tidak ada tipe domain yang ditulis dua kali. Bila sisi
 * peladen dan sisi peramban perlu mengetahui bentuk data yang sama, bentuk itu
 * dideklarasikan di sini satu kali saja.
 */

export * from './enums.js';
export * from './permissions.js';
export * from './roles.js';
export * from './api.js';
export * from './schemas/common.schema.js';
export * from './schemas/auth.schema.js';
export * from './schemas/dokumen.schema.js';
