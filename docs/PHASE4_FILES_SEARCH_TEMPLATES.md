# Phase 4 — Berkas, Search, dan Format Persuratan

Phase 4 menambahkan backend files/search/template di atas schema V2 yang telah
disetujui. Physical `database/v2/schema.sql` dan `seed.sql` tidak berubah.

## Storage

`StorageService` adalah batas yang digunakan domain service. `LocalStorageDriver`
menyimpan object privat di `STORAGE_LOCAL_PATH`; tidak ada direktori static atau
URL filesystem yang dikirim ke client. Storage key acak hanya digunakan backend.
Kontrak abstraksi mencakup stage, finalize, open stream, exists, verify, discard,
dan delete. Driver S3/MinIO belum dibuat; konfigurasi driver selain `lokal` gagal
tertutup saat aplikasi mulai.

Multipart diterima ke direktori `.staging/incoming` di bawah root privat dengan
batas `UPLOAD_MAX_SIZE_MB`. File diperiksa signature dan jenis container sebelum
disalin ke staging object; SHA-256 serta ukuran dihitung saat aliran disimpan.
V1 menerima PDF untuk Produk Hukum (UTAMA dan LAMPIRAN), dan DOCX untuk Format
Persuratan. Pemeriksaan DOCX memastikan ZIP tidak terenkripsi/multidisk dan
memiliki `[Content_Types].xml` serta `word/document.xml`; file tidak diekstrak.

## Upload dan konsistensi transaksi

Upload Produk Hukum memakai `documents.upload` dan hanya menerima versi DRAF atau
REVISI. Satu row UTAMA dijamin unique constraint database; LAMPIRAN dapat banyak.
Sejarah versi tidak ditimpa.

Pola simpan: validasi dahulu, tulis object sementara, mulai transaksi, lock row
versi/template, tulis metadata dan audit, lalu rename object ke lokasi final
sebelum commit DB. Error transaksi menghapus staging/final object dan rollback
metadata. Ini menjaga error normal agar tidak meninggalkan row tanpa file atau
file final tanpa row. Pemutusan proses/mesin pada celah rename-commit masih dapat
meninggalkan object yatim; reconciliation/sweeper operasional belum tersedia.
Jangan hapus object berdasarkan tebakan; gunakan pemeriksaan referensi DB.

Publish mengunci dokumen dan versi seperti Phase 3, lalu membaca row UTAMA dan
memverifikasi object exists, ukuran, serta SHA-256 secara streaming sebelum
mengubah current pointer. File yang hilang/berubah membatalkan transaksi. Tidak
ada file yang dimuat seluruhnya ke memory.

## Akses dan streaming

Setiap permintaan file mencari ulang pasangan slug/file pada current version yang
TERBIT dan menjalankan `DocumentPolicyService`; otorisasi halaman sebelumnya tidak
dipakai. Publik dapat preview/download. INTERNAL memerlukan Dosen/Staf AKTIF dan
tidak unit-scoped. RAHASIA memerlukan grant valid atau izin admin; yang tidak
berhak menerima not-found semantics. Akses RAHASIA yang berhasil dicatat audit.

Response menetapkan Content-Type hasil validasi, Content-Length, Content-Disposition,
`X-Content-Type-Options: nosniff`, serta `Cache-Control: private, no-store`.
Preview PDF menggunakan `mode=inline`; download memakai attachment. Nama file
dibersihkan dan dikodekan untuk mencegah header injection. Range request belum
didukung; preview mengirim stream penuh dan tidak melakukan partial response.

## Search dan daftar

Search MySQL metadata meliputi judul, nomor, tahun, tipe, kategori, dan tag; filter
meliputi tipe, tahun, unit, kategori, serta status hukum. Hanya current published
version dari dokumen nondeleted yang ditanyakan. Ranking relevansi memakai kecocokan
metadata bertingkat; tanpa q hasil diurutkan menurut publikasi. PDF full-text,
OCR, Meilisearch, facets, autocomplete, rekomendasi, serta statistik tidak dibuat.

Search anonim mengeluarkan ringkasan penuh PUBLIK dan tepat `{ judul, badge:
"INTERNAL" }` untuk INTERNAL. Redaksi diterapkan setelah query dan divalidasi strict;
endpoint detail/file tetap menolak akses anonim. Semua query/count publik mengecualikan
RAHASIA. Pengguna AKTIF yang eligible dapat melihat INTERNAL; RAHASIA hanya masuk
hasil bila grant belum dicabut, belum kedaluwarsa, atau izin admin yang sesuai.
Daftar publik dan endpoint latest hanya berisi PUBLIK current version.

## Format Persuratan

Template menggunakan `template_surat` sebagai identitas stabil dan
`template_surat_versi` sebagai sejarah berkas. Versi baru mengunci template,
mengarsipkan versi ACTIVE lama, memasukkan DOCX baru, memindahkan pointer, mengaktifkan
template, dan menulis audit dalam satu transaksi. Nomor versi tetap meningkat setelah
template diarsipkan lalu diaktifkan kembali dengan unggahan baru. Archive mengosongkan
current pointer dan mempertahankan semua row/object sejarah.

Daftar publik hanya berisi template PUBLIK (judul dan capability download); Internal
tidak ada di daftar anonim. Dosen/Staf AKTIF dapat melihat/mengunduh Internal.
Unduhan Internal dicatat audit. Tidak ada detail/preview template.

## API

- `POST /api/v1/admin/documents/versions/:versionId/files` — multipart `file`, `jenisBerkas`, opsional `judul`/`urutan`.
- `GET /api/v1/public/documents/:slug/files/:fileId?mode=inline|download` — stream Produk Hukum.
- `GET /api/v1/public/search/documents` — metadata search dan redaksi sesuai sesi.
- `GET /api/v1/public/documents` dan `/api/v1/public/documents/latest` — daftar/latest PUBLIK.
- `POST /api/v1/admin/letter-templates` — buat template dan versi PUBLIK/INTERNAL pertama dengan DOCX.
- `POST /api/v1/admin/letter-templates/:templateId/versions` — unggah versi baru dan aktifkan.
- `POST /api/v1/admin/letter-templates/:templateId/archive` — arsipkan template aktif.
- `GET /api/v1/letter-templates` dan `GET /api/v1/letter-templates/:slug/download` — daftar/unduh sesuai akses.
- `GET /api/v1/admin/letter-templates` — metadata manajemen tanpa storage key.

## Pengujian

Unit tests menggunakan direktori sementara unik di OS temp dan membersihkannya
setelah test. Integration tests menggunakan MySQL `jdih_ith_v2_test` saja dan
storage temp terisolasi. Gunakan `backend/.env.identity.test.local` sebagai sumber
config; harness menolak host non-loopback atau DB selain nama test itu. Jangan
menjalankan tes mutasi pada `jdih_ith_v2_dev`.
