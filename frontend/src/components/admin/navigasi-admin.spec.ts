import { describe, expect, it } from 'vitest';
import { hrefAktif, inisial, jejakHalaman, menuUntuk, peranTampil } from './navigasi-admin';

describe('navigasi admin', () => {
  it('hanya menampilkan menu sesuai izin dan menyembunyikan kelompok kosong', () => {
    const menu = menuUntuk(['dashboard.read', 'documents.read_admin']);
    expect(menu.map((k) => k.judul)).toEqual(['Umum', 'Dokumen']);
    expect(menu[1]!.butir.map((b) => b.label)).toEqual(['Semua Dokumen', 'Antrean Verifikasi']);
  });

  it('memilih butir aktif dengan alamat terpanjang yang cocok', () => {
    const menu = menuUntuk(['dashboard.read', 'documents.read_admin', 'documents.create']);
    expect(hrefAktif('/admin', menu)).toBe('/admin');
    expect(hrefAktif('/admin/dokumen/baru', menu)).toBe('/admin/dokumen/baru');
    expect(hrefAktif('/admin/dokumen/923/ubah', menu)).toBe('/admin/dokumen');
  });

  it('menyusun jejak halaman yang mudah dibaca', () => {
    expect(jejakHalaman('/admin').map((j) => j.label)).toEqual(['Dasbor']);
    expect(jejakHalaman('/admin/dokumen/923/ubah')).toEqual([
      { label: 'Dasbor', href: '/admin' },
      { label: 'Dokumen', href: '/admin/dokumen' },
      { label: 'Detail dokumen', href: '/admin/dokumen/923' },
      { label: 'Ubah draf', href: '/admin/dokumen/923/ubah' },
    ]);
    expect(jejakHalaman('/admin/profil').at(-1)?.label).toBe('Pengaturan Profil');
  });

  it('membedakan Superadmin dan Admin, serta membuat inisial', () => {
    expect(peranTampil(['ADMIN', 'SUPERADMIN'])?.teks).toBe('Superadmin');
    expect(peranTampil(['ADMIN'])?.teks).toBe('Admin');
    expect(peranTampil(['DOSEN_STAF'])).toBeNull();
    expect(inisial('Akun Simulasi Penginput')).toBe('AP');
    expect(inisial('Rektor')).toBe('R');
  });
});
