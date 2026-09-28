# D. STRUKTUR TABEL BASIS DATA

Portal JDIH ITH Parepare

---

## D.0 Ketentuan Umum

| Aspek                         | Ketetapan                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sistem manajemen basis data   | **MySQL 8.0** (atau MariaDB 10.6+). Padanan PostgreSQL 15+ dijelaskan pada § D.7                                                                                                                                                                                                                                                          |
| _Storage engine_              | InnoDB (wajib, untuk dukungan _foreign key_ dan transaksi)                                                                                                                                                                                                                                                                                |
| _Character set_ / _collation_ | `utf8mb4` / `utf8mb4_unicode_ci` — mendukung seluruh karakter termasuk emoji pada isi berita                                                                                                                                                                                                                                              |
| Tipe kunci utama              | `BIGINT UNSIGNED AUTO_INCREMENT` pada seluruh tabel entitas                                                                                                                                                                                                                                                                               |
| Zona waktu penyimpanan        | Seluruh kolom `DATETIME` disimpan dalam **UTC**; konversi ke WITA (UTC+8) dilakukan di lapisan aplikasi                                                                                                                                                                                                                                   |
| Kolom audit baku              | `dibuat_pada DATETIME NOT NULL`, `diperbarui_pada DATETIME NULL`, `dihapus_pada DATETIME NULL` (hanya pada tabel ber-_soft delete_)                                                                                                                                                                                                       |
| Konvensi nama _constraint_    | `uq_<tabel>_<ringkasan>`, `fk_<tabel>_<kolom>`, `ck_<tabel>_<aturan>`, `idx_<tabel>_<kolom>`, `trg_<tabel>_<aturan>_<pemicu>`. **Kunci utama tidak diberi nama** karena MySQL dan MariaDB selalu menamainya `PRIMARY` dan mengabaikan nama yang diberikan (peringatan 1280); notasi `pk_<tabel>` pada dokumen ini hanya rujukan penulisan |
| Aksi referensial baku         | `ON UPDATE CASCADE` untuk seluruh _foreign key_; `ON DELETE` mengikuti tabel relasi pada Bagian C § C.7                                                                                                                                                                                                                                   |
| Berkas DDL lengkap            | [../database/jdih_ith_schema.sql](../database/jdih_ith_schema.sql)                                                                                                                                                                                                                                                                        |
| Berkas data awal              | [../database/jdih_ith_seed.sql](../database/jdih_ith_seed.sql)                                                                                                                                                                                                                                                                            |

**Legenda kolom pada tabel spesifikasi**
`PK` kunci utama · `FK` kunci tamu · `UQ` unik · `IDX` terindeks · `NN` wajib diisi (_not null_) ·
`GEN` kolom terkomputasi (_generated column_)

---

## D.0.1 Batasan DBMS yang Memengaruhi Rancangan

Tiga batasan berikut ditemukan saat pengujian eksekusi DDL dan **mengubah cara beberapa aturan
ditegakkan**. Ketiganya berlaku pada MySQL 8.0 maupun MariaDB, sehingga bukan persoalan satu produk
saja.

| No  | Batasan                                                                                                                                                    | Aturan yang Terdampak                                                                                                         | Penanganan yang Diterapkan                                                                                                                                                                                                                                                                                                                             |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Kolom `AUTO_INCREMENT` tidak boleh dirujuk dalam `CHECK`** (MySQL: "AUTO_INCREMENT columns are not permitted in CHECK constraints"; MariaDB: galat 1901) | Pencegahan simpul induk menunjuk dirinya sendiri (`induk_id <> id`) pada `unit_kerja`, `kategori`, `halaman`, dan `menu_item` | _Trigger_ `BEFORE INSERT`/`BEFORE UPDATE` pada `unit_kerja` dan `kategori` (dua tabel yang menopang penegakan cakupan akses dan navigasi katalog); validasi lapisan aplikasi untuk `halaman` dan `menu_item`. Deteksi siklus lebih panjang (A→B→A) tetap di lapisan aplikasi, yang memang harus menelusuri rantai induk untuk memelihara kolom `jalur` |
| 2   | **Nama kunci utama selalu diabaikan** — MySQL dan MariaDB menamai setiap _primary key_ `PRIMARY` dan menerbitkan peringatan 1280 bila nama lain diberikan  | Konvensi penamaan `pk_<tabel>`                                                                                                | Kunci utama ditulis tanpa nama pada DDL; notasi `pk_<tabel>` pada dokumen ini hanya rujukan penulisan                                                                                                                                                                                                                                                  |
| 3   | **Tidak tersedia _partial unique index_**                                                                                                                  | Keunikan nomor peraturan tingkat institusi (BR-02) dan pembatasan satu permintaan akses aktif per pasangan dokumen–pengguna   | (a) BR-02 ditegakkan tambahan di lapisan aplikasi; (b) pembatasan permintaan akses diwujudkan melalui kolom terkomputasi `kunci_menunggu` yang bernilai `NULL` di luar status `menunggu` — karena `NULL` dianggap nilai berbeda pada indeks unik, hasilnya setara _partial unique index_ (lihat § D.2.11)                                              |

**Status validasi** — seluruh DDL pada [jdih_ith_schema.sql](../database/jdih_ith_schema.sql) dan
[jdih_ith_seed.sql](../database/jdih_ith_seed.sql) telah dieksekusi dan diuji perilakunya pada
MariaDB 10.4.32. Hasil: 50 tabel, 3 _view_, 85 _foreign key_, 38 _unique constraint_,
33 _check constraint_, dan 4 _trigger_ terbentuk tanpa galat. Ringkasan pengujian perilaku ada pada
§ D.8.

---

## D.1 Subsistem Master Data dan Referensi

### D.1.1 Tabel `unit_kerja`

Menyimpan struktur organisasi ITH secara berjenjang. Menjadi dasar pembatasan cakupan data Admin
dan penyaring penelusuran dokumen per unit kerja.

| Kolom             | Tipe Data         | Penanda | Nilai Baku     | Deskripsi                                                                                                                |
| ----------------- | ----------------- | ------- | -------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `id`              | BIGINT UNSIGNED   | PK, NN  | AUTO_INCREMENT | Pengenal internal                                                                                                        |
| `kode`            | VARCHAR(20)       | UQ, NN  | —              | Kode unit, contoh `FTI`, `BUK`, `BAG-HUKUM`. Tidak dapat diubah setelah dirujuk (BR-25)                                  |
| `nama`            | VARCHAR(150)      | NN, IDX | —              | Nama resmi unit kerja                                                                                                    |
| `singkatan`       | VARCHAR(30)       | —       | NULL           | Singkatan untuk tampilan ringkas                                                                                         |
| `jenis`           | ENUM              | NN, IDX | `'unit'`       | `institut`, `senat`, `rektorat`, `biro`, `fakultas`, `jurusan`, `prodi`, `lembaga`, `upt`, `satuan`, `unit`, `eksternal` |
| `induk_id`        | BIGINT UNSIGNED   | FK, IDX | NULL           | Unit induk; `NULL` pada unit tertinggi                                                                                   |
| `jalur`           | VARCHAR(255)      | NN, IDX | —              | _Materialized path_, contoh `1/4/12`. Mempercepat kueri "seluruh unit bawahan"                                           |
| `kedalaman`       | TINYINT UNSIGNED  | NN      | 0              | Tingkat kedalaman pada hierarki                                                                                          |
| `kepala_unit`     | VARCHAR(150)      | —       | NULL           | Nama pejabat pimpinan unit                                                                                               |
| `email_unit`      | VARCHAR(150)      | —       | NULL           | Surel resmi unit, untuk notifikasi                                                                                       |
| `is_aktif`        | BOOLEAN           | NN, IDX | 1              | Penonaktifan sebagai alternatif penghapusan (BR-24)                                                                      |
| `urutan`          | SMALLINT UNSIGNED | NN      | 0              | Urutan tampil                                                                                                            |
| `dibuat_pada`     | DATETIME          | NN      | —              | —                                                                                                                        |
| `diperbarui_pada` | DATETIME          | —       | NULL           | —                                                                                                                        |

**Constraint**

- `pk_unit_kerja` PRIMARY KEY (`id`)
- `uq_unit_kerja_kode` UNIQUE (`kode`)
- `fk_unit_kerja_induk` FOREIGN KEY (`induk_id`) → `unit_kerja(id)` ON DELETE RESTRICT ON UPDATE CASCADE
- `trg_unit_kerja_induk_bi` / `trg_unit_kerja_induk_bu` TRIGGER — menolak `induk_id` = `id`.
  Aturan ini **tidak dapat** diwujudkan sebagai `CHECK` karena MySQL 8.0 dan MariaDB sama-sama
  melarang kolom `AUTO_INCREMENT` dirujuk di dalam `CHECK` (lihat § D.0.1)
- `idx_unit_kerja_jalur` INDEX (`jalur`) — menopang kueri `WHERE jalur LIKE '1/4%'`
- `idx_unit_kerja_aktif_jenis` INDEX (`is_aktif`, `jenis`)

**Catatan** — Pola _materialized path_ dipilih daripada _nested set_ karena struktur organisasi jarang
berubah namun sering dibaca, dan pemeliharaan `jalur` jauh lebih sederhana. Kolom `jalur`
dimutakhirkan oleh _observer_ aplikasi setiap kali `induk_id` berubah, termasuk pada seluruh unit
bawahannya.

---

### D.1.2 Tabel `jenis_peraturan`

| Kolom                             | Tipe Data                    | Penanda | Nilai Baku     | Deskripsi                                                                                                               |
| --------------------------------- | ---------------------------- | ------- | -------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `id`                              | BIGINT UNSIGNED              | PK, NN  | AUTO_INCREMENT | —                                                                                                                       |
| `kode`                            | VARCHAR(30)                  | UQ, NN  | —              | Contoh `PERREK`, `KEPREK`, `SE-REK`, `PERSEN`                                                                           |
| `nama`                            | VARCHAR(120)                 | NN      | —              | Contoh `Peraturan Rektor`                                                                                               |
| `bentuk_singkat`                  | VARCHAR(40)                  | —       | NULL           | Contoh `PerRek`                                                                                                         |
| `lingkup`                         | ENUM(`internal`,`eksternal`) | NN, IDX | `'internal'`   | Produk hukum ITH atau peraturan eksternal yang dikatalog sebagai rujukan                                                |
| `tingkat_hierarki`                | TINYINT UNSIGNED             | NN      | 50             | Urutan hierarki norma; makin kecil makin tinggi (UU=1 … SOP=90). Dipakai untuk pengurutan dan validasi kewajaran relasi |
| `lingkup_penomoran`               | ENUM(`institut`,`unit`)      | NN      | `'institut'`   | Menentukan cakupan keunikan nomor (BR-02, BR-03)                                                                        |
| `pola_nomor`                      | VARCHAR(100)                 | —       | NULL           | Templat nomor untuk bantuan pengisian, contoh `{nomor}/PER/ITH/{tahun}`                                                 |
| `deskripsi`                       | VARCHAR(255)                 | —       | NULL           | —                                                                                                                       |
| `is_aktif`                        | BOOLEAN                      | NN, IDX | 1              | —                                                                                                                       |
| `urutan`                          | SMALLINT UNSIGNED            | NN      | 0              | —                                                                                                                       |
| `dibuat_pada` / `diperbarui_pada` | DATETIME                     | —       | —              | —                                                                                                                       |

**Constraint**

- `pk_jenis_peraturan` PRIMARY KEY (`id`) · `uq_jenis_peraturan_kode` UNIQUE (`kode`)
- `uq_jenis_peraturan_nama` UNIQUE (`nama`)
- `ck_jenis_peraturan_hierarki` CHECK (`tingkat_hierarki` BETWEEN 1 AND 99)
- `idx_jenis_peraturan_lingkup_aktif` INDEX (`lingkup`, `is_aktif`, `urutan`)

---

### D.1.3 Tabel `status_dokumen`

| Kolom                | Tipe Data         | Penanda | Deskripsi                                                                                        |
| -------------------- | ----------------- | ------- | ------------------------------------------------------------------------------------------------ |
| `id`                 | BIGINT UNSIGNED   | PK, NN  | —                                                                                                |
| `kode`               | VARCHAR(30)       | UQ, NN  | `berlaku`, `diubah`, `dicabut`, `dicabut_sebagian`, `belum_berlaku`, `tidak_berlaku`             |
| `nama`               | VARCHAR(60)       | NN      | Contoh `Berlaku`, `Dicabut`                                                                      |
| `warna`              | CHAR(7)           | NN      | Kode warna heksadesimal penanda, contoh `#16A34A`                                                |
| `deskripsi`          | VARCHAR(255)      | —       | Penjelasan makna status bagi pengguna                                                            |
| `is_berlaku_efektif` | BOOLEAN           | NN      | Penanda apakah status ini bermakna "masih berlaku"; dipakai penyaring cepat "hanya yang berlaku" |
| `is_sistem`          | BOOLEAN           | NN      | Entri sistem tidak dapat dihapus                                                                 |
| `urutan`             | SMALLINT UNSIGNED | NN      | —                                                                                                |

