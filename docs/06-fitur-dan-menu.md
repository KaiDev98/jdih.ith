# F. RANCANGAN FITUR DAN STRUKTUR MENU

Portal JDIH ITH Parepare

---

## F.1 Peta Situs Portal Publik

```
jdih.ith.ac.id
│
├── / ................................. Beranda
│
├── /profil ........................... Profil (halaman statis berjenjang)
│   ├── /profil/tentang-jdih .......... Tentang JDIH ITH
│   ├── /profil/visi-misi ............. Visi, Misi, dan Tujuan
│   ├── /profil/dasar-hukum ........... Dasar Hukum Pembentukan JDIH ITH
│   ├── /profil/struktur-pengelola .... Struktur Organisasi Tim Pengelola
│   ├── /profil/tugas-fungsi .......... Tugas dan Fungsi
│   └── /profil/alur-layanan .......... Alur Layanan dan Prosedur Akses Dokumen
│
├── /peraturan ........................ Katalog Produk Hukum (daftar + penyaring aspek)
│   ├── /peraturan/{slug} ............. Detail dokumen
│   ├── /peraturan/{slug}/pratinjau ... Pratinjau PDF dalam peramban
│   ├── /peraturan/{slug}/unduh/{id} .. Unduh berkas
│   ├── /jenis/{slug} ................. Telusur per jenis peraturan
│   │   ├── /jenis/statuta
│   │   ├── /jenis/peraturan-rektor
│   │   ├── /jenis/keputusan-rektor
│   │   ├── /jenis/peraturan-senat
│   │   ├── /jenis/surat-edaran-rektor
│   │   ├── /jenis/pedoman-panduan
│   │   ├── /jenis/sop
│   │   ├── /jenis/keputusan-dekan
│   │   └── /jenis/dokumen-kerja-sama
│   ├── /tahun/{tahun} ................ Telusur per tahun penetapan
│   ├── /unit/{slug} .................. Telusur per unit kerja
│   ├── /kategori/{slug} .............. Telusur per kategori (berjenjang)
│   ├── /bidang-hukum/{slug} .......... Telusur per bidang hukum (standar JDIHN)
│   ├── /kata-kunci/{slug} ............ Telusur per kata kunci
│   └── /status/{slug} ................ Telusur per status keberlakuan
│
├── /peraturan-eksternal .............. Peraturan Tingkat Nasional yang Menjadi Rujukan
│
├── /pencarian ........................ Hasil pencarian sederhana
├── /pencarian-lanjutan ............... Formulir pencarian lanjutan
│
├── /informasi ........................ Informasi Hukum (indeks konten)
│   ├── /informasi/berita ............. Berita
│   ├── /informasi/artikel-hukum ...... Artikel dan Kajian Hukum
│   ├── /informasi/pengumuman ......... Pengumuman
│   ├── /informasi/{slug} ............. Detail konten
│   └── /informasi/kategori/{slug} .... Telusur per kategori konten
│
├── /layanan .......................... Layanan Hukum (Fase 3)
│   ├── /layanan/{kode} ............... Rincian jenis layanan dan persyaratan
│   ├── /layanan/ajukan ............... Formulir pengajuan (wajib login)
│   └── /layanan/lacak ................ Pelacakan status berdasarkan nomor tiket
│
├── /statistik ........................ Statistik Produk Hukum
├── /tautan ........................... Tautan Terkait (JDIHN, kementerian, PT lain)
├── /faq .............................. Tanya Jawab
├── /kontak ........................... Kontak dan Formulir Masukan
├── /kebijakan-privasi ................ Kebijakan Privasi
├── /peta-situs ....................... Peta Situs (versi manusia)
│
├── /masuk ............................ Login
├── /daftar ........................... Pendaftaran akun Dosen/Staf
├── /lupa-sandi ....................... Permintaan pemulihan kata sandi
│
├── /akun ............................. Area pengguna terautentikasi
│   ├── /akun/profil .................. Profil dan kata sandi
│   ├── /akun/koleksi ................. Koleksi dokumen pribadi
│   ├── /akun/riwayat-unduhan ......... Riwayat unduhan
│   ├── /akun/permintaan-akses ........ Status permintaan akses dokumen
│   └── /akun/layanan ................. Permohonan layanan hukum saya (Fase 3)
│
├── /admin ............................ Panel Administrasi (lihat § F.4)
│
├── /sitemap.xml ...................... Peta situs untuk mesin pencari
├── /rss/peraturan .................... Umpan dokumen terbaru
├── /rss/informasi .................... Umpan berita terbaru
└── /api/v1/* ......................... API publik baca-saja
```

---

## F.2 Struktur Menu Navigasi Publik

### F.2.1 Menu Utama (_Header_)

