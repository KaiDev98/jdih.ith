# Physical Database JDIH ITH V2 — Phase 1

**Desain disetujui; import dan 61 runtime tests lulus pada MySQL 8.4.11 (2026-10-04). Belum dihubungkan ke aplikasi atau Drizzle.**
Baseline: [konteks V2](../../docs/CODEX_CONTEXT_JDIH_ITH_V2.md),
[keputusan](../../docs/CODEX_DECISIONS_JDIH_ITH_V2.yaml),
[implementation plan](../../docs/CODEX_IMPLEMENTATION_PLAN.md), dan
[audit Phase 0](../../docs/CODEX_AUDIT_V2.md).
Branch pekerjaan: `niyato`; base commit `5000a81db2d02d1b3704d45512aab2a5d36ca207`.

## Lingkup dan file

| File | Tujuan |
| --- | --- |
| [schema.sql](schema.sql) | 24 tabel, PK/FK, UNIQUE, CHECK, generated columns, indeks; import sekali ke DB V2 kosong |
| [seed.sql](seed.sql) | Master 3 role, 25 permission, 5 jenis, 9 kategori SOP; tanpa akun nyata atau password |
| [sample.sql](sample.sql) | Fixture sintetis sekali import, termasuk versioning dan akses; bukan data produksi |
| [validate.mjs](validate.mjs) | Audit statis dan pengujian constraint runtime dengan transaksi rollback; hanya Node built-in dan Docker CLI |
| [VALIDATION.md](VALIDATION.md) | Hasil pemeriksaan aktual, termasuk batas validasi yang belum dapat dijalankan |
| [compose.v2.yaml](../../compose.v2.yaml) | Satu service MySQL lokal terisolasi |
| [.env.v2.example](../../.env.v2.example) | Nama variabel rahasia MySQL lokal, nilainya sengaja kosong |

File `database/jdih_ith_schema.sql`, `database/jdih_ith_seed.sql`, generated Drizzle,
shared enums/schema, script import lama, dan binding aplikasi tidak diubah.
Tidak ada API/auth/RBAC runtime/workflow/frontend dalam Phase 1.

## Runtime lokal tanpa Docker (terverifikasi 2026-10-04)

MySQL 8.4.11 pada 127.0.0.1:3308, database jdih_ith_v2_dev, akun jdih_v2_dev.
Port runtime dibaca dari DB_PORT; port Compose default tetap 3307.
Gunakan Node.js 22+ untuk mode lokal (node:util parseEnv).
File .env.v2.local diabaikan Git; jangan memasukkan secret ke repository:

```dotenv
DB_HOST=127.0.0.1
DB_PORT=3308
DB_NAME=jdih_ith_v2_dev
DB_USER=jdih_v2_dev
DB_PASSWORD=<secret lokal>
```

Jalankan dari root repo dengan mysql 8.4 client pada PATH, atau tentukan executable
melalui environment JDIH_V2_MYSQL_CLIENT (path instalasi lokal, bukan password):

```powershell
node database/v2/validate.mjs --static
node database/v2/validate.mjs --local
```

Mode lokal membatasi host ke loopback dan database ke jdih_ith_v2_dev, membaca
DB_PORT/DB_USER/DB_PASSWORD dari file lokal, dan menolak versi server selain 8.4.x
sebelum pengujian mutasi. Password diteruskan melalui environment child process,
bukan argument CLI atau output. Semua koneksi test memakai UTC dan strict SQL mode.
Output Windows CRLF dinormalisasi sebelum perbandingan hasil.

Import schema, seed, sample telah dijalankan berurutan pada database V2 kosong.
Jangan mengulang schema/sample pada database terisi; tidak ada reset otomatis.
Mode tanpa --local tetap memakai Compose. Konfigurasi Compose membutuhkan variabel
JDIH_V2_MYSQL_PASSWORD/JDIH_V2_MYSQL_ROOT_PASSWORD dari contoh sebelumnya;
file DB_* untuk instance lokal tidak dapat langsung dipakai menjalankan Compose.

## Lingkungan Compose dan prosedur aman

**Jangan jalankan SQL atau command di halaman ini pada production atau database legacy.**
Tidak ada reset/drop otomatis. Gunakan hanya engine Docker lokal dan project ini.