**Constraint** — `pk_status_dokumen` PRIMARY KEY (`id`) · `uq_status_dokumen_kode` UNIQUE (`kode`) ·
`ck_status_dokumen_warna` CHECK (`warna` REGEXP '^#[0-9A-Fa-f]{6}$')

---

### D.1.4 Tabel `bidang_hukum`

| Kolom       | Tipe Data         | Penanda | Deskripsi                                             |
| ----------- | ----------------- | ------- | ----------------------------------------------------- |
| `id`        | BIGINT UNSIGNED   | PK, NN  | —                                                     |
| `kode`      | VARCHAR(30)       | UQ, NN  | Kode klasifikasi standar JDIHN                        |
| `nama`      | VARCHAR(120)      | NN, UQ  | Contoh `Pendidikan`, `Kepegawaian`, `Keuangan Negara` |
| `deskripsi` | VARCHAR(255)      | —       | —                                                     |
| `is_aktif`  | BOOLEAN           | NN      | —                                                     |
| `urutan`    | SMALLINT UNSIGNED | NN      | —                                                     |

**Constraint** — `pk_bidang_hukum` PRIMARY KEY (`id`) · `uq_bidang_hukum_kode` UNIQUE (`kode`) ·
`uq_bidang_hukum_nama` UNIQUE (`nama`)

---

### D.1.5 Tabel `kategori`

Taksonomi klasifikasi internal ITH, berjenjang. Berbeda dari `bidang_hukum` yang merupakan
klasifikasi standar nasional — justifikasi pemisahan dijelaskan pada Bagian H § H.4.

| Kolom                             | Tipe Data         | Penanda | Nilai Baku     | Deskripsi                                                       |
| --------------------------------- | ----------------- | ------- | -------------- | --------------------------------------------------------------- |
| `id`                              | BIGINT UNSIGNED   | PK, NN  | AUTO_INCREMENT | —                                                               |
| `kode`                            | VARCHAR(30)       | UQ, NN  | —              | Contoh `AKADEMIK`, `AKADEMIK-KURIKULUM`                         |
| `nama`                            | VARCHAR(120)      | NN, IDX | —              | —                                                               |
| `slug`                            | VARCHAR(140)      | UQ, NN  | —              | Untuk URL penelusuran kategori                                  |
| `induk_id`                        | BIGINT UNSIGNED   | FK, IDX | NULL           | Kategori induk                                                  |
| `jalur`                           | VARCHAR(255)      | NN, IDX | —              | _Materialized path_                                             |
| `kedalaman`                       | TINYINT UNSIGNED  | NN      | 0              | —                                                               |
| `deskripsi`                       | VARCHAR(255)      | —       | NULL           | —                                                               |
| `ikon`                            | VARCHAR(60)       | —       | NULL           | Nama ikon untuk tampilan kartu kategori                         |
| `jumlah_dokumen`                  | INT UNSIGNED      | NN      | 0              | **Penghitung tembolok** (denormalisasi terkendali, lihat § H.7) |
| `is_aktif`                        | BOOLEAN           | NN, IDX | 1              | —                                                               |
| `urutan`                          | SMALLINT UNSIGNED | NN      | 0              | —                                                               |
| `dibuat_pada` / `diperbarui_pada` | DATETIME          | —       | —              | —                                                               |

**Constraint**

- `pk_kategori` PRIMARY KEY (`id`) · `uq_kategori_kode` UNIQUE (`kode`) · `uq_kategori_slug` UNIQUE (`slug`)
- `fk_kategori_induk` FOREIGN KEY (`induk_id`) → `kategori(id)` ON DELETE RESTRICT ON UPDATE CASCADE
- `trg_kategori_induk_bi` / `trg_kategori_induk_bu` TRIGGER — menolak `induk_id` = `id`
  (alasan sama seperti `unit_kerja`; lihat § D.0.1)
- `idx_kategori_jalur` INDEX (`jalur`)

---

### D.1.6 Tabel `tag`

| Kolom          | Tipe Data       | Penanda | Deskripsi                                           |
| -------------- | --------------- | ------- | --------------------------------------------------- |
| `id`           | BIGINT UNSIGNED | PK, NN  | —                                                   |
| `nama`         | VARCHAR(80)     | UQ, NN  | Kata kunci/subjek, contoh `beasiswa`, `tugas akhir` |
| `slug`         | VARCHAR(100)    | UQ, NN  | —                                                   |
| `jumlah_pakai` | INT UNSIGNED    | NN      | Penghitung tembolok untuk daftar kata kunci populer |
| `dibuat_oleh`  | BIGINT UNSIGNED | FK      | Pembuat kata kunci                                  |
| `dibuat_pada`  | DATETIME        | NN      | —                                                   |

**Constraint** — `pk_tag` PRIMARY KEY (`id`) · `uq_tag_nama` UNIQUE (`nama`) · `uq_tag_slug` UNIQUE (`slug`) ·
`fk_tag_dibuat_oleh` FOREIGN KEY (`dibuat_oleh`) → `pengguna(id)` ON DELETE SET NULL

---

### D.1.7 Tabel `jenis_relasi`

Memindahkan aturan relasi antarperaturan dari kode program ke data, sehingga jenis relasi baru
dapat ditambahkan tanpa perubahan kode (lihat R-03 dan R-11 pada Bagian C).

| Kolom                | Tipe Data         | Penanda | Deskripsi                                                                                  |
| -------------------- | ----------------- | ------- | ------------------------------------------------------------------------------------------ |
| `id`                 | BIGINT UNSIGNED   | PK, NN  | —                                                                                          |
| `kode`               | VARCHAR(40)       | UQ, NN  | `mengubah`, `mencabut`, `mencabut_sebagian`, `dasar_hukum`, `dilaksanakan_oleh`, `terkait` |
| `nama`               | VARCHAR(80)       | NN      | Label arah aktif, contoh `Mengubah`                                                        |
| `nama_kebalikan`     | VARCHAR(80)       | NN      | Label arah pasif, contoh `Diubah oleh`                                                     |
| `kode_kebalikan`     | VARCHAR(40)       | —       | Kode relasi kebalikan bila diwakili entri lain                                             |
| `is_simetris`        | BOOLEAN           | NN      | `1` untuk relasi setara dua arah (contoh `terkait`)                                        |
| `is_mengubah_status` | BOOLEAN           | NN      | `1` bila relasi ini memicu usulan perubahan status dokumen sasaran                         |
| `status_akibat_id`   | BIGINT UNSIGNED   | FK      | Status yang dikenakan pada dokumen sasaran, contoh relasi `mencabut` → status `Dicabut`    |
| `is_sistem`          | BOOLEAN           | NN      | —                                                                                          |
| `urutan`             | SMALLINT UNSIGNED | NN      | Urutan tampil pada blok relasi halaman detail                                              |

**Constraint** — `pk_jenis_relasi` PRIMARY KEY (`id`) · `uq_jenis_relasi_kode` UNIQUE (`kode`) ·
`fk_jenis_relasi_status_akibat` FOREIGN KEY (`status_akibat_id`) → `status_dokumen(id)` ON DELETE SET NULL ·
`ck_jenis_relasi_status_akibat` CHECK (`is_mengubah_status` = 0 OR `status_akibat_id` IS NOT NULL)

---

## D.2 Subsistem Dokumen Hukum

### D.2.1 Tabel `dokumen` — Tabel Inti

| Kolom                     | Tipe Data                                                       | Penanda      | Nilai Baku                                       | Deskripsi                                                                                            |
| ------------------------- | --------------------------------------------------------------- | ------------ | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `id`                      | BIGINT UNSIGNED                                                 | PK, NN       | AUTO_INCREMENT                                   | —                                                                                                    |
| `kode_dokumen`            | VARCHAR(30)                                                     | UQ, NN       | —                                                | `JDIH-ITH-2026-000123`. Tautan permanen dan pengenal sitasi                                          |
| `slug`                    | VARCHAR(255)                                                    | UQ, NN       | —                                                | URL ramah pencarian; perubahan menghasilkan pengalihan 301 (NFR-37)                                  |
| `jenis_peraturan_id`      | BIGINT UNSIGNED                                                 | FK, NN, IDX  | —                                                | —                                                                                                    |
| `nomor`                   | VARCHAR(100)                                                    | NN           | —                                                | Nomor sebagaimana tertulis pada naskah                                                               |
| `nomor_normal`            | VARCHAR(100)                                                    | NN, GEN, IDX | terkomputasi                                     | Hasil normalisasi `nomor` (huruf kapital, tanpa spasi berlebih). Dipakai untuk pemeriksaan duplikasi |
| `nomor_lengkap`           | VARCHAR(255)                                                    | —            | NULL                                             | Nomor lengkap sesuai tata naskah, contoh `12/PER/ITH/2026`                                           |
| `tahun`                   | SMALLINT UNSIGNED                                               | NN, IDX      | —                                                | Tahun penetapan                                                                                      |
| `judul`                   | VARCHAR(500)                                                    | NN           | —                                                | Judul lengkap sesuai naskah                                                                          |
| `judul_singkat`           | VARCHAR(255)                                                    | —            | NULL                                             | Untuk tampilan ringkas dan navigasi                                                                  |
| `teu`                     | VARCHAR(500)                                                    | —            | NULL                                             | Tempat, Entitas, Uraian — elemen metadata JDIHN                                                      |
| `tempat_penetapan`        | VARCHAR(100)                                                    | NN           | `'Parepare'`                                     | —                                                                                                    |
| `tanggal_penetapan`       | DATE                                                            | NN, IDX      | —                                                | —                                                                                                    |
| `tanggal_pengundangan`    | DATE                                                            | —            | NULL                                             | Relevan untuk peraturan eksternal                                                                    |
| `tanggal_berlaku`         | DATE                                                            | —            | NULL                                             | Bila kosong, dianggap sama dengan `tanggal_penetapan`                                                |
| `tanggal_berakhir`        | DATE                                                            | —            | NULL                                             | Untuk peraturan berjangka waktu                                                                      |
| `penerbit`                | VARCHAR(255)                                                    | NN           | `'Institut Teknologi Bacharuddin Jusuf Habibie'` | Instansi penerbit                                                                                    |
| `penandatangan`           | VARCHAR(255)                                                    | —            | NULL                                             | Nama pejabat penanda tangan                                                                          |
| `jabatan_penandatangan`   | VARCHAR(150)                                                    | —            | NULL                                             | —                                                                                                    |
| `sumber`                  | VARCHAR(255)                                                    | —            | NULL                                             | Asal dokumen, contoh `Arsip Bagian Hukum ITH`                                                        |
| `unit_kerja_id`           | BIGINT UNSIGNED                                                 | FK, NN, IDX  | —                                                | Unit pengelola/penanggung jawab                                                                      |
| `bidang_hukum_id`         | BIGINT UNSIGNED                                                 | FK, IDX      | NULL                                             | —                                                                                                    |
| `status_dokumen_id`       | BIGINT UNSIGNED                                                 | FK, NN, IDX  | —                                                | Status keberlakuan                                                                                   |
| `lingkup`                 | ENUM(`internal`,`eksternal`)                                    | NN, IDX      | `'internal'`                                     | —                                                                                                    |
| `tingkat_akses`           | ENUM(`publik`,`internal`,`terbatas`,`rahasia`)                  | NN, IDX      | `'publik'`                                       | Kendali akses berkas                                                                                 |
| `status_publikasi`        | ENUM(`draf`,`diajukan`,`revisi`,`disetujui`,`terbit`,`ditarik`) | NN, IDX      | `'draf'`                                         | Alur kerja publikasi                                                                                 |
| `bahasa`                  | CHAR(2)                                                         | NN           | `'id'`                                           | ISO 639-1                                                                                            |
| `deskripsi_fisik`         | VARCHAR(255)                                                    | —            | NULL                                             | Contoh `18 hlm.; 21 × 29,7 cm`                                                                       |
| `nomor_panggil`           | VARCHAR(50)                                                     | —            | NULL                                             | Untuk koleksi fisik                                                                                  |
| `lokasi_arsip`            | VARCHAR(255)                                                    | —            | NULL                                             | Lokasi simpan naskah asli                                                                            |
| `abstrak`                 | MEDIUMTEXT                                                      | —            | NULL                                             | Ringkasan substansi                                                                                  |
| `catatan`                 | TEXT                                                            | —            | NULL                                             | Keterangan pengelola                                                                                 |
| `isi_teks`                | LONGTEXT                                                        | —            | NULL                                             | Hasil ekstraksi teks PDF/OCR untuk pencarian penuh teks                                              |
| `jumlah_dilihat`          | INT UNSIGNED                                                    | NN           | 0                                                | Penghitung tembolok                                                                                  |
| `jumlah_diunduh`          | INT UNSIGNED                                                    | NN           | 0                                                | Penghitung tembolok                                                                                  |
| `is_disorot`              | BOOLEAN                                                         | NN, IDX      | 0                                                | Tampil pada sorotan beranda                                                                          |
| `diterbitkan_pada`        | DATETIME                                                        | —            | NULL, IDX                                        | Waktu penerbitan aktual                                                                              |
| `dijadwalkan_terbit_pada` | DATETIME                                                        | —            | NULL, IDX                                        | Untuk publikasi terjadwal                                                                            |
| `catatan_revisi`          | TEXT                                                            | —            | NULL                                             | Catatan verifikator saat meminta revisi                                                              |
| `sinkron_jdihn`           | ENUM(`belum`,`tertunda`,`terkirim`,`gagal`)                     | NN, IDX      | `'belum'`                                        | Status sinkronisasi JDIHN                                                                            |
| `jdihn_id`                | VARCHAR(64)                                                     | —            | NULL                                             | Pengenal entri pada JDIHN                                                                            |
| `disinkron_pada`          | DATETIME                                                        | —            | NULL                                             | —                                                                                                    |
| `impor_batch_id`          | BIGINT UNSIGNED                                                 | FK           | NULL                                             | Asal impor massal                                                                                    |
| `versi`                   | INT UNSIGNED                                                    | NN           | 1                                                | _Optimistic locking_ dan nomor versi metadata                                                        |
| `dibuat_oleh`             | BIGINT UNSIGNED                                                 | FK, NN       | —                                                | —                                                                                                    |
| `diperiksa_oleh`          | BIGINT UNSIGNED                                                 | FK           | NULL                                             | Verifikator                                                                                          |
| `diterbitkan_oleh`        | BIGINT UNSIGNED                                                 | FK           | NULL                                             | —                                                                                                    |
| `diperbarui_oleh`         | BIGINT UNSIGNED                                                 | FK           | NULL                                             | —                                                                                                    |
| `dibuat_pada`             | DATETIME                                                        | NN, IDX      | —                                                | —                                                                                                    |
| `diperbarui_pada`         | DATETIME                                                        | —            | NULL                                             | —                                                                                                    |
| `dihapus_pada`            | DATETIME                                                        | —            | NULL, IDX                                        | _Soft delete_                                                                                        |

