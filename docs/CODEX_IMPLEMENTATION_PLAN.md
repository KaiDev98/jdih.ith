# CODEX IMPLEMENTATION PLAN — JDIH ITH V2

Perluasan Format Persuratan 2026-11-06: REVOKE melalui permintaan pemilik dan
Cabut Format langsung khusus Superadmin. Metadata revoked_at/reason/by terpisah
dari workflow versi; ACTIVE/pointer/akses/file dipertahankan. Uji publik/Internal,
pratinjau/unduh, alasan/tanggal WITA, badge/filter, catatan keputusan opsional,
pemilik, Superadmin/CSRF, replay/stale/konkurensi, rollback audit, perubahan versi
saat dialog terbuka dan notifikasi tanpa duplikasi. Kandidat pending/approved
belum mengganti versi Dicabut; publish baru mengarsip versi lama beserta metadata
pencabutannya. Patch-028 aman diulang, record lama tidak berubah. Periksa kartu
4x3, alasan panjang di dialog, akses keyboard dan ponsel sempit. Tanpa purge.

Revisi pencabutan 2026-11-06: ganti permintaan dokumen baru WITHDRAW dengan
REVOKE; Superadmin juga dapat mencabut langsung tanpa pengganti. Pertahankan
TERBIT/pointer/file/akses, ubah status hukum DICABUT dan simpan riwayat hukum
dengan sumber NULL, alasan, aktor dan tanggal secara atomik bersama audit.
Uji pemilik/Admin/Superadmin/CSRF, versi stale, draft/already-revoked, keputusan
kosong/penolakan, rollback audit, klik/putusan bersamaan, preview/download dan
pencarian publik/internal, notifikasi tunggal, badge dan UI desktop/mobile.
Patch-027 harus aman diulang dan tidak mengonversi dokumen/keputusan lama.
Uji penyelesaian WITHDRAW lama dan Format Persuratan yang tetap memakai penarikan.

Revisi batas dasbor 2026-11-06: maksimal 15 dokumen/versi Terakhir Diperbarui,
urutan terbaru dari API; verifikasi item baru menggantikan item ke-15 tanpa
penghapusan data. Uji polling/fokus/workflow, respons terlambat, kegagalan,
batas pada kedua peran dan gulir internal desktop. Verifikasi akun Dosen/Staf
tetap khusus Superadmin; jangan menawarkan tindakan kepada Admin yang diberi
izin langsung. Dashboard tidak meminta feed audit. Tanpa migrasi.

Revisi permintaan 2026-11-06: catatan keputusan opsional di shared/UI/API dan
CHECK DB (patch-026, aman diulang); penarikan tanpa catatan memakai alasan Admin.
Uji APPROVE/DECLINE kosong, batas panjang, rollback/CSRF/otorisasi, serta
penarikan yang mempertahankan dokumen/file di panel dan menutup portal.
Riwayat keputusan di panel kedaluwarsa setelah 24 jam sejak decided_at melalui
SQL sebelum pagination/count, bukan penghapusan data. Uji batas UTC, PENDING
lama, filter/requestId, pemilik, dan audit yang tetap ada. Badge menu menjumlah
antrean dokumen, format dan permintaan PENDING, dengan pembaruan workflow/fokus/
polling dan penanganan kegagalan; tidak menghitung keputusan selesai.

Revisi antrean 2026-11-06: DIAJUKAN/DISETUJUI dan PENDING_REVIEW/APPROVED tetap
di antrean sampai publish; Semua Dokumen hanya versi pernah diterbitkan.
Uji approval tanpa pindah daftar/pointer, publication memindah, revisi menjaga
publikasi lama, pagination/count/filter server, baca lintas pemilik tanpa hak
ubah, tinjauan APPROVED yang ditutup setelah publish, notifikasi/dashboard,
serta rollback publish. Pindah Hapus Draf ke Berkas dan sembunyikan permanen
di draf/pengajuan Superadmin; uji UI per status/peran, konfirmasi dan seluler.
Tanpa perubahan schema atau migrasi.

Perbaikan bentrok slug Format Persuratan 2026-11-05: uji alamat manual 409,
mode otomatis dengan akhiran unik pada INSERT bentrok (termasuk format terhapus),
batas retry/panjang, unggah serentak, pointer/riwayat lama tetap utuh, rollback
audit dan pembersihan berkas gagal. Perubahan hanya unggah awal; tanpa migrasi.

Revisi dasbor 2026-11-05: panel terbaru di kiri sampai bawah viewport desktop,
tindakan/pintasan di kanan; gulir internal tanpa gulir halaman. Periksa desktop
1024/1440/1920, layar pendek, daftar panjang, fokus keyboard, data kosong/loading
dan ponsel dengan gulir normal; cakupan data/izin tetap sama.

