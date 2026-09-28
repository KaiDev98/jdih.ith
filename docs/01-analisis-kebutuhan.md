# A. ANALISIS KEBUTUHAN SISTEM

Portal JDIH Institut Teknologi Bacharuddin Jusuf Habibie (ITH) Parepare

---

## A.1 Latar Belakang

### A.1.1 Kondisi yang Dihadapi (_As-Is_)

Sebagai perguruan tinggi negeri yang relatif baru, ITH Parepare berada pada fase pembentukan dan
penataan produk hukum internal secara masif: Peraturan Rektor, Keputusan Rektor, Peraturan Senat,
Surat Edaran, pedoman akademik, Standard Operating Procedure (SOP), sampai dokumen kerja sama.
Praktik pengelolaan yang umum ditemui pada fase ini menimbulkan beberapa permasalahan:

| Kode | Permasalahan                                                                                                  | Dampak                                                                                                   |
| ---- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| P-01 | Dokumen produk hukum tersimpan terpisah pada masing-masing unit kerja (berkas fisik, _folder_ berbagi, surel) | Tidak ada sumber tunggal kebenaran (_single source of truth_); dokumen sama beredar dalam beberapa versi |
| P-02 | Tidak ada katalog metadata terstandar (nomor, tanggal penetapan, penandatangan, status)                       | Penelusuran bergantung pada ingatan personel; waktu temu kembali dokumen lama                            |
| P-03 | Status keberlakuan peraturan tidak terdokumentasi                                                             | Unit kerja berpotensi memakai peraturan yang sudah dicabut/diubah sebagai dasar keputusan                |
| P-04 | Relasi antarperaturan (mengubah, mencabut, dasar hukum) tidak terekam                                         | Penyusunan peraturan baru tidak memiliki peta rujukan; risiko konflik norma internal                     |
| P-05 | Akses mahasiswa dan publik terhadap peraturan yang bersifat terbuka masih bergantung pada permintaan manual   | Beban administrasi unit kerja; menurunkan kualitas pemenuhan keterbukaan informasi                       |
| P-06 | Belum ada kanal resmi penyebaran informasi hukum kampus                                                       | Sosialisasi peraturan baru tidak merata                                                                  |
| P-07 | Belum ada mekanisme pelaporan statistik produk hukum                                                          | Pimpinan tidak memiliki data untuk evaluasi tata kelola regulasi internal                                |
| P-08 | Belum terhubung dengan Jaringan Dokumentasi dan Informasi Hukum Nasional (JDIHN)                              | Kewajiban sebagai anggota jaringan belum terpenuhi secara sistemik                                       |

### A.1.2 Landasan Kebijakan

Sistem dirancang untuk mendukung pemenuhan ketentuan berikut (nomor dan judul peraturan **wajib
diverifikasi** terhadap versi terkini sebelum dicantumkan pada dokumen resmi — lihat § A.9):

1. **Undang-Undang Nomor 14 Tahun 2008** tentang Keterbukaan Informasi Publik — kewajiban badan
   publik menyediakan dan mengumumkan informasi publik, termasuk peraturan dan kebijakan internal.
2. **Undang-Undang Nomor 12 Tahun 2011** tentang Pembentukan Peraturan Perundang-undangan
   (beserta perubahannya) — asas keterbukaan dan kewajiban penyebarluasan.
3. **Peraturan Presiden Nomor 33 Tahun 2012** tentang Jaringan Dokumentasi dan Informasi Hukum
   Nasional — perguruan tinggi merupakan salah satu anggota JDIHN dan wajib mengelola dokumentasi
   hukum sesuai standar jaringan.
4. **Peraturan Menteri Hukum dan Hak Asasi Manusia** tentang standar pengelolaan dokumen dan
   informasi hukum pada anggota JDIHN — acuan elemen metadata dan integrasi data.
5. **Undang-Undang Nomor 12 Tahun 2012** tentang Pendidikan Tinggi dan **Undang-Undang Nomor 20
   Tahun 2003** tentang Sistem Pendidikan Nasional — kerangka otonomi pengaturan internal PTN.
6. **Statuta ITH** dan **Organisasi dan Tata Kerja (OTK) ITH** — dasar kewenangan penetapan produk
   hukum internal dan struktur unit kerja.
7. **Peraturan Rektor tentang Tata Naskah Dinas ITH** — dasar penetapan jenis, format, dan
   penomoran naskah.

### A.1.3 Kondisi yang Dituju (_To-Be_)

Portal JDIH ITH menjadi **satu pintu resmi** dokumentasi hukum kampus dengan karakteristik:
repositori metadata terstandar JDIHN, berkas PDF terkelola dengan kontrol akses berjenjang,
penelusuran multi-kriteria, pemetaan relasi dan status keberlakuan peraturan, alur kerja publikasi
berjenjang, serta kesiapan sinkronisasi ke JDIHN.

---

## A.2 Tujuan dan Sasaran Sistem

### A.2.1 Tujuan

| Kode | Tujuan                                                                                |
| ---- | ------------------------------------------------------------------------------------- |
| T-01 | Menyediakan basis data terpusat seluruh produk hukum ITH beserta metadata terstandar  |
| T-02 | Menyediakan portal penelusuran dan pengunduhan dokumen hukum bagi internal dan publik |
| T-03 | Menjamin ketertelusuran status keberlakuan dan relasi antarperaturan                  |
| T-04 | Menegakkan kontrol akses berbasis peran dan tingkat kerahasiaan dokumen               |
| T-05 | Menyediakan kanal informasi hukum (berita, artikel hukum, pengumuman)                 |
| T-06 | Menyediakan data statistik dan pelaporan tata kelola regulasi bagi pimpinan           |
| T-07 | Menyiapkan interoperabilitas dengan JDIHN dan sistem informasi internal ITH           |

### A.2.2 Sasaran Terukur

| Kode | Sasaran                   | Indikator                                                                    |
| ---- | ------------------------- | ---------------------------------------------------------------------------- |
| S-01 | Digitalisasi produk hukum | ≥ 95% produk hukum ITH sejak pendirian terkatalog dalam 12 bulan pertama     |
| S-02 | Kecepatan temu kembali    | Waktu temu kembali dokumen ≤ 30 detik oleh pengguna awam                     |
| S-03 | Akurasi status            | 100% peraturan memiliki status keberlakuan yang ditinjau minimal 1×/semester |
| S-04 | Pemanfaatan               | ≥ 500 sesi penelusuran/bulan pada tahun pertama operasional                  |
| S-05 | Kepatuhan metadata        | 100% dokumen terbit memenuhi elemen metadata wajib JDIHN                     |
| S-06 | Ketersediaan layanan      | _Uptime_ ≥ 99,5% per bulan pada jam kerja                                    |

---

## A.3 Ruang Lingkup

### A.3.1 Termasuk dalam Lingkup (_In-Scope_)

1. Portal publik: beranda, penelusuran, detail dokumen, pratinjau dan unduh, berita/artikel hukum,
   halaman profil, statistik publik, formulir kontak.
2. Panel administrasi: manajemen dokumen hukum dan berkas, alur kerja publikasi, manajemen konten,
   master data, manajemen pengguna dan hak akses, konfigurasi sistem, log audit.
3. Mesin pencari internal dengan penyaring aspek (_faceted search_) berdasarkan judul, nomor, jenis
   peraturan, tahun, unit kerja, kategori, status, dan kata kunci.
4. Pengelolaan berkas PDF beserta lampiran, termasuk validasi, penyimpanan, dan kontrol unduh.
5. Pemetaan relasi antarperaturan dan riwayat perubahan status keberlakuan.
6. Autentikasi dan otorisasi empat peran: Superadmin, Admin, Dosen/Staf, dan Pengunjung Publik.
7. Statistik dan pelaporan (jumlah dokumen, unduhan, kunjungan, kata kunci populer).
8. Titik integrasi: API publik baca-saja, sinkronisasi metadata ke JDIHN, RSS, `sitemap.xml`.
9. Modul Layanan Hukum (permohonan telaah/legal opinion) — **opsional, Fase 3**.

