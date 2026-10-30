import { NotFoundException } from '@nestjs/common';
import type { PenggunaAktif } from '@jdih/shared';
import { describe, expect, it, vi } from 'vitest';
import { CoreBackendService } from './core-backend.service.js';

const admin: PenggunaAktif = {
  id: '11', nama: 'Admin', surel: 'admin@ith.ac.id', status: 'AKTIF', unitKerjaId: '2',
  unitManual: null, avatarUrl: null, peran: ['ADMIN'], izin: ['documents.create', 'documents.read_admin', 'legal.manage_relations'],
};
function setup() {
  const repo = {
    pool: {}, rows: vi.fn<(db: unknown, sql: string, values?: unknown[]) => Promise<Record<string, unknown>[]>>().mockResolvedValue([]),
    write: vi.fn(), id: vi.fn().mockResolvedValue('70'), transaction: vi.fn((fn: (db: unknown) => Promise<unknown>) => fn({})),
  };
  const audit = { recordDomain: vi.fn() };
  return { repo, audit, core: new CoreBackendService(repo as never, audit as never, {} as never, {} as never, {} as never) };
}

describe('unit input dan target perubahan dokumen', () => {
  it('mengembalikan semua unit/kategori dengan flag pilihan dari database, termasuk akun tanpa unit', async () => {
    const { core, repo } = setup();
    repo.rows.mockResolvedValue([
      { id: '3', kode: 'TIK', nama: 'TIK', aktif: 1, bolehPilih: 1 },
      { id: '4', kode: 'HKM', nama: 'Hukum', aktif: '1', bolehPilih: '0' },
    ]);
    expect(await core.documentOptions(admin, 'kategori')).toMatchObject([{ id: '3', bolehPilih: true }, { id: '4', bolehPilih: false }]);
    expect(repo.rows).toHaveBeenLastCalledWith(repo.pool, expect.stringContaining('LEFT JOIN unit_kerja'), ['2']);
    expect(repo.rows.mock.calls[0]?.[1]).not.toContain('WHERE k.aktif=1');
    await core.documentOptions({ ...admin, unitKerjaId: null }, 'kategori');
    expect(repo.rows.mock.calls.at(-1)?.[2]).toEqual([null]);
  });
  it('pencarian target hanya versi terbit aktif milik Admin; Superadmin boleh lintas pemilik', async () => {
    const { core, repo } = setup();
    await core.relationTargets(admin, { q: 'SK' });
    expect(repo.rows.mock.calls.every(([, sql]) => sql.includes('d.created_by=?') && sql.includes('v.created_by=?') && sql.includes('v.id=d.current_published_version_id'))).toBe(true);
    repo.rows.mockClear();
    await core.relationTargets({ ...admin, peran: ['SUPERADMIN'] }, {});
    expect(repo.rows.mock.calls.every(([, sql]) => !sql.includes('created_by=?'))).toBe(true);
  });
  for (const jenisRelasi of ['MENGUBAH', 'MENCABUT']) {
    for (const target of [
      { created_by: '22', published_version_created_by: '22' },
      { created_by: '11', published_version_created_by: '22' },
      { created_by: '22', published_version_created_by: '22', peruntukan: 'PERMOHONAN_SK' },
    ]) {
      it(`${jenisRelasi} menolak target/versi milik akun lain atau SOP khusus, termasuk ID hasil manipulasi`, async () => {
        const { core, repo, audit } = setup();
        repo.rows.mockResolvedValueOnce([{ dokumen_id: '5', created_by: '11', document_created_by: '11', status_workflow: 'DRAF' }])
          .mockResolvedValueOnce([{ id: '9', status_hukum: 'BERLAKU', current_published_version_id: '90', ...target }]);
        await expect(core.addRelation(admin, '50', { jenisRelasi, targetDocumentId: '9' })).rejects.toBeInstanceOf(NotFoundException);
        expect(repo.write).not.toHaveBeenCalled();
        expect(audit.recordDomain).not.toHaveBeenCalled();
      });
    }
    it(`${jenisRelasi} menerima target dokumen serta versi milik sendiri`, async () => {
      const { core, repo } = setup();
      repo.rows.mockResolvedValueOnce([{ dokumen_id: '5', created_by: '11', document_created_by: '11', status_workflow: 'DRAF' }])
        .mockResolvedValueOnce([{ id: '9', created_by: '11', published_version_created_by: '11', status_hukum: 'BERLAKU', current_published_version_id: '90' }]);
      await expect(core.addRelation(admin, '50', { jenisRelasi, targetDocumentId: '9' })).resolves.toMatchObject({ targetDocumentId: '9' });
      expect(repo.write).toHaveBeenCalledWith(expect.anything(), expect.stringContaining('INSERT INTO dokumen_relasi'), ['50', '9', jenisRelasi, null]);
    });
  }
});