| Parameter | Nilai tetap |
| --- | --- |
| Image | `mysql:8.4` (MySQL 8.4 LTS; bukan MariaDB) |
| Compose project | `jdih-ith-v2-phase1` |
| Service | `mysql-v2` |
| Host endpoint | `127.0.0.1:3307` |
| Container port | `3306` |
| Database | `jdih_ith_v2_dev` |
| Database user development | `jdih_v2_dev` |
| Volume | `jdih_ith_v2_phase1_mysql_data` |
| SQL mount | `/workspace/v2`, read-only, bukan auto-init directory |
| Timezone / collation | UTC / `utf8mb4_0900_ai_ci` |

Nama DB sengaja tetap dan konsisten dalam Compose, ketiga SQL, dan runner. Tidak
membaca `.env` API atau `DB_NAME` legacy. Ini menghindari ketidaksesuaian target
import yang dicatat pada audit C20. Password DB ini terpisah dari identitas akun
Google aplikasi. User development memperoleh hak DDL untuk import lokal; **bukan
model privilege user aplikasi production**.

Jalankan dari root repository dengan PowerShell 7, Node.js 20+, Docker Desktop
Linux engine dan Docker Compose. Pastikan port 3307 belum dipakai dan tidak ada
volume/project V2 milik pekerjaan lain. Jika ada, periksa dahulu; jangan menimpanya.

1. Buat secret lokal sekali. `.env.v2.local` sudah diabaikan oleh `.gitignore`.
   Contoh ini menghasilkan dua secret acak; tidak mencetak nilainya.

   ```powershell
   if (Test-Path -LiteralPath .env.v2.local) { throw 'File env sudah ada; jangan ditimpa.' }
   Copy-Item -LiteralPath .env.v2.example -Destination .env.v2.local
   $v2Password = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
   $v2RootPassword = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
   [IO.File]::WriteAllLines((Join-Path (Get-Location) '.env.v2.local'), @(
     "JDIH_V2_MYSQL_PASSWORD=$v2Password"
     "JDIH_V2_MYSQL_ROOT_PASSWORD=$v2RootPassword"
   ))
   git check-ignore .env.v2.local
   ```

2. Validasi konfigurasi tanpa mencetak secret, lalu jalankan **hanya** service V2:

   ```powershell
   docker compose -p jdih-ith-v2-phase1 --env-file .env.v2.local -f compose.v2.yaml config --quiet
   docker compose -p jdih-ith-v2-phase1 --env-file .env.v2.local -f compose.v2.yaml up -d --wait mysql-v2
   docker compose -p jdih-ith-v2-phase1 --env-file .env.v2.local -f compose.v2.yaml ps
   ```

3. Import berurutan. Password diambil di dalam container, bukan ditempel ke command
   host. Setiap command harus exit 0 sebelum melanjutkan. Jangan memakai `--force`.

   ```powershell
   docker compose -p jdih-ith-v2-phase1 --env-file .env.v2.local -f compose.v2.yaml exec -T mysql-v2 sh -c 'export MYSQL_PWD="$MYSQL_PASSWORD"; exec mysql --user="$MYSQL_USER" --database=jdih_ith_v2_dev --default-character-set=utf8mb4 < /workspace/v2/schema.sql'
   if ($LASTEXITCODE -ne 0) { throw 'Import schema gagal; jangan lanjut seed.' }

   docker compose -p jdih-ith-v2-phase1 --env-file .env.v2.local -f compose.v2.yaml exec -T mysql-v2 sh -c 'export MYSQL_PWD="$MYSQL_PASSWORD"; exec mysql --user="$MYSQL_USER" --database=jdih_ith_v2_dev --default-character-set=utf8mb4 < /workspace/v2/seed.sql'
   if ($LASTEXITCODE -ne 0) { throw 'Import seed gagal; jangan lanjut sample.' }

   docker compose -p jdih-ith-v2-phase1 --env-file .env.v2.local -f compose.v2.yaml exec -T mysql-v2 sh -c 'export MYSQL_PWD="$MYSQL_PASSWORD"; exec mysql --user="$MYSQL_USER" --database=jdih_ith_v2_dev --default-character-set=utf8mb4 < /workspace/v2/sample.sql'
   if ($LASTEXITCODE -ne 0) { throw 'Import sample gagal.' }
   ```

   DDL MySQL melakukan implicit commit: kegagalan schema dapat meninggalkan tabel
   yang sudah terbentuk. Jangan mengulang secara buta atau menghapus volume; tinjau
   error dan kepemilikan data dahulu. Seed dapat diulang untuk master; sample sengaja
   menolak duplikasi. Error sample membatalkan transaksi saat client disconnect.
   Seed adalah baseline awal, bukan sinkronisasi permission runtime: jangan menjalankan
   ulang setelah ada perubahan hak akses administratif tanpa review.