### A.3.2 Di Luar Lingkup (_Out-of-Scope_)

| Kode | Di luar lingkup                                                           | Keterangan                                                 |
| ---- | ------------------------------------------------------------------------- | ---------------------------------------------------------- |
| O-01 | Penyusunan naskah peraturan secara kolaboratif (_legal drafting editor_)  | Cukup unggah berkas final; pertimbangan Fase 4             |
| O-02 | Tanda tangan elektronik tersertifikasi (BSrE)                             | Kewenangan sistem tata naskah dinas/e-office               |
| O-03 | Persuratan dan penomoran naskah dinas otomatis                            | Domain sistem e-office; JDIH hanya mengonsumsi nomor final |
| O-04 | Manajemen arsip statis/inaktif sesuai kaidah kearsipan (SIKD/SRIKANDI)    | JDIH adalah dokumentasi hukum, bukan sistem kearsipan      |
| O-05 | Sistem informasi akademik, kepegawaian, keuangan                          | Hanya dirujuk melalui SSO/tautan                           |
| O-06 | Layanan konsultasi hukum daring sinkron (_live chat_, _video conference_) | Fase lanjutan bila diperlukan                              |
| O-07 | Terjemahan otomatis seluruh dokumen                                       | Dukungan bilingual terbatas pada antarmuka dan metadata    |

---

## A.4 Identifikasi Pemangku Kepentingan

| Kode  | Pemangku Kepentingan                                                         | Peran terhadap Sistem                                                      | Kebutuhan Utama                                                                            |
| ----- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| SH-01 | Rektor dan Wakil Rektor                                                      | Penanggung jawab kebijakan; penetap produk hukum                           | Dasbor rekapitulasi, laporan tata kelola regulasi, jaminan hanya peraturan sah yang tampil |
| SH-02 | Unit Pengelola Hukum (Bagian/Subbagian Hukum, Tata Laksana, dan Kepegawaian) | **Pemilik proses bisnis (_process owner_)**; kurator metadata; verifikator | Formulir metadata lengkap, alur verifikasi, kendali status keberlakuan, pemetaan relasi    |
| SH-03 | Biro Umum dan Keuangan / Biro Akademik dan Kemahasiswaan                     | Admin unit; penyedia dokumen                                               | Kemudahan unggah dan pemutakhiran dokumen unitnya                                          |
| SH-04 | Senat Institut                                                               | Penetap peraturan akademik; pengguna referensi                             | Katalog Peraturan/Keputusan Senat, riwayat perubahan                                       |
| SH-05 | Satuan Pengawasan Internal (SPI)                                             | Pengguna referensi untuk audit                                             | Penelusuran cepat berdasarkan dasar hukum, ekspor daftar peraturan                         |
| SH-06 | Fakultas, Jurusan, Program Studi                                             | Admin unit dan pengguna                                                    | Katalog Keputusan Dekan/Ketua Jurusan, akses pedoman akademik                              |
| SH-07 | UPT Teknologi Informasi dan Komunikasi                                       | Pengelola infrastruktur dan operasional teknis                             | Dokumentasi teknis, kemudahan _deployment_, pemantauan, cadangan data                      |
| SH-08 | Dosen dan Tenaga Kependidikan                                                | Pengguna terautentikasi                                                    | Akses cepat peraturan internal, unduh dokumen, notifikasi peraturan baru                   |
| SH-09 | Mahasiswa                                                                    | Pengguna publik (tanpa login)                                              | Akses dokumen terbuka: pedoman akademik, peraturan kemahasiswaan, tata tertib              |
| SH-10 | Masyarakat, calon mahasiswa, mitra                                           | Pengguna publik                                                            | Transparansi tata kelola, dokumen kerja sama yang terbuka                                  |
| SH-11 | BPHN/JDIHN                                                                   | Mitra jaringan                                                             | Metadata sesuai standar, tersedia untuk sinkronisasi                                       |
| SH-12 | Auditor eksternal (BPK, Itjen)                                               | Pengguna referensi                                                         | Ketersediaan dasar hukum, ketertelusuran perubahan                                         |
| SH-13 | Mitra kerja sama (industri, PT lain, pemda)                                  | Pengguna publik                                                            | Katalog dokumen kerja sama yang boleh dipublikasikan                                       |

---

## A.5 Kebutuhan Fungsional

