# B. IDENTIFIKASI AKTOR DAN USE CASE DIAGRAM

Portal JDIH ITH Parepare

---

## B.1 Identifikasi Aktor

### B.1.1 Aktor Utama (_Primary Actors_)

| Kode   | Aktor                                          | Deskripsi                                                                                                                                        | Karakteristik Akses                                                                                                                                                                      | Perkiraan Jumlah |
| ------ | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| **A1** | **Pengunjung Publik** (termasuk **Mahasiswa**) | Pengguna anonim yang mengakses portal tanpa autentikasi: mahasiswa ITH, calon mahasiswa, masyarakat umum, mitra, auditor eksternal, dan peneliti | Tanpa login. Hanya dapat melihat dan mengunduh dokumen bertingkat akses **publik** (_open access_). Metadata dokumen bertingkat akses _internal_ tetap terlihat namun tanpa tautan unduh | Tidak terbatas   |
| **A2** | **Dosen/Staf**                                 | Dosen dan tenaga kependidikan ITH yang memiliki akun terverifikasi                                                                               | Login wajib. Mewarisi seluruh kemampuan A1, ditambah unduh dokumen **internal** serta dokumen **terbatas** yang diizinkan untuk unit kerja/peran/akunnya                                 | ± 200–500        |
| **A3** | **Admin** (Pengelola Dokumen Unit Kerja)       | Petugas pengelola dokumentasi hukum pada unit kerja, termasuk personel unit pengelola hukum                                                      | Login wajib. Mewarisi seluruh kemampuan A2, ditambah pengelolaan dokumen, berkas, konten, dan publikasi — **dibatasi pada cakupan unit kerjanya**                                        | ± 15–30          |
| **A4** | **Superadmin**                                 | Administrator sistem, umumnya dari unit pengelola hukum bersama UPT TIK                                                                          | Login wajib + autentikasi dua faktor. Mewarisi seluruh kemampuan A3 **tanpa batasan unit kerja**, ditambah pengelolaan akun, peran, izin, master data, konfigurasi, integrasi, dan audit | 2–3              |

### B.1.2 Spesialisasi Aktor A3 — _Admin Verifikator_

Alur kerja publikasi membutuhkan pemisahan antara penginput dan penyetuju. Kebutuhan ini
**tidak diwujudkan sebagai peran kelima**, melainkan sebagai spesialisasi Admin yang memegang izin
`dokumen.verifikasi` dan `dokumen.terbitkan`:

| Kode    | Aktor                 | Deskripsi                                                                                                                                                                |
| ------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **A3a** | **Admin Verifikator** | Admin yang diberi izin verifikasi dan penerbitan. Umumnya dijabat oleh Kepala/Koordinator unit pengelola hukum. Direpresentasikan dalam UML sebagai generalisasi dari A3 |

**Alasan desain**: struktur peran tetap konsisten dengan empat peran yang ditetapkan, sementara
kebutuhan pemisahan tugas (_segregation of duties_) dipenuhi melalui granularitas izin. Konsekuensinya,
penambahan tingkat verifikasi di masa depan tidak memerlukan perubahan skema tabel `peran`.

### B.1.3 Aktor Sekunder / Sistem Eksternal (_Secondary Actors_)

| Kode   | Aktor                              | Peran dalam Sistem                                                                                                                         | Arah Interaksi          |
| ------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- |
| **S1** | Sistem JDIHN Nasional              | Penerima sinkronisasi metadata dokumen publik                                                                                              | Keluar (sistem → JDIHN) |
| **S2** | Layanan Surel (SMTP)               | Pengirim notifikasi, verifikasi akun, dan pemulihan kata sandi                                                                             | Keluar                  |
| **S3** | Penjadwal Tugas (_Scheduler_/Cron) | Pemicu tugas berkala: pemutakhiran status keberlakuan, agregasi statistik, pencadangan, percobaan ulang sinkronisasi, penerbitan terjadwal | Masuk (pemicu)          |
| **S4** | Penyedia Identitas ITH (SSO)       | Autentikasi terpusat, opsional                                                                                                             | Dua arah                |
| **S5** | Mesin Pencari (Meilisearch)        | Penyedia layanan indeks dan kueri pencarian                                                                                                | Dua arah                |
| **S6** | Penyimpanan Objek (S3/MinIO)       | Penyimpanan berkas PDF dan media                                                                                                           | Dua arah                |
| **S7** | Layanan Anti-Bot (CAPTCHA)         | Verifikasi permintaan dari formulir publik                                                                                                 | Dua arah                |

### B.1.4 Hierarki Pewarisan Aktor

```
                    ┌───────────────────────┐
                    │  A1 Pengunjung Publik │  ◀── tanpa autentikasi
                    │     (Mahasiswa)       │
                    └───────────▲───────────┘
                                │ generalisasi
                    ┌───────────┴───────────┐
                    │    A2 Dosen/Staf      │  ◀── terautentikasi
                    └───────────▲───────────┘
                                │ generalisasi
                    ┌───────────┴───────────┐
                    │      A3 Admin         │  ◀── cakupan unit kerja
                    └───────▲───────▲───────┘
              generalisasi  │       │  generalisasi
          ┌─────────────────┴──┐ ┌──┴──────────────────┐
          │ A3a Admin          │ │  A4 Superadmin      │ ◀── cakupan penuh
          │     Verifikator    │ │                     │
          └────────────────────┘ └─────────────────────┘
```

**Pembacaan**: aktor turunan mewarisi seluruh _use case_ aktor induknya. Dengan demikian, pada
matriks § B.4, tanda centang untuk A1 secara otomatis berlaku bagi A2, A3, A3a, dan A4 tanpa
perlu ditulis ulang. Kolom matriks tetap diisi eksplisit untuk menghindari salah tafsir saat
implementasi.

---

## B.2 Daftar Use Case

Sistem memiliki **69 use case utama** (UC-01 s.d. UC-69) yang dikelompokkan dalam 6 paket
fungsional, ditambah **6 use case terinklusi** (_included use case_) yang dipanggil oleh beberapa
_use case_ lain. Dari 69 _use case_ tersebut, **63 berprioritas wajib atau penting** dan 6 bersifat
opsional/fase lanjutan (UC-17, UC-18, UC-26, UC-27, UC-31, UC-69).

### PKG-1 — Portal dan Penelusuran Publik

| ID    | Nama Use Case                                    | Aktor Pemicu |
| ----- | ------------------------------------------------ | ------------ |
| UC-01 | Melihat Beranda Portal                           | A1           |
| UC-02 | Melakukan Pencarian Sederhana                    | A1           |
| UC-03 | Melakukan Pencarian Lanjutan                     | A1           |
| UC-04 | Menelusuri Dokumen per Jenis Peraturan           | A1           |
| UC-05 | Menelusuri Dokumen per Unit Kerja                | A1           |
| UC-06 | Menelusuri Dokumen per Tahun                     | A1           |
| UC-07 | Menelusuri Dokumen per Kategori dan Bidang Hukum | A1           |
| UC-08 | Melihat Detail Metadata Dokumen                  | A1           |
| UC-09 | Melihat Relasi dan Riwayat Peraturan             | A1           |
| UC-10 | Melihat Pratinjau Berkas PDF                     | A1           |
| UC-11 | Mengunduh Dokumen Publik (_Open Access_)         | A1           |
| UC-12 | Menyalin Sitasi dan Membagikan Dokumen           | A1           |
| UC-13 | Membaca Berita dan Artikel Hukum                 | A1           |
| UC-14 | Melihat Halaman Statis dan Profil                | A1           |
| UC-15 | Melihat Statistik Publik                         | A1           |
| UC-16 | Mengirim Pesan atau Masukan                      | A1           |
| UC-17 | Mengakses Umpan RSS                              | A1           |
| UC-18 | Mengakses API Publik Baca-Saja                   | A1           |

### PKG-2 — Autentikasi dan Manajemen Akun

| ID    | Nama Use Case                         | Aktor Pemicu |
| ----- | ------------------------------------- | ------------ |
| UC-19 | Melakukan Login                       | A2           |
| UC-20 | Melakukan Logout                      | A2           |
| UC-21 | Mendaftarkan Akun Mandiri             | A2           |
| UC-22 | Memulihkan Kata Sandi                 | A2           |
| UC-23 | Mengubah Kata Sandi                   | A2           |
| UC-24 | Mengelola Profil Pribadi              | A2           |
| UC-25 | Mengaktifkan Autentikasi Dua Faktor   | A2           |
| UC-26 | Melakukan Login melalui SSO Institusi | A2           |
| UC-27 | Mengelola Sesi Perangkat Aktif        | A2           |

### PKG-3 — Akses Dokumen Terautentikasi

| ID    | Nama Use Case                                | Aktor Pemicu |
| ----- | -------------------------------------------- | ------------ |
| UC-28 | Mengunduh Dokumen Internal                   | A2           |
| UC-29 | Mengunduh Dokumen Terbatas                   | A2           |
| UC-30 | Mengajukan Permintaan Akses Dokumen Terbatas | A2           |
| UC-31 | Mengelola Koleksi Dokumen Pribadi            | A2           |
| UC-32 | Melihat Riwayat Unduhan Pribadi              | A2           |

### PKG-4 — Manajemen Dokumen Hukum

| ID    | Nama Use Case                                     | Aktor Pemicu |
| ----- | ------------------------------------------------- | ------------ |
| UC-33 | Membuat Draf Dokumen dan Menginput Metadata       | A3           |
| UC-34 | Mengunggah dan Mengelola Berkas Dokumen           | A3           |
| UC-35 | Mengubah Metadata Dokumen                         | A3           |
| UC-36 | Mengelola Relasi Antarperaturan                   | A3           |
| UC-37 | Mengubah Status Keberlakuan Peraturan             | A3           |
| UC-38 | Menetapkan Tingkat Akses dan Daftar Akses Dokumen | A3           |
| UC-39 | Mengajukan Dokumen untuk Verifikasi               | A3           |
| UC-40 | Memverifikasi dan Menyetujui Dokumen              | A3a          |
| UC-41 | Mempublikasikan Dokumen                           | A3a          |
| UC-42 | Menarik Dokumen Terbit                            | A3a          |
| UC-43 | Menghapus dan Memulihkan Dokumen                  | A3           |
| UC-44 | Melihat Riwayat Perubahan Dokumen                 | A3           |
| UC-45 | Melakukan Impor Massal Metadata                   | A3           |
| UC-46 | Mengekspor Data Dokumen                           | A3           |
| UC-47 | Melakukan Operasi Massal atas Dokumen             | A3           |
| UC-48 | Menyetujui atau Menolak Permintaan Akses Dokumen  | A3           |
| UC-49 | Melihat Antrean Kerja dan Dokumen Tidak Lengkap   | A3           |

### PKG-5 — Manajemen Konten Informasi Hukum

| ID    | Nama Use Case                      | Aktor Pemicu |
| ----- | ---------------------------------- | ------------ |
| UC-50 | Mengelola Berita dan Artikel Hukum | A3           |
| UC-51 | Mengelola Halaman Statis           | A3           |
| UC-52 | Mengelola Banner dan Pengumuman    | A3           |
| UC-53 | Mengelola Pustaka Media            | A3           |
| UC-54 | Mengelola Tautan Terkait dan FAQ   | A3           |
| UC-55 | Menanggapi Pesan Kontak            | A3           |

### PKG-6 — Master Data, Administrasi, dan Integrasi

| ID    | Nama Use Case                                               | Aktor Pemicu |
| ----- | ----------------------------------------------------------- | ------------ |
| UC-56 | Mengelola Unit Kerja                                        | A4           |
| UC-57 | Mengelola Jenis Peraturan                                   | A4           |
| UC-58 | Mengelola Kategori, Bidang Hukum, dan Kata Kunci            | A4           |
| UC-59 | Mengelola Status Keberlakuan dan Jenis Relasi               | A4           |
| UC-60 | Mengelola Akun Pengguna                                     | A4           |
| UC-61 | Memverifikasi Pendaftaran Akun                              | A4           |
| UC-62 | Mengelola Peran dan Hak Akses                               | A4           |
| UC-63 | Mengelola Struktur Menu Navigasi                            | A4           |
| UC-64 | Mengelola Konfigurasi Sistem                                | A4           |
| UC-65 | Melihat Log Aktivitas dan Log Keamanan                      | A4           |
| UC-66 | Mengelola Pencadangan dan Pemulihan Data                    | A4           |
| UC-67 | Mengelola Sinkronisasi JDIHN                                | A4           |
| UC-68 | Melihat Dasbor Statistik dan Laporan                        | A3           |
| UC-69 | Mengelola Layanan Hukum dan Permohonan _(opsional, Fase 3)_ | A3           |

> **Rekapitulasi per paket**: PKG-1 = 18, PKG-2 = 9, PKG-3 = 5, PKG-4 = 17, PKG-5 = 6,
> PKG-6 = 14 → **69 use case utama**, di antaranya 6 berprioritas opsional atau fase lanjutan.

### Use Case Terinklusi (_Included Use Cases_)

_Use case_ berikut tidak dipicu langsung oleh aktor, melainkan selalu dipanggil dari _use case_ lain
melalui relasi `«include»`. Pemisahan ini mencegah duplikasi deskripsi alur pada 40+ _use case_.

