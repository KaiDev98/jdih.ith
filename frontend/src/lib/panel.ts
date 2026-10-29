/** Alamat panel mengikuti peran; alamat API tetap /api/v1/admin. */
export function akarPanel(peran: readonly string[]) {
  return peran.includes('SUPERADMIN') ? '/superadmin' : '/admin';
}

export function alamatPanel(peran: readonly string[], href: string) {
  return href.replace(/^\/(?:superadmin|admin)(?=\/|\?|#|$)/, akarPanel(peran));
}

export function superadminAktif(pengguna?: { status: string; peran: readonly string[] }) {
  return pengguna?.status === 'AKTIF' && pengguna.peran.includes('SUPERADMIN');
}

export type KonteksDokumen = 'terverifikasi' | 'pengajuan' | 'verifikasi';

/** Pertahankan daftar asal dan versi yang dipilih saat membuka detail. */
export function tautanDetailDokumen(
  id: string,
  versionId: string,
  konteks: KonteksDokumen = 'terverifikasi',
) {
  const induk = konteks === 'terverifikasi' ? '' : `/${konteks}`;
  return `/admin/dokumen${induk}/${encodeURIComponent(id)}?versionId=${encodeURIComponent(versionId)}`;
}
