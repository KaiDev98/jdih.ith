# AGENTS.md — JDIH ITH V2

## WAJIB DIBACA SEBELUM MENGUBAH KODE

Project ini adalah Portal **JDIH ITH Parepare** (Jaringan Dokumentasi dan Informasi Hukum — Institut Teknologi Bacharuddin Jusuf Habibie).

Sebelum melakukan perubahan apa pun:

1. Baca `CODEX_START_HERE.md`.
2. Baca seluruh `docs/CODEX_CONTEXT_JDIH_ITH_V2.md`.
3. Baca `docs/CODEX_DECISIONS_JDIH_ITH_V2.yaml`.
4. Baca `docs/CODEX_IMPLEMENTATION_PLAN.md`.
5. Audit source yang ada dan bandingkan dengan V2.
6. Jika ada konflik antara dokumen lama repo dan dokumen V2 ini, **V2 adalah sumber kebenaran desain terbaru**.
7. Jangan mengimplementasikan fitur besar yang belum diminta hanya karena ada di dokumen legacy.

## STATUS REPO SAAT CONTEXT PACK DIBUAT

- Repository: `KaiDev98/jdih.ith`
- Default branch: `nesta`
- Commit terakhir yang diamati: `4e12664540013562e2fc5d30d5afb6cdbffdb527`
- Pesan commit: `chore: add JDIH ITH portal setup`
- Tanggal commit: 2026-09-28
- Backend NestJS aktif berada di `backend/`, frontend Next.js di `frontend/`, dan shared contracts tetap berada di `packages/shared/`.
- Foundation NestJS/Next.js/Drizzle/Zod sudah ada dan **boleh dipakai kembali**.
- Branch `niyato` pernah diverifikasi identik dengan `nesta`; cek ulang sebelum memakai branch tersebut.

Jangan berasumsi status repo tetap sama. Selalu jalankan `git status`, cek branch, dan baca perubahan terbaru sebelum coding.

## SUMBER KEBENARAN

Urutan prioritas:

1. Instruksi eksplisit user terbaru.
2. `docs/CODEX_CONTEXT_JDIH_ITH_V2.md`.
3. `docs/CODEX_DECISIONS_JDIH_ITH_V2.yaml`.
4. Diagram Whimsical V2 yang ditautkan di context.
5. Source code foundation yang tidak konflik dengan V2.
6. Dokumen legacy di `docs/` dan schema 50 tabel lama — hanya referensi historis.

## HAL YANG SECARA TEGAS SUDAH DIGANTI

Jangan membangun berdasarkan asumsi legacy berikut:

- Bukan Laravel/Blade/Livewire/Filament. Stack final adalah NestJS + Next.js.
- Database 50 tabel lama **bukan target final**.
- Tingkat akses bukan 4 level. V2 hanya:
  - `publik`
  - `internal`
  - `rahasia`
- Tidak ada `terbatas`.
- Dosen/Staf dapat mendaftar dan masuk dengan email/password dari domain apa pun;
  Google hanya `@ith.ac.id`. Semua akun baru menunggu verifikasi Superadmin.
- Google `@mahasiswa.ith.ac.id` ditolak; kelayakan pendaftar email/password
  untuk akses internal diperiksa Superadmin, bukan diberikan otomatis dari domain.
- Tidak ada pembuatan/promosi Admin/Superadmin lewat UI.
- Dokumen INTERNAL tidak dibatasi unit; semua Dosen/Staf aktif dapat mengakses.
- Dokumen RAHASIA memakai explicit user grant.
- Tidak ada halaman Statistik publik.
- Menu publik `Informasi Hukum` diganti menjadi `Format Persuratan`.
- V1 tidak memerlukan berita, banner, FAQ, layanan hukum, full-text PDF, OCR, Meilisearch, JDIHN, atau public external API.
- Workflow dokumen tidak memiliki state `ditolak`.
- Status hukum hanya `berlaku`, `diubah`, `dicabut`.

## REVISI SOP PERMOHONAN SK ? 2026-10-30

Instruksi eksplisit terbaru user menggantikan larangan Admin atas SOP Permohonan
SK dalam revisi lama di bawah. Admin aktif boleh membuat, mengunggah, memperbaiki
dan mengajukan SOP Permohonan SK miliknya sesuai unit/kategori. Menu, pintasan,
halaman, API, detail, berkas dan notifikasi tersedia. Daftar/draf tetap milik
sendiri; antrean dapat dibaca lintas pembuat. Hanya Superadmin yang memverifikasi,
mengembalikan, menyetujui dan menerbitkan; SOP khusus langsung terbit ketika
persetujuan atomik berhasil. Batas kepemilikan, CSRF, audit, validasi dan izin
keputusan server-side tetap wajib. Pemindahan koleksi SOP lama tetap Superadmin.
Tombol hapus permanen Superadmin terlihat langsung, tanpa mengetik judul/nama
file; konfirmasi singkat, loading, feedback dan anti klik ganda tetap berlaku.

## REVISI AUTENTIKASI — 2026-10-26

- `/masuk` menyediakan email/password untuk Dosen/Staf; `/daftar` menerima
  email ITH maupun email pribadi. Unit dipilih/diusulkan untuk verifikasi.
