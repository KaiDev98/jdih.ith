# Kepemilikan unggahan dan Antrean Verifikasi

Revisi 2026-11-04 ini menggantikan pengelolaan Format Persuratan lintas Admin.
Admin hanya mengelola format yang dibuatnya. Superadmin tetap dapat mengelola
seluruh unggahan. SOP Permohonan SK tetap mengikuti pemeriksaan pemilik dokumen,
versi dan berkas; Admin lain tidak dapat mengubah, membuat revisi, mengunggah,
menghapus berkas draf atau mengajukan milik orang lain.

## Format Persuratan

- Semua unggahan, termasuk Superadmin, masuk PENDING_REVIEW.
- Persetujuan dilakukan pada bagian Format Persuratan di Antrean Verifikasi.
  Pengelolaan format hanya menaut ke antrean, tanpa tombol Setujui.
- GET `/api/v1/admin/letter-templates/verification-queue` berhalaman,
  PENDING_REVIEW saja. Admin menerima miliknya; Superadmin seluruh pengajuan.
  Respons tidak memuat email, checksum atau storage key.
- Setujui khusus Superadmin aktif dengan templates.manage, CSRF, validasi file
  dan audit. Status menjadi APPROVED lalu keluar dari antrean, belum terbit.
- Terbitkan tetap aksi Superadmin tersendiri pada pengelolaan format.
- Admin pemilik tidak dapat mengganti APPROVED sebelum penerbitan maupun
  menghapus format APPROVED/terbit. Unggah revisi setelah terbit membuat kandidat
  baru tanpa mengganti versi publik sampai persetujuan/penerbitan selesai.
- Daftar pengelolaan, unggah versi, hapus dan unduh tinjauan memeriksa pemilik
  di server. Mengakses ID akun lain tidak membuka hak pengelolaan.
- Hapus tetap memakai deleted_at dan audit, tanpa menghapus riwayat versi.

Antrean dokumen hukum/SOP tetap dapat dibaca Admin sesuai kebijakan sebelumnya;
seluruh tindakan keputusan hanya Superadmin. Akses baca antrean bukan izin ubah.

## Master

Formulir tambah Kategori SOP dan Jenis Dokumen dihapus. POST master untuk kedua
tabel ditolak juga bagi Superadmin; PATCH data yang sudah ada, perubahan status
dan pilihan pada formulir dokumen tetap tersedia. Kategori/unit/jenis lama tidak
dihapus. Sinkronisasi kategori ke unit saat pengubahan tetap berlaku.

## Validasi

- 80 tes shared, 413 backend dan 273 frontend lulus.
- Integrasi MySQL memakai database pengujian terpisah, mencakup dua Admin,
  perubahan ID, larangan keputusan meski memiliki izin langsung, antrean hanya
  pending, keputusan yang dikunci, versi publik tetap current dan rollback audit.
- Tes HTTP CSRF/perizinan serta regresi SOP Permohonan SK tetap lulus.
- Typecheck workspace, lint dan build produksi lulus. Tes UI terkait dijalankan
  ulang setelah perapian header ponsel.
- Enam pemeriksaan browser dengan sesi nyata pada 390/1440px lulus tanpa
  overflow. Fixture respons hanya pada browser; tidak menambah/menghapus berkas
  aplikasi. Setujui hanya di antrean Superadmin, Terbitkan hanya pada pengelolaan
  untuk versi disetujui; kontrol Admin atas format disetujui/terbit terkunci.
- API lokal nyata diperiksa pada dua peran: daftar Admin sesuai pemilik, daftar
  Superadmin lintas pemilik, antrean hanya PENDING_REVIEW; health siap 200.

Tidak memerlukan migrasi baru. Deploy backend dan frontend dari commit yang
sama; database lama tetap memerlukan patch workflow 022 lalu 023 yang sudah
dijelaskan di WORKFLOW_APPROVAL_PUBLICATION_2026-11-04.md. Tidak menjalankan
reset, impor ulang seed atau purge unggahan.