Revisi teks 2026-11-05: kapital awal kata pada judul halaman/breadcrumb; hapus
bintang label unggah/ubah draf tanpa mengubah required, validasi atau workflow.

Revisi kategori/akses 2026-11-05: kategori opsional pada formulir dan kesiapan
SUBMIT/APPROVE; pilihan pertama Pilih kategori mengosongkan nilai, pilihan
berikutnya kategori aktif sesuai hak Admin; kategori lain/nonaktif tetap tampil
sesudahnya sebagai pilihan nonaktif. Unit versi tetap terikat akun.
Uji tanpa kategori hingga terbit, penolakan kategori unit lain, pelepasan kategori
di ubah draf, konfirmasi/CSRF, radio akses keyboard dan reduced motion. Tempatkan
panel permintaan di sebelah Status hukum pada desktop Admin. Khusus Superadmin,
Status hukum bersebelahan Hapus permanen dan permintaan selebar baris di bawahnya.
Ponsel bertumpuk. Beri jarak antarpilihan dropdown dan fokus biru di dalam segmen.
Pertahankan serta uji ulang urutan antrean dan notifikasi format/penarikan/hapus.

Revisi antrean dan notifikasi TERBARU 2026-11-05: respons daftar permintaan
harus sudah berbungkus sukses/data/meta, agar interceptor tidak membungkusnya
lagi. Daftar kosong adalah array dengan total nyata; kegagalan menampilkan tanda
tidak tersedia dan tombol coba lagi, bukan angka nol palsu. Urutan Antrean
Verifikasi: Dokumen, Antrean Format Persuratan, Permintaan Penarikan & Penghapusan.
Judul memakai kapital tersebut. Tautan notifikasi menarget bagian/permintaan
tepat, termasuk riwayat keputusan atas dokumen yang sudah dihapus.

Inbox mencakup workflow hukum/SOP, format pending/approval/publish/withdraw/delete,
permintaan masuk dan keputusan, penghapusan dokumen/draf oleh Superadmin, serta
pendaftaran akun pending. Superadmin hanya menerima item masuk sesuai akses;
Admin menerima hasil untuk miliknya. Hasil keputusan tetap tersimpan setelah
dokumen dihapus. Aksi melalui permintaan tidak menghasilkan dua notifikasi
untuk keputusan dan aksi yang sama. Perubahan sendiri memakai feedback tindakan.
Peristiwa tambahan dibaca dari proyeksi bisnis audit yang terbatas, bukan API
atau isi audit mentah; hak audit.read dan larangan feed audit dashboard tetap.

Patch-025 menambah preferensi notifikasi event per akun, tanpa menghapus unggahan
atau riwayat. ID workflow tetap desimal, event memakai e-<audit-id>. Hapus satu
memeriksa penerima di server; hapus semua mengambil snapshot server kedua sumber,
termasuk baris di luar 30 item tampilan. Notifikasi setelah konfirmasi dibuka
tetap ada. Perbandingan event SQL memakai UNSIGNED agar pergantian jumlah digit
ID tidak menghapus peristiwa baru. Preferensi dan audit penghapusan atomik;
riwayat workflow/audit tidak dihapus. Panel memperbarui saat fokus, setiap 30 detik,
dan setelah tindakan berhasil. Jalankan patch-024 lalu patch-025 sebelum backend.

Revisi tampilan panel terbaru 2026-11-04: kartu Jenis Dokumen desktop mengikuti
tinggi isi, dibatasi ruang viewport; daftar panjang tetap bergulir di dalam.
Kategori SOP mempertahankan tinggi ruang kerjanya. Menu jenis dokumen dan unit
pada unggah/ubah draf, verifikasi akun dan Tambah Admin memakai pemilih Radix
beranimasi singkat, fokus biru lembut, pilihan nonaktif, keyboard dan reduced
motion. Tombol Pilih peraturan memakai buka/tutup halus tanpa memindah layout
secara mendadak. Ikon tindakan dekoratif tidak menggantikan label teks; izin,
validasi, konfirmasi, loading dan feedback tetap berlaku.

