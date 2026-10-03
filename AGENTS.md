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
- Backend domain modules pada `apps/api/src/modules/` masih belum diimplementasikan; baru ada `README.md`.
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
- Dosen/Staf tidak memakai password lokal; login Google `@ith.ac.id`.
- Mahasiswa `@mahasiswa.ith.ac.id` tidak mendapat akses internal.
- Tidak ada pembuatan/promosi Admin/Superadmin lewat UI.
- Dokumen INTERNAL tidak dibatasi unit; semua Dosen/Staf aktif dapat mengakses.
- Dokumen RAHASIA memakai explicit user grant.
- Tidak ada halaman Statistik publik.
- Menu publik `Informasi Hukum` diganti menjadi `Format Persuratan`.
- V1 tidak memerlukan berita, banner, FAQ, layanan hukum, full-text PDF, OCR, Meilisearch, JDIHN, atau public external API.
- Workflow dokumen tidak memiliki state `ditolak`.
- Status hukum hanya `berlaku`, `diubah`, `dicabut`.

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
