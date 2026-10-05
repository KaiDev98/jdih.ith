import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { KontakService } from './kontak.service.js';

function siapkan(telepon = '+62 853-4088-9059') {
  const writes: unknown[][] = [];
  const repo = {
    pool: {},
    rows: vi.fn(() => Promise.resolve([{ telepon }])),
    write: vi.fn((_db: unknown, _sql: string, values: unknown[]) => {
      writes.push(values);
      return Promise.resolve();
    }),
    transaction: vi.fn((fn: (db: unknown) => Promise<unknown>) => fn({})),
  };
  const audit = { recordDomain: vi.fn(() => Promise.resolve()) };
  return { service: new KontakService(repo as never, audit as never), writes, audit };
}
const admin = { id: '7', status: 'AKTIF', peran: ['ADMIN'], izin: ['contact.manage'] };

describe('KontakService', () => {
  it('returns only the phone number publicly', async () => {
    const { service } = siapkan();
    await expect(service.ambil()).resolves.toEqual({ telepon: '+62 853-4088-9059' });
  });

  it('lets an admin change the phone number and audits the change', async () => {
    const { service, writes, audit } = siapkan();
    await expect(service.ubah(admin as never, { telepon: ' +62 812-0000-1111 ' })).resolves.toEqual(
      {
        telepon: '+62 812-0000-1111',
      },
    );
    expect(writes).toEqual([['+62 812-0000-1111', '7']]);
    expect(audit.recordDomain).toHaveBeenCalledWith(
      expect.objectContaining({
        module: 'settings',
        before: { telepon: '+62 853-4088-9059' },
        after: { telepon: '+62 812-0000-1111' },
      }),
      {},
    );
  });

  it('rejects accounts without contact.manage and email changes', async () => {
    const { service, writes } = siapkan();
    const staf = { id: '9', status: 'AKTIF', peran: ['DOSEN_STAF'], izin: [] };
    await expect(
      service.ubah(staf as never, { telepon: '+62 812-0000-1111' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.ubah(admin as never, { telepon: '+62 812-0000-1111', surel: 'x@ith.ac.id' }),
    ).rejects.toThrow();
    await expect(service.ubah(admin as never, { telepon: 'bukan nomor' })).rejects.toThrow();
    expect(writes).toEqual([]);
  });
});