**Primary Key** — `pk_dokumen` PRIMARY KEY (`id`)

**Unique Constraint**

- `uq_dokumen_kode` UNIQUE (`kode_dokumen`)
- `uq_dokumen_slug` UNIQUE (`slug`)
- `uq_dokumen_identitas` UNIQUE (`jenis_peraturan_id`, `nomor_normal`, `tahun`, `unit_kerja_id`)
  — penegakan BR-01. Untuk jenis peraturan berlingkup penomoran `institut`, keunikan tingkat
  institusi ditegakkan tambahan di lapisan aplikasi (BR-02), karena MySQL tidak mendukung
  _partial unique index_

**Foreign Key**

| Nama                          | Kolom                | Referensi             | On Delete |
| ----------------------------- | -------------------- | --------------------- | --------- |
| `fk_dokumen_jenis`            | `jenis_peraturan_id` | `jenis_peraturan(id)` | RESTRICT  |
| `fk_dokumen_unit`             | `unit_kerja_id`      | `unit_kerja(id)`      | RESTRICT  |
| `fk_dokumen_bidang`           | `bidang_hukum_id`    | `bidang_hukum(id)`    | SET NULL  |
| `fk_dokumen_status`           | `status_dokumen_id`  | `status_dokumen(id)`  | RESTRICT  |
| `fk_dokumen_impor`            | `impor_batch_id`     | `impor_batch(id)`     | SET NULL  |
| `fk_dokumen_dibuat_oleh`      | `dibuat_oleh`        | `pengguna(id)`        | RESTRICT  |
| `fk_dokumen_diperiksa_oleh`   | `diperiksa_oleh`     | `pengguna(id)`        | SET NULL  |
| `fk_dokumen_diterbitkan_oleh` | `diterbitkan_oleh`   | `pengguna(id)`        | SET NULL  |
| `fk_dokumen_diperbarui_oleh`  | `diperbarui_oleh`    | `pengguna(id)`        | SET NULL  |

**Check Constraint**

- `ck_dokumen_tahun` CHECK (`tahun` BETWEEN 1945 AND 2100)
- `ck_dokumen_tanggal_berlaku` CHECK (`tanggal_berlaku` IS NULL OR `tanggal_berlaku` >= `tanggal_penetapan`)
- `ck_dokumen_tanggal_berakhir` CHECK (`tanggal_berakhir` IS NULL OR `tanggal_berakhir` >= `tanggal_penetapan`)
- `ck_dokumen_terbit_wajib_waktu` CHECK (`status_publikasi` <> 'terbit' OR `diterbitkan_pada` IS NOT NULL)
- `ck_dokumen_bahasa` CHECK (`bahasa` REGEXP '^[a-z]{2}$')

**Generated Column**

```sql
`nomor_normal` VARCHAR(100) AS (UPPER(TRIM(REGEXP_REPLACE(`nomor`, '[[:space:]]+', ' ')))) STORED
```

**Indeks**

| Nama                             | Kolom                                                                           | Tujuan                                                   |
| -------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `idx_dokumen_daftar_publik`      | (`status_publikasi`, `tingkat_akses`, `dihapus_pada`, `tanggal_penetapan` DESC) | Kueri daftar dokumen publik — kueri terpanas pada sistem |
| `idx_dokumen_jenis_tahun`        | (`jenis_peraturan_id`, `tahun`, `status_publikasi`)                             | Penelusuran per jenis dan per tahun                      |
| `idx_dokumen_unit_status`        | (`unit_kerja_id`, `status_publikasi`, `dihapus_pada`)                           | Daftar dokumen pada panel Admin (dibatasi cakupan unit)  |
| `idx_dokumen_status_keberlakuan` | (`status_dokumen_id`, `status_publikasi`)                                       | Penyaring status keberlakuan                             |
| `idx_dokumen_jadwal`             | (`dijadwalkan_terbit_pada`)                                                     | Tugas terjadwal penerbitan                               |
| `idx_dokumen_sinkron`            | (`sinkron_jdihn`, `tingkat_akses`)                                              | Antrean sinkronisasi JDIHN                               |
| `idx_dokumen_populer`            | (`jumlah_diunduh` DESC)                                                         | Peringkat dokumen terpopuler                             |
| `ft_dokumen_pencarian`           | FULLTEXT (`judul`, `abstrak`, `isi_teks`)                                       | Cadangan pencarian bila Meilisearch tidak tersedia       |

**Catatan** — kolom `isi_teks` bertipe `LONGTEXT` dan **wajib dikecualikan** dari `SELECT` pada kueri
daftar dokumen. Pada tingkat ORM, kolom ini ditandai sebagai atribut yang dimuat secara tertunda
(_lazy_). Bila ukuran rata-rata melebihi 500 KB per dokumen, kolom dipindahkan ke tabel
`dokumen_teks` berelasi 1:1 (lihat Bagian H § H.6).

---

### D.2.2 Tabel `dokumen_berkas`

| Kolom                             | Tipe Data                                         | Penanda     | Nilai Baku        | Deskripsi                                                                                   |
| --------------------------------- | ------------------------------------------------- | ----------- | ----------------- | ------------------------------------------------------------------------------------------- |
| `id`                              | BIGINT UNSIGNED                                   | PK, NN      | AUTO_INCREMENT    | —                                                                                           |
| `dokumen_id`                      | BIGINT UNSIGNED                                   | FK, NN, IDX | —                 | —                                                                                           |
| `jenis_berkas`                    | ENUM                                              | NN, IDX     | `'dokumen_utama'` | `dokumen_utama`, `lampiran`, `abstrak`, `naskah_akademik`, `terjemahan`, `dokumen_pencabut` |
| `nama_asli`                       | VARCHAR(255)                                      | NN          | —                 | Nama berkas sebagaimana diunggah, untuk nama berkas saat diunduh                            |
| `nama_simpan`                     | VARCHAR(100)                                      | NN          | —                 | Nama acak (UUID + ekstensi)                                                                 |
| `path`                            | VARCHAR(500)                                      | UQ, NN      | —                 | Jalur relatif pada penyimpanan                                                              |
| `disk`                            | VARCHAR(30)                                       | NN          | `'lokal'`         | Nama diska penyimpanan (`lokal`, `s3`, `minio`)                                             |
| `mime_type`                       | VARCHAR(100)                                      | NN          | —                 | Jenis MIME nyata hasil deteksi isi berkas                                                   |
| `ukuran_bytes`                    | BIGINT UNSIGNED                                   | NN          | —                 | —                                                                                           |
| `jumlah_halaman`                  | SMALLINT UNSIGNED                                 | —           | NULL              | Hasil pembacaan metadata PDF                                                                |
| `hash_sha256`                     | CHAR(64)                                          | NN, IDX     | —                 | Verifikasi integritas dan deteksi duplikasi                                                 |
| `urutan`                          | SMALLINT UNSIGNED                                 | NN          | 0                 | —                                                                                           |
| `is_publik`                       | BOOLEAN                                           | NN, IDX     | 1                 | Berkas dapat nonpublik meskipun dokumennya publik                                           |
| `is_pratinjau`                    | BOOLEAN                                           | NN          | 1                 | Mengizinkan pratinjau dalam peramban                                                        |
| `is_versi_aktif`                  | BOOLEAN                                           | NN, IDX     | 1                 | `0` untuk berkas yang telah diganti (diarsipkan)                                            |
| `jumlah_diunduh`                  | INT UNSIGNED                                      | NN          | 0                 | Penghitung tembolok                                                                         |
| `status_ekstraksi`                | ENUM(`menunggu`,`berhasil`,`gagal`,`tidak_perlu`) | NN, IDX     | `'menunggu'`      | Status ekstraksi teks/OCR                                                                   |
| `keterangan`                      | VARCHAR(255)                                      | —           | NULL              | —                                                                                           |
| `dibuat_oleh`                     | BIGINT UNSIGNED                                   | FK          | NULL              | —                                                                                           |
| `dibuat_pada` / `diperbarui_pada` | DATETIME                                          | —           | —                 | —                                                                                           |

**Constraint**

- `pk_dokumen_berkas` PRIMARY KEY (`id`) · `uq_dokumen_berkas_path` UNIQUE (`path`)
- `fk_dokumen_berkas_dokumen` FOREIGN KEY (`dokumen_id`) → `dokumen(id)` **ON DELETE CASCADE**
- `fk_dokumen_berkas_dibuat_oleh` FOREIGN KEY (`dibuat_oleh`) → `pengguna(id)` ON DELETE SET NULL
- `ck_dokumen_berkas_ukuran` CHECK (`ukuran_bytes` > 0)
- `ck_dokumen_berkas_hash` CHECK (CHAR_LENGTH(`hash_sha256`) = 64)
- `idx_dokumen_berkas_dokumen_jenis` INDEX (`dokumen_id`, `jenis_berkas`, `is_versi_aktif`, `urutan`)
- `idx_dokumen_berkas_hash` INDEX (`hash_sha256`) — deteksi berkas duplikat lintas dokumen

---

### D.2.3 Tabel `dokumen_kategori` (penghubung)

| Kolom         | Tipe Data       | Penanda    | Deskripsi                                            |
| ------------- | --------------- | ---------- | ---------------------------------------------------- |
| `dokumen_id`  | BIGINT UNSIGNED | PK, FK, NN | —                                                    |
| `kategori_id` | BIGINT UNSIGNED | PK, FK, NN | —                                                    |
| `is_utama`    | BOOLEAN         | NN         | Menandai kategori utama untuk keperluan _breadcrumb_ |
| `dibuat_pada` | DATETIME        | NN         | —                                                    |

**Constraint** — `pk_dokumen_kategori` PRIMARY KEY (`dokumen_id`, `kategori_id`) ·
`fk_dokumen_kategori_dokumen` → `dokumen(id)` ON DELETE CASCADE ·
`fk_dokumen_kategori_kategori` → `kategori(id)` ON DELETE CASCADE ·
`idx_dokumen_kategori_kategori` INDEX (`kategori_id`) — kueri arah balik

---

### D.2.4 Tabel `dokumen_tag` (penghubung)

**Kolom** — `dokumen_id` (PK, FK, NN), `tag_id` (PK, FK, NN), `dibuat_pada` (NN)

**Constraint** — `pk_dokumen_tag` PRIMARY KEY (`dokumen_id`, `tag_id`) ·
`fk_dokumen_tag_dokumen` → `dokumen(id)` ON DELETE CASCADE ·
`fk_dokumen_tag_tag` → `tag(id)` ON DELETE CASCADE ·
`idx_dokumen_tag_tag` INDEX (`tag_id`)

---

### D.2.5 Tabel `dokumen_relasi`

