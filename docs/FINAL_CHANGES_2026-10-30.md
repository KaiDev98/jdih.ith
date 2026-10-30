# Verifikasi perubahan 2026-10-30

## Hasil

- Admin aktif dapat membuat/mengunggah/mengajukan SOP Permohonan SK miliknya.
  Unit/kategori dan kepemilikan diperiksa backend. Admin tidak dapat mengambil
  keputusan meskipun diberi permission langsung. Superadmin meninjau dampak,
  mengembalikan untuk revisi atau menyetujui sekaligus menerbitkan secara atomik.
- Menu, pintasan, pemilih koleksi, detail, berkas dan notifikasi mengikuti aturan
  tersebut. Migrasi koleksi SOP lama tetap khusus Superadmin.
- Backend lokal telah dibangun dan dimulai ulang. Browser memakai sesi Admin
  nyata: daftar SOP mengembalikan HTTP 200 dan halaman unggah menampilkan SOP.
  Pesan Not Found pada proses lama sudah diperbaiki; tersedia tombol coba muat lagi.
- Tombol Hapus permanen langsung terlihat tanpa mengetik judul/nama file.
  Konfirmasi sederhana, CSRF, izin Superadmin, loading, feedback dan anti klik ganda tetap ada.
- SOP biasa memakai lebar 1280px, sama dengan Produk Hukum. Format Persuratan dan
  SOP Permohonan SK tetap memakai lebar koleksi khusus.
- Pemulihan password Dosen/Staf memakai backend, token sekali pakai, audit,
  pencabutan sesi dan SMTP outbox. Aktivasi Gmail memerlukan kredensial privat;
  baca STAFF_PASSWORD_RECOVERY.md. Pengiriman Gmail nyata belum diverifikasi.

## Pembersihan lokal yang diminta user

Operasi satu kali pada jdih_ith_v2_dev, loopback port 3308, dengan lokasi storage
backend/storage/dokumen yang telah diverifikasi berada dalam workspace.
Dihapus: 10 dokumen unggahan, 12 versi, 14 catatan berkas, 4 format surat dengan
5 versi, dan 12 file fisik yang masih ada. Beberapa metadata lama mengarah ke
file yang memang sudah tidak tersimpan. Setelah operasi, seluruh koleksi dan
storage unggahan kosong. Akun 8, unit 17, kategori 14, jenis dokumen 7 tetap
utuh; kunjungan dan audit dipertahankan. Operasi mempunyai audit PURGE_ALL_UPLOADS.

Jenis dokumen, menu, halaman portal dan aset logo tidak dihapus. Pembersihan
bukan bagian migrasi/seed/deployment dan tidak disertakan sebagai script otomatis
ke Git. Push source tidak menghapus data pada server lain.

## Pemeriksaan

- Full workspace: 79 shared, 368 backend dan 248 frontend lulus setelah revisi SOP.
- Tambahan setelah suite penuh: 5 uji keamanan penghapusan dan 7 uji halaman SOP
  termasuk retry lulus. Pengujian konfigurasi SMTP memeriksa TLS, kredensial,
  port, alamat pengirim dan injeksi header. Tiga tes proxy lulus.
- Integrasi SOP Publik/Internal menguji upload file nyata, kategori di luar unit,
  perubahan/pengajuan oleh Admin lain, revisi/pengajuan ulang, notifikasi dan
  persetujuan/publikasi khusus Superadmin. Database dan storage uji terisolasi.
- 13 integrasi pemulihan memakai MySQL dan SMTP loopback; bukan email Gmail nyata.
- Typecheck, lint dan build produksi seluruh workspace lulus.
- Audit npm: 0 vulnerabilities. Validator schema: 29 tabel, 48 FK, 33 CHECK.
- Browser: 10 layout pemulihan 320/390/768/1366/1920px, empat skenario keyboard
  dengan latar/geometri tetap, serta verifikasi SOP dan Produk Hukum 1280px.
- .env.mail.local diabaikan Git; konfigurasi privat tidak termasuk source release.
