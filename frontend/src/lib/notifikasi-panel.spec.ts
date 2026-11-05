import { describe, expect, it } from 'vitest';
import type { NotifikasiDokumen } from '@jdih/shared';
import { notifikasiSetelahBatas, tautanNotifikasi } from './notifikasi-panel';

const row = (id: string): NotifikasiDokumen => ({
  id,
  dokumenId: '5',
  versionId: '50',
  judul: 'Uji',
  action: 'APPROVE',
  catatan: null,
  createdAt: '2026-11-05 00:00:00',
});
describe('notifikasi lintas fitur panel', () => {
  it('memisahkan dua urutan ID tanpa kehilangan presisi BIGINT dan mempertahankan peristiwa sesudah snapshot', () => {
    const bounds = { sampaiId: '9007199254740993', sampaiEventId: '18446744073709551615' };
    expect(notifikasiSetelahBatas(row('9007199254740994'), bounds)).toBe(true);
    expect(notifikasiSetelahBatas(row('e-80'), bounds)).toBe(false);
    expect(notifikasiSetelahBatas(row('e-81'), { sampaiId: '99' })).toBe(true);
  });
  it('tautan format, keputusan penghapusan, akun dan draf terhapus tidak menunjuk detail yang tidak tersedia', () => {
    expect(tautanNotifikasi({ ...row('e-1'), jenis: 'TEMPLATE', action: 'TEMPLATE_SUBMIT' })).toBe(
      '/admin/dokumen/verifikasi#antrean-format',
    );
    expect(tautanNotifikasi({ ...row('e-2'), jenis: 'TEMPLATE', action: 'TEMPLATE_PUBLISH' })).toBe(
      '/admin/format-persuratan',
    );
    expect(
      tautanNotifikasi({
        ...row('e-3'),
        jenis: 'REMOVAL',
        requestId: '7',
        action: 'REMOVAL_APPROVE',
      }),
    ).toBe('/admin/dokumen/verifikasi?permintaanId=7&riwayatPermintaan=1#permintaan-penghapusan');
    expect(
      tautanNotifikasi({
        ...row('e-4'),
        jenis: 'DOCUMENT',
        action: 'DOCUMENT_DELETE',
        dokumenId: null,
        versionId: null,
      }),
    ).toBe('/admin/dokumen');
    expect(tautanNotifikasi({ ...row('e-5'), action: 'DOCUMENT_DRAFT_DELETE' })).toBe(
      '/admin/dokumen/pengajuan',
    );
    expect(tautanNotifikasi({ ...row('e-6'), jenis: 'ACCOUNT', action: 'ACCOUNT_REGISTER' })).toBe(
      '/admin/pengguna?kelompok=DOSEN_STAF',
    );
  });
});
