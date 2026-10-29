# Pengujian produksi lokal JDIH ITH — 26 Oktober 2026

## Hasil dan batas kesimpulan

Build produksi lokal selesai diuji: **8.687 permintaan pada sepuluh
fase normal, spike, recovery dan soak, tanpa kegagalan HTTP maupun kegagalan isi
yang diperiksa harness**. Puncak model pengunjung adalah 50 VU pada fase web.
Seluruh **568 tes** lulus: shared 77, backend 309 (seluruh integrasi MySQL aktif),
frontend 182. Lint dan typecheck lulus. Build Nest dan Next standalone lulus;
postbuild juga menguji native image optimizer di proses baru.

Ini membuktikan perilaku build pada **host uji lokal** dengan skenario di bawah.
Kapasitas VPS produksi, SLO, availability harian, dan ribuan pengguna nyata belum
tersertifikasi. Server produksi belum dipilih. Tidak ada deployment ke server
publik dalam pekerjaan ini.

## Lingkungan

- 13th Gen Intel(R) Core(TM) i7-13620H, 16 logical CPU,
  7,8 GiB RAM fisik, Windows, Node 24.21.0,
  MySQL 8.4.11, Next 16.3.6.
- Next standalone, Nest hasil kompilasi, NODE_ENV=production, secure cookie dan
  HTTPS lokal. Gateway uji memakai HTTP/1.1; konfigurasi Nginx contoh memakai
  HTTP/2, tetapi Nginx/Linux belum diukur pada pekerjaan ini.
- Generator beban, database dan aplikasi berbagi laptop. Layanan development
  tetap tersedia. Pengukuran akhir dilakukan setelah build/lint/unit test selesai;
  pergantian proses API development sempat berjalan singkat pada awal run akhir.
  CPU, paging dan kegiatan OS dapat memengaruhi angka.
- Seed 10.000 dokumen/versi/file dan 100 akun sintetis (10 Superadmin,
  20 Admin, 70 Dosen/Staf). Dokumen mencampur publik/internal dan terbit/draf.
  Tiap dokumen seed hanya satu versi; distribusi riwayat produksi yang panjang
  belum dimodelkan. Fixture workflow menambah sedikit draf/riwayat yang ditarik.
- PDF valid sekitar 1 MiB; storage key unik, hard link untuk menghemat disk.
  Cache filesystem hangat: hasil file **bukan** pengujian cold disk atau storage
  10 GiB yang terisi data unik.
- Rate limit tetap aktif. IP sintetis yang ditandatangani pada gateway lokal
  memodelkan pengunjung berbeda. IP pemanggilan SSR dari Next tetap IP server;
  gateway ini tidak boleh dipakai di deployment.
- Sesi uji dibuat khusus fixture. Google OAuth nyata tidak dihubungi. Login uji
  lokal nonaktif di produksi dan dibuktikan menghasilkan 404.

## Masalah yang ditemukan dan diperbaiki

1. **Beranda kehilangan isi saat dibebani walaupun HTTP 200.** Sebelumnya frontend
   memanggil daftar per jenis dan per kategori untuk mengambil hitungan/dokumen
   terbaru; permintaan SSR menumpuk pada IP server dan terkena rate limit.
   Sekarang satu endpoint publik menghasilkan hasil melalui tiga query tetap,
   dengan penggabungan permintaan serentak. Tidak ada TTL cache hasil dokumen:
   publikasi/penarikan dibaca kembali pada permintaan berikutnya. Query hanya
   memakai versi publik TERBIT yang menjadi current pointer dan belum dihapus.
2. **Unggah pertama serentak pada dokumen berbeda dapat deadlock.** Pembacaan
   kosong pada tabel file dengan FOR UPDATE mengambil gap lock antardokumen.
   Penguncian versi induk yang sudah ada tetap dipakai; pembacaan keberadaan file
   tidak lagi mengambil gap lock. Tes MySQL membuktikan empat unggahan berbeda
   berhasil dan empat unggahan bersamaan ke satu versi tetap hanya menyimpan satu.
