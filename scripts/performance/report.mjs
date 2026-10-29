import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const root = resolve('test-results/performance-local');
const destination = resolve('docs/performance/2026-10-26');
const filenames = ['baseline.json', 'optimized-final.json', 'search-final.json', 'baseline-browser.json', 'optimized-browser.json', 'validation.json', 'overload.json', 'smoke.json', 'detail-smoke.json'];
const reports = {};
for (const name of filenames) {
  const json = await readFile(resolve(root, name), 'utf8');
  assert.ok(!/"(?:password|token|session_key|cookie)"\s*:/i.test(json), 'Never publish private fixture files');
  reports[name] = JSON.parse(json);
}
const baseline = reports['baseline.json'], final = reports['optimized-final.json'];
const mobileBefore = reports['baseline-browser.json'], mobile = reports['optimized-browser.json'];
const validation = reports['validation.json'], overload = reports['overload.json'];
const allResults = [...final.results, ...reports['search-final.json'].results];
assert.equal(final.results.length, 9, 'Complete every load phase before generating the report');
assert.ok(final.results.every(r => r.failures === 0), 'Do not report a failed load run as successful');
assert.equal(reports['search-final.json'].results.length, 1);
assert.ok(allResults.every(r => r.failures === 0));
assert.ok(mobile.results.every(r => !r.overflow && r.errors.length === 0));
await mkdir(destination, { recursive: true });
for (const [name, json] of Object.entries(reports)) await writeFile(resolve(destination, name), JSON.stringify(json, null, 2) + '\n');
const number = n => n.toLocaleString('id-ID', { maximumFractionDigits: 2 });
const reduction = (before, after) => number(100 * (1 - after / before));
const total = allResults.reduce((n, r) => n + r.requests, 0);
const row = r => `| ${r.name} | ${r.users} | ${number(r.thinkMs)} ms | ${number(r.seconds)} s | ${number(r.requests)} | ${number(r.rps)} | ${number(r.latencyMs.p95)} ms | ${r.failures} |`;
const mobileRow = r => {
  const old = mobileBefore.results.find(b => b.path === r.path);
  return `| ${r.path} | ${number(old.lcpMs / 1000)} → ${number(r.lcpMs / 1000)} s | ${number(old.transferredBytes / 1000)} → ${number(r.transferredBytes / 1000)} KB | ${number(old.scriptBytes / 1000)} → ${number(r.scriptBytes / 1000)} KB | ${r.cls} |`;
};
const text = `# Pengujian produksi lokal JDIH ITH — 26 Oktober 2026

## Hasil dan batas kesimpulan

Build produksi lokal selesai diuji: **${number(total)} permintaan pada sepuluh
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

- ${final.machine.cpu}, ${final.machine.logicalCPUs} logical CPU,
  ${number(final.machine.memoryGiB)} GiB RAM fisik, Windows, Node 24.21.0,
  MySQL ${final.fixture.mysqlVersion}, Next 16.3.6.
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

Fase web baseline: ${baseline.results[0].requests} permintaan, semuanya HTTP 200,
tetapi **${baseline.results[0].failures} hasil tidak memuat dokumen**
(${number(baseline.results[0].failureRate * 100)}% seluruh permintaan fase web).
Fase ini mencakup lima halaman; kegagalan isi muncul di beranda. Setelah perbaikan,
fase web akhir berisi ${final.results[0].requests} hasil valid dan nol kegagalan.
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
${allResults.map(row).join('\n')}

Soak berlangsung dua menit; ini pengamatan singkat, bukan tes kebocoran memori
berjam-jam/hari. RSS tertinggi yang teramati pada run akhir: API
${number(Math.max(...allResults.map(r => r.api.peakRssMiB)))} MiB, Next
${number(Math.max(...allResults.map(r => r.web.peakRssMiB)))} MiB. Angka working
set Windows dipengaruhi paging dan tidak boleh menjadi ukuran RAM server minimum.

## Ponsel pada jaringan lambat

Chromium 390×844, cache browser kosong, server hangat, CPU slowdown 4×,
RTT 100 ms, unduh 1,6 Mbps dan unggah 750 Kbps. Satu sampel navigasi per halaman
pada tiap versi, sehingga angka sensitif terhadap kondisi host. LCP/CLS ini
**metrik lab**, bukan INP, data lapangan atau skor Lighthouse.

| Halaman | LCP sebelum → sesudah | Transfer awal | JavaScript terkompresi | CLS sesudah |
| --- | ---: | ---: | ---: | ---: |
${mobile.results.map(mobileRow).join('\n')}

JavaScript beranda turun ${reduction(mobileBefore.results[0].scriptBytes, mobile.results[0].scriptBytes)}%.
Gambar hero mobile hasil optimasi ${number(mobile.results[0].heroBytes / 1000)} KB;
foto asli detail sebelumnya 607,81 KB. Transfer awal detail turun
${reduction(mobileBefore.results[2].transferredBytes, mobile.results[2].transferredBytes)}%.
PDF viewer native pada profil Chromium mobile ini tidak tersedia; fallback buka
tab/unduh diverifikasi. Preview native setelah scroll diuji terpisah pada matriks
browser. Fixture PDF baseline mula-mula belum merupakan PDF lengkap dan diperbaiki
sebelum validasi file; jangan memakai baseline ini untuk klaim kecepatan render PDF.
Perbaikan utama transfer awal detail berasal dari gambar latar responsif.

Beranda pada profil lambat masih memerlukan perbaikan bila target lab LCP <2,5
detik dijadikan syarat peluncuran. Ukur kembali pada HTTP/2 dan server tujuan;
pantau LCP/INP/CLS pengguna nyata sebelum menyatakan target pengalaman terpenuhi.

## Validasi fungsi dan penanganan beban berlebih

${validation.passed.map(name => '- ' + name).join('\n')}

Empat penulis menyelesaikan siklus create/upload/approve/publish/withdraw dalam
${number(validation.workflowMs)} ms pada run validasi terakhir. Ini cek integritas
serentak, bukan benchmark throughput unggahan berkelanjutan. Persetujuan draf
sendiri menggunakan jalur khusus Superadmin sesuai aturan terbaru.

Pada simulasi lock tabel 1,5 detik: ${overload.requests} permintaan bersamaan,
${overload.statuses['200']} selesai 200 dan ${overload.statuses['503']} ditolak
terkendali dengan 503/Retry-After. Koneksi MySQL teramati
${overload.connectionsDuringBlock}: pool aplikasi ${overload.poolLimit} ditambah
satu pengendali uji. Setelah lock dilepas, permintaan berikutnya berhasil dalam
${number(overload.recoveryMs)} ms. Respons 503 ini **sengaja diharapkan** pada tes
overload, terpisah dari sepuluh fase normal yang semuanya nol kegagalan.

Matriks browser: ${reports['smoke.json'].checks} pemeriksaan halaman publik,
login, profil, Admin/Superadmin, ditambah ${reports['detail-smoke.json'].checks}
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
`;
await writeFile(resolve('docs/PERFORMANCE_PRODUCTION_2026-10-26.md'), text);
console.log(`Report ready: ${total} requests, ${allResults.length} phases, no failures.`);