| Butir Menu             | Submenu                                                                                                                                                                                                                                                                                                                                                                                              | Target                                     |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| **Beranda**            | —                                                                                                                                                                                                                                                                                                                                                                                                    | `/`                                        |
| **Profil**             | Tentang JDIH ITH · Visi & Misi · Dasar Hukum · Struktur Pengelola · Tugas & Fungsi · Alur Layanan                                                                                                                                                                                                                                                                                                    | halaman statis                             |
| **Produk Hukum**       | **Kelompok 1 — Menurut Jenis**: Statuta · Peraturan Rektor · Keputusan Rektor · Peraturan Senat · Surat Edaran · Pedoman & Panduan · SOP · Keputusan Dekan · Dokumen Kerja Sama<br>**Kelompok 2 — Menurut Penelusuran**: Semua Produk Hukum · Telusur per Tahun · Telusur per Unit Kerja · Telusur per Kategori · Telusur per Bidang Hukum<br>**Kelompok 3**: Peraturan Eksternal (Rujukan Nasional) | indeks jenis peraturan dan halaman telusur |
| **Informasi Hukum**    | Berita · Artikel & Kajian Hukum · Pengumuman                                                                                                                                                                                                                                                                                                                                                         | `/informasi/*`                             |
| **Layanan** _(Fase 3)_ | Jenis Layanan · Ajukan Permohonan · Lacak Permohonan                                                                                                                                                                                                                                                                                                                                                 | `/layanan/*`                               |
| **Statistik**          | —                                                                                                                                                                                                                                                                                                                                                                                                    | `/statistik`                               |
| **Lainnya**            | Tautan Terkait · Tanya Jawab · Kontak                                                                                                                                                                                                                                                                                                                                                                | —                                          |
| 🔍 **Pencarian**       | kotak pencarian selalu tampil pada bilah navigasi                                                                                                                                                                                                                                                                                                                                                    | `/pencarian`                               |
| **Masuk** / **Akun**   | _(tanpa login)_ Masuk · Daftar<br>_(dengan login)_ Profil Saya · Koleksi Saya · Riwayat Unduhan · Permintaan Akses · Panel Admin _(bila berizin)_ · Keluar                                                                                                                                                                                                                                           | —                                          |

**Struktur menu bersifat dinamis** — dikelola melalui UC-63 pada tabel `menu` dan `menu_item`,
sehingga penambahan jenis peraturan atau halaman baru tidak memerlukan perubahan kode.

### F.2.2 Menu Kaki Halaman (_Footer_)

| Kolom                      | Isi                                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------------- |
| **Kolom 1 — Identitas**    | Logo ITH, nama lengkap institusi, alamat, telepon, surel, tautan media sosial                     |
| **Kolom 2 — Produk Hukum** | 6 jenis peraturan paling sering diakses                                                           |
| **Kolom 3 — Informasi**    | Tentang JDIH · Dasar Hukum · Alur Layanan · Tanya Jawab · Kebijakan Privasi · Peta Situs          |
| **Kolom 4 — Jaringan**     | Logo dan tautan: JDIHN · Kementerian terkait · `peraturan.bpk.go.id` · Situs utama ITH · PPID ITH |
| **Bilah bawah**            | Hak cipta, versi aplikasi, penghitung kunjungan, tautan RSS, pernyataan pengelola                 |

---

## F.3 Rancangan Fitur Portal Publik