3. **Startup production menolak nama database production yang sah.** Guard
   koneksi kini mencocokkan lingkungan, versi MySQL dan nama database aktual;
   target development/test tetap ditolak pada mode produksi.
4. **Antrean pool tidak terbatas.** Ditambahkan batas antrean (default 100),
   connect timeout 5 detik dan cache prepared statement 256 per koneksi. Pool
   default 10 koneksi. Overload/kegagalan koneksi tertentu menghasilkan 503
   dengan Retry-After tanpa mengekspos SQL; diagnosis server menyertakan kode
   driver yang aman dan stack tanpa pesan SQL pada galat tak terduga.
5. **Unduhan/pratinjau PDF selalu mengirim file penuh.** API file publik dan panel
   kini mendukung single byte range, suffix, open end, 206 dan 416. If-Range tanpa
   validator cocok kembali ke respons penuh. Hak akses dan rate limit tetap dicek
   pada setiap permintaan. Pipeline menutup source saat klien membatalkan koneksi.
   Pratinjau blob pada UI tetap menampilkan galat yang jelas; ia mulai dimuat saat
   mendekati viewport dan tidak mengalokasikan blob URL setelah dibatalkan.
6. **Paket standalone kehilangan DLL pendamping Sharp pada Windows.** Next diam-diam
   mengirim gambar asli saat optimasi gagal. Native library kini ikut dalam trace;
   pemeriksaan proses baru menggagalkan build bila runtime optimizer tidak bekerja.
7. **Gambar latar besar, font eksternal dan JavaScript yang tidak diperlukan.**
   Hero beranda, pencarian dan detail memakai gambar responsif. Archivo yang sama
   di-host lokal beserta lisensi OFL, sehingga build tidak memerlukan Google Fonts.
   Provider query yang tidak digunakan dilepas; import runtime shared dipersempit
   dan paket kontrak diberi penanda pure untuk tree shaking.
8. **Cache perlu dibedakan menurut identitas.** Nonce HTML tetap baru pada setiap
   permintaan. Metadata publik boleh direvalidasi secara eksplisit; SSR berizin
   selalu no-store, pencarian yang bergantung sesi memakai private/no-store dan
   Vary Cookie. File tetap private/no-store. Contoh Nginx menambahkan gzip dan
   buffering aset statis sambil mempertahankan streaming HTML/API.

## Perbandingan baseline

Fase web baseline: 440 permintaan, semuanya HTTP 200,
tetapi **74 hasil tidak memuat dokumen**
(16,82% seluruh permintaan fase web).
Fase ini mencakup lima halaman; kegagalan isi muncul di beranda. Setelah perbaikan,
fase web akhir berisi 390 hasil valid dan nol kegagalan.
Karena sebagian baseline merender isi yang kurang, latensi baseline web tidak
boleh diperlakukan sebagai perbandingan kecepatan dengan hasil yang setara.

## Uji beban akhir

VU adalah loop tertutup dengan jeda per pengguna. RPS merupakan hasil, bukan
laju kedatangan terbuka. Fase web merotasi beranda, pencarian, format persuratan,
profil dan kontak. API merotasi daftar, pencarian, facets, tahun dan kategori.
Panel mencampur sesi Admin/Superadmin; fase staf mencakup dokumen internal.
File range harus mengembalikan tepat 65.536 byte beserta Content-Range yang benar.
Fase pencarian terpisah merotasi kata kunci judul, kategori Laboratorium,
facets, tahun, paginasi halaman 20, dan pencarian tanpa hasil.

| Fase | VU | Jeda | Durasi | Permintaan | RPS | p95 respons penuh | Gagal |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| public-web | 10 | 300 ms | 20,3 s | 390 | 19,21 | 302,96 ms | 0 |
| public-api | 25 | 300 ms | 20,32 s | 1.341 | 65,99 | 120,53 ms | 0 |
| authenticated-panel | 20 | 500 ms | 20,5 s | 729 | 35,56 | 110,65 ms | 0 |
| authenticated-staff | 25 | 500 ms | 20,51 s | 877 | 42,75 | 173,13 ms | 0 |
| file-stream | 8 | 500 ms | 15,2 s | 219 | 14,41 | 81,54 ms | 0 |
| file-range | 8 | 500 ms | 15,48 s | 234 | 15,12 | 34,09 ms | 0 |
| burst-web | 50 | 500 ms | 20,1 s | 750 | 37,32 | 1.176,43 ms | 0 |
| recovery-web | 5 | 700 ms | 15,14 s | 95 | 6,27 | 190,13 ms | 0 |
| soak-api | 15 | 700 ms | 120,66 s | 2.431 | 20,15 | 78,43 ms | 0 |
| filtered-search | 25 | 300 ms | 30,45 s | 1.621 | 53,23 | 281,87 ms | 0 |

