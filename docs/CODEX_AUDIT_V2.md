# Audit Repository dan Alignment — JDIH ITH V2

Tanggal: 2026-10-03 (Asia/Makassar). Lingkup: **Phase 0 — Repository Alignment**.

> Arsip historis Phase 0. Path `apps/api` dan `apps/web` di bawah menjelaskan layout pada tanggal audit dan sengaja dipertahankan sebagai catatan sejarah; layout aktif sekarang `backend/` dan `frontend/`.

## 1. Identitas audit dan batas pekerjaan

- Repository: `KaiDev98/jdih.ith`.
- Branch aktif sebelum perubahan: `niyato`, dibuat dari ref remote `origin/niyato` yang telah di-fetch.
- HEAD yang diaudit: `4e12664540013562e2fc5d30d5afb6cdbffdb527`.
- Pesan commit: `chore: add JDIH ITH portal setup`.
- Working tree sebelum perubahan: bersih (`git status --short --branch`).
- Ref `niyato` yang diambil identik dengan snapshot `nesta` lokal pada commit tersebut; tidak dilakukan merge.
- Lokasi checkout: `C:/Users/HYPE AMD/Documents/ChatGPT/KP/jdih-audit`.
- Audit sebelumnya disetujui pengguna. Kelima dokumen konteks dibaca ulang sebelum edit Phase 0.

Audit source bersifat statis, bukan pengujian runtime atau pemeriksaan database aktif.
Phase 0 menambahkan context pack, laporan ini, indeks aktif pada dua README, dan
header legacy pada delapan dokumen serta dua SQL. Tidak ada perubahan domain code,
shared contracts, konfigurasi runtime, schema V2, atau database aktif. Tidak ada
commit, push, merge, SQL import/reset, atau introspeksi database dalam Phase 0.

## 2. Sumber kebenaran dan keputusan yang sudah disepakati

Urutan prioritas: instruksi eksplisit pengguna terbaru; [konteks V2](CODEX_CONTEXT_JDIH_ITH_V2.md);
[keputusan YAML](CODEX_DECISIONS_JDIH_ITH_V2.yaml); diagram V2 yang dirujuk konteks;
foundation yang tidak konflik; terakhir dokumen/schema legacy. Lihat [AGENTS.md](../AGENTS.md).

- **NestJS + Next.js + TypeScript adalah stack aktif.** Laravel/Blade/Livewire/Filament
  merupakan rekomendasi historis yang sudah digantikan.
- **Schema 50 tabel beserta seed lama adalah LEGACY**, bukan target final V2.
  Generated Drizzle yang berasal darinya juga masih mencerminkan legacy.
- Rancangan 23 tabel dalam konteks adalah rancangan awal; belum merupakan SQL final yang disetujui.
- Akses dokumen hanya `publik`, `internal`, `rahasia`; tidak ada `terbatas`.
- Semua Dosen/Staf AKTIF dapat mengakses Internal, tanpa pembatasan unit.
  Anonim hanya boleh melihat judul + badge Internal dalam search; detail/file ditolak.
- Rahasia tidak boleh muncul di kanal publik, termasuk search, autocomplete, sitemap,
  rekomendasi, dan hitungan yang mengungkap keberadaannya. Staf aktif memerlukan explicit
  user grant aktif; akses langsung tanpa hak memakai respons yang tidak mengungkap keberadaan.
- Google `@ith.ac.id` dan approval Admin wajib; domain mahasiswa/eksternal tidak memperoleh
  akses staf. Unit manual diselesaikan saat approval. NIP/NIDN dan password lokal bukan syarat V1.
- Tidak ada create/promote Admin/Superadmin lewat UI atau API operasional normal.
- Workflow milik versi; author tidak boleh approve versi sendiri. Catatan revisi dan alasan
  withdrawal wajib. Versi publik lama tetap aktif sampai publish revisi berhasil atomik.
