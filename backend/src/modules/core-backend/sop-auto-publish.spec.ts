import {
  ConflictException,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { PenggunaAktif } from '@jdih/shared';
import { describe, expect, it, vi } from 'vitest';
import { CoreBackendService } from './core-backend.service.js';

const actor: PenggunaAktif = {
  id: '12',
  nama: 'Verifikator',
  surel: 'v@ith.ac.id',
  status: 'AKTIF',
  unitKerjaId: null,
  unitManual: null,
  avatarUrl: null,
  peran: ['SUPERADMIN'],
  izin: ['workflow.approve', 'workflow.publish'],
};
function setup(overrides: Record<string, unknown> = {}) {
  const version = {
    id: '50',
    dokumen_id: '5',
    document_created_by: '12',
    created_by: '12',
    peruntukan: 'PERMOHONAN_SK',
    status_workflow: 'DRAF',
    tingkat_akses: 'internal',
    judul: 'SOP SK',
    deskripsi: 'Prosedur pengajuan SK',
    nomor: '1',
    tahun: 2026,
    pic: 'Hukum',
    tanggal_penetapan: '2026-10-29',
    ...overrides,
  };
  const db = {};
  const repo = {
    pool: {},
    transaction: vi.fn((fn: (connection: unknown) => unknown) => Promise.resolve(fn(db))),
    rows: vi.fn((_db: unknown, sql: string) => {
      if (sql.includes('SELECT v.*') || sql.includes('SELECT v.id,v.status_workflow'))
        return Promise.resolve([version]);
      if (sql === 'SELECT dokumen_id FROM dokumen_versi WHERE id=?') return Promise.resolve([{ dokumen_id: '5' }]);
      if (sql.includes('SELECT id,current_published_version_id'))
        return Promise.resolve([{ id: '5', current_published_version_id: '49' }]);
      if (sql.includes('FROM dokumen_versi_kategori')) return Promise.resolve([{ id: '3' }]);
      return Promise.resolve([]);
    }),
    write: vi.fn().mockResolvedValue({ affectedRows: 1 }),
  };
  const audit = { recordDomain: vi.fn<(event: { action: string }, connection: unknown) => Promise<void>>().mockResolvedValue(undefined) };
  const files = {
    assertSubmissionReady: vi.fn().mockResolvedValue(undefined),
    assertPublishReady: vi.fn().mockResolvedValue(undefined),
  };
  const service = new CoreBackendService(
    repo as never,
    audit as never,
    { get: () => ({ key: 'sop-test-key' }) } as never,
    {} as never,
    files as never,
  );
  return { service, repo, audit, files, db };
}

describe('SOP Permohonan SK disetujui sekaligus terbit', () => {
  it('memindah versi aktif, menyimpan dua workflow dan audit dalam transaksi yang sama', async () => {
    const { service, repo, audit, files, db } = setup();
    const preview = await service.impact(actor, '50');
    expect(repo.write).not.toHaveBeenCalled();
    await expect(
      service.transition(actor, '50', 'APPROVE', 'Sesuai', {
        tokenKonfirmasi: preview.tokenKonfirmasi,
        dampak: preview.dampak as never,
        disetujui: true,
      }),
    ).resolves.toMatchObject({ statusWorkflow: 'TERBIT', currentPublishedVersionId: '50' });
    expect(repo.transaction).toHaveBeenCalledOnce();
    expect(files.assertSubmissionReady).toHaveBeenCalledWith(db, '50');
    expect(files.assertPublishReady).toHaveBeenCalledWith(db, '50');
    expect(repo.write).toHaveBeenCalledWith(
      db,
      expect.stringContaining('superseded_at=?'),
      expect.arrayContaining(['49']),
    );
    expect(repo.write).toHaveBeenCalledWith(
      db,
      'UPDATE dokumen SET current_published_version_id=? WHERE id=?',
      ['50', '5'],
    );
    expect(audit.recordDomain.mock.calls.map(([event]) => event.action)).toEqual([
      'APPROVE',
      'PUBLISH',
    ]);
    expect(audit.recordDomain.mock.calls.every(([, connection]) => connection === db)).toBe(true);
  });
  it('tetap memisahkan persetujuan dan penerbitan dokumen biasa', async () => {
    const { service, repo, files } = setup({ peruntukan: null });
    await expect(service.transition(actor, '50', 'APPROVE')).resolves.toMatchObject({
      statusWorkflow: 'DISETUJUI',
    });
    expect(files.assertPublishReady).not.toHaveBeenCalled();
    expect(
      repo.write.mock.calls.some(([, sql]) => String(sql).includes('current_published_version_id')),
    ).toBe(false);
  });
  it('menolak persetujuan SOP tanpa konfirmasi publikasi', async () => {
    const { service, repo } = setup();
    await expect(service.transition(actor, '50', 'APPROVE')).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
    expect(repo.write).not.toHaveBeenCalled();
  });
  it('menolak token palsu dan Admin meskipun memiliki izin langsung', async () => {
    const { service, repo } = setup();
    await expect(
      service.transition(actor, '50', 'APPROVE', undefined, {
        tokenKonfirmasi: 'palsu',
        disetujui: true,
        dampak: [],
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      service.transition({ ...actor, peran: ['ADMIN'] }, '50', 'APPROVE'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repo.write).not.toHaveBeenCalled();
  });
  it('memerlukan izin terbit dan tetap menolak file yang tidak siap', async () => {
    const { service, files, repo } = setup();
    await expect(
      service.transition({ ...actor, izin: ['workflow.approve'] }, '50', 'APPROVE'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    const preview = await service.impact(actor, '50');
    files.assertSubmissionReady.mockRejectedValue(
      new UnprocessableEntityException('File tidak tersedia'),
    );
    await expect(
      service.transition(actor, '50', 'APPROVE', undefined, {
        tokenKonfirmasi: preview.tokenKonfirmasi,
        dampak: preview.dampak as never,
        disetujui: true,
      }),
    ).rejects.toThrow('File tidak tersedia');
    expect(repo.write).not.toHaveBeenCalled();
  });
});