| ID     | Nama                             | Dipanggil dari                                                |
| ------ | -------------------------------- | ------------------------------------------------------------- |
| INC-01 | Memvalidasi Metadata Dokumen     | UC-33, UC-35, UC-39, UC-41, UC-45                             |
| INC-02 | Memvalidasi dan Menyimpan Berkas | UC-34, UC-45, UC-53                                           |
| INC-03 | Memeriksa Hak Akses Dokumen      | UC-08, UC-10, UC-11, UC-28, UC-29, UC-18                      |
| INC-04 | Mencatat Jejak Audit             | seluruh _use case_ operasi tulis (UC-33…UC-67)                |
| INC-05 | Mengirim Notifikasi              | UC-21, UC-22, UC-30, UC-39, UC-40, UC-41, UC-42, UC-48, UC-61 |
| INC-06 | Memutakhirkan Indeks Pencarian   | UC-33, UC-35, UC-41, UC-42, UC-43, UC-45, UC-47, UC-50        |

---

## B.3 Relasi Antar-Use Case

### B.3.1 Relasi `«include»`

| Use Case Dasar                      | `«include»`                    | Alasan                                                            |
| ----------------------------------- | ------------------------------ | ----------------------------------------------------------------- |
| UC-33 Membuat Draf Dokumen          | INC-01, INC-04, INC-06         | Setiap pembuatan dokumen selalu divalidasi, diaudit, dan diindeks |
| UC-34 Mengunggah Berkas             | INC-02, INC-04                 | Setiap unggahan selalu divalidasi dan diaudit                     |
| UC-35 Mengubah Metadata             | INC-01, INC-04, INC-06         | Idem                                                              |
| UC-39 Mengajukan Verifikasi         | INC-01, INC-04, INC-05         | Validasi kelengkapan wajib sebelum pengajuan                      |
| UC-40 Memverifikasi Dokumen         | INC-04, INC-05                 | Notifikasi hasil verifikasi kepada penginput                      |
| UC-41 Mempublikasikan Dokumen       | INC-01, INC-04, INC-05, INC-06 | Validasi akhir, audit, notifikasi, pengindeksan                   |
| UC-08 Melihat Detail Dokumen        | INC-03                         | Penyaringan tampilan sesuai tingkat akses                         |
| UC-10 Melihat Pratinjau PDF         | INC-03                         | Idem                                                              |
| UC-11 Mengunduh Dokumen Publik      | INC-03                         | Idem                                                              |
| UC-28 Mengunduh Dokumen Internal    | INC-03                         | Idem                                                              |
| UC-29 Mengunduh Dokumen Terbatas    | INC-03                         | Idem                                                              |
| UC-45 Impor Massal Metadata         | INC-01, INC-02, INC-04, INC-06 | Validasi per baris sebelum penyimpanan                            |
| UC-02 Pencarian Sederhana           | INC-03                         | Penyaringan hasil sesuai hak akses pemanggil                      |
| UC-03 Pencarian Lanjutan            | INC-03                         | Idem                                                              |
| UC-60 Mengelola Akun Pengguna       | INC-04, INC-05                 | Audit dan notifikasi perubahan akun                               |
| UC-62 Mengelola Peran dan Hak Akses | INC-04                         | Audit wajib atas perubahan otorisasi                              |

### B.3.2 Relasi `«extend»`

| Use Case Dasar                        | `«extend»` oleh                      | Kondisi Pemicu (_extension point_)                                        |
| ------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------- |
| UC-02 Pencarian Sederhana             | UC-03 Pencarian Lanjutan             | Pengguna menekan tombol "Pencarian Lanjutan"                              |
| UC-08 Melihat Detail Dokumen          | UC-09 Melihat Relasi dan Riwayat     | Dokumen memiliki sekurang-kurangnya satu relasi atau satu riwayat status  |
| UC-08 Melihat Detail Dokumen          | UC-10 Melihat Pratinjau PDF          | Berkas utama tersedia dan pratinjau diizinkan                             |
| UC-08 Melihat Detail Dokumen          | UC-12 Menyalin Sitasi                | Pengguna menekan tombol "Sitasi/Bagikan"                                  |
| UC-11 Mengunduh Dokumen Publik        | UC-30 Mengajukan Permintaan Akses    | Tingkat akses dokumen "terbatas" dan pengguna belum berhak                |
| UC-19 Melakukan Login                 | UC-25 Autentikasi Dua Faktor         | Akun mengaktifkan 2FA atau berperan Superadmin                            |
| UC-19 Melakukan Login                 | UC-26 Login melalui SSO              | Pengguna memilih tombol "Masuk dengan Akun ITH"                           |
| UC-36 Mengelola Relasi Antarperaturan | UC-37 Mengubah Status Keberlakuan    | Relasi bersifat mengubah atau mencabut → status sasaran diusulkan berubah |
| UC-39 Mengajukan Verifikasi           | UC-34 Mengunggah Berkas              | Validasi mendeteksi berkas utama belum ada                                |
| UC-41 Mempublikasikan Dokumen         | UC-67 Sinkronisasi JDIHN             | Tingkat akses dokumen "publik" → dokumen masuk antrean sinkronisasi       |
| UC-50 Mengelola Berita                | UC-53 Mengelola Pustaka Media        | Penulis menyisipkan gambar ke dalam konten                                |
| UC-60 Mengelola Akun Pengguna         | UC-61 Memverifikasi Pendaftaran Akun | Terdapat akun berstatus "Menunggu Verifikasi"                             |

### B.3.3 Relasi Generalisasi

| Jenis    | Elemen Umum                         | Elemen Khusus                                                       |
| -------- | ----------------------------------- | ------------------------------------------------------------------- |
| Aktor    | A1 Pengunjung Publik                | A2 Dosen/Staf                                                       |
| Aktor    | A2 Dosen/Staf                       | A3 Admin                                                            |
| Aktor    | A3 Admin                            | A3a Admin Verifikator, A4 Superadmin                                |
| Use case | UC-11 Mengunduh Dokumen Publik      | UC-28 Mengunduh Dokumen Internal, UC-29 Mengunduh Dokumen Terbatas  |
| Use case | UC-02 Melakukan Pencarian Sederhana | UC-04, UC-05, UC-06, UC-07 (penelusuran dengan penyaring terpasang) |

---

## B.4 Matriks Hubungan Aktor dengan Use Case

**Keterangan simbol**
`●` pelaksana utama · `○` mewarisi dari aktor induk · `▲` terbatas cakupan unit kerja ·
`◆` memerlukan izin khusus · `—` tidak berwenang · `S` aktor sistem terlibat

| ID    | Use Case                                   | A1 Publik | A2 Dosen/Staf  |    A3 Admin    | A3a Verifikator | A4 Superadmin | Aktor Sistem |
| ----- | ------------------------------------------ | :-------: | :------------: | :------------: | :-------------: | :-----------: | :----------: |
| UC-01 | Melihat Beranda Portal                     |     ●     |       ○        |       ○        |        ○        |       ○       |      —       |
| UC-02 | Pencarian Sederhana                        |     ●     |       ○        |       ○        |        ○        |       ○       |      S5      |
| UC-03 | Pencarian Lanjutan                         |     ●     |       ○        |       ○        |        ○        |       ○       |      S5      |
| UC-04 | Telusur per Jenis Peraturan                |     ●     |       ○        |       ○        |        ○        |       ○       |      S5      |
| UC-05 | Telusur per Unit Kerja                     |     ●     |       ○        |       ○        |        ○        |       ○       |      S5      |
| UC-06 | Telusur per Tahun                          |     ●     |       ○        |       ○        |        ○        |       ○       |      S5      |
| UC-07 | Telusur per Kategori/Bidang Hukum          |     ●     |       ○        |       ○        |        ○        |       ○       |      S5      |
| UC-08 | Melihat Detail Metadata Dokumen            |     ●     |       ○        |       ○        |        ○        |       ○       |      —       |
| UC-09 | Melihat Relasi dan Riwayat Peraturan       |     ●     |       ○        |       ○        |        ○        |       ○       |      —       |
| UC-10 | Melihat Pratinjau Berkas PDF               |     ●     |       ○        |       ○        |        ○        |       ○       |      S6      |
| UC-11 | Mengunduh Dokumen Publik                   |     ●     |       ○        |       ○        |        ○        |       ○       |      S6      |
| UC-12 | Menyalin Sitasi dan Membagikan             |     ●     |       ○        |       ○        |        ○        |       ○       |      —       |
| UC-13 | Membaca Berita dan Artikel Hukum           |     ●     |       ○        |       ○        |        ○        |       ○       |      —       |
| UC-14 | Melihat Halaman Statis dan Profil          |     ●     |       ○        |       ○        |        ○        |       ○       |      —       |
| UC-15 | Melihat Statistik Publik                   |     ●     |       ○        |       ○        |        ○        |       ○       |      —       |
| UC-16 | Mengirim Pesan atau Masukan                |     ●     |       ○        |       ○        |        ○        |       ○       |    S2, S7    |
| UC-17 | Mengakses Umpan RSS                        |     ●     |       ○        |       ○        |        ○        |       ○       |      —       |
| UC-18 | Mengakses API Publik Baca-Saja             |     ●     |       ○        |       ○        |        ○        |       ○       |      —       |
| UC-19 | Melakukan Login                            |     —     |       ●        |       ●        |        ●        |       ●       |      S2      |
| UC-20 | Melakukan Logout                           |     —     |       ●        |       ●        |        ●        |       ●       |      —       |
| UC-21 | Mendaftarkan Akun Mandiri                  |     ●     |       —        |       —        |        —        |       —       |      S2      |
| UC-22 | Memulihkan Kata Sandi                      |     ●     |       ●        |       ●        |        ●        |       ●       |      S2      |
| UC-23 | Mengubah Kata Sandi                        |     —     |       ●        |       ●        |        ●        |       ●       |      —       |
| UC-24 | Mengelola Profil Pribadi                   |     —     |       ●        |       ●        |        ●        |       ●       |      —       |
| UC-25 | Mengaktifkan Autentikasi Dua Faktor        |     —     |       ●        |       ●        |        ●        |   **wajib**   |      —       |
| UC-26 | Login melalui SSO Institusi                |     —     |       ●        |       ●        |        ●        |       ●       |      S4      |
| UC-27 | Mengelola Sesi Perangkat Aktif             |     —     |       ●        |       ●        |        ●        |       ●       |      —       |
| UC-28 | Mengunduh Dokumen Internal                 |     —     |       ●        |       ○        |        ○        |       ○       |      S6      |
| UC-29 | Mengunduh Dokumen Terbatas                 |     —     |       ◆        |       ◆        |        ◆        |       ●       |      S6      |
| UC-30 | Mengajukan Permintaan Akses Dokumen        |     —     |       ●        |       ●        |        ●        |       —       |      S2      |
| UC-31 | Mengelola Koleksi Dokumen Pribadi          |     —     |       ●        |       ●        |        ●        |       ●       |      —       |
| UC-32 | Melihat Riwayat Unduhan Pribadi            |     —     |       ●        |       ●        |        ●        |       ●       |      —       |
| UC-33 | Membuat Draf Dokumen                       |     —     |       —        |       ●▲       |       ●▲        |       ●       |      S5      |
| UC-34 | Mengunggah dan Mengelola Berkas            |     —     |       —        |       ●▲       |       ●▲        |       ●       |      S6      |
| UC-35 | Mengubah Metadata Dokumen                  |     —     |       —        |       ●▲       |       ●▲        |       ●       |      S5      |
| UC-36 | Mengelola Relasi Antarperaturan            |     —     |       —        |       ●▲       |       ●▲        |       ●       |      —       |
| UC-37 | Mengubah Status Keberlakuan                |     —     |       —        |       ◆▲       |       ●▲        |       ●       |      S3      |
| UC-38 | Menetapkan Tingkat Akses Dokumen           |     —     |       —        |       ◆▲       |       ●▲        |       ●       |      —       |
| UC-39 | Mengajukan Dokumen untuk Verifikasi        |     —     |       —        |       ●▲       |       ●▲        |       ●       |      S2      |
| UC-40 | Memverifikasi dan Menyetujui Dokumen       |     —     |       —        |       ◆        |       ●▲        |       ●       |      S2      |
| UC-41 | Mempublikasikan Dokumen                    |     —     |       —        |       ◆        |       ●▲        |       ●       |    S5, S2    |
| UC-42 | Menarik Dokumen Terbit                     |     —     |       —        |       ◆        |       ●▲        |       ●       |      S5      |
| UC-43 | Menghapus dan Memulihkan Dokumen           |     —     |       —        |       ●▲       |       ●▲        |       ●       |      S5      |
| UC-44 | Melihat Riwayat Perubahan Dokumen          |     —     |       —        |       ●▲       |       ●▲        |       ●       |      —       |
| UC-45 | Melakukan Impor Massal Metadata            |     —     |       —        |       ◆▲       |       ◆▲        |       ●       |      S5      |
| UC-46 | Mengekspor Data Dokumen                    |     —     |       —        |       ●▲       |       ●▲        |       ●       |      —       |
| UC-47 | Melakukan Operasi Massal                   |     —     |       —        |       ◆▲       |       ●▲        |       ●       |      S5      |
| UC-48 | Memutuskan Permintaan Akses Dokumen        |     —     |       —        |       ●▲       |       ●▲        |       ●       |      S2      |
| UC-49 | Melihat Antrean Kerja                      |     —     |       —        |       ●▲       |       ●▲        |       ●       |      —       |
| UC-50 | Mengelola Berita dan Artikel Hukum         |     —     |       —        |       ◆        |        ◆        |       ●       |      —       |
| UC-51 | Mengelola Halaman Statis                   |     —     |       —        |       ◆        |        ◆        |       ●       |      —       |
| UC-52 | Mengelola Banner dan Pengumuman            |     —     |       —        |       ◆        |        ◆        |       ●       |      —       |
| UC-53 | Mengelola Pustaka Media                    |     —     |       —        |       ●        |        ●        |       ●       |      S6      |
| UC-54 | Mengelola Tautan Terkait dan FAQ           |     —     |       —        |       ◆        |        ◆        |       ●       |      —       |
| UC-55 | Menanggapi Pesan Kontak                    |     —     |       —        |       ◆        |        ◆        |       ●       |      S2      |
| UC-56 | Mengelola Unit Kerja                       |     —     |       —        |       —        |        —        |       ●       |      —       |
| UC-57 | Mengelola Jenis Peraturan                  |     —     |       —        |       —        |        —        |       ●       |      —       |
| UC-58 | Mengelola Kategori/Bidang Hukum/Kata Kunci |     —     |       —        | ◆ (kata kunci) |        ◆        |       ●       |      —       |
| UC-59 | Mengelola Status dan Jenis Relasi          |     —     |       —        |       —        |        —        |       ●       |      —       |
| UC-60 | Mengelola Akun Pengguna                    |     —     |       —        |       —        |        —        |       ●       |      S2      |
| UC-61 | Memverifikasi Pendaftaran Akun             |     —     |       —        |       ◆        |        ◆        |       ●       |      S2      |
| UC-62 | Mengelola Peran dan Hak Akses              |     —     |       —        |       —        |        —        |       ●       |      —       |
| UC-63 | Mengelola Struktur Menu Navigasi           |     —     |       —        |       —        |        —        |       ●       |      —       |
| UC-64 | Mengelola Konfigurasi Sistem               |     —     |       —        |       —        |        —        |       ●       |      —       |
| UC-65 | Melihat Log Aktivitas dan Keamanan         |     —     |       —        |       ◆▲       |       ◆▲        |       ●       |      —       |
| UC-66 | Mengelola Pencadangan dan Pemulihan        |     —     |       —        |       —        |        —        |       ●       |      S3      |
| UC-67 | Mengelola Sinkronisasi JDIHN               |     —     |       —        |       —        |        —        |       ●       |    S1, S3    |
| UC-68 | Melihat Dasbor Statistik dan Laporan       |     —     |       —        |       ●▲       |       ●▲        |       ●       |      —       |
| UC-69 | Mengelola Layanan Hukum dan Permohonan     |     —     | ● (mengajukan) |       ◆        |        ◆        |       ●       |      S2      |