- Dampak relasi hukum dihitung ulang dan dikonfirmasi manusia saat publish, dengan riwayat
  dan audit dalam transaksi. Withdrawal bukan rollback otomatis status hukum target.
- Semua write/high-impact action memerlukan confirmation, loading, success/error feedback;
  operasi tulis dan akses sensitif harus dapat diaudit.
- Format Persuratan terpisah, Publik/Internal saja, dengan arsip versi lama.

## 3. Foundation yang dapat dipertahankan

| Foundation / file | Penilaian |
| --- | --- |
| Root workspaces, `package.json`, TypeScript config | Pertahankan struktur monorepo; penambahan command V2 dilakukan pada fase yang sesuai |
| `apps/api/src/main.ts` | Bootstrap, Helmet, CORS, cookie parser, kompresi, shutdown hooks; deskripsi Swagger legacy perlu alignment nanti |
| `apps/api/src/config/` | Pola validasi Zod dan konfigurasi bertipe dipakai kembali; default DB dan auth perlu diselaraskan kemudian |
| `apps/api/src/app.module.ts` | Pino, request ID, redaksi log, rate limiter; belum merupakan auth guard atau audit bisnis |
| `apps/api/src/common/` | Error filter, response wrapper, Zod pipe dan metadata decorator dapat dipakai kembali |
| `apps/api/src/health/` | Foundation liveness/readiness; path dapat dievaluasi pada fase berikutnya |
| `apps/api/src/database/database.module.ts` | Drizzle, pool MySQL, lifecycle koneksi; binding generated schema masih legacy |
| `apps/web/` | Next.js App Router, TypeScript, Tailwind, kerangka publik/admin; bukan frontend V2 selesai |
| `apps/web/src/lib/api-client.ts`, `api-peladen.ts` | Pola client browser/server, penerusan cookie, pemisahan akses publik dapat dipakai kembali |
| `packages/shared/` | Lokasi kontrak Zod bersama dipertahankan; isi domain belum sesuai V2 |
| Vitest/config pengujian | Tooling dapat dipakai kembali; belum membuktikan invariant V2 |
| `scripts/db-pull.mjs`, `scripts/lib/rapikan-skema.mjs` | Referensi SQL-first; perlu jalur output/target V2 terpisah, bukan dijalankan pada Phase 0 |

Tidak ada file source foundation di atas yang diubah dalam Phase 0.

## 4. Konflik source, schema, dan dokumentasi legacy

Lokasi merujuk source pada HEAD audit; header Phase 0 menggeser nomor baris dokumen/SQL.

