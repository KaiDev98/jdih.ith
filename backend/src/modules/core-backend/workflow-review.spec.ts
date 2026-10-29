import {
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { PenggunaAktif } from '@jdih/shared';
import { describe, expect, it, vi } from 'vitest';
import { CoreBackendService } from './core-backend.service.js';
import { CoreBackendRepository } from './core-backend.repository.js';
import { DocumentFilesService } from './files/document-files.service.js';

const admin: PenggunaAktif = {
  id: '11',
  nama: 'Admin',
  surel: 'admin@ith.ac.id',
  status: 'AKTIF',
  unitKerjaId: '2',
  unitManual: null,
  avatarUrl: null,
  peran: ['ADMIN'],
  izin: [
    'documents.read_admin',
    'documents.create',
    'documents.upload',
    'workflow.submit',
    'workflow.approve',
    'workflow.return',
  ],
};
const verifier: PenggunaAktif = { ...admin, id: '12', peran: ['SUPERADMIN'] };
const complete = {
  id: '50',
  dokumen_id: '5',
  created_by: '11',
  document_created_by: '11',
  status_workflow: 'DRAF',
  peruntukan: null,
  judul: 'SOP baru',
  deskripsi: 'Prosedur pengajuan SK',
  nomor: '1',
  tahun: 2026,
  pic: 'Hukum',
  tanggal_penetapan: '2026-10-23',
  tingkat_akses: 'publik',
  unit_kerja_id: '2',
};
function setup(overrides: Record<string, unknown> = {}) {
  const version = { ...complete, ...overrides };
  const repo = {
    pool: {},
    transaction: vi.fn((fn: (db: unknown) => unknown) => fn({})),
    rows: vi.fn((_db: unknown, sql: string) =>
      Promise.resolve(
        sql.includes('SELECT v.*')
          ? [version]
          : sql.includes('FROM dokumen_versi_kategori')
            ? [{ id: '3' }]
            : sql.includes('FROM kategori')
              ? [{ id: '3' }]
              : [],
      ),
    ),
    write: vi.fn().mockResolvedValue({ affectedRows: 1 }),
  };
  const files = { assertSubmissionReady: vi.fn().mockResolvedValue(undefined) };
  Object.setPrototypeOf(repo, CoreBackendRepository.prototype);
  const audit = {
    recordDomain: vi
      .fn<(event: unknown, db?: unknown) => Promise<void>>()
      .mockResolvedValue(undefined),
  };
  const core = new CoreBackendService(
    repo as never,
    audit as never,
    {} as never,
    {} as never,
    files as never,
  );
  return { core, repo, audit, files };
}

describe('pengajuan dan hasil verifikasi dokumen', () => {
  it('Admin tidak dapat mengajukan dokumen khusus SOP Permohonan SK', async () => {
    const { core, repo } = setup({ peruntukan: 'PERMOHONAN_SK' });
    await expect(core.transition(admin, '50', 'SUBMIT')).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.write).not.toHaveBeenCalled();
  });
  it('SOP milik Admin masuk DIAJUKAN setelah data dan file diperiksa', async () => {
    const { core, files, repo, audit } = setup();
    await expect(core.transition(admin, '50', 'SUBMIT')).resolves.toMatchObject({
      statusWorkflow: 'DIAJUKAN',
    });
    expect(files.assertSubmissionReady).toHaveBeenCalledWith(expect.anything(), '50');
    expect(repo.write).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining('INSERT INTO dokumen_workflow'),
      ['50', 'DRAF', 'DIAJUKAN', 'SUBMIT', null, '11'],
    );
    expect(audit.recordDomain).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SUBMIT' }),
      expect.anything(),
    );
  });
  for (const field of [
    'judul',
    'deskripsi',
    'nomor',
    'tahun',
    'pic',
    'tanggal_penetapan',
    'tingkat_akses',
  ]) {
    it(`menolak pengajuan ketika ${field} kosong tanpa menulis status`, async () => {
      const { core, repo } = setup({ [field]: null });
      await expect(core.transition(admin, '50', 'SUBMIT')).rejects.toBeInstanceOf(
        UnprocessableEntityException,
      );
      expect(repo.write).not.toHaveBeenCalled();
    });
  }
  it('menolak file hilang atau rusak sebelum status berubah', async () => {
    const { core, files, repo } = setup();
    files.assertSubmissionReady.mockRejectedValue(
      new UnprocessableEntityException('File tidak tersedia'),
    );
    await expect(core.transition(admin, '50', 'SUBMIT')).rejects.toThrow('File tidak tersedia');
    expect(repo.write).not.toHaveBeenCalled();
  });
  it('memeriksa ulang unit dan kategori saat mengajukan', async () => {
    const wrongUnit = setup({ unit_kerja_id: '9' });
    await expect(wrongUnit.core.transition(admin, '50', 'SUBMIT')).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
    expect(wrongUnit.repo.write).not.toHaveBeenCalled();
    const wrongCategory = setup();
    wrongCategory.repo.rows.mockImplementation((_db, sql) =>
      Promise.resolve(
        sql.includes('SELECT v.*')
          ? [complete]
          : sql.includes('FROM dokumen_versi_kategori')
            ? [{ id: '3' }]
            : [],
      ),
    );
    await expect(wrongCategory.core.transition(admin, '50', 'SUBMIT')).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
    expect(wrongCategory.repo.write).not.toHaveBeenCalled();
  });
  it('Admin tidak bisa memverifikasi meski memiliki izin langsung', async () => {
    const { core, repo } = setup({ status_workflow: 'DIAJUKAN' });
    await expect(core.transition(admin, '50', 'APPROVE', 'Sesuai')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(core.transition(admin, '50', 'RETURN', 'Perbaiki')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(repo.rows).not.toHaveBeenCalled();
  });
  it('pembuat versi tetap tidak boleh menyetujui sendiri', async () => {
    const { core } = setup({ created_by: '12', status_workflow: 'DIAJUKAN' });
    await expect(core.transition(verifier, '50', 'APPROVE', 'Sesuai')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
  for (const action of ['RETURN', 'APPROVE'] as const) {
    it(`${action} menyimpan alasan yang diberikan pada riwayat serta audit`, async () => {
      const { core, repo, audit } = setup({ status_workflow: 'DIAJUKAN' });
      if (action === 'RETURN') {
        await expect(core.transition(verifier, '50', action, '  ')).rejects.toBeInstanceOf(
          UnprocessableEntityException,
        );
        expect(repo.write).not.toHaveBeenCalled();
      }
      await core.transition(verifier, '50', action, 'Hasil pemeriksaan file');
      expect(repo.write).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('INSERT INTO dokumen_workflow'),
        [
          '50',
          'DIAJUKAN',
          action === 'RETURN' ? 'REVISI' : 'DISETUJUI',
          action,
          'Hasil pemeriksaan file',
          '12',
        ],
      );
      expect(audit.recordDomain.mock.calls[0]?.[0]).toMatchObject({
        after: { reason: 'Hasil pemeriksaan file' },
      });
    });
  }
  for (const note of [undefined, '', ' \n\t\u00a0']) {
    it(`persetujuan boleh tanpa alasan (${JSON.stringify(note)}) dan tetap diaudit`, async () => {
      const { core, repo, audit, files } = setup({ status_workflow: 'DIAJUKAN' });
      await expect(core.transition(verifier, '50', 'APPROVE', note)).resolves.toMatchObject({ statusWorkflow: 'DISETUJUI' });
      expect(files.assertSubmissionReady).toHaveBeenCalledWith(expect.anything(), '50');
      expect(repo.write).toHaveBeenCalledWith(expect.anything(), expect.stringContaining('INSERT INTO dokumen_workflow'), ['50', 'DIAJUKAN', 'DISETUJUI', 'APPROVE', null, '12']);
      expect(audit.recordDomain).toHaveBeenCalledWith(expect.objectContaining({ action: 'APPROVE', after: { status: 'DISETUJUI' } }), expect.anything());
    });
  }
  it('memisahkan dokumen terverifikasi, draf dan antrean pada query backend', async () => {
    const { core, repo } = setup();
    await core.adminDocuments(admin, {});
    expect(repo.rows.mock.calls.at(-1)?.[1]).toContain("IN ('DISETUJUI','TERBIT','DITARIK')");
    await core.adminDocuments(admin, { cakupan: 'PENGAJUAN' });
    expect(repo.rows.mock.calls.at(-1)?.[1]).toContain("IN ('DRAF','REVISI','DIAJUKAN')");
    await core.adminDocuments(verifier, {}, true);
    expect(repo.rows.mock.calls.at(-1)?.[1]).toContain("v.status_workflow='DIAJUKAN'");
    expect(repo.rows.mock.calls.at(-1)?.[1]).not.toContain('d.created_by=?');
  });
  for (const from of ['DRAF', 'REVISI']) {
    it(`Superadmin menyetujui ${from} milik sendiri langsung, tanpa SUBMIT dan tanpa memindah versi publik`, async () => {
      const { core, repo, audit, files } = setup({ created_by: '12', document_created_by: '12', status_workflow: from });
      await expect(core.transition(verifier, '50', 'APPROVE')).resolves.toMatchObject({ statusWorkflow: 'DISETUJUI' });
      expect(files.assertSubmissionReady).toHaveBeenCalledWith(expect.anything(), '50');
      expect(repo.write).toHaveBeenCalledWith(expect.anything(), expect.stringContaining('INSERT INTO dokumen_workflow'), ['50', from, 'DISETUJUI', 'APPROVE', null, '12']);
      expect(repo.write.mock.calls.some(([, sql]) => String(sql).includes('current_published_version_id'))).toBe(false);
      expect(audit.recordDomain).toHaveBeenCalledWith(expect.objectContaining({ after: { status: 'DISETUJUI', jalur: 'SUPERADMIN_LANGSUNG' } }), expect.anything());
      await expect(core.transition(verifier, '50', 'SUBMIT')).rejects.toThrow(/tanpa masuk antrean/);
    });
    it(`Superadmin tidak dapat melewati antrean untuk ${from} milik Admin`, async () => {
      const { core, repo } = setup({ status_workflow: from });
      await expect(core.transition(verifier, '50', 'APPROVE')).rejects.toThrow(/Transisi workflow/);
      expect(repo.write).not.toHaveBeenCalled();
    });
  }
  it('persetujuan langsung tetap menolak metadata atau checksum yang tidak lengkap', async () => {
    const missing = setup({ created_by: '12', document_created_by: '12', judul: '' });
    await expect(missing.core.transition(verifier, '50', 'APPROVE')).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(missing.repo.write).not.toHaveBeenCalled();
    const invalid = setup({ created_by: '12', document_created_by: '12' });
    invalid.files.assertSubmissionReady.mockRejectedValue(new UnprocessableEntityException('Checksum tidak valid'));
    await expect(invalid.core.transition(verifier, '50', 'APPROVE')).rejects.toThrow(/Checksum/);
    expect(invalid.repo.write).not.toHaveBeenCalled();
  });
  it('notifikasi Admin hanya berisi keputusan dokumen sendiri; Superadmin menerima pengajuan', async () => {
    const { core, repo } = setup();
    await core.notifications(admin);
    expect(repo.rows).toHaveBeenLastCalledWith(
      repo.pool,
      expect.stringContaining(
        "w.action IN ('RETURN','APPROVE') AND v.created_by=? AND d.created_by=?",
      ),
      ['11', '11', '11'],
    );
    await core.notifications(verifier);
    expect(repo.rows).toHaveBeenLastCalledWith(
      repo.pool,
      expect.stringContaining("w.action='SUBMIT'"),
      ['12'],
    );
    await expect(core.notifications({ ...admin, status: 'NONAKTIF' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});

describe('file pengajuan dan pratinjau panel', () => {
  function filesSetup(rows: unknown[]) {
    const repo = { pool: {}, rows: vi.fn().mockResolvedValue(rows) };
    const storage = { verify: vi.fn().mockResolvedValue(true) };
    const audit = { recordDomain: vi.fn() };
    const files = new DocumentFilesService(
      repo as never,
      storage as never,
      audit as never,
      {} as never,
      {} as never,
    );
    return { files, repo, storage };
  }
  for (const rows of [
    [],
    [{ jenis_berkas: 'LAMPIRAN' }],
    [{ jenis_berkas: 'UTAMA' }, { jenis_berkas: 'LAMPIRAN' }],
  ]) {
    it(`menolak pengajuan dengan ${rows.length} file yang tidak sesuai`, async () => {
      const { files, storage } = filesSetup(rows);
      await expect(files.assertSubmissionReady({} as never, '50')).rejects.toBeInstanceOf(
        UnprocessableEntityException,
      );
      expect(storage.verify).not.toHaveBeenCalled();
    });
  }
  it('memeriksa byte dan checksum file tunggal', async () => {
    const { files, storage } = filesSetup([
      { jenis_berkas: 'UTAMA', storage_key: 'kunci', size_bytes: '40', checksum: Buffer.alloc(32) },
    ]);
    await files.assertSubmissionReady({} as never, '50');
    expect(storage.verify).toHaveBeenCalledWith('kunci', 40, expect.any(Buffer));
    storage.verify.mockResolvedValue(false);
    await expect(files.assertSubmissionReady({} as never, '50')).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });
  it('pratinjau draf memerlukan akun panel aktif dan pasangan versi/file yang benar', async () => {
    const { files, repo } = filesSetup([]);
    await expect(
      files.authorizeVersion({ ...admin, status: 'NONAKTIF' }, '50', '8'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repo.rows).not.toHaveBeenCalled();
    await expect(files.authorizeVersion(verifier, '50', '8')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repo.rows).toHaveBeenLastCalledWith(
      repo.pool,
      expect.stringContaining('f.id=? AND v.id=? AND d.deleted_at IS NULL'),
      ['8', '50'],
    );
    repo.rows.mockResolvedValue([{ tingkat_akses: 'publik', storage_key: 'private' }]);
    await expect(files.authorizeVersion(verifier, '50', '8')).resolves.toHaveProperty(
      'storage_key',
      'private',
    );
  });
});