---

## B.5 Diagram Use Case

### B.5.1 Gambaran Umum (Notasi Teks)

```
                        ╔══════════════════════════════════════════════════════════════════╗
                        ║              SISTEM PORTAL JDIH ITH PAREPARE                     ║
                        ║                                                                  ║
                        ║  ┌── PKG-1 Portal & Penelusuran Publik ───────────────────────┐  ║
   ┌────────────┐       ║  │ (UC-01 Beranda)      (UC-02 Cari Sederhana)                │  ║
   │            │       ║  │ (UC-03 Cari Lanjutan)◀╌╌«extend»╌╌ UC-02                   │  ║
   │     A1     │──────▶║  │ (UC-04..07 Telusur)  (UC-08 Detail Dokumen)                │  ║
   │ Pengunjung │       ║  │ (UC-09 Relasi/Riwayat)◀╌«extend»╌ UC-08                    │  ║
   │   Publik / │       ║  │ (UC-10 Pratinjau PDF) (UC-11 Unduh Publik)                 │  ║
   │  Mahasiswa │       ║  │ (UC-12 Sitasi) (UC-13 Berita) (UC-14 Halaman Statis)       │  ║
   │            │       ║  │ (UC-15 Statistik) (UC-16 Kontak) (UC-17 RSS) (UC-18 API)   │  ║
   └─────▲──────┘       ║  └────────────────────────────────────────────────────────────┘  ║
         │              ║                                                                  ║
    generalisasi        ║  ┌── PKG-2 Autentikasi & Akun ────────────────────────────────┐  ║
         │              ║  │ (UC-19 Login) (UC-20 Logout) (UC-21 Daftar Akun)           │  ║
   ┌─────┴──────┐       ║  │ (UC-22 Reset Sandi) (UC-23 Ubah Sandi) (UC-24 Profil)      │  ║
   │     A2     │──────▶║  │ (UC-25 2FA)◀╌«extend»╌UC-19  (UC-26 SSO)◀╌«extend»╌UC-19   │  ║
   │ Dosen/Staf │       ║  │ (UC-27 Sesi Perangkat)                                     │  ║
   └─────▲──────┘       ║  └────────────────────────────────────────────────────────────┘  ║
         │              ║  ┌── PKG-3 Akses Dokumen Terautentikasi ──────────────────────┐  ║
    generalisasi        ║  │ (UC-28 Unduh Internal) (UC-29 Unduh Terbatas)              │  ║
         │              ║  │ (UC-30 Minta Akses) (UC-31 Koleksi) (UC-32 Riwayat Unduh)  │  ║
         │              ║  └────────────────────────────────────────────────────────────┘  ║
   ┌─────┴──────┐       ║  ┌── PKG-4 Manajemen Dokumen Hukum ───────────────────────────┐  ║
   │     A3     │──────▶║  │ (UC-33 Draf+Metadata) (UC-34 Unggah Berkas)                │  ║
   │   Admin    │       ║  │ (UC-35 Ubah Metadata) (UC-36 Relasi) (UC-37 Status)        │  ║
   │ (per unit) │       ║  │ (UC-38 Tingkat Akses) (UC-39 Ajukan Verifikasi)            │  ║
   └──▲──────▲──┘       ║  │ (UC-43 Hapus/Pulihkan) (UC-44 Riwayat) (UC-45 Impor)       │  ║
      │      │          ║  │ (UC-46 Ekspor) (UC-47 Massal) (UC-48 Putuskan Akses)       │  ║
      │      │          ║  │ (UC-49 Antrean Kerja)                                      │  ║
      │      │          ║  └────────────────────────────────────────────────────────────┘  ║
      │      │          ║  ┌── Verifikasi & Publikasi ──────────────────────────────────┐  ║
      │ ┌────┴─────┐    ║  │ (UC-40 Verifikasi) (UC-41 Publikasi) (UC-42 Tarik)         │  ║
      │ │   A3a    │───▶║  └────────────────────────────────────────────────────────────┘  ║
      │ │Verifikator    ║  ┌── PKG-5 Manajemen Konten ──────────────────────────────────┐  ║
      │ └──────────┘    ║  │ (UC-50 Berita) (UC-51 Halaman) (UC-52 Banner)              │  ║
      │                 ║  │ (UC-53 Media) (UC-54 Tautan/FAQ) (UC-55 Pesan Kontak)      │  ║
 ┌────┴───────┐         ║  └────────────────────────────────────────────────────────────┘  ║
 │     A4     │────────▶║  ┌── PKG-6 Master Data, Administrasi & Integrasi ─────────────┐  ║
 │ Superadmin │         ║  │ (UC-56 Unit Kerja) (UC-57 Jenis Peraturan)                 │  ║
 └────────────┘         ║  │ (UC-58 Kategori/Tag) (UC-59 Status/Jenis Relasi)           │  ║
                        ║  │ (UC-60 Akun) (UC-61 Verifikasi Akun) (UC-62 Peran/Izin)    │  ║
                        ║  │ (UC-63 Menu) (UC-64 Konfigurasi) (UC-65 Log)               │  ║
                        ║  │ (UC-66 Backup) (UC-67 Sinkron JDIHN) (UC-68 Dasbor)        │  ║
                        ║  │ (UC-69 Layanan Hukum — opsional)                           │  ║
                        ║  └────────────────────────────────────────────────────────────┘  ║
                        ║  ┌── Use Case Terinklusi ─────────────────────────────────────┐  ║
                        ║  │ (INC-01 Validasi Metadata) (INC-02 Validasi Berkas)        │  ║
                        ║  │ (INC-03 Cek Hak Akses)  (INC-04 Catat Jejak Audit)         │  ║
                        ║  │ (INC-05 Kirim Notifikasi)(INC-06 Mutakhirkan Indeks)       │  ║
                        ║  └────────────────────────────────────────────────────────────┘  ║
                        ╚═══════╤═════════════╤════════════╤════════════╤═════════════════╝
                                │             │            │            │
                          ┌─────▼────┐  ┌─────▼────┐ ┌─────▼─────┐ ┌────▼──────┐
                          │ S1 JDIHN │  │ S2 SMTP  │ │S3 Penjadwal│ │S5 Meili-  │
                          │ Nasional │  │ (Surel)  │ │  Tugas     │ │  search   │
                          └──────────┘  └──────────┘ └───────────┘ └───────────┘
                          ┌──────────┐  ┌──────────┐ ┌────────────┐
                          │ S4 SSO   │  │S6 Object │ │ S7 CAPTCHA │
                          │   ITH    │  │ Storage  │ │            │
                          └──────────┘  └──────────┘ └────────────┘
```

### B.5.2 Sumber PlantUML

Berkas sumber tersedia pada [diagrams/use-case.puml](diagrams/use-case.puml) dan dapat dirender
melalui ekstensi PlantUML pada VS Code atau <https://www.plantuml.com/plantuml>. Berkas tersebut
memuat tiga varian diagram: gambaran umum, diagram terperinci paket manajemen dokumen, dan
diagram paket administrasi.

---

## B.6 Penjelasan Setiap Use Case

Format ringkas: **Aktor** · **Tujuan** · **Prakondisi** · **Alur Utama** · **Alur Alternatif/Pengecualian** ·
**Poskondisi**. _Use case_ inti disajikan dengan skenario penuh pada § B.7.

### PKG-1 — Portal dan Penelusuran Publik

**UC-01 Melihat Beranda Portal**
Aktor: A1. Tujuan: memperoleh gambaran umum isi portal dan titik masuk penelusuran.
Prakondisi: tidak ada. Alur: pengunjung membuka URL portal → sistem menampilkan kotak pencarian,
kartu rekapitulasi jumlah dokumen per jenis peraturan, 6 dokumen terbaru, 5 dokumen terpopuler,
3 berita terkini, dan banner aktif. Alternatif: bila belum ada dokumen terbit, sistem menampilkan
status kosong yang informatif. Poskondisi: penghitung kunjungan harian bertambah.

**UC-02 Melakukan Pencarian Sederhana**
Aktor: A1. Tujuan: menemukan dokumen dengan satu kata kunci. Prakondisi: indeks pencarian tersedia.
Alur: pengguna mengisi kata kunci → sistem mencari pada judul, nomor, abstrak, kata kunci, dan isi
teks → sistem menyaring hasil sesuai hak akses pemanggil (`«include»` INC-03) → sistem menampilkan
hasil terurut relevansi beserta penyaring aspek. Alternatif: bila hasil kosong, sistem menampilkan
saran koreksi ejaan dan kata kunci populer. Pengecualian: bila mesin pencari tidak tersedia, sistem
beralih ke pencarian basis data (_fallback_) dan mencatat peringatan. Poskondisi: kata kunci tercatat
pada `log_pencarian`.

**UC-03 Melakukan Pencarian Lanjutan** — skenario penuh pada § B.7.1.

**UC-04 Menelusuri Dokumen per Jenis Peraturan**
Aktor: A1. Tujuan: melihat seluruh dokumen pada satu jenis peraturan (contoh: Peraturan Rektor).
Prakondisi: jenis peraturan aktif. Alur: pengguna memilih jenis dari menu atau halaman indeks →
sistem menampilkan daftar terfilter beserta penyaring aspek tahun, unit kerja, dan status.
Poskondisi: URL merefleksikan penyaring aktif sehingga dapat dibagikan.

**UC-05 Menelusuri Dokumen per Unit Kerja**
Aktor: A1. Sama dengan UC-04 dengan penyaring unit kerja. Penelusuran bersifat berjenjang: memilih
unit induk menyertakan dokumen seluruh unit bawahannya.

**UC-06 Menelusuri Dokumen per Tahun**
Aktor: A1. Tujuan: melihat dokumen pada satu tahun penetapan. Alur: sistem menampilkan garis waktu
tahun beserta jumlah dokumen per tahun → pengguna memilih tahun → daftar terfilter tampil.

**UC-07 Menelusuri Dokumen per Kategori dan Bidang Hukum**
Aktor: A1. Tujuan: melihat dokumen pada satu kategori (taksonomi internal berjenjang, misal
_Akademik → Kurikulum_) atau satu bidang hukum (klasifikasi standar JDIHN). Alur: sistem menampilkan
pohon kategori beserta jumlah dokumen; pemilihan kategori induk menyertakan seluruh kategori anak.

**UC-08 Melihat Detail Metadata Dokumen**
Aktor: A1. Tujuan: memeriksa metadata lengkap satu dokumen. Prakondisi: dokumen berstatus publikasi
"Terbit" dan tingkat aksesnya bukan "rahasia". Alur: sistem menampilkan seluruh elemen metadata
JDIHN, abstrak, catatan, daftar kategori dan kata kunci, daftar berkas, blok relasi antarperaturan,
serta panel status keberlakuan → sistem memeriksa hak akses (`«include»` INC-03) untuk menentukan
ketersediaan tombol pratinjau dan unduh. Alternatif: untuk dokumen bertingkat akses "internal" yang
diakses A1, tombol unduh diganti ajakan login. Pengecualian: dokumen tidak ditemukan atau telah
ditarik → halaman 404/410 beserta saran dokumen serupa. Poskondisi: penghitung `jumlah_dilihat`
bertambah secara asinkron.

