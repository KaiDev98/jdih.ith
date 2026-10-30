import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { PenggunaAktif } from '@jdih/shared';
import { describe, expect, it, vi } from 'vitest';
import { CoreBackendRepository } from './core-backend.repository.js';
import { CoreBackendService } from './core-backend.service.js';

const admin: PenggunaAktif = {
  id: '11',
  nama: 'Admin',
  surel: 'admin@ith.ac.id',
  status: 'AKTIF',
  unitKerjaId: '2',
  unitManual: null,
  avatarUrl: null,
  peran: ['ADMIN'],
  izin: ['documents.read_admin'],
};
function setup() {
  const db = {};
  const repo = new CoreBackendRepository({} as never);
  vi.spyOn(repo, 'transaction').mockImplementation((fn) => fn(db as never));
  const rows = vi.spyOn(repo, 'rows').mockResolvedValue([{ id: '11' }] as never);
  const write = vi.spyOn(repo, 'write').mockResolvedValue({ affectedRows: 1 } as never);
  const audit = { recordDomain: vi.fn().mockResolvedValue(undefined) };
  const service = new CoreBackendService(
    repo,
    audit as never,
    {} as never,
    {} as never,
    {} as never,
  );
  return { db, repo, rows, write, audit, service };
}

describe('hapus notifikasi pribadi', () => {
  it('menghapus hanya notifikasi yang berhak diterima akun dan mencatat audit dalam transaksi sama', async () => {
    const { service, rows, write, audit, db } = setup();
    await expect(service.dismissNotification(admin, '91')).resolves.toEqual({ jumlahDihapus: 1 });
    expect(rows).toHaveBeenNthCalledWith(1, db, expect.stringContaining('FOR UPDATE'), ['11']);
    expect(rows).toHaveBeenNthCalledWith(
      2,
      db,
      expect.stringContaining(
        "w.action IN ('RETURN','APPROVE') AND v.created_by=? AND d.created_by=?",
      ),
      ['11', '11', '91'],
    );
    expect(write).toHaveBeenCalledWith(
      db,
      expect.stringContaining('INSERT IGNORE INTO notifikasi_dihapus'),
      ['11', '11', '11', '91'],
    );
    expect(write.mock.calls[0]?.[1]).toContain('w.id=?');
    expect(audit.recordDomain).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: '11',
        action: 'DISMISS_NOTIFICATION',
        entityId: '91',
        after: { jumlahDihapus: 1 },
      }),
      db,
    );
    expect(write.mock.calls[0]?.[1]).not.toMatch(/DELETE FROM/);
  });
  it('404 untuk ID tidak ada atau milik orang lain yang tidak masuk cakupan penerima', async () => {
    const { service, rows, write, audit } = setup();
    rows.mockResolvedValueOnce([{ id: '11' }] as never).mockResolvedValueOnce([]);
    await expect(service.dismissNotification(admin, '92')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(write).not.toHaveBeenCalled();
    expect(audit.recordDomain).not.toHaveBeenCalled();
  });
  it('hapus semua mencakup riwayat di luar 30 baris tampilan, dibatasi snapshot dan akun', async () => {
    const { service, write, audit } = setup();
    write.mockResolvedValue({ affectedRows: 45 } as never);
    await expect(
      service.clearNotifications(admin, { sampaiId: '9007199254740993' }),
    ).resolves.toEqual({ jumlahDihapus: 45 });
    const sql = write.mock.calls[0]?.[1];
    expect(sql).toContain('w.id<=?');
    expect(sql).not.toContain('LIMIT');
    expect(write.mock.calls[0]?.[2]).toEqual(['11', '11', '11', '9007199254740993']);
    expect(audit.recordDomain).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'DISMISS_ALL_NOTIFICATIONS',
        after: { jumlahDihapus: 45, sampaiId: '9007199254740993' },
      }),
      expect.anything(),
    );
  });
  it('Superadmin hanya menghapus pengajuan terbaru yang masih menunggu verifikasi', async () => {
    const { service, write } = setup();
    await service.clearNotifications({ ...admin, peran: ['SUPERADMIN'] }, { sampaiId: '99' });
    expect(write.mock.calls[0]?.[1]).toContain(
      "w.action='SUBMIT' AND v.status_workflow='DIAJUKAN'",
    );
    expect(write.mock.calls[0]?.[1]).toContain('SELECT MAX(latest.id)');
    expect(write.mock.calls[0]?.[1]).not.toContain("w.action IN ('RETURN','APPROVE')");
    expect(write.mock.calls[0]?.[2]).toEqual(['11', '99']);
  });
  it('penghapusan berulang idempoten dan tidak membuat audit duplikat', async () => {
    const { service, write, audit } = setup();
    write.mockResolvedValue({ affectedRows: 0 } as never);
    await expect(service.dismissNotification(admin, '91')).resolves.toEqual({ jumlahDihapus: 0 });
    expect(audit.recordDomain).not.toHaveBeenCalled();
  });
  it('gagal bila audit gagal agar transaksi dapat di-rollback', async () => {
    const { service, audit } = setup();
    audit.recordDomain.mockRejectedValue(new Error('Audit unavailable'));
    await expect(service.dismissNotification(admin, '91')).rejects.toThrow('Audit unavailable');
  });
  it('memeriksa akun aktif kembali di dalam transaksi', async () => {
    const { service, rows, write } = setup();
    rows.mockResolvedValue([]);
    await expect(service.clearNotifications(admin, { sampaiId: '99' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(write).not.toHaveBeenCalled();
  });
  it('menolak status/peran/izin dan payload ilegal sebelum akses DB', async () => {
    const { service, repo } = setup();
    for (const actor of [
      { ...admin, status: 'NONAKTIF' as const },
      { ...admin, peran: ['DOSEN_STAF'] as PenggunaAktif['peran'] },
      { ...admin, izin: [] },
    ])
      await expect(service.dismissNotification(actor, '91')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    for (const id of ['0', '-1', '1 OR 1=1', '18446744073709551616'])
      await expect(service.dismissNotification(admin, id)).rejects.toThrow();
    for (const body of [{}, { sampaiId: '91', penggunaId: '12' }])
      await expect(service.clearNotifications(admin, body)).rejects.toThrow();
    expect(repo.transaction).not.toHaveBeenCalled();
  });
  it('daftar menyaring preferensi akun saat dimuat ulang', async () => {
    const { repo, rows } = setup();
    rows.mockResolvedValue([]);
    await repo.notificationList('11', false);
    expect(rows).toHaveBeenCalledWith(
      repo.pool,
      expect.stringContaining('n.pengguna_id=? AND n.workflow_id=w.id'),
      ['11', '11', '11'],
    );
  });
});
