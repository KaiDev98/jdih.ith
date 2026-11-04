# Pratinjau format, baca antrean, dan ruang kerja master

Revisi terbaru 2026-11-04 memperluas akses baca antrean Format Persuratan kepada
semua Admin, tanpa memperluas hak perubahan. Pengelolaan format tetap dibatasi
pemilik; hanya Superadmin yang dapat menyetujui dan menerbitkan.

## Pratinjau

PDF dapat dibuka dalam dialog lokal pada pengelolaan format, Antrean Verifikasi,
serta koleksi format terbit di portal. Metadata API menentukan kemampuan
pratinjau; server tetap memeriksa MIME dan hak akses saat permintaan berkas.
DOCX/XLSX/PPTX memakai unduhan, tanpa mengirim file ke penampil pihak ketiga.
Teks Unduh untuk ditinjau hanya tampil saat format/peramban belum mendukung
pratinjau. Dialog mempunyai status memuat, galat, coba lagi, unduhan dan tutup;
permintaan dibatalkan dan URL blob dilepas ketika ditutup/berpindah berkas.

Rute panel biasa mempertahankan pemeriksaan pemilik:

- GET `/api/v1/admin/letter-templates/:id/versions/:versionId/preview`
- GET `/api/v1/admin/letter-templates/:id/versions/:versionId/download`

Tinjauan lintas pemilik hanya melalui rute antrean:

- GET `/api/v1/admin/letter-templates/verification-queue/:id/versions/:versionId/preview`
- GET `/api/v1/admin/letter-templates/verification-queue/:id/versions/:versionId/download`

Rute antrean memerlukan pembaca panel aktif dan status PENDING_REVIEW. Setelah
persetujuan, penggantian atau penghapusan, akses rute ini ditolak. Tinjauan SOP
Permohonan SK lintas pemilik di panel dibatasi versi/file DIAJUKAN; draf,
riwayat/versi diproses, dan semua tindakan perubahan tetap tertutup.

GET `/api/v1/letter-templates/:slug/preview` hanya membuka versi ACTIVE yang
ditunjuk current pointer, dengan aturan Publik/Internal yang sama seperti
unduhan. API pratinjau mengirim application/pdf, Content-Disposition inline,
private/no-store dan nosniff. Jenis tanpa penampil ditolak jika dipaksa lewat API.
Daftar publik hanya menambahkan kemampuan preview; tidak mengekspos storage key,
checksum atau tingkat akses Internal kepada pengunjung anonim.

## Layout

Jenis Dokumen dan Kategori SOP memakai lebar penuh area kerja. Mulai 1024px,
judul dan header daftar tetap terlihat; tabel serta editor bergulir sendiri
dalam viewport. Ponsel mempertahankan gulir halaman. Tidak ada formulir tambah
master. Tindakan format dikelompokkan untuk tinjauan/perubahan, tautan antrean,
serta penghapusan; hak keputusan tidak berubah.

## Verifikasi

- Shared: 80 tes lulus; backend: 415; frontend: 279.
- Integrasi MySQL mencakup PDF nyata, Office, akses sebelum/sesudah approval,
  penghapusan, pemilik lain, SOP diajukan, dan versi publik yang aktif.
- Tes HTTP membuktikan status 401/403 sebelum akses, PDF inline, cache privat,
  nosniff dan byte respons. Tes UI mencakup MIME salah, retry, pembatalan,
  pembersihan blob, fallback Office dan koleksi portal lama tanpa kemampuan baru.
- Typecheck, lint dan build produksi lulus.
- Pemeriksaan browser memakai sesi nyata dan fixture GET khusus browser, tanpa
  membuat/menghapus dokumen aplikasi. PDF tampil pada 390/1440px; Admin melihat
  tinjauan lintas pemilik tanpa tombol keputusan. Dengan 150 baris fixture,
  master 1440x800 dan 1024x600 tetap setinggi viewport, tabel bergulir di dalam,
  editor tetap dapat digunakan, dan tidak ada overflow horizontal halaman.
- API lokal nyata pada Admin dan Superadmin menerima preview PDF antrean 200
  inline; daftar pengelolaan Admin tetap disaring pemilik.

Tidak ada migrasi schema baru atau purge data. Deploy backend dan frontend dari
commit yang sama. Patch workflow sebelumnya 022/023 tetap diperlukan bagi DB
yang belum menerima revisi persetujuan/penerbitan terpisah.
