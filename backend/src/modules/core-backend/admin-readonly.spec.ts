import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { PenggunaAktif } from '@jdih/shared';
import { describe, expect, it, vi } from 'vitest';
import { CoreBackendService } from './core-backend.service.js';
import { DocumentFilesService } from './files/document-files.service.js';
import { LetterTemplatesService } from './templates/letter-templates.service.js';

const admin: PenggunaAktif = {
  id: '11', nama: 'Admin', surel: 'admin@ith.ac.id', status: 'AKTIF',
  unitKerjaId: '2', unitManual: null, avatarUrl: null, peran: ['ADMIN'],
  izin: ['documents.read_admin', 'documents.create', 'documents.edit', 'documents.upload', 'documents.revise', 'workflow.submit'],
};
function setup() {
  const repo = {
    pool: {}, rows: vi.fn().mockResolvedValue([]), write: vi.fn(), id: vi.fn().mockResolvedValue('80'),
    transaction: vi.fn((fn: (db: unknown) => unknown) => fn({})),
  };
  const audit = { recordDomain: vi.fn() };
  const storage = { delete: vi.fn() };
  const core = new CoreBackendService(repo as never, audit as never, {} as never, {} as never, {} as never);
  return { repo, audit, storage, core };
}

describe('Admin membaca informasi tanpa kewenangan perubahan global', () => {
  it('audit ditolak bagi Admin termasuk dengan izin langsung sebelum membaca database', async () => {
    const { core, repo } = setup();
    for (const actor of [admin, { ...admin, izin: [...admin.izin, 'audit.read'] } satisfies PenggunaAktif])
      await expect(core.auditList(actor, {})).rejects.toBeInstanceOf(ForbiddenException);
    expect(repo.rows).not.toHaveBeenCalled();
  });
  it('audit memerlukan Superadmin aktif dengan audit.read', async () => {
    const { core, repo } = setup();
    const actor: PenggunaAktif = { ...admin, peran: ['SUPERADMIN'], izin: ['audit.read'] };
    await expect(core.auditList({ ...actor, status: 'NONAKTIF' }, {})).rejects.toBeInstanceOf(ForbiddenException);
    await expect(core.auditList({ ...actor, izin: [] }, {})).rejects.toBeInstanceOf(ForbiddenException);
    expect(repo.rows).not.toHaveBeenCalled();
    repo.rows.mockResolvedValue([{ total: 0 }]);
    await core.auditList(actor, {});
    expect(repo.rows).toHaveBeenCalled();
  });
  it('membaca seluruh kategori, tetapi pilihan input tetap memakai unit akun', async () => {
    const { core, repo } = setup();
    await core.masterList(admin, 'kategori');
    expect(repo.rows).toHaveBeenLastCalledWith(repo.pool, expect.stringContaining('FROM kategori ORDER BY nama'));
    await core.documentOptions(admin, 'kategori');
    expect(repo.rows).toHaveBeenLastCalledWith(repo.pool, expect.stringContaining('u.id=?'), ['2']);
    await expect(core.documentOptions({ ...admin, unitKerjaId: null }, 'kategori')).resolves.toEqual([]);
  });

  it('antrean Admin membaca pengajuan lintas akun tanpa SOP Permohonan SK; daftar lain tetap milik sendiri', async () => {
    const { core, repo } = setup();
    repo.rows.mockResolvedValue([{ total: 0 }]);
    await core.adminDocuments(admin, {}, true);
    expect(repo.rows.mock.calls.every(([, sql]) => !String(sql).includes('d.created_by=?'))).toBe(true);
    expect(repo.rows.mock.calls.every(([, sql]) => String(sql).includes('d.peruntukan IS NULL'))).toBe(true);
    repo.rows.mockClear();
    await expect(core.adminDocuments(admin, { peruntukan: 'PERMOHONAN_SK' })).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.rows).not.toHaveBeenCalled();
    await core.adminDocuments(admin, {});
    expect(repo.rows.mock.calls.every(([, sql]) => String(sql).includes('d.created_by=?'))).toBe(true);
  });

  it('Superadmin tetap dapat membaca daftar dan detail SOP', async () => {
    const { core, repo } = setup();
    const superadmin: PenggunaAktif = { ...admin, peran: ['SUPERADMIN'] };
    repo.rows.mockResolvedValue([{ total: 0 }]);
    await core.adminDocuments(superadmin, { peruntukan: 'PERMOHONAN_SK' });
    expect(repo.rows.mock.calls.every(([, sql]) => String(sql).includes('d.peruntukan=?'))).toBe(true);
    repo.rows.mockReset().mockResolvedValueOnce([{
      id: '5', peruntukan: 'PERMOHONAN_SK', versionId: '50', statusHukum: 'BERLAKU',
    }]).mockResolvedValue([]);
    await expect(core.document(superadmin, '5')).resolves.toMatchObject({ document: { id: '5' } });
  });

  it('Admin tidak dapat membuka SOP Permohonan SK lewat ID, relasi, atau berkas', async () => {
    const { core, repo, storage, audit } = setup();
    repo.rows.mockResolvedValueOnce([{ id: '5', versionId: '50', peruntukan: 'PERMOHONAN_SK', statusHukum: 'BERLAKU', documentCreatedBy: '11', versionCreatedBy: '11' }]).mockResolvedValue([]);
    await expect(core.document(admin, '5')).rejects.toBeInstanceOf(NotFoundException);
    repo.rows.mockResolvedValue([{ peruntukan: 'PERMOHONAN_SK' }]);
    await expect(core.relations(admin, '50')).rejects.toBeInstanceOf(NotFoundException);
    repo.rows.mockReset().mockResolvedValue([]);
    const files = new DocumentFilesService(repo as never, storage as never, audit as never, {} as never, {} as never);
    await files.listForVersion(admin, '50');
    expect(repo.rows.mock.calls.at(-1)?.[1]).toContain('AND d.peruntukan IS NULL');
    await files.listForVersion({ ...admin, peran: ['SUPERADMIN'] }, '50');
    expect(repo.rows.mock.calls.at(-1)?.[1]).not.toContain('AND d.peruntukan IS NULL');
    repo.rows.mockResolvedValue([{ peruntukan: 'PERMOHONAN_SK' }]);
    await expect(files.authorizeVersion(admin, '50', '8')).rejects.toBeInstanceOf(NotFoundException);
    await expect(core.updateVersion(admin, '50', { judul: 'Ubah SOP' })).rejects.toBeInstanceOf(NotFoundException);
    await expect(core.transition(admin, '50', 'SUBMIT')).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.write).not.toHaveBeenCalled();
  });

  it('membaca detail milik Admin lain dengan semua kemampuan perubahan nonaktif', async () => {
    const { core, repo } = setup();
    repo.rows.mockResolvedValueOnce([{
      id: '5', documentCreatedBy: '99', versionCreatedBy: '99', versionId: '50', statusHukum: 'BERLAKU',
    }]).mockResolvedValue([]);
    const detail = await core.document(admin, '5');
    expect(detail.document).toMatchObject({ bolehUbah: false, bolehRevisi: false });
  });

  it('tetap menolak perubahan dan pengajuan dokumen Admin lain tanpa menulis data', async () => {
    const { core, repo } = setup();
    repo.rows.mockResolvedValue([{ created_by: '99', document_created_by: '99', status_workflow: 'DRAF' }]);
    await expect(core.updateDocument(admin, '5', { slug: 'ubah' })).rejects.toBeInstanceOf(NotFoundException);
    await expect(core.updateVersion(admin, '50', { judul: 'Ubah judul' })).rejects.toBeInstanceOf(NotFoundException);
    await expect(core.transition(admin, '50', 'SUBMIT')).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.write).not.toHaveBeenCalled();
  });

  it('menolak kategori di luar unit ketika menyimpan versi milik sendiri', async () => {
    const { core, repo } = setup();
    repo.rows.mockResolvedValueOnce([{ created_by: '11', document_created_by: '11', status_workflow: 'DRAF' }]).mockResolvedValue([]);
    await expect(core.updateVersion(admin, '50', { kategoriId: ['99'] })).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.rows).toHaveBeenLastCalledWith(expect.anything(), expect.stringContaining('u.id=?'), ['99', '2']);
    expect(repo.write.mock.calls.some(([, sql]) => String(sql).startsWith('INSERT'))).toBe(false);
  });

  it('izin langsung tidak dapat memberikan verifikasi atau pengaturan global kepada Admin', async () => {
    const { core, repo } = setup();
    const actor: PenggunaAktif = { ...admin, izin: [...admin.izin, 'master.manage', 'workflow.approve', 'workflow.return', 'workflow.publish', 'workflow.withdraw'] };
    for (const action of [
      () => core.masterSave(actor, 'kategori', null, {}),
      () => core.masterStatus(actor, 'kategori', '1', { aktif: false }),
      () => core.transition(actor, '50', 'APPROVE'),
      () => core.transition(actor, '50', 'RETURN', 'Perbaiki'),
      () => core.publish(actor, '50', {}),
      () => core.withdraw(actor, '5', {}),
    ]) await expect(action()).rejects.toBeInstanceOf(ForbiddenException);
    expect(repo.write).not.toHaveBeenCalled();
  });

  it('bisa membaca daftar template tanpa izin perubahan, tetapi audit hanya untuk Superadmin', async () => {
    const { core, repo, storage, audit } = setup();
    const templates = new LetterTemplatesService(repo as never, storage as never, audit as never, {} as never);
    await expect(templates.adminList(admin)).resolves.toEqual([]);
    await expect(core.auditList(admin, {})).rejects.toBeInstanceOf(ForbiddenException);
    await expect(templates.archive(admin, '1', {})).rejects.toBeInstanceOf(ForbiddenException);
    expect(repo.write).not.toHaveBeenCalled();
  });

  it('berkas yang diunggah Superadmin pada dokumen milik Admin tidak boleh dihapus oleh Admin', async () => {
    const { repo, storage, audit } = setup();
    repo.rows.mockResolvedValueOnce([{ status_workflow: 'DRAF', document_created_by: '11', version_created_by: '11', peruntukan: null }])
      .mockResolvedValueOnce([{ storage_key: 'file', jenis_berkas: 'UTAMA', uploaded_by: '99' }]);
    const files = new DocumentFilesService(repo as never, storage as never, audit as never, {} as never, {} as never);
    await expect(files.removeFromDraft(admin, '50', '80')).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.write).not.toHaveBeenCalled();
    expect(storage.delete).not.toHaveBeenCalled();
  });
});