### F.3.1 Beranda

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [Logo ITH]  JDIH ITH PAREPARE          [🔍 kotak cari]  [Masuk] [🌙] [A±]│
│ Beranda │ Profil ▾ │ Produk Hukum ▾ │ Informasi ▾ │ Statistik │ Lainnya ▾│
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│         JARINGAN DOKUMENTASI DAN INFORMASI HUKUM                         │
│         Institut Teknologi Bacharuddin Jusuf Habibie                     │
│                                                                          │
│    ┌──────────────────────────────────────────────────────┬───────────┐   │
│    │ 🔍  Cari peraturan, nomor, atau kata kunci…          │  Cari     │   │
│    └──────────────────────────────────────────────────────┴───────────┘   │
│         Pencarian Lanjutan →      Populer: beasiswa · kurikulum · KKN     │
├──────────────────────────────────────────────────────────────────────────┤
│ RINGKASAN KOLEKSI                                                        │
│ ┌────────────┬────────────┬────────────┬────────────┬────────────┐       │
│ │    1.482   │     312    │    1.187   │      64    │     2.940  │       │
│ │  Dokumen   │ Per. Rektor│  Kep.Rektor│  Dicabut   │  Unduhan   │       │
│ └────────────┴────────────┴────────────┴────────────┴────────────┘       │
├──────────────────────────────────────────────────────────────────────────┤
│ TELUSUR CEPAT MENURUT JENIS                                              │
│ ┌──────────┐┌──────────┐┌──────────┐┌──────────┐┌──────────┐┌─────────┐ │
│ │ Statuta  ││Per.Rektor││Kep.Rektor││Per. Senat││  Surat   ││  SOP &  │ │
│ │    2     ││   312    ││  1.187   ││    48    ││ Edaran 76││Pedoman  │ │
│ └──────────┘└──────────┘└──────────┘└──────────┘└──────────┘└─────────┘ │
├──────────────────────────────────────────────────────────────────────────┤
│ PERATURAN TERBARU                    │ PALING BANYAK DIUNDUH             │
│ ● Peraturan Rektor No. 12 Th 2026    │ 1. Pedoman Akademik 2025 (412×)   │
│   tentang Kurikulum … [Berlaku]      │ 2. Per. Rektor No. 5/2024 (338×)  │
│ ● Keputusan Rektor No. 210 Th 2026   │ 3. SOP Praktik Kerja … (295×)     │
│   tentang Penetapan … [Berlaku]      │ 4. Kep. Rektor No. 88/2025 (241×) │
│ ● Surat Edaran No. 7 Th 2026 …       │ 5. Statuta ITH (219×)             │
│   [Lihat semua →]                    │    [Lihat peringkat lengkap →]    │
├──────────────────────────────────────────────────────────────────────────┤
│ INFORMASI HUKUM TERKINI                                                  │
│ ┌────────────────┐┌────────────────┐┌────────────────┐                   │
│ │ [gambar]       ││ [gambar]       ││ [gambar]       │                   │
│ │ Sosialisasi    ││ Artikel: Asas  ││ Pengumuman     │                   │
│ │ Per. Rektor …  ││ Keterbukaan …  ││ Pemutakhiran … │                   │
│ │ 20 Sep 2026    ││ 15 Sep 2026    ││ 10 Sep 2026    │                   │
│ └────────────────┘└────────────────┘└────────────────┘                   │
├──────────────────────────────────────────────────────────────────────────┤
│ TAUTAN JARINGAN:  [JDIHN] [Kementerian] [BPK] [ITH] [PPID ITH]           │
└──────────────────────────────────────────────────────────────────────────┘
```

**Fitur beranda**

| Kode | Fitur                                                                                   | Prioritas |
| ---- | --------------------------------------------------------------------------------------- | :-------: |
| F-01 | Kotak pencarian utama dengan saran otomatis dan daftar kata kunci populer               |     W     |
| F-02 | Kartu ringkasan koleksi (total dokumen, per jenis utama, jumlah dicabut, total unduhan) |     W     |
| F-03 | Kartu telusur cepat per jenis peraturan beserta jumlah dokumen                          |     W     |
| F-04 | Daftar peraturan terbaru beserta penanda status keberlakuan                             |     W     |
| F-05 | Peringkat dokumen paling banyak diunduh                                                 |     P     |
| F-06 | Tiga konten informasi hukum terkini                                                     |     P     |
| F-07 | Banner/sorotan terjadwal                                                                |     O     |
| F-08 | Bilah tautan jaringan                                                                   |     P     |
| F-09 | Pengalih mode gelap dan pengatur ukuran huruf                                           |     O     |

### F.3.2 Halaman Daftar dan Pencarian Dokumen

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Beranda › Produk Hukum › Peraturan Rektor                                │
├────────────────────┬─────────────────────────────────────────────────────┤
│ PENYARING          │ Kata kunci: "kurikulum"                             │
│                    │ Ditemukan 34 dokumen  ·  Urutkan: [Relevansi   ▾]   │
│ Jenis Peraturan    │ Aktif: [Per. Rektor ✕] [2024–2026 ✕] [Berlaku ✕]    │
│ ☑ Per. Rektor (18) │                       [Hapus semua penyaring]       │
│ ☐ Kep. Rektor (11) ├─────────────────────────────────────────────────────┤
│ ☐ Per. Senat (5)   │ ● BERLAKU                                           │
│                    │ Peraturan Rektor Nomor 12 Tahun 2026                │
│ Tahun              │ tentang Kurikulum Program Sarjana Institut           │
│ ○ Semua            │ Teknologi Bacharuddin Jusuf Habibie                 │
│ ● 2024 – 2026      │ …penyesuaian struktur *kurikulum* berbasis capaian…  │
│ [2020 ▾]–[2026 ▾]  │ 📅 12 Feb 2026 · 🏛 Biro Akademik · 📎 2 berkas      │
│                    │ 🏷 kurikulum · OBE · sarjana                        │
│ Unit Kerja         │ [Lihat Detail]  [Pratinjau]  [⬇ Unduh PDF 1,2 MB]   │
│ ▸ Rektorat (42)    ├─────────────────────────────────────────────────────┤
│ ▾ Fakultas TI (61) │ ● DIUBAH  — diubah oleh Per. Rektor No. 12/2026     │
│   ☐ Tek.Info (22)  │ Peraturan Rektor Nomor 4 Tahun 2024                 │
│   ☐ Tek.Mesin (18) │ tentang Kurikulum Program Sarjana …                 │
│ ▸ Biro Umum (88)   │ 📅 3 Mar 2024 · 🏛 Biro Akademik · 📎 1 berkas       │
│                    │ [Lihat Detail]  [Pratinjau]  [⬇ Unduh PDF]          │
│ Kategori           ├─────────────────────────────────────────────────────┤
│ ▾ Akademik (156)   │ 🔒 INTERNAL — masuk untuk mengunduh                 │
│   ☐ Kurikulum (34) │ Keputusan Rektor Nomor 98 Tahun 2025                │
│   ☐ Penilaian (21) │ tentang Tim Penyusun Kurikulum …                    │
│ ▸ Kepegawaian (94) │ 📅 8 Agu 2025 · 🏛 Biro Akademik                     │
│                    │ [Lihat Detail]  [🔐 Masuk untuk mengunduh]          │
│ Status Keberlakuan ├─────────────────────────────────────────────────────┤
│ ☑ Berlaku (28)     │             ‹ 1  2  3  4 ›   Tampilkan: [20 ▾]      │
│ ☐ Diubah (4)       │                                                     │
│ ☐ Dicabut (2)      │             [⬇ Ekspor hasil (CSV)]                  │
│                    │                                                     │
│ Bidang Hukum       │                                                     │
│ Kata Kunci         │                                                     │
└────────────────────┴─────────────────────────────────────────────────────┘
```

**Fitur pencarian dan daftar**

