import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { DokumenAdminService } from './dokumen-admin.service.js';

const admin = {
  id: '7',
  status: 'AKTIF',
  peran: ['ADMIN'],
  izin: ['legal.correct_status', 'documents.delete'],
};
const staf = { id: '9', status: 'AKTIF', peran: ['DOSEN_STAF'], izin: [] };

function siapkan(
  dokumen: Record<string, unknown> | null = {
    id: '5',
    kode_dokumen: 'DOC-5',
    slug: 'dok-5',
    status_hukum: 'BERLAKU',
  },
) {
  const sql: { sql: string; values: unknown[] }[] = [];
  const repo = {
    rows: vi.fn((_db: unknown, q: string) => {
      if (q.includes('FROM dokumen WHERE')) return Promise.resolve(dokumen ? [dokumen] : []);
      if (q.includes('FROM dokumen_versi'))
        return Promise.resolve([
          { id: '50', judul: 'Judul' },
          { id: '51', judul: 'Lama' },
        ]);
      if (q.includes('FROM dokumen_berkas')) return Promise.resolve([{ storage_key: 'a/b.pdf' }]);
      return Promise.resolve([]);
    }),
    write: vi.fn((_db: unknown, q: string, values: unknown[]) => {
      sql.push({ sql: q, values });
      return Promise.resolve({ affectedRows: 1 });
    }),
    transaction: vi.fn((fn: (db: unknown) => Promise<unknown>) => fn({})),
  };
  const audit = { recordDomain: vi.fn(() => Promise.resolve()) };
  const storage = { delete: vi.fn(() => Promise.resolve()) };
  const service = new DokumenAdminService(repo as never, audit as never, storage as never);
  return { service, sql, audit, storage };
}

describe('DokumenAdminService.ubahStatusHukum', () => {
  it('changes the legal status, records history and audit', async () => {
    const { service, sql, audit } = siapkan();
    await expect(
      service.ubahStatusHukum(admin as never, '5', {
        statusHukum: 'DICABUT',
        alasan: 'Dicabut SK baru',
      }),
    ).resolves.toEqual({ id: '5', statusHukum: 'DICABUT' });
    expect(sql[0]).toEqual({
      sql: 'UPDATE dokumen SET status_hukum=? WHERE id=?',
      values: ['DICABUT', '5'],
    });
    expect(sql[1]!.sql).toContain('INSERT INTO dokumen_status_hukum_riwayat');
    expect(sql[1]!.values.slice(0, 4)).toEqual(['5', 'BERLAKU', 'DICABUT', 'Dicabut SK baru']);
    expect(audit.recordDomain).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CORRECT_STATUS', before: { statusHukum: 'BERLAKU' } }),
      {},
    );
  });

  it('stores NULL when the reason is left empty', async () => {
    const { service, sql } = siapkan();
    await service.ubahStatusHukum(admin as never, '5', { statusHukum: 'DIUBAH', alasan: ' ' });
    expect(sql[1]!.values.slice(0, 4)).toEqual(['5', 'BERLAKU', 'DIUBAH', null]);
  });

  it('adds a reason to an unchanged status as a reason-only history row', async () => {
    const { service, sql, audit } = siapkan({
      id: '5',
      kode_dokumen: 'DOC-5',
      slug: 'dok-5',
      status_hukum: 'DICABUT',
    });
    await service.ubahStatusHukum(admin as never, '5', { statusHukum: 'DICABUT' });
    expect(sql).toEqual([]);
    await service.ubahStatusHukum(admin as never, '5', {
      statusHukum: 'DICABUT',
      alasan: 'Diganti peraturan baru',
    });
    expect(sql).toHaveLength(1);
    expect(sql[0]!.sql).toContain('INSERT INTO dokumen_status_hukum_riwayat');
    expect(sql[0]!.values.slice(0, 4)).toEqual([
      '5',
      'DICABUT',
      'DICABUT',
      'Diganti peraturan baru',
    ]);
    expect(audit.recordDomain).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'UPDATE_STATUS_REASON' }),
      {},
    );
  });

  it('requires a known status and the permission', async () => {
    const { service, sql } = siapkan();
    await expect(
      service.ubahStatusHukum(admin as never, '5', { statusHukum: 'BATAL', alasan: 'x' }),
    ).rejects.toThrow();
    await expect(
      service.ubahStatusHukum(staf as never, '5', { statusHukum: 'DIUBAH', alasan: 'x' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(sql).toEqual([]);
  });
});

describe('DokumenAdminService.hapusPermanen', () => {
  it('deletes every dependent row, then the files, and audits it', async () => {
    const { service, sql, audit, storage } = siapkan();
    await expect(service.hapusPermanen(admin as never, '5')).resolves.toEqual({
      id: '5',
      dihapus: true,
    });
    const deletes = sql.map((s) => s.sql).filter((s) => s.startsWith('DELETE'));
    for (const table of [
      'dokumen_status_hukum_riwayat',
      'dokumen_relasi',
      'dokumen_versi_kategori',
      'dokumen_versi_tag',
      'dokumen_berkas',
      'dokumen_workflow',
      'dokumen_akses_rahasia',
      'dokumen_versi',
    ])
      expect(deletes.some((s) => s.startsWith(`DELETE FROM ${table} `))).toBe(true);
    expect(deletes.at(-1)).toBe('DELETE FROM dokumen WHERE id=?');
    expect(storage.delete).toHaveBeenCalledWith('a/b.pdf');
    expect(audit.recordDomain).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'DELETE_PERMANENT', entityId: '5' }),
      {},
    );
  });

  it('is denied without permission and 404 for unknown documents', async () => {
    const { service, sql } = siapkan();
    await expect(service.hapusPermanen(staf as never, '5')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(siapkan(null).service.hapusPermanen(admin as never, '6')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(sql).toEqual([]);
  });
});
