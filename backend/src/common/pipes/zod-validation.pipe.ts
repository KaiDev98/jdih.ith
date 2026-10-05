import { Body, Injectable, Param, Query, type PipeTransform } from '@nestjs/common';
import type { ButirGalatValidasi } from '@jdih/shared';
import { ZodError, type ZodType } from 'zod';

import { GalatValidasi } from '../exceptions/galat-aplikasi.js';

/**
 * Pipa validasi berbasis Zod.
 *
 * Mengapa Zod, bukan class-validator yang menjadi kelaziman NestJS: skema Zod
 * berada di paket @jdih/shared dan dipakai DUA KALI — di peladen untuk
 * memvalidasi permintaan masuk, dan di peramban untuk memvalidasi formulir
 * sebelum dikirim. Dengan class-validator, aturan yang sama harus ditulis ulang
 * di sisi peramban, dan keduanya akan menyimpang seiring waktu.
 *
 * (nestjs-zod sengaja tidak dipakai: versi terbarunya belum menyatakan dukungan
 * untuk NestJS 12, dan pipa ini hanya berisi beberapa baris.)
 */
@Injectable()
export class PipaValidasiZod<T extends ZodType> implements PipeTransform {
  constructor(private readonly skema: T) {}

  transform(nilai: unknown): unknown {
    const hasil = this.skema.safeParse(nilai);

    if (hasil.success) {
      // Nilai yang dikembalikan adalah hasil penguraian, bukan masukan mentah.
      // Dengan demikian nilai baku, pemangkasan spasi, dan pemaksaan tipe
      // (misalnya "12" menjadi 12) benar-benar sampai ke pengendali.
      return hasil.data;
    }

    throw new GalatValidasi(ubahGalatZod(hasil.error));
  }
}

/** Mengubah galat Zod menjadi daftar butir yang dapat ditempelkan pada ruas formulir. */
export function ubahGalatZod(galat: ZodError): ButirGalatValidasi[] {
  return galat.issues.map((masalah) => ({
    ruas: masalah.path.length > 0 ? masalah.path.join('.') : '(akar)',
    pesan: masalah.message,
  }));
}

/* ──────────────── Pintasan dekorator agar pengendali tetap ringkas ────────── */

/**
 * Memvalidasi badan permintaan.
 *
 * @example
 * ```ts
 * @Post()
 * buat(@BadanZod(skemaBuatDokumen) muatan: MuatanBuatDokumen) { ... }
 * ```
 */
export function BadanZod<T extends ZodType>(skema: T): ParameterDecorator {
  return Body(new PipaValidasiZod(skema));
}

/** Memvalidasi parameter kueri (?halaman=2&urut=terbaru). */
export function KueriZod<T extends ZodType>(skema: T): ParameterDecorator {
  return Query(new PipaValidasiZod(skema));
}

/** Memvalidasi parameter rute (/dokumen/:id). */
export function ParamZod<T extends ZodType>(skema: T): ParameterDecorator {
  return Param(new PipaValidasiZod(skema));
}