| Kode | Fitur                                                                                                                | Prioritas |
| ---- | -------------------------------------------------------------------------------------------------------------------- | :-------: |
| F-10 | Pencarian penuh teks pada judul, nomor, abstrak, kata kunci, dan isi dokumen                                         |     W     |
| F-11 | Penyaring aspek delapan dimensi: jenis, tahun, unit kerja, kategori, bidang hukum, status, kata kunci, penandatangan |     W     |
| F-12 | Jumlah hasil per nilai penyaring (_facet count_) yang dimutakhirkan mengikuti penyaring aktif                        |     W     |
| F-13 | Cip penyaring aktif yang dapat dilepas satu per satu                                                                 |     P     |
| F-14 | Pilihan urutan: relevansi, terbaru, terlama, tahun, jumlah unduhan, abjad judul                                      |     W     |
| F-15 | Penyorotan potongan teks yang cocok pada hasil                                                                       |     P     |
| F-16 | Toleransi salah ketik dan sinonim (SK ↔ Surat Keputusan, permen ↔ peraturan menteri)                                 |     P     |
| F-17 | Penanda status keberlakuan berwarna, disertai keterangan dokumen pengubah/pencabut                                   |     W     |
| F-18 | Penanda tingkat akses (terbuka / perlu login / terbatas)                                                             |     W     |
| F-19 | Kriteria pencarian tersimpan pada URL sehingga dapat dibagikan                                                       |     P     |
| F-20 | Pemuatan penyaring tanpa memuat ulang halaman                                                                        |     P     |
| F-21 | Ekspor hasil pencarian ke CSV                                                                                        |     O     |
| F-22 | Halaman hasil kosong yang informatif beserta saran koreksi                                                           |     P     |
| F-23 | Tampilan alternatif berupa tabel padat untuk penelusuran berjumlah besar                                             |     O     |

### F.3.3 Halaman Detail Dokumen

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Beranda › Produk Hukum › Peraturan Rektor › Nomor 12 Tahun 2026          │
├──────────────────────────────────────────────────────────────────────────┤
│  PERATURAN REKTOR NOMOR 12 TAHUN 2026                      ● BERLAKU     │
│  tentang Kurikulum Program Sarjana Institut Teknologi                    │
│  Bacharuddin Jusuf Habibie                                               │
│                                                                          │
│  🔓 Akses Terbuka   ·   JDIH-ITH-2026-000123   ·   Dilihat 1.204×        │
│  [⬇ Unduh PDF (1,2 MB)] [👁 Pratinjau] [🔗 Salin Tautan] [❝ Sitasi] [⧉ QR]│
├───────────────────────────────────────┬──────────────────────────────────┤
│ METADATA                              │ PRATINJAU DOKUMEN                │
│ ─────────────────────────────────     │ ┌──────────────────────────────┐ │
│ Jenis Peraturan  : Peraturan Rektor   │ │                              │ │
│ Nomor            : 12                 │ │   [penampil PDF sematan]     │ │
│ Nomor Lengkap    : 12/PER/ITH/2026    │ │                              │ │
│ Tahun            : 2026               │ │   ‹ Hal. 1 dari 18 ›         │ │
│ T.E.U.           : Indonesia, Institut│ │                              │ │
│                    Teknologi B.J.     │ └──────────────────────────────┘ │
│                    Habibie            │                                  │
│ Tempat Penetapan : Parepare           │ BERKAS (2)                       │
│ Tgl Penetapan    : 12 Februari 2026   │ 📄 Naskah Peraturan              │
│ Tgl Berlaku      : 1 Maret 2026       │    PDF · 1,2 MB · 18 hlm. [⬇]    │
│ Penandatangan    : (nama rektor)      │ 📎 Lampiran I — Struktur         │
│ Jabatan          : Rektor             │    Kurikulum                     │
│ Unit Kerja       : Biro Akademik dan  │    PDF · 640 KB · 12 hlm. [⬇]    │
│                    Kemahasiswaan      │                                  │
│ Bidang Hukum     : Pendidikan         │ STATISTIK DOKUMEN                │
│ Kategori         : Akademik ›         │ Dilihat   : 1.204×               │
│                    Kurikulum          │ Diunduh   : 412×                 │
│ Kata Kunci       : kurikulum · OBE ·  │ Terbit    : 14 Feb 2026          │
│                    program sarjana    │                                  │
│ Status           : Berlaku            │ BERITA TERKAIT                   │
│ Sumber           : Arsip Bagian Hukum │ ● Sosialisasi Kurikulum Baru …   │
│ Bahasa           : Indonesia          │                                  │
│ Deskripsi Fisik  : 18 hlm.; 21×29,7cm │ DOKUMEN SERUPA                   │
│ Lokasi Arsip     : Bagian Hukum ITH   │ ● Per. Rektor No. 8/2025 …       │
├───────────────────────────────────────┴──────────────────────────────────┤
│ ABSTRAK                                                                  │
│ Peraturan ini mengatur struktur kurikulum program sarjana yang disusun    │
│ berbasis capaian pembelajaran (outcome-based education), mencakup …       │
├──────────────────────────────────────────────────────────────────────────┤
│ PERATURAN TERKAIT                                                        │
│ ┌──────────────────────────────────────────────────────────────────────┐ │
│ │ DASAR HUKUM                                                          │ │
│ │  ▸ Undang-Undang Nomor 12 Tahun 2012 tentang Pendidikan Tinggi        │ │
│ │  ▸ Statuta ITH                                                       │ │
│ │ MENGUBAH                                                             │ │
│ │  ▸ Peraturan Rektor Nomor 4 Tahun 2024 tentang Kurikulum …  [Diubah]  │ │
│ │ DILAKSANAKAN OLEH                                                    │ │
│ │  ▸ Keputusan Rektor Nomor 210 Tahun 2026 tentang Penetapan …          │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────────────────┤
│ RIWAYAT PERUBAHAN                                                        │
│  ●─── 3 Mar 2024  Per. Rektor No. 4/2024 ditetapkan            [Diubah]  │
│  │                                                                       │
│  ●─── 12 Feb 2026 Per. Rektor No. 12/2026 ditetapkan         [Berlaku]  │
│  │                mengubah Per. Rektor No. 4/2024                        │
│  ●─── 1 Mar 2026  mulai berlaku                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**Fitur halaman detail**

