import 'reflect-metadata';

import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

import { AppModule } from './app.module.js';
import type { KonfigurasiApp } from './config/configuration.js';

async function nyalakan(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // Log penyalaan ditahan sampai pencatat pino siap, agar seluruh baris log
    // memakai satu format yang sama sejak awal.
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));

  const kfg = app.get(ConfigService<KonfigurasiApp, true>);
  const aplikasi = kfg.get('aplikasi', { infer: true });
  const penyimpanan = kfg.get('penyimpanan', { infer: true });

  /* ─────────────────────── Direktori penyimpanan berkas ─────────────────── */

  // Dibuat di sini, bukan diserahkan ke pemakai untuk membuat manual. Unggahan
  // pertama yang gagal hanya karena direktorinya belum ada adalah kegagalan yang
  // sepenuhnya dapat dicegah, dan pesan galatnya jarang menunjuk sebab itu.
  if (penyimpanan.pengandar === 'lokal') {
    const jalur = resolve(penyimpanan.jalurLokal);
    await mkdir(jalur, { recursive: true });
  }

  /* ──────────────────────────────── Keamanan ────────────────────────────── */

  app.use(
    helmet({
      // API hanya mengembalikan JSON dan berkas; tidak ada HTML yang dirender
      // di sini, sehingga CSP diurus oleh aplikasi Next.js.
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.use(cookieParser(kfg.get('autentikasi.rahasiaKuki', { infer: true })));
  app.use(compression());

  app.enableCors({
    origin: aplikasi.asalCorsDiizinkan,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    exposedHeaders: ['Content-Disposition', 'X-Request-Id'],
    maxAge: 86_400,
  });

  // Peladen berada di belakang Nginx pada penggelaran nyata; tanpa ini, alamat
  // IP yang tercatat pada log keamanan dan dipakai pembatasan laju akan selalu
  // berupa alamat proksi, bukan alamat pengguna.
  app.set('trust proxy', 1);

  // Membuang tajuk yang menyebutkan kerangka kerja yang dipakai.
  app.disable('x-powered-by');

  /* ─────────────────────────────── Perutean ─────────────────────────────── */

  app.setGlobalPrefix(aplikasi.prefiks);

  // Batas ukuran badan permintaan. Unggahan berkas memakai jalur multipart
  // tersendiri, jadi batas JSON dapat dibuat ketat.
  app.useBodyParser('json', { limit: '1mb' });
  app.useBodyParser('urlencoded', { limit: '1mb', extended: true });

  /* ───────────────────────── Dokumentasi OpenAPI ────────────────────────── */

  if (aplikasi.swaggerAktif) {
    const dokumen = new DocumentBuilder()
      .setTitle('API Portal JDIH ITH Parepare')
      .setDescription(
        'Jaringan Dokumentasi dan Informasi Hukum — Institut Teknologi ' +
          'Bacharuddin Jusuf Habibie, Parepare.\n\n' +
          'Otorisasi berjalan dalam tiga lapisan: izin fungsional, cakupan unit ' +
          'kerja, dan tingkat akses dokumen. Rincian pada docs/05-role-permission.md.',
      )
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'token-akses')
      .addTag('Kesehatan Sistem', 'Pemeriksaan ketersediaan peladen dan ketergantungannya')
      .addServer(`http://localhost:${aplikasi.port}`, 'Pengembangan lokal')
      .build();

    SwaggerModule.setup(
      `${aplikasi.prefiks}/docs`,
      app,
      SwaggerModule.createDocument(app, dokumen),
      {
        jsonDocumentUrl: `${aplikasi.prefiks}/docs/openapi.json`,
        swaggerOptions: { persistAuthorization: true, tagsSorter: 'alpha' },
      },
    );
  }

  /* ─────────────────────── Penghentian yang tertib ──────────────────────── */

  // Menutup kolam koneksi dan menyelesaikan permintaan yang sedang berjalan
  // sebelum proses benar-benar berhenti.
  app.enableShutdownHooks();

  await app.listen(aplikasi.port, aplikasi.host);

  const log = app.get(Logger);
  log.log(`Peladen API berjalan pada http://localhost:${aplikasi.port}/${aplikasi.prefiks}`);
  log.log(`Lingkungan       : ${aplikasi.lingkungan}`);
  log.log(`Pengandar simpan : ${penyimpanan.pengandar}`);
  log.log(`Pengandar cari   : ${kfg.get('pencarian.pengandar', { infer: true })}`);
  if (aplikasi.swaggerAktif) {
    log.log(`Dokumentasi API  : http://localhost:${aplikasi.port}/${aplikasi.prefiks}/docs`);
  }
}

void nyalakan();
