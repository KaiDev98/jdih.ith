import { Injectable, NotFoundException } from '@nestjs/common';
import type { RowDataPacket } from 'mysql2/promise';
import type { PenggunaAktif } from '@jdih/shared';
import { skemaKontakKantor, skemaUbahKontakKantor } from '@jdih/shared';
import { cekIzin } from '../../identity/security.js';
import { AuditService } from '../../identity/audit.service.js';
import { CoreBackendRepository } from '../core-backend.repository.js';

interface BarisKontak extends RowDataPacket {
  telepon: string;
}

/** Nomor telepon kantor (satu baris, id=1) yang tampil di footer dan halaman Kontak. */
@Injectable()
export class KontakService {
  constructor(
    private readonly repo: CoreBackendRepository,
    private readonly audit: AuditService,
  ) {}

  async ambil() {
    const row = (
      await this.repo.rows<BarisKontak>(
        this.repo.pool,
        'SELECT telepon FROM kontak_kantor WHERE id=1',
      )
    )[0];
    if (!row) throw new NotFoundException();
    return skemaKontakKantor.parse({ telepon: row.telepon });
  }

  async ubah(actor: PenggunaAktif, input: unknown) {
    cekIzin(actor, ['contact.manage']);
    const { telepon } = skemaUbahKontakKantor.parse(input);
    return this.repo.transaction(async (db) => {
      const before = (
        await this.repo.rows<BarisKontak>(
          db,
          'SELECT telepon FROM kontak_kantor WHERE id=1 FOR UPDATE',
        )
      )[0];
      if (!before) throw new NotFoundException();
      await this.repo.write(db, 'UPDATE kontak_kantor SET telepon=?,updated_by=? WHERE id=1', [
        telepon,
        actor.id,
      ]);
      await this.audit.recordDomain(
        {
          module: 'settings',
          action: 'UPDATE_CONTACT',
          entityType: 'kontak_kantor',
          entityId: '1',
          actorId: actor.id,
          before: { telepon: before.telepon },
          after: { telepon },
        },
        db,
      );
      return skemaKontakKantor.parse({ telepon });
    });
  }
}
