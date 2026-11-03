# Persetujuan dan penerbitan terpisah - 2026-11-04

Semua produk hukum dan SOP Permohonan SK memakai persetujuan dahulu, lalu
penerbitan melalui tindakan terpisah. Admin mengajukan miliknya; hanya
Superadmin yang memutuskan. Superadmin dapat menyetujui draf miliknya sendiri,
kemudian meninjau dampak dan menerbitkan. Approve tidak lagi menerbitkan SOP.
Payload approve dengan konfirmasi penerbitan ditolak shared contract; legal
impact/publish sebelum DISETUJUI ditolak backend.

Format Persuratan memakai PENDING_REVIEW -> APPROVED -> ACTIVE. Semua unggahan,
termasuk Superadmin, menunggu persetujuan. Setujui menyimpan verified_by dan
approved_at; Terbitkan mengaktifkan file serta menggantikan pointer versi publik
secara atomik. Versi lama tetap tersedia selama unggahan/approval baru. Kedua
tindakan khusus Superadmin aktif dengan templates.manage, CSRF dan audit.
Tinjauan file tersedia melalui endpoint panel terotorisasi. File/checksum
diperiksa ulang saat approval dan publish. Penggantian kandidat yang belum
terbit mengarsipkan kandidat tersebut dan mengharuskan persetujuan versi baru.
Riwayat unggahan tetap disimpan.

## Deployment

Pada database V2 lama, jalankan berurutan:

1. database/v2/patch-022-verifikasi-format-persuratan.sql
2. database/v2/patch-023-persetujuan-penerbitan-terpisah.sql
3. Deploy/restart backend dan frontend dari commit yang sama.

Jangan impor ulang schema/seed pada database berisi data. Publikasi lama tidak
dihapus atau ditarik oleh migrasi; metadata persetujuan lama boleh kosong,
sedangkan publikasi baru wajib melalui approval aplikasi. Instalasi fresh memakai
schema.sql yang sudah memuat status dan constraint baru. Patch diuji berulang
pada database uji yang memiliki data; tidak menurunkan APPROVED kembali menjadi
PENDING_REVIEW/ACTIVE.

Migrasi lokal di jdih_ith_v2_dev port 3308 mempertahankan 9 dokumen, 9 versi,
6 format/versi dan 10 pengguna. Berkas unggahan tidak diubah/dihapus.

## Verifikasi

- 79 tes shared lulus, termasuk enum status format dan penolakan payload gabungan.
- Suite backend penuh: 400 tes lulus; 68 tes alur terkait dijalankan ulang setelah
  shared contract diperketat, termasuk MySQL dengan upload/storage nyata.
- Suite frontend penuh: 262 tes lulus; 41 tes halaman terkait lulus setelah revisi.
- Integrasi mencakup Admin/Superadmin, persetujuan sendiri, publikasi terpisah,
  versi lama tetap current, checksum gagal, rollback audit dan publish bersamaan.
- Typecheck tanpa cache, lint dan build produksi workspace lulus.
- Validator statis: 29 tabel, 49 FK, 33 CHECK, 25 unique secondary indexes.
- Browser memakai sesi lokal nyata dan fixture respons khusus browser untuk
  memeriksa status pending/approved pada lebar 390/1440px. Tombol Setujui dan
  Terbitkan terpisah bagi Superadmin; tidak tersedia bagi Admin, tanpa overflow.
  Pemeriksaan visual tidak membuat/mengubah file di database lokal.

Perubahan beranda berdasarkan sesi dari pekerjaan sebelumnya dipertahankan:
regulasi terbaru dan jumlah mengikuti Publik saja untuk anonim/pending, serta
Publik + Internal bagi akun aktif yang berhak. Request privat/public tidak
berbagi cache atau promise yang sama.
