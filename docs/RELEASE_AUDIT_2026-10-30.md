# Audit rilis JDIH ITH — 30 Oktober 2026

Audit dilakukan pada branch `nesta`, dari baseline
`0402f6e9afc64afeed2c5d5f01039294da257e11`, termasuk seluruh perubahan aplikasi
yang belum dikomit dari pengerjaan sebelumnya. Ini adalah bukti pemeriksaan
repository dan runtime lokal produksi, bukan bukti deployment di server ITH.
Tidak ada layanan, data produksi institusi, DNS, sertifikat publik, atau
kredensial Google nyata yang diubah.

## Lingkungan dan batas pengujian

- Windows x64, Node LTS **24.22.2**, npm **11.19.1**, MySQL **8.4.11**.
- Next.js **16.4.3**, React/React DOM **19.3.1**, Sharp **0.35.5**,
  Nest Express **12.3.2**, Multer **2.5.0**, Vitest **5.0.5**, Zod **4.6.7**.
- MySQL uji di `127.0.0.1:3309`; datadir dicocokkan dengan marker fixture.
  Integrasi memakai `jdih_ith_v2_test` dan database policy sintetis terpisah.
  Database kerja di port lain tidak di-reset atau dipakai sebagai fixture.
- Runtime produksi lokal: API `3401`, Next standalone `3400`, HTTPS `3443`.
  Database bernama `jdih_ith_v2_prod` **hanya pada instance disposable ini**,
  berisi 10.000 dokumen dan 100 akun sintetis ditambah riwayat uji.
- Sertifikat self-signed hanya dipercayai harness. Gateway/IP sintetis untuk
  beban bukan konfigurasi yang boleh dipasang pada server publik.
- File fixture valid sekitar 1 MiB memakai hard link. Pengukuran tidak membuktikan
  kapasitas disk dingin 10 GiB, jaringan WAN atau spesifikasi VPS yang berbeda.

## Temuan dan perbaikan

| Temuan | Dampak | Perbaikan dan bukti |
| --- | --- | --- |
| Audit awal npm: 19 paket terdampak, 3 critical/8 high/8 moderate | Termasuk advisori Next.js/Sharp dan komponen pemrosesan request/unggahan | Pembaruan dalam rentang mayor yang digunakan; versi minimum penting diselaraskan dan lockfile diperbarui. Audit akhir: **0 vulnerabilities**, termasuk dev dependencies. |
| Esbuild lama melalui tooling Drizzle | Advisori server pengembangan pada dependency transitif | Override terbatas pada `@esbuild-kit/core-utils` ke esbuild `^0.25.12`; tidak memakai downgrade Drizzle atau `audit fix --force`. Instalasi bersih, CLI Drizzle dan build berhasil. |
| Cookie kedaluwarsa/revoked membuat akses publik ikut gagal | Pencarian, format, detail dan PDF publik dapat membalas 401 setelah sesi berakhir | `optionalUser()` hanya menurunkan kegagalan autentikasi menjadi anonim. Gangguan DB tetap diteruskan. Rute tertutup tetap 401; Internal tetap 404. Unit test dan HTTPS nyata lulus. |
| Cache header belum eksplisit pada detail dokumen dan daftar template yang bergantung sesi | Risiko respons identitas masuk ke cache bersama | `Cache-Control: private, no-store` dan `Vary: Cookie`; diuji pada respons produksi. |
| Pola ignore belum melindungi `backend/storage` dan variasi env produksi | Unggahan atau konfigurasi lokal berisiko ikut staging pada repo publik | Aturan ignore diperluas, contoh env tetap dilacak; foto sumber dan PDF referensi lokal dikecualikan. Pemeriksaan berkas rilis dan riwayat Git tidak mendeteksi signature kredensial atau kecocokan dengan rahasia lokal. |
| `setup`/`doctor` masih membaca konfigurasi XAMPP/JWT legacy | Petunjuk setup dapat mengarahkan operator ke konfigurasi yang tidak dipakai V2 | Keduanya memakai env V2 dan SESSION_KEY; doctor memeriksa Node yang didukung, konfigurasi, build shared dan koneksi TCP tanpa menampilkan rahasia. |
| Runtime minimum masih mengizinkan Node 20 yang sudah EOL | Deployment bisa memakai runtime tanpa dukungan keamanan | `.nvmrc` dipin 24.22.2; engines dan panduan rilis diperbarui. Runtime audit diunduh resmi dan diverifikasi SHA256. |
| Galat tak terduga belum mempunyai fallback aplikasi | Pengguna dapat berakhir pada layar galat bawaan | Error boundary dan global error boundary menyediakan coba lagi/beranda tanpa pesan exception atau stack. Tes pemulihan dan kebocoran pesan lulus. |
| Tes observer pencarian bergantung urutan flush efek | Satu tes frontend sesekali gagal sebelum observer terpasang | Menunggu efek yang diuji dengan `waitFor`, mempertahankan assertion root viewport/panel. Suite frontend diulang dan seluruhnya lulus. |
| Satu 503 kosong pada percobaan awal streaming beban | Berasal dari gateway lokal, tanpa galat 5xx API pada waktu tersebut; konsisten dengan koneksi keep-alive yang ditutup saat dipakai ulang | Kondisi ECONNRESET pada socket reused direproduksi dengan server HTTP terkontrol. Gateway uji melakukan satu retry pada koneksi baru hanya untuk GET/HEAD tanpa body, sebelum header respons; tidak mengulang write atau HTTP error dari aplikasi. Tiga tes nyata memeriksa pemulihan, larangan replay write dan batas satu retry. Run awal disimpan dan matriks diulang. |
| Panduan deployment berisi ketentuan provisioning/Google/range PDF yang sudah lama | Operator berisiko mengikuti prosedur yang berbeda dari implementasi | Dokumen diselaraskan dengan bootstrap Superadmin, login per peran, Admin yang dibuat Superadmin, byte range dan patch 001–020. |
| Belum ada gerbang pemeriksaan pada push | Regresi berikutnya tidak otomatis diperiksa di GitHub | Workflow `Release checks`: actions dipin ke commit resmi, token hanya read, install dari lockfile, pemindaian berkas, audit npm, MySQL disposable, lint, tipe, tes dan build. Tidak melakukan deployment. |