| ID | Bukti / lokasi | Konflik atau kekurangan terhadap V2 |
| --- | --- | --- |
| C01 | `packages/shared/src/enums.ts`: `TINGKAT_AKSES` | Empat tingkat, termasuk `terbatas`; V2 hanya tiga |
| C02 | File yang sama: `STATUS_KEBERLAKUAN`, `JENIS_RELASI` | Enam status hukum dan tujuh relasi; V2 tiga status dan empat relasi |
| C03 | File yang sama: `STATUS_PENGGUNA`, `SUMBER_AKUN` | Status akun belum memuat `DITOLAK`; masih ada model lokal/SSO generik |
| C04 | File yang sama: `TRANSISI_PUBLIKASI`; `schemas/dokumen.schema.ts` | Enam state dasar sudah ada, tetapi transisi tambahan `ditarik -> draf`, `disetujui -> revisi`, dan keputusan verifikasi `tolak` tidak berasal dari flow kanonis V2; tidak boleh dibawa otomatis |
| C05 | `packages/shared/src/schemas/auth.schema.ts`: `skemaDaftar` | Password dan NIP/NIDN wajib; unit harus tersedia; tidak sesuai Google identity + unit/manual unit |
| C06 | `roles.ts`, `auth.schema.ts`, `apps/api/src/modules/README.md` | Model cakupan unit generik dan pengelolaan hierarki role perlu ditinjau; jangan diterapkan ke akses Internal. `DOSEN_STAF.lingkupUnit` sendiri sudah `false` |
| C07 | `permissions.ts`, seed: `pengguna.tetapkan_peran`, `peran.kelola` | Perizinan legacy tidak cukup untuk menjamin larangan create/promote Admin; belum ada endpoint yang membuktikan pelanggaran runtime |
| C08 | `schemas/dokumen.schema.ts` | ACL peran/unit/pengguna, `terbatas`, permintaan akses, isi teks/PDF search masih tercermin dalam kontrak; V2 memakai explicit user grant Rahasia dan metadata search |
| C09 | `database/jdih_ith_schema.sql`: `pengguna`, `dokumen`, `dokumen_riwayat`, `dokumen_berkas` | Password wajib; metadata/workflow melekat pada dokumen stabil, counter versi dan snapshot bukan model versi publik terpisah; tidak ada `current_published_version_id` atau kepemilikan file per versi |
| C10 | Schema: `dokumen_akses`, `dokumen_relasi` | ACL polimorfik legacy untuk Terbatas dan relasi dokumen belum sesuai grant Rahasia per pengguna serta sumber relasi per versi |
| C11 | Schema: `v_dokumen_publik` | Mengecualikan Rahasia, tetapi mengeluarkan metadata Internal lebih dari judul/badge. Tidak boleh dijadikan response publik langsung; ini risiko desain, bukan bukti kebocoran endpoint aktif |
| C12 | `apps/api/src/app.module.ts`, `common/decorators/otorisasi.decorator.ts` | `@Publik()` tersedia, tetapi global guard baru `ThrottlerGuard`; default-closed authentication/permission belum ditegakkan |
| C13 | `schemas/dokumen.schema.ts`: `skemaTerbitkanDokumen`; folder domain | Belum ada kontrak konfirmasi impact maupun service transaksi publish, self-approval, perpindahan pointer, atau riwayat status hukum |
| C14 | `database/jdih_ith_seed.sql` | Seed jenis termasuk Statuta, 76 izin legacy, modul konten/layanan, dan akun Superadmin berpassword contoh; bukan seed final V2 |
| C15 | `apps/api/src/database/generated/`, `schema/index.ts` | Artefak generated dan binding aktif masih turunan schema 50 tabel; tidak ditimpa pada Phase 0 |
| C16 | `scripts/db-import.mjs`, `db-pull.mjs`, `gen-permissions.mjs`, `doctor.mjs`, env/config DB | Alur legacy, default port 3306, harapan 50 tabel/76 izin, dan generator dari seed lama; reset memiliki `DROP DATABASE`; V2 membutuhkan jalur aman terpisah |
| C17 | `apps/web/src/app/(publik)/layout.tsx` | Informasi Hukum, Statistik dan tautan Statuta masih tampil; navigasi V2 belum diimplementasikan |
| C18 | README lama, docs 01–08, `apps/api/src/modules/README.md`, diagram lama | Klaim schema sebagai sumber kebenaran, unit scope, scope konten/JDIHN/OCR/layanan, dan stack Laravel bertentangan dengan V2. Isi historis dipertahankan dan status legacy dijelaskan |
| C19 | `docs/07-rekomendasi-teknis.md`: tabel SSO | Pembuatan akun SSO langsung `aktif` bertentangan dengan approval Admin V2 |

## 5. Temuan tambahan saat Phase 0

### C20 — Pemilihan nama database pada import legacy tidak konsisten

`scripts/db-import.mjs` membaca `DB_NAME` untuk koneksi/rekap dan target reset,
sementara schema mengandung `CREATE DATABASE ... jdih_ith` serta `USE jdih_ith`,
dan seed juga memakai `USE jdih_ith`. Karena file dijalankan tanpa nama database
pada argumen import, mengubah `DB_NAME` saja tidak menjamin SQL diarahkan ke DB
yang dipilih. Jangan menggunakan ulang skrip ini untuk V2 tanpa desain target
yang eksplisit. Temuan berasal dari pembacaan source; tidak diuji dengan eksekusi SQL.

