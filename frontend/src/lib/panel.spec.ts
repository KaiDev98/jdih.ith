import { describe, expect, it } from 'vitest';
import { akarPanel, alamatPanel, tautanDetailDokumen } from './panel';

describe('alamat panel per peran', () => {
  it('memisahkan root dan mempertahankan path, query, dan anchor', () => {
    expect(akarPanel(['ADMIN'])).toBe('/admin');
    expect(akarPanel(['ADMIN', 'SUPERADMIN'])).toBe('/superadmin');
    expect(alamatPanel(['SUPERADMIN'], '/admin/dokumen/12?versionId=4#berkas')).toBe('/superadmin/dokumen/12?versionId=4#berkas');
    expect(alamatPanel(['ADMIN'], '/superadmin/kategori')).toBe('/admin/kategori');
  });
  it('tidak mengubah alamat publik, API, atau URL eksternal', () => {
    for (const url of ['/produk-hukum', '/api/v1/admin/documents', '/masuk/admin', 'https://example.com/admin'])
      expect(alamatPanel(['SUPERADMIN'], url)).toBe(url);
  });
  it('mempertahankan konteks antrean/pengajuan dan versi dalam kedua namespace panel', () => {
    for (const role of ['ADMIN', 'SUPERADMIN']) {
      const root = role === 'ADMIN' ? '/admin' : '/superadmin';
      for (const konteks of ['terverifikasi', 'verifikasi', 'pengajuan'] as const) {
        expect(alamatPanel([role], tautanDetailDokumen('5', '50', konteks)))
          .toBe(`${root}/dokumen${konteks === 'terverifikasi' ? '' : `/${konteks}`}/5?versionId=50`);
      }
    }
  });
});