Soak berlangsung dua menit; ini pengamatan singkat, bukan tes kebocoran memori
berjam-jam/hari. RSS tertinggi yang teramati pada run akhir: API
198,73 MiB, Next
483,95 MiB. Angka working
set Windows dipengaruhi paging dan tidak boleh menjadi ukuran RAM server minimum.

## Ponsel pada jaringan lambat

Chromium 390×844, cache browser kosong, server hangat, CPU slowdown 4×,
RTT 100 ms, unduh 1,6 Mbps dan unggah 750 Kbps. Satu sampel navigasi per halaman
pada tiap versi, sehingga angka sensitif terhadap kondisi host. LCP/CLS ini
**metrik lab**, bukan INP, data lapangan atau skor Lighthouse.

| Halaman | LCP sebelum → sesudah | Transfer awal | JavaScript terkompresi | CLS sesudah |
| --- | ---: | ---: | ---: | ---: |
| / | 5,94 → 3,6 s | 790,75 → 533,4 KB | 403,76 → 305,96 KB | 0 |
| /produk-hukum | 5,26 → 2,2 s | 789,13 → 531,36 KB | 408,54 → 311,07 KB | 0 |
| /produk-hukum/load-1 | 7,09 → 2,83 s | 1.196,1 → 529,62 KB | 406,4 → 308,72 KB | 0 |

JavaScript beranda turun 24,22%.
Gambar hero mobile hasil optimasi 49,37 KB;
foto asli detail sebelumnya 607,81 KB. Transfer awal detail turun
55,72%.
PDF viewer native pada profil Chromium mobile ini tidak tersedia; fallback buka
tab/unduh diverifikasi. Preview native setelah scroll diuji terpisah pada matriks
browser. Fixture PDF baseline mula-mula belum merupakan PDF lengkap dan diperbaiki
sebelum validasi file; jangan memakai baseline ini untuk klaim kecepatan render PDF.
Perbaikan utama transfer awal detail berasal dari gambar latar responsif.

Beranda pada profil lambat masih memerlukan perbaikan bila target lab LCP <2,5
detik dijadikan syarat peluncuran. Ukur kembali pada HTTP/2 dan server tujuan;
pantau LCP/INP/CLS pengguna nyata sebelum menyatakan target pengalaman terpenuhi.

## Validasi fungsi dan penanganan beban berlebih

- Homepage counts/latest match real SQL; private versions excluded
- HTML nonce changes on every request and HTML remains no-store
- Identity-dependent search cannot enter shared caches
- Internal documents and Admin/Superadmin permissions remain enforced
- Production test login is disabled
- Public, Internal and panel PDF full/range/suffix/invalid/If-Range HTTP behavior
- Four simultaneous real create/upload/approve/publish/withdraw workflows, immediate visibility and file revocation

Empat penulis menyelesaikan siklus create/upload/approve/publish/withdraw dalam
508,13 ms pada run validasi terakhir. Ini cek integritas
serentak, bukan benchmark throughput unggahan berkelanjutan. Persetujuan draf
sendiri menggunakan jalur khusus Superadmin sesuai aturan terbaru.

Pada simulasi lock tabel 1,5 detik: 160 permintaan bersamaan,
110 selesai 200 dan 50 ditolak
terkendali dengan 503/Retry-After. Koneksi MySQL teramati
11: pool aplikasi 10 ditambah
satu pengendali uji. Setelah lock dilepas, permintaan berikutnya berhasil dalam
16,87 ms. Respons 503 ini **sengaja diharapkan** pada tes
overload, terpisah dari sepuluh fase normal yang semuanya nol kegagalan.

