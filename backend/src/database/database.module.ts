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
import type { Pool, RowDataPacket } from 'mysql2/promise';
import mysql from 'mysql2';

import type { KonfigurasiApp } from '../config/configuration.js';
import * as skema from './v2/schema.js';

/** Token penyuntikan untuk instans Drizzle. */
export const BASIS_DATA = 'BASIS_DATA';

/** Token penyuntikan untuk kolam koneksi mentah, bila diperlukan kueri khusus. */
export const KOLAM_KONEKSI = 'KOLAM_KONEKSI';

/** Identity V2 bindings only; legacy schema remains separate and inactive. */
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

/** SQL-first V2 connection. No migration/reset/generation is executed at startup. */
@Global()
@Module({
  providers: [
    {
      provide: KOLAM_KONEKSI,
      inject: [ConfigService],
      useFactory: async (konfigurasi: ConfigService<KonfigurasiApp, true>): Promise<Pool> => {
        const db = konfigurasi.get('basisData', { infer: true });

        const rawPool = mysql.createPool({
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
          charset: 'utf8mb4_0900_ai_ci',
          // Angka besar dikembalikan sebagai teks agar tidak kehilangan presisi.
          supportBigNumbers: true,
          bigNumberStrings: true,
          // DATE dan DATETIME dikembalikan sebagai teks, bukan objek Date, supaya
          // tidak ada penafsiran zona waktu yang tidak diminta di tengah jalan.
          dateStrings: ['DATE', 'DATETIME'],
          enableKeepAlive: true,
          // Pernyataan majemuk dimatikan: inilah pertahanan lapis kedua terhadap
          // penyuntikan SQL bila ada satu kueri yang lupa diparameterkan.
          multipleStatements: false,
        });
        rawPool.on('connection', (connection) => {
          connection.query("SET time_zone = '+00:00'", (error) => {
            if (error) connection.destroy();
          });
        });
        const pool = rawPool.promise();
        try {
          const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT VERSION() version, DATABASE() db',
          );
          if (
            !String(rows[0]?.version).startsWith('8.4.') ||
            rows[0]?.db !== db.nama ||
            !/^jdih_ith_v2_(dev|test[a-z0-9_]*)$/.test(db.nama)
          )
            throw new Error('Identity requires isolated MySQL 8.4 V2 database');
          return pool;
        } catch {
          await pool.end();
          throw new Error('V2 database verification failed');
        }
      },
    },
    {
      provide: BASIS_DATA,
      inject: [KOLAM_KONEKSI],
      useFactory: (kolam: Pool): BasisData =>
        drizzle(kolam, { schema: skema, mode: 'default', logger: false }),
    },
    PenutupKolam,
  ],
  exports: [BASIS_DATA, KOLAM_KONEKSI],
})
export class DatabaseModule {}

/** Pernyataan uji hidup paling murah yang tetap benar-benar menyentuh peladen. */
export const KUERI_DENYUT = sql`SELECT 1`;