### C21 — Klaim integrasi melalui env bukan bukti implementasi

README foundation menyatakan opsi SSO/storage/search dapat diaktifkan melalui env,
tetapi `apps/api/src/modules/` hanya berisi README. Header README aktif menjelaskan
batas klaim tersebut. Tidak ada implementasi integrasi yang ditambahkan.

### Ketidaksinkronan context pack yang dicatat, bukan diputuskan ulang

- Penomoran fase setelah Phase 2 berbeda antara konteks bagian 41 dan implementation
  plan: konteks menggabungkan Auth & Account Approval, sementara plan memisahkannya.
  Phase 0/1/2 konsisten; perbedaan ini tidak menghambat pekerjaan sekarang. Gunakan
  nama pekerjaan dan prioritas sumber kebenaran saat menyusun task berikutnya.
- Penulisan kapitalisasi enum konseptual bervariasi antara konteks, YAML, AGENTS,
  dan source lama. Penyelarasan nilai literal SQL/API merupakan pekerjaan Phase 1/2;
  Phase 0 tidak mengubah representasi atau makna bisnis.
- `CODEX_START_HERE.md` dan konteks merujuk `PROMPT_CODEX.txt` serta logo context pack.
  Keduanya tidak disalin karena daftar artefak Phase 0 yang diminta hanya lima dokumen.
  Ini keterbatasan kelengkapan paket tambahan, bukan alasan membuat frontend.
- README modul domain, diagram, dan Word legacy tetap utuh. Indeks docs/README
  menandai arsip lama; dokumen aktif tidak menjadikannya otoritas V2.

Tidak ada keputusan bisnis baru yang diambil. Lima dokumen konteks disalin apa adanya.

## 6. Bagian yang belum diimplementasikan

- Physical schema V2, seed V2, dataset lokal, Compose MySQL 8 port 3307 dan introspeksi V2.
- Shared contracts final V2 dan pengujian invariant V2.
- Google OAuth/OIDC, registrasi pending, approval/rejection, resolusi unit manual,
  session/revocation/logout dan lookup Admin yang diprovision sebelumnya.
- Global authentication guard, functional permissions dan document access policy.
- Documents/files/versioning, StorageService dan pengecekan ulang download.
- Workflow server-side, larangan self-approval dan publish atomik.
- Legal impact preview, human confirmation, status history dan audit bisnis.
- Search dengan redaksi Internal, non-disclosure Rahasia, dan explicit secret grants.
- Format Persuratan beserta versioning, dashboard/audit administratif dan frontend V2.
- Confirmation modal + loading + success/error feedback untuk write/high-impact actions.

Keberadaan enum, decorator, konfigurasi, tabel legacy, atau halaman kerangka tidak
dianggap sebagai implementasi fitur-fitur tersebut.

## 7. Perkiraan file Phase 1 — usulan saja, belum dibuat/diubah

| File / kelompok | Pekerjaan yang diperkirakan |
| --- | --- |
| `database/v2/schema.sql`, `seed.sql`, `sample.sql`, `README.md` (baru) | Desain fisik terpisah, constraints/indexes, seed V2 dan fixture lokal; review sebelum penerapan |
| `compose.v2.yaml`, `.env.v2.example` (baru) | MySQL 8 port 3307 dengan database/volume terisolasi; jangan arahkan ke DB aktif |
| `scripts/db-v2-import.mjs`, `scripts/db-v2-pull.mjs` (baru), `package.json` | Command eksplisit V2, target tervalidasi dan output terpisah dari legacy |
| `apps/api/drizzle.v2.config.ts`, `apps/api/src/database/generated-v2/` (baru) | Introspeksi setelah schema disetujui dan diuji; tidak menimpa generated legacy |
| `database/v2/tests/` (baru) | Verifikasi FK/unique/check, kepemilikan file, pointer versi dalam dokumen sama, dan keunikan grant |
| README dan dokumentasi DB | Petunjuk setup V2 sesuai hasil yang benar-benar tersedia |