| Kolom                | Tipe Data       | Penanda     | Deskripsi                           |
| -------------------- | --------------- | ----------- | ----------------------------------- |
| `id`                 | BIGINT UNSIGNED | PK, NN      | —                                   |
| `dokumen_id`         | BIGINT UNSIGNED | FK, NN, IDX | Dokumen sumber (pelaku relasi)      |
| `dokumen_terkait_id` | BIGINT UNSIGNED | FK, NN, IDX | Dokumen sasaran                     |
| `jenis_relasi_id`    | BIGINT UNSIGNED | FK, NN      | —                                   |
| `keterangan`         | VARCHAR(500)    | —           | Contoh `mengubah Pasal 12 ayat (3)` |
| `dibuat_oleh`        | BIGINT UNSIGNED | FK          | —                                   |
| `dibuat_pada`        | DATETIME        | NN          | —                                   |

**Constraint**

- `pk_dokumen_relasi` PRIMARY KEY (`id`)
- `uq_dokumen_relasi` UNIQUE (`dokumen_id`, `dokumen_terkait_id`, `jenis_relasi_id`) — penegakan FR-056
- `ck_dokumen_relasi_bukan_diri` CHECK (`dokumen_id` <> `dokumen_terkait_id`) — penegakan BR-20
- `fk_dokumen_relasi_dokumen` → `dokumen(id)` ON DELETE CASCADE
- `fk_dokumen_relasi_terkait` → `dokumen(id)` **ON DELETE RESTRICT** — mencegah dokumen rujukan
  terhapus tanpa disadari
- `fk_dokumen_relasi_jenis` → `jenis_relasi(id)` ON DELETE RESTRICT
- `idx_dokumen_relasi_terkait` INDEX (`dokumen_terkait_id`, `jenis_relasi_id`) — kueri arah pasif

**Kueri arah dua arah** — tampilan relasi lengkap satu dokumen memakai gabungan dua kueri:

```sql
-- Arah aktif: dokumen ini melakukan relasi terhadap dokumen lain
SELECT jr.nama AS label, d2.id, d2.judul, d2.kode_dokumen
FROM dokumen_relasi dr
JOIN jenis_relasi jr ON jr.id = dr.jenis_relasi_id
JOIN dokumen d2 ON d2.id = dr.dokumen_terkait_id
WHERE dr.dokumen_id = :id
UNION ALL
-- Arah pasif: dokumen ini menjadi sasaran relasi dokumen lain
SELECT jr.nama_kebalikan AS label, d1.id, d1.judul, d1.kode_dokumen
FROM dokumen_relasi dr
JOIN jenis_relasi jr ON jr.id = dr.jenis_relasi_id
JOIN dokumen d1 ON d1.id = dr.dokumen_id
WHERE dr.dokumen_terkait_id = :id;
```

---

### D.2.6 Tabel `dokumen_akses`

| Kolom         | Tipe Data                             | Penanda     | Deskripsi                                       |
| ------------- | ------------------------------------- | ----------- | ----------------------------------------------- |
| `id`          | BIGINT UNSIGNED                       | PK, NN      | —                                               |
| `dokumen_id`  | BIGINT UNSIGNED                       | FK, NN, IDX | —                                               |
| `subjek_tipe` | ENUM(`peran`,`unit_kerja`,`pengguna`) | NN          | Jenis subjek berhak (relasi polimorfik)         |
| `subjek_id`   | BIGINT UNSIGNED                       | NN          | Pengenal subjek pada tabel sesuai `subjek_tipe` |
| `izin`        | ENUM(`lihat`,`unduh`)                 | NN          | Jenis kewenangan                                |
| `dibuat_oleh` | BIGINT UNSIGNED                       | FK          | —                                               |
| `dibuat_pada` | DATETIME                              | NN          | —                                               |

**Constraint** — `pk_dokumen_akses` PRIMARY KEY (`id`) ·
`uq_dokumen_akses` UNIQUE (`dokumen_id`, `subjek_tipe`, `subjek_id`, `izin`) ·
`fk_dokumen_akses_dokumen` → `dokumen(id)` ON DELETE CASCADE ·
`idx_dokumen_akses_subjek` INDEX (`subjek_tipe`, `subjek_id`)

**Catatan** — `subjek_id` tidak dapat ditegakkan _foreign key_ karena bersifat polimorfik. Mitigasi:
(a) validasi keberadaan subjek di lapisan aplikasi saat penyimpanan; (b) tugas terjadwal mingguan
memeriksa dan melaporkan baris dengan subjek tidak ditemukan; (c) _observer_ penghapusan `peran`,
`unit_kerja`, dan `pengguna` membersihkan baris terkait.

---

### D.2.7 Tabel `dokumen_alur`

| Kolom              | Tipe Data                       | Penanda     | Deskripsi                                                                      |
| ------------------ | ------------------------------- | ----------- | ------------------------------------------------------------------------------ |
| `id`               | BIGINT UNSIGNED                 | PK, NN      | —                                                                              |
| `dokumen_id`       | BIGINT UNSIGNED                 | FK, NN, IDX | —                                                                              |
| `konteks`          | ENUM(`publikasi`,`keberlakuan`) | NN, IDX     | Membedakan riwayat alur kerja dan riwayat status keberlakuan                   |
| `status_dari`      | VARCHAR(40)                     | —           | Status asal; `NULL` pada entri pertama                                         |
| `status_ke`        | VARCHAR(40)                     | NN          | Status tujuan                                                                  |
| `aksi`             | VARCHAR(50)                     | NN          | `ajukan`, `setujui`, `minta_revisi`, `terbitkan`, `tarik`, `ubah_status`       |
| `catatan`          | TEXT                            | —           | Wajib diisi untuk aksi `minta_revisi` dan `tarik` (ditegakkan aplikasi, BR-07) |
| `dokumen_dasar_id` | BIGINT UNSIGNED                 | FK          | Dokumen yang menjadi dasar perubahan status keberlakuan                        |
| `oleh_id`          | BIGINT UNSIGNED                 | FK          | Pelaku; `NULL` untuk perubahan otomatis oleh penjadwal                         |
| `oleh_sistem`      | BOOLEAN                         | NN          | `1` bila transisi dilakukan tugas terjadwal                                    |
| `dibuat_pada`      | DATETIME                        | NN, IDX     | —                                                                              |

**Constraint** — `pk_dokumen_alur` PRIMARY KEY (`id`) ·
`fk_dokumen_alur_dokumen` → `dokumen(id)` ON DELETE CASCADE ·
`fk_dokumen_alur_dasar` → `dokumen(id)` ON DELETE SET NULL ·
`fk_dokumen_alur_oleh` → `pengguna(id)` ON DELETE SET NULL ·
`idx_dokumen_alur_dokumen_konteks` INDEX (`dokumen_id`, `konteks`, `dibuat_pada` DESC)

---

### D.2.8 Tabel `dokumen_riwayat`

| Kolom                 | Tipe Data       | Penanda | Deskripsi                                                         |
| --------------------- | --------------- | ------- | ----------------------------------------------------------------- |
| `id`                  | BIGINT UNSIGNED | PK, NN  | —                                                                 |
| `dokumen_id`          | BIGINT UNSIGNED | FK, NN  | —                                                                 |
| `versi`               | INT UNSIGNED    | NN      | Nomor versi metadata                                              |
| `cuplikan_metadata`   | JSON            | NN      | Seluruh nilai metadata pada versi tersebut                        |
| `cuplikan_berkas`     | JSON            | —       | Daftar berkas pada versi tersebut                                 |
| `ringkasan_perubahan` | VARCHAR(500)    | —       | Diisi pengguna atau dibuat otomatis dari daftar ruas yang berubah |
| `oleh_id`             | BIGINT UNSIGNED | FK      | —                                                                 |
| `dibuat_pada`         | DATETIME        | NN      | —                                                                 |

**Constraint** — `pk_dokumen_riwayat` PRIMARY KEY (`id`) ·
`uq_dokumen_riwayat_versi` UNIQUE (`dokumen_id`, `versi`) ·
`fk_dokumen_riwayat_dokumen` → `dokumen(id)` ON DELETE CASCADE ·
`fk_dokumen_riwayat_oleh` → `pengguna(id)` ON DELETE SET NULL

---

### D.2.9 Tabel `dokumen_statistik_harian`

| Kolom                   | Tipe Data       | Penanda     | Deskripsi                                   |
| ----------------------- | --------------- | ----------- | ------------------------------------------- |
| `dokumen_id`            | BIGINT UNSIGNED | PK, FK, NN  | —                                           |
| `tanggal`               | DATE            | PK, NN, IDX | —                                           |
| `jumlah_dilihat`        | INT UNSIGNED    | NN          | —                                           |
| `jumlah_diunduh`        | INT UNSIGNED    | NN          | —                                           |
| `jumlah_dilihat_anonim` | INT UNSIGNED    | NN          | Pemisahan untuk analisis pemanfaatan publik |
| `jumlah_diunduh_anonim` | INT UNSIGNED    | NN          | —                                           |

**Constraint** — `pk_dokumen_statistik_harian` PRIMARY KEY (`dokumen_id`, `tanggal`) ·
`fk_dokumen_statistik_dokumen` → `dokumen(id)` ON DELETE CASCADE ·
`idx_dokumen_statistik_tanggal` INDEX (`tanggal`)

**Catatan** — kunci utama gabungan sekaligus berperan sebagai _unique constraint_ yang memungkinkan
operasi `INSERT … ON DUPLICATE KEY UPDATE` untuk penambahan penghitung tanpa kueri pemeriksaan
terlebih dahulu.

---

### D.2.10 Tabel `unduhan`

| Kolom               | Tipe Data       | Penanda     | Deskripsi                                |
| ------------------- | --------------- | ----------- | ---------------------------------------- |
| `id`                | BIGINT UNSIGNED | PK, NN      | —                                        |
| `dokumen_id`        | BIGINT UNSIGNED | FK, NN, IDX | —                                        |
| `dokumen_berkas_id` | BIGINT UNSIGNED | FK, IDX     | Berkas spesifik yang diunduh             |
| `pengguna_id`       | BIGINT UNSIGNED | FK, IDX     | `NULL` untuk pengunduh anonim            |
| `peran_saat_unduh`  | VARCHAR(30)     | NN          | Cuplikan peran saat peristiwa terjadi    |
| `ip_hash`           | CHAR(64)        | NN, IDX     | SHA-256 bergaram atas alamat IP (NFR-21) |
| `agen_ringkas`      | VARCHAR(150)    | —           | Ringkasan agen peramban                  |
| `perujuk`           | VARCHAR(255)    | —           | Halaman asal permintaan                  |
| `dibuat_pada`       | DATETIME        | NN, IDX     | —                                        |

**Constraint** — `pk_unduhan` PRIMARY KEY (`id`) ·
`fk_unduhan_dokumen` → `dokumen(id)` ON DELETE CASCADE ·
`fk_unduhan_berkas` → `dokumen_berkas(id)` ON DELETE SET NULL ·
`fk_unduhan_pengguna` → `pengguna(id)` ON DELETE SET NULL ·
`idx_unduhan_dokumen_tanggal` INDEX (`dokumen_id`, `dibuat_pada`) ·
`idx_unduhan_ip_waktu` INDEX (`ip_hash`, `dibuat_pada`) — penegakan pembatasan laju unduhan (FR-100)

**Strategi partisi** — tabel ini bertumbuh paling cepat. Bila jumlah baris melampaui 5 juta,
terapkan partisi `RANGE` berdasarkan bulan:

```sql
ALTER TABLE unduhan PARTITION BY RANGE (TO_DAYS(dibuat_pada)) (
    PARTITION p2026_01 VALUES LESS THAN (TO_DAYS('2026-02-01')),
    PARTITION p2026_02 VALUES LESS THAN (TO_DAYS('2026-03-01')),
    -- dst., dibuat otomatis oleh tugas terjadwal bulanan
    PARTITION p_maks VALUES LESS THAN MAXVALUE
);
```

Catatan teknis: MySQL mewajibkan seluruh kolom kunci utama dan unik tercakup dalam kunci partisi.
Karena itu, saat partisi diterapkan, kunci utama menjadi gabungan (`id`, `dibuat_pada`), dan
_foreign key_ pada tabel terpartisi tidak didukung MySQL — penegakan integritas berpindah ke lapisan
aplikasi. Pertimbangan ini menjadi salah satu alasan PostgreSQL diusulkan sebagai alternatif
(§ D.7 dan Bagian G § G.2).

---

### D.2.11 Tabel `permintaan_akses`