4. Jalankan validasi:

   ```powershell
   node database/v2/validate.mjs --static
   node database/v2/validate.mjs
   ```

   Runtime memeriksa catalog FK/UNIQUE/CHECK/index dan skenario positif/negatif.
   Mutation tests rollback; counter AUTO_INCREMENT dapat bertambah walaupun row
   di-rollback. Runner menolak override `DOCKER_HOST`/`DOCKER_CONTEXT` dan engine remote.
   Test harus dijalankan terhadap fixture lokal, bukan data pengguna.

5. Hentikan service bila selesai (volume tetap disimpan):

   ```powershell
   docker compose -p jdih-ith-v2-phase1 --env-file .env.v2.local -f compose.v2.yaml stop mysql-v2
   ```

Jangan menjalankan `npm run db:reset`, `db:import` legacy, `db:pull`, atau binding
Drizzle untuk menguji proposal ini. Image tag 8.4 dapat bergerak ke patch baru;
catat versi/digest aktual pada validasi dan pin digest ketika deployment disetujui.

## 23 tabel dan kepemilikan data

| Kelompok | Tabel |
| --- | --- |
| Identity/RBAC | `unit_kerja`, `pengguna`, `peran`, `izin`, `pengguna_peran`, `peran_izin`, `pengguna_izin`, `sesi_pengguna` |
| Master produk | `jenis_dokumen`, `kategori`, `tag` |
| Produk hukum | `dokumen`, `dokumen_versi`, `dokumen_versi_kategori`, `dokumen_versi_tag`, `dokumen_berkas`, `dokumen_relasi`, `dokumen_akses_rahasia`, `dokumen_workflow`, `dokumen_status_hukum_riwayat` |
| Persuratan/audit | `template_surat`, `template_surat_versi`, `audit_log` |

PK memakai BIGINT UNSIGNED; tabel penghubung memakai PK komposit. Identitas stabil
dan user memiliki `deleted_at`; master lain dinonaktifkan melalui `aktif` bila relevan.
Slug/kode tetap unik termasuk setelah soft-delete agar URL lama tidak dipakai ulang.
Tidak ada kolom password. Semua waktu DATETIME(6) disimpan UTC. Email case-insensitive,
Google subject case-sensitive; sub boleh NULL khusus pre-provisioning yang belum di-bind.
Satu email tetap unik meskipun akun nonaktif/deleted; reaktivasi tidak membuat identitas ganda.

`dokumen` menyimpan identitas stabil, jenis, status hukum terkini, dan pointer publik.
Metadata publikasi/access/workflow/unit/kategori/tag/file/relasi melekat pada versi.
`dokumen_status_hukum_riwayat.source_version_id` menyimpan versi sumber agar koreksi
atau dampak relasi dapat dilacak tepat; dokumen sumber dapat diperoleh melalui versi.

## Keputusan detail V1 — revisi 2026-10-04

Seluruh lima jenis Produk Hukum menggunakan detail enam field yang sama setelah
otorisasi, dengan mapping berikut:

| Label | Kolom |
| --- | --- |
| Tipe | jenis_dokumen.nama |
| Judul | dokumen_versi.judul |
| Nomor | dokumen_versi.nomor |
| Tanggal Penetapan | dokumen_versi.tanggal_penetapan |
| Status | dokumen.status_hukum — BERLAKU/DIUBAH/DICABUT, bukan workflow |
| PIC | dokumen_versi.pic — VARCHAR(255), free text, tanpa FK pengguna/unit |