Advisori primer yang menjadi dasar pembaruan:
[Next.js 14 Oktober 2026](https://nextjs.org/blog/nextjs-security-update-october-14-2026),
[React Server Components](https://github.com/react/react/security/advisories/GHSA-xqc2-xf4c-x3h3),
dan [dukungan rilis Node](https://nodejs.org/en/about/previous-releases).
Audit npm tidak membuktikan ketiadaan seluruh jenis kerentanan; otorisasi dan
alur bisnis juga diperiksa melalui tes tersendiri di bawah.

## Hasil pemeriksaan otomatis

| Pemeriksaan | Hasil |
| --- | --- |
| `npm ci --ignore-scripts` dari lockfile | PASS; native Sharp dan tooling dapat dimuat |
| `npm audit --json` | PASS; 0 info/low/moderate/high/critical |
| Typecheck seluruh workspace | PASS |
| ESLint root dan frontend | PASS |
| Shared contracts | **79 lulus**, 0 gagal/skip |
| Backend, termasuk seluruh MySQL opt-in | **351 lulus**, 0 gagal/skip |
| Frontend setelah perbaikan tes asinkron | **218 lulus**, 0 gagal/skip |
| Proxy harness: reuse socket, write tidak diulang, retry dibatasi | **3 lulus** |
| Total tes final | **651 lulus** (648 aplikasi + 3 harness) |
| Build shared + NestJS + Next standalone | PASS; Next compile, TypeScript, route generation dan postbuild |
| YAML workflow | PASS parse; eksekusi GitHub dicatat terpisah dari hasil lokal |
| Pemeriksaan credential signature dan rahasia lokal pada 28 commit riwayat | Tidak ada temuan terdeteksi |
| Pemeriksaan berkas yang akan dirilis + `git diff --check` | Dilakukan ulang setelah staging final |

Log privat berada di `test-results/release-audit/`, diabaikan Git. Tidak
menyertakan cookie, password, env privat atau sertifikat kunci pada laporan publik.
Pesan 503 dalam tes overload/backend adalah skenario galat yang sengaja diuji,
bukan kegagalan tes.

## Pemeriksaan keamanan dan alur nyata lewat HTTPS

`scripts/performance/validate.mjs` memeriksa tujuh kelompok skenario dan
`scripts/performance/release-security.mjs` menambahkan lima kelompok keamanan.
Keduanya memeriksa datadir sebelum penulisan. Hasil: **PASS**.

- Guard tertutup secara default; aktor dari body/request tidak dipercaya.
- CSRF hilang/salah dan Origin lintas situs ditolak. Registrasi publik tetap
  wajib same-origin. Cookie sesi memiliki HttpOnly, Secure, SameSite=Lax dan
  tidak mempunyai Domain.
- Registrasi password memakai domain pribadi tetap menghasilkan DOSEN_STAF
  MENUNGGU_VERIFIKASI. Payload yang mencoba mengirim role/status ditolak.
  Pending tidak mendapat Internal; login melalui jalur Admin ditolak.
- Persetujuan akun oleh Superadmin membuka Internal, lintas unit; penonaktifan
  mencabut sesi saat itu juga. Cookie yang dicabut tetap dapat membaca publik.
- Admin tidak dapat menulis master global, membaca audit, atau membuka daftar/
  detail SOP Permohonan SK. Batas kategori/unit dan kepemilikan diuji ulang di
  service/SQL, termasuk penolakan direct permission yang tidak sesuai peran.
- File diperiksa ulang hak aksesnya pada setiap permintaan. Draf belum terbit,
  file lama yang bukan current dan dokumen yang ditarik tidak bocor melalui URL.
- Upload memeriksa signature, ekstensi, ukuran, file utama dan checksum; path
  storage acak/privat. Nama berkas tidak menjadi path filesystem.
- PDF full, range, suffix, invalid range dan If-Range fallback sesuai status dan
  panjang data. Header privat dan pembatasan laju tetap berlaku.
- Empat alur create/upload/approve/publish/withdraw sungguhan berjalan bersamaan.
  Dokumen langsung terlihat setelah publish dan file tidak dapat dibuka setelah
  withdrawal. Pointer/current, rollback dan audit diuji pada integrasi MySQL.
- SOP Permohonan SK disetujui lalu **langsung TERBIT dalam transaksi yang sama**.
  Akses Internal tetap tertutup bagi anonim. Dokumen biasa masih membutuhkan
  tindakan terbit terpisah.
- Nonce CSP berubah setiap HTML response; halaman tetap no-store. Production
  tidak menampilkan login uji atau Swagger. Tabel master di luar allowlist 404.
- Query memakai parameter; pilihan tabel/urut/filter dibatasi kontrak. Email
  pengguna lain disensor bagi Admin, sedangkan email akun sendiri tetap lengkap.

Larangan umum menyetujui versi sendiri mempunyai pengecualian eksplisit pada
revisi V2 25 Oktober: Superadmin dapat menyetujui DRAF/REVISI miliknya. Tes
mempertahankan pengecualian tersebut; draf Admin tetap diverifikasi Superadmin.

## Tampilan dan interaksi produksi

Chrome headless memakai profil terpisah, dengan CSP produksi aktif:

- **92 skenario** login/daftar meliputi peran, langkah, galat, ukuran layar dan
  reduced motion; tanpa exception browser atau elemen formulir terpotong.
- Empat jalur autentikasi dibandingkan sebelum/sesudah keyboard pada 390/320 px;
  latar, masthead, radius, logo dan jarak tetap sama. Layout/visual viewport
  menyusut sampai 280 px, pindah fokus, validasi dan pemulihan diuji.
- Logo tiga jalur login dipusatkan pada enam ukuran layar: **18 pemeriksaan**.
- Dropdown unit diuji dengan **80 unit** di empat ukuran, termasuk gulir,
  keyboard, typeahead, Escape, validasi/fokus, unit manual dan reduced motion.
- Format Persuratan dan SOP Permohonan SK diuji kosong dan dengan **14 berkas
  per koleksi** pada lima ukuran. Desktop tiga kolom, tablet dua dan ponsel satu;
  halaman pertama 12 kartu, halaman kedua dua. Tidak ada search bar atau
  luapan horizontal. Fixture diarsipkan/ditarik setelah pengujian.
- **12 kombinasi panel/ukuran** untuk Admin/Superadmin: desktop tetap dan daftar
  bergulir sendiri dengan filter terlihat; ponsel menggulir halaman. Dropdown
  koleksi beranimasi, fokus tanpa garis oranye, Escape memulihkan fokus, pilihan
  SOP khusus hanya untuk Superadmin.
- Panel jenis produk hukum di beranda diperiksa pada 320/390/768/1366 px,
  termasuk DPR 3; bayangan di ponsel tidak lagi dipotong di batas hero.
- Pemeriksaan konsol/Audits pada **21 halaman produksi**, termasuk detail PDF
  publik/internal dan dropdown panel: **0 pelanggaran CSP, 0 runtime exception**.

Emulasi keyboard/browser membantu menemukan regresi, tetapi tidak menggantikan
smoke test pada Safari/iOS dan Android fisik di domain deployment.

## Pengukuran beban produksi lokal

Hasil pengukuran ulang final: **6.760 request, 0 gagal**. Ini terdiri dari
5.952 request pada sembilan tahap dan 808 request pencarian berfilter.

| Tahap | Pengguna virtual | Request | p95 (ms) | Gagal |
| --- | ---: | ---: | ---: | ---: |
| Web publik | 10 | 300 | 605 | 0 |
| API publik | 25 | 1.106 | 246 | 0 |
| Panel terautentikasi | 20 | 667 | 197 | 0 |
| Dosen/Staf terautentikasi | 25 | 736 | 349 | 0 |
| Streaming PDF | 8 | 204 | 175 | 0 |
| Byte range PDF | 8 | 232 | 47 | 0 |
| Lonjakan web | 50 | 450 | 2.604 | 0 |
| Pemulihan web | 5 | 89 | 423 | 0 |
| API selama dua menit | 15 | 2.168 | 209 | 0 |
| Pencarian/filter | 25 | 808 | 935 | 0 |

Data [pengukuran final](performance/2026-10-30/verified-load.json),
[pencarian](performance/2026-10-30/filtered-search.json) dan
[percobaan awal](performance/2026-10-30/initial-load.json) disertakan. Percobaan
awal mempunyai satu 503 kosong gateway pada 6.644 request; hasil tersebut tidak
dihapus atau digabung seolah-olah lulus. Tidak ada error gateway pada run final.
Latensi lonjakan 50 pengguna lebih tinggi daripada beban normal; angka ini
bukan jaminan kapasitas VPS atau latensi pengguna Internet.

Skenario saturasi terpisah: 160 request, 110 sukses dan 50 respons **503 yang
diharapkan** ketika antrean dibatasi, tidak ada 500. Pool tetap 10 koneksi;
layanan pulih dalam sekitar **22 ms** setelah blok dilepas. Ini pengujian
backpressure yang disengaja, terpisah dari beban normal.

## Sebelum membuka domain publik

Kode yang lulus audit tetap memerlukan verifikasi pada host deployment.
Ikuti [DEPLOYMENT_V2.md](DEPLOYMENT_V2.md):

1. Gunakan commit rilis yang diverifikasi di `nesta`. Build ulang pada OS server
   memakai Node LTS 24.22.2+, bukan menyalin node_modules/.next Windows ke Linux.
2. Tetapkan origin HTTPS asli sebelum build, env privat di luar repo,
   LOGIN_UJI=false, NEXT_PUBLIC_LOGIN_UJI=false, Swagger mati, cookie Secure,
   trust proxy sesuai topologi dan hanya satu proses API.
3. Sediakan MySQL 8.4 privat dengan akun aplikasi DML, storage privat di luar
   web root, backup DB+storage yang berpasangan dan uji restore terisolasi.
   Fresh install memakai schema/seed terkini; DB V2 lama hanya patch yang belum
   diterapkan, dengan review DBA. Jangan menjalankan reset/import legacy.
4. Provision Superadmin awal melalui operasi terkontrol dan atur password
   interaktif. Verifikasi kredensial Google ITH, issuer/audience/hd, callback
   exact dan alur live OIDC dengan akun institusi; ini belum diuji di domain asli.
5. Validasi Nginx/systemd, firewall, sertifikat/renewal, HTTPS/CSP/cookie, liveness/
   readiness, upload/download serta peran pada domain asli. Siapkan monitoring
   5xx/429/disk dan rollback ke release sebelumnya.

Belum ada antivirus scanner, storage S3, shared OAuth/rate-limit store atau
migration runner otomatis. Ukuran/tipe/checksum unggahan divalidasi, tetapi
validasi tersebut bukan pemindaian malware. Batas operasional ini dijelaskan
pada runbook; jangan menjalankan beberapa replika API tanpa pekerjaan tambahan.
