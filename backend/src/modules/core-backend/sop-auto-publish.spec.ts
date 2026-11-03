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
      if (sql === 'SELECT dokumen_id FROM dokumen_versi WHERE id=?')
        return Promise.resolve([{ dokumen_id: '5' }]);
      if (sql.includes('SELECT id,current_published_version_id'))
        return Promise.resolve([{ id: '5', current_published_version_id: '49' }]);
      if (sql.includes('FROM dokumen_versi_kategori')) return Promise.resolve([{ id: '3' }]);
      return Promise.resolve([]);
    }),
    write: vi.fn().mockResolvedValue({ affectedRows: 1 }),
  };
  const audit = {
    recordDomain: vi
      .fn<(event: { action: string }, connection: unknown) => Promise<void>>()
      .mockResolvedValue(undefined),
  };
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

describe('SOP Permohonan SK: persetujuan terpisah dari penerbitan', () => {
  it.each([null, 'PERMOHONAN_SK'])(
    'persetujuan peruntukan %s hanya DISETUJUI, tanpa pointer atau audit publish',
    async (peruntukan) => {
      const { service, repo, files, audit, db } = setup({ peruntukan });
      await expect(service.transition(actor, '50', 'APPROVE')).resolves.toMatchObject({
        statusWorkflow: 'DISETUJUI',
      });
      expect(files.assertSubmissionReady).toHaveBeenCalledWith(db, '50');
      expect(files.assertPublishReady).not.toHaveBeenCalled();
      expect(
        repo.write.mock.calls.some(([, sql]) =>
          String(sql).includes('current_published_version_id'),
        ),
      ).toBe(false);
      expect(audit.recordDomain.mock.calls.map(([event]) => event.action)).toEqual(['APPROVE']);
    },
  );
  it('Superadmin dapat menyetujui dirinya sendiri tanpa izin terbit; tetap butuh penerbitan kemudian', async () => {
    const { service, files } = setup();
    await expect(
      service.transition({ ...actor, izin: ['workflow.approve'] }, '50', 'APPROVE'),
    ).resolves.toMatchObject({ statusWorkflow: 'DISETUJUI' });
    expect(files.assertPublishReady).not.toHaveBeenCalled();
  });
  it('menolak tinjauan publikasi sebelum disetujui dan payload gabungan dari UI lama', async () => {
    const { service, repo } = setup();
    await expect(service.impact(actor, '50')).rejects.toBeInstanceOf(ConflictException);
    await expect(
      service.transition(actor, '50', 'APPROVE', undefined, {
        tokenKonfirmasi: 'lama',
        dampak: [],
        disetujui: true,
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(repo.write).not.toHaveBeenCalled();
  });
  it('Admin tetap tidak bisa menyetujui dan file tidak valid tetap ditolak', async () => {
    const { service, files, repo } = setup();
    await expect(
      service.transition({ ...actor, peran: ['ADMIN'] }, '50', 'APPROVE'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    files.assertSubmissionReady.mockRejectedValue(
      new UnprocessableEntityException('File tidak tersedia'),
    );
    await expect(service.transition(actor, '50', 'APPROVE')).rejects.toThrow('File tidak tersedia');
    expect(repo.write).not.toHaveBeenCalled();
  });
});