File utama dan lampiran berasal dari current published version; masing-masing file
yang diizinkan mempunyai Preview dan Download. PUBLIK terbuka untuk anonim;
INTERNAL anonim hanya judul + badge di search, tanpa detail/preview/download;
Dosen/Staf AKTIF mengakses INTERNAL lintas unit. RAHASIA tidak muncul di public search;
hanya Admin/Superadmin sesuai permission atau staf AKTIF dengan explicit grant valid.
Otorisasi file wajib dicek ulang pada Preview dan Download.

PIC dan tanggal_penetapan DATE bersifat versioned dan nullable selama persiapan draf.
CHECK ck_versi_publish_metadata mewajibkan nomor/PIC non-NULL dan nonblank (TRIM),
serta tanggal_penetapan non-NULL pada TERBIT maupun DITARIK agar history tetap lengkap.
Judul nonblank dijaga ck_versi_judul untuk semua state; tipe/legal status oleh NOT NULL,
FK dan ENUM. Service juga harus menolak whitespace-only Unicode/tab/newline pada
teks, memvalidasi tanggal kalender dan memastikan file utama sebelum publish.
TRIM SQL default hanya menangani spasi biasa; CHECK bukan pengganti validasi input.

Abstrak dihapus: tidak ada requirement V1 lain yang memakainya, termasuk search.
Tanggal berlaku juga dihapus karena termasuk metadata panjang yang tidak diperlukan.
Materi Pokok/T.E.U./Bentuk/Bentuk Singkat/Tempat Penetapan/Tanggal Pengundangan/Sumber/
Subjek tidak ditambahkan. Tahun tetap nullable untuk search/filter/indexing/nomor,
tidak menjadi baris detail dan tidak diturunkan otomatis dari tanggal penetapan.

Format Persuratan hanya daftar Judul (template_surat.nama) + Download dari current
version ACTIVE. Tidak ada halaman detail template, Preview, atau metadata hukum.
PUBLIK terlihat/download untuk semua; INTERNAL hanya Dosen/Staf AKTIF.
Deskripsi template yang sudah ada tetap opsional administratif, tidak diproyeksikan
ke daftar V1; backend versioning/arsip tetap digunakan.

## Enum dan CHECK

| Domain | Nilai |
| --- | --- |
| Akses dokumen | `publik`, `internal`, `rahasia` |
| Workflow versi / history | `DRAF`, `DIAJUKAN`, `REVISI`, `DISETUJUI`, `TERBIT`, `DITARIK` |
| Status hukum / history | `BERLAKU`, `DIUBAH`, `DICABUT` |
| Relasi | `MENGUBAH`, `MENCABUT`, `DASAR_HUKUM`, `TERKAIT` |
| Akun | `MENUNGGU_VERIFIKASI`, `AKTIF`, `DITOLAK`, `NONAKTIF` |
| Override izin | `ALLOW`, `DENY` |
| Berkas | `UTAMA`, `LAMPIRAN` |
| Workflow action | `CREATE`, `SUBMIT`, `RETURN`, `APPROVE`, `PUBLISH`, `WITHDRAW` |
| Akses template | `PUBLIK`, `INTERNAL` |
| Status versi template | `ACTIVE`, `ARCHIVED` |

33 CHECK mencakup boolean, nama/judul/alasan tidak kosong, nomor versi positif,
tahun empat digit bila diisi, expiry/revocation waktu yang valid, size positif,
larangan self-approval pada data versi, field approval/publish/withdraw yang wajib
sesuai state, dan archive timestamp template. CHECK workflow history membatasi
pasangan action/status asal/tujuan, termasuk melarang NULL sebagai celah transisi.
ENUM berlaku dengan strict SQL mode; aplikasi tidak boleh menonaktifkan strict mode
atau menggunakan INSERT IGNORE untuk menghindari pelanggaran.

## FK, UNIQUE, dan indeks

Semua **41 FK** eksplisit memakai `ON DELETE RESTRICT ON UPDATE RESTRICT`.
Tidak ada CASCADE/SET NULL yang menghapus/memutus history secara diam-diam. ID
immutable; akun dinonaktifkan/soft-delete sehingga atribusi audit tetap tersedia.
Actor audit boleh NULL untuk system/anonymous/provisioning, tetapi actor yang sudah
tercatat tetap direferensikan. `entity_type/entity_id` audit bersifat polimorfik
tanpa FK agar event tetap tercatat untuk entitas yang belum terbentuk/gagal dibuat.

