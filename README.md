# Portal JDIH ITH Parepare

## Status aktif — JDIH ITH V2

Stack aktif adalah **NestJS + Next.js + TypeScript**, dengan shared Zod dan
Drizzle SQL-first. Sumber kebenaran desain terbaru adalah
[docs/CODEX_CONTEXT_JDIH_ITH_V2.md](docs/CODEX_CONTEXT_JDIH_ITH_V2.md).
Semua implementasi baru harus mengikuti V2 dan instruksi eksplisit pengguna.

Baca berurutan:

1. [AGENTS.md](AGENTS.md).
2. [CODEX_START_HERE.md](CODEX_START_HERE.md).
3. [Konteks lengkap V2](docs/CODEX_CONTEXT_JDIH_ITH_V2.md).
4. [Keputusan V2](docs/CODEX_DECISIONS_JDIH_ITH_V2.yaml).
5. [Rencana implementasi](docs/CODEX_IMPLEMENTATION_PLAN.md).
6. [Audit dan alignment Phase 0](docs/CODEX_AUDIT_V2.md).

**Schema 50 tabel dalam `database/jdih_ith_schema.sql` dan seed pasangannya adalah
LEGACY REFERENCE, bukan target final V2.** Delapan dokumen desain lama, diagram
lama, dan dokumen Word pada indeks docs merupakan arsip historis. Rekomendasi
Laravel/Blade/Livewire/Filament telah digantikan oleh NestJS + Next.js.

Phase 0 hanya menyelaraskan dokumentasi. Source aplikasi dan database aktif
belum dimigrasikan. Rancangan 23 tabel V2 masih perlu desain fisik dan review
pada Phase 1; file SQL V2 belum dibuat. Target development V2 adalah MySQL 8
melalui Docker Compose pada host port `3307`, yang juga belum dibuat di Phase 0.

## Catatan foundation sebelumnya — referensi historis

> Bagian 1–8 di bawah dipertahankan sebagai catatan setup foundation lama,
> bukan petunjuk implementasi V2. Klaim sumber kebenaran schema, hasil pengujian,
> opsi integrasi, dan roadmap di bagian ini berlaku pada snapshot legacy.
> Perintah `db:import`, `db:reset`, dan `db:pull` masih mengarah ke alur legacy;
> jangan gunakan untuk menyiapkan V2. `db:reset` menghapus database.
> Flag konfigurasi SSO/storage/search tidak membuktikan modulnya sudah tersedia.

Jaringan Dokumentasi dan Informasi Hukum — Institut Teknologi Bacharuddin Jusuf Habibie, Parepare.

Monorepo berisi peladen API, aplikasi web, dan paket kontrak bersama. Perancangan
sistemnya ada di [`docs/`](docs/README.md); basis datanya di [`database/`](database/).

---

## 1. Yang Perlu Terpasang

| Perkakas           | Versi                         | Catatan                                                 |
| ------------------ | ----------------------------- | ------------------------------------------------------- |
| Node.js            | 20.9 atau lebih baru          | Next 16 mensyaratkannya. Diuji pada Node 24.21          |
| npm                | 10 atau lebih baru            | Dipakai sebagai pengelola _workspace_; tidak perlu pnpm |
| MySQL atau MariaDB | MySQL 8.0.16+ / MariaDB 10.4+ | XAMPP sudah cukup. Diuji pada MariaDB 10.4.32           |

Tidak memerlukan Docker, Redis, Meilisearch, maupun penyimpanan objek. Ketiganya
dapat diaktifkan nanti lewat berkas `.env` tanpa mengubah kode (lihat § 7).

## 2. Pemasangan

```bash
npm install                # memasang seluruh dependensi workspace
npm run setup              # menyiapkan .env + membangkitkan rahasia + membangun @jdih/shared
```

Nyalakan MySQL dari **XAMPP Control Panel**, lalu:

```bash
npm run db:import          # memuat 50 tabel, 3 tampilan, 4 pemicu, dan data referensi
npm run db:pull            # membangkitkan skema Drizzle bertipe dari basis data
npm run doctor             # memastikan semuanya siap
npm run dev                # menyalakan API (3001) dan web (3000) bersamaan
```