Revisi TERBARU 2026-11-04: Admin pemilik dan Superadmin dapat menghapus versi
DRAF/REVISI yang dibatalkan. Hanya versi tersebut beserta file/relasi/term/workflow
miliknya yang dibersihkan; audit DELETE_DRAFT disimpan. Versi terbit dan pointer
publik tetap utuh. Jika tidak tersisa versi, induk ditandai deleted_at. DIAJUKAN,
DISETUJUI, TERBIT dan DITARIK tidak dapat dihapus lewat endpoint hapus draf.
Admin hanya melihat unggahan sendiri pada pengelolaan Format Persuratan;
antrean persetujuan format tetap dapat dibaca lintas pemilik tanpa hak ubah.
Admin pemilik dapat meminta WITHDRAW/DELETE untuk dokumen hukum/SOP/format.
Permintaan disimpan pada permintaan_penghapusan (patch-024), satu PENDING per
sumber+resource. Hanya Superadmin aktif dengan izin tindakan terkait memutuskan,
dengan catatan wajib. APPROVE langsung menjalankan tindakan dan audit keputusan
dalam satu transaksi; DECLINE mempertahankan dokumen dan menyimpan alasan.
Status permintaan terpisah dari status workflow versi. Snapshot resource/version
serta alasan tetap tersimpan setelah dokumen dihapus. Persetujuan memeriksa ulang
versi yang diminta; permintaan versi lama tidak dapat menarik/menghapus versi baru.
Penarikan tidak memulihkan versi superseded atau membalik status hukum dokumen
lain. Dokumen hukum memakai penghapusan permanen yang sudah tersedia; format
memakai deleted_at tanpa mengarsipkan versi sebagai pengganti penghapusan.
Format yang pernah terbit tetap memerlukan Superadmin untuk dihapus meskipun
sudah ditarik. Antrean Verifikasi memuat inbox Superadmin dan riwayat milik Admin,
dengan polling/fokus, pagination, konfirmasi, CSRF serta feedback. Tindakan langsung
Superadmin menandai permintaan PENDING terkait sebagai OBSOLETE.
Jalankan patch-024 setelah patch-023 sebelum backend terbaru; tidak reset data.

This file tells Codex how to move from the current foundation to the agreed V2 without losing design intent.

## Pratinjau dan baca antrean lintas pemilik - 2026-11-04 (terbaru)

Tambahkan pratinjau PDF lokal terotorisasi di panel, antrean dan portal untuk
format yang terbit. Office memakai unduh; hindari pengiriman berkas ke penampil
eksternal. Uji MIME, inline/nosniff/cache, lifecycle blob/abort, galat dan retry.
Antrean format terbaca lintas Admin, namun file lintas pemilik hanya pada rute
antrean PENDING_REVIEW; seluruh write tetap memeriksa pemilik/role. Tinjauan SOP
Permohonan SK lintas pemilik terbatas DIAJUKAN. Uji akses sesudah keputusan,
penggantian/penghapusan dan penolakan semua perubahan akun lain.
Master desktop memenuhi lebar/tinggi area kerja, tabel/editor bergulir sendiri;
uji daftar panjang, editor terbuka, desktop pendek dan ponsel. Tanpa migrasi.

## Kepemilikan dan Antrean Verifikasi - 2026-11-04 (terbaru)

Format Persuratan Admin dibatasi pemilik di SQL dan service untuk list, queue,
newVersion, delete dan review. Superadmin tetap lintas pemilik. Approval di
bagian format pada halaman Antrean Verifikasi; publish terpisah di pengelolaan.
Admin tidak bisa mengganti APPROVED atau menghapus format disetujui/terbit.
Uji dua Admin, spoof ID/izin, antrean berhalaman, keputusan stale, audit/CSRF,
versi aktif tetap current dan larangan menyentuh SOP Permohonan SK akun lain.
Hilangkan formulir tambah jenis/kategori; POST master kedua tabel ditolak bahkan
Superadmin. Pertahankan daftar dan editor master lama, tanpa perubahan schema.

## Hapus Format Persuratan - 2026-11-04

Ganti Arsipkan dengan Hapus melalui DELETE terproteksi. Gunakan deleted_at induk,
lepas pointer dan aktif=0 atomik bersama audit; pertahankan versi/berkas historis.
Tombol berlaku juga untuk format belum terbit/nonaktif, Admin/Superadmin berizin.
Uji konfirmasi/batal, kegagalan, loading/anti klik ganda, CSRF, izin dan penghapusan
berulang. Integrasi MySQL memeriksa daftar publik/panel, tinjauan/unduhan tertutup,
penolakan perubahan setelah hapus, rollback audit dan publish/hapus bersamaan.
Tidak mengubah schema atau menghapus unggahan lokal untuk mencoba tombol.

## Persetujuan dan penerbitan terpisah - 2026-11-04

Hilangkan jalur otomatis SOP Permohonan SK: approve hanya DISETUJUI; publish
terpisah memakai preview dampak setelah persetujuan. Draf Superadmin tetap
memerlukan approve miliknya sendiri dan publish terpisah.

Format Persuratan: semua unggahan PENDING_REVIEW, hanya Superadmin setujui ke
APPROVED (verified_by/approved_at) lalu publish ke ACTIVE. Tinjauan file panel,
CSRF/izin, konfirmasi, loading dan feedback wajib. File/checksum diperiksa ulang.
Uji versi lama tetap current selama pending/approved, larangan publish sebelum
approve, Admin tidak dapat mengambil keputusan, self-approval Superadmin,
rollback audit/storage dan publish bersamaan. Gunakan patch-022 lalu patch-023;
pertahankan seluruh unggahan/publikasi, jangan impor ulang schema/seed.