FK penting:

- Pengguna → unit, verifier; sessions/role/direct permission → pengguna.
- Dokumen → jenis, author; versi → dokumen, unit, author/verifier/publisher.
- Berkas/kategori/tag/workflow → versi; relasi → versi sumber + dokumen target.
- Secret grant → dokumen + pengguna + pemberi/pencabut.
- History hukum → dokumen, versi sumber opsional, actor.
- Template versi → template; audit → actor nullable.
- `dokumen(current_published_version_id,id)` → `dokumen_versi(id,dokumen_id)`.
- `template_surat(current_version_id,id)` → `template_surat_versi(id,template_surat_id)`.

Dua FK pointer ditambahkan sesudah tabel versi terbentuk; insert parent dengan
pointer NULL dahulu. Composite UNIQUE pada sisi versi merupakan candidate key
eksplisit sehingga tidak bergantung pada nonstandard FK MySQL.

**23 PK + 22 UNIQUE sekunder**: Google sub/email; kode master/role/permission;
nama tag; kode/slug dokumen; `(dokumen_id,nomor_versi)`; owner key versi;
storage key; slot file utama; pasangan relasi; slot grant; slug template;
nomor versi template, owner key, slot ACTIVE dan storage key; session token hash.
PK penghubung mencegah role/permission/kategori/tag duplikat.

Ada **70 indeks sekunder bernama (22 UNIQUE + 48 non-unique)**, selain PK:

| Kebutuhan | Indeks utama |
| --- | --- |
| Identitas / antrean approval | `uq_pengguna_email`, `uq_pengguna_google_sub`, `idx_pengguna_status`, `idx_pengguna_unit` |
| Slug / jenis / status hukum / pointer | `uq_dokumen_slug`, `idx_dokumen_jenis`, `idx_dokumen_hukum`, `idx_dokumen_current` |
| Search metadata / verifikasi | `idx_versi_nomor_tahun`, `idx_versi_tahun`, `idx_versi_judul`, `idx_versi_workflow`, `idx_versi_visibility`, `idx_versi_unit` |
| Kategori/tag | PK join + `idx_versi_kategori_reverse`, `idx_versi_tag_reverse` |
| File / relasi / history | `idx_berkas_order`, `idx_relasi_target`, `idx_workflow_version`, `idx_hukum_document` |
| Secret grants | `uq_secret_open_grant`, `idx_secret_user`, `idx_secret_expiry` |
| Sessions | `uq_sesi_token`, `idx_sesi_user`, `idx_sesi_expiry` |
| Audit | `idx_audit_actor_date`, `idx_audit_entity_date`, `idx_audit_date`, `idx_audit_request` |
| Template | `uq_template_slug`, `idx_template_current`, `idx_template_visibility`, `uq_template_versi_active` |

Indeks judul adalah prefix B-tree, bukan full-text PDF. Ia membantu prefix/equality,
tidak menjamin percepatan `LIKE '%kata%'`. Search metadata lintas kategori/tag tetap
memerlukan desain query, pagination dan EXPLAIN setelah API dibuat. Tidak ada indeks
publik atau view yang otomatis mengekspos Internal/Rahasia.

## Jaminan database versus transaksi/service