Rancangan harus mencakup Google sub/email unik, nomor versi per dokumen unik,
pointer publik aman, grant aktif tidak duplikat, session/audit indexes, soft delete,
serta pembagian invariant DB versus service/transaction. Daftar path adalah usulan,
bukan persetujuan schema atau instruksi mengeksekusi Phase 1 sekarang.

## 8. Perkiraan file Phase 2 — usulan saja, belum diubah

| File / kelompok | Pekerjaan yang diperkirakan |
| --- | --- |
| `packages/shared/src/enums.ts` | Tiga akses, workflow kanonis, tiga status hukum, empat relasi dan status akun V2 |
| `packages/shared/src/roles.ts`, `permissions.ts` | Selaraskan role/permission dan larangan promosi Admin; jangan menyamakan unit metadata dengan akses Internal |
| `packages/shared/src/schemas/auth.schema.ts` | Google identity + unit/manual unit, approval/rejection dan identitas sesi; deprecate password lokal |
| `packages/shared/src/schemas/dokumen.schema.ts` | Pisahkan identity/version, workflow dan publish impact; redaksi search dan hapus kontrak Terbatas/request-access V1 |
| Shared schemas secret grants / letter templates (baru) | Explicit user grants dan metadata upload/versioning template |
| `packages/shared/src/api.ts`, `index.ts`, schema tests (baru/diubah sesuai kebutuhan) | Response contracts, exports, dan pengujian validasi V2 |
| `scripts/gen-permissions.mjs` | Hindari regenerasi permission V2 dari seed legacy |
| Consumer contracts API/web yang terdampak | Penyesuaian tipe minimum bila diperlukan, bukan implementasi modul/halaman baru |

Acceptance Phase 2: API dan web compile terhadap kontrak yang sama, tanpa definisi
validasi duplikat. Implementasi auth/RBAC/workflow/search tetap task fase berikutnya.

## 9. Pemeriksaan Phase 0 dan risiko tersisa

Hasil pemeriksaan aman Phase 0:

- Branch tetap `niyato`; HEAD tetap sama dengan commit audit.
- `git diff --check` lulus untuk perubahan tracked.
- Pemeriksaan `git diff --no-index --check` pada file baru tidak memberi diagnostic
  kecuali empat trailing whitespace bawaan konteks utama (baris 3, 4, 216, 281).
  Semuanya dua spasi untuk Markdown hard line break; dipertahankan agar context
  pack tetap identik. Exit 1 tanpa diagnostic pada file baru berarti berbeda dari
  file kosong, bukan kegagalan whitespace; konteks utama memberi exit 3.
- Allowlist lulus: tepat 18 file, terdiri atas 12 modified dan 6 file baru untracked.
- SHA256 kelima context files identik dengan sumber context pack.
- Isi 10 file legacy setelah header identik byte-for-byte dengan blob HEAD;
  seluruh tambahan pada dua SQL hanya komentar.
- Tujuan tautan lokal baru pada kedua README dan laporan audit tersedia.
- Tidak ada diff pada `apps/`, `packages/`, `scripts/`, `package.json`, atau lockfile.
- Index Git tetap kosong dari perubahan staged; tidak ada commit atau merge.

Typecheck, lint aplikasi, test runtime, build dan SQL execution tidak dijalankan:
perubahan hanya dokumentasi dan komentar SQL. Hasil pengujian lama dalam arsip tidak
dianggap hasil pengujian saat ini. Tidak ada koneksi ke database aktif.

Risiko tersisa: seluruh konflik domain di atas masih ada dengan sengaja; dokumentasi
alignment tidak menjadikan runtime sesuai V2. Schema fisik belum disetujui, guard
default-closed belum ada, dan keamanan search/download belum diuji. Langkah berikut
yang disarankan adalah review desain fisik V2 terpisah, hanya setelah ada task Phase 1.
