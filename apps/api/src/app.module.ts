import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';

import { konfigurasi, type KonfigurasiApp } from './config/configuration.js';
import { validasiEnv } from './config/env.schema.js';
import { SemuaGalatFilter } from './common/filters/semua-galat.filter.js';
import { BungkusTanggapanInterceptor } from './common/interceptors/bungkus-tanggapan.interceptor.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthModule } from './health/health.module.js';

@Module({
  imports: [
    /* ───────────────────────────── Konfigurasi ───────────────────────────── */
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env'],
      // Peladen menolak menyala bila ada variabel lingkungan yang kurang
      // atau salah bentuk, disertai penyebutan variabel mana yang bermasalah.
      validate: validasiEnv,
      load: [konfigurasi],
    }),

    /* ─────────────────────────────── Pencatatan ──────────────────────────── */
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (kfg: ConfigService<KonfigurasiApp, true>) => {
        const log = kfg.get('log', { infer: true });
        const produksi = kfg.get('aplikasi.produksi', { infer: true });

        return {
          pinoHttp: {
            level: log.taraf,
            // Log dipercantik saat pengembangan; di produksi tetap JSON satu
            // baris agar dapat dibaca pengumpul log.
            transport:
              log.cantik && !produksi
                ? {
                    target: 'pino-pretty',
                    options: {
                      colorize: true,
                      singleLine: true,
                      translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
                      ignore: 'pid,hostname,req.headers,res.headers',
                    },
                  }
                : undefined,
            // Setiap permintaan memperoleh penanda, dan penanda itu ikut pada
            // setiap baris log yang dihasilkannya.
            genReqId: (permintaan, tanggapan) => {
              const dariHulu = permintaan.headers['x-request-id'];
              const id = typeof dariHulu === 'string' ? dariHulu : randomUUID();
              tanggapan.setHeader('X-Request-Id', id);
              return id;
            },
            // Rahasia tidak boleh pernah masuk ke log, sekalipun tarafnya debug.
            redact: {
              paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                'req.body.kataSandi',
                'req.body.kataSandiLama',
                'req.body.ulangiKataSandi',
                'req.body.kode2fa',
                'req.body.token',
                'res.headers["set-cookie"]',
              ],
              censor: '[disamarkan]',
            },
            // Pemeriksaan kesehatan dipanggil sangat sering; mencatatnya hanya
            // akan menenggelamkan baris log yang benar-benar berguna.
            autoLogging: {
              ignore: (permintaan) => {
                const url = permintaan.url ?? '';
                return url.includes('/kesehatan/hidup');
              },
            },
          },
        };
      },
    }),

    /* ──────────────────────── Pembatasan laju permintaan ─────────────────── */
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (kfg: ConfigService<KonfigurasiApp, true>) => {
        const batas = kfg.get('pembatasanLaju', { infer: true });
        return {
          throttlers: [
            {
              name: 'umum',
              ttl: batas.jendelaDetik * 1000,
              limit: batas.batasUmum,
            },
          ],
        };
      },
    }),

    /* ───────────────────────── Tugas terjadwal (cron) ────────────────────── */
    // Menopang tugas pada docs/06 § Tabel 8.6: penerbitan terjadwal, pemutakhiran
    // status keberlakuan, pengakhiran masa akses, agregasi statistik, dan lainnya.
    ScheduleModule.forRoot(),

    /* ─────────────────────────── Modul aplikasi ──────────────────────────── */
    DatabaseModule,
    HealthModule,

    // Modul domain ditambahkan di sini seiring pengembangan.
    // Lihat src/modules/README.md untuk batas tanggung jawab tiap modul.
  ],

  providers: [
    // Pembatasan laju berlaku menyeluruh; rute yang perlu batas berbeda
    // menimpanya dengan @Throttle(), bukan mematikannya.
    { provide: APP_GUARD, useClass: ThrottlerGuard },

    { provide: APP_FILTER, useClass: SemuaGalatFilter },
    { provide: APP_INTERCEPTOR, useClass: BungkusTanggapanInterceptor },
  ],
})
export class AppModule {}