| Kode | Fitur                                                               | Prioritas |
| ---- | ------------------------------------------------------------------- | :-------: |
| F-24 | Tampilan seluruh elemen metadata JDIHN secara terstruktur           |     W     |
| F-25 | Penanda status keberlakuan dan tingkat akses yang menonjol          |     W     |
| F-26 | Pratinjau PDF sematan tanpa mengunduh                               |     P     |
| F-27 | Daftar berkas beserta jenis, ukuran, dan jumlah halaman             |     W     |
| F-28 | Blok "Peraturan Terkait" terkelompok menurut jenis relasi, dua arah |     W     |
| F-29 | Garis waktu riwayat perubahan peraturan                             |     P     |
| F-30 | Blok berita terkait yang merujuk dokumen ini                        |     P     |
| F-31 | Blok dokumen serupa berdasarkan kategori dan kata kunci             |     O     |
| F-32 | Sitasi siap salin, tautan permanen, dan kode QR                     |     O     |
| F-33 | Statistik dokumen (dilihat, diunduh, tanggal terbit)                |     P     |
| F-34 | Penanda terstruktur `schema.org/Legislation` untuk mesin pencari    |     P     |
| F-35 | Tombol laporkan kekeliruan metadata                                 |     O     |
| F-36 | Tombol simpan ke koleksi pribadi (pengguna terautentikasi)          |     O     |

### F.3.4 Halaman Statistik Publik

| Kode | Fitur                                                                                       | Prioritas |
| ---- | ------------------------------------------------------------------------------------------- | :-------: |
| F-37 | Kartu rekapitulasi: total dokumen, berlaku, diubah, dicabut, total unduhan, total kunjungan |     P     |
| F-38 | Grafik batang jumlah dokumen per jenis peraturan                                            |     P     |
| F-39 | Grafik garis jumlah dokumen ditetapkan per tahun                                            |     P     |
| F-40 | Grafik jumlah dokumen per unit kerja (10 teratas)                                           |     P     |
| F-41 | Grafik lingkaran komposisi status keberlakuan                                               |     O     |
| F-42 | Grafik tren unduhan 12 bulan terakhir                                                       |     P     |
| F-43 | Peringkat 10 dokumen terpopuler dan 10 kata kunci pencarian terpopuler                      |     P     |
| F-44 | Tombol ekspor data statistik (CSV) dan unduh grafik (PNG)                                   |     O     |

### F.3.5 Fitur Portal Lainnya

| Kode | Fitur                                                                                 | Prioritas |
| ---- | ------------------------------------------------------------------------------------- | :-------: |
| F-45 | Indeks dan detail berita/artikel hukum/pengumuman beserta penyaring tipe dan kategori |     W     |
| F-46 | Halaman statis berjenjang dengan navigasi submenu otomatis                            |     W     |
| F-47 | Formulir kontak dengan CAPTCHA dan pembatasan laju                                    |     P     |
| F-48 | Halaman tautan terkait berkelompok beserta logo                                       |     P     |
| F-49 | Halaman tanya-jawab dengan akordeon dan pencarian dalam halaman                       |     O     |
| F-50 | `sitemap.xml` otomatis dan umpan RSS/Atom                                             |     P     |
| F-51 | Antarmuka responsif 320–1920 px                                                       |     W     |
| F-52 | Aksesibilitas WCAG 2.1 AA: navigasi papan tuntas, kontras memadai, atribut ARIA       |     P     |
| F-53 | Mode gelap dan pengatur ukuran huruf, disimpan pada preferensi peramban               |     O     |
| F-54 | Halaman galat 404/410/500 yang informatif beserta saran penelusuran                   |     P     |
| F-55 | Antarmuka bilingual (Indonesia/Inggris) untuk navigasi dan label metadata             |     O     |
| F-56 | API publik baca-saja berdokumentasi OpenAPI                                           |     O     |

---

## F.4 Struktur Menu Panel Administrasi

### F.4.1 Peta Menu Lengkap (Sudut Pandang Superadmin)