**UC-09 Melihat Relasi dan Riwayat Peraturan**
Aktor: A1. Tujuan: memahami posisi suatu peraturan dalam jaringan norma internal. Alur: sistem
menampilkan relasi terkelompok (Dasar Hukum, Mengubah, Diubah oleh, Mencabut, Dicabut oleh,
Dilaksanakan oleh, Terkait) dengan tautan ke masing-masing dokumen, ditambah garis waktu perubahan
status keberlakuan beserta dokumen dasarnya. Relasi kebalikan diturunkan dari pemetaan
`jenis_relasi.kode_kebalikan` sehingga tidak perlu disimpan dua kali.

**UC-10 Melihat Pratinjau Berkas PDF**
Aktor: A1. Tujuan: membaca isi dokumen tanpa mengunduh. Prakondisi: berkas ada, `is_pratinjau`
aktif, dan hak akses terpenuhi. Alur: sistem menerbitkan URL bertanda tangan berumur pendek →
penampil PDF memuat berkas melalui _streaming_ → navigasi halaman, pembesaran, dan pencarian dalam
dokumen tersedia. Alternatif: untuk dokumen bertingkat akses terbatas, unduh dinonaktifkan dan
tanda air identitas pengguna disisipkan. Pengecualian: berkas hilang dari penyimpanan → pesan galat
dan notifikasi otomatis kepada Admin pengelola.

**UC-11 Mengunduh Dokumen Publik (_Open Access_)** — skenario penuh pada § B.7.2.

**UC-12 Menyalin Sitasi dan Membagikan Dokumen**
Aktor: A1. Tujuan: merujuk dokumen pada tulisan atau membagikannya. Alur: sistem menyediakan teks
sitasi siap salin, tautan permanen berbasis `kode_dokumen`, kode QR, dan tombol bagikan ke kanal
umum. Poskondisi: tidak ada perubahan data.

**UC-13 Membaca Berita dan Artikel Hukum**
Aktor: A1. Alur: pengguna membuka indeks berita → menyaring berdasarkan tipe (berita, artikel hukum,
pengumuman, siaran pers) dan kategori → membuka detail → sistem menampilkan isi, gambar, penulis,
tanggal terbit, kata kunci, dan daftar peraturan yang dirujuk. Poskondisi: `jumlah_dilihat` bertambah.

**UC-14 Melihat Halaman Statis dan Profil**
Aktor: A1. Alur: sistem menampilkan halaman berdasarkan `slug` (contoh: `tentang-jdih-ith`,
`visi-misi`, `struktur-pengelola`, `dasar-hukum`, `alur-layanan`). Halaman bersifat berjenjang
sehingga dapat membentuk submenu otomatis.

**UC-15 Melihat Statistik Publik**
Aktor: A1. Alur: sistem menampilkan agregasi jumlah dokumen per jenis, per tahun, per unit kerja,
dan per status keberlakuan, ditambah grafik tren unduhan 12 bulan terakhir. Data diambil dari tabel
agregat, bukan dari perhitungan langsung atas tabel transaksi.

**UC-16 Mengirim Pesan atau Masukan**
Aktor: A1. Prakondisi: formulir kontak aktif. Alur: pengguna mengisi nama, surel, subjek, dan pesan →
sistem memverifikasi CAPTCHA dan pembatasan laju → pesan tersimpan berstatus "Baru" → notifikasi
dikirim ke surel pengelola. Pengecualian: verifikasi CAPTCHA gagal atau laju terlampaui → pesan
ditolak dengan penjelasan.

**UC-17 Mengakses Umpan RSS** _(opsional)_
Aktor: A1. Alur: sistem menerbitkan umpan Atom/RSS untuk dokumen terbaru dan berita terbaru,
terbatas pada dokumen bertingkat akses publik.

**UC-18 Mengakses API Publik Baca-Saja** _(opsional)_
Aktor: A1. Alur: klien memanggil _endpoint_ JSON (`/api/v1/dokumen`, `/api/v1/dokumen/{kode}`,
`/api/v1/master/*`) → sistem menerapkan pembatasan laju per alamat IP → sistem mengembalikan
metadata dokumen bertingkat akses publik dan berstatus terbit beserta tautan unduh. Pengecualian:
laju terlampaui → HTTP 429 beserta _header_ `Retry-After`.

### PKG-2 — Autentikasi dan Manajemen Akun

**UC-19 Melakukan Login**
Aktor: A2, A3, A3a, A4. Prakondisi: akun berstatus "Aktif". Alur: pengguna memasukkan surel dan kata
sandi → sistem memverifikasi kredensial → bila 2FA aktif, sistem meminta kode TOTP (`«extend»` UC-25)
→ sesi dibuat, identitas peran dimuat, pengguna diarahkan ke halaman sesuai peran. Alternatif:
login melalui SSO (`«extend»` UC-26). Pengecualian: (a) kredensial salah → pesan generik tanpa
membocorkan keberadaan akun; (b) 5 kegagalan dalam 15 menit → akun terkunci 15 menit dan notifikasi
dikirim; (c) akun nonaktif/ditangguhkan → pesan penolakan beserta kanal bantuan. Poskondisi:
peristiwa tercatat pada `log_autentikasi`; `terakhir_login_pada` dan `terakhir_login_ip` dimutakhirkan.

**UC-20 Melakukan Logout**
Alur: pengguna memilih keluar → sesi dimusnahkan, _token_ "ingat saya" dicabut, peristiwa dicatat.

**UC-21 Mendaftarkan Akun Mandiri**
Aktor: A1 (calon A2). Alur: pengguna mengisi nama, NIP/NIDN, surel institusi, unit kerja, jabatan,
dan kata sandi → sistem memvalidasi domain surel dan keunikan surel/NIP → akun dibuat berstatus
"Menunggu Verifikasi" → surel verifikasi dikirim → setelah tautan diklik, akun menunggu persetujuan
Admin/Superadmin (UC-61). Pengecualian: domain surel tidak sah, surel sudah terdaftar, atau kata
sandi tidak memenuhi kebijakan → pendaftaran ditolak dengan alasan spesifik.

**UC-22 Memulihkan Kata Sandi**
Alur: pengguna memasukkan surel → sistem selalu menampilkan pesan netral (mitigasi _user enumeration_)
→ bila akun ada, _token_ sekali pakai berumur 60 menit dikirim via surel → pengguna menetapkan kata
sandi baru → seluruh sesi lain diakhiri. Pengecualian: _token_ kedaluwarsa atau sudah dipakai →
permintaan ditolak dan pengguna diminta mengulang.

**UC-23 Mengubah Kata Sandi**
Alur: pengguna memasukkan kata sandi lama dan baru → sistem memvalidasi kebijakan kata sandi →
kata sandi diperbarui, sesi lain diakhiri, notifikasi dikirim.

**UC-24 Mengelola Profil Pribadi**
Alur: pengguna menyunting nama, nomor telepon, jabatan, dan foto. Surel, NIP/NIDN, unit kerja, dan
peran hanya dapat diubah oleh Superadmin untuk menjaga integritas data institusional.

**UC-25 Mengaktifkan Autentikasi Dua Faktor**
Alur: sistem menampilkan kode QR rahasia TOTP → pengguna memindai dengan aplikasi autentikator dan
memasukkan kode verifikasi → 2FA aktif, 8 kode pemulihan sekali pakai diterbitkan. Aturan: wajib
bagi peran Superadmin; sistem memblokir akses panel administrasi Superadmin sampai 2FA aktif.

**UC-26 Melakukan Login melalui SSO Institusi** _(opsional)_
Alur: pengguna memilih "Masuk dengan Akun ITH" → pengalihan ke penyedia identitas → setelah
autentikasi berhasil, sistem memetakan atribut (surel, nama, NIP, unit kerja) ke akun lokal,
membuat akun otomatis bila belum ada, dan menetapkan peran baku Dosen/Staf. Pengecualian: atribut
wajib tidak tersedia → login ditolak dan dicatat.

**UC-27 Mengelola Sesi Perangkat Aktif** _(opsional)_
Alur: sistem menampilkan daftar sesi aktif (perangkat, alamat IP, waktu terakhir aktif) → pengguna
dapat mengakhiri sesi tertentu atau seluruh sesi selain yang sedang dipakai.

### PKG-3 — Akses Dokumen Terautentikasi

**UC-28 Mengunduh Dokumen Internal**
Aktor: A2. Prakondisi: pengguna terautentikasi berstatus aktif; dokumen bertingkat akses "internal"
dan berstatus terbit. Alur: sistem memeriksa hak akses (`«include»` INC-03) → URL bertanda tangan
diterbitkan → berkas dialirkan → unduhan dicatat beserta identitas pengguna. Alternatif: bila
konfigurasi tanda air aktif, berkas disajikan dengan tanda air identitas pengunduh.

**UC-29 Mengunduh Dokumen Terbatas**
Aktor: A2 dengan hak khusus. Prakondisi: unit kerja, peran, atau akun pengguna tercantum pada
`dokumen_akses`, **atau** terdapat permintaan akses berstatus "Disetujui" yang belum kedaluwarsa.
Alur: sama dengan UC-28 dengan pemeriksaan tambahan atas daftar akses. Pengecualian: tidak berhak →
sistem menawarkan pengajuan permintaan akses (`«extend»` UC-30).

**UC-30 Mengajukan Permintaan Akses Dokumen Terbatas**
Aktor: A2. Alur: pengguna mengisi alasan penggunaan → permintaan tersimpan berstatus "Menunggu" →
notifikasi dikirim ke Admin pengelola unit kerja dokumen tersebut → hasil keputusan dinotifikasikan
kembali kepada pemohon. Poskondisi: bila disetujui, akses berlaku sampai `berlaku_hingga`.

**UC-31 Mengelola Koleksi Dokumen Pribadi** _(opsional)_
Alur: pengguna menambah atau menghapus dokumen dari koleksi pribadi beserta catatan, dan dapat
mengekspor koleksinya sebagai daftar rujukan.

**UC-32 Melihat Riwayat Unduhan Pribadi**
Alur: sistem menampilkan riwayat unduhan pengguna yang bersangkutan, terurut waktu terbaru, beserta
tautan ke dokumen.

### PKG-4 — Manajemen Dokumen Hukum

**UC-33 Membuat Draf Dokumen dan Menginput Metadata** — skenario penuh pada § B.7.3.

**UC-34 Mengunggah dan Mengelola Berkas Dokumen** — skenario penuh pada § B.7.4.

**UC-35 Mengubah Metadata Dokumen**
Aktor: A3 (cakupan unit), A4. Prakondisi: dokumen berada dalam cakupan pengelolaan aktor. Alur: aktor
menyunting metadata → sistem memvalidasi (`«include»` INC-01) → sistem menyimpan cuplikan versi
sebelumnya ke `dokumen_riwayat` → perubahan tersimpan, jejak audit dicatat, indeks dimutakhirkan.
Alternatif: dokumen berstatus "Terbit" → sistem meminta konfirmasi bahwa perubahan langsung terlihat
publik, dan mewajibkan pengisian ringkasan perubahan. Pengecualian: perubahan kombinasi
jenis/nomor/tahun/unit menyebabkan duplikasi → penyimpanan ditolak beserta tautan dokumen duplikat.

**UC-36 Mengelola Relasi Antarperaturan**
Aktor: A3, A4. Alur: aktor mencari dokumen sasaran melalui pencarian inkremental → memilih jenis
relasi → menambahkan keterangan → sistem memvalidasi (bukan dokumen yang sama, belum ada relasi
sejenis, urutan tanggal logis) → relasi tersimpan satu arah. Alternatif: jenis relasi bersifat
mengubah/mencabut → sistem mengusulkan perubahan status keberlakuan dokumen sasaran (`«extend»`
UC-37). Pengecualian: tanggal penetapan dokumen pengubah lebih awal daripada sasaran → peringatan
yang harus dikonfirmasi eksplisit.

**UC-37 Mengubah Status Keberlakuan Peraturan**
Aktor: A3 berizin `dokumen.ubah_status`, A3a, A4, dan S3 (otomatis). Alur: aktor memilih status baru
→ mengisi alasan dan memilih dokumen dasar (bila ada) → sistem menyimpan status baru dan mencatat
riwayat pada `dokumen_alur` bertipe `status_keberlakuan`. Alur otomatis: penjadwal harian mengubah
status "Belum Berlaku" menjadi "Berlaku" pada `tanggal_berlaku`, dan menandai dokumen yang melewati
`tanggal_berakhir` sebagai "Tidak Berlaku". Poskondisi: indeks pencarian dan tampilan publik
dimutakhirkan.

**UC-38 Menetapkan Tingkat Akses dan Daftar Akses Dokumen**
Aktor: A3 berizin `dokumen.ubah_akses`, A3a, A4. Alur: aktor memilih tingkat akses (publik, internal,
terbatas, rahasia); bila "terbatas", aktor menambahkan subjek berhak (peran, unit kerja, atau akun)
beserta jenis izin (lihat/unduh) → sistem menyimpan pada `dokumen_akses`. Pengecualian: penurunan
tingkat kerahasiaan dari "rahasia" ke "publik" memerlukan persetujuan pemegang izin verifikasi (BR-16).