## Beranda berdasarkan sesi - 2026-10-30

Teruskan cookie SSR ke snapshot home. Terapkan akses Publik/Internal sebelum
ROW_NUMBER dan COUNT supaya panel terbaru dan jumlah konsisten. Aktif lintas
unit boleh membaca Internal; pending, nonaktif, revoked/expired dan anonim hanya
Publik. Pisahkan request serentak menurut cakupan, jangan cache lintas pengguna.
Uji HTTP dengan cookie sesi dan MySQL rollback: tiga peran aktif, penolakan
sesi tidak sah, hitungan/tahun, pemisahan SOP khusus, draf/ditarik/superseded/
dihapus dan request campuran serentak. Uji SSR memakai helper penerusan sesi.
Tidak memerlukan perubahan schema atau data unggahan.

## Tambah Admin oleh Superadmin - 2026-10-30

Aktifkan formulir yang sudah ada dari kelompok Admin di Pengguna. Uji peran dan
izin tombol, unit wajib, konfirmasi sebelum POST, kembali tanpa kehilangan isian,
anti klik ganda, kegagalan/sukses dan pembaruan daftar. Integrasi MySQL membuktikan
akun ADMIN aktif dapat masuk dengan password awal, tidak dapat masuk sebagai
Superadmin, tidak menerima spoof peran dan rollback bila audit gagal.

## Revisi terakhir: Admin mengajukan SOP Permohonan SK

Admin dapat membuat/mengunggah/mengajukan SOP Permohonan SK miliknya; kategori
sesuai unit dan pemeriksaan kepemilikan tetap wajib. Menu, pintasan, pemilih
koleksi, detail/berkas serta notifikasi harus tersedia. Hanya Superadmin yang
mengembalikan/menyetujui/menerbitkan. Uji upload nyata, daftar sendiri, penolakan
manipulasi unit/pemilik, revisi/pengajuan ulang, notifikasi kedua peran dan
publikasi atomik Publik/Internal. Ini menggantikan pembatasan koleksi khusus
Superadmin pada instruksi lama di bawah. Tidak mengubah schema/seed.

## Revisi 2026-10-30: pemulihan akun dan penghapusan unggahan

Pemulihan Dosen/Staf memakai shared Zod, token 30 menit sekali pakai, SMTP TLS,
antrean persisten terenkripsi, pembatasan laju dan audit transaksi. Uji akun
aktif/pending, pengelola/Google-only/nonaktif, token palsu/kedaluwarsa/terpakai,
request/reset bersamaan, sesi dicabut, rollback audit dan retry SMTP lokal.
Pengiriman Gmail nyata perlu konfigurasi privat dan verifikasi operator;
jangan menampilkan sukses palsu ketika layanan tidak dikonfigurasi.

Hapus dokumen Superadmin: tombol langsung terlihat, tanpa input nama/judul,
konfirmasi sederhana, CSRF, izin, loading, feedback dan anti klik ganda. Uji
pembatalan, kegagalan, serta penolakan Admin meskipun memiliki izin langsung.
Pembersihan data lokal adalah operasi satu kali atas instruksi eksplisit user,
bukan bagian schema/seed/migrasi. Jenis dokumen dan halaman portal tetap ada.
SOP biasa kembali mengikuti max-w-7xl/1280px seperti Produk Hukum.

## Revisi tampilan autentikasi 2026-10-29

Posisi logo login 2026-10-30: desktop rata kiri, sejajar teks panel kiri pada
layout dua sisi; ponsel/tablet tetap tengah. Periksa juga desktop pendek serta
keyboard ponsel. Pemulihan password kini diimplementasikan sesuai revisi di atas.

Pemisahan login terakhir 2026-10-30: Dosen/Staf langsung ke formulir pada `/masuk`,
tanpa pemilih pengelola. Admin/Superadmin saling menaut lewat dua tab pada URL
masing-masing. Uji tautan, jalur request sesuai peran, pendaftaran, viewport
ponsel/desktop dan keyboard; pertahankan pembatasan autentikasi server.

Revisi Profil/kunjungan 2026-10-30: isi faktual bersumber dari profil resmi ITH;
periksa tampilan responsif dan lebar koleksi mandiri maksimal 1680px. Verifikasi
kunjungan aktual terhadap MySQL, bot/ulang kuki, request bersamaan, pergantian
hari WITA, lock tab, API gagal dan storage diblokir. Hindari angka pengganti
buatan; pertahankan definisi peramban per hari dan feedback kegagalan.

Regresi penyaring 2026-10-30: buka SOP unit kosong dari menu desktop/ponsel;
jenis lain tetap memiliki hitungan dan menampilkan hasil ketika dipilih.
Pergantian jenis melepas kategori, mempertahankan kata kunci/tahun/status.
Memilih ulang jenis aktif mempertahankan kategori dan hitungan aktual.

