import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageService, LocalStorageDriver } from './storage.service.js';

@Module({
  providers: [
    {
      provide: StorageService,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const driver = config.get<string>('penyimpanan.pengandar');
        if (driver !== 'lokal')
          throw new Error('Storage driver S3/MinIO belum diimplementasikan pada Phase 4');
        return new LocalStorageDriver(config as never);
      },
    },
  ],
  exports: [StorageService],
})
export class StorageModule {}
