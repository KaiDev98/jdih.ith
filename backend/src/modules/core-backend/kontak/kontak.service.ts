import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import type { PenggunaAktif } from '@jdih/shared';
import {
  BATAS_BUTIR_KONTAK,
  skemaButirKontak,
  skemaKontakKantor,
  skemaSimpanButirKontak,
} from '@jdih/shared';
import { cekIzin } from '../../identity/security.js';
import { AuditService } from '../../identity/audit.service.js';
import { CoreBackendRepository } from '../core-backend.repository.js';

interface BarisKontak extends RowDataPacket {
  id: string;
  jenis: 'TELEPON' | 'SUREL';
  label: string | null;
  nilai: string;
}

const KOLOM = 'CAST(id AS CHAR) id,jenis,label,nilai';

/**
 * Kontak kantor (telepon dan surel) yang tampil di footer dan halaman Kontak.
 * Publik hanya membaca; Admin dengan izin contact.manage menambah, mengubah,
 * dan menghapus butir. Setiap perubahan dicatat di audit.
 */
@Injectable()
export class KontakService {
  constructor(
    private readonly repo: CoreBackendRepository,
    private readonly audit: AuditService,
  ) {}

  async ambil() {
    const butir = await this.repo.rows<BarisKontak>(
      this.repo.pool,
      `SELECT ${KOLOM} FROM kontak_kantor_butir ORDER BY urutan, id`,
    );
    return skemaKontakKantor.parse({ butir: butir.map((b) => ({ ...b })) });
  }

  private async kunci(db: PoolConnection, id: string) {
    const row = (
      await this.repo.rows<BarisKontak>(
        db,
        `SELECT ${KOLOM} FROM kontak_kantor_butir WHERE id=? FOR UPDATE`,
        [id],
      )
    )[0];
    if (!row) throw new NotFoundException();
    return row;
  }

  async tambah(actor: PenggunaAktif, input: unknown) {
    cekIzin(actor, ['contact.manage']);
    const { jenis, label, nilai } = skemaSimpanButirKontak.parse(input);
    return this.repo.transaction(async (db) => {
      const [hitung] = await this.repo.rows<RowDataPacket & { jumlah: number; urutan: number }>(
        db,
        'SELECT COUNT(*) jumlah, COALESCE(MAX(urutan),0) urutan FROM kontak_kantor_butir FOR UPDATE',
      );
      if (Number(hitung?.jumlah ?? 0) >= BATAS_BUTIR_KONTAK)
        throw new ConflictException(`Kontak paling banyak ${BATAS_BUTIR_KONTAK} butir`);
      await this.repo.write(
        db,
        'INSERT INTO kontak_kantor_butir(jenis,label,nilai,urutan,updated_by) VALUES(?,?,?,?,?)',
        [jenis, label, nilai, Number(hitung?.urutan ?? 0) + 1, actor.id],
      );
      const id = await this.repo.id(db);
      await this.audit.recordDomain(
        {
          module: 'settings',
          action: 'CREATE_CONTACT',
          entityType: 'kontak_kantor_butir',
          entityId: id,
          actorId: actor.id,
          after: { jenis, label, nilai },
        },
        db,
      );
      return skemaButirKontak.parse({ id, jenis, label, nilai });
    });
  }

  async ubah(actor: PenggunaAktif, id: string, input: unknown) {
    cekIzin(actor, ['contact.manage']);
    const { jenis, label, nilai } = skemaSimpanButirKontak.parse(input);
    return this.repo.transaction(async (db) => {
      const sebelum = await this.kunci(db, id);
      await this.repo.write(
        db,
        'UPDATE kontak_kantor_butir SET jenis=?,label=?,nilai=?,updated_by=? WHERE id=?',
        [jenis, label, nilai, actor.id, id],
      );
      await this.audit.recordDomain(
        {
          module: 'settings',
          action: 'UPDATE_CONTACT',
          entityType: 'kontak_kantor_butir',
          entityId: id,
          actorId: actor.id,
          before: { jenis: sebelum.jenis, label: sebelum.label, nilai: sebelum.nilai },
          after: { jenis, label, nilai },
        },
        db,
      );
      return skemaButirKontak.parse({ id, jenis, label, nilai });
    });
  }

  async hapus(actor: PenggunaAktif, id: string) {
    cekIzin(actor, ['contact.manage']);
    return this.repo.transaction(async (db) => {
      const sebelum = await this.kunci(db, id);
      await this.repo.write(db, 'DELETE FROM kontak_kantor_butir WHERE id=?', [id]);
      await this.audit.recordDomain(
        {
          module: 'settings',
          action: 'DELETE_CONTACT',
          entityType: 'kontak_kantor_butir',
          entityId: id,
          actorId: actor.id,
          before: { jenis: sebelum.jenis, label: sebelum.label, nilai: sebelum.nilai },
        },
        db,
      );
      return { id, dihapus: true };
    });
  }
}
