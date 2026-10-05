import { Inject, Injectable } from '@nestjs/common';
import { HealthIndicatorService, type HealthIndicatorResult } from '@nestjs/terminus';

import { BASIS_DATA, KUERI_DENYUT, type BasisData } from '../database/database.module.js';

/**
 * Penanda kesehatan basis data.
 *
 * Sengaja menjalankan kueri nyata (`SELECT 1`), bukan hanya memeriksa apakah
 * objek kolam koneksi ada. Kolam dapat berdiri tanpa masalah sementara peladen
 * basis data sudah mati, dan pemeriksaan yang tidak menyentuh jaringan akan
 * melaporkan "sehat" pada keadaan itu — tepat ketika laporannya paling
 * dibutuhkan untuk benar.
 */
@Injectable()
export class BasisDataIndicator {
  constructor(
    private readonly penanda: HealthIndicatorService,
    @Inject(BASIS_DATA) private readonly db: BasisData,
  ) {}

  async periksa(kunci = 'basis_data'): Promise<HealthIndicatorResult> {
    const sesi = this.penanda.check(kunci);
    const mulai = Date.now();

    try {
      await this.db.execute(KUERI_DENYUT);
      return sesi.up({ waktuTanggapMs: Date.now() - mulai });
    } catch {
      return sesi.down({
        waktuTanggapMs: Date.now() - mulai,
      });
    }
  }
}
