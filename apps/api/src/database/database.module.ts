import {
  Global,
  Inject,
  Injectable,
  Logger,
  Module,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, type MySql2Database } from 'drizzle-orm/mysql2';
import { sql } from 'drizzle-orm';
import mysql, { type Pool } from 'mysql2/promise';

import type { KonfigurasiApp } from '../config/configuration.js';
import * as skema from './schema/index.js';

/** Token penyuntikan untuk instans Drizzle. */
export const BASIS_DATA = 'BASIS_DATA';

/** Token penyuntikan untuk kolam koneksi mentah, bila diperlukan kueri khusus. */
export const KOLAM_KONEKSI = 'KOLAM_KONEKSI';

/**
 * Tipe basis data yang dipakai seluruh repositori.
 *
 * Catatan: `typeof skema` kosong sampai `npm run db:pull` dijalankan. Setelah
 * introspeksi, seluruh 50 tabel tersedia lengkap dengan tipenya di sini.
 */
export type BasisData = MySql2Database<typeof skema>;

@Injectable()
class PenutupKolam implements OnApplicationShutdown {
  private readonly log = new Logger('BasisData');

  constructor(@Inject(KOLAM_KONEKSI) private readonly kolam: Pool) {}

  async onApplicationShutdown(): Promise<void> {
    await this.kolam.end();
    this.log.log('Kolam koneksi basis data ditutup.');
  }
}

/**
 * Modul basis data.
 *
 * Mengapa Drizzle, bukan Prisma atau TypeORM: skema Portal JDIH ITH sudah ada
 * sebagai DDL yang teruji (database/jdih_ith_schema.sql) dan menyandarkan
 * sebagian kebenarannya pada fitur yang tidak ditangani baik oleh pemeta objek
 * lain — kolom terbangkit (`nomor_normal`, `kunci_menunggu`), pemalsuan
 * partial unique index, pemicu, dan tampilan (view). Drizzle bersifat
 * SQL-first: berkas SQL tetap menjadi sumber kebenaran, dan tipe TypeScript
 * diturunkan darinya melalui introspeksi. Rujukan: docs/04 § D.0.1.
 */
@Global()
@Module({
  providers: [
    {
      provide: KOLAM_KONEKSI,
      inject: [ConfigService],
      useFactory: (konfigurasi: ConfigService<KonfigurasiApp, true>): Pool => {
        const db = konfigurasi.get('basisData', { infer: true });

        return mysql.createPool({
          host: db.host,
          port: db.port,
          user: db.pengguna,
          password: db.kataSandi,
          database: db.nama,
          connectionLimit: db.batasKolam,
          waitForConnections: true,
          queueLimit: 0,
          // Seluruh DATETIME disimpan dalam UTC; koneksi tidak boleh menggeser nilainya.
          timezone: db.zonaWaktu,
          charset: 'utf8mb4_unicode_ci',
          // Angka besar dikembalikan sebagai teks agar tidak kehilangan presisi.
          supportBigNumbers: true,
          bigNumberStrings: false,
          // DATE dan DATETIME dikembalikan sebagai teks, bukan objek Date, supaya
          // tidak ada penafsiran zona waktu yang tidak diminta di tengah jalan.
          dateStrings: ['DATE', 'DATETIME'],
          enableKeepAlive: true,
          // Pernyataan majemuk dimatikan: inilah pertahanan lapis kedua terhadap
          // penyuntikan SQL bila ada satu kueri yang lupa diparameterkan.
          multipleStatements: false,
        });
      },
    },
    {
      provide: BASIS_DATA,
      inject: [KOLAM_KONEKSI, ConfigService],
      useFactory: (kolam: Pool, konfigurasi: ConfigService<KonfigurasiApp, true>): BasisData => {
        const catatKueri = konfigurasi.get('basisData.catatKueri', { infer: true });
        const log = new Logger('Kueri');

        return drizzle(kolam, {
          schema: skema,
          mode: 'default',
          logger: catatKueri
            ? {
                logQuery(kueri, parameter) {
                  log.debug(`${kueri} -- ${JSON.stringify(parameter)}`);
                },
              }
            : false,
        });
      },
    },
    PenutupKolam,
  ],
  exports: [BASIS_DATA, KOLAM_KONEKSI],
})
export class DatabaseModule {}

/** Pernyataan uji hidup paling murah yang tetap benar-benar menyentuh peladen. */
export const KUERI_DENYUT = sql`SELECT 1`;