**UC-39 Mengajukan Dokumen untuk Verifikasi**
Aktor: A3. Prakondisi: dokumen berstatus "Draf" atau "Revisi". Alur: aktor menekan "Ajukan
Verifikasi" → sistem menjalankan validasi kelengkapan (`«include»` INC-01) → status berubah menjadi
"Diajukan", transisi dicatat, notifikasi dikirim ke seluruh pemegang izin verifikasi pada cakupan unit
terkait. Pengecualian: metadata wajib belum lengkap atau berkas utama belum ada → pengajuan ditolak
beserta daftar rinci ruas yang harus dilengkapi (`«extend»` UC-34).

**UC-40 Memverifikasi dan Menyetujui Dokumen** — skenario penuh pada § B.7.5.

**UC-41 Mempublikasikan Dokumen** — skenario penuh pada § B.7.6.

**UC-42 Menarik Dokumen Terbit**
Aktor: A3a, A4. Alur: aktor memilih "Tarik Publikasi" → mengisi alasan wajib → status berubah
menjadi "Ditarik", dokumen dikeluarkan dari indeks publik, URL lama mengembalikan HTTP 410 beserta
penjelasan, transisi dicatat, notifikasi dikirim. Poskondisi: dokumen tetap tersimpan dan dapat
dipublikasikan ulang.

**UC-43 Menghapus dan Memulihkan Dokumen**
Aktor: A3 (cakupan unit), A4. Alur: aktor menghapus dokumen → sistem melakukan _soft delete_
(`dihapus_pada` terisi), mengeluarkan dokumen dari indeks, dan memindahkannya ke tempat sampah →
aktor dapat memulihkan dokumen dari tempat sampah. Alternatif: penghapusan permanen hanya oleh A4,
hanya untuk dokumen yang telah berada di tempat sampah ≥ 30 hari, dengan konfirmasi pengetikan
nomor dokumen. Pengecualian: dokumen menjadi rujukan relasi dokumen lain → sistem menampilkan
daftar dokumen perujuk dan meminta konfirmasi.

**UC-44 Melihat Riwayat Perubahan Dokumen**
Aktor: A3, A4. Alur: sistem menampilkan daftar versi metadata beserta pelaku, waktu, ringkasan
perubahan, dan pembandingan nilai sebelum–sesudah per ruas. Poskondisi: tidak ada perubahan data.

**UC-45 Melakukan Impor Massal Metadata** — skenario penuh pada § B.7.7.

**UC-46 Mengekspor Data Dokumen**
Aktor: A3, A4. Alur: aktor menetapkan penyaring dan memilih kolom yang diekspor → sistem membuat
berkas CSV/XLSX/PDF melalui antrean latar belakang → tautan unduh dikirim setelah selesai. Aturan:
ekspor A3 terbatas pada cakupan unit kerjanya.

**UC-47 Melakukan Operasi Massal atas Dokumen**
Aktor: A3 berizin, A3a, A4. Alur: aktor memilih beberapa dokumen dari daftar → memilih aksi (ubah
status keberlakuan, tambah/hapus kategori, ubah tingkat akses, hapus) → sistem menampilkan pratinjau
dampak → aktor mengonfirmasi → operasi dijalankan per dokumen melalui antrean, setiap perubahan
tercatat pada jejak audit secara individual. Pengecualian: sebagian dokumen gagal → sistem
menyelesaikan sisanya dan menyajikan laporan rinci keberhasilan dan kegagalan.

**UC-48 Menyetujui atau Menolak Permintaan Akses Dokumen**
Aktor: A3, A3a, A4. Alur: aktor membuka daftar permintaan pada cakupan unitnya → memeriksa alasan
pemohon → menyetujui (dengan penetapan masa berlaku) atau menolak (dengan catatan) → notifikasi
dikirim kepada pemohon, keputusan dicatat pada jejak audit.

**UC-49 Melihat Antrean Kerja dan Dokumen Tidak Lengkap**
Aktor: A3, A3a, A4. Alur: sistem menampilkan empat antrean: (1) dokumen menunggu verifikasi,
(2) dokumen dikembalikan untuk revisi, (3) dokumen dengan metadata tidak lengkap, (4) permintaan
akses menunggu keputusan. Setiap entri menyertakan tautan tindakan langsung.

### PKG-5 — Manajemen Konten Informasi Hukum

**UC-50 Mengelola Berita dan Artikel Hukum**
Aktor: A3 berizin, A4. Alur: aktor membuat atau menyunting konten melalui editor teks kaya →
menetapkan tipe, kategori, kata kunci, ringkasan, gambar utama, dan sumber → menautkan dokumen
peraturan yang dirujuk → menyimpan sebagai draf atau menerbitkan → sistem membuat _slug_ unik dan
metadata SEO. Alternatif: penyisipan gambar memanggil pustaka media (`«extend»` UC-53). Pengecualian:
_slug_ bentrok → sistem menambahkan pembeda numerik.

**UC-51 Mengelola Halaman Statis**
Aktor: A3 berizin, A4. Alur: aktor mengelola halaman berjenjang beserta _slug_, isi, templat,
urutan, status, dan metadata SEO. Aturan: halaman sistem (contoh `kebijakan-privasi`) ditandai
`is_sistem` sehingga tidak dapat dihapus, hanya disunting.

**UC-52 Mengelola Banner dan Pengumuman**
Aktor: A3 berizin, A4. Alur: aktor mengunggah gambar banner, menetapkan tautan tujuan, urutan, serta
jadwal tanggal mulai dan berakhir. Sistem menampilkan hanya banner yang aktif pada rentang tanggal
berjalan.

**UC-53 Mengelola Pustaka Media**
Aktor: A3, A4. Alur: aktor mengunggah, menelusuri, mengganti teks alternatif, dan menghapus berkas
media. Sistem membuat beberapa ukuran turunan gambar untuk efisiensi pemuatan. Pengecualian: media
masih dipakai pada konten terbit → penghapusan ditolak beserta daftar penggunaan.

**UC-54 Mengelola Tautan Terkait dan FAQ**
Aktor: A3 berizin, A4. Alur: aktor mengelola daftar tautan mitra (JDIHN, kementerian, perguruan
tinggi lain) beserta logo dan urutan, serta daftar tanya-jawab terkelompok.

**UC-55 Menanggapi Pesan Kontak**
Aktor: A3 berizin, A4. Alur: aktor membuka pesan berstatus "Baru" → menandai "Diproses" → membalas
melalui surel → menandai "Selesai" beserta catatan penanganan. Poskondisi: riwayat penanganan
tersimpan untuk pelaporan layanan.

### PKG-6 — Master Data, Administrasi, dan Integrasi

**UC-56 Mengelola Unit Kerja**
Aktor: A4. Alur: aktor mengelola unit kerja berjenjang beserta kode, nama, singkatan, jenis unit
(rektorat, biro, fakultas, jurusan, program studi, lembaga, UPT, satuan), unit induk, dan status
aktif. Pengecualian: unit masih dirujuk dokumen atau pengguna → penghapusan ditolak, ditawarkan
penonaktifan (BR-24). Aturan: kode unit tidak dapat diubah setelah dipakai (BR-25).

**UC-57 Mengelola Jenis Peraturan**
Aktor: A4. Alur: aktor mengelola jenis peraturan beserta kode, nama, bentuk singkat, lingkup
(internal/eksternal), tingkat hierarki norma, lingkup penomoran (institut/unit), pola penomoran,
status aktif, dan urutan tampil. Tingkat hierarki dipakai untuk pengurutan tampilan dan validasi
kewajaran relasi antarperaturan.

**UC-58 Mengelola Kategori, Bidang Hukum, dan Kata Kunci**
Aktor: A4; A3 terbatas pada penambahan kata kunci. Alur: aktor mengelola pohon kategori (berjenjang),
daftar bidang hukum standar JDIHN, dan daftar kata kunci. Fitur tambahan: penggabungan kata kunci
duplikat beserta pemindahan seluruh keterkaitan dokumen.

**UC-59 Mengelola Status Keberlakuan dan Jenis Relasi**
Aktor: A4. Alur: aktor mengelola daftar status keberlakuan beserta kode warna penanda, serta daftar
jenis relasi beserta pemetaan kode kebalikannya. Aturan: entri berpenanda `is_sistem` tidak dapat
dihapus karena dirujuk logika aplikasi.

**UC-60 Mengelola Akun Pengguna**
Aktor: A4. Alur: aktor membuat, menyunting, menonaktifkan, menetapkan ulang kata sandi, dan menghapus
akun; menetapkan peran, unit kerja utama, dan unit kerja tambahan yang dapat diakses. Pengecualian:
(a) upaya menonaktifkan atau menghapus akun Superadmin aktif terakhir → ditolak (BR-27);
(b) surel atau NIP/NIDN duplikat → ditolak. Poskondisi: seluruh perubahan tercatat pada jejak audit.

**UC-61 Memverifikasi Pendaftaran Akun**
Aktor: A4, A3 berizin. Alur: aktor membuka daftar akun berstatus "Menunggu Verifikasi" → memeriksa
kesesuaian NIP/NIDN dan unit kerja → menyetujui (akun menjadi "Aktif", peran Dosen/Staf diberikan)
atau menolak beserta alasan → notifikasi dikirim kepada pendaftar.

**UC-62 Mengelola Peran dan Hak Akses** — skenario penuh pada § B.7.8.

**UC-63 Mengelola Struktur Menu Navigasi**
Aktor: A4. Alur: aktor menyusun menu berjenjang melalui antarmuka seret-lepas; setiap butir menu
dapat menunjuk ke halaman statis, indeks jenis peraturan, kategori, berita, atau URL kustom. Aturan:
butir menu yang menunjuk entitas terhapus otomatis dinonaktifkan agar tidak menghasilkan tautan mati.

**UC-64 Mengelola Konfigurasi Sistem**
Aktor: A4. Alur: aktor mengelola konfigurasi terkelompok: identitas situs, logo dan favicon, kontak
dan alamat, media sosial, kebijakan unggahan (ukuran dan jenis berkas), kebijakan akses (tanda air,
pembatasan laju, tingkat akses baku), parameter surel, parameter integrasi JDIHN dan SSO, serta mode
pemeliharaan. Pengecualian: nilai tidak sesuai tipe yang ditetapkan → ditolak dengan penjelasan.

**UC-65 Melihat Log Aktivitas dan Log Keamanan**
Aktor: A4; A3 berizin terbatas pada cakupan unitnya. Alur: aktor menyaring log berdasarkan pelaku,
aksi, entitas, rentang waktu, dan alamat IP; membuka rincian perubahan nilai sebelum–sesudah; dan
mengekspor hasil penyaringan. Aturan: log tidak dapat disunting atau dihapus melalui antarmuka
(NFR-19).

**UC-66 Mengelola Pencadangan dan Pemulihan Data**
Aktor: A4, S3. Alur: penjadwal menjalankan pencadangan basis data dan berkas sesuai jadwal → sistem
mencatat status, ukuran, dan lokasi hasil pencadangan → aktor dapat memicu pencadangan manual,
mengunduh berkas cadangan, dan meninjau riwayat. Pengecualian: pencadangan gagal → notifikasi
otomatis ke Superadmin dan penanda peringatan pada dasbor.

**UC-67 Mengelola Sinkronisasi JDIHN** — skenario penuh pada § B.7.9.

**UC-68 Melihat Dasbor Statistik dan Laporan**
Aktor: A3 (cakupan unit), A4 (penuh). Alur: sistem menampilkan kartu ringkasan (total dokumen,
dokumen terbit, menunggu verifikasi, dokumen berstatus dicabut), grafik tren kunjungan dan unduhan,
peringkat dokumen terpopuler, peringkat kata kunci pencarian, dan sebaran dokumen per unit kerja →
aktor memilih periode dan mengekspor laporan.

**UC-69 Mengelola Layanan Hukum dan Permohonan** _(opsional, Fase 3)_
Aktor: A2 sebagai pemohon; A3/A4 sebagai pengelola. Alur: pemohon memilih jenis layanan (telaah
hukum, pendapat hukum, penyusunan rancangan peraturan, pendampingan kerja sama), mengisi formulir
dinamis, dan melampirkan berkas → sistem menerbitkan nomor tiket dan menghitung tenggat berdasarkan
SLA layanan → pengelola menugaskan penelaah, memperbarui status, dan mengunggah hasil telaah →
pemohon melacak status dan mengunduh hasil. Poskondisi: seluruh transisi tercatat; hasil telaah
dapat dipromosikan menjadi dokumen pada katalog bila berstatus produk hukum.

---

## B.7 Skenario Use Case Terperinci

### B.7.1 UC-03 — Melakukan Pencarian Lanjutan

| Atribut                  | Uraian                                                                                        |
| ------------------------ | --------------------------------------------------------------------------------------------- |
| **ID / Nama**            | UC-03 Melakukan Pencarian Lanjutan                                                            |
| **Aktor Utama**          | A1 Pengunjung Publik (diwarisi A2, A3, A3a, A4)                                               |
| **Aktor Sekunder**       | S5 Mesin Pencari                                                                              |
| **Tujuan**               | Menemukan dokumen secara presisi melalui kombinasi beberapa kriteria metadata                 |
| **Pemangku kepentingan** | Mahasiswa, dosen, auditor, dan masyarakat yang membutuhkan dokumen spesifik                   |
| **Prakondisi**           | Indeks pencarian tersedia; minimal satu dokumen berstatus terbit                              |
| **Pemicu**               | Aktor membuka halaman "Pencarian Lanjutan" atau menekan tautan dari kotak pencarian sederhana |
| **Prioritas**            | Wajib (FR-013, FR-014)                                                                        |
| **Frekuensi**            | Tinggi — diperkirakan 40% dari total sesi penelusuran                                         |

