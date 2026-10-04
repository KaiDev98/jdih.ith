# Frontend JDIH ITH V2

Frontend Phase 5 menggunakan Next.js App Router, React, TypeScript, dan paket kontrak `@jdih/shared`. Implementasi berada di `apps/web` dan memakai API NestJS melalui same-origin `/api/v1`; kredensial sesi tetap berupa cookie HttpOnly dan tidak disimpan di browser storage.

## Rute

Rute publik meliputi beranda, profil, pencarian dan detail produk hukum, format persuratan, masuk Google, serta penyelesaian pendaftaran DOSEN/STAF. Pencarian anonim hanya merender dokumen publik sebagai tautan detail dan dokumen Internal sebagai teks `judul + badge`; hasil Rahasia tidak mempunyai shape anonim. Dokumen Internal dapat dibuka setelah autentikasi dan pemeriksaan backend.

Rute akun menampilkan status pengguna. `DOSEN_STAF + MENUNGGU_VERIFIKASI` belum memiliki akses Internal. `DOSEN_STAF + AKTIF` baru eligible; server tetap menjadi satu-satunya enforcement otorisasi. Login Admin juga memakai Google, tidak tersedia operasi UI untuk membuat atau mempromosikan Admin. Backend menolak/mencabut sesi DITOLAK/NONAKTIF tanpa endpoint anonim pencarian status berdasar email; UI mempertahankan pesan akses/sesi tidak tersedia yang umum dan fail-closed.

Panel administrasi menampilkan modul sesuai permission sesi dan mendukung daftar pendaftaran pending, keputusan approve/reject, master unit/jenis/kategori/tag, daftar semua versi dokumen admin dengan filter workflow, antrean DIAJUKAN, pembuatan draf, metadata detail, upload file, aksi workflow, tinjauan dampak relasi hukum, grant Rahasia dengan pencarian DOSEN_STAF AKTIF, daftar audit teredaksi, dan manajemen template. Operasi write/high-impact meminta konfirmasi, menampilkan keadaan proses, dan mengembalikan feedback.

## Query API yang digunakan

- `GET /api/v1/admin/documents` — daftar versi dengan pencarian dan filter `statusWorkflow`; izin `documents.read_admin`.
- `GET /api/v1/admin/documents/verification-queue` — antrean `DIAJUKAN`; izin `workflow.approve` atau `workflow.return`.
- `GET /api/v1/admin/active-users?q=...` — pencarian terbatas pada DOSEN/STAF AKTIF; izin `secret.manage`.
- `GET /api/v1/admin/audit` — pagination dan filter modul; izin `audit.read`. Hanya actor name, module/action, tipe/ID entitas, dan waktu yang diproyeksikan; before/after payload, request id, IP, user agent, dan kredensial tidak dikirim ke UI.
- `GET /api/v1/public/master/{jenis_dokumen,kategori,unit_kerja}` — daftar ID + label nama untuk pilihan pencarian, hanya record aktif.

## Batas API yang diketahui

Backend belum menyediakan dashboard aggregate counts, daftar/pengelolaan semua akun aktif untuk activation/deactivation, endpoint status akun anonim, atau lookup nama dokumen untuk picker target relasi. Karena itu:

- dasbor tidak menampilkan angka agregat yang belum diberikan API.
- menu pengguna hanya menangani antrean pending dan tidak membuat affordance aktivasi/deaktivasi akun aktif.
- sesi DITOLAK/NONAKTIF ditampilkan sebagai akses/sesi yang tidak tersedia secara umum, tanpa mengungkap status berdasarkan email.

Context pack mencantumkan `assets/Logo_ith_pare.png`, namun file itu adalah foto gedung dengan lambang pada papan, bukan logo mark tersendiri; tidak digunakan sebagai logo header. Header mempertahankan fallback wordmark ITH.

Backend memvalidasi izin dan state untuk setiap operasi. Penyembunyian menu pada UI hanya membantu navigasi, bukan pengganti otorisasi API. Preview, download, dan stream memanggil endpoint API yang melakukan otorisasi ulang; frontend tidak membaca storage key atau path filesystem.

## Pengujian dan pekerjaan lanjutan

Vitest mencakup rendering hasil Internal anonim tanpa tautan, strict rejection atas field tambahan, ketiadaan hasil Rahasia anonim, konfirmasi tindakan, lookup label master, dan pencegahan akses Internal untuk akun pending. Integration query backend yang memakai MySQL hanya dijalankan dengan database test terisolasi `jdih_ith_v2_test`.