Klarifikasi koleksi 2026-10-30: SOP biasa terpisah dari SOP Permohonan SK pada
query portal, termasuk count/faset/tahun/beranda. Uji dengan jenis dasar dan kata
kunci sama serta akses anonim, pending, staf aktif dan Superadmin. Sitemap tetap
memuat kedua koleksi publik melalui endpoint masing-masing.

Revisi lanjutan koleksi 2026-10-30: empat kolom desktop/maksimal tiga baris
terlihat, pemuatan bertahap 12 berkas dan area gulir terbatas termasuk ponsel.
Uji halaman lanjutan, retry, deduplikasi, pencegahan request ganda dan pergantian
sesi. Kartu SOP seluruhnya dapat diklik, dengan konteks tautan kembali dan satu
URL detail kanonis. Uji regresi filter kosong saat memilih jenis yang sama dari
menu serta Back/Forward browser. Ringkas bantuan SK dan uji tombol kembali ke
atas pada gulir halaman/daftar dengan reduced motion.

Revisi koleksi setelah autentikasi: bedakan galeri map Format Persuratan dari
SOP Permohonan SK dan hapus search bar pada kedua halaman
publik/panel. Semua Dokumen memakai dropdown koleksi dan bingkai desktop tetap;
daftar panjang bergulir di dalam, filter/pagination tetap terlihat. Uji filter
sebelum pagination, pemisahan data template, penolakan SOP khusus untuk Admin,
ukuran desktop pendek dan gulir halaman seluler. Tidak mengubah workflow.
Revisi lanjutan SOP publik: kartu tiga kolom desktop, dua kolom tablet dan satu
kolom ponsel. Gunakan ikon dokumen bertanda tangan, tanpa angka urut dekoratif;
nomor resmi, tahun, status hukum dan pembatasan akses tetap tersedia.

Polesan lanjutan login/daftar: bingkai desktop maksimal 1680 × 900 px dan formulir
maksimal 520 px; masthead ponsel menyambung dengan kartu formulir. Dropdown
Semua Dokumen memakai menu Radix, animasi buka/tutup dan fokus biru lembut,
dengan keyboard/Escape serta reduced motion. Pertahankan filter dan batas peran.
Tab
dengan garis aktif, indikator langkah bernomor, panduan kiri tersinkron dengan
formulir dan ringkasan nama/email/unit sebelum konfirmasi. Pertahankan data saat
kembali, fokus heading langkah, validasi dan adaptasi keyboard. Uji seluruh
langkah pendaftaran, termasuk unit manual dan galat pada layar pendek.
Revisi lanjutan: hilangkan tombol kembali pada login, rapikan bingkai logo dan
wordmark; pendaftaran tetap mempunyai tombol kembali. Ganti unit pendaftaran
dengan menu beranimasi. Uji unit master/usulan, penghapusan usulan saat kembali
ke master, validasi/fokus, daftar unit panjang, keyboard, reduced motion serta
regresi keyboard ponsel.
Perbaikan regresi keyboard: uji saat innerHeight dan visualViewport sama-sama
mengecil, saat hanya visualViewport berubah, perpindahan fokus, validasi,
rotasi/zoom, serta pemulihan setelah keyboard ditutup. Header identitas
tetap terlihat dan terpisah dari area gulir formulir; isian aktif tidak tertutup.
Tampilan latar, kartu, logo, tab dan jarak formulir harus sama sebelum/sesudah
keyboard terbuka. Simpan tampilan sebelum media query berubah; jangan membuat
varian keyboard yang berbeda. Uji kesamaan geometri/warna serta akses isian.

Revisi lanjutan: kedua sisi login berada dalam satu bingkai. Unit Superadmin
pada daftar Pengguna diberi label Superadmin; nilai unit dan izin tidak berubah.
Format Persuratan dan SOP Permohonan SK memakai grid tiga kolom, pencarian dan
pagination. Akses SOP dapat Publik/Dosen-Staf aktif. Persetujuan sekaligus terbit
hanya untuk SOP khusus ini, atomik dengan konfirmasi dampak, izin dan audit.
Uji kegagalan storage agar persetujuan/pointer tidak berubah, revisi mempertahankan
versi lama, penyaringan staf aktif/pending, serta pagination koleksi panjang.

Instruksi terakhir user menggantikan layout polos terpusat dan usulan foto:
desktop memakai simbol dokumen/pasal dan tipografi kontras di kiri, formulir di
kanan untuk login ketiga peran serta pendaftaran. Tidak menggunakan foto kampus.
Pertahankan identitas ITH, animasi singkat dengan reduced motion, formulir
responsif tanpa gulir halaman, dan adaptasi keyboard. Periksa lebar desktop,
ponsel, landscape pendek serta keadaan galat. URL, endpoint login, pendaftaran,
verifikasi akun dan otorisasi server tetap mengikuti aturan yang sudah berlaku.