```
/admin
│
├── 📊 Dasbor .......................... ringkasan, antrean kerja, kesehatan sistem
│
├── 📄 DOKUMEN HUKUM
│   ├── Semua Dokumen ................. daftar + penyaring + operasi massal
│   ├── Tambah Dokumen ................ formulir bertahap 4 langkah
│   ├── Menunggu Verifikasi ⑶ ......... antrean verifikasi (dengan lencana jumlah)
│   ├── Perlu Revisi ⑴ ................ dokumen yang dikembalikan
│   ├── Terjadwal Terbit .............. dokumen menunggu tanggal terbit
│   ├── Metadata Tidak Lengkap ⑺ ...... antrean kurasi
│   ├── Permintaan Akses ⑵ ............ keputusan atas permintaan dokumen terbatas
│   ├── Tempat Sampah ................. dokumen ter-*soft delete*, dapat dipulihkan
│   ├── Impor Massal .................. unggah CSV/XLSX + pravalidasi + laporan
│   └── Ekspor Data ................... ekspor terfilter ke CSV/XLSX/PDF
│
├── 📰 KONTEN
│   ├── Berita & Artikel Hukum ........ daftar, tambah, ubah, terbitkan
│   ├── Kategori Berita ............... master kategori konten
│   ├── Halaman Statis ................ pengelolaan halaman berjenjang
│   ├── Banner & Sorotan .............. banner terjadwal
│   ├── Pustaka Media ................. berkas gambar konten
│   ├── Tautan Terkait ................ daftar tautan jaringan
│   ├── Tanya Jawab ................... daftar FAQ
│   └── Pesan Masuk ⑸ ................. penanganan pesan kontak
│
├── 🗂 MASTER DATA
│   ├── Unit Kerja .................... pohon hierarki + seret-lepas
│   ├── Jenis Peraturan ............... jenis, bentuk singkat, hierarki, penomoran
│   ├── Kategori ...................... pohon taksonomi internal
│   ├── Bidang Hukum .................. klasifikasi standar JDIHN
│   ├── Kata Kunci .................... daftar + penggabungan duplikat
│   ├── Status Keberlakuan ............ status + kode warna
│   └── Jenis Relasi .................. jenis relasi + pemetaan kebalikan
│
├── 👥 PENGGUNA & AKSES
│   ├── Daftar Pengguna ............... kelola akun, peran, unit kerja
│   ├── Menunggu Verifikasi ⑵ ......... persetujuan pendaftaran mandiri
│   ├── Peran & Hak Akses ............. matriks izin per peran
│   ├── Izin Langsung ................. pemberian/pencabutan izin per akun
│   └── Uji Hak Akses ................. simulasi keputusan otorisasi
│
├── 📈 STATISTIK & LAPORAN
│   ├── Dasbor Statistik .............. grafik dokumen, unduhan, kunjungan
│   ├── Laporan Dokumen ............... rekapitulasi per jenis/unit/tahun/status
│   ├── Laporan Pemanfaatan ........... unduhan, kunjungan, kata kunci populer
│   ├── Laporan Kinerja Pengelolaan ... waktu proses draf→terbit per unit
│   └── Ekspor Laporan ................ periode bulanan/semesteran/tahunan
│
├── ⚖️ LAYANAN HUKUM (Fase 3)
│   ├── Permohonan Masuk .............. daftar tiket + penugasan
│   ├── Permohonan Saya ............... tiket yang ditugaskan kepada saya
│   └── Jenis Layanan ................. katalog layanan + SLA + formulir
│
├── 🔗 INTEGRASI
│   ├── Sinkronisasi JDIHN ............ status antrean, pemicuan ulang, log
│   ├── Konfigurasi SSO ............... parameter penyedia identitas
│   └── Kunci API ..................... pengelolaan akses API (bila diperlukan)
│
└── ⚙️ SISTEM
    ├── Pengaturan Umum ............... identitas situs, logo, kontak, media sosial
    ├── Pengaturan Unggahan ........... ukuran maksimum, jenis berkas, diska
    ├── Pengaturan Akses .............. tingkat akses baku, tanda air, pembatasan laju
    ├── Pengaturan Surel .............. SMTP, templat notifikasi
    ├── Struktur Menu ................. penyusunan menu navigasi
    ├── Log Aktivitas ................. jejak audit + penyaring + ekspor
    ├── Log Keamanan .................. peristiwa autentikasi dan penolakan akses
    ├── Pencadangan ................... jadwal, riwayat, unduh, pemulihan
    ├── Kesehatan Sistem .............. status basis data, penyimpanan, indeks, antrean
    └── Mode Pemeliharaan ............. aktivasi halaman pemeliharaan
```

### F.4.2 Menu Tampak per Peran

Menu ditampilkan berdasarkan izin yang dimiliki akun (Bagian E § E.4). Butir tanpa izin
**tidak dirender**, dan rutenya tetap dilindungi di sisi peladen (NFR-13).

| Menu                             |       Admin Unit        | Admin Verifikator | Admin Konten | Superadmin |
| -------------------------------- | :---------------------: | :---------------: | :----------: | :--------: |
| Dasbor                           |    ✔ (cakupan unit)     | ✔ (cakupan unit)  |      ✔       | ✔ (penuh)  |
| Dokumen › Semua Dokumen          |    ✔ (cakupan unit)     | ✔ (cakupan unit)  |      —       |     ✔      |
| Dokumen › Tambah Dokumen         |            ✔            |         ✔         |      —       |     ✔      |
| Dokumen › Menunggu Verifikasi    |            —            |         ✔         |      —       |     ✔      |
| Dokumen › Perlu Revisi           |      ✔ (miliknya)       |         ✔         |      —       |     ✔      |
| Dokumen › Terjadwal Terbit       |            —            |         ✔         |      —       |     ✔      |
| Dokumen › Metadata Tidak Lengkap |            ✔            |         ✔         |      —       |     ✔      |
| Dokumen › Permintaan Akses       |            ✔            |         ✔         |      —       |     ✔      |
| Dokumen › Tempat Sampah          |            ✔            |         ✔         |      —       |     ✔      |
| Dokumen › Impor Massal           |            —            |         ○         |      —       |     ✔      |
| Dokumen › Ekspor Data            |            ✔            |         ✔         |      —       |     ✔      |
| Konten (seluruh submenu)         |            —            |         —         |      ✔       |     ✔      |
| Konten › Pustaka Media           |            ✔            |         ✔         |      ✔       |     ✔      |
| Master Data › Kata Kunci         |            ✔            |         ✔         |      ✔       |     ✔      |
| Master Data (lainnya)            |       lihat saja        |    lihat saja     |      —       |     ✔      |
| Pengguna › Daftar Pengguna       | ✔ (lihat, cakupan unit) |     ✔ (lihat)     |      —       | ✔ (kelola) |
| Pengguna › Menunggu Verifikasi   |            ○            |         ○         |      —       |     ✔      |
| Pengguna › Peran & Hak Akses     |       lihat saja        |    lihat saja     |      —       |     ✔      |
| Statistik & Laporan              |    ✔ (cakupan unit)     | ✔ (cakupan unit)  |      —       | ✔ (penuh)  |
| Layanan Hukum                    |            ○            |         ○         |      —       |     ✔      |
| Integrasi                        |            —            |         —         |      —       |     ✔      |
| Sistem                           |            —            |         —         |      —       |     ✔      |

