import { Injectable, NotFoundException } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { RowDataPacket } from 'mysql2/promise';
import type { PenggunaAktif, StatistikDokumen } from '@jdih/shared';
import { DocumentPolicyService } from '../../identity/document-policy.service.js';
import { cookie } from '../../identity/identity.guard.js';
import { tanggalWita } from '../kunjungan/kunjungan.service.js';
import { CoreBackendRepository } from '../core-backend.repository.js';

export type JenisStatistik = 'lihat' | 'unduh';

const KUKI: Record<JenisStatistik, string> = { lihat: 'jdih_lihat', unduh: 'jdih_unduh' };
/** Batas jumlah dokumen yang diingat per hari dalam satu kuki. */
const MAKS_DIINGAT = 150;

/**
 * Jumlah orang yang melihat dan mengunduh setiap produk hukum. Satu peramban
 * dihitung sekali per dokumen per hari WITA (diingat lewat kuki), sehingga
 * memuat ulang halaman atau mengunduh berkali-kali tidak menaikkan angka.
 */
@Injectable()
export class StatistikDokumenService {
  constructor(
    private readonly repo: CoreBackendRepository,
    private readonly policy: DocumentPolicyService,
  ) {}

  async ambil(dokumenId: string): Promise<StatistikDokumen> {
    const baris = (
      await this.repo.rows<RowDataPacket>(
        this.repo.pool,
        'SELECT jumlah_lihat,jumlah_unduh FROM dokumen_statistik WHERE dokumen_id=?',
        [dokumenId],
      )
    )[0];
    return { dilihat: Number(baris?.jumlah_lihat ?? 0), diunduh: Number(baris?.jumlah_unduh ?? 0) };
  }

  async tambah(dokumenId: string, jenis: JenisStatistik) {
    const kolom = jenis === 'lihat' ? 'jumlah_lihat' : 'jumlah_unduh';
    await this.repo.write(
      this.repo.pool,
      `INSERT INTO dokumen_statistik(dokumen_id,${kolom}) VALUES(?,1) ON DUPLICATE KEY UPDATE ${kolom}=${kolom}+1`,
      [dokumenId],
    );
  }

  /**
   * Dokumen terbit yang boleh dibaca peminta, dicari lewat slug. Dokumen yang
   * tidak boleh dibaca menjawab tidak ditemukan, sama seperti halaman detail.
   */
  async dokumenTerbaca(slug: string, actor?: PenggunaAktif) {
    const r = (
      await this.repo.rows<RowDataPacket & { id: string; tingkat_akses: 'publik' | 'internal' }>(
        this.repo.pool,
        "SELECT CAST(d.id AS CHAR) id,v.tingkat_akses FROM dokumen d JOIN dokumen_versi v ON v.id=d.current_published_version_id WHERE d.slug=? AND v.status_workflow='TERBIT' AND d.deleted_at IS NULL",
        [slug],
      )
    )[0];
    if (!r) throw new NotFoundException();
    this.policy.assertRead(
      {
        id: String(r.id),
        tingkatAkses: r.tingkat_akses,
        published: true,
        current: true,
        deleted: false,
      },
      actor,
    );
    return String(r.id);
  }

  /**
   * Catat satu orang untuk dokumen ini bila peramban belum tercatat hari ini.
   * Kuki menyimpan tanggal WITA dan daftar id dokumen yang sudah dihitung.
   */
  async catatSekali(
    req: Request,
    res: Response,
    dokumenId: string,
    jenis: JenisStatistik,
    secure: boolean,
  ) {
    const hari = tanggalWita(new Date());
    const [tanggal, daftar = ''] = cookie(req as never, KUKI[jenis]).split('|');
    const sudah = tanggal === hari ? daftar.split('.').filter(Boolean) : [];
    if (sudah.includes(dokumenId)) return false;
    await this.tambah(dokumenId, jenis);
    res.cookie(KUKI[jenis], `${hari}|${[...sudah, dokumenId].slice(-MAKS_DIINGAT).join('.')}`, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/',
      expires: new Date(`${hari}T23:59:59+08:00`),
    });
    return true;
  }
}