## Revisi autentikasi dan filter 2026-10-26

Instruksi tampilan terbaru 2026-10-26: pisahkan semua login/daftar dari layout
portal publik tanpa mengubah URL. Layout autentikasi memakai latar polos terang
dan kartu formulir terpusat, tanpa foto kampus sesuai revisi terbaru user.
Halaman autentikasi tanpa gulir: tiga langkah daftar dengan data tersimpan saat
kembali, validasi shared Zod, dan konfirmasi akhir. Uji tinggi viewport pendek,
landscape, keyboard, galat, serta batas isian/tombol agar tetap di dalam layar.
Kolom Unit kembali tampil pada daftar Dosen/Staf. Urutkan Superadmin lalu Admin
pelihat sebelum pagination; verifikasi akun ditonjolkan di Pengguna Superadmin.
Uji urutan pada tabel/kartu, unit master/usulan, keputusan khusus Superadmin,
dan akses baca pencarian/filter Format Persuratan. Hilangkan dekorasi garis
hero Produk Hukum di ponsel; periksa layout login dan panel pada ukuran seluler/desktop.

Pendaftaran email/password seluruh domain di `/daftar`, login Dosen/Staf di
`/masuk`, dan Google hanya ith.ac.id menggantikan Google-only. Status awal selalu
MENUNGGU_VERIFIKASI, peran DOSEN_STAF; akses internal setelah keputusan Superadmin.
Uji spoof peran/status, email duplikat/serentak, password hash, Origin, cookie,
pending/approve/nonaktif, pembatasan domain Google dan isolasi jalur Admin/Superadmin.
Gunakan kolom password yang sudah tersedia, tanpa migrasi destruktif. Jangan
auto-link Google dengan akun lokal berdasarkan email. Susunan filter: Tahun,
Kategori, Jenis Produk Hukum, Status.

## Revisi aktif 2026-10-23

Revisi input/workflow 2026-10-25: semua unit/kategori formulir terlihat, pilihan
di luar hak Admin nonaktif, dan penyimpanan tetap memeriksa unit akun. Target
MENGUBAH/MENCABUT Admin harus dokumen dan versi TERBIT miliknya; periksa pencarian,
POST relasi dan pengajuan ulang. DRAF/REVISI milik Superadmin dapat DISETUJUI
langsung tanpa antrean, dengan kelengkapan/file valid/izin/konfirmasi/audit.
Terapkan patch-020 untuk CHECK transisi APPROVE, tanpa menghapus riwayat.
Uji manipulasi API serta alur nyata MySQL dengan fixture transaksi rollback.

Penyempurnaan UI panel 2026-10-25: gunakan lebar horizontal secara responsif,
pratinjau dokumen lebih awal, ringkasan berdampingan, riwayat/tabel dengan gulir
terbatas, serta motion ringan yang menghormati reduced motion. Periksa kedua
peran pada lebar 360/768/1024/1440/1920px, fokus keyboard, dialog, menu seluler,
konfirmasi dan kontrol nonaktif; tidak mengubah hak akses atau aturan workflow.

Perbaikan navigasi 2026-10-25: gunakan detail bersarang `dokumen/verifikasi/:id`
dan `dokumen/pengajuan/:id` agar menu aktif, breadcrumb, tombol kembali dan
riwayat versi tetap dalam daftar asal. Tautan notifikasi membuka halaman langsung
dengan `versionId` yang tepat: SUBMIT ke antrean, RETURN ke pengajuan, APPROVE ke
dokumen terverifikasi. Uji klik melalui browser, pergantian versi setelah galat,
dan pemisahan cakupan API; tidak ada perubahan schema atau kewenangan verifikasi.

Ketentuan terkait SOP/unggahan pada fase lama di bawah digantikan revisi ini.
Klarifikasi terbaru: SOP Permohonan SK hanya untuk Superadmin; menu, pencarian,
daftar, notifikasi, halaman dan API pengelolaannya tidak tersedia bagi Admin.
SOP biasa tetap dapat diajukan Admin sesuai unit. Antrean dapat dibaca lintas
pembuat kecuali SOP khusus tersebut; tindakan verifikasi tetap hanya Superadmin.
Semua Dokumen hanya versi terverifikasi; draf dan
pengajuan mempunyai daftar terpisah. SUBMIT/APPROVE memerlukan seluruh metadata,
kategori dan tepat satu file utama valid. APPROVE opsional alasan; RETURN wajib alasan, tampil
pada detail dan notifikasi panel berbasis riwayat workflow yang disimpan atomik.
Pratinjau file belum terbit memakai endpoint panel terotorisasi. Terapkan
`database/v2/patch-018-label-kategori-sop.sql` untuk nama kategori/unit terbaru,
tanpa mengubah ID/kode atau menghapus data. Isi notifikasi berasal dari workflow.
Revisi hapus notifikasi: terapkan `patch-019-notifikasi-dihapus.sql` untuk
preferensi hapus per akun, tanpa menghapus workflow/audit. Endpoint DELETE wajib
memeriksa cakupan penerima, CSRF dan menyimpan audit atomik. Hapus semua memakai
batas ID saat konfirmasi dibuka; notifikasi baru tidak ikut terhapus.
Revisi popup: satukan konfirmasi melalui Dialog Radix dengan permukaan putih,
latar terang transparan dan animasi singkat; cegah penutupan/klik ganda saat proses.
Notifikasi Superadmin hanya SUBMIT terakhir setiap versi yang masih DIAJUKAN;
keputusan/perlu perbaikan ditujukan ke Admin. RETURN -> perbaikan -> SUBMIT
menghasilkan notifikasi pengajuan baru, tanpa menghidupkan notifikasi lama.