`✔` tampak · `○` tampak bila izin diberikan Superadmin · `—` tidak tampak ·
`lihat saja` tampak tanpa tombol ubah

### F.4.3 Rancangan Dasbor Administrasi

```
┌──────────────────────────────────────────────────────────────────────────┐
│ JDIH ITH — Panel Administrasi          🔔 3   (nama)  Superadmin  ▾      │
├────────────────┬─────────────────────────────────────────────────────────┤
│ 📊 Dasbor      │ Selamat pagi, (nama)                  Sabtu, 26 Sep 2026│
│ 📄 Dokumen  ⑶  │                                                         │
│ 📰 Konten   ⑸  │ ┌──────────┬──────────┬──────────┬──────────┐           │
│ 🗂 Master      │ │  1.482   │    3     │    1     │    7     │           │
│ 👥 Pengguna ⑵  │ │ Dokumen  │ Menunggu │  Perlu   │ Metadata │           │
│ 📈 Statistik   │ │  Terbit  │Verifikasi│  Revisi  │ Kurang   │           │
│ ⚖️ Layanan     │ └──────────┴──────────┴──────────┴──────────┘           │
│ 🔗 Integrasi   │                                                         │
│ ⚙️ Sistem      │ ANTREAN KERJA SAYA                                      │
│                │ ┌─────────────────────────────────────────────────────┐ │
│                │ │ ⏳ Per. Rektor No. 14/2026 — diajukan 2 hari lalu    │ │
│                │ │    oleh Admin BAAK              [Periksa →]         │ │
│                │ │ ⏳ Kep. Rektor No. 221/2026 — diajukan hari ini      │ │
│                │ │    oleh Admin FTI               [Periksa →]         │ │
│                │ │ 🔑 Permintaan akses: Kep. Rektor No. 88/2025        │ │
│                │ │    oleh (nama dosen)            [Putuskan →]        │ │
│                │ └─────────────────────────────────────────────────────┘ │
│                │                                                         │
│                │ TREN 30 HARI                    SEBARAN PER UNIT        │
│                │ ┌───────────────────────┐  ┌──────────────────────────┐ │
│                │ │ Unduhan     ▁▃▅▂▇▅▃▆  │  │ Biro Umum      ████ 88   │ │
│                │ │ Kunjungan   ▂▄▆▃▇▆▄▇  │  │ Fakultas TI    ███  61   │ │
│                │ │ Dok. baru   ▁▁▂▁▃▁▂▁  │  │ Rektorat       ██   42   │ │
│                │ └───────────────────────┘  └──────────────────────────┘ │
│                │                                                         │
│                │ KESEHATAN SISTEM              AKTIVITAS TERBARU         │
│                │ ● Basis data      Normal      ● Admin FTI menerbitkan…  │
│                │ ● Penyimpanan     62% (310GB)  ● Superadmin mengubah…   │
│                │ ● Indeks pencarian Tersinkron  ● Admin BAAK mengunggah… │
│                │ ● Antrean tugas   0 tertunda   ● (nama) masuk sistem    │
│                │ ● Sinkron JDIHN   2 gagal ⚠    [Lihat log lengkap →]    │
│                │ ● Cadangan        26 Sep 02:00                          │
└────────────────┴─────────────────────────────────────────────────────────┘
```

---

## F.5 Rancangan Fitur Panel Administrasi

### F.5.1 Modul Dokumen Hukum