Matriks browser: 84 pemeriksaan halaman publik,
login, profil, Admin/Superadmin, ditambah 12
pemeriksaan detail/preview setelah perubahan terakhir. Chromium, Edge dan WebKit,
lebar 320/1440: tidak ada galat JavaScript/CSP atau overflow horizontal. Ini belum
menggantikan tes perangkat Android/iOS fisik.

Beberapa fixture integrasi lama masih mengasumsikan Admin memverifikasi akun,
25 tabel, serta policy baca asinkron. Fixture diperbarui mengikuti aturan
Superadmin, schema V2 aktif 27 tabel, dan policy sinkron; kewenangan aplikasi
tidak dilonggarkan untuk meluluskan tes.

## Rekomendasi server awal

**4 vCPU, RAM 8 GB, NVMe minimal 100 GB yang dapat diperbesar**, satu proses API,
satu proses Next, MySQL 8.4 dan Nginx. Ini estimasi awal untuk ratusan/ribuan
kunjungan harian dengan dokumen kampus, bukan janji 1.000 pengguna bersamaan.
Pilih lokasi dengan RTT rendah dari pengguna ITH dan ukur koneksi kampus/operator
seluler ke calon host.

- Mulai pool aplikasi 10 dan antrean 100; naikkan berdasarkan observasi wait time,
  bukan menaikkan seluruh limit sekaligus. Cache prepared statement 256 per koneksi.
- Pada RAM 8 GB, buffer pool MySQL sekitar 2 GB merupakan titik awal yang perlu
  dituning di host tujuan. Sisakan RAM untuk Next, API, OS dan filesystem cache.
  Memory limit proses ditentukan setelah soak lebih panjang pada Linux.
- Hitung storage dari jumlah file × rata-rata ukuran × versi yang dipertahankan,
  lalu tambahkan database, OS, log dan ruang kosong. Contoh 10.000 file × 5 MB
  sudah sekitar 50 GB untuk satu versi. Jangan menaruh satu-satunya backup pada
  disk/server yang sama; uji pemulihan database **dan** file dari backup.
- Ukur kebutuhan bandwidth dari jumlah download, ukuran PDF dan kunjungan;
  jumlah kunjungan harian sendiri belum cukup menentukan paket transfer.
- Saat beban tumbuh, ukur CPU, RSS, p95/p99, 429/503/5xx, antrean pool, slow query,
  latensi disk, storage dan bandwidth. Jika CPU/RAM mulai penuh atau p95 tidak
  memenuhi target, evaluasi 8 vCPU/16 GB atau pisahkan database berdasarkan data.
  Jangan menambah replika API tanpa menyelaraskan rate limit yang kini in-memory.

## Sebelum server publik diluncurkan

Ulangi skenario pada VPS tujuan melalui Nginx/TLS nyata dengan generator pada
mesin lain; gunakan dataset bervariasi, riwayat multiversi dan file berukuran
nyata. Jalankan soak 30–60 menit atau lebih, cold-cache, upload/download paralel,
pengujian OAuth/domain Google, backup/restore dan monitoring. Verifikasi sertifikat,
disk permission dan konfigurasi service Linux. Tetapkan SLO bersama pemilik situs;
hasil laptop ini tidak menggantikan tahapan tersebut.

## Reproduksi dan bukti

[Petunjuk harness](../scripts/performance/README.md). Ringkasan JSON tanpa secret
disertakan di [performance/2026-10-26](performance/2026-10-26/); file sesi/secret dan
datadir tidak ikut dipublikasikan. Layanan uji dapat dihentikan tanpa menghapus
hasil. Layanan development tetap memakai port normal 3000/3001 dan database
development semula, bukan instance uji 3309.

Rujukan primer: [Next self-hosting](https://nextjs.org/docs/app/guides/self-hosting),
[nonce CSP](https://nextjs.org/docs/app/guides/content-security-policy),
[standalone tracing](https://nextjs.org/docs/app/api-reference/config/next-config-js/output),
[mysql2](https://sidorares.github.io/node-mysql2/docs).