| Kolom                             | Tipe Data                                            | Penanda     | Deskripsi                                                                              |
| --------------------------------- | ---------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------- |
| `id`                              | BIGINT UNSIGNED                                      | PK, NN      | —                                                                                      |
| `dokumen_id`                      | BIGINT UNSIGNED                                      | FK, NN, IDX | —                                                                                      |
| `pengguna_id`                     | BIGINT UNSIGNED                                      | FK, NN, IDX | Pemohon                                                                                |
| `alasan`                          | TEXT                                                 | NN          | Alasan penggunaan dokumen                                                              |
| `status`                          | ENUM(`menunggu`,`disetujui`,`ditolak`,`kedaluwarsa`) | NN, IDX     | —                                                                                      |
| `diputuskan_oleh`                 | BIGINT UNSIGNED                                      | FK          | —                                                                                      |
| `catatan_keputusan`               | TEXT                                                 | —           | —                                                                                      |
| `diputuskan_pada`                 | DATETIME                                             | —           | —                                                                                      |
| `berlaku_hingga`                  | DATE                                                 | —           | Masa berlaku akses yang diberikan                                                      |
| `kunci_menunggu`                  | VARCHAR(50)                                          | UQ, GEN     | Kolom terkomputasi: `dokumen_id-pengguna_id` bila status `menunggu`, `NULL` bila tidak |
| `dibuat_pada` / `diperbarui_pada` | DATETIME                                             | —           | —                                                                                      |

**Constraint** — `pk_permintaan_akses` PRIMARY KEY (`id`) ·
`uq_permintaan_akses_menunggu` UNIQUE (`kunci_menunggu`) ·
`fk_permintaan_akses_dokumen` → `dokumen(id)` ON DELETE CASCADE ·
`fk_permintaan_akses_pengguna` → `pengguna(id)` ON DELETE CASCADE ·
`fk_permintaan_akses_pemutus` → `pengguna(id)` ON DELETE SET NULL ·
`ck_permintaan_akses_keputusan` CHECK (`status` = 'menunggu' OR `diputuskan_pada` IS NOT NULL)

**Catatan desain** — pendekatan naif `UNIQUE (dokumen_id, pengguna_id, status)` akan **memblokir
pengajuan ulang** setelah suatu permintaan ditolak, karena baris `ditolak` lama tetap menempati
kombinasi tersebut. MySQL tidak mendukung _partial unique index_, sehingga dipakai kolom
terkomputasi `kunci_menunggu` yang bernilai `NULL` ketika status bukan `menunggu`. Karena MySQL
memperlakukan setiap `NULL` sebagai nilai berbeda pada indeks unik, hasilnya setara dengan
`CREATE UNIQUE INDEX ... WHERE status = 'menunggu'` pada PostgreSQL: satu permintaan aktif per
pasangan dokumen–pengguna, dengan riwayat penolakan tetap tersimpan utuh.

---

### D.2.12 Tabel `koleksi_pengguna`

**Kolom** — `pengguna_id` (PK, FK, NN), `dokumen_id` (PK, FK, NN), `catatan` VARCHAR(255),
`dibuat_pada` (NN)

**Constraint** — `pk_koleksi_pengguna` PRIMARY KEY (`pengguna_id`, `dokumen_id`) ·
kedua _foreign key_ ON DELETE CASCADE · `idx_koleksi_dokumen` INDEX (`dokumen_id`)

---

### D.2.13 Tabel `impor_batch`

| Kolom                                              | Tipe Data                                                                | Penanda | Deskripsi                                       |
| -------------------------------------------------- | ------------------------------------------------------------------------ | ------- | ----------------------------------------------- |
| `id`                                               | BIGINT UNSIGNED                                                          | PK, NN  | —                                               |
| `nama_berkas`                                      | VARCHAR(255)                                                             | NN      | Nama berkas yang diunggah                       |
| `path`                                             | VARCHAR(500)                                                             | NN      | Lokasi simpan berkas impor                      |
| `mode`                                             | ENUM(`buat`,`perbarui`)                                                  | NN      | Mode impor                                      |
| `total_baris`                                      | INT UNSIGNED                                                             | NN      | —                                               |
| `jumlah_berhasil`                                  | INT UNSIGNED                                                             | NN      | —                                               |
| `jumlah_gagal`                                     | INT UNSIGNED                                                             | NN      | —                                               |
| `baris_terakhir`                                   | INT UNSIGNED                                                             | NN      | Posisi terakhir yang diproses, untuk pelanjutan |
| `status`                                           | ENUM(`pravalidasi`,`menunggu`,`berjalan`,`selesai`,`gagal`,`dibatalkan`) | NN, IDX | —                                               |
| `laporan`                                          | JSON                                                                     | —       | Rincian galat per baris                         |
| `oleh_id`                                          | BIGINT UNSIGNED                                                          | FK, NN  | —                                               |
| `dibuat_pada` / `diperbarui_pada` / `selesai_pada` | DATETIME                                                                 | —       | —                                               |

**Constraint** — `pk_impor_batch` PRIMARY KEY (`id`) ·
`fk_impor_batch_oleh` → `pengguna(id)` ON DELETE RESTRICT ·
`ck_impor_batch_jumlah` CHECK (`jumlah_berhasil` + `jumlah_gagal` <= `total_baris`)

---

### D.2.14 Tabel `log_sinkronisasi_jdihn`

| Kolom           | Tipe Data                        | Penanda     | Deskripsi                                    |
| --------------- | -------------------------------- | ----------- | -------------------------------------------- |
| `id`            | BIGINT UNSIGNED                  | PK, NN      | —                                            |
| `dokumen_id`    | BIGINT UNSIGNED                  | FK, NN, IDX | —                                            |
| `arah`          | ENUM(`kirim`,`perbarui`,`hapus`) | NN          | Operasi yang dikirim                         |
| `muatan`        | JSON                             | —           | Muatan permintaan, untuk penelusuran masalah |
| `kode_respons`  | SMALLINT UNSIGNED                | —           | Kode status HTTP                             |
| `pesan_respons` | TEXT                             | —           | —                                            |
| `status`        | ENUM(`berhasil`,`gagal`)         | NN, IDX     | —                                            |
| `percobaan_ke`  | TINYINT UNSIGNED                 | NN          | —                                            |
| `durasi_ms`     | INT UNSIGNED                     | —           | Lama permintaan, untuk pemantauan kinerja    |
| `dibuat_pada`   | DATETIME                         | NN, IDX     | —                                            |

**Constraint** — `pk_log_sinkronisasi_jdihn` PRIMARY KEY (`id`) ·
`fk_log_sinkronisasi_dokumen` → `dokumen(id)` ON DELETE CASCADE ·
`idx_log_sinkronisasi_status_waktu` INDEX (`status`, `dibuat_pada` DESC)

---

## D.3 Subsistem Pengguna, Peran, dan Otorisasi

### D.3.1 Tabel `pengguna`

| Kolom                                              | Tipe Data                                                     | Penanda | Nilai Baku              | Deskripsi                                                                                     |
| -------------------------------------------------- | ------------------------------------------------------------- | ------- | ----------------------- | --------------------------------------------------------------------------------------------- |
| `id`                                               | BIGINT UNSIGNED                                               | PK, NN  | AUTO_INCREMENT          | —                                                                                             |
| `nama_lengkap`                                     | VARCHAR(150)                                                  | NN, IDX | —                       | —                                                                                             |
| `email`                                            | VARCHAR(190)                                                  | UQ, NN  | —                       | Surel institusi; pengenal login. Panjang 190 agar indeks `utf8mb4` tetap dalam batas 767 bita |
| `nip_nidn`                                         | VARCHAR(30)                                                   | UQ      | NULL                    | NIP, NIDN, atau NIK pegawai                                                                   |
| `kata_sandi`                                       | VARCHAR(255)                                                  | NN      | —                       | _Hash_ Argon2id atau bcrypt; tidak pernah menyimpan nilai asli (NFR-11)                       |
| `no_telepon`                                       | VARCHAR(25)                                                   | —       | NULL                    | —                                                                                             |
| `unit_kerja_id`                                    | BIGINT UNSIGNED                                               | FK, IDX | NULL                    | Unit kerja utama                                                                              |
| `jabatan`                                          | VARCHAR(120)                                                  | —       | NULL                    | —                                                                                             |
| `foto`                                             | VARCHAR(255)                                                  | —       | NULL                    | Jalur berkas foto profil                                                                      |
| `status`                                           | ENUM(`menunggu_verifikasi`,`aktif`,`nonaktif`,`ditangguhkan`) | NN, IDX | `'menunggu_verifikasi'` | —                                                                                             |
| `email_terverifikasi_pada`                         | DATETIME                                                      | —       | NULL                    | —                                                                                             |
| `is_2fa_aktif`                                     | BOOLEAN                                                       | NN      | 0                       | —                                                                                             |
| `rahasia_2fa`                                      | VARCHAR(255)                                                  | —       | NULL                    | Terenkripsi pada tingkat aplikasi                                                             |
| `kode_pemulihan_2fa`                               | JSON                                                          | —       | NULL                    | Daftar _hash_ kode pemulihan sekali pakai                                                     |
| `jumlah_gagal_login`                               | TINYINT UNSIGNED                                              | NN      | 0                       | —                                                                                             |
| `dikunci_hingga`                                   | DATETIME                                                      | —       | NULL                    | Penguncian sementara akibat kegagalan berulang                                                |
| `terakhir_login_pada`                              | DATETIME                                                      | —       | NULL                    | —                                                                                             |
| `terakhir_login_ip`                                | VARCHAR(45)                                                   | —       | NULL                    | Mendukung IPv6                                                                                |
| `sumber_akun`                                      | ENUM(`lokal`,`sso`)                                           | NN      | `'lokal'`               | —                                                                                             |
| `sso_subject`                                      | VARCHAR(190)                                                  | UQ      | NULL                    | Pengenal subjek pada penyedia identitas                                                       |
| `preferensi`                                       | JSON                                                          | —       | NULL                    | Preferensi antarmuka (tema, jumlah data per halaman)                                          |
| `diverifikasi_oleh`                                | BIGINT UNSIGNED                                               | FK      | NULL                    | —                                                                                             |
| `diverifikasi_pada`                                | DATETIME                                                      | —       | NULL                    | —                                                                                             |
| `token_ingat`                                      | VARCHAR(100)                                                  | —       | NULL                    | —                                                                                             |
| `dibuat_oleh`                                      | BIGINT UNSIGNED                                               | FK      | NULL                    | `NULL` untuk pendaftaran mandiri                                                              |
| `dibuat_pada` / `diperbarui_pada` / `dihapus_pada` | DATETIME                                                      | —       | —                       | `dihapus_pada` untuk _soft delete_                                                            |

**Constraint**

- `pk_pengguna` PRIMARY KEY (`id`)
- `uq_pengguna_email` UNIQUE (`email`) · `uq_pengguna_nip` UNIQUE (`nip_nidn`) ·
  `uq_pengguna_sso` UNIQUE (`sso_subject`)
- `fk_pengguna_unit` FOREIGN KEY (`unit_kerja_id`) → `unit_kerja(id)` ON DELETE RESTRICT
- `fk_pengguna_diverifikasi_oleh` / `fk_pengguna_dibuat_oleh` → `pengguna(id)` ON DELETE SET NULL
- `ck_pengguna_email_format` CHECK (`email` LIKE '%_@_%._%')
- `idx_pengguna_status_unit` INDEX (`status`, `unit_kerja_id`)

---

### D.3.2 Tabel `peran`

| Kolom                             | Tipe Data        | Penanda | Deskripsi                                                                                                               |
| --------------------------------- | ---------------- | ------- | ----------------------------------------------------------------------------------------------------------------------- |
| `id`                              | BIGINT UNSIGNED  | PK, NN  | —                                                                                                                       |
| `kode`                            | VARCHAR(40)      | UQ, NN  | `superadmin`, `admin`, `dosen_staf`, `pengunjung`                                                                       |
| `nama`                            | VARCHAR(80)      | NN, UQ  | —                                                                                                                       |
| `deskripsi`                       | VARCHAR(255)     | —       | —                                                                                                                       |
| `tingkat`                         | TINYINT UNSIGNED | NN      | Urutan kewenangan (1 tertinggi). Dipakai mencegah peran lebih rendah mengelola peran lebih tinggi                       |
| `is_sistem`                       | BOOLEAN          | NN      | Peran sistem tidak dapat dihapus (BR-27)                                                                                |
| `is_anonim`                       | BOOLEAN          | NN      | `1` hanya pada peran `pengunjung`; peran ini tidak pernah ditetapkan ke akun, hanya sebagai wadah deklarasi izin publik |
| `is_wajib_2fa`                    | BOOLEAN          | NN      | `1` pada `superadmin`                                                                                                   |
| `is_lingkup_unit`                 | BOOLEAN          | NN      | `1` bila kewenangan peran dibatasi cakupan unit kerja (berlaku pada `admin`)                                            |
| `dibuat_pada` / `diperbarui_pada` | DATETIME         | —       | —                                                                                                                       |

**Constraint** — `pk_peran` PRIMARY KEY (`id`) · `uq_peran_kode` UNIQUE (`kode`) ·
`uq_peran_nama` UNIQUE (`nama`)

---

### D.3.3 Tabel `izin`