**Alur Utama**

| No  | Aktor                                                       | Sistem                                                                                                                                                                                                                                                                           |
| --- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Membuka halaman pencarian lanjutan                          | Menampilkan formulir berisi ruas: kata kunci bebas, judul, nomor, jenis peraturan (pilihan ganda), tahun (tunggal atau rentang), unit kerja (pohon berjenjang), kategori (pohon), bidang hukum, status keberlakuan (pilihan ganda), rentang tanggal penetapan, dan penandatangan |
| 2   | Mengisi sebagian atau seluruh kriteria, lalu menekan "Cari" | Memvalidasi masukan: tahun berupa bilangan 1945–(tahun berjalan+1); tanggal akhir tidak lebih awal dari tanggal awal; panjang kata kunci ≤ 200 karakter                                                                                                                          |
| 3   | —                                                           | Menyusun kueri: logika **OR** antarnilai pada aspek yang sama, logika **AND** antaraspek berbeda                                                                                                                                                                                 |
| 4   | —                                                           | Memanggil INC-03 untuk menerapkan penyaring hak akses: dokumen "rahasia" dikecualikan; dokumen "internal" disertakan tanpa tautan berkas bagi A1                                                                                                                                 |
| 5   | —                                                           | Mengirim kueri ke mesin pencari beserta permintaan agregasi aspek                                                                                                                                                                                                                |
| 6   | —                                                           | Menampilkan jumlah total hasil, daftar hasil dengan penyorotan potongan teks yang cocok, panel penyaring aspek beserta jumlah per nilai, dan cip penyaring aktif yang dapat dilepas satu per satu                                                                                |
| 7   | —                                                           | Menuliskan seluruh kriteria pada _query string_ URL agar hasil dapat ditandai dan dibagikan                                                                                                                                                                                      |
| 8   | Menyesuaikan pengurutan atau melepas cip penyaring          | Menjalankan ulang pencarian tanpa memuat ulang seluruh halaman                                                                                                                                                                                                                   |
| 9   | Memilih satu hasil                                          | Melanjutkan ke UC-08 Melihat Detail Metadata Dokumen                                                                                                                                                                                                                             |

**Alur Alternatif**

- **A1 — Hasil kosong**: sistem menampilkan pesan informatif, saran koreksi ejaan berbasis kedekatan
  kata, daftar penyaring yang paling membatasi hasil beserta tombol pelepasannya, dan 5 kata kunci
  pencarian terpopuler.
- **A2 — Hasil sangat banyak (> 1.000)**: sistem menyarankan penambahan penyaring dan menampilkan
  distribusi hasil per tahun sebagai bantuan penyempitan.
- **A3 — Aktor menyimpan pencarian**: bagi aktor terautentikasi, sistem menyediakan penyimpanan
  kriteria pencarian untuk dipanggil kembali.

**Alur Pengecualian**

- **E1 — Mesin pencari tidak tersedia**: sistem beralih ke kueri basis data dengan kemampuan
  terbatas (tanpa toleransi salah ketik dan tanpa penyorotan), menampilkan pemberitahuan penurunan
  layanan, dan mencatat galat pada pemantauan.
- **E2 — Masukan tidak valid**: sistem menandai ruas bermasalah beserta penjelasan, tanpa kehilangan
  masukan lain yang sudah diisi.
- **E3 — Pembatasan laju terlampaui** (> 30 pencarian/menit/IP): sistem mengembalikan HTTP 429 dan
  meminta aktor menunggu.

**Poskondisi** — Berhasil: daftar hasil tampil, kriteria tercatat pada `log_pencarian` (kata kunci,
penyaring dalam bentuk JSON, jumlah hasil). Gagal: tidak ada perubahan data; galat tercatat.

**Aturan bisnis terkait** — BR-09, BR-13, BR-14.

---

### B.7.2 UC-11 — Mengunduh Dokumen Publik (_Open Access_)

| Atribut            | Uraian                                                                               |
| ------------------ | ------------------------------------------------------------------------------------ |
| **ID / Nama**      | UC-11 Mengunduh Dokumen Publik                                                       |
| **Aktor Utama**    | A1 Pengunjung Publik (termasuk Mahasiswa)                                            |
| **Aktor Sekunder** | S6 Penyimpanan Objek                                                                 |
| **Tujuan**         | Memperoleh salinan digital dokumen hukum yang bersifat terbuka                       |
| **Prakondisi**     | Dokumen berstatus publikasi "Terbit", bertingkat akses "publik", dan memiliki berkas |
| **Pemicu**         | Aktor menekan tombol "Unduh" pada halaman detail dokumen atau daftar hasil pencarian |
| **Prioritas**      | Wajib (FR-011 pada MOD-01, FR-046, FR-099)                                           |
| **Frekuensi**      | Sangat tinggi                                                                        |

**Alur Utama**

| No  | Aktor                                         | Sistem                                                                                                                                                            |
| --- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Menekan tombol "Unduh" pada salah satu berkas | Mengidentifikasi `dokumen_berkas` yang diminta                                                                                                                    |
| 2   | —                                             | Memanggil INC-03: memeriksa `status_publikasi = 'terbit'`, `tingkat_akses = 'publik'`, `dokumen_berkas.is_publik = 1`, dan `dihapus_pada IS NULL`                 |
| 3   | —                                             | Memeriksa pembatasan laju unduhan untuk pengunjung anonim (baku 30 unduhan/jam/IP)                                                                                |
| 4   | —                                             | Memverifikasi keberadaan berkas pada penyimpanan dan mencocokkan _hash_ SHA-256 bila pemeriksaan integritas diaktifkan                                            |
| 5   | —                                             | Menerbitkan URL bertanda tangan berumur 15 menit, atau mengalirkan berkas melalui pengendali dengan _header_ `Content-Disposition: attachment`                    |
| 6   | —                                             | Mencatat baris pada tabel `unduhan`: id dokumen, id berkas, `pengguna_id = NULL`, peran `publik`, _hash_ alamat IP bergaram, ringkasan agen peramban, dan perujuk |
| 7   | —                                             | Menambah `dokumen.jumlah_diunduh` dan `dokumen_berkas.jumlah_diunduh` melalui pekerjaan latar belakang, serta memutakhirkan `dokumen_statistik_harian`            |
| 8   | Menerima berkas                               | Mengakhiri transaksi                                                                                                                                              |

**Alur Alternatif**

- **A1 — Dokumen bertingkat akses "internal"**: tombol unduh tidak ditampilkan; sistem menampilkan
  ajakan login beserta penjelasan singkat mengapa dokumen tidak terbuka.
- **A2 — Dokumen bertingkat akses "terbatas"**: sistem menawarkan pengajuan permintaan akses
  (`«extend»` UC-30) bagi aktor terautentikasi, dan ajakan login bagi aktor anonim.
- **A3 — Dokumen memiliki beberapa berkas**: sistem menampilkan daftar berkas beserta jenis, ukuran,
  dan jumlah halaman; aktor memilih berkas yang diunduh, atau mengunduh seluruhnya sebagai arsip ZIP.

**Alur Pengecualian**

- **E1 — Berkas tidak ditemukan pada penyimpanan**: sistem mengembalikan pesan galat yang ramah,
  mencatat galat tingkat kritis, dan mengirim notifikasi kepada Admin pengelola dokumen tersebut.
- **E2 — Pembatasan laju terlampaui**: HTTP 429 beserta _header_ `Retry-After` dan penjelasan.
- **E3 — URL bertanda tangan kedaluwarsa**: sistem mengalihkan aktor kembali ke halaman detail
  dokumen beserta pemberitahuan agar mengulang permintaan.
- **E4 — Status dokumen berubah menjadi "Ditarik" setelah halaman dimuat**: HTTP 410 beserta
  penjelasan dan saran dokumen pengganti berdasarkan relasi.

**Poskondisi** — Berhasil: berkas terkirim; satu baris `unduhan` tercatat; penghitung bertambah.
Gagal: berkas tidak terkirim; tidak ada baris `unduhan`; galat tercatat.

**Aturan bisnis terkait** — BR-09, BR-10, BR-30.

---

### B.7.3 UC-33 — Membuat Draf Dokumen dan Menginput Metadata

| Atribut         | Uraian                                                                                                                     |
| --------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **ID / Nama**   | UC-33 Membuat Draf Dokumen dan Menginput Metadata                                                                          |
| **Aktor Utama** | A3 Admin (cakupan unit kerja), A4 Superadmin                                                                               |
| **Tujuan**      | Mencatat produk hukum baru ke dalam katalog beserta metadata standar JDIHN                                                 |
| **Prakondisi**  | Aktor terautentikasi, memegang izin `dokumen.buat`; data master jenis peraturan, unit kerja, kategori, dan status tersedia |
| **Pemicu**      | Aktor menekan "Tambah Dokumen" pada panel administrasi                                                                     |
| **Prioritas**   | Wajib (FR-025 sampai FR-031)                                                                                               |
| **Frekuensi**   | Sedang — diperkirakan 10–50 dokumen/bulan                                                                                  |

**Alur Utama**

| No  | Aktor                                                                                                                                               | Sistem                                                                                                                                                                                              |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Menekan "Tambah Dokumen"                                                                                                                            | Menampilkan formulir bertahap (_wizard_) empat langkah: (1) Identitas, (2) Klasifikasi, (3) Substansi, (4) Berkas dan Akses                                                                         |
| 2   | **Langkah 1** — memilih jenis peraturan, mengisi nomor, tahun, judul, tanggal penetapan, tempat penetapan, penandatangan, dan jabatan penandatangan | Membatasi pilihan unit kerja pada cakupan aktor; mengisi `tempat_penetapan` baku "Parepare"; mengisi `tahun` otomatis dari tanggal penetapan                                                        |
| 3   | —                                                                                                                                                   | Menormalisasi nomor (menghapus spasi berlebih, menyeragamkan huruf kapital) ke `nomor_normal`; memeriksa duplikasi kombinasi jenis + `nomor_normal` + tahun + unit kerja secara langsung (_inline_) |
| 4   | **Langkah 2** — memilih kategori (satu atau lebih), bidang hukum, kata kunci, status keberlakuan, dan lingkup (internal/eksternal)                  | Menyediakan pencarian inkremental pada pohon kategori; mengizinkan pembuatan kata kunci baru bila aktor berizin                                                                                     |
| 5   | **Langkah 3** — mengisi abstrak, catatan, sumber, deskripsi fisik, nomor panggil, dan lokasi arsip                                                  | Menyusun `teu` secara otomatis dari komponen metadata; menampilkan hasilnya untuk dikonfirmasi atau disunting                                                                                       |
| 6   | **Langkah 4** — mengunggah berkas (melanjutkan ke UC-34) dan menetapkan tingkat akses                                                               | Menetapkan tingkat akses baku dari konfigurasi sistem                                                                                                                                               |
| 7   | Menekan "Simpan Draf"                                                                                                                               | Memanggil INC-01 untuk validasi tingkat draf (ruas minimum: jenis, nomor, tahun, judul, unit kerja)                                                                                                 |
| 8   | —                                                                                                                                                   | Membuat `kode_dokumen` unik berpola `JDIH-ITH-<tahun>-<urut 6 digit>` dan `slug` unik dari jenis, nomor, tahun, dan judul                                                                           |
| 9   | —                                                                                                                                                   | Menyimpan dokumen dengan `status_publikasi = 'draf'`, mengisi `dibuat_oleh`, memanggil INC-04 (jejak audit) dan INC-06 (indeks internal saja, bukan indeks publik)                                  |
| 10  | —                                                                                                                                                   | Menampilkan konfirmasi beserta tiga pilihan: "Ajukan Verifikasi" (UC-39), "Tambah Berkas" (UC-34), atau "Tambah Dokumen Lain"                                                                       |

**Alur Alternatif**

- **A1 — Duplikasi terdeteksi**: sistem menampilkan peringatan beserta tautan ke dokumen yang sudah
  ada, dan menawarkan tiga pilihan: membuka dokumen tersebut, melanjutkan sebagai dokumen berbeda
  (bila nomor memang sah berbeda unit), atau membatalkan.
- **A2 — Penyimpanan otomatis**: sistem menyimpan draf secara otomatis setiap 60 detik untuk
  mencegah kehilangan masukan.
- **A3 — Dokumen eksternal**: bila `lingkup = 'eksternal'`, ruas `penerbit` menjadi wajib diisi
  manual (contoh "Kementerian Pendidikan Tinggi, Sains, dan Teknologi"), sementara ruas
  `penandatangan` menjadi opsional.
- **A4 — Penyalinan dari dokumen serupa**: aktor memilih "Duplikat" pada dokumen yang ada; sistem
  memuat seluruh metadata kecuali nomor, tanggal, dan berkas.

**Alur Pengecualian**

- **E1 — Validasi gagal**: sistem menandai seluruh ruas bermasalah sekaligus beserta penjelasan,
  mempertahankan masukan lain, dan menggulir ke ruas pertama yang bermasalah.
