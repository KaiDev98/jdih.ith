import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthIndicatorService, type HealthIndicatorResult } from '@nestjs/terminus';
import { statfs } from 'node:fs/promises';
import { resolve } from 'node:path';

import type { KonfigurasiApp } from '../config/configuration.js';

/**
 * Penanda kesehatan penyimpanan berkas.
 *
 * Menggantikan DiskHealthIndicator bawaan @nestjs/terminus karena indikator itu
 * MELEMPARKAN galat ketika jalur yang diperiksa tidak ada, sehingga seluruh
 * titik akhir kesehatan membalas 500. Itu perilaku yang salah arah: titik akhir
 * kesehatan justru paling dibutuhkan ketika ada yang tidak beres, dan balasan
 * 500 tanpa rincian tidak memberi tahu apa pun. Indikator ini melaporkan
 * keadaan "down" tanpa mengirim jalur host atau galat OS pada endpoint readiness
 * publik, dan tetap membalas dengan bentuk yang sama.
 */
@Injectable()
export class PenyimpananIndicator {
  /** Ambang pemakaian diska. Di atas ini, unggahan berisiko mulai gagal. */
  private static readonly AMBANG_PEMAKAIAN = 0.9;

  constructor(
    private readonly penanda: HealthIndicatorService,
    private readonly konfigurasi: ConfigService<KonfigurasiApp, true>,
  ) {}

  async periksa(kunci = 'penyimpanan'): Promise<HealthIndicatorResult> {
    const sesi = this.penanda.check(kunci);
    const penyimpanan = this.konfigurasi.get('penyimpanan', { infer: true });

    if (penyimpanan.pengandar !== 'lokal') {
      // Penyimpanan objek diperiksa melalui panggilan API-nya sendiri, bukan statfs.
      return sesi.up({ pengandar: penyimpanan.pengandar, keterangan: 'diperiksa terpisah' });
    }

    const jalur = resolve(penyimpanan.jalurLokal);

    try {
      const info = await statfs(jalur);
      const totalBita = info.blocks * info.bsize;
      const bebasBita = info.bavail * info.bsize;
      const terpakai = totalBita > 0 ? 1 - bebasBita / totalBita : 0;

      return terpakai > PenyimpananIndicator.AMBANG_PEMAKAIAN
        ? sesi.down({})
        : sesi.up({});
    } catch {
      // Readiness is public for monitoring; never reveal host paths or OS errors.
      return sesi.down({});
    }
  }
}
