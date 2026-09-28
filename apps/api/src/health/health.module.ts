import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { BasisDataIndicator } from './basis-data.indicator.js';
import { HealthController } from './health.controller.js';
import { PenyimpananIndicator } from './penyimpanan.indicator.js';

@Module({
  imports: [
    TerminusModule.forRoot({
      // Titik akhir kesehatan mengembalikan 200 saat sehat dan 503 saat tidak,
      // agar pengimbang beban dan pemantau tidak perlu membaca badan tanggapan.
      errorLogStyle: 'pretty',
      gracefulShutdownTimeoutMs: 5_000,
    }),
  ],
  controllers: [HealthController],
  providers: [BasisDataIndicator, PenyimpananIndicator],
})
export class HealthModule {}