| Kolom                 | Tipe Data         | Penanda | Deskripsi                                       |
| --------------------- | ----------------- | ------- | ----------------------------------------------- |
| `id`                  | BIGINT UNSIGNED   | PK, NN  | —                                               |
| `kode`                | VARCHAR(60)       | UQ, NN  | Format `modul.aksi`, contoh `dokumen.terbitkan` |
| `nama`                | VARCHAR(120)      | NN      | Label antarmuka                                 |
| `modul`               | VARCHAR(40)       | NN, IDX | Pengelompokan tampilan matriks izin             |
| `deskripsi`           | VARCHAR(255)      | —       | —                                               |
| `is_berdampak_tinggi` | BOOLEAN           | NN      | Memicu peringatan saat diberikan                |
| `is_sistem`           | BOOLEAN           | NN      | —                                               |
| `urutan`              | SMALLINT UNSIGNED | NN      | —                                               |

**Constraint** — `pk_izin` PRIMARY KEY (`id`) · `uq_izin_kode` UNIQUE (`kode`) ·
`ck_izin_kode_format` CHECK (`kode` REGEXP '^[a-z_]+\\.[a-z_]+$') ·
`idx_izin_modul` INDEX (`modul`, `urutan`)

---

### D.3.4 Tabel `peran_izin` (penghubung)

**Kolom** — `peran_id` (PK, FK, NN), `izin_id` (PK, FK, NN), `diberikan_oleh` (FK), `dibuat_pada` (NN)

**Constraint** — `pk_peran_izin` PRIMARY KEY (`peran_id`, `izin_id`) ·
`fk_peran_izin_peran` → `peran(id)` ON DELETE CASCADE ·
`fk_peran_izin_izin` → `izin(id)` ON DELETE CASCADE ·
`fk_peran_izin_pemberi` → `pengguna(id)` ON DELETE SET NULL ·
`idx_peran_izin_izin` INDEX (`izin_id`)

---

### D.3.5 Tabel `pengguna_peran` (penghubung)

**Kolom** — `pengguna_id` (PK, FK, NN), `peran_id` (PK, FK, NN), `ditetapkan_oleh` (FK),
`dibuat_pada` (NN)

**Constraint** — `pk_pengguna_peran` PRIMARY KEY (`pengguna_id`, `peran_id`) ·
`fk_pengguna_peran_pengguna` → `pengguna(id)` ON DELETE CASCADE ·
`fk_pengguna_peran_peran` → `peran(id)` ON DELETE CASCADE ·
`idx_pengguna_peran_peran` INDEX (`peran_id`)

---

### D.3.6 Tabel `pengguna_izin`

| Kolom             | Tipe Data               | Penanda     | Deskripsi                                      |
| ----------------- | ----------------------- | ----------- | ---------------------------------------------- |
| `id`              | BIGINT UNSIGNED         | PK, NN      | —                                              |
| `pengguna_id`     | BIGINT UNSIGNED         | FK, NN, IDX | —                                              |
| `izin_id`         | BIGINT UNSIGNED         | FK, NN      | —                                              |
| `mode`            | ENUM(`berikan`,`cabut`) | NN          | `cabut` menegasikan izin yang diwariskan peran |
| `berlaku_hingga`  | DATE                    | —           | Masa berlaku; `NULL` berarti permanen          |
| `alasan`          | VARCHAR(255)            | —           | Wajib diisi menurut kebijakan aplikasi         |
| `ditetapkan_oleh` | BIGINT UNSIGNED         | FK, NN      | —                                              |
| `dibuat_pada`     | DATETIME                | NN          | —                                              |

**Constraint** — `pk_pengguna_izin` PRIMARY KEY (`id`) ·
`uq_pengguna_izin` UNIQUE (`pengguna_id`, `izin_id`) ·
kedua _foreign key_ utama ON DELETE CASCADE

**Urutan evaluasi izin** — `cabut` pada `pengguna_izin` mengalahkan `berikan` dari peran; `berikan`
pada `pengguna_izin` menambah izin di luar peran. Urutan lengkap dijelaskan pada Bagian E § E.5.

---

### D.3.7 Tabel `pengguna_unit_akses` (penghubung)

**Kolom** — `pengguna_id` (PK, FK, NN), `unit_kerja_id` (PK, FK, NN), `termasuk_bawahan` BOOLEAN NN
DEFAULT 1, `ditetapkan_oleh` (FK), `dibuat_pada` (NN)

**Constraint** — `pk_pengguna_unit_akses` PRIMARY KEY (`pengguna_id`, `unit_kerja_id`) ·
kedua _foreign key_ ON DELETE CASCADE · `idx_pengguna_unit_akses_unit` INDEX (`unit_kerja_id`)

---

### D.3.8 Tabel `token_reset_sandi`

| Kolom              | Tipe Data       | Penanda     | Deskripsi                                               |
| ------------------ | --------------- | ----------- | ------------------------------------------------------- |
| `id`               | BIGINT UNSIGNED | PK, NN      | —                                                       |
| `pengguna_id`      | BIGINT UNSIGNED | FK, NN, IDX | —                                                       |
| `token_hash`       | CHAR(64)        | UQ, NN      | _Hash_ dari _token_; nilai asli hanya dikirim via surel |
| `kedaluwarsa_pada` | DATETIME        | NN, IDX     | Baku 60 menit setelah pembuatan                         |
| `dipakai_pada`     | DATETIME        | —           | `NULL` berarti belum dipakai                            |
| `ip_hash`          | CHAR(64)        | —           | Alamat IP pemohon                                       |
| `dibuat_pada`      | DATETIME        | NN          | —                                                       |

**Constraint** — `pk_token_reset_sandi` PRIMARY KEY (`id`) · `uq_token_reset_hash` UNIQUE (`token_hash`) ·
`fk_token_reset_pengguna` → `pengguna(id)` ON DELETE CASCADE

---

## D.4 Subsistem Konten Informasi Hukum

### D.4.1 Tabel `berita`

| Kolom                                              | Tipe Data                                                 | Penanda | Nilai Baku     | Deskripsi                                     |
| -------------------------------------------------- | --------------------------------------------------------- | ------- | -------------- | --------------------------------------------- |
| `id`                                               | BIGINT UNSIGNED                                           | PK, NN  | AUTO_INCREMENT | —                                             |
| `judul`                                            | VARCHAR(255)                                              | NN      | —              | —                                             |
| `slug`                                             | VARCHAR(275)                                              | UQ, NN  | —              | —                                             |
| `tipe`                                             | ENUM(`berita`,`artikel_hukum`,`pengumuman`,`siaran_pers`) | NN, IDX | `'berita'`     | —                                             |
| `kategori_berita_id`                               | BIGINT UNSIGNED                                           | FK, IDX | NULL           | —                                             |
| `ringkasan`                                        | VARCHAR(500)                                              | —       | NULL           | Untuk kartu daftar dan metadata sosial        |
| `isi`                                              | LONGTEXT                                                  | NN      | —              | HTML tersanitasi                              |
| `gambar_utama`                                     | VARCHAR(255)                                              | —       | NULL           | —                                             |
| `sumber`                                           | VARCHAR(255)                                              | —       | NULL           | Sumber kutipan bila konten bukan tulisan asli |
| `penulis_id`                                       | BIGINT UNSIGNED                                           | FK, NN  | —              | —                                             |
| `penulis_nama_tampil`                              | VARCHAR(150)                                              | —       | NULL           | Nama tampil alternatif                        |
| `status`                                           | ENUM(`draf`,`ditinjau`,`terbit`,`arsip`)                  | NN, IDX | `'draf'`       | —                                             |
| `diterbitkan_pada`                                 | DATETIME                                                  | —       | NULL, IDX      | —                                             |
| `jumlah_dilihat`                                   | INT UNSIGNED                                              | NN      | 0              | —                                             |
| `is_disorot`                                       | BOOLEAN                                                   | NN, IDX | 0              | —                                             |
| `meta_judul`                                       | VARCHAR(255)                                              | —       | NULL           | SEO                                           |
| `meta_deskripsi`                                   | VARCHAR(500)                                              | —       | NULL           | SEO                                           |
| `dibuat_pada` / `diperbarui_pada` / `dihapus_pada` | DATETIME                                                  | —       | —              | —                                             |

**Constraint** — `pk_berita` PRIMARY KEY (`id`) · `uq_berita_slug` UNIQUE (`slug`) ·
`fk_berita_kategori` → `kategori_berita(id)` ON DELETE SET NULL ·
`fk_berita_penulis` → `pengguna(id)` ON DELETE RESTRICT ·
`ck_berita_terbit_wajib_waktu` CHECK (`status` <> 'terbit' OR `diterbitkan_pada` IS NOT NULL) ·
`idx_berita_daftar` INDEX (`status`, `tipe`, `diterbitkan_pada` DESC, `dihapus_pada`) ·
`ft_berita_pencarian` FULLTEXT (`judul`, `ringkasan`, `isi`)

---

### D.4.2 Tabel `kategori_berita`

**Kolom** — `id` (PK), `nama` VARCHAR(100) NN UQ, `slug` VARCHAR(120) NN UQ,
`deskripsi` VARCHAR(255), `is_aktif` BOOLEAN NN DEFAULT 1, `urutan` SMALLINT UNSIGNED NN,
`dibuat_pada`, `diperbarui_pada`

**Constraint** — `pk_kategori_berita` PRIMARY KEY (`id`) · `uq_kategori_berita_nama` UNIQUE (`nama`) ·
`uq_kategori_berita_slug` UNIQUE (`slug`)

---

### D.4.3 Tabel `berita_tag` dan `berita_dokumen` (penghubung)

`berita_tag` — `berita_id` (PK, FK), `tag_id` (PK, FK). Keduanya ON DELETE CASCADE ·
`idx_berita_tag_tag` INDEX (`tag_id`)

`berita_dokumen` — `berita_id` (PK, FK), `dokumen_id` (PK, FK), `keterangan` VARCHAR(255).
Keduanya ON DELETE CASCADE · `idx_berita_dokumen_dokumen` INDEX (`dokumen_id`) — menopang blok
"Berita terkait" pada halaman detail dokumen

---

### D.4.4 Tabel `halaman`

| Kolom                             | Tipe Data             | Penanda | Deskripsi                                    |
| --------------------------------- | --------------------- | ------- | -------------------------------------------- |
| `id`                              | BIGINT UNSIGNED       | PK, NN  | —                                            |
| `judul`                           | VARCHAR(200)          | NN      | —                                            |
| `slug`                            | VARCHAR(220)          | UQ, NN  | —                                            |
| `isi`                             | LONGTEXT              | —       | HTML tersanitasi                             |
| `induk_id`                        | BIGINT UNSIGNED       | FK, IDX | Halaman induk                                |
| `templat`                         | VARCHAR(50)           | NN      | `baku`, `lebar_penuh`, `kontak`, `statistik` |
| `status`                          | ENUM(`draf`,`terbit`) | NN, IDX | —                                            |
| `is_sistem`                       | BOOLEAN               | NN      | Halaman sistem tidak dapat dihapus           |
| `urutan`                          | SMALLINT UNSIGNED     | NN      | —                                            |
| `meta_judul` / `meta_deskripsi`   | VARCHAR               | —       | SEO                                          |
| `disusun_oleh`                    | BIGINT UNSIGNED       | FK      | —                                            |
| `dibuat_pada` / `diperbarui_pada` | DATETIME              | —       | —                                            |

**Constraint** — `pk_halaman` PRIMARY KEY (`id`) · `uq_halaman_slug` UNIQUE (`slug`) ·
`fk_halaman_induk` → `halaman(id)` ON DELETE RESTRICT ·
`fk_halaman_penyusun` → `pengguna(id)` ON DELETE SET NULL ·
pencegahan `induk_id` = `id` ditegakkan di lapisan aplikasi (lihat § D.0.1)

---

### D.4.5 Tabel `menu` dan `menu_item`

`menu` — `id` (PK), `kode` VARCHAR(40) NN UQ, `nama` VARCHAR(80) NN,
`lokasi` ENUM(`header`,`footer`,`sidebar`,`kaki_kolom_1`,`kaki_kolom_2`) NN, `dibuat_pada`,
`diperbarui_pada`. Constraint: `uq_menu_kode` UNIQUE (`kode`)

`menu_item`

| Kolom            | Tipe Data                                                                         | Penanda     | Deskripsi                   |
| ---------------- | --------------------------------------------------------------------------------- | ----------- | --------------------------- |
| `id`             | BIGINT UNSIGNED                                                                   | PK, NN      | —                           |
| `menu_id`        | BIGINT UNSIGNED                                                                   | FK, NN, IDX | —                           |
| `induk_id`       | BIGINT UNSIGNED                                                                   | FK, IDX     | Butir induk                 |
| `label`          | VARCHAR(100)                                                                      | NN          | —                           |
| `tipe_target`    | ENUM(`beranda`,`halaman`,`jenis_peraturan`,`kategori`,`berita`,`url`,`pencarian`) | NN          | Relasi polimorfik           |
| `target_id`      | BIGINT UNSIGNED                                                                   | —           | Pengenal entitas target     |
| `url`            | VARCHAR(500)                                                                      | —           | Untuk `tipe_target = 'url'` |
| `ikon`           | VARCHAR(60)                                                                       | —           | —                           |
| `target_jendela` | ENUM(`sama`,`baru`)                                                               | NN          | —                           |
| `is_aktif`       | BOOLEAN                                                                           | NN, IDX     | —                           |
| `urutan`         | SMALLINT UNSIGNED                                                                 | NN          | —                           |

