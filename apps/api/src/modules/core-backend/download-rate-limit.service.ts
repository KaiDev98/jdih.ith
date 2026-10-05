import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { KonfigurasiApp } from '../../config/configuration.js';

const JENDELA_UNDUH_MS = 60 * 60 * 1000;

interface CatatanBatas {
  mulai: number;
  jumlah: number;
}

/** In-memory fixed-window limiter for authorized document/template downloads. */
@Injectable()
export class DownloadRateLimitService {
  private readonly catatan = new Map<string, CatatanBatas>();
  private operasi = 0;

  constructor(private readonly config: ConfigService<KonfigurasiApp, true>) {}

  consume(identitas: { penggunaId?: string; ip?: string }): void {
    const terautentikasi = Boolean(identitas.penggunaId);
    const subjek = terautentikasi
      ? `pengguna:${identitas.penggunaId}`
      : `ip:${identitas.ip?.trim() ?? 'unknown'}`;
    const kunci = `unduh:${subjek}`;
    const sekarang = Date.now();
    const batas = this.config.get('pembatasanLaju', { infer: true });
    const jumlahMaksimum = terautentikasi
      ? batas.batasUnduhPengguna
      : batas.batasUnduhAnonim;
    let catatan = this.catatan.get(kunci);

    if (!catatan || sekarang - catatan.mulai >= JENDELA_UNDUH_MS) {
      catatan = { mulai: sekarang, jumlah: 0 };
      this.catatan.set(kunci, catatan);
    }
    if (catatan.jumlah >= jumlahMaksimum) {
      throw new HttpException(
        'Batas unduhan tercapai. Coba lagi setelah satu jam.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    catatan.jumlah += 1;

    // Periodically remove expired IP/user entries without a timer lifecycle.
    this.operasi += 1;
    if (this.operasi % 256 === 0) {
      for (const [entri, nilai] of this.catatan) {
        if (sekarang - nilai.mulai >= JENDELA_UNDUH_MS) this.catatan.delete(entri);
      }
    }
  }
}
