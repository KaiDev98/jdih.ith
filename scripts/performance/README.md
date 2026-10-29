# Pengujian performa lokal yang terisolasi

Harness ini menjalankan **build produksi**, bukan `next dev`. Target dikunci ke
MySQL `127.0.0.1:3309`, API `3401`, Next standalone `3400`, dan HTTPS lokal `3443`.
Database development di port lain tidak dipakai. Jangan deploy gateway uji ini:
alamat IP sintetis bertanda HMAC hanya digunakan untuk memodelkan pengunjung
berbeda di balik reverse proxy lokal.

Semua data, sertifikat sementara, sesi sintetis, metrik dan laporan berada di
`test-results/performance-local/` yang diabaikan Git. Jangan membagikan
`*.private.*`, `env.private.json`, `sessions.private.json`, `mysql-data/`, atau
`tls.key`. Hak `mode: 0600` pada Node tidak menggantikan ACL Windows; batasi folder
ini ke akun lokal saat menjalankan harness pada mesin bersama.

## Persiapan pertama

Jalankan dari root repo. Dibutuhkan Node/npm, MySQL **8.4**, OpenSSL, dependency
workspace, dan Playwright beserta browsernya untuk tes browser.

```powershell
npm.cmd run build --workspace @jdih/shared
node scripts/performance/prepare.mjs --mysqld D:/mysql-8.4/mysql-8.4.11-winx64/bin/mysqld.exe
```

`prepare` menolak datadir yang sudah ada dan port MySQL yang sedang dipakai.
Tidak ada reset otomatis. Untuk menggunakan ulang instance, langsung mulai
mysqld dengan konfigurasi yang sudah dibuat; jangan mengulang persiapan/fixture.
`OPENSSL_BIN` dapat menunjuk executable OpenSSL yang tersedia pada host.

Jalankan mysqld pada terminal tersendiri:

```powershell
& D:/mysql-8.4/mysql-8.4.11-winx64/bin/mysqld.exe --defaults-file=D:/jdih.ith/test-results/performance-local/mysql.cnf --console
```

Kemudian buat fixture **sekali** dan build:

```powershell
node scripts/performance/fixture.mjs
npm.cmd run build --workspace @jdih/api
node scripts/performance/build-web.mjs
```

Fixture memeriksa `@@datadir` dan `@@port` sebelum menulis. Isinya 10.000 dokumen,
versi dan file, serta 100 akun/sesi sintetis. PDF valid sekitar 1 MiB memakai
storage key unik dan hard link per kelompok 500 file: **tes ini tidak mengukur
kapasitas atau throughput disk dingin 10 GiB**. Tidak ada sesi pengguna nyata.
MySQL baru bersifat loopback-only; user aplikasi hanya mempunyai hak DML.

Jalankan masing-masing pada terminal tersendiri:

```powershell
node scripts/performance/run.mjs api
node scripts/performance/run.mjs web
node scripts/performance/run.mjs gateway
```

## Pengukuran dan verifikasi

Jalankan tahap berat satu per satu. Selesaikan lint, unit test dan build sebelum
mengukur agar proses tersebut tidak mengganggu hasil. Pemanasan server boleh
dilakukan dahulu; pengukuran browser selalu memakai HTTP cache klien baru.

```powershell
node scripts/performance/validate.mjs
node scripts/performance/release-security.mjs
node --test scripts/performance/proxy-request.test.mjs
node scripts/performance/overload.mjs
node scripts/performance/load.mjs optimized-final
node scripts/performance/load.mjs search-final
node scripts/performance/report.mjs
```

`validate` menjalankan empat alur tulis nyata secara bersamaan, termasuk upload,
approve, publish dan withdraw, memeriksa nonce/CSP, cache privat, otorisasi,
ketepatan daftar terbaru serta byte range. Dokumen validasi ditarik melalui API;
riwayatnya dipertahankan. `overload` sengaja menahan lock tabel pada database
sintetis selama 1,5 detik untuk memeriksa antrean terbatas, respons 503 dan
pemulihan. Jangan menjalankannya bersama pengukuran normal.

`release-security` memeriksa bug cookie kedaluwarsa, no-store pada respons
bergantung sesi, CSRF/Origin, batas Admin, registrasi password pending tanpa
promosi peran, persetujuan/penonaktifan akun beserta pencabutan sesi, serta
persetujuan SOP Permohonan SK yang langsung terbit dengan akses Internal tetap
terlindungi. Seluruh target dikunci ke fixture produksi lokal pada port 3309/
3443 dan datadir marker diperiksa sebelum penulisan. Akun sintetis akhirnya
NONAKTIF dan SOP ditarik; riwayat audit dipertahankan. Tidak mengirim surel.

`load` memeriksa isi respons, bukan status HTTP saja. Hasil per tahap ditulis
bertahap ke JSON; proses keluar dengan status gagal jika ada kegagalan pada
skenario `optimized*`. VU adalah pengguna virtual dalam model loop tertutup
dengan waktu jeda; RPS adalah hasil pengukuran, bukan laju kedatangan yang dijamin.
Rate limit tetap aktif, termasuk autentikasi, file dan pembatasan per-IP.
Mode `search-final` menambahkan pencarian kata kunci, kategori, facets, hasil
kosong dan paginasi lebih dalam; jalankan setelah matriks utama.

Jika Playwright tidak terpasang pada dependency workspace, arahkan
`PLAYWRIGHT_MODULE` ke paket driver Playwright yang sudah tersedia:

```powershell
node scripts/performance/browser.mjs optimized
node scripts/performance/smoke.mjs
```

`browser` memakai Chromium 390×844, CPU 4× lebih lambat, RTT 100 ms, unduh 1,6
Mbps, unggah 750 Kbps, dan cache browser kosong. Ini metrik lab, bukan INP/CrUX
pengguna nyata. `smoke` memeriksa halaman publik, login, profil, Admin dan
Superadmin pada lebar 320/1440 di Chromium, Edge dan WebKit. Edge harus tersedia
untuk menjalankan matriks lengkap.

Untuk baseline, jalankan `load.mjs baseline` dan `browser.mjs baseline` pada build
sebelum perubahan; jangan mengganti label baseline memakai build yang baru.

## Penghentian

```powershell
node scripts/performance/stop-service.mjs api web gateway
& D:/mysql-8.4/mysql-8.4.11-winx64/bin/mysqladmin.exe --protocol=TCP --host=127.0.0.1 --port=3309 --user=root shutdown
```

Periksa marker/datadir instance sebelum menghentikan MySQL. Helper service hanya
menerima PID metrik yang masih baru. Data hasil uji tetap disimpan untuk ditinjau;
tidak ada penghapusan rekursif otomatis. Saat menjalankan ulang setelah enam jam,
sesi fixture perlu diperbarui melalui proses fixture yang ditinjau; jangan
menonaktifkan pemeriksaan kedaluwarsa sesi pada aplikasi.

Laporan hasil awal: [PERFORMANCE_PRODUCTION_2026-10-26.md](../../docs/PERFORMANCE_PRODUCTION_2026-10-26.md).
