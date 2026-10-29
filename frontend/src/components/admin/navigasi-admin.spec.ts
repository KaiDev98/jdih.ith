import { describe, expect, it } from 'vitest';
import { halamanAdminBolehDibuka, hrefAktif, inisial, jejakHalaman, menuUntuk, peranTampil } from './navigasi-admin';

describe('navigasi admin', () => {
  it.each(['ADMIN', 'SUPERADMIN'])('Upload Dokumen berada di atas Draf dan Pengajuan untuk %s', (peran) => {
    const dokumen = menuUntuk(['documents.read_admin', 'documents.create'], [peran]).find((k) => k.judul === 'Dokumen')!;
    expect(dokumen.butir.map((b) => b.label)).toEqual(['Semua Dokumen', 'Upload Dokumen', 'Draf dan Pengajuan', 'Antrean Verifikasi']);
  });
  it('hanya menampilkan menu sesuai izin dan menyembunyikan kelompok kosong', () => {
    const menu = menuUntuk(['dashboard.read', 'documents.read_admin']);
    expect(menu.map((k) => k.judul)).toEqual(['Umum', 'Dokumen']);
    expect(menu[1]!.butir.map((b) => b.label)).toEqual(['Semua Dokumen', 'Draf dan Pengajuan', 'Antrean Verifikasi']);
  });

  it('memilih butir aktif dengan alamat terpanjang yang cocok', () => {
    const menu = menuUntuk(['dashboard.read', 'documents.read_admin', 'documents.create']);
    expect(hrefAktif('/admin', menu)).toBe('/admin');
    expect(hrefAktif('/admin/dokumen/baru', menu)).toBe('/admin/dokumen/baru');
    expect(hrefAktif('/admin/dokumen/923/ubah', menu)).toBe('/admin/dokumen');
  });

  it('membuka seluruh menu informasi bagi Admin tanpa menonaktifkan navigasi', () => {
    const menu = menuUntuk(
      ['dashboard.read', 'documents.read_admin', 'documents.create', 'documents.edit'],
      ['ADMIN'],
    );
    expect(menu.map((k) => k.judul)).toEqual(['Umum', 'Dokumen', 'Data Master', 'Layanan', 'Sistem']);
    const semua = menu.flatMap((k) => k.butir);
    expect(semua.every((b) => !b.disabled)).toBe(true);
    expect(halamanAdminBolehDibuka('/admin/dokumen/12/ubah', ['ADMIN'])).toBe(true);
    expect(semua.some((b) => b.label === 'SOP Permohonan SK')).toBe(false);
    expect(semua.some((b) => b.label === 'Audit')).toBe(false);
    expect(halamanAdminBolehDibuka('/admin/sop-permohonan-sk', ['ADMIN'])).toBe(false);
    expect(halamanAdminBolehDibuka('/admin/sop-permohonan-sk/baru', ['ADMIN'])).toBe(false);
    expect(halamanAdminBolehDibuka('/superadmin/sop-permohonan-sk', ['ADMIN'])).toBe(false);
    expect(halamanAdminBolehDibuka('/admin/dokumen/verifikasi', ['ADMIN'])).toBe(true);
    expect(halamanAdminBolehDibuka('/admin/sop-permohonan-sk', ['SUPERADMIN'])).toBe(true);
    expect(halamanAdminBolehDibuka('/admin/audit', ['ADMIN'])).toBe(false);
    expect(halamanAdminBolehDibuka('/superadmin/audit', ['ADMIN'])).toBe(false);
    expect(halamanAdminBolehDibuka('/superadmin/audit', ['SUPERADMIN'])).toBe(true);
    expect(menuUntuk(['audit.read'], ['ADMIN']).flatMap((k) => k.butir).some((b) => b.label === 'Audit')).toBe(false);
  });

  it('mempertahankan namespace Superadmin pada menu, halaman aktif, dan breadcrumb', () => {
    const menu = menuUntuk(['documents.read_admin'], ['SUPERADMIN']);
    expect(menu.flatMap((k) => k.butir).every((b) => b.href.startsWith('/superadmin'))).toBe(true);
    expect(menu.flatMap((k) => k.butir).find((b) => b.label === 'Audit')?.href).toBe('/superadmin/audit');
    expect(menu.flatMap((k) => k.butir).find((b) => b.label === 'SOP Permohonan SK')?.href)
      .toBe('/superadmin/sop-permohonan-sk');
    expect(hrefAktif('/superadmin/dokumen/12', menu)).toBe('/superadmin/dokumen');
    expect(jejakHalaman('/superadmin/kategori')).toEqual([
      { label: 'Dasbor', href: '/superadmin' },
      { label: 'Kategori SOP', href: '/superadmin/kategori' },
    ]);
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
    expect(jejakHalaman('/admin/sop-permohonan-sk/baru').map((j) => j.label)).toEqual([
      'Dasbor',
      'SOP Permohonan SK',
      'Unggah dokumen',
    ]);
    // "baru" di bawah Dokumen tetap berlabel umum.
    expect(jejakHalaman('/admin/dokumen/baru').at(-1)?.label).toBe('Upload dokumen');
  });

  it('membedakan Superadmin dan Admin, serta membuat inisial', () => {
    expect(peranTampil(['ADMIN', 'SUPERADMIN'])?.teks).toBe('Superadmin');
    expect(peranTampil(['ADMIN'])?.teks).toBe('Admin');
    expect(peranTampil(['DOSEN_STAF'])).toBeNull();
    expect(inisial('Akun Simulasi Penginput')).toBe('AP');
    expect(inisial('Rektor')).toBe('R');
  });
  for (const role of ['ADMIN', 'SUPERADMIN']) {
    for (const [segmen, label] of [['verifikasi', 'Antrean verifikasi'], ['pengajuan', 'Draf dan pengajuan']]) {
      it(`detail ${segmen} tetap menandai daftar asal dan breadcrumb bagi ${role}`, () => {
        const root = role === 'ADMIN' ? '/admin' : '/superadmin';
        const menu = menuUntuk(['documents.read_admin'], [role]);
        expect(hrefAktif(`${root}/dokumen/${segmen}/970`, menu)).toBe(`${root}/dokumen/${segmen}`);
        expect(jejakHalaman(`${root}/dokumen/${segmen}/970`)).toEqual([
          { label: 'Dasbor', href: root },
          { label, href: `${root}/dokumen/${segmen}` },
          { label: 'Detail dokumen', href: `${root}/dokumen/${segmen}/970` },
        ]);
      });
    }
  }
});