| Invariant | Database | Service/transaction nanti |
| --- | --- | --- |
| Pointer versi hanya untuk owner sama | FK komposit | Verifikasi versi TERBIT/current tidak withdrawn/superseded; template ACTIVE |
| Revisi tidak mengganti publik prematur | Pointer terpisah; tidak ada trigger pemindahan | Create/update revisi tidak menulis pointer; publish saja yang memindahkannya |
| Tepat satu file utama saat publish | Maksimum satu UTAMA via generated `main_slot` + UNIQUE; banyak lampiran boleh | Minimal satu file utama, file fisik valid, MIME/size/checksum dan access recheck |
| Satu grant aktif per pengguna/dokumen | UNIQUE `(dokumen_id,pengguna_id,active_slot)` untuk seluruh grant belum dicabut | Periksa expiry dan status AKTIF; grant hanya untuk Rahasia; audit grant/revoke/access |
| Self-approval | CHECK `verified_by <> created_by` bila verifier diisi | Cocokkan verifier dengan actor sesi dan izin; jangan izinkan request memalsukan ID |
| Workflow | ENUM + CHECK event transisi dan catatan | Kunci row versi; event harus cocok dengan state aktual dan actor; state update + event + audit atomik |
| Legal impact | FK relasi, status enum, alasan/history | Preview lalu konfirmasi manusia; hitung ulang under lock; target status/history/audit bersama publish |
| Arsip template | Maksimum satu ACTIVE, tanggal arsip wajib | Arsip versi lama + aktifkan baru + pindah pointer dalam satu transaksi |
| History/audit terjaga | FK RESTRICT menghalangi delete parent yang masih direferensikan | Append-only, larang direct UPDATE/DELETE normal pada history/versi; DB user production least privilege |
| Login/akses | Unique identity/session hash; tidak menyimpan password/raw token | Verifikasi Google issuer/audience/sub/email/domain, approval, session revocation, RBAC dan visibility |

Grant memakai slot konstan `1` bila `revoked_at IS NULL`, NULL bila revoked. UNIQUE
MySQL membolehkan banyak NULL sehingga history revoked tidak hilang. Ini **lebih ketat**
dari sekadar belum expired: grant expired yang belum ditutup masih memegang slot.
Jangan memakai NOW() di generated column; nilainya tidak deterministik.
Saat regrant, lock row dokumen lalu row pengguna (urutan konsisten bagi semua writer),
tutup grant expired (`revoked_at`, alasan expired, actor nullable untuk sistem), lalu
insert grant baru dalam transaksi. Akses selalu memerlukan:
`revoked_at IS NULL AND (expires_at IS NULL OR expires_at > UTC_TIMESTAMP(6))`.
Kegagalan job expiry tidak boleh memberi akses atau menyebabkan grant ganda.
Pilihan slot ini dipertahankan: slot berarti satu grant terbuka, bukan hak akses aktif.
Service menutup expired row saat regrant; tidak menunggu scheduler. Tutup row lama,
insert baru dan audit harus commit bersama; gagal insert mengembalikan penutupan lewat
rollback. Jika grant lama masih valid, jangan membuat duplikat; berikan konflik atau
hasil idempotent. UNIQUE adalah pertahanan terakhir terhadap concurrent insert;
service perlu penanganan duplicate-key/deadlock/retry. Tidak ada hard-delete history.
Selain predicate waktu tersebut, akses staf tetap memerlukan akun AKTIF dan dokumen
RAHASIA yang valid. Role Admin/Superadmin mengikuti permission administratif.

Publish harus lock stable document dan versi, memastikan `DISETUJUI`, metadata/file
lengkap, izin actor, dan konfirmasi impact masih sesuai target terkini. Tandai versi
lama `superseded_at`, terbitkan versi baru, pindahkan pointer, dan tulis workflow/history/
audit dalam satu transaksi. Reader menggunakan pointer, bukan `MAX(nomor_versi)` atau
seluruh row berstatus TERBIT. Versi TERBIT superseded tetap disimpan sebagai history.
Rollback tidak boleh mengganti pointer publik. Withdrawal current version wajib
mengubah current_published_version_id menjadi NULL dalam transaksi yang sama dengan
state DITARIK, alasan, workflow event dan audit. Jangan otomatis mengaktifkan kembali
versi superseded. Withdrawal non-current memakai kondisi pointer = versi yang ditarik,
sehingga tidak mengosongkan pointer versi lain. History tetap disimpan; status hukum
dokumen/target relasi tidak otomatis diubah atau dipulihkan.

FK saja tidak mencegah siklus hierarki unit atau relasi ke dokumen sendiri; validasi
lintas-row tersebut milik service. CHECK tidak dipasang pada AUTO_INCREMENT untuk
aturan self-parent. Check constraint/history bukan pengganti state machine runtime.
Direct SQL yang berwenang tetap bisa merusak konsistensi lintas-row; privilege dan
transaksi aplikasi harus menjadi batas operasional sebelum production.

