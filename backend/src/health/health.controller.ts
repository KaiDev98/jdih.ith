import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
  type HealthCheckResult,
} from '@nestjs/terminus';

import { Publik } from '../common/decorators/otorisasi.decorator.js';
import { BasisDataIndicator } from './basis-data.indicator.js';
import { PenyimpananIndicator } from './penyimpanan.indicator.js';

@ApiTags('Kesehatan Sistem')
@Controller('kesehatan')
export class HealthController {
  constructor(
    private readonly kesehatan: HealthCheckService,
    private readonly basisData: BasisDataIndicator,
    private readonly memori: MemoryHealthIndicator,
    private readonly penyimpanan: PenyimpananIndicator,
  ) {}

  /**
   * Pemeriksaan ringan untuk pengimbang beban dan pemantau ketersediaan.
   * Tidak menyentuh basis data agar tetap murah saat dipanggil tiap beberapa detik.
   */
  @Get('hidup')
  @Publik()
  @ApiOperation({ summary: 'Memastikan proses peladen masih hidup' })
  hidup(): { status: string; waktu: string; uptimeDetik: number } {
    return {
      status: 'hidup',
      waktu: new Date().toISOString(),
      uptimeDetik: Math.round(process.uptime()),
    };
  }

  /**
   * Pemeriksaan penuh: menyentuh basis data, memori, dan sisa ruang diska.
   * Dipakai halaman Kesehatan Sistem pada panel administrasi (fitur F-90).
   */
  @Get('siap')
  @Publik()
  @HealthCheck()
  @ApiOperation({ summary: 'Memastikan seluruh ketergantungan siap melayani' })
  siap(): Promise<HealthCheckResult> {
    return this.kesehatan.check([
      () => this.basisData.periksa('basis_data'),
      // Ambang 512 MB: jauh di atas pemakaian wajar, sehingga terlampauinya
      // menandakan kebocoran memori, bukan lalu lintas yang sedang ramai.
      () => this.memori.checkHeap('memori_heap', 512 * 1024 * 1024),
      // Berkas PDF menumpuk seiring waktu; peringatan sebelum diska penuh
      // memberi ruang bertindak sebelum unggahan mulai gagal.
      () => this.penyimpanan.periksa('penyimpanan'),
    ]);
  }
}