- Akun baru hanya `DOSEN_STAF` + `MENUNGGU_VERIFIKASI`; tidak menerima pilihan
  peran/status dari klien. Pending boleh masuk dan membaca profil/dokumen publik;
  akses internal hanya setelah Superadmin menyetujui. Penonaktifan mencabut sesi.
- Google wajib memvalidasi email dan klaim `hd` tepat `ith.ac.id`; wildcard
  dilarang. Jangan menautkan akun lokal dengan Google hanya dari kesamaan email.
- Login Admin dan Superadmin tetap pada endpoint/jalur peran masing-masing.
- Revisi tampilan terbaru: daftar Dosen/Staf menampilkan Nama, Email, Peran, Unit dan Status;
  data unit untuk proses verifikasi tidak dihapus. Filter Tahun dan Kategori
  berada sebelum Jenis Produk Hukum pada desktop maupun ponsel.

## REVISI PENGAJUAN — 2026-10-23 (MENGGANTIKAN ATURAN TERKAIT DI BAWAH)

- Semua Dokumen hanya berisi versi DISETUJUI/TERBIT/DITARIK. Draf dan Pengajuan
  menampung DRAF/REVISI/DIAJUKAN; Antrean Verifikasi hanya DIAJUKAN.
- Pengajuan wajib lengkap: judul, deskripsi, nomor, tahun, PIC, tanggal penetapan,
  akses, kategori dan tepat satu file UTAMA yang tersedia serta checksum valid.
  Tidak ada unggahan lampiran terpisah; gabungkan dalam file utama. Riwayat lama dipertahankan.
- Superadmin dapat meninjau file versi belum terbit melalui API panel terotorisasi.
- Alasan persetujuan opsional; alasan pengembalian wajib. Admin melihat alasan yang diisi di detail dan
  notifikasi panel; Superadmin menerima notifikasi pengajuan. Pengembalian memakai
  REVISI agar dapat diajukan ulang, bukan menambah state DITOLAK.
- Klarifikasi terbaru 2026-10-23: SOP Permohonan SK hanya untuk Superadmin.
  Sembunyikan menu, pintasan, pencarian, daftar, antrean, dan notifikasinya dari Admin;
  blokir halaman/API langsung. Admin tetap boleh mengajukan SOP biasa sesuai unit.
- Antrean verifikasi dapat dibaca lintas pembuat oleh Admin (kecuali SOP Permohonan SK);
  semua tindakan verifikasi tetap khusus Superadmin. Daftar/draf Admin tetap milik sendiri.
- Login uji lokal dijalankan dengan `npm run dev` (frontend produksi memang menyembunyikannya);
  backend tetap memerlukan LOGIN_UJI=true dan menolak mode uji pada produksi.
- Nama kategori/unit menjadi Komisi Etik Kemahasiswaan dan Laboratorium; kode dan ID tetap.
- Dashboard Admin maupun Superadmin tidak menampilkan atau mengambil aktivitas
  audit. Halaman/menu Audit terpisah tetap hanya untuk Superadmin yang berizin.
- Notifikasi Superadmin hanya SUBMIT terbaru per versi yang masih DIAJUKAN.
  Keputusan APPROVE/RETURN dengan alasan ditujukan ke Admin pemilik. Pengembalian
  tetap REVISI; setelah diperbaiki dan diajukan ulang, muncul pengajuan baru dengan
  ID workflow baru. Pengajuan yang sudah diproses hilang dari inbox Superadmin.
- Popup panel memakai Dialog Radix melalui portal, permukaan putih, latar terang
  transparan dan animasi singkat. Hindari overlay hitam; konfirmasi, fokus keyboard,
  loading, success/error serta pencegahan klik ganda tetap wajib.

## REVISI HAK AKSES ADMIN — 2026-10-20

Instruksi user terbaru menggantikan aturan V2 lama yang memberi Admin kewenangan
verifikasi dan pengelolaan global:

- Admin hanya boleh membuat, mengubah, mengunggah, dan mengajukan dokumen/versi
  yang dibuatnya sendiri.
- Admin hanya boleh memilih kategori yang dipetakan ke unit kerja akunnya; backend
  wajib memeriksa unit dan kepemilikan ulang saat menyimpan.
- Hanya Superadmin yang memverifikasi, mengembalikan, menyetujui, menerbitkan, atau
  menarik dokumen, termasuk mengelola SOP Permohonan SK, akun, master data,
  dan pengaturan global lainnya.
- Menu dan halaman global dapat diklik dan dibuka Admin untuk membaca informasi.
  Tombol dan formulir perubahan dinonaktifkan; navigasi, pencarian, filter, dan
  tinjauan informasi tetap aktif. Backend memberi akses baca tanpa izin perubahan.
- Pengecualian: SOP Permohonan SK hanya tersedia di panel Superadmin. Menu,
  pintasan, pencarian cepat, halaman, dan API pengelolaannya tidak tersedia bagi
  Admin. Halaman SOP yang sudah terbit pada portal publik tetap tersedia.