Buka <http://localhost:3000>. Beranda menampilkan blok **Status Pemasangan** yang
menyatakan apakah peladen API sudah tersambung — blok itu dihapus setelah modul
dokumen dibangun.

| Alamat                                        | Isi                          |
| --------------------------------------------- | ---------------------------- |
| <http://localhost:3000>                       | Portal publik                |
| <http://localhost:3000/admin>                 | Panel administrasi           |
| <http://localhost:3001/api/v1/docs>           | Dokumentasi API (Swagger)    |
| <http://localhost:3001/api/v1/kesehatan/siap> | Pemeriksaan kesehatan sistem |

**Bila ada yang tidak jalan, jalankan `npm run doctor` lebih dahulu.** Perintah itu
memeriksa versi Node, keberadaan `.env`, kekuatan rahasia, hasil _build_ paket
bersama, keberadaan skema Drizzle, dan ketersambungan basis data — masing-masing
beserta saran perbaikannya.

## 3. Struktur Monorepo

```
jdih.ith/
├── apps/
│   ├── api/                 Peladen API — NestJS 12
│   │   └── src/
│   │       ├── config/      Validasi variabel lingkungan (Zod) + konfigurasi bertipe
│   │       ├── common/      Pipa validasi, penyaring galat, pencegat, dekorator otorisasi
│   │       ├── database/    Modul Drizzle + skema hasil introspeksi
│   │       ├── health/      Titik akhir kesehatan
│   │       └── modules/     Modul domain (lihat README di dalamnya)
│   └── web/                 Portal publik + panel admin — Next.js 16
│       └── src/app/
│           ├── (publik)/    Dirender di peladen; SEO penting di sini
│           └── (admin)/     Dirender di peramban; SEO tidak relevan
├── packages/
│   └── shared/              Kontrak bersama: enum, 76 kode izin, peran, skema Zod
├── database/                DDL + data referensi (SUMBER KEBENARAN skema)
├── docs/                    Perancangan sistem, Bagian A sampai H
└── scripts/                 Perkakas setup dan basis data
```

## 4. Susunan Teknologi dan Alasannya

| Bagian       | Pilihan                        | Alasan                                                                                                                                                                               |
| ------------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Peladen      | NestJS 12                      | Struktur modul dan penyuntikan dependensi yang tegas; cocok untuk sistem berlapis otorisasi tiga tingkat                                                                             |
| Peramban     | Next.js 16 (App Router)        | Halaman peraturan dirender di peladen sehingga terindeks mesin pencari — syarat yang tidak dapat dipenuhi SPA biasa. Panel admin tetap berjalan di peramban dalam aplikasi yang sama |
| Basis data   | MySQL 8 / MariaDB 10.4, InnoDB | Sesuai rancangan pada `docs/04`                                                                                                                                                      |
| Lapisan data | **Drizzle ORM**                | Lihat § 5                                                                                                                                                                            |
| Validasi     | **Zod 4** di `packages/shared` | Satu skema dipakai dua sisi: peladen memvalidasi permintaan, peramban memvalidasi formulir. Aturannya tidak mungkin melenceng                                                        |
| Gaya         | Tailwind CSS 4                 | Token tema dideklarasikan di CSS, tanpa berkas konfigurasi JS                                                                                                                        |
| Pengujian    | Vitest 5                       | Satu pelari uji untuk kedua aplikasi                                                                                                                                                 |
| Kata sandi   | `@node-rs/argon2`              | Argon2id; binari siap pakai, tidak memerlukan perkakas kompilasi di Windows                                                                                                          |
| Pencatatan   | pino                           | Log JSON dengan penyamaran rahasia otomatis dan penanda korelasi per permintaan                                                                                                      |

### Dua versi yang SENGAJA tidak memakai yang terbaru

Keduanya adalah keputusan sadar, bukan kelalaian:

