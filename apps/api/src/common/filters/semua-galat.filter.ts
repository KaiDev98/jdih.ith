import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import { KODE_GALAT, type KodeGalat, type TanggapanGalat } from '@jdih/shared';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { ZodError } from 'zod';

import { GalatAplikasi } from '../exceptions/galat-aplikasi.js';
import { ubahGalatZod } from '../pipes/zod-validation.pipe.js';

/**
 * Penyaring galat global.
 *
 * Seluruh galat keluar dari peladen dalam satu bentuk yang sama, sehingga sisi
 * peramban menanganinya di satu tempat saja. Dua hal yang dijaga ketat:
 *
 *  1. Galat tak terduga TIDAK pernah membocorkan pesan aslinya ke pengguna.
 *     Pesan asli dan jejak tumpukan hanya masuk ke log peladen; pengguna
 *     menerima pesan umum beserta penanda korelasi.
 *
 *  2. Setiap tanggapan galat memuat `jejak` — satu penanda acak yang juga
 *     tercatat pada log. Ketika pengguna melaporkan galat, penanda itu langsung
 *     menunjuk ke baris log yang tepat tanpa perlu menebak waktu kejadian.
 */
@Catch()
export class SemuaGalatFilter implements ExceptionFilter {
  private readonly log = new Logger('Galat');

  catch(galat: unknown, host: ArgumentsHost): void {
    const konteks = host.switchToHttp();
    const tanggapan = konteks.getResponse<Response>();
    const permintaan = konteks.getRequest<Request>();
    const jejak = randomUUID();

    const { status, badan, catatSebagaiGalat } = this.petakan(galat, jejak);

    if (catatSebagaiGalat) {
      this.log.error(
        `[${jejak}] ${permintaan.method} ${permintaan.originalUrl} -> ${status}: ` +
          `${this.pesanAsli(galat)}`,
        galat instanceof Error ? galat.stack : undefined,
      );
    } else {
      this.log.warn(
        `[${jejak}] ${permintaan.method} ${permintaan.originalUrl} -> ${status}: ` +
          `${badan.galat.kode}`,
      );
    }

    tanggapan.status(status).json(badan);
  }

  private petakan(
    galat: unknown,
    jejak: string,
  ): { status: number; badan: TanggapanGalat; catatSebagaiGalat: boolean } {
    /* Galat domain — sudah memuat kode dan status yang tepat. */
    if (galat instanceof GalatAplikasi) {
      return {
        status: galat.getStatus(),
        badan: {
          sukses: false,
          galat: {
            kode: galat.kode,
            pesan: galat.message,
            ...(galat.butir ? { butir: galat.butir } : {}),
            ...(galat.rincian ? { rincian: galat.rincian } : {}),
          },
          jejak,
        },
        catatSebagaiGalat: galat.getStatus() >= 500,
      };
    }

    /* Galat Zod yang lolos dari pipa, misalnya dari validasi di dalam layanan. */
    if (galat instanceof ZodError) {
      return {
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        badan: {
          sukses: false,
          galat: {
            kode: KODE_GALAT.VALIDASI_GAGAL,
            pesan: 'Data yang dikirim tidak lolos pemeriksaan.',
            butir: ubahGalatZod(galat),
          },
          jejak,
        },
        catatSebagaiGalat: false,
      };
    }

    /* Galat HTTP bawaan NestJS, misalnya dari penjaga rute atau 404 rute. */
    if (galat instanceof HttpException) {
      const status = galat.getStatus();
      return {
        status,
        badan: {
          sukses: false,
          galat: {
            kode: this.kodeDariStatus(status),
            pesan: this.pesanHttp(galat),
          },
          jejak,
        },
        catatSebagaiGalat: status >= 500,
      };
    }

    /* Segala hal lain: bug, kegagalan basis data, kehabisan memori. */
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      badan: {
        sukses: false,
        galat: {
          kode: KODE_GALAT.GALAT_PELADEN,
          pesan:
            'Terjadi kegagalan pada peladen. Sampaikan penanda jejak berikut kepada ' +
            'pengelola sistem agar dapat ditelusuri.',
        },
        jejak,
      },
      catatSebagaiGalat: true,
    };
  }

  /**
   * Pemetaan status HTTP ke kode galat aplikasi.
   *
   * Ditulis sebagai peta, bukan switch, karena `getStatus()` mengembalikan
   * `number` sementara HttpStatus adalah enum — membandingkan keduanya di dalam
   * switch adalah perbandingan lintas tipe yang sah secara runtime tetapi
   * rapuh secara tipe.
   */
  private static readonly PETA_KODE: ReadonlyMap<number, KodeGalat> = new Map([
    [HttpStatus.UNAUTHORIZED, KODE_GALAT.TIDAK_TERAUTENTIKASI],
    [HttpStatus.FORBIDDEN, KODE_GALAT.IZIN_TIDAK_CUKUP],
    [HttpStatus.NOT_FOUND, KODE_GALAT.TIDAK_DITEMUKAN],
    [HttpStatus.CONFLICT, KODE_GALAT.KONFLIK],
    [HttpStatus.UNPROCESSABLE_ENTITY, KODE_GALAT.VALIDASI_GAGAL],
    [HttpStatus.BAD_REQUEST, KODE_GALAT.VALIDASI_GAGAL],
    [HttpStatus.TOO_MANY_REQUESTS, KODE_GALAT.TERLALU_BANYAK_PERMINTAAN],
  ]);

  private kodeDariStatus(status: number): KodeGalat {
    return SemuaGalatFilter.PETA_KODE.get(status) ?? KODE_GALAT.GALAT_PELADEN;
  }

  /** Mengambil pesan dari HttpException tanpa membocorkan struktur dalamnya. */
  private pesanHttp(galat: HttpException): string {
    const isi: string | object = galat.getResponse();
    if (typeof isi === 'string') return isi;
    if ('message' in isi) {
      const pesan: unknown = isi.message;
      if (typeof pesan === 'string') return pesan;
      if (Array.isArray(pesan)) return pesan.join('; ');
    }
    return galat.message;
  }

  private pesanAsli(galat: unknown): string {
    if (galat instanceof Error) return `${galat.name}: ${galat.message}`;
    return String(galat);
  }
}