- **E2 — Aktor memilih unit kerja di luar cakupan**: permintaan ditolak dengan HTTP 403 dan dicatat
  pada log keamanan sebagai upaya akses tidak sah.
- **E3 — Tahun tidak wajar** (< 1945 atau > tahun berjalan + 1): ditolak dengan penjelasan.
- **E4 — Tabrakan pembuatan `kode_dokumen` bersamaan**: sistem mengulang pembuatan nomor urut dalam
  transaksi basis data sampai berhasil (maksimal 5 percobaan).

**Poskondisi** — Berhasil: satu baris `dokumen` berstatus "Draf"; baris `dokumen_kategori` dan
`dokumen_tag` tersimpan; jejak audit tercatat. Gagal: tidak ada data tersimpan (transaksi dibatalkan).

**Aturan bisnis terkait** — BR-01, BR-02, BR-03, BR-15.

---

### B.7.4 UC-34 — Mengunggah dan Mengelola Berkas Dokumen

| Atribut            | Uraian                                                                           |
| ------------------ | -------------------------------------------------------------------------------- |
| **ID / Nama**      | UC-34 Mengunggah dan Mengelola Berkas Dokumen                                    |
| **Aktor Utama**    | A3 Admin, A4 Superadmin                                                          |
| **Aktor Sekunder** | S6 Penyimpanan Objek                                                             |
| **Tujuan**         | Melampirkan naskah PDF dan berkas pendukung pada dokumen                         |
| **Prakondisi**     | Dokumen sudah ada; aktor memegang izin `dokumen.unggah_berkas` pada cakupan unit |
| **Pemicu**         | Aktor membuka tab "Berkas" pada dokumen dan menarik berkas ke area unggah        |
| **Prioritas**      | Wajib (FR-042 sampai FR-046, FR-053)                                             |

**Alur Utama**

| No  | Aktor                                                                                                                                | Sistem                                                                                                                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Menarik satu atau beberapa berkas ke area unggah                                                                                     | Menampilkan daftar berkas beserta indikator kemajuan per berkas                                                                                                                                            |
| 2   | —                                                                                                                                    | Memvalidasi tiap berkas (INC-02): jenis MIME nyata dibaca dari isi berkas (bukan ekstensi), ekstensi berada pada daftar putih, ukuran ≤ batas konfigurasi, nama berkas dibersihkan dari karakter berbahaya |
| 3   | —                                                                                                                                    | Memindai berkas dengan antivirus bila diaktifkan                                                                                                                                                           |
| 4   | —                                                                                                                                    | Menghitung _hash_ SHA-256; bila _hash_ identik sudah terlampir pada dokumen yang sama, unggahan ditolak sebagai duplikat; bila terdapat pada dokumen lain, sistem menampilkan pemberitahuan informatif     |
| 5   | —                                                                                                                                    | Membuat nama simpan acak (UUID + ekstensi) dan menulis berkas ke jalur `dokumen/<tahun>/<id_dokumen>/<uuid>.pdf` pada penyimpanan terkonfigurasi                                                           |
| 6   | Menetapkan jenis berkas (dokumen utama, lampiran, abstrak, naskah akademik, terjemahan), keterangan, urutan, dan penanda `is_publik` | Menyimpan baris `dokumen_berkas` beserta metadata teknis: MIME, ukuran, _hash_, dan jumlah halaman                                                                                                         |
| 7   | —                                                                                                                                    | Menjadwalkan pekerjaan latar belakang: ekstraksi teks PDF; bila teks kosong (PDF hasil pindaian), menjalankan OCR                                                                                          |
| 8   | —                                                                                                                                    | Menyimpan hasil ekstraksi ke `dokumen.isi_teks` dan memutakhirkan indeks pencarian (INC-06)                                                                                                                |
| 9   | —                                                                                                                                    | Menyusun `deskripsi_fisik` otomatis dari jumlah halaman bila ruas tersebut masih kosong                                                                                                                    |
| 10  | —                                                                                                                                    | Memanggil INC-04 (jejak audit) dan menampilkan daftar berkas terbaru                                                                                                                                       |

**Alur Alternatif**

- **A1 — Penggantian berkas**: aktor memilih "Ganti"; sistem menyimpan berkas lama sebagai versi
  terarsip (tidak dihapus) agar tautan lama tetap dapat dipertanggungjawabkan, lalu menandai berkas
  baru sebagai versi aktif.
- **A2 — Pengurutan ulang**: aktor menyusun ulang urutan berkas melalui seret-lepas; sistem
  memperbarui kolom `urutan`.
- **A3 — Berkas nonpublik**: aktor menonaktifkan `is_publik` pada berkas tertentu (contoh lampiran
  berisi data pribadi), sementara dokumen tetap bertingkat akses publik.

**Alur Pengecualian**

- **E1 — Jenis berkas tidak diizinkan**: unggahan ditolak beserta daftar jenis yang diizinkan.
- **E2 — Ukuran melebihi batas**: ditolak beserta informasi ukuran berkas dan batas yang berlaku.
- **E3 — Antivirus mendeteksi ancaman**: berkas dikarantina, unggahan ditolak, notifikasi dikirim ke
  Superadmin, dan peristiwa dicatat pada log keamanan.
- **E4 — Penyimpanan tidak tersedia**: unggahan dibatalkan, baris basis data tidak dibuat (transaksi
  dibatalkan), dan aktor diminta mencoba kembali.
- **E5 — OCR gagal atau melewati batas waktu**: berkas tetap tersimpan dan dapat diunduh; sistem
  menandai `status_pemindaian = 'gagal'` dan menampilkannya pada antrean pekerjaan agar dapat diulang
  manual.

**Poskondisi** — Berhasil: berkas tersimpan pada penyimpanan; satu baris `dokumen_berkas` tercatat;
`isi_teks` terisi; indeks dimutakhirkan. Gagal: tidak ada berkas tersisa pada penyimpanan (dibersihkan
otomatis) dan tidak ada baris basis data.

**Aturan bisnis terkait** — BR-04, BR-15.

---

### B.7.5 UC-40 — Memverifikasi dan Menyetujui Dokumen

| Atribut            | Uraian                                                                           |
| ------------------ | -------------------------------------------------------------------------------- |
| **ID / Nama**      | UC-40 Memverifikasi dan Menyetujui Dokumen                                       |
| **Aktor Utama**    | A3a Admin Verifikator, A4 Superadmin                                             |
| **Aktor Sekunder** | S2 Layanan Surel                                                                 |
| **Tujuan**         | Menjamin ketepatan metadata dan kesesuaian berkas sebelum dokumen tampil publik  |
| **Prakondisi**     | Dokumen berstatus publikasi "Diajukan"; aktor memegang izin `dokumen.verifikasi` |
| **Pemicu**         | Aktor membuka antrean verifikasi (UC-49) dan memilih satu dokumen                |
| **Prioritas**      | Wajib (FR-065, FR-066)                                                           |

**Alur Utama**

| No  | Aktor                                         | Sistem                                                                                                                                                                                                                                     |
| --- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Membuka dokumen dari antrean verifikasi       | Menampilkan tampilan pemeriksaan: metadata lengkap, pratinjau berkas utama berdampingan, daftar kategori dan kata kunci, daftar relasi, tingkat akses, dan catatan pengaju                                                                 |
| 2   | —                                             | Menampilkan senarai periksa otomatis: kelengkapan ruas wajib, keberadaan berkas utama, kewajaran tanggal, kecocokan nomor pada naskah dengan nomor pada metadata (perbandingan dengan hasil ekstraksi teks), dan deteksi potensi duplikasi |
| 3   | —                                             | Memverifikasi pemisahan tugas: bila `dibuat_oleh` sama dengan aktor dan konfigurasi `alur.izinkan_setujui_sendiri` tidak aktif, tombol "Setujui" dinonaktifkan beserta penjelasan                                                          |
| 4   | Memeriksa kesesuaian metadata terhadap naskah | —                                                                                                                                                                                                                                          |
| 5   | Menekan "Setujui"                             | Mengubah `status_publikasi` menjadi "Disetujui", mengisi `diperiksa_oleh` dan waktu pemeriksaan                                                                                                                                            |
| 6   | —                                             | Mencatat transisi pada `dokumen_alur` (status asal, status tujuan, aksi, catatan, pelaku, waktu) dan memanggil INC-04                                                                                                                      |
| 7   | —                                             | Memanggil INC-05: notifikasi dalam aplikasi dan surel kepada pengaju                                                                                                                                                                       |
| 8   | —                                             | Menampilkan pilihan lanjutan: "Publikasikan Sekarang" (UC-41), "Jadwalkan Publikasi", atau "Kembali ke Antrean"                                                                                                                            |

**Alur Alternatif**

- **A1 — Mengembalikan untuk revisi**: aktor menekan "Minta Revisi", menandai ruas bermasalah, dan
  mengisi catatan revisi (wajib) → status berubah menjadi "Revisi" → notifikasi beserta catatan
  dikirim ke pengaju → transisi tercatat.
- **A2 — Menyunting langsung**: aktor berizin `dokumen.ubah` dapat memperbaiki kesalahan kecil
  (contoh salah ketik judul) tanpa mengembalikan dokumen; suntingan tercatat pada riwayat sebagai
  koreksi verifikator.
- **A3 — Verifikasi massal**: aktor memilih beberapa dokumen dan menyetujui sekaligus; sistem tetap
  menjalankan senarai periksa per dokumen dan melaporkan dokumen yang gagal lolos.

**Alur Pengecualian**

- **E1 — Status dokumen berubah oleh aktor lain saat pemeriksaan berlangsung**: sistem mendeteksi
  konflik melalui kolom versi (_optimistic locking_), menolak aksi, dan memuat ulang keadaan terbaru.
- **E2 — Senarai periksa gagal pada butir wajib**: tombol "Setujui" dinonaktifkan sampai butir
  terpenuhi atau aktor mencatat pengabaian beserta alasan (khusus A4).
- **E3 — Aktor tidak berwenang atas unit kerja dokumen**: HTTP 403 dan pencatatan pada log keamanan.

**Poskondisi** — Berhasil: dokumen berstatus "Disetujui"; transisi dan jejak audit tercatat;
notifikasi terkirim. Gagal: status tidak berubah.

**Aturan bisnis terkait** — BR-06, BR-07, BR-08.

---

### B.7.6 UC-41 — Mempublikasikan Dokumen

| Atribut            | Uraian                                                                       |
| ------------------ | ---------------------------------------------------------------------------- |
| **ID / Nama**      | UC-41 Mempublikasikan Dokumen                                                |
| **Aktor Utama**    | A3a Admin Verifikator, A4 Superadmin                                         |
| **Aktor Sekunder** | S5 Mesin Pencari, S1 Sistem JDIHN, S2 Layanan Surel                          |
| **Tujuan**         | Menjadikan dokumen dapat diakses sesuai tingkat aksesnya                     |
| **Prakondisi**     | Dokumen berstatus "Disetujui"; aktor memegang izin `dokumen.terbitkan`       |
| **Pemicu**         | Aktor menekan "Publikasikan", atau penjadwal menjalankan publikasi terjadwal |
| **Prioritas**      | Wajib (FR-063, FR-067)                                                       |

**Alur Utama**

| No  | Aktor                  | Sistem                                                                                                                                              |
| --- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Menekan "Publikasikan" | Menjalankan INC-01 pada tingkat penerbitan: seluruh metadata wajib terisi (BR-05) dan minimal satu berkas berjenis `dokumen_utama` tersedia (BR-04) |
| 2   | —                      | Menampilkan ringkasan pratayang: judul, nomor lengkap, tingkat akses, dan pernyataan konsekuensi ("dokumen akan dapat diakses oleh …")              |
| 3   | Mengonfirmasi          | Mengubah `status_publikasi` menjadi "Terbit", mengisi `diterbitkan_pada` dan `diterbitkan_oleh`                                                     |
| 4   | —                      | Memutakhirkan indeks pencarian publik (INC-06)                                                                                                      |
| 5   | —                      | Membersihkan _cache_ halaman beranda, halaman indeks jenis peraturan, dan halaman statistik yang terpengaruh                                        |
| 6   | —                      | Menambahkan URL dokumen ke `sitemap.xml`                                                                                                            |
| 7   | —                      | Bila `tingkat_akses = 'publik'`, memasukkan dokumen ke antrean sinkronisasi JDIHN (`«extend»` UC-67)                                                |
| 8   | —                      | Mencatat transisi pada `dokumen_alur` dan memanggil INC-04                                                                                          |
| 9   | —                      | Memanggil INC-05: notifikasi kepada pengaju; bila dikonfigurasi, ringkasan peraturan baru dikirim ke daftar penerima Dosen/Staf                     |
| 10  | —                      | Menampilkan konfirmasi beserta tautan publik dokumen                                                                                                |

**Alur Alternatif**

- **A1 — Publikasi terjadwal**: aktor menetapkan tanggal dan waktu terbit → status tetap "Disetujui"
  dengan kolom jadwal terisi → penjadwal (S3) menjalankan langkah 3–9 pada waktu yang ditetapkan.
- **A2 — Publikasi ulang dokumen yang sebelumnya ditarik**: sistem menjalankan alur yang sama dan
  mencatat transisi "Ditarik → Terbit" beserta alasan.

**Alur Pengecualian**

- **E1 — Validasi penerbitan gagal**: penerbitan dibatalkan; sistem menampilkan daftar rinci
  persyaratan yang belum terpenuhi beserta tautan langsung ke ruas atau tab yang perlu diperbaiki.
