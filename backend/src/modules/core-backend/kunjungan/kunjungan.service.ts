import { Injectable } from '@nestjs/common';
import type { RowDataPacket } from 'mysql2/promise';
import { skemaRingkasanKunjungan } from '@jdih/shared';
import { CoreBackendRepository } from '../core-backend.repository.js';

/** Tanggal "YYYY-MM-DD" menurut WITA (Asia/Makassar), zona waktu Parepare. */
export function tanggalWita(waktu: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Makassar',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(waktu);
}

interface BarisRingkasan extends RowDataPacket {
  hariIni: string | number | null;
  bulanIni: string | number | null;
  tahunIni: string | number | null;
  total: string | number | null;
}

/**
 * Penghitung kunjungan portal publik. Hanya jumlah per tanggal yang disimpan;
 * keunikan per peramban per hari dijaga oleh kuki di controller.
 */
@Injectable()
export class KunjunganService {
  constructor(private readonly repo: CoreBackendRepository) {}

  async catat(waktu = new Date()) {
    await this.repo.write(
      this.repo.pool,
      'INSERT INTO kunjungan_harian(tanggal,jumlah) VALUES(?,1) ON DUPLICATE KEY UPDATE jumlah=jumlah+1',
      [tanggalWita(waktu)],
    );
  }

  async ringkasan(waktu = new Date()) {
    const hari = tanggalWita(waktu);
    const [baris] = await this.repo.rows<BarisRingkasan>(
      this.repo.pool,
      `SELECT
         SUM(CASE WHEN tanggal=? THEN jumlah ELSE 0 END) hariIni,
         SUM(CASE WHEN tanggal>=? THEN jumlah ELSE 0 END) bulanIni,
         SUM(CASE WHEN tanggal>=? THEN jumlah ELSE 0 END) tahunIni,
         SUM(jumlah) total
       FROM kunjungan_harian WHERE tanggal<=?`,
      [hari, `${hari.slice(0, 7)}-01`, `${hari.slice(0, 4)}-01-01`, hari],
    );
    const angka = (v: string | number | null | undefined) => Number(v ?? 0);
    return skemaRingkasanKunjungan.parse({
      hariIni: angka(baris?.hariIni),
      bulanIni: angka(baris?.bulanIni),
      tahunIni: angka(baris?.tahunIni),
      total: angka(baris?.total),
    });
  }
}