## Seed dan provisioning Admin

Seed memasang tiga role canonical; PENGUNJUNG virtual. Admin biasa memperoleh izin
pengelolaan, tetapi bukan approve/publish/withdraw dokumen atau koreksi status hukum
secara default. Verifikator = ADMIN + izin eksplisit `workflow.return`,
`workflow.approve`, `workflow.publish`, `workflow.withdraw`, sesuai penugasan operations.
SUPERADMIN memperoleh permission V2 yang disediakan. Daftar ini baseline minimal
untuk review, tidak membangun runtime policy. DOSEN_STAF tidak diberi bypass Rahasia.

Tidak ada akun Admin nyata pada seed. Prosedur provisioning nanti:

1. Operations menyediakan email ITH yang disetujui melalui konfigurasi deployment
   (misalnya `JDIH_BOOTSTRAP_ADMIN_EMAILS`, belum dikonsumsi kode Phase 1), bukan literal
   email/password contoh dalam repository.
2. Dengan akses DB operations terkontrol, lakukan transaksi parameterized untuk
   identitas, canonical unit yang telah diverifikasi, role dan audit provisioning
   (`actor_id` NULL bila bootstrap awal). Jangan membuat endpoint/UI untuk proses ini.
3. `google_sub` boleh NULL selama pre-provisioning. Bind sekali setelah server
   memvalidasi Google OIDC dan exact email `@ith.ac.id`; jangan percaya email/sub dari
   request biasa, jangan auto-promote pendaftar. Sub non-NULL harus unik.
4. Akun staf yang mendaftar biasa tetap MENUNGGU_VERIFIKASI dan wajib approval/unit
   resolution sebelum AKTIF. Pre-provisioning bukan jalan bypass bagi pendaftaran staf.

Email fixture `@example.invalid` dan sub `fixture:*` pada sample bukan pengecualian
domain login. Future auth wajib menolaknya. Tidak ada data pribadi nyata pada sample.

## Sample dan batasnya

- Dokumen 901: Publik TERBIT v1 + DRAF v2; pointer tetap 9011; dua lampiran pada v1.
  Draf v2 belum memiliki PIC/tanggal penetapan sehingga belum bisa publish.
- Dokumen 902: Internal TERBIT milik Unit A; sample staf berada di Unit B.
- Dokumen 903: Rahasia TERBIT; grant revoked + aktif untuk staf 9003; satu grant expired
  belum revoked untuk 9001 sebagai fixture expiry/regrant (policy administratif terpisah).
- Dokumen 904: v1 superseded tetap tersimpan + v2 TERBIT/current, dengan PIC dan
  tanggal penetapan berbeda untuk membuktikan metadata versioned.
- Relasi draf 9012 MENGUBAH 902; status hukum target tetap BERLAKU.
- Template 951: PUBLIK v1 ARCHIVED + v2 ACTIVE; template 952: INTERNAL ACTIVE.
- Session hash contoh tidak dapat dipakai login; audit fixture memakai actor NULL.
- File metadata hanya placeholder, bukan PDF/DOCX nyata. Uji download/preview,
  validasi MIME dan checksum file sungguhan menunggu modul storage nanti.

## Hal yang perlu direview sebelum penerapan

Proposal ini tidak menetapkan keputusan bisnis baru di luar baseline. Review terutama
pilihan representasi: nullable Google sub untuk bootstrap, semua FK RESTRICT, grant
expired ditutup sebelum regrant, dan baseline permission Admin/verifikator. Kebijakan
akses versi historis (terutama bila akses berubah) tetap perlu dijabarkan sebelum API.
Withdrawal sudah diputuskan: pointer NULL tanpa fallback ke versi superseded.
DDL tidak menjamin publikasi/otorisasi lengkap dengan sendirinya.

Referensi teknis MySQL: [FK komposit dan indexed referenced keys](https://dev.mysql.com/doc/refman/8.4/en/create-table-foreign-keys.html),
[batas CHECK](https://dev.mysql.com/doc/refman/8.4/en/create-table-check-constraints.html),
[generated columns deterministik](https://dev.mysql.com/doc/refman/8.4/en/create-table-generated-columns.html).