- **E2 — Pemutakhiran indeks gagal**: dokumen tetap terbit di basis data; kegagalan pengindeksan
  masuk antrean percobaan ulang dan ditampilkan sebagai peringatan pada dasbor Superadmin. Status
  penerbitan **tidak** dibatalkan agar ketersediaan dokumen tidak bergantung pada layanan pencarian.
- **E3 — Antrean sinkronisasi JDIHN gagal**: dicatat pada `log_sinkronisasi_jdihn` dan dicoba ulang
  secara berkala; tidak memengaruhi status penerbitan.

**Poskondisi** — Berhasil: dokumen tampil pada kanal sesuai tingkat aksesnya; indeks, `sitemap.xml`,
dan antrean sinkronisasi dimutakhirkan; transisi dan jejak audit tercatat. Gagal: status tetap
"Disetujui".

**Aturan bisnis terkait** — BR-04, BR-05, BR-06, BR-09, BR-32.

---

### B.7.7 UC-45 — Melakukan Impor Massal Metadata

| Atribut         | Uraian                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------ |
| **ID / Nama**   | UC-45 Melakukan Impor Massal Metadata                                                            |
| **Aktor Utama** | A3 Admin berizin `dokumen.impor`, A4 Superadmin                                                  |
| **Tujuan**      | Memindahkan katalog dokumen yang sudah ada (lembar kerja, daftar arsip) ke sistem secara efisien |
| **Prakondisi**  | Aktor mengunduh templat resmi; data master yang dirujuk sudah tersedia                           |
| **Pemicu**      | Aktor membuka menu "Impor Dokumen"                                                               |
| **Prioritas**   | Penting (FR-039)                                                                                 |
| **Frekuensi**   | Rendah, namun kritis pada fase migrasi data awal                                                 |

**Alur Utama**

| No  | Aktor                                                                                         | Sistem                                                                                                                                                                                                                                                |
| --- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Mengunduh templat CSV/XLSX                                                                    | Menyediakan templat berisi kolom wajib dan opsional, lembar petunjuk pengisian, serta lembar daftar nilai sah untuk kolom berelasi (kode jenis peraturan, kode unit kerja, kode status)                                                               |
| 2   | Mengunggah berkas terisi                                                                      | Memvalidasi format, pengodean karakter (UTF-8), dan kesesuaian nama kolom terhadap templat                                                                                                                                                            |
| 3   | —                                                                                             | Menjalankan **pravalidasi seluruh baris tanpa menyimpan** (_dry-run_): kelengkapan ruas wajib, keberadaan kode berelasi, format tanggal, kewajaran tahun, dan deteksi duplikasi terhadap data yang sudah ada maupun antarbaris dalam berkas yang sama |
| 4   | —                                                                                             | Menampilkan laporan pravalidasi: jumlah baris sah, jumlah baris bermasalah, dan tabel rincian galat per baris per kolom beserta saran perbaikan                                                                                                       |
| 5   | Meninjau laporan dan memilih mode: "Impor baris sah saja" atau "Batalkan dan perbaiki berkas" | —                                                                                                                                                                                                                                                     |
| 6   | Mengonfirmasi impor                                                                           | Menjalankan impor melalui antrean latar belakang secara berkelompok (_batch_ 100 baris per transaksi)                                                                                                                                                 |
| 7   | —                                                                                             | Untuk setiap baris: membuat `kode_dokumen` dan `slug`, menyimpan dokumen berstatus "Draf", mengaitkan kategori dan kata kunci (membuat kata kunci baru bila belum ada), serta mencatat jejak audit                                                    |
| 8   | —                                                                                             | Memutakhirkan kemajuan impor secara langsung pada antarmuka                                                                                                                                                                                           |
| 9   | —                                                                                             | Menyimpan hasil pada `impor_batch` (total baris, jumlah berhasil, jumlah gagal, laporan JSON) dan mengirim notifikasi setelah selesai                                                                                                                 |
| 10  | Mengunduh berkas laporan hasil impor                                                          | Menyediakan berkas berisi baris gagal beserta alasannya, dalam format yang dapat diperbaiki dan diunggah ulang                                                                                                                                        |

**Alur Alternatif**

- **A1 — Impor berkas PDF pendamping**: aktor mengunggah arsip ZIP berisi berkas PDF yang dinamai
  sesuai kolom `nama_berkas` pada lembar kerja; sistem mencocokkan dan melampirkan berkas secara
  otomatis (memanggil INC-02 per berkas).
- **A2 — Mode pemutakhiran**: aktor memilih mode "perbarui data yang sudah ada" dengan kunci
  pencocokan `kode_dokumen` atau kombinasi jenis + nomor + tahun + unit; sistem menampilkan
  pembandingan nilai lama dan baru sebelum menerapkan perubahan.
- **A3 — Pembatalan impor**: selama impor berjalan, aktor dapat membatalkan; baris yang sudah
  tersimpan tetap ada dan dicatat pada laporan, karena setiap kelompok disimpan dalam transaksi
  terpisah.

**Alur Pengecualian**

- **E1 — Berkas melebihi batas baris** (baku 5.000 baris): sistem menolak dan meminta pemecahan berkas.
- **E2 — Kolom wajib tidak ada pada berkas**: impor ditolak sebelum pravalidasi baris.
- **E3 — Seluruh baris bermasalah**: sistem tidak menyimpan apa pun dan menampilkan laporan lengkap.
- **E4 — Proses latar belakang gagal di tengah jalan**: `impor_batch` ditandai "gagal" beserta posisi
  baris terakhir yang berhasil; aktor dapat melanjutkan dari posisi tersebut.

**Poskondisi** — Berhasil: sejumlah dokumen berstatus "Draf" tersimpan; laporan impor tersedia.
Gagal: tidak ada dokumen tersimpan, atau tersimpan sebagian sesuai laporan (setiap kelompok bersifat
atomik).

**Aturan bisnis terkait** — BR-01, BR-02, BR-03, BR-15.

---

### B.7.8 UC-62 — Mengelola Peran dan Hak Akses

| Atribut         | Uraian                                                     |
| --------------- | ---------------------------------------------------------- |
| **ID / Nama**   | UC-62 Mengelola Peran dan Hak Akses                        |
| **Aktor Utama** | A4 Superadmin                                              |
| **Tujuan**      | Menyesuaikan kewenangan peran tanpa perubahan kode program |
| **Prakondisi**  | Aktor terautentikasi sebagai Superadmin dengan 2FA aktif   |
| **Pemicu**      | Aktor membuka menu "Peran & Hak Akses"                     |
| **Prioritas**   | Wajib (FR-109)                                             |

**Alur Utama**

| No  | Aktor                | Sistem                                                                                                                                                                      |
| --- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Membuka daftar peran | Menampilkan peran beserta jumlah izin dan jumlah akun pengguna yang memegangnya                                                                                             |
| 2   | Memilih satu peran   | Menampilkan matriks izin terkelompok per modul, dengan kotak centang per izin dan tombol "pilih seluruh modul"                                                              |
| 3   | Menyesuaikan izin    | Menampilkan peringatan langsung pada izin berdampak tinggi (contoh `dokumen.hapus_permanen`, `pengguna.kelola`, `peran.kelola`, `sistem.konfigurasi`)                       |
| 4   | Menyimpan            | Memvalidasi bahwa peran `superadmin` tetap memegang seluruh izin dan peran `pengunjung` hanya memegang izin baca publik                                                     |
| 5   | —                    | Menyimpan perubahan pada `peran_izin`, membersihkan _cache_ izin seluruh pengguna pemegang peran tersebut, dan memanggil INC-04 dengan pencatatan nilai sebelum dan sesudah |
| 6   | —                    | Menampilkan konfirmasi beserta jumlah akun yang terdampak                                                                                                                   |

**Alur Alternatif**

- **A1 — Membuat peran baru**: aktor membuat peran turunan dengan menyalin izin peran yang ada
  sebagai titik awal (contoh peran "Admin Fakultas" sebagai turunan Admin tanpa izin publikasi).
- **A2 — Menetapkan izin langsung ke akun**: untuk kebutuhan sementara, aktor memberikan atau
  mencabut izin spesifik pada satu akun melalui `pengguna_izin` tanpa mengubah perannya, dengan
  masa berlaku opsional.
- **A3 — Mensimulasikan hak akses**: aktor memakai fitur "Uji Hak Akses" untuk memeriksa apakah
  suatu akun berhak atas suatu aksi pada suatu dokumen, beserta penjelasan keputusannya.

**Alur Pengecualian**

- **E1 — Mencabut izin kritis dari peran `superadmin`**: ditolak dengan penjelasan (BR-27).
- **E2 — Menghapus peran yang masih dipegang akun**: ditolak beserta daftar akun pemegangnya dan
  tawaran pemindahan peran secara massal.
- **E3 — Menghapus peran sistem** (`superadmin`, `admin`, `dosen_staf`, `pengunjung`): ditolak karena
  berpenanda `is_sistem`.

**Poskondisi** — Berhasil: konfigurasi izin tersimpan dan berlaku pada permintaan berikutnya
(_cache_ izin dibersihkan); jejak audit tercatat lengkap dengan nilai sebelum dan sesudah.

**Aturan bisnis terkait** — BR-26, BR-27, BR-31.

---

### B.7.9 UC-67 — Mengelola Sinkronisasi JDIHN

| Atribut            | Uraian                                                                                                   |
| ------------------ | -------------------------------------------------------------------------------------------------------- |
| **ID / Nama**      | UC-67 Mengelola Sinkronisasi JDIHN                                                                       |
| **Aktor Utama**    | A4 Superadmin                                                                                            |
| **Aktor Sekunder** | S1 Sistem JDIHN Nasional, S3 Penjadwal Tugas                                                             |
| **Tujuan**         | Meneruskan metadata dokumen publik ke jaringan dokumentasi hukum nasional                                |
| **Prakondisi**     | Parameter integrasi terkonfigurasi (URL, kredensial, pemetaan kode); ITH terdaftar sebagai anggota JDIHN |
| **Pemicu**         | Penerbitan dokumen publik (otomatis), jadwal berkala, atau pemicuan manual                               |
| **Prioritas**      | Penting (FR-118)                                                                                         |

**Alur Utama**

| No  | Aktor                                                  | Sistem                                                                                                                                                   |
| --- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | —                                                      | Saat dokumen publik diterbitkan (UC-41 langkah 7), sistem memasukkan dokumen ke antrean sinkronisasi dengan `sinkron_jdihn = 'tertunda'`                 |
| 2   | —                                                      | Pekerja antrean mengambil dokumen, memetakan metadata internal ke skema JDIHN melalui lapisan adaptor, dan memvalidasi kelengkapan elemen wajib jaringan |
| 3   | —                                                      | Mengirim muatan ke titik akhir JDIHN beserta autentikasi yang ditetapkan                                                                                 |
| 4   | —                                                      | Mencatat permintaan dan respons pada `log_sinkronisasi_jdihn` (arah, muatan, kode respons, pesan, percobaan ke-)                                         |
| 5   | —                                                      | Bila berhasil: mengisi `jdihn_id`, `disinkron_pada`, dan `sinkron_jdihn = 'terkirim'`                                                                    |
| 6   | Membuka halaman "Sinkronisasi JDIHN"                   | Menampilkan rekapitulasi: jumlah terkirim, tertunda, gagal, dan belum pernah disinkronkan; daftar dokumen per status; serta riwayat log                  |
| 7   | Memicu ulang dokumen gagal, secara tunggal atau massal | Memasukkan kembali dokumen ke antrean                                                                                                                    |

**Alur Alternatif**

- **A1 — Sinkronisasi awal massal**: aktor memicu sinkronisasi seluruh dokumen publik yang belum
  pernah dikirim, dengan pembatasan laju agar tidak membebani layanan tujuan.
- **A2 — Pemutakhiran metadata dokumen yang sudah tersinkron**: sistem mengirim operasi pemutakhiran
  memakai `jdihn_id` yang tersimpan, bukan membuat entri baru.
- **A3 — Dokumen ditarik atau tingkat aksesnya berubah menjadi nonpublik**: sistem mengirim permintaan
  penghapusan atau penonaktifan entri pada JDIHN, sesuai kemampuan antarmuka tujuan.

**Alur Pengecualian**

- **E1 — Titik akhir tidak dapat dijangkau**: percobaan ulang dengan jeda meningkat secara
  eksponensial (1, 5, 15, 60 menit) maksimal 5 kali; setelah itu ditandai "gagal" dan dilaporkan.
- **E2 — Autentikasi ditolak**: sinkronisasi dihentikan seluruhnya, notifikasi darurat dikirim ke
  Superadmin, agar tidak terjadi kegagalan berulang tanpa pengawasan.
- **E3 — Metadata ditolak karena tidak memenuhi standar**: dokumen ditandai "gagal" beserta pesan
  penolakan; sistem menampilkan tautan langsung ke penyuntingan ruas yang bermasalah.
- **E4 — Spesifikasi antarmuka JDIHN berubah**: hanya lapisan adaptor yang perlu disesuaikan; inti
  sistem tidak berubah (BT-02).

**Poskondisi** — Berhasil: `jdihn_id` dan `disinkron_pada` terisi; log tercatat. Gagal: status
"gagal" beserta pesan; dokumen tetap tersedia pada portal ITH.

**Aturan bisnis terkait** — BR-32.

---

**Lanjut ke** → [C. Entity Relationship Diagram](03-erd.md)