**Notasi prioritas (MoSCoW)** — `W` = Wajib (_Must_), `P` = Penting (_Should_), `O` = Opsional
(_Could_), `F` = Fase lanjutan (_Won't for now_).
**Notasi aktor** — `PUB` Pengunjung Publik/Mahasiswa · `DST` Dosen/Staf · `ADM` Admin ·
`SAD` Superadmin · `SYS` Proses sistem.

### MOD-01 — Portal Publik

| ID     | Kebutuhan Fungsional                                                                                                                                                        | Aktor | Prioritas |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | --------- |
| FR-001 | Sistem menampilkan beranda berisi kotak pencarian utama, ringkasan jumlah dokumen per jenis peraturan, dokumen terbaru, dokumen terpopuler, dan berita terkini              | PUB   | W         |
| FR-002 | Sistem menampilkan daftar dokumen dengan pagination, pilihan urutan (relevansi, tanggal penetapan, tahun, jumlah unduhan, abjad judul), dan pilihan jumlah data per halaman | PUB   | W         |
| FR-003 | Sistem menampilkan halaman detail dokumen berisi seluruh metadata JDIHN, abstrak, catatan, daftar berkas, relasi antarperaturan, dan status keberlakuan                     | PUB   | W         |
| FR-004 | Sistem menampilkan penanda visual status keberlakuan (Berlaku / Diubah / Dicabut / Belum Berlaku) secara menonjol pada daftar dan detail dokumen                            | PUB   | W         |
| FR-005 | Sistem menampilkan halaman statis yang dapat dikelola admin (Tentang JDIH, Visi & Misi, Struktur Pengelola, Dasar Hukum, Alur Layanan)                                      | PUB   | W         |
| FR-006 | Sistem menampilkan halaman statistik publik: jumlah dokumen per jenis, per tahun, per unit kerja, dan tren unduhan                                                          | PUB   | P         |
| FR-007 | Sistem menyediakan formulir kontak/masukan dengan proteksi anti-spam (CAPTCHA dan pembatasan laju)                                                                          | PUB   | P         |
| FR-008 | Sistem menyediakan navigasi _breadcrumb_ dan tautan kanonik pada setiap halaman                                                                                             | PUB   | P         |
| FR-009 | Sistem menyediakan mode tampilan gelap dan pengaturan ukuran huruf untuk aksesibilitas                                                                                      | PUB   | O         |
| FR-010 | Sistem menyediakan antarmuka bilingual (Indonesia/Inggris) untuk elemen navigasi dan label metadata                                                                         | PUB   | O         |
| FR-011 | Sistem menampilkan _banner_/sorotan yang dapat dijadwalkan tanggal mulai dan berakhir                                                                                       | PUB   | O         |

### MOD-02 — Pencarian dan Penelusuran

| ID     | Kebutuhan Fungsional                                                                                                                                                                                                            | Aktor | Prioritas |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | --------- |
| FR-012 | Sistem menyediakan pencarian sederhana dengan satu kotak masukan yang mencari pada judul, nomor, abstrak, kata kunci, dan isi teks dokumen                                                                                      | PUB   | W         |
| FR-013 | Sistem menyediakan pencarian lanjutan dengan kombinasi kriteria: judul, nomor, jenis peraturan, tahun (tunggal atau rentang), unit kerja, kategori, bidang hukum, status keberlakuan, kata kunci, dan rentang tanggal penetapan | PUB   | W         |
| FR-014 | Sistem menampilkan penyaring aspek (_facet_) dengan jumlah hasil per nilai penyaring, dan mendukung pemilihan beberapa nilai pada satu aspek (logika OR di dalam aspek, AND antaraspek)                                         | PUB   | W         |
| FR-015 | Sistem mendukung toleransi salah ketik (_typo tolerance_) dan sinonim kata (misal "SK" ↔ "Surat Keputusan", "permen" ↔ "peraturan menteri")                                                                                     | PUB   | P         |
| FR-016 | Sistem menampilkan saran otomatis (_autocomplete_) judul dan nomor dokumen saat pengguna mengetik                                                                                                                               | PUB   | P         |
| FR-017 | Sistem menyorot (_highlight_) potongan teks yang cocok pada hasil pencarian                                                                                                                                                     | PUB   | P         |
| FR-018 | Sistem mendukung pencarian frasa persis dengan tanda kutip ganda dan operator pengecualian dengan tanda minus                                                                                                                   | PUB   | O         |
| FR-019 | Sistem mempertahankan kriteria pencarian pada URL sehingga hasil dapat dibagikan dan ditandai (_bookmarkable_)                                                                                                                  | PUB   | P         |
| FR-020 | Sistem menyediakan penelusuran berjenjang: per jenis peraturan, per tahun, per unit kerja, per kategori, dan per bidang hukum                                                                                                   | PUB   | W         |
| FR-021 | Sistem mencatat kata kunci pencarian untuk analitik dan menampilkan daftar pencarian populer                                                                                                                                    | SYS   | P         |
| FR-022 | Sistem menampilkan halaman "hasil tidak ditemukan" dengan saran koreksi ejaan dan dokumen terkait                                                                                                                               | PUB   | P         |
| FR-023 | Sistem hanya mengindeks dan menampilkan dokumen berstatus publikasi "terbit" pada kanal publik                                                                                                                                  | SYS   | W         |
| FR-024 | Sistem menampilkan metadata dokumen bertingkat akses "internal" pada hasil pencarian publik, namun menyembunyikan tautan unduh dan pratinjau                                                                                    | SYS   | P         |

### MOD-03 — Manajemen Dokumen Hukum

| ID     | Kebutuhan Fungsional                                                                                                                         | Aktor    | Prioritas |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------- |
| FR-025 | Sistem menyediakan formulir input metadata dokumen sesuai elemen JDIHN (lihat § A.8) dengan validasi per-ruas                                | ADM, SAD | W         |
| FR-026 | Sistem membuat kode dokumen unik otomatis berpola `JDIH-ITH-<tahun>-<urut 6 digit>`                                                          | SYS      | W         |
| FR-027 | Sistem membuat _slug_ URL otomatis dari jenis, nomor, tahun, dan judul, serta menjamin keunikannya                                           | SYS      | W         |
| FR-028 | Sistem menyusun nilai T.E.U. (Tempat, Entitas, Uraian) secara otomatis dari komponen metadata, dengan opsi penyuntingan manual               | SYS, ADM | P         |
| FR-029 | Sistem menolak penyimpanan bila kombinasi jenis peraturan + nomor + tahun + unit kerja sudah ada, dan menampilkan tautan ke dokumen duplikat | SYS      | W         |
| FR-030 | Sistem menormalisasi nomor peraturan (penghapusan spasi ganda, penyeragaman huruf kapital) sebelum pemeriksaan duplikasi                     | SYS      | W         |
| FR-031 | Sistem memungkinkan penyimpanan dokumen sebagai draf tanpa pemenuhan seluruh ruas wajib                                                      | ADM      | W         |
| FR-032 | Sistem memungkinkan pengubahan seluruh metadata dokumen dan mencatat riwayat perubahannya                                                    | ADM, SAD | W         |
| FR-033 | Sistem memungkinkan penghapusan dokumen secara _soft delete_ dan menyediakan menu pemulihan dari tempat sampah                               | ADM, SAD | W         |
| FR-034 | Sistem memungkinkan penghapusan permanen dokumen hanya oleh Superadmin dengan konfirmasi ganda                                               | SAD      | W         |
| FR-035 | Sistem menyediakan penyalinan dokumen (_duplicate_) sebagai draf baru untuk mempercepat input dokumen serupa                                 | ADM      | O         |
| FR-036 | Sistem memungkinkan penetapan tingkat akses dokumen: publik, internal, terbatas, atau rahasia                                                | ADM, SAD | W         |
| FR-037 | Sistem memungkinkan penandaan dokumen sebagai sorotan (_highlighted_) untuk tampil di beranda                                                | ADM      | O         |
| FR-038 | Sistem menyediakan operasi massal (ubah status, ubah kategori, ubah tingkat akses, hapus) atas dokumen terpilih                              | ADM      | P         |
| FR-039 | Sistem menyediakan impor massal metadata dari berkas CSV/XLSX dengan berkas templat, pravalidasi, laporan baris gagal, dan mode _dry-run_    | ADM, SAD | P         |
| FR-040 | Sistem menyediakan ekspor data dokumen ke CSV, XLSX, dan PDF sesuai penyaring aktif                                                          | ADM, SAD | P         |
| FR-041 | Sistem menampilkan daftar dokumen dengan metadata tidak lengkap sebagai antrean pekerjaan kurasi                                             | ADM      | P         |

### MOD-04 — Manajemen Berkas dan Media

| ID     | Kebutuhan Fungsional                                                                                                                                                         | Aktor    | Prioritas |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------- |
| FR-042 | Sistem menerima unggahan berkas PDF sebagai dokumen utama, dengan validasi jenis MIME nyata (bukan hanya ekstensi) dan ukuran maksimum yang dapat dikonfigurasi (baku 25 MB) | ADM      | W         |
| FR-043 | Sistem menerima beberapa berkas lampiran per dokumen dengan klasifikasi jenis berkas (dokumen utama, lampiran, abstrak, naskah akademik, terjemahan) dan pengurutan          | ADM      | W         |
| FR-044 | Sistem menghitung _hash_ SHA-256 setiap berkas untuk deteksi duplikasi dan verifikasi integritas                                                                             | SYS      | P         |
| FR-045 | Sistem menyimpan nama berkas asli dan menghasilkan nama simpan acak untuk mencegah penebakan jalur                                                                           | SYS      | W         |
| FR-046 | Sistem menyimpan berkas di luar _document root_ dan menyajikannya melalui URL bertanda tangan (_signed URL_) berbatas waktu                                                  | SYS      | W         |
| FR-047 | Sistem menyediakan pratinjau PDF dalam peramban tanpa mengunduh berkas, dengan opsi nonaktifkan unduh untuk dokumen terbatas                                                 | PUB, DST | P         |
| FR-048 | Sistem mengekstraksi teks dari PDF untuk keperluan pencarian penuh teks, dan menjalankan OCR pada PDF hasil pindaian                                                         | SYS      | P         |
| FR-049 | Sistem menyisipkan tanda air (_watermark_) berisi identitas pengunduh dan cap waktu pada PDF dokumen bertingkat akses internal/terbatas                                      | SYS      | O         |
| FR-050 | Sistem membaca jumlah halaman PDF dan menyusun deskripsi fisik secara otomatis                                                                                               | SYS      | O         |
| FR-051 | Sistem menyediakan pustaka media untuk berkas gambar konten berita dan halaman                                                                                               | ADM      | P         |
| FR-052 | Sistem memindai berkas unggahan dengan pemindai antivirus sebelum dipublikasikan                                                                                             | SYS      | O         |
| FR-053 | Sistem menampilkan peringatan bila berkas dokumen utama belum diunggah saat dokumen akan diterbitkan                                                                         | SYS      | W         |

### MOD-05 — Relasi dan Status Keberlakuan Peraturan

| ID     | Kebutuhan Fungsional                                                                                                                                                          | Aktor | Prioritas |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | --------- |
| FR-054 | Sistem memungkinkan pembuatan relasi antardokumen dengan jenis: mengubah, mencabut, mencabut sebagian, dasar hukum, dilaksanakan oleh, dan terkait                            | ADM   | W         |
| FR-055 | Sistem menampilkan relasi kebalikan secara otomatis pada dokumen pasangan (misal "mengubah" ditampilkan sebagai "diubah oleh" pada dokumen sasaran)                           | SYS   | W         |
| FR-056 | Sistem menolak relasi ke dokumen itu sendiri dan menolak relasi ganda dengan jenis yang sama                                                                                  | SYS   | W         |
| FR-057 | Sistem memungkinkan relasi ke dokumen eksternal (peraturan tingkat nasional) yang juga terkatalog dalam sistem                                                                | ADM   | W         |
| FR-058 | Sistem memutakhirkan status keberlakuan dokumen sasaran secara otomatis (menjadi "Diubah" atau "Dicabut") saat relasi pencabutan/pengubahan dibuat, disertai konfirmasi admin | SYS   | P         |
| FR-059 | Sistem menampilkan garis waktu (_timeline_) riwayat perubahan peraturan beserta dokumen pengubahnya                                                                           | PUB   | P         |
| FR-060 | Sistem mencatat setiap perubahan status keberlakuan beserta pelaku, waktu, alasan, dan dokumen dasar                                                                          | SYS   | W         |
| FR-061 | Sistem menandai dokumen sebagai "Belum Berlaku" secara otomatis bila tanggal berlaku masih di masa depan, dan mengubahnya menjadi "Berlaku" pada tanggal tersebut             | SYS   | P         |
| FR-062 | Sistem menyediakan visualisasi graf relasi antarperaturan untuk satu dokumen terpilih                                                                                         | PUB   | O         |

### MOD-06 — Alur Kerja Publikasi

| ID     | Kebutuhan Fungsional                                                                                                                   | Aktor    | Prioritas |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------- |
| FR-063 | Sistem menerapkan status publikasi berjenjang: Draf → Diajukan → (Revisi) → Disetujui → Terbit → Ditarik                               | ADM, SAD | W         |
| FR-064 | Sistem memungkinkan Admin mengajukan dokumen untuk verifikasi                                                                          | ADM      | W         |
| FR-065 | Sistem memungkinkan Admin pemegang izin verifikasi untuk menyetujui atau mengembalikan dokumen dengan catatan revisi wajib             | ADM, SAD | W         |
| FR-066 | Sistem mencegah pemegang izin verifikasi menyetujui dokumen yang dibuatnya sendiri, kecuali dikonfigurasi sebaliknya (pemisahan tugas) | SYS      | P         |
| FR-067 | Sistem memvalidasi kelengkapan metadata wajib dan keberadaan berkas utama sebelum penerbitan                                           | SYS      | W         |
| FR-068 | Sistem memungkinkan penjadwalan penerbitan dokumen pada tanggal dan waktu tertentu                                                     | ADM      | O         |
| FR-069 | Sistem memungkinkan penarikan dokumen terbit (_unpublish_) beserta pencatatan alasan                                                   | ADM, SAD | W         |
| FR-070 | Sistem mencatat seluruh transisi status alur kerja pada log tersendiri                                                                 | SYS      | W         |
| FR-071 | Sistem mengirim notifikasi dalam aplikasi dan surel pada setiap transisi alur kerja kepada pihak terkait                               | SYS      | P         |
| FR-072 | Sistem menampilkan antrean kerja (_inbox_) berisi dokumen yang menunggu tindakan pengguna                                              | ADM      | P         |

### MOD-07 — Manajemen Konten Informasi Hukum

| ID     | Kebutuhan Fungsional                                                                                                       | Aktor    | Prioritas |
| ------ | -------------------------------------------------------------------------------------------------------------------------- | -------- | --------- |
| FR-073 | Sistem memungkinkan pengelolaan konten bertipe berita, artikel hukum, pengumuman, dan siaran pers melalui editor teks kaya | ADM      | W         |
| FR-074 | Sistem memungkinkan penetapan kategori, kata kunci, gambar utama, ringkasan, dan sumber pada setiap konten                 | ADM      | W         |
| FR-075 | Sistem menerapkan status konten: Draf → Ditinjau → Terbit → Arsip, dengan penjadwalan tanggal terbit                       | ADM      | P         |
| FR-076 | Sistem memungkinkan penautan konten berita ke satu atau beberapa dokumen peraturan sebagai rujukan                         | ADM      | P         |
| FR-077 | Sistem memungkinkan pengelolaan halaman statis berjenjang (induk–anak) beserta _slug_ dan metadata SEO                     | ADM, SAD | W         |
| FR-078 | Sistem memungkinkan pengelolaan struktur menu navigasi secara dinamis tanpa perubahan kode                                 | SAD      | P         |
| FR-079 | Sistem memungkinkan pengelolaan _banner_, tautan terkait, dan daftar tanya-jawab (FAQ)                                     | ADM      | P         |
| FR-080 | Sistem memungkinkan pengelolaan dan penanggapan pesan masuk dari formulir kontak                                           | ADM      | P         |
| FR-081 | Sistem menyediakan umpan RSS/Atom untuk berita dan dokumen terbaru                                                         | SYS      | O         |

### MOD-08 — Autentikasi dan Manajemen Pengguna

| ID     | Kebutuhan Fungsional                                                                                                                                     | Aktor         | Prioritas |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | --------- |
| FR-082 | Sistem menyediakan autentikasi dengan surel institusi dan kata sandi                                                                                     | DST, ADM, SAD | W         |
| FR-083 | Sistem menerapkan kebijakan kata sandi: minimal 10 karakter, kombinasi huruf besar, huruf kecil, angka, dan pemeriksaan terhadap daftar kata sandi bocor | SYS           | W         |
| FR-084 | Sistem membatasi percobaan login gagal (maksimal 5 kali per 15 menit per akun dan per alamat IP) dan mengunci akun sementara                             | SYS           | W         |
| FR-085 | Sistem menyediakan pendaftaran akun mandiri bagi Dosen/Staf dengan validasi domain surel institusi dan verifikasi tautan surel                           | DST           | P         |
| FR-086 | Sistem mewajibkan verifikasi Superadmin atau Admin sebelum akun Dosen/Staf hasil pendaftaran mandiri diaktifkan                                          | SAD, ADM      | P         |
| FR-087 | Sistem menyediakan pemulihan kata sandi melalui tautan sekali pakai berbatas waktu 60 menit                                                              | DST, ADM, SAD | W         |
| FR-088 | Sistem memungkinkan pengguna mengubah kata sandi dan menyunting profilnya sendiri                                                                        | DST, ADM, SAD | W         |
| FR-089 | Sistem menyediakan autentikasi dua faktor berbasis TOTP, diwajibkan untuk peran Superadmin                                                               | SAD           | P         |
| FR-090 | Sistem mendukung _Single Sign-On_ dengan penyedia identitas ITH (OAuth 2.0/OIDC atau SAML 2.0) dan pemetaan otomatis unit kerja                          | DST           | O         |
| FR-091 | Sistem mencatat seluruh peristiwa autentikasi (berhasil, gagal, keluar, penguncian, reset) beserta alamat IP dan agen peramban                           | SYS           | W         |
| FR-092 | Sistem memungkinkan pengguna melihat dan mengakhiri sesi aktif pada perangkat lain                                                                       | DST           | O         |
| FR-093 | Sistem mengakhiri sesi secara otomatis setelah 120 menit tanpa aktivitas                                                                                 | SYS           | W         |

### MOD-09 — Akses Dokumen bagi Pengguna Terautentikasi

| ID     | Kebutuhan Fungsional                                                                                                                                                    | Aktor    | Prioritas |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------- |
| FR-094 | Sistem mengizinkan Dosen/Staf mengunduh dokumen bertingkat akses publik dan internal                                                                                    | DST      | W         |
| FR-095 | Sistem mengizinkan Dosen/Staf mengunduh dokumen bertingkat akses terbatas hanya bila unit kerja, peran, atau akun yang bersangkutan tercantum pada daftar akses dokumen | DST      | W         |
| FR-096 | Sistem menyediakan pengajuan permintaan akses atas dokumen terbatas beserta alasan, dan alur persetujuan oleh Admin                                                     | DST, ADM | P         |
| FR-097 | Sistem memungkinkan Dosen/Staf menyimpan dokumen ke koleksi pribadi (penanda)                                                                                           | DST      | O         |
| FR-098 | Sistem menampilkan riwayat unduhan pribadi pengguna                                                                                                                     | DST      | O         |
| FR-099 | Sistem mencatat setiap unduhan (dokumen, berkas, pengguna, peran, waktu, IP tersamarkan)                                                                                | SYS      | W         |
| FR-100 | Sistem membatasi laju unduhan pengunjung anonim (baku 30 unduhan per jam per IP) untuk mencegah pengambilan massal                                                      | SYS      | P         |

### MOD-10 — Master Data

| ID     | Kebutuhan Fungsional                                                                                                                          | Aktor    | Prioritas |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------- |
| FR-101 | Sistem memungkinkan pengelolaan unit kerja secara berjenjang (induk–anak) beserta kode, jenis unit, dan status aktif                          | SAD      | W         |
| FR-102 | Sistem memungkinkan pengelolaan jenis peraturan beserta bentuk singkat, tingkat hierarki, lingkup (internal/eksternal), dan lingkup penomoran | SAD      | W         |
| FR-103 | Sistem memungkinkan pengelolaan kategori berjenjang, bidang hukum, dan kata kunci (_tag_)                                                     | SAD, ADM | W         |
| FR-104 | Sistem memungkinkan pengelolaan status keberlakuan dokumen beserta kode warna penanda                                                         | SAD      | P         |
| FR-105 | Sistem mencegah penghapusan data master yang masih dirujuk dokumen, dan menawarkan penonaktifan sebagai alternatif                            | SYS      | W         |
| FR-106 | Sistem menyediakan penggabungan (_merge_) kata kunci duplikat                                                                                 | SAD      | O         |

### MOD-11 — Hak Akses dan Administrasi Sistem

| ID     | Kebutuhan Fungsional                                                                                                                              | Aktor | Prioritas |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | --------- |
| FR-107 | Sistem memungkinkan pengelolaan akun pengguna: pembuatan, penyuntingan, penonaktifan, penetapan ulang kata sandi, dan penghapusan                 | SAD   | W         |
| FR-108 | Sistem memungkinkan penetapan satu atau beberapa peran kepada satu akun                                                                           | SAD   | W         |
| FR-109 | Sistem memungkinkan pengelolaan peran beserta rincian izinnya (_permission_) tanpa perubahan kode                                                 | SAD   | W         |
| FR-110 | Sistem membatasi cakupan data Admin hanya pada unit kerjanya sendiri beserta unit bawahannya, kecuali diberi akses lintas unit                    | SYS   | W         |
| FR-111 | Sistem mencegah penghapusan atau penurunan hak akun Superadmin terakhir                                                                           | SYS   | W         |
| FR-112 | Sistem menyediakan pengelolaan konfigurasi sistem (identitas situs, logo, kontak, ukuran unggahan maksimum, kebijakan akses, parameter integrasi) | SAD   | W         |
| FR-113 | Sistem menyediakan log audit atas seluruh operasi tulis, memuat pelaku, aksi, entitas, nilai sebelum dan sesudah, alamat IP, dan cap waktu        | SYS   | W         |
| FR-114 | Sistem menyediakan penyaringan dan ekspor log audit                                                                                               | SAD   | P         |
| FR-115 | Sistem menyediakan pemeriksaan kesehatan sistem (basis data, penyimpanan, mesin pencari, antrean) pada dasbor administrasi                        | SAD   | P         |
| FR-116 | Sistem menyediakan pencadangan basis data dan berkas secara terjadwal beserta catatan keberhasilannya                                             | SYS   | W         |
| FR-117 | Sistem menyediakan mode pemeliharaan yang menampilkan halaman informasi bagi pengunjung                                                           | SAD   | O         |
| FR-118 | Sistem menyediakan pengelolaan sinkronisasi ke JDIHN: antrean, percobaan ulang, dan log respons                                                   | SAD   | P         |

### MOD-12 — Statistik, Pelaporan, dan Integrasi

| ID     | Kebutuhan Fungsional                                                                                                                                    | Aktor    | Prioritas |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------- |
| FR-119 | Sistem menyediakan dasbor statistik: total dokumen per jenis/tahun/unit/status, tren kunjungan dan unduhan, dokumen terpopuler, kata kunci populer      | ADM, SAD | P         |
| FR-120 | Sistem menyediakan laporan periodik yang dapat diekspor (bulanan, semesteran, tahunan)                                                                  | ADM, SAD | P         |
| FR-121 | Sistem menyediakan API publik baca-saja berformat JSON untuk metadata dokumen bertingkat akses publik, dengan pembatasan laju                           | SYS      | O         |
| FR-122 | Sistem menghasilkan `sitemap.xml` dan penanda terstruktur `schema.org/Legislation` untuk optimasi mesin pencari                                         | SYS      | P         |
| FR-123 | Sistem menyediakan salinan sitasi dokumen dalam beberapa gaya dan kode QR tautan permanen                                                               | PUB      | O         |
| FR-124 | Sistem menyediakan modul Layanan Hukum: katalog layanan, pengajuan permohonan bernomor tiket, penugasan, pelacakan status, dan pengarsipan hasil telaah | DST, ADM | F         |

---

## A.6 Kebutuhan Non-Fungsional

| ID     | Kategori          | Kebutuhan                                     | Target Terukur / Metode Verifikasi                                                                                             |
| ------ | ----------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| NFR-01 | Kinerja           | Waktu muat halaman beranda dan daftar dokumen | ≤ 2 detik pada koneksi 10 Mbps (_Largest Contentful Paint_ ≤ 2,5 s)                                                            |
| NFR-02 | Kinerja           | Waktu tanggap kueri pencarian                 | ≤ 500 ms untuk 100.000 dokumen terindeks (persentil ke-95)                                                                     |
| NFR-03 | Kinerja           | Waktu tanggap API baca                        | ≤ 300 ms (persentil ke-95)                                                                                                     |
| NFR-04 | Kinerja           | Unggah berkas 25 MB                           | selesai ≤ 60 detik pada koneksi 5 Mbps                                                                                         |
| NFR-05 | Skalabilitas      | Kapasitas data                                | mendukung ≥ 200.000 dokumen dan ≥ 1.000.000 baris log tanpa penurunan kinerja signifikan                                       |
| NFR-06 | Skalabilitas      | Pengguna bersamaan                            | ≥ 300 pengguna aktif bersamaan; arsitektur mendukung penskalaan horizontal aplikasi                                            |
| NFR-07 | Skalabilitas      | Pertumbuhan penyimpanan                       | proyeksi 5 tahun ≥ 500 GB; penyimpanan berkas dapat dipindah ke _object storage_ tanpa perubahan kode                          |
| NFR-08 | Ketersediaan      | _Uptime_ layanan                              | ≥ 99,5% per bulan; jendela pemeliharaan terencana di luar jam kerja                                                            |
| NFR-09 | Ketersediaan      | _Recovery Point Objective_ (RPO)              | ≤ 24 jam (cadangan harian), ≤ 1 jam bila _binary log_ aktif                                                                    |
| NFR-10 | Ketersediaan      | _Recovery Time Objective_ (RTO)               | ≤ 4 jam                                                                                                                        |
| NFR-11 | Keamanan          | Penyimpanan kata sandi                        | _hashing_ Argon2id atau bcrypt _cost_ ≥ 12; kata sandi tidak pernah disimpan atau dicatat dalam bentuk asli                    |
| NFR-12 | Keamanan          | Transportasi data                             | HTTPS/TLS 1.2+ wajib; HSTS aktif; pengalihan otomatis dari HTTP                                                                |
| NFR-13 | Keamanan          | Otorisasi                                     | pemeriksaan izin di lapisan _server_ pada setiap permintaan; penyembunyian elemen antarmuka bukan satu-satunya kendali         |
| NFR-14 | Keamanan          | Mitigasi OWASP Top 10                         | uji penetrasi dasar sebelum rilis; nol temuan kategori Tinggi/Kritis                                                           |
| NFR-15 | Keamanan          | Unggahan berkas                               | validasi MIME nyata, daftar putih ekstensi, penyimpanan di luar _document root_, penonaktifan eksekusi pada direktori unggahan |
| NFR-16 | Keamanan          | Akses berkas                                  | URL bertanda tangan berbatas waktu ≤ 15 menit; tanpa akses langsung ke jalur berkas                                            |
| NFR-17 | Keamanan          | Perlindungan formulir                         | _token_ CSRF pada seluruh operasi tulis; CAPTCHA pada formulir publik                                                          |
| NFR-18 | Keamanan          | Pembatasan laju                               | 60 permintaan/menit/IP untuk API publik; 10 percobaan login/menit/IP                                                           |
| NFR-19 | Keamanan          | Jejak audit                                   | tidak dapat diubah atau dihapus melalui antarmuka aplikasi; retensi ≥ 3 tahun                                                  |
| NFR-20 | Keamanan          | _Header_ keamanan                             | CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy terkonfigurasi                                                   |
| NFR-21 | Privasi           | Data pribadi                                  | alamat IP disimpan dalam bentuk _hash_ bergaram pada log statistik; data pengguna diminimalkan                                 |
| NFR-22 | Privasi           | Retensi log akses                             | log unduhan terperinci diringkas menjadi agregat harian setelah 18 bulan                                                       |
| NFR-23 | Kegunaan          | Kurva belajar admin                           | admin baru mampu menginput satu dokumen lengkap ≤ 10 menit setelah pelatihan 30 menit                                          |
| NFR-24 | Kegunaan          | Kejelasan kesalahan                           | seluruh pesan kesalahan berbahasa Indonesia, spesifik, dan menyertakan langkah perbaikan                                       |
| NFR-25 | Kegunaan          | Konsistensi antarmuka                         | satu sistem desain (_design system_) untuk seluruh modul; komponen terdokumentasi                                              |
| NFR-26 | Aksesibilitas     | Standar                                       | WCAG 2.1 level AA: rasio kontras ≥ 4,5:1, navigasi papan tuntas, atribut ARIA, teks alternatif gambar                          |
| NFR-27 | Kompatibilitas    | Peramban                                      | Chrome, Edge, Firefox, dan Safari dua versi terakhir                                                                           |
| NFR-28 | Kompatibilitas    | Perangkat                                     | _responsive_ pada lebar 320 px hingga 1920 px; panel admin dapat dioperasikan pada tablet                                      |
| NFR-29 | Kompatibilitas    | Berkas                                        | PDF versi 1.4–2.0; dokumen lampiran DOCX/XLSX bila diaktifkan                                                                  |
| NFR-30 | Keterpeliharaan   | Kualitas kode                                 | standar PSR-12; analisis statis tanpa galat tingkat 5; rasio duplikasi ≤ 5%                                                    |
| NFR-31 | Keterpeliharaan   | Cakupan pengujian                             | ≥ 70% untuk lapisan _service_ dan _policy_; 100% untuk logika otorisasi dan alur kerja                                         |
| NFR-32 | Keterpeliharaan   | Dokumentasi                                   | dokumen API (OpenAPI 3), skema basis data, panduan _deployment_, dan buku manual pengguna per peran                            |
| NFR-33 | Keterpeliharaan   | Migrasi skema                                 | seluruh perubahan skema melalui berkas migrasi berversi dan dapat dibatalkan                                                   |
| NFR-34 | Portabilitas      | Lingkungan                                    | berjalan pada Linux (Ubuntu LTS) dengan Docker Compose maupun pasang langsung; tanpa ketergantungan layanan berbayar wajib     |
| NFR-35 | Interoperabilitas | Standar metadata                              | elemen metadata memenuhi standar JDIHN dan dapat dipetakan ke Dublin Core                                                      |
| NFR-36 | Interoperabilitas | Format pertukaran                             | JSON untuk API; CSV/XLSX untuk impor–ekspor; UTF-8 untuk seluruh teks                                                          |
| NFR-37 | Pengarsipan       | Ketahanan tautan                              | _slug_ dokumen bersifat permanen; perubahan _slug_ menghasilkan pengalihan 301                                                 |
| NFR-38 | Kepatuhan         | Keterbukaan informasi                         | dokumen yang dikecualikan tidak pernah terekspos pada kanal publik, termasuk pada indeks pencarian dan API                     |
| NFR-39 | Kepatuhan         | Bahasa                                        | seluruh antarmuka utama dan pesan sistem berbahasa Indonesia baku                                                              |
| NFR-40 | Operasional       | Pemantauan                                    | pencatatan galat terpusat, notifikasi ketika tingkat galat > 1%, pemantauan ketersediaan tiap 5 menit                          |
| NFR-41 | Operasional       | Lokalisasi waktu                              | seluruh cap waktu disimpan dalam UTC dan ditampilkan dalam WITA (UTC+8)                                                        |

---

## A.7 Aturan Bisnis

| ID    | Aturan Bisnis                                                                                                                                                                                           |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BR-01 | Satu dokumen diidentifikasi secara unik oleh kombinasi jenis peraturan, nomor (ternormalisasi), tahun, dan unit kerja pengelola                                                                         |
| BR-02 | Jenis peraturan berlingkup penomoran "institut" (contoh: Peraturan Rektor) tidak boleh memiliki nomor ganda dalam satu tahun di seluruh institusi                                                       |
| BR-03 | Jenis peraturan berlingkup penomoran "unit" (contoh: Keputusan Dekan) boleh memiliki nomor sama pada unit kerja berbeda dalam tahun yang sama                                                           |
| BR-04 | Dokumen tidak dapat berstatus publikasi "Terbit" tanpa sekurang-kurangnya satu berkas berjenis "dokumen utama"                                                                                          |
| BR-05 | Dokumen tidak dapat berstatus publikasi "Terbit" tanpa kelengkapan metadata wajib: jenis, nomor, tahun, judul, tanggal penetapan, unit kerja, status keberlakuan, dan tingkat akses                     |
| BR-06 | Transisi status publikasi hanya boleh mengikuti alur: Draf→Diajukan, Diajukan→Revisi, Diajukan→Disetujui, Revisi→Diajukan, Disetujui→Terbit, Terbit→Ditarik, Ditarik→Disetujui                          |
| BR-07 | Pengembalian dokumen ke status "Revisi" wajib disertai catatan revisi                                                                                                                                   |
| BR-08 | Pemegang izin verifikasi tidak dapat menyetujui dokumen yang dibuat oleh dirinya sendiri (pemisahan tugas), kecuali konfigurasi `alur.izinkan_setujui_sendiri` diaktifkan                               |
| BR-09 | Hanya dokumen berstatus publikasi "Terbit" yang muncul pada kanal publik, indeks pencarian publik, `sitemap.xml`, RSS, dan API publik                                                                   |
| BR-10 | Tingkat akses "publik" dapat diunduh tanpa autentikasi                                                                                                                                                  |
| BR-11 | Tingkat akses "internal" hanya dapat diunduh oleh pengguna terautentikasi berstatus aktif                                                                                                               |
| BR-12 | Tingkat akses "terbatas" hanya dapat diunduh oleh subjek (peran, unit kerja, atau akun) yang tercantum pada daftar akses dokumen, atau pemohon yang permintaan aksesnya disetujui dan belum kedaluwarsa |
| BR-13 | Tingkat akses "rahasia" hanya dapat diakses oleh Admin pengelola dokumen tersebut dan Superadmin; tidak muncul pada kanal publik dalam bentuk apa pun                                                   |
| BR-14 | Metadata dokumen bertingkat akses "internal" dapat ditampilkan pada hasil pencarian publik, namun tanpa tautan pratinjau dan unduh                                                                      |
| BR-15 | Admin hanya dapat mengelola dokumen yang unit kerjanya berada dalam cakupan unit kerja yang ditugaskan kepadanya, termasuk unit bawahannya                                                              |
| BR-16 | Admin tidak dapat mengubah tingkat akses dokumen menjadi "publik" untuk dokumen yang sebelumnya "rahasia" tanpa persetujuan pemegang izin verifikasi                                                    |
| BR-17 | Penghapusan dokumen bersifat _soft delete_; penghapusan permanen hanya oleh Superadmin dan hanya atas dokumen yang telah berada di tempat sampah ≥ 30 hari                                              |
| BR-18 | Relasi "mengubah" dan "mencabut" hanya sah bila tanggal penetapan dokumen pengubah/pencabut lebih akhir daripada dokumen sasaran; pelanggaran memunculkan peringatan yang harus dikonfirmasi            |
| BR-19 | Relasi antardokumen disimpan satu arah (arah aktif); relasi kebalikan diturunkan melalui pemetaan pada tabel `jenis_relasi`                                                                             |
| BR-20 | Suatu dokumen tidak dapat berelasi dengan dirinya sendiri                                                                                                                                               |
| BR-21 | Dokumen berstatus keberlakuan "Dicabut" tetap dapat diakses sebagai dokumentasi historis dan tidak boleh dihapus                                                                                        |
| BR-22 | Status keberlakuan "Belum Berlaku" berubah menjadi "Berlaku" secara otomatis pada `tanggal_berlaku` melalui tugas terjadwal harian                                                                      |
| BR-23 | Perubahan status keberlakuan wajib tercatat pada log beserta alasan dan dokumen dasar                                                                                                                   |
| BR-24 | Data master yang masih dirujuk oleh minimal satu dokumen tidak dapat dihapus; hanya dapat dinonaktifkan                                                                                                 |
| BR-25 | Kode unit kerja, kode jenis peraturan, dan kode izin bersifat unik dan tidak dapat diubah setelah dipakai oleh data transaksional                                                                       |
| BR-26 | Setiap akun wajib memiliki sekurang-kurangnya satu peran                                                                                                                                                |
| BR-27 | Sistem wajib memiliki sekurang-kurangnya satu akun Superadmin aktif; akun Superadmin terakhir tidak dapat dinonaktifkan, dihapus, atau diturunkan perannya                                              |
| BR-28 | Pendaftaran akun mandiri hanya diterima untuk alamat surel berdomain institusi, dan akun berstatus "Menunggu Verifikasi" sampai disetujui                                                               |
| BR-29 | Akun berstatus "Nonaktif" atau "Ditangguhkan" tidak dapat login dan kehilangan seluruh hak akses, namun datanya tetap tersimpan untuk keperluan audit                                                   |
| BR-30 | Setiap unduhan dicatat; akumulasi penghitung pada dokumen dimutakhirkan secara asinkron                                                                                                                 |
| BR-31 | Seluruh operasi tulis atas entitas dokumen, pengguna, peran, izin, dan konfigurasi wajib tercatat pada log audit                                                                                        |
| BR-32 | Sinkronisasi ke JDIHN hanya menyertakan dokumen bertingkat akses "publik" dan berstatus publikasi "Terbit"                                                                                              |

---

## A.8 Pemetaan Elemen Metadata JDIHN

Tabel berikut memetakan elemen metadata standar dokumen hukum berjenis _Peraturan_ ke kolom basis
data sistem. Kolom **W** menandai elemen wajib untuk penerbitan.

| Elemen Metadata JDIHN            | Kolom Basis Data                         | Tabel                         |  W  | Catatan                                                              |
| -------------------------------- | ---------------------------------------- | ----------------------------- | :-: | -------------------------------------------------------------------- |
| Judul                            | `judul`                                  | `dokumen`                     |  ✔  | Ditulis lengkap sesuai naskah asli                                   |
| Jenis/Bentuk Peraturan           | `jenis_peraturan_id`                     | `dokumen` → `jenis_peraturan` |  ✔  | Relasi ke data master                                                |
| Bentuk Singkat                   | `jenis_peraturan.bentuk_singkat`         | `jenis_peraturan`             |  —  | Contoh: `PERREK`, `KEPREK`                                           |
| Nomor                            | `nomor`, `nomor_normal`, `nomor_lengkap` | `dokumen`                     |  ✔  | `nomor_normal` adalah kolom terkomputasi untuk pemeriksaan duplikasi |
| Tahun Terbit                     | `tahun`                                  | `dokumen`                     |  ✔  | Divalidasi 1945 ≤ tahun ≤ tahun berjalan + 1                         |
| T.E.U. (Tempat, Entitas, Uraian) | `teu`                                    | `dokumen`                     |  ✔  | Disusun otomatis, dapat disunting                                    |
| Tempat Penetapan                 | `tempat_penetapan`                       | `dokumen`                     |  ✔  | Baku `Parepare`                                                      |
| Penerbit                         | `penerbit`                               | `dokumen`                     |  ✔  | Baku `Institut Teknologi Bacharuddin Jusuf Habibie`                  |
| Tanggal Penetapan                | `tanggal_penetapan`                      | `dokumen`                     |  ✔  | —                                                                    |
| Tanggal Pengundangan             | `tanggal_pengundangan`                   | `dokumen`                     |  —  | Relevan untuk peraturan eksternal                                    |
| Tanggal Berlaku                  | `tanggal_berlaku`                        | `dokumen`                     |  —  | Bila kosong, dianggap sama dengan tanggal penetapan                  |
| Tanggal Berakhir                 | `tanggal_berakhir`                       | `dokumen`                     |  —  | Untuk peraturan berjangka waktu                                      |
| Sumber                           | `sumber`                                 | `dokumen`                     |  ✔  | Contoh: `Arsip Bagian Hukum ITH`, `BN 2024/No. 123`                  |
| Subjek                           | relasi ke `tag`                          | `dokumen_tag`                 |  ✔  | Kata kunci pengindeksan                                              |
| Bidang Hukum                     | `bidang_hukum_id`                        | `dokumen` → `bidang_hukum`    |  —  | Klasifikasi standar JDIHN                                            |
| Kategori (klasifikasi kampus)    | relasi ke `kategori`                     | `dokumen_kategori`            |  ✔  | Taksonomi internal ITH, berjenjang                                   |
| Status                           | `status_dokumen_id`                      | `dokumen` → `status_dokumen`  |  ✔  | Berlaku / Diubah / Dicabut / Belum Berlaku / Tidak Berlaku           |
| Peraturan Terkait                | `jenis_relasi_id`, `dokumen_terkait_id`  | `dokumen_relasi`              |  —  | Mengubah, dicabut oleh, dasar hukum, dll.                            |
| Bahasa                           | `bahasa`                                 | `dokumen`                     |  ✔  | ISO 639-1, baku `id`                                                 |
| Deskripsi Fisik                  | `deskripsi_fisik`                        | `dokumen`                     |  —  | Contoh: `18 hlm.; 21 × 29,7 cm`                                      |
| Nomor Panggil                    | `nomor_panggil`                          | `dokumen`                     |  —  | Untuk koleksi fisik                                                  |
| Lokasi                           | `lokasi_arsip`                           | `dokumen`                     |  —  | Lokasi simpan berkas fisik                                           |
| Abstrak                          | `abstrak`                                | `dokumen`                     |  —  | Ringkasan substansi peraturan                                        |
| Catatan                          | `catatan`                                | `dokumen`                     |  —  | Keterangan tambahan pengelola                                        |
| Lampiran/Berkas                  | `path`, `jenis_berkas`                   | `dokumen_berkas`              |  ✔  | Minimal satu berkas `dokumen_utama`                                  |
| Penandatangan                    | `penandatangan`, `jabatan_penandatangan` | `dokumen`                     |  ✔  | Untuk produk hukum internal                                          |

**Pemetaan lintas standar** — kesetaraan dengan Dublin Core untuk keperluan interoperabilitas:
`judul`→`dc:title`, `teu`→`dc:creator`, `tag`→`dc:subject`, `abstrak`→`dc:description`,
`penerbit`→`dc:publisher`, `tanggal_penetapan`→`dc:date`, `jenis_peraturan`→`dc:type`,
`mime_type`→`dc:format`, `kode_dokumen`→`dc:identifier`, `sumber`→`dc:source`,
`bahasa`→`dc:language`, `dokumen_relasi`→`dc:relation`.

---

## A.9 Asumsi, Batasan, dan Butir Verifikasi

### A.9.1 Asumsi

| Kode  | Asumsi                                                                                                                                                         |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AS-01 | ITH Parepare memiliki unit kerja yang secara tugas dan fungsi menangani urusan hukum dan tata laksana, yang akan berperan sebagai pemilik proses bisnis sistem |
| AS-02 | Tersedia infrastruktur _server_ (fisik atau awan) dan nama subdomain di bawah domain resmi ITH                                                                 |
| AS-03 | Tersedia layanan surel institusi untuk pengiriman notifikasi dan verifikasi akun                                                                               |
| AS-04 | Berkas produk hukum tersedia dalam format digital PDF, atau dapat dipindai oleh unit pemilik dokumen                                                           |
| AS-05 | Penomoran dan penetapan naskah tetap dilakukan di luar sistem; JDIH hanya mendokumentasikan naskah final                                                       |
| AS-06 | Integrasi SSO bersifat opsional dan dapat menyusul; autentikasi lokal tersedia sejak Fase 1                                                                    |
| AS-07 | Volume dokumen pada tahun pertama diperkirakan 500–2.000 dokumen, dengan pertumbuhan 300–600 dokumen per tahun                                                 |

### A.9.2 Batasan

| Kode  | Batasan                                                                                                                                                                             |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BT-01 | Klasifikasi tingkat akses dokumen mengikuti kebijakan keterbukaan informasi ITH; sistem menyediakan mekanisme, penetapan substansinya merupakan kewenangan pimpinan                 |
| BT-02 | Integrasi JDIHN bergantung pada ketersediaan dan spesifikasi antarmuka dari pengelola JDIHN; dirancang dengan lapisan adaptor agar perubahan spesifikasi tidak mengubah inti sistem |
| BT-03 | Kualitas hasil pencarian penuh teks pada dokumen hasil pindaian bergantung pada kualitas pindaian dan akurasi OCR                                                                   |
| BT-04 | Sistem tidak menjamin keabsahan hukum salinan digital; naskah asli bertanda tangan tetap menjadi acuan                                                                              |
| BT-05 | Anggaran dan sumber daya pengembangan diasumsikan memungkinkan implementasi bertahap sesuai peta jalan pada Bagian G                                                                |

### A.9.3 Butir yang Wajib Diverifikasi Sebelum Implementasi

| Kode | Butir                                                                                          | Sumber Verifikasi                                          |
| ---- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| V-01 | Nomenklatura resmi dan hierarki unit kerja ITH (biro, fakultas, jurusan, UPT, lembaga, satuan) | Peraturan Menteri tentang OTK ITH                          |
| V-02 | Daftar resmi jenis produk hukum internal ITH dan bentuk singkatnya                             | Statuta ITH dan Peraturan Rektor tentang Tata Naskah Dinas |
| V-03 | Pola penomoran naskah dinas dan lingkup penomoran tiap jenis                                   | Peraturan Rektor tentang Tata Naskah Dinas                 |
| V-04 | Nomor, tahun, dan judul resmi peraturan rujukan pada § A.1.2                                   | JDIHN, `peraturan.bpk.go.id`                               |
| V-05 | Daftar informasi yang dikecualikan menurut kebijakan KIP ITH                                   | Keputusan Rektor tentang PPID/klasifikasi informasi        |
| V-06 | Domain surel institusi yang sah untuk pendaftaran mandiri                                      | UPT TIK                                                    |
| V-07 | Spesifikasi teknis SSO institusi (protokol, _endpoint_, atribut)                               | UPT TIK                                                    |
| V-08 | Spesifikasi API dan tata cara pendaftaran anggota JDIHN                                        | Pengelola JDIHN/BPHN                                       |
| V-09 | Identitas visual (logo, palet warna, tipografi) resmi ITH                                      | Pedoman identitas visual ITH                               |
| V-10 | Kebijakan retensi data dan pencadangan institusi                                               | UPT TIK dan unit kearsipan                                 |

---

## A.10 Analisis Data Awal (Proyeksi Volume)

| Entitas          | Volume Awal | Pertumbuhan/Tahun | Volume Tahun ke-5 | Implikasi Desain                                                               |
| ---------------- | ----------- | ----------------- | ----------------- | ------------------------------------------------------------------------------ |
| `dokumen`        | 1.500       | 500               | ± 4.000           | Indeks komposit pada kolom penyaring; pencarian didelegasikan ke mesin pencari |
| `dokumen_berkas` | 2.000       | 700               | ± 5.500           | Rata-rata 1,4 berkas/dokumen; rata-rata 1,8 MB/berkas → ± 10 GB                |
| `dokumen_relasi` | 1.200       | 500               | ± 3.700           | Indeks dua arah pada kedua kolom dokumen                                       |
| `pengguna`       | 200         | 60                | ± 500             | Ringan                                                                         |
| `unduhan`        | 6.000       | 25.000            | ± 106.000         | Kandidat partisi bulanan; agregasi ke `dokumen_statistik_harian`               |
| `log_aktivitas`  | 5.000       | 60.000            | ± 245.000         | Partisi bulanan; retensi 3 tahun; arsip di luar basis data aktif               |
| `log_pencarian`  | 3.000       | 120.000           | ± 483.000         | Retensi 12 bulan; agregasi kata kunci populer                                  |
| `berita`         | 20          | 60                | ± 320             | Ringan                                                                         |

**Kesimpulan**: beban utama bukan pada volume metadata, melainkan pada (1) tabel log dan statistik
yang tumbuh cepat, serta (2) penyimpanan berkas. Kedua hal ini ditangani melalui strategi partisi,
agregasi, retensi, dan pemisahan penyimpanan berkas ke _object storage_ (lihat Bagian D § D.6 dan
Bagian G § G.6).

---

**Lanjut ke** → [B. Use Case Diagram](02-use-case.md)