| Paket      | Dipakai    | Terbaru di npm | Sebab                                                                                                                                          |
| ---------- | ---------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript | **6.0.3**  | 7.0.2          | `typescript-eslint` membatasi `<6.1.0` dan `@nestjs/swagger` menerima `^5.5 \|\| ^6`. Memakai TS 7 mematikan seluruh _linting_                 |
| ESLint     | **9.39.5** | 10.11.0        | `eslint-config-next` masih membawa `eslint-plugin-react` 7.x yang batas dukungannya `^9.7`. Pada ESLint 10, _linting_ aplikasi web gagal total |

Kaidahnya: **versi terbaru yang benar-benar didukung seluruh rantai perkakas**,
bukan angka terbesar di npm. Naikkan keduanya setelah `typescript-eslint` dan
`eslint-config-next` menyatakan dukungan.

## 5. Lapisan Data: Mengapa Drizzle, dan Satu Sisi Kasarnya

`database/jdih_ith_schema.sql` adalah **sumber kebenaran tunggal** skema — sudah
diuji eksekusi, memuat 50 tabel, 3 tampilan, 85 kunci tamu, 33 batasan CHECK, dan
4 pemicu. Sebagian jaminan kebenarannya bersandar pada fitur yang tidak ditangani
baik oleh pemeta objek lain:

- kolom terbangkit `dokumen.nomor_normal` (deteksi duplikasi nomor tahan spasi dan huruf),
- kolom terbangkit `permintaan_akses.kunci_menunggu` (pemalsuan _partial unique index_),
- pemicu pencegahan simpul induk menunjuk dirinya sendiri,
- tiga tampilan untuk relasi dua arah dan rekapitulasi.

Drizzle bersifat _SQL-first_: berkas SQL tetap menjadi sumber kebenaran, dan tipe
TypeScript **diturunkan** darinya lewat introspeksi. Arahnya selalu satu:

```
database/*.sql  ──[npm run db:import]──▶  MySQL  ──[npm run db:pull]──▶  apps/api/src/database/generated/
```

Perintah `drizzle-kit generate` dan `migrate` **tidak dipakai**, karena keduanya
akan menjadikan berkas TypeScript sebagai sumber kebenaran dan menyingkirkan
pemicu, tampilan, serta kolom terbangkit. Mengubah skema berarti menyunting berkas
SQL, lalu menjalankan `db:import` dan `db:pull` kembali.

### Sisi kasar yang perlu Anda ketahui

Pada **MariaDB**, `drizzle-kit pull` tidak dapat dipakai langsung. Tiga cacat
ditemukan dan sudah ditelusuri sampai sebabnya:

| Cacat                                                                                                                                                                                                             | Akibat                               | Penanganan                                                                                                                                                                    |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Basis data bermuatan batasan CHECK membuat `pull` keluar dengan kode 1 **tanpa pesan apa pun**. drizzle-kit membaca `row["CONSTRAINT_NAME"]` huruf besar, sedangkan MariaDB mengembalikan label kolom huruf kecil | Introspeksi mustahil dijalankan      | Introspeksi dijalankan pada **salinan struktur sementara** yang batasan CHECK-nya dilepas. Basis data sungguhan tidak pernah disentuh dan seluruh 33 batasan tetap ditegakkan |
| Nilai baku teks dibungkus petik dua kali (`.default('''id''')`)                                                                                                                                                   | Berkas hasil tidak dapat dikompilasi | Dirapikan otomatis                                                                                                                                                            |
| `bigint` dipakai 138 kali tetapi tidak tercantum pada daftar impor                                                                                                                                                | Berkas hasil tidak dapat dikompilasi | Daftar impor dilengkapi otomatis                                                                                                                                              |

Seluruhnya ditangani `npm run db:pull` tanpa campur tangan Anda. Pada percobaan
terakhir, 292 perbaikan diterapkan dan hasilnya lolos pemeriksaan tipe.
Penjelasan lengkap ada di [`scripts/db-pull.mjs`](scripts/db-pull.mjs) dan
[`scripts/lib/rapikan-skema.mjs`](scripts/lib/rapikan-skema.mjs).

Pada **MySQL 8** ketiga cacat itu tidak muncul; skrip mendeteksi jenis peladen dan
melakukan introspeksi langsung.