## Rule 1 — Do not start with a giant rewrite

The repository already has useful infrastructure.

Reuse:
- NestJS bootstrap.
- config/env validation.
- logging.
- error filter.
- response interceptor.
- health foundation.
- database module.
- Next.js workspace.
- shared package.
- API client patterns.

Replace/refactor only what conflicts with V2.

## Rule 2 — Treat old domain design as legacy

Before implementation, identify conflicts in:
- `database/jdih_ith_schema.sql`
- `database/jdih_ith_seed.sql`
- `packages/shared/src/enums.ts`
- `packages/shared/src/roles.ts`
- `packages/shared/src/schemas/auth.schema.ts`
- `packages/shared/src/schemas/dokumen.schema.ts`
- old docs.

Expected conflicts include:
- `terbatas`.
- local password registration.
- legacy workflow/data fields.
- old 50-table modules.
- old public-statistics/content/legal-service scope.

## Phase 0 — Audit & Alignment

Deliverables:
- conflict report.
- source files to keep unchanged.
- source files to update.
- proposed V2 DB file paths.

Acceptance:
- no domain code implemented yet if user only requested audit.
- no destructive DB operation.
- no loss of legacy files.

## Phase 1 — Physical Database V2

Recommended transition:
- add `database/v2/` or explicit V2 SQL files first.
- do not destroy old SQL until V2 approved.

Create:
- schema.
- seed.
- Docker Compose MySQL 8 host port 3307.
- test/sample dataset.

Physical design must include:
- PK/FK.
- UNIQUE.
- CHECK where appropriate.
- indexes for search.
- soft delete.
- transaction-safe current version pointer.
- grant uniqueness: expired grants deny access immediately; regrant closes expired
  row and inserts a new row with audit under document/user locks in one transaction.
- versioned free-text PIC VARCHAR(255), tanggal_penetapan DATE; nullable for drafts,
  mandatory with nonblank nomor/judul on TERBIT/DITARIK via CHECK + future service.
- omit abstrak/tanggal_berlaku; retain tahun for search/filter, not detail rows.
- current withdrawal clears pointer to NULL; never automatically restores superseded versions.
- MySQL import/runtime validation must pass before physical schema is final; report
  pending if engine unavailable. No risky system changes to unblock Docker.
- no Drizzle binding/introspection or real Admin seed in current Phase 1 scope.
- session indexes.
- audit indexes.

Required invariant examples:
- unique Google sub/email.
- one logical version number per document.
- no duplicate active secret grant for same user/document.
- valid access enums.
- valid workflow enums.
- valid legal status enums.
- file belongs to its version.
- current published pointer can only target same document.
  - enforce in service/transaction if DB cannot express cross-row invariant cleanly.

## Phase 2 — Shared Contracts

Update:
- access enum 3 levels.
- workflow states.
- legal statuses.
- relation types.
- account statuses.
- schemas for public search.
- authorized product detail: Tipe, Judul, Nomor, Tanggal Penetapan, Status hukum, PIC;
  main file + attachments with Preview/Download; no extended BPK metadata.
- schemas for admin document version create/update.
- schemas for account registration/approval.
- schemas for secret grants.
- schemas for template upload metadata.

Remove/deprecate:
- `terbatas`.
- local-password registration/reset if unused in V1.

Acceptance:
- both API and web compile against shared package.
- no duplicate validation definition.

## Phase 3 — Google Auth & Session

Implement:
- Google OAuth/OIDC.
- staff domain validation.
- student rejection.
- existing admin role lookup.
- pending user registration.
- secure session/refresh.
- logout/revoke.
- `/auth/me`.

Acceptance:
- pending account cannot access Internal.
- active account can.
- Admin role cannot be self-created.

## Phase 4 — Account Approval

Superadmin:
- list pending.
- detail.
- resolve manual unit.
- approve.
- reject with reason.
- deactivate/reactivate if later required.

