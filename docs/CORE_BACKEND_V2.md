# Core Backend JDIH ITH V2

Backend Core Phase 3 berjalan pada NestJS di atas V2 MySQL. Physical schema tetap
`database/v2/schema.sql`; modul tidak menjalankan migration, Drizzle push, atau
perubahan schema saat startup. Kontrak body berasal dari `@jdih/shared` dan
authorization diperiksa kembali oleh service, selain global `IdentityGuard`.

## Endpoint yang tersedia

Semua endpoint admin memakai prefix `/api/v1/admin` dan session akun aktif.

| Area | Endpoint | Izin |
| --- | --- | --- |
| Master | `GET/POST /master/{unit_kerja,jenis_dokumen,kategori,tag}` | `units.manage` atau `master.manage` |
| Master | `GET/PATCH /master/:table/:id`; `PATCH /master/:table/:id/status` | izin master terkait |
| Dokumen | `POST /documents`; `GET/PATCH /documents/:id` | create/read_admin/edit |
| Versi | `POST /documents/:id/versions`; `PATCH /documents/versions/:versionId` | revise/edit |
| Workflow | `POST /documents/versions/:id/{submit,return,approve,publish}` | izin workflow terkait |
| Dampak hukum | `GET /documents/versions/:id/legal-impact` | `workflow.publish` |
| Penarikan | `POST /documents/:id/withdraw` | `workflow.withdraw` |
| Relasi | `GET/POST /versions/:id/relations`; `DELETE /versions/:id/relations/:relationId` | read_admin/manage_relations |
| Secret | `GET/POST /documents/:id/secret-grants`; `POST .../:grantId/revoke` | `secret.manage` |
| Detail terbit | `GET /api/v1/documents/:slug` | policy publik/internal/rahasia |

Master yang dipakai dokumen tidak dapat di-hard-delete. Kategori, jenis, dan unit
dapat dinonaktifkan; tag tidak memiliki status aktif pada schema dan hanya dapat
diubah. Set kategori/tag mengganti assignment versi itu saja.

## Transaksi dan policy

Mutasi domain memakai transaksi MySQL dan audit domain di transaksi yang sama.
Workflow mengunci row versi sebelum transisi. Nomor revisi dialokasikan sesudah
lock identitas dokumen. Publish mengunci dokumen lalu versi, memastikan versi
memiliki metadata berkas `UTAMA` di database, memeriksa ulang dampak target dalam
urutan ID, memindahkan pointer dan menandai versi sebelumnya superseded,
menerapkan status hukum hanya dari konfirmasi manusia, menulis riwayat serta
audit. Publish dan penulisan metadata berkas harus memakai lock row versi yang
sama. Withdraw memakai urutan lock dokumen lalu versi, menghapus pointer aktif,
dan tidak memulihkan versi superseded ataupun status hukum target.

Grant Secret mengunci dokumen sebelum akun dan grant, hanya untuk Dosen/Staf
aktif dan dokumen yang memiliki versi Rahasia. Grant aktif ganda ditolak; grant
yang kedaluwarsa ditutup sambil menyimpan riwayat sebelum grant baru dibuat.
Policy detail memakai `DocumentPolicyService`; Secret yang tidak berhak tetap
menghasilkan not-found.

## Batas fase

Phase 3 menjamin keberadaan metadata row `dokumen_berkas` jenis `UTAMA` saat
publish. Phase 4 juga memverifikasi object, ukuran, dan checksum sebelum current
pointer berpindah. Endpoint detail mengembalikan enam metadata hukum yang
disetujui beserta capability metadata file setelah policy lulus; setiap stream
memeriksa ulang policy. Search metadata dan runtime Format Persuratan ditambahkan.
Detail arsitektur, endpoints, kegagalan transaksi, dan limitasi ada di
`docs/PHASE4_FILES_SEARCH_TEMPLATES.md`. Range request PDF belum didukung dan
storage S3/MinIO belum diimplementasikan. Audit browser serta UI
konfirmasi/progress/feedback tetap di luar phase ini. Semua write tetap harus
mendapat confirmation dan feedback saat UI diimplementasikan.

Technical debt: beberapa query dynamic SQL dan hasil row mysql2 masih memakai
lint suppression terlokalisasi; suppression ini belum direstrukturisasi pada
corrective pass ini.

## Pengujian MySQL

Integration tests hanya memakai `jdih_ith_v2_test`. Dari root repository:

```powershell
npm run test:mysql:prepare --workspace @jdih/api
$env:IDENTITY_TEST_ENV = (Resolve-Path apps/api/.env.identity.test.local).Path
npm run test:mysql --workspace @jdih/api
Remove-Item Env:IDENTITY_TEST_ENV
```

Preparation memverifikasi loopback, MySQL 8.4.x dan nama database sebelum
mengosongkan tabel lalu mengimpor schema/seed V2. API Vitest menserialisasi test
file agar dua integration suites tidak saling mengubah fixture bersama.