**Constraint** — `pk_menu_item` PRIMARY KEY (`id`) ·
`fk_menu_item_menu` → `menu(id)` ON DELETE CASCADE ·
`fk_menu_item_induk` → `menu_item(id)` ON DELETE CASCADE ·
`ck_menu_item_target` CHECK (`tipe_target` <> 'url' OR `url` IS NOT NULL) ·
pencegahan `induk_id` = `id` ditegakkan di lapisan aplikasi (§ D.0.1) ·
`idx_menu_item_susunan` INDEX (`menu_id`, `induk_id`, `urutan`)

---

### D.4.6 Tabel `banner`, `media`, `tautan_terkait`, `faq`

`banner` — `id` (PK), `judul` VARCHAR(200) NN, `subjudul` VARCHAR(300), `gambar` VARCHAR(255) NN,
`gambar_seluler` VARCHAR(255), `tautan` VARCHAR(500), `label_tombol` VARCHAR(50),
`tanggal_mulai` DATE, `tanggal_selesai` DATE, `is_aktif` BOOLEAN NN IDX, `urutan` SMALLINT UNSIGNED NN,
`dibuat_oleh` (FK), `dibuat_pada`, `diperbarui_pada`.
Constraint: `ck_banner_periode` CHECK (`tanggal_selesai` IS NULL OR `tanggal_selesai` >= `tanggal_mulai`) ·
`idx_banner_tampil` INDEX (`is_aktif`, `tanggal_mulai`, `tanggal_selesai`, `urutan`)

`media` — `id` (PK), `nama_asli` VARCHAR(255) NN, `nama_simpan` VARCHAR(100) NN,
`path` VARCHAR(500) NN UQ, `disk` VARCHAR(30) NN, `mime_type` VARCHAR(100) NN,
`ukuran_bytes` BIGINT UNSIGNED NN, `lebar` SMALLINT UNSIGNED, `tinggi` SMALLINT UNSIGNED,
`teks_alternatif` VARCHAR(255), `folder` VARCHAR(100) IDX, `hash_sha256` CHAR(64) IDX,
`diunggah_oleh` (FK), `dibuat_pada`.
Constraint: `uq_media_path` UNIQUE (`path`) · `ck_media_ukuran` CHECK (`ukuran_bytes` > 0)

`tautan_terkait` — `id` (PK), `nama` VARCHAR(150) NN, `url` VARCHAR(500) NN, `logo` VARCHAR(255),
`kelompok` ENUM(`jdihn`,`kementerian`,`perguruan_tinggi`,`internal`,`lainnya`) NN IDX,
`deskripsi` VARCHAR(255), `is_aktif` BOOLEAN NN, `urutan` SMALLINT UNSIGNED NN,
`dibuat_pada`, `diperbarui_pada`.
Constraint: `uq_tautan_terkait_url` UNIQUE (`url`)

`faq` — `id` (PK), `pertanyaan` VARCHAR(500) NN, `jawaban` TEXT NN, `kelompok` VARCHAR(60) IDX,
`is_aktif` BOOLEAN NN, `urutan` SMALLINT UNSIGNED NN, `dibuat_pada`, `diperbarui_pada`

---

## D.5 Subsistem Interaksi Publik, Sistem, dan Audit

### D.5.1 Tabel `pesan_kontak`

| Kolom                | Tipe Data                                | Penanda | Deskripsi                 |
| -------------------- | ---------------------------------------- | ------- | ------------------------- |
| `id`                 | BIGINT UNSIGNED                          | PK, NN  | —                         |
| `nama`               | VARCHAR(150)                             | NN      | —                         |
| `email`              | VARCHAR(190)                             | NN, IDX | —                         |
| `no_telepon`         | VARCHAR(25)                              | —       | —                         |
| `subjek`             | VARCHAR(255)                             | NN      | —                         |
| `pesan`              | TEXT                                     | NN      | —                         |
| `status`             | ENUM(`baru`,`diproses`,`selesai`,`spam`) | NN, IDX | —                         |
| `ditangani_oleh`     | BIGINT UNSIGNED                          | FK      | —                         |
| `catatan_penanganan` | TEXT                                     | —       | —                         |
| `ditangani_pada`     | DATETIME                                 | —       | —                         |
| `ip_hash`            | CHAR(64)                                 | NN, IDX | Penegakan pembatasan laju |
| `dibuat_pada`        | DATETIME                                 | NN, IDX | —                         |

**Constraint** — `pk_pesan_kontak` PRIMARY KEY (`id`) ·
`fk_pesan_kontak_penangan` → `pengguna(id)` ON DELETE SET NULL ·
`idx_pesan_kontak_status_waktu` INDEX (`status`, `dibuat_pada` DESC) ·
`idx_pesan_kontak_ip_waktu` INDEX (`ip_hash`, `dibuat_pada`)

---

### D.5.2 Tabel `log_pencarian`

**Kolom** — `id` (PK), `kata_kunci` VARCHAR(255) IDX, `filter` JSON, `jumlah_hasil` INT UNSIGNED NN,
`pengguna_id` (FK), `ip_hash` CHAR(64), `dibuat_pada` DATETIME NN IDX

**Constraint** — `pk_log_pencarian` PRIMARY KEY (`id`) ·
`fk_log_pencarian_pengguna` → `pengguna(id)` ON DELETE SET NULL ·
`idx_log_pencarian_kata_waktu` INDEX (`kata_kunci`, `dibuat_pada`)

**Retensi** — baris lebih lama dari 12 bulan dihapus oleh tugas terjadwal, setelah agregasi kata
kunci populer disimpan pada tabel ringkasan (atau _cache_).

---

### D.5.3 Tabel `pengaturan`

| Kolom             | Tipe Data                                                     | Penanda | Deskripsi                                                                     |
| ----------------- | ------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------- |
| `id`              | BIGINT UNSIGNED                                               | PK, NN  | —                                                                             |
| `kunci`           | VARCHAR(100)                                                  | UQ, NN  | Contoh `situs.nama`, `unggahan.ukuran_maks_mb`                                |
| `nilai`           | TEXT                                                          | —       | Disimpan sebagai teks; dikonversi sesuai `tipe`                               |
| `tipe`            | ENUM(`teks`,`angka`,`boolean`,`json`,`berkas`,`teks_panjang`) | NN      | —                                                                             |
| `grup`            | VARCHAR(40)                                                   | NN, IDX | `umum`, `tampilan`, `unggahan`, `akses`, `surel`, `integrasi`, `pemeliharaan` |
| `label`           | VARCHAR(150)                                                  | NN      | Label antarmuka                                                               |
| `deskripsi`       | VARCHAR(255)                                                  | —       | —                                                                             |
| `is_publik`       | BOOLEAN                                                       | NN      | `1` bila nilai boleh diekspos ke sisi klien                                   |
| `is_terenkripsi`  | BOOLEAN                                                       | NN      | `1` untuk nilai sensitif (kredensial integrasi)                               |
| `urutan`          | SMALLINT UNSIGNED                                             | NN      | —                                                                             |
| `diperbarui_oleh` | BIGINT UNSIGNED                                               | FK      | —                                                                             |
| `diperbarui_pada` | DATETIME                                                      | —       | —                                                                             |

**Constraint** — `pk_pengaturan` PRIMARY KEY (`id`) · `uq_pengaturan_kunci` UNIQUE (`kunci`) ·
`fk_pengaturan_pengubah` → `pengguna(id)` ON DELETE SET NULL

---

### D.5.4 Tabel `log_aktivitas`

| Kolom            | Tipe Data       | Penanda | Deskripsi                                                                         |
| ---------------- | --------------- | ------- | --------------------------------------------------------------------------------- |
| `id`             | BIGINT UNSIGNED | PK, NN  | —                                                                                 |
| `pengguna_id`    | BIGINT UNSIGNED | FK, IDX | `NULL` untuk aksi sistem                                                          |
| `pelaku_nama`    | VARCHAR(150)    | —       | Cuplikan nama pelaku, bertahan meski akun dihapus                                 |
| `peran_saat_itu` | VARCHAR(40)     | —       | Cuplikan peran                                                                    |
| `aksi`           | VARCHAR(50)     | NN, IDX | `buat`, `ubah`, `hapus`, `pulihkan`, `terbitkan`, `tarik`, `login`, `konfigurasi` |
| `entitas`        | VARCHAR(60)     | NN, IDX | Nama tabel entitas terdampak                                                      |
| `entitas_id`     | BIGINT UNSIGNED | IDX     | —                                                                                 |
| `deskripsi`      | VARCHAR(500)    | —       | Ringkasan yang dapat dibaca manusia                                               |
| `data_lama`      | JSON            | —       | Nilai sebelum perubahan (kolom sensitif disamarkan)                               |
| `data_baru`      | JSON            | —       | Nilai setelah perubahan                                                           |
| `ip_hash`        | CHAR(64)        | —       | —                                                                                 |
| `agen_ringkas`   | VARCHAR(150)    | —       | —                                                                                 |
| `dibuat_pada`    | DATETIME        | NN, IDX | —                                                                                 |

**Constraint** — `pk_log_aktivitas` PRIMARY KEY (`id`) ·
`fk_log_aktivitas_pengguna` → `pengguna(id)` ON DELETE SET NULL ·
`idx_log_aktivitas_entitas` INDEX (`entitas`, `entitas_id`, `dibuat_pada` DESC) ·
`idx_log_aktivitas_pelaku_waktu` INDEX (`pengguna_id`, `dibuat_pada` DESC)

**Kebijakan** — tanpa operasi `UPDATE` atau `DELETE` melalui aplikasi (NFR-19). Pemangkasan hanya
melalui prosedur arsip terjadwal oleh administrator basis data, setelah pengarsipan ke penyimpanan
dingin. Kolom sensitif (`kata_sandi`, `rahasia_2fa`, `token_*`) **wajib** disamarkan sebelum masuk
`data_lama`/`data_baru`.

---

### D.5.5 Tabel `log_autentikasi`

**Kolom** — `id` (PK), `pengguna_id` (FK, IDX), `email_dicoba` VARCHAR(190) IDX,
`aksi` ENUM(`login_berhasil`,`login_gagal`,`logout`,`terkunci`,`reset_diminta`,`reset_berhasil`,`2fa_gagal`,`2fa_berhasil`) NN IDX,
`keterangan` VARCHAR(255), `ip_hash` CHAR(64) NN IDX, `agen_ringkas` VARCHAR(150),
`dibuat_pada` DATETIME NN IDX

**Constraint** — `pk_log_autentikasi` PRIMARY KEY (`id`) ·
`fk_log_autentikasi_pengguna` → `pengguna(id)` ON DELETE SET NULL ·
`idx_log_autentikasi_email_waktu` INDEX (`email_dicoba`, `dibuat_pada`) — penegakan pembatasan
percobaan login (FR-084) ·
`idx_log_autentikasi_ip_waktu` INDEX (`ip_hash`, `dibuat_pada`)

---

### D.5.6 Tabel `notifikasi`

**Kolom** — `id` (PK), `pengguna_id` (FK, NN, IDX), `tipe` VARCHAR(50) NN,
`judul` VARCHAR(200) NN, `pesan` VARCHAR(500) NN, `tautan` VARCHAR(500),
`entitas` VARCHAR(60), `entitas_id` BIGINT UNSIGNED, `dibaca_pada` DATETIME,
`dibuat_pada` DATETIME NN

**Constraint** — `pk_notifikasi` PRIMARY KEY (`id`) ·
`fk_notifikasi_pengguna` → `pengguna(id)` ON DELETE CASCADE ·
`idx_notifikasi_penerima` INDEX (`pengguna_id`, `dibaca_pada`, `dibuat_pada` DESC)

---

## D.6 Subsistem Layanan Hukum _(opsional, Fase 3)_

### D.6.1 Tabel `layanan_hukum`

**Kolom** — `id` (PK), `kode` VARCHAR(30) NN UQ, `nama` VARCHAR(150) NN, `deskripsi` TEXT,
`sla_hari` SMALLINT UNSIGNED NN, `definisi_formulir` JSON, `unit_penanggung_jawab_id` (FK),
`is_aktif` BOOLEAN NN, `urutan` SMALLINT UNSIGNED NN, `dibuat_pada`, `diperbarui_pada`

**Constraint** — `uq_layanan_hukum_kode` UNIQUE (`kode`) ·
`fk_layanan_hukum_unit` → `unit_kerja(id)` ON DELETE RESTRICT ·
`ck_layanan_hukum_sla` CHECK (`sla_hari` BETWEEN 1 AND 365)

### D.6.2 Tabel `permintaan_layanan`

