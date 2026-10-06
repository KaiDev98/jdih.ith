import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { KontakService } from './kontak.service.js';

const telepon = { id: '1', jenis: 'TELEPON', label: null, nilai: '+62 853-4088-9059' };
const surel = { id: '2', jenis: 'SUREL', label: 'Humas', nilai: 'humas@ith.ac.id' };

function siapkan({ ada = true, jumlah = 2 } = {}) {
  const writes: { sql: string; values: unknown[] }[] = [];
  const repo = {
    pool: {},
    rows: vi.fn((_db: unknown, sql: string) => {
      if (sql.includes('COUNT(*)')) return Promise.resolve([{ jumlah, urutan: jumlah }]);
      if (sql.includes('WHERE id=?')) return Promise.resolve(ada ? [telepon] : []);
      return Promise.resolve([telepon, surel]);
    }),
    write: vi.fn((_db: unknown, sql: string, values: unknown[]) => {
      writes.push({ sql, values });
      return Promise.resolve({ affectedRows: 1 });
    }),
    id: vi.fn(() => Promise.resolve('3')),
    transaction: vi.fn((fn: (db: unknown) => Promise<unknown>) => fn({})),
  };
  const audit = { recordDomain: vi.fn(() => Promise.resolve()) };
  return { service: new KontakService(repo as never, audit as never), writes, audit };
}
const admin = { id: '7', status: 'AKTIF', peran: ['ADMIN'], izin: ['contact.manage'] };
const staf = { id: '9', status: 'AKTIF', peran: ['DOSEN_STAF'], izin: [] };

describe('KontakService', () => {
  it('lists every contact item publicly, in order', async () => {
    await expect(siapkan().service.ambil()).resolves.toEqual({ butir: [telepon, surel] });
  });

  it('adds a phone or email after validating it by type, and audits', async () => {
    const { service, writes, audit } = siapkan();
    await expect(
      service.tambah(admin as never, {
        jenis: 'SUREL',
        label: ' JDIH ',
        nilai: ' jdih@ith.ac.id ',
      }),
    ).resolves.toEqual({ id: '3', jenis: 'SUREL', label: 'JDIH', nilai: 'jdih@ith.ac.id' });
    expect(writes[0]!.values).toEqual(['SUREL', 'JDIH', 'jdih@ith.ac.id', 3, '7']);
    expect(audit.recordDomain).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CREATE_CONTACT', entityId: '3' }),
      {},
    );
    await expect(
      service.tambah(admin as never, { jenis: 'SUREL', nilai: 'bukan-email' }),
    ).rejects.toThrow();
    await expect(
      service.tambah(admin as never, { jenis: 'TELEPON', nilai: 'humas@ith.ac.id' }),
    ).rejects.toThrow();
  });

  it('refuses more than ten items', async () => {
    const { service, writes } = siapkan({ jumlah: 10 });
    await expect(
      service.tambah(admin as never, { jenis: 'TELEPON', nilai: '+62 811 0000 1111' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(writes).toEqual([]);
  });

  it('updates and deletes an item with before/after audit', async () => {
    const { service, writes, audit } = siapkan();
    await service.ubah(admin as never, '1', {
      jenis: 'TELEPON',
      label: 'WhatsApp',
      nilai: '+62 811 0000 1111',
    });
    expect(writes[0]!.sql).toContain('UPDATE kontak_kantor_butir');
    expect(audit.recordDomain).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'UPDATE_CONTACT',
        before: { jenis: 'TELEPON', label: null, nilai: '+62 853-4088-9059' },
      }),
      {},
    );
    await expect(service.hapus(admin as never, '1')).resolves.toEqual({ id: '1', dihapus: true });
    expect(writes[1]!.sql).toBe('DELETE FROM kontak_kantor_butir WHERE id=?');
  });

  it('denies accounts without contact.manage and 404s unknown items', async () => {
    const { service, writes } = siapkan();
    for (const aksi of [
      () => service.tambah(staf as never, { jenis: 'TELEPON', nilai: '+62 811 0000 1111' }),
      () => service.ubah(staf as never, '1', { jenis: 'TELEPON', nilai: '+62 811 0000 1111' }),
      () => service.hapus(staf as never, '1'),
    ])
      await expect(aksi()).rejects.toBeInstanceOf(ForbiddenException);
    await expect(siapkan({ ada: false }).service.hapus(admin as never, '9')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(writes).toEqual([]);
  });
});