- Audit hanya tersedia untuk Superadmin aktif dengan izin `audit.read`: sembunyikan
  menu, hasil pencarian cepat, serta aktivitas dashboard dari Admin; tolak akses
  halaman dan API langsung, termasuk bila Admin diberi izin langsung `audit.read`.
- Pengecualian Format Persuratan (instruksi terbaru): semua Admin dan Superadmin
  dapat membuat, mengunggah versi baru, mengaktifkan, dan mengarsipkan seluruh
  template, termasuk milik akun lain. Izin `templates.manage`, akun aktif,
  konfirmasi tindakan, dan audit tetap wajib. Batas kepemilikan dokumen hukum
  dan kewenangan verifikasi tidak berubah.
- Panel Admin memakai `/admin`; panel Superadmin memakai `/superadmin`. Login,
  tautan, breadcrumb, dan navigasi mengikuti peran. API tetap `/api/v1/admin`.
- Pembatasan UI tidak menggantikan otorisasi server-side.
- Email akun lain pada panel Admin biasa disensor pada respons API daftar,
  antrean dan detail pengguna. Revisi user 2026-10-21: email akun sendiri tampil
  lengkap pada sesi, menu, profil dan daftar akun (cocokkan ID pemilik dengan ID
  sesi). Superadmin melihat semua email lengkap. Principal internal dan login
  tetap memakai email asli; penyensoran tidak mengubah identitas yang tersimpan.

## ATURAN IMPLEMENTASI

- Backend: NestJS + TypeScript.
- Frontend: Next.js + React + TypeScript.
- API: REST `/api/v1`.
- Database target: MySQL 8.
- Development DB target: Docker Compose MySQL 8 dengan host port `3307`.
- ORM/data access: Drizzle, tetap SQL-first.
- Shared contract: Zod di `packages/shared`; jangan menduplikasi schema dengan class-validator.
- Controller tidak boleh mengandung business logic.
- Service menyimpan business rules dan transaction boundaries.
- Repository menyimpan query/data access.
- Semua route tertutup secara default; hanya route publik yang diberi marker/decorator publik.
- Semua write/high-impact action harus mempunyai audit.
- Hak akses file harus dicek ulang ketika download.
- Jangan percaya frontend sebagai security boundary.
- Jangan hard-delete versi dokumen/template normal.
- Jangan membuat microservices; gunakan modular monolith.
- Storage harus melalui abstraction (`StorageService`), local driver di V1 dan S3/MinIO dapat ditambahkan kemudian.

## SECURITY RULES YANG TIDAK BOLEH DILANGGAR

### PUBLIK
- Search publik: tampil.
- Detail: boleh.
- Preview/download: boleh bila versi TERBIT aktif.

### INTERNAL
- Search anonim: tampil **judul + badge INTERNAL saja**.
- Anonim tidak boleh membuka detail/file.
- Semua Dosen/Staf `@ith.ac.id` dengan status akun `AKTIF` dapat melihat detail dan download.
- INTERNAL **tidak menggunakan pembatasan unit**.

### RAHASIA
- Tidak muncul di public search, autocomplete, rekomendasi, sitemap, atau endpoint publik.
- Dosen/Staf hanya dapat melihat bila memiliki explicit grant aktif.
- Jika user yang tidak berhak mencoba resource RAHASIA, respons sebaiknya `404`, bukan membocorkan keberadaan resource dengan `403`.
- Admin/Superadmin dapat mengelola sesuai permission.
- Akses/download RAHASIA harus diaudit.

## WORKFLOW WAJIB

State versi dokumen:

`DRAF -> DIAJUKAN -> REVISI -> DIAJUKAN -> DISETUJUI -> TERBIT -> DITARIK`

Aturan:
- Pembuat versi tidak boleh menyetujui versi yang sama.
- Kembalikan untuk revisi wajib mempunyai catatan.
- Publish harus atomic transaction.
- Versi lama yang sedang TERBIT tetap menjadi current public version ketika revisi baru masih DRAF/DIAJUKAN/DISETUJUI.
- `current_published_version_id` hanya berpindah saat versi baru berhasil publish.
- Versi lama tidak dihapus; isi `superseded_at`.

## POPUP / FEEDBACK UI

Semua action yang mengubah data wajib:
1. Confirmation modal.
2. Loading/progress state.
3. Success feedback.
4. Error feedback.

Termasuk submit, approve, return for revision, publish, withdraw, approve/reject account, upload revision, archive template, grant/revoke secret access, dan logout.

Search, filter, navigasi, dan membuka halaman tidak membutuhkan confirmation popup.

## CARA BEKERJA

Sebelum implementasi task besar:
1. Jelaskan file yang akan diubah.
2. Sebutkan business rule yang terkait.
3. Implementasikan perubahan terkecil yang konsisten.
4. Tambahkan/ubah test.
5. Jalankan typecheck/lint/test yang relevan.
6. Laporkan hasil dan konflik yang ditemukan.

Jangan mengubah schema legacy 50 tabel secara destruktif pada langkah pertama. Buat rancangan/schema V2 terpisah sampai physical schema disetujui atau user secara eksplisit meminta penggantian.
