import type { PenggunaAktif } from '@jdih/shared';
import { describe, expect, it, vi } from 'vitest';
import { IdentityService } from './identity.service.js';

const user: PenggunaAktif = {
  id: '1', nama: 'Admin Uji', surel: 'admin@ith.ac.id', status: 'AKTIF', peran: ['ADMIN'],
  unitKerjaId: null, unitManual: null, avatarUrl: null, izin: ['documents.read_admin', 'users.read'],
};
function setup(peran: PenggunaAktif['peran']) {
  const actor = { ...user, peran };
  const row = { id: '2', nama: 'Dosen Uji', email: 'dosen@ith.ac.id', peran: 'DOSEN_STAF', status: 'MENUNGGU_VERIFIKASI', unit_manual: null, unit_kerja_id: null, deleted_at: null, unitKerja: null, createdAt: '2026-10-20' };
  const repo = { pool: {}, pendingList: vi.fn().mockResolvedValue([row]), accountList: vi.fn().mockResolvedValue([row]), user: vi.fn().mockResolvedValue(row) };
  const service = new IdentityService(repo as never, {} as never, {} as never);
  vi.spyOn(service, 'authenticate').mockResolvedValue({ user: actor, session: {} as never });
  return { actor, row, repo, service };
}

describe('Privasi email pada respons panel', () => {
  for (const peran of [['ADMIN'], ['SUPERADMIN'], ['ADMIN', 'SUPERADMIN']] as const) {
    it(`email pada daftar, antrean, detail dan sesi mengikuti peran ${peran.join('+')}`, async () => {
      const { service, actor, row } = setup([...peran]);
      const masked = !peran.some((p) => p === 'SUPERADMIN');
      const pending = await service.pending(1, 20, actor);
      const accounts = await service.accounts(1, 20, actor);
      const detail = await service.pendingDetail('2', actor);
      const session = await service.penggunaSesiTampil('token');
      expect(pending[0]?.email).toBe(masked ? 'd***@ith.ac.id' : row.email);
      expect(accounts[0]?.email).toBe(masked ? 'd***@ith.ac.id' : row.email);
      expect(detail.email).toBe(masked ? 'd***@ith.ac.id' : row.email);
      expect(session.surel).toBe(actor.surel);
      if (masked) {
        expect(JSON.stringify({ pending, accounts, detail, session })).not.toContain(row.email);
      }
      expect(actor.surel).toBe('admin@ith.ac.id');
      expect(row.email).toBe('dosen@ith.ac.id');
    });
  }
  it('Admin menerima email sendiri pada daftar/detail berdasarkan ID, akun lain tetap disensor', async () => {
    const { service, actor, row, repo } = setup(['ADMIN']);
    const own = { ...row, id: actor.id, email: actor.surel };
    // Email yang sama tidak memberi pengecualian bila ID akun berbeda.
    const other = { ...row, email: actor.surel };
    repo.pendingList.mockResolvedValue([own, other]);
    repo.accountList.mockResolvedValue([own, other]);
    repo.user.mockImplementation((_db, id) => Promise.resolve(id === actor.id ? own : other));
    const pending = await service.pending(1, 20, actor);
    const accounts = await service.accounts(1, 20, actor);
    for (const rows of [pending, accounts]) {
      expect(rows[0]?.email).toBe(actor.surel);
      expect(rows[1]?.email).toBe('a***@ith.ac.id');
    }
    expect((await service.pendingDetail(actor.id, actor)).email).toBe(actor.surel);
    expect((await service.pendingDetail(other.id, actor)).email).toBe('a***@ith.ac.id');
  });
  it('sesi Dosen/Staf tetap membawa identitas aslinya untuk alur akun sendiri', async () => {
    const { service, actor } = setup(['DOSEN_STAF']);
    expect((await service.penggunaSesiTampil('token')).surel).toBe(actor.surel);
  });
  it('meneruskan ID pelihat untuk mengurutkan akun sebelum pagination', async () => {
    const { service, actor, repo } = setup(['ADMIN']);
    await service.accounts(3, 20, actor);
    expect(repo.accountList).toHaveBeenCalledWith(repo.pool, [actor.id, '20', '40']);
  });
});