| Kolom                             | Tipe Data                                                             | Penanda     | Deskripsi                             |
| --------------------------------- | --------------------------------------------------------------------- | ----------- | ------------------------------------- |
| `id`                              | BIGINT UNSIGNED                                                       | PK, NN      | —                                     |
| `nomor_tiket`                     | VARCHAR(30)                                                           | UQ, NN      | `LYN-2026-000045`                     |
| `layanan_hukum_id`                | BIGINT UNSIGNED                                                       | FK, NN, IDX | —                                     |
| `pemohon_id`                      | BIGINT UNSIGNED                                                       | FK, NN, IDX | —                                     |
| `unit_kerja_id`                   | BIGINT UNSIGNED                                                       | FK, NN, IDX | Unit asal permohonan                  |
| `judul`                           | VARCHAR(255)                                                          | NN          | —                                     |
| `uraian`                          | TEXT                                                                  | NN          | —                                     |
| `data_formulir`                   | JSON                                                                  | —           | Jawaban atas formulir dinamis layanan |
| `status`                          | ENUM(`baru`,`ditelaah`,`butuh_info`,`selesai`,`ditolak`,`dibatalkan`) | NN, IDX     | —                                     |
| `prioritas`                       | ENUM(`rendah`,`normal`,`tinggi`,`segera`)                             | NN          | —                                     |
| `ditugaskan_ke`                   | BIGINT UNSIGNED                                                       | FK, IDX     | —                                     |
| `tenggat`                         | DATE                                                                  | IDX         | Dihitung dari `sla_hari`              |
| `hasil_telaah`                    | TEXT                                                                  | —           | —                                     |
| `dokumen_hasil_id`                | BIGINT UNSIGNED                                                       | FK          | Dokumen yang dihasilkan bila ada      |
| `diselesaikan_pada`               | DATETIME                                                              | —           | —                                     |
| `dibuat_pada` / `diperbarui_pada` | DATETIME                                                              | —           | —                                     |

**Constraint** — `uq_permintaan_layanan_tiket` UNIQUE (`nomor_tiket`) ·
`fk_permintaan_layanan_layanan` → `layanan_hukum(id)` ON DELETE RESTRICT ·
`fk_permintaan_layanan_pemohon` → `pengguna(id)` ON DELETE RESTRICT ·
`fk_permintaan_layanan_unit` → `unit_kerja(id)` ON DELETE RESTRICT ·
`fk_permintaan_layanan_penelaah` → `pengguna(id)` ON DELETE SET NULL ·
`fk_permintaan_layanan_dokumen` → `dokumen(id)` ON DELETE SET NULL ·
`ck_permintaan_layanan_selesai` CHECK (`status` <> 'selesai' OR `diselesaikan_pada` IS NOT NULL)

### D.6.3 Tabel `permintaan_layanan_berkas` dan `permintaan_layanan_log`

`permintaan_layanan_berkas` — `id` (PK), `permintaan_layanan_id` (FK, NN, IDX),
`jenis` ENUM(`lampiran_pemohon`,`hasil_telaah`,`dokumen_pendukung`) NN, `nama_asli` VARCHAR(255) NN,
`path` VARCHAR(500) NN UQ, `disk` VARCHAR(30) NN, `mime_type` VARCHAR(100) NN,
`ukuran_bytes` BIGINT UNSIGNED NN, `hash_sha256` CHAR(64) NN, `diunggah_oleh` (FK), `dibuat_pada`.
ON DELETE CASCADE pada `permintaan_layanan_id`

`permintaan_layanan_log` — `id` (PK), `permintaan_layanan_id` (FK, NN, IDX),
`status_dari` VARCHAR(30), `status_ke` VARCHAR(30) NN, `aksi` VARCHAR(50) NN, `catatan` TEXT,
`is_terlihat_pemohon` BOOLEAN NN, `oleh_id` (FK), `dibuat_pada` DATETIME NN.
ON DELETE CASCADE pada `permintaan_layanan_id`

---

## D.7 Rekapitulasi Tabel dan Pertimbangan Teknis

### D.7.1 Rekapitulasi

| Subsistem                      | Jumlah Tabel | Fase |
| ------------------------------ | :----------: | :--: |
| Master data dan referensi      |      7       |  1   |
| Dokumen hukum                  |      14      | 1–2  |
| Pengguna, peran, dan otorisasi |      8       |  1   |
| Konten informasi hukum         |      10      | 1–2  |
| Interaksi publik               |      3       | 1–2  |
| Sistem, audit, dan notifikasi  |      4       |  1   |
| Layanan hukum (opsional)       |      4       |  3   |
| **Total**                      |    **50**    |  —   |

Tabel wajib pada Fase 1 (rilis minimum yang dapat dioperasikan): 33 tabel — seluruh master data,
`dokumen`, `dokumen_berkas`, `dokumen_kategori`, `dokumen_tag`, `dokumen_relasi`, `dokumen_alur`,
`unduhan`, subsistem pengguna dan otorisasi lengkap, `pengaturan`, `log_aktivitas`,
`log_autentikasi`, `halaman`, `berita`, `kategori_berita`, `berita_tag`.

### D.7.2 Tabel Kritis Kinerja dan Strategi Penanganannya

| Tabel                      | Risiko                                         | Strategi                                                                                                        |
| -------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `dokumen`                  | Kueri terpanas; kolom `isi_teks` sangat besar  | Indeks komposit `idx_dokumen_daftar_publik`; `isi_teks` dimuat tertunda; pencarian didelegasikan ke Meilisearch |
| `unduhan`                  | Pertumbuhan tercepat                           | Partisi bulanan; agregasi harian ke `dokumen_statistik_harian`; peringkasan setelah 18 bulan (NFR-22)           |
| `log_aktivitas`            | Pertumbuhan cepat; kolom JSON besar            | Partisi bulanan; pengarsipan ke penyimpanan dingin setelah 3 tahun                                              |
| `log_pencarian`            | Pertumbuhan cepat, nilai jangka panjang rendah | Retensi 12 bulan; agregasi kata kunci populer ke _cache_                                                        |
| `dokumen_relasi`           | Kueri dua arah pada setiap tampilan detail     | Indeks pada kedua kolom dokumen; hasil gabungan di-_cache_ per dokumen                                          |
| `dokumen_statistik_harian` | Tumbuh linear terhadap (jumlah dokumen × hari) | Peringkasan menjadi agregat bulanan setelah 24 bulan                                                            |

### D.7.3 Padanan PostgreSQL

Bila PostgreSQL dipilih (lihat Bagian G § G.2 untuk pertimbangan pemilihan):

| MySQL 8.0                          | PostgreSQL 15+                                     | Catatan                                                                                                                                 |
| ---------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `BIGINT UNSIGNED AUTO_INCREMENT`   | `BIGINT GENERATED ALWAYS AS IDENTITY`              | PostgreSQL tidak memiliki tipe _unsigned_; tambahkan `CHECK (id > 0)` bila diperlukan                                                   |
| `ENUM(...)`                        | `CREATE TYPE ... AS ENUM` atau `VARCHAR` + `CHECK` | Tipe ENUM PostgreSQL lebih mudah diperluas dengan `ALTER TYPE ... ADD VALUE`                                                            |
| `JSON`                             | `JSONB`                                            | `JSONB` mendukung pengindeksan GIN dan kueri operator                                                                                   |
| `FULLTEXT INDEX`                   | `tsvector` + indeks `GIN`                          | Mendukung _stemming_; konfigurasi kamus bahasa Indonesia perlu ditambahkan                                                              |
| Generated column `STORED`          | `GENERATED ALWAYS AS (...) STORED`                 | Sintaks setara                                                                                                                          |
| Partisi + tanpa dukungan FK        | Partisi deklaratif **dengan** dukungan FK          | **Keunggulan utama PostgreSQL** untuk tabel `unduhan` dan `log_aktivitas`                                                               |
| `uq_dokumen_identitas` penuh       | _Partial unique index_                             | Memungkinkan penegakan BR-02 dan BR-03 sepenuhnya di tingkat basis data: `CREATE UNIQUE INDEX ... WHERE lingkup_penomoran = 'institut'` |
| `REGEXP` pada CHECK                | `~` (operator regex)                               | Sintaks berbeda                                                                                                                         |
| `INSERT … ON DUPLICATE KEY UPDATE` | `INSERT … ON CONFLICT … DO UPDATE`                 | Setara fungsional                                                                                                                       |

**Kesimpulan** — PostgreSQL memberikan tiga keunggulan nyata bagi sistem ini: _partial unique index_
(penegakan BR-02/BR-03 di tingkat basis data), _foreign key_ pada tabel terpartisi, dan pencarian
penuh teks yang lebih baik. MySQL dipilih sebagai rekomendasi utama karena ketersediaan dukungan
operasional yang lebih luas pada infrastruktur perguruan tinggi di Indonesia. Keputusan final
sebaiknya diambil bersama UPT TIK berdasarkan kapasitas pemeliharaan yang ada.

---

## D.8 Hasil Pengujian Skema

DDL dan data referensi telah dieksekusi pada instans MariaDB 10.4.32 dan diuji perilakunya. Tabel
berikut mencatat pengujian yang dijalankan beserta hasilnya — berguna sebagai dasar penyusunan
pengujian otomatis pada tahap implementasi (lihat Bagian G § G.8).

| No  | Pengujian                                                     | Hasil yang Diharapkan                                                          | Hasil Aktual                                                                                                    |
| --- | ------------------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| 1   | Eksekusi `jdih_ith_schema.sql`                                | 50 tabel, 3 _view_, 4 _trigger_ terbentuk                                      | ✔ 50 tabel, 3 _view_, 85 FK, 38 _unique_, 33 _check_, 4 _trigger_                                               |
| 2   | Eksekusi `jdih_ith_seed.sql`                                  | Data referensi termuat tanpa galat                                             | ✔ selesai tanpa galat                                                                                           |
| 3   | Jumlah izin per peran                                         | Superadmin 74, Admin 35, Dosen/Staf 13, Pengunjung 2 dari total 76             | ✔ persis sesuai matriks Bagian E § E.4                                                                          |
| 4   | Normalisasi nomor: simpan `'  12  '`                          | `nomor_normal` terisi `'12'`                                                   | ✔ kolom terkomputasi bekerja                                                                                    |
| 5   | Simpan nomor `'12'` pada jenis + tahun + unit yang sama       | Ditolak sebagai duplikat                                                       | ✔ galat 1062 `uq_dokumen_identitas` — **membuktikan FR-029/FR-030 ditegakkan basis data, bukan hanya aplikasi** |
| 6   | Simpan dokumen bertahun 1800                                  | Ditolak                                                                        | ✔ `ck_dokumen_tahun` gagal                                                                                      |
| 7   | Simpan `status_publikasi = 'terbit'` tanpa `diterbitkan_pada` | Ditolak                                                                        | ✔ `ck_dokumen_terbit_wajib_waktu` gagal                                                                         |
| 8   | Tetapkan `induk_id = id` pada unit kerja                      | Ditolak beserta pesan berbahasa Indonesia                                      | ✔ _trigger_ menolak dengan SQLSTATE 45000                                                                       |
| 9   | Simpan relasi dokumen ke dirinya sendiri                      | Ditolak                                                                        | ✔ `ck_dokumen_relasi_bukan_diri` gagal (BR-20)                                                                  |
| 10  | Simpan **satu** baris relasi "mengubah"                       | `v_dokumen_relasi_dua_arah` menampilkan dua arah: "Mengubah" dan "Diubah oleh" | ✔ dua arah diturunkan dari satu baris — **membuktikan BR-19 bekerja tanpa redundansi**                          |
| 11  | Hapus dokumen yang menjadi sasaran relasi                     | Ditolak                                                                        | ✔ galat 1451 `fk_dokumen_relasi_terkait` (BR-21)                                                                |
| 12  | Ubah tingkat akses dokumen menjadi `rahasia`                  | Dokumen hilang dari `v_dokumen_publik`                                         | ✔ 2 dokumen di tabel, 1 tampil publik (BR-13)                                                                   |
| 13  | Hapus dokumen yang memiliki berkas dan relasi                 | Berkas dan relasi ikut terhapus                                                | ✔ CASCADE bekerja (berkas 1→0, relasi 1→0)                                                                      |
| 14  | Pengajuan akses kedua saat yang pertama masih `menunggu`      | Ditolak                                                                        | ✔ galat 1062 `uq_permintaan_akses_menunggu`                                                                     |
| 15  | Pengajuan ulang setelah pengajuan pertama `ditolak`           | Diterima; riwayat penolakan tetap tersimpan                                    | ✔ baris `ditolak` ber-`kunci_menunggu` `NULL`, pengajuan baru diterima                                          |

**Catatan** — pengujian dilakukan pada MariaDB 10.4.32 karena itulah yang tersedia di lingkungan
pengembangan. Ketiga batasan pada § D.0.1 berlaku setara pada MySQL 8.0, sehingga hasil ini dapat
dipakai sebagai acuan. Verifikasi ulang tetap dianjurkan pada versi DBMS yang akhirnya dipilih untuk
produksi.

---

**Lanjut ke** → [E. Role & Permission Matrix](05-role-permission.md)
