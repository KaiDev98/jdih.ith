import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { map, type Observable } from 'rxjs';

/**
 * Membungkus tanggapan berhasil menjadi bentuk baku `{ sukses: true, data }`.
 *
 * Pengendali cukup mengembalikan data apa adanya; pembungkusnya ditambahkan di
 * sini. Dua pengecualian yang dihormati:
 *
 *  - Nilai yang SUDAH memuat ruas `sukses` dilewatkan tanpa diubah. Tanggapan
 *    berdaftar membawa `meta` dan `aspek` sendiri, dan tidak boleh dibungkus dua kali.
 *  - Tanggapan tanpa badan (204) dibiarkan kosong.
 */
@Injectable()
export class BungkusTanggapanInterceptor implements NestInterceptor {
  intercept(_konteks: ExecutionContext, berikutnya: CallHandler): Observable<unknown> {
    return berikutnya.handle().pipe(
      map((nilai: unknown) => {
        if (nilai === undefined || nilai === null) return nilai;

        if (typeof nilai === 'object' && 'sukses' in nilai) return nilai;

        // Aliran berkas dan penyangga tidak boleh disentuh: keduanya adalah
        // muatan biner, bukan data JSON.
        if (Buffer.isBuffer(nilai)) return nilai;
        if (typeof nilai === 'object' && 'pipe' in nilai) return nilai;

        return { sukses: true, data: nilai };
      }),
    );
  }
}