Popup:
- approve/reject confirmation.

Audit all decisions.

## Phase 5 — Authorization

Implement:
- default-closed route policy.
- functional permissions.
- separate document access policy.
- explicit Secret grants.

Acceptance:
- anonymous Internal detail denied.
- active staff Internal allowed regardless of unit.
- Secret invisible without grant.

## Phase 6 — Master Data

Implement:
- units.
- document types.
- categories.
- tags.

Seed product types:
- Peraturan Rektor.
- SK Rektor.
- Instruksi Rektor.
- Surat Edaran Rektor.
- SOP.

Seed initial SOP categories as configurable master data.
Keep categories and work units aligned. Apply patch-016 for the LPPM-PM rename
(retain code SOP-LPPM and existing IDs) and the Lab and Senat additions.
Apply patch-017 afterward to remove the unused Komisi Kemahasiswaan category/unit,
with audit and FK protection. Komisi Etik remains a separate entry.

## Phase 7 — Documents & Versioning

Implement:
- stable document.
- version creation.
- metadata.
- file uploads.
- attachments.
- current published pointer.

Critical acceptance:
- Version 1 stays public while Version 2 is draft.
- Version 2 only replaces pointer after publish commit.

## Phase 8 — Workflow

Implement:
- submit.
- return revision.
- approve.
- publish.
- withdraw.

Tests:
- self-approval blocked.
- invalid transition blocked.
- revision note required.
- publish only approved, with mandatory PIC/tanggal_penetapan/nomor/judul and main file.
- withdrawal sets current pointer NULL, preserves history, no superseded fallback.

## Phase 9 — Legal Relations

Implement:
- relation CRUD.
- impact preview endpoint.
- confirmed status transition on publish.
- legal status history.

Never apply relation side effect while still draft.

## Phase 10 — Search

Implement metadata search and filters.

Anonymous redaction:
- Public = summary.
- Internal = title + badge.
- Secret = absent.

Authenticated:
- Internal detail/result.
- granted Secret.

## Phase 11 — Secret Grants

Admin UI/API:
- search active users.
- grant.
- revoke.
- optional expiry.
- audit.

No request-access UI in V1.

## Phase 12 — Letter Templates

Implement:
- stable template.
- versions.
- local storage.
- public/internal access.
- old version archive.
- public UI: Judul + Download only; no template detail/preview/legal metadata.
- INTERNAL templates visible/downloadable only to active Dosen/Staf.

## Phase 13 — Dashboard & Audit

Admin may view the dashboard. Superadmin manages and reads the audit log.
Audit menus, command search and direct page/API access are Superadmin-only,
including when an Admin has a direct audit.read permission. Dashboard activity
audit is removed for all roles; dashboards must not request the audit feed.
Use a wide, short dashboard card and a compact scrollable desktop audit table.

No public statistics page.

## Phase 14 — Frontend

Public:
- Beranda.
- Profil.
- Produk Hukum.
- Format Persuratan.
- Masuk.

Admin:
- dashboard.
- documents.

Superadmin:
- verification.
- users.
- secret grants.
- templates.
- masters.
- audit.
- SOP Permohonan SK management.

Keep global menus and information pages clickable for Admin; disable only write
controls. Read access never grants global write permissions. Use `/admin` for Admin
and `/superadmin` for Superadmin, including login redirects, links and breadcrumbs.
The REST API retains `/api/v1/admin`. Enforce document ownership, unit-matched input
categories and Superadmin-only verification/global writes in backend services.
Global master lists and unit-scoped input options use separate read endpoints.
Exception: SOP Permohonan SK appears only in the Superadmin panel. Hide it from
Admin menus, dashboard shortcuts and command search; block direct Admin page/API
access and exclude SOP from Admin document lists and verification queues. Keep
published SOP available in the public portal.
Format Persuratan is editable by every active Admin and Superadmin with
`templates.manage`, including templates uploaded by another account. Admin-created
templates and versions must wait for verification by an active Superadmin; pending
versions must not replace the current active version. Keep confirmation and audit,
and apply patch-022-verifikasi-format-persuratan.sql to existing V2 databases.
Only one version per template may wait for verification. No ownership or unit
restriction applies to templates; law-document rules remain unchanged.
An Admin replacement upload archives the previous pending candidate without
deleting its history.

Verification acceptance: Admin is denied even with a direct `templates.manage`
override; Superadmin approval atomically activates the pending version, archives
the previous active version, updates the current pointer, and records audit.
Failed verification rolls back all database changes and leaves the previous
version downloadable.

## Definition of Done per Task

For each task:
- types compile.
- relevant lint passes.
- relevant tests pass.
- no access regression.
- no secret resource leak.
- update shared contract if API changed.
- update docs/context if business behavior changed.
- confirmation popup for write/high-impact frontend action.