| Kode | Fitur                                                                                             | Prioritas |
| ---- | ------------------------------------------------------------------------------------------------- | :-------: |
| F-57 | Formulir input bertahap empat langkah: Identitas → Klasifikasi → Substansi → Berkas & Akses       |     W     |
| F-58 | Deteksi duplikasi langsung saat pengisian nomor, disertai tautan ke dokumen duplikat              |     W     |
| F-59 | Penyimpanan draf otomatis setiap 60 detik                                                         |     P     |
| F-60 | Penyusunan T.E.U., `kode_dokumen`, dan `slug` secara otomatis                                     |     W     |
| F-61 | Unggah berkas tarik-lepas dengan indikator kemajuan per berkas                                    |     W     |
| F-62 | Pengelolaan beberapa berkas per dokumen: klasifikasi jenis, pengurutan, penggantian berversi      |     W     |
| F-63 | Ekstraksi teks PDF dan OCR otomatis pada dokumen hasil pindaian                                   |     P     |
| F-64 | Pencarian inkremental dokumen sasaran saat menambahkan relasi                                     |     W     |
| F-65 | Usulan perubahan status keberlakuan otomatis saat relasi pencabutan/pengubahan dibuat             |     P     |
| F-66 | Peringatan kewajaran urutan tanggal pada relasi antarperaturan                                    |     P     |
| F-67 | Senarai periksa verifikasi otomatis (kelengkapan, kecocokan nomor pada naskah, potensi duplikasi) |     P     |
| F-68 | Tampilan pemeriksaan berdampingan: metadata dan pratinjau naskah                                  |     P     |
| F-69 | Penonaktifan tombol setujui pada dokumen buatan sendiri (pemisahan tugas)                         |     P     |
| F-70 | Publikasi terjadwal beserta pembatalan jadwal                                                     |     O     |
| F-71 | Pembandingan versi metadata (nilai sebelum vs sesudah per ruas)                                   |     P     |
| F-72 | Penyalinan dokumen sebagai draf baru                                                              |     O     |
| F-73 | Operasi massal: ubah status, kategori, tingkat akses, hapus, dengan pratinjau dampak              |     P     |
| F-74 | Impor massal: templat, pravalidasi tanpa simpan, laporan per baris, pelanjutan proses             |     P     |
| F-75 | Pencocokan otomatis berkas PDF dari arsip ZIP pada impor massal                                   |     O     |
| F-76 | Tempat sampah dengan pemulihan dan penghapusan permanen berjeda 30 hari                           |     W     |
| F-77 | Penyaring "metadata tidak lengkap" sebagai antrean kurasi                                         |     P     |
| F-78 | Pengelolaan daftar akses per dokumen (peran, unit kerja, akun)                                    |     W     |

### F.5.2 Modul Pengguna, Master Data, dan Sistem

| Kode | Fitur                                                                                               | Prioritas |
| ---- | --------------------------------------------------------------------------------------------------- | :-------: |
| F-79 | Pengelolaan unit kerja berupa pohon dengan penyusunan seret-lepas dan pemutakhiran `jalur` otomatis |     W     |
| F-80 | Penolakan penghapusan data master yang masih dirujuk, disertai tawaran penonaktifan                 |     W     |
| F-81 | Penggabungan kata kunci duplikat beserta pemindahan seluruh keterkaitan                             |     O     |
| F-82 | Matriks izin per peran, terkelompok per modul, dengan peringatan pada izin berdampak tinggi         |     W     |
| F-83 | Pemberian dan pencabutan izin langsung per akun beserta masa berlaku                                |     P     |
| F-84 | Fitur "Uji Hak Akses": simulasi keputusan otorisasi beserta penjelasan alasannya                    |     O     |
| F-85 | Pengelolaan akses lintas unit kerja bagi Admin                                                      |     P     |
| F-86 | Antrean verifikasi pendaftaran akun mandiri                                                         |     P     |
| F-87 | Konfigurasi sistem terkelompok dengan validasi tipe nilai                                           |     W     |
| F-88 | Penyunting struktur menu navigasi secara seret-lepas                                                |     P     |
| F-89 | Log aktivitas dengan penyaring multi-kriteria, rincian perubahan, dan ekspor                        |     W     |
| F-90 | Panel kesehatan sistem: basis data, penyimpanan, indeks pencarian, antrean, cadangan                |     P     |
| F-91 | Pengelolaan pencadangan: jadwal, riwayat, unduh, dan prosedur pemulihan                             |     W     |
| F-92 | Panel sinkronisasi JDIHN: rekapitulasi status, pemicuan ulang massal, log respons                   |     P     |
| F-93 | Mode pemeliharaan dengan daftar putih alamat IP administrator                                       |     O     |
| F-94 | Notifikasi dalam aplikasi beserta lencana jumlah pada menu                                          |     P     |
| F-95 | Pencarian global pada panel administrasi (dokumen, pengguna, berita)                                |     O     |

---

## F.6 Peta Fitur terhadap Fase Pengembangan

| Fase                                | Sasaran                                                       | Fitur Utama                                                                                                                                                                               |
| ----------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Fase 1** — Fondasi (bulan 1–3)    | Portal dapat dioperasikan untuk katalogisasi dan akses publik | F-01…F-04, F-10…F-14, F-17, F-18, F-24, F-25, F-27, F-28, F-45, F-46, F-51, F-57…F-62, F-64, F-76, F-78…F-80, F-82, F-87, F-89, F-91                                                      |
| **Fase 2** — Pematangan (bulan 4–6) | Kualitas penelusuran, alur kerja, statistik, dan konten       | F-05…F-08, F-15, F-16, F-19, F-20, F-22, F-26, F-29, F-30, F-33, F-34, F-37…F-43, F-47…F-50, F-52, F-54, F-63, F-65…F-69, F-71, F-73, F-74, F-77, F-83, F-85, F-86, F-88…F-90, F-92, F-94 |
| **Fase 3** — Perluasan (bulan 7–9)  | Integrasi, layanan hukum, dan penyempurnaan pengalaman        | F-09, F-21, F-31, F-32, F-35, F-36, F-44, F-53, F-56, F-70, F-72, F-75, F-81, F-84, F-93, F-95, modul Layanan Hukum, sinkronisasi JDIHN penuh, SSO                                        |
| **Fase 4** — Opsional               | Pengayaan                                                     | F-23, F-55, visualisasi graf relasi (FR-062), penyunting kolaboratif, integrasi tanda tangan elektronik                                                                                   |

---

**Lanjut ke** → [G. Rekomendasi Teknis Pengembangan](07-rekomendasi-teknis.md)