## 6. Perintah yang Tersedia

| Perintah                          | Fungsi                                                                |
| --------------------------------- | --------------------------------------------------------------------- |
| `npm run dev`                     | Menyalakan pengawas `@jdih/shared`, API, dan web sekaligus            |
| `npm run build`                   | Membangun ketiga paket dalam urutan yang benar                        |
| `npm start`                       | Menjalankan hasil _build_ (API + web)                                 |
| `npm run typecheck`               | Memeriksa tipe seluruh paket                                          |
| `npm run lint` / `lint:fix`       | ESLint untuk seluruh paket                                            |
| `npm run format` / `format:check` | Prettier (direktori `docs/` dikecualikan)                             |
| `npm test`                        | Vitest untuk seluruh paket                                            |
| `npm run doctor`                  | Memeriksa kesiapan lingkungan beserta saran perbaikan                 |
| `npm run setup:env`               | Membuat `.env` dan membangkitkan rahasia (`-- --paksa` untuk menimpa) |
| `npm run db:import`               | Memuat skema + data referensi                                         |
| `npm run db:reset`                | Menghapus basis data lalu memuat ulang                                |
| `npm run db:pull`                 | Membangkitkan skema Drizzle dari basis data                           |
| `npm run db:studio`               | Penjelajah basis data drizzle-kit                                     |
| `npm run gen:permissions`         | Membangkitkan ulang 76 kode izin dari berkas seed                     |
| `npm run clean`                   | Menghapus hasil _build_ (`-- --penuh` termasuk `node_modules`)        |

## 7. Menaikkan Kemampuan Tanpa Mengubah Kode

Rancangannya menyediakan pengandar yang dapat ditukar lewat `.env`. Mulailah dari
yang paling sederhana, dan pindah hanya ketika benar-benar perlu:

| Kebutuhan                                           | `.env`                      | Akibat                                               |
| --------------------------------------------------- | --------------------------- | ---------------------------------------------------- |
| Penelusuran perlu toleransi salah ketik dan sinonim | `SEARCH_DRIVER=meilisearch` | Beralih dari FULLTEXT MySQL ke Meilisearch           |
| Menjalankan lebih dari satu proses peladen          | `CACHE_DRIVER=redis`        | Cache izin dibagi bersama — **wajib**, bukan pilihan |
| Berkas disimpan di penyimpanan objek                | `STORAGE_DRIVER=s3`         | Beralih dari diska lokal ke S3/MinIO                 |
| Surel benar-benar dikirim                           | `MAIL_DRIVER=smtp`          | Berhenti hanya mencatat surel ke log                 |
| Sinkronisasi ke JDIH Nasional                       | `JDIHN_ENABLED=true`        | Mengaktifkan antrean sinkronisasi                    |
| Masuk lewat akun institusi                          | `SSO_ENABLED=true`          | Mengaktifkan alur SSO                                |

Peladen **menolak menyala** bila suatu pengandar diaktifkan tanpa parameter
pendampingnya, dan menyebutkan variabel mana yang kurang.

## 8. Yang Belum Dikerjakan

Tahap ini adalah **setup**: kerangka, konfigurasi, kontrak, dan perkakas. Modul
fungsional belum dibangun. Batas tanggung jawab tiap modul sudah ditetapkan di
[`apps/api/src/modules/README.md`](apps/api/src/modules/README.md), dan urutan
pembangunannya mengikuti peta fase pada `docs/` Bagian F § F.6.

Tiga hal yang **wajib** dibereskan sebelum sistem dipakai sungguhan:

1. **Ganti sidik kata sandi akun superadmin** pada `database/jdih_ith_seed.sql`
   bagian 16 — nilainya masih contoh.
2. **Verifikasi data institusional**: nomenklatur unit kerja pada OTK ITH, daftar
   resmi jenis produk hukum, dan nomor peraturan rujukan tingkat nasional.
   Sepuluh butirnya ada di `docs/` Bagian A § A.9.
3. **Selaraskan warna institusi** pada `apps/web/src/app/globals.css` dengan
   pedoman identitas visual ITH. Nilai yang ada sekarang hanya sementara.
