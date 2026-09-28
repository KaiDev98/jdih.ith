# H. NORMALISASI BASIS DATA

Portal JDIH ITH Parepare

---

## H.1 Tujuan dan Pendekatan

Rancangan basis data disusun untuk mencapai **Third Normal Form (3NF)** pada seluruh tabel, dengan
sebagian tabel telah memenuhi **Boyce-Codd Normal Form (BCNF)**. Beberapa penyimpangan dari bentuk
normal dilakukan **secara sengaja dan terkendali** untuk alasan kinerja atau integritas historis;
setiap penyimpangan dicantumkan beserta justifikasi dan mekanisme pemeliharaan konsistensinya pada
§ H.7.

Pendekatan yang dipakai: mulai dari rancangan tidak ternormalisasi (_unnormalized form_, UNF) yang
mencerminkan cara data dicatat secara manual saat ini, lalu diuraikan bertahap.

---

## H.2 Bentuk Tidak Ternormalisasi (UNF)

Berikut representasi data sebagaimana umumnya dicatat pada lembar kerja manual — titik awal analisis:

```
DOKUMEN_HUKUM (
    nomor,
    tahun,
    jenis_peraturan,                 ← teks bebas: "Peraturan Rektor", "PERREK", "Per. Rektor"
    bentuk_singkat,
    judul,
    tanggal_penetapan,
    tempat_penetapan,
    penandatangan,
    jabatan_penandatangan,
    unit_kerja,                      ← teks bebas: "Biro Akademik", "BAAK", "Biro AK"
    unit_kerja_induk,
    kepala_unit_kerja,
    kategori,                        ← MULTINILAI: "Akademik, Kurikulum, Kemahasiswaan"
    kata_kunci,                      ← MULTINILAI: "kurikulum; OBE; sarjana"
    status_keberlakuan,
    warna_status,
    nama_berkas,                     ← MULTINILAI: "naskah.pdf, lampiran1.pdf"
    ukuran_berkas,                   ← MULTINILAI
    jumlah_halaman_berkas,           ← MULTINILAI
    peraturan_yang_diubah,           ← MULTINILAI
    peraturan_yang_mencabut,         ← MULTINILAI
    dasar_hukum,                     ← MULTINILAI
    nama_penginput,
    email_penginput,
    unit_penginput,
    nama_verifikator,
    email_verifikator,
    tanggal_unduhan,                 ← MULTINILAI
    pengunduh,                       ← MULTINILAI
    abstrak,
    sumber,
    bahasa,
    penerbit
)
```

### H.2.1 Anomali pada UNF

| Jenis Anomali                | Contoh Konkret pada Data JDIH                                                                                                                                                                             |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Anomali penyisipan**       | Kategori baru "Kerja Sama Internasional" tidak dapat didaftarkan sebelum ada dokumen yang memakainya. Unit kerja baru tidak dapat dicatat sebelum menerbitkan dokumen                                     |
| **Anomali pemutakhiran**     | Perubahan nama "Biro Akademik dan Kemahasiswaan" menjadi "Biro Akademik, Kemahasiswaan, dan Alumni" harus diubah pada ratusan baris dokumen. Bila sebagian terlewat, laporan per unit kerja menjadi salah |
| **Anomali penghapusan**      | Menghapus satu-satunya dokumen berjenis "Peraturan Senat" menghilangkan keberadaan jenis peraturan tersebut dari sistem                                                                                   |
| **Redundansi**               | Nama dan surel penginput terulang pada setiap dokumen yang diinputnya; nama jenis peraturan terulang ratusan kali                                                                                         |
| **Ketidakkonsistenan**       | Jenis peraturan yang sama tertulis sebagai "Peraturan Rektor", "PERREK", "Per. Rektor", dan "peraturan rektor" — membuat penyaring dan rekapitulasi tidak dapat dipercaya                                 |
| **Kolom multinilai**         | Kategori, kata kunci, berkas, dan relasi tersimpan sebagai daftar dalam satu sel — tidak dapat disaring, diurutkan, atau dihitung secara andal                                                            |
| **Pertumbuhan tak terbatas** | Riwayat unduhan tidak mungkin ditampung pada baris dokumen                                                                                                                                                |

---

## H.3 Proses Normalisasi Bertahap

### H.3.1 Bentuk Normal Pertama (1NF)

**Syarat**: setiap sel memuat satu nilai atomik; tidak ada kelompok berulang; setiap baris unik.

**Pelanggaran yang ditemukan dan dekomposisinya:**

| Kolom Multinilai pada UNF                                         | Tabel Hasil Dekomposisi           | Relasi       |
| ----------------------------------------------------------------- | --------------------------------- | ------------ |
| `kategori`                                                        | `kategori` + `dokumen_kategori`   | M:N          |
| `kata_kunci`                                                      | `tag` + `dokumen_tag`             | M:N          |
| `nama_berkas`, `ukuran_berkas`, `jumlah_halaman_berkas`           | `dokumen_berkas`                  | 1:N          |
| `peraturan_yang_diubah`, `peraturan_yang_mencabut`, `dasar_hukum` | `dokumen_relasi` + `jenis_relasi` | M:N rekursif |
| `tanggal_unduhan`, `pengunduh`                                    | `unduhan`                         | 1:N          |

**Catatan penting pada dekomposisi relasi antarperaturan** — tiga kolom terpisah
(`peraturan_yang_diubah`, `peraturan_yang_mencabut`, `dasar_hukum`) **tidak** menjadi tiga tabel
terpisah, melainkan satu tabel `dokumen_relasi` dengan kolom pembeda `jenis_relasi_id`. Alasannya:
ketiga kolom memiliki struktur identik (menunjuk satu dokumen lain) dan hanya berbeda pada makna
relasinya. Bila dipisah menjadi tiga tabel, setiap penambahan jenis relasi baru (misal "dilaksanakan
oleh", "menetapkan petunjuk teknis") menuntut penambahan tabel dan perubahan kode — jelas tidak
memenuhi tuntutan sistem yang dapat berkembang.

**Hasil setelah 1NF:**

```
dokumen(nomor, tahun, jenis_peraturan, bentuk_singkat, judul, tanggal_penetapan,
        tempat_penetapan, penandatangan, jabatan_penandatangan, unit_kerja,
        unit_kerja_induk, kepala_unit_kerja, status_keberlakuan, warna_status,
        nama_penginput, email_penginput, unit_penginput, nama_verifikator,
        email_verifikator, abstrak, sumber, bahasa, penerbit)
kategori(nama_kategori, kategori_induk)
dokumen_kategori(dokumen, kategori)
tag(nama_tag)
dokumen_tag(dokumen, tag)
dokumen_berkas(dokumen, nama_berkas, ukuran, jumlah_halaman, …)
jenis_relasi(nama_relasi, nama_kebalikan)
dokumen_relasi(dokumen, dokumen_terkait, jenis_relasi)
unduhan(dokumen, tanggal, pengunduh, …)
```

---

### H.3.2 Bentuk Normal Kedua (2NF)

**Syarat**: memenuhi 1NF, dan setiap atribut bukan kunci bergantung penuh (_fully functionally
dependent_) pada seluruh kunci utama — tidak ada ketergantungan parsial.

**Pemeriksaan tabel berkunci gabungan:**

| Tabel                      | Kunci Utama                      | Pemeriksaan Ketergantungan Parsial                                                               | Hasil |
| -------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------ | ----- |
| `dokumen_kategori`         | (`dokumen_id`, `kategori_id`)    | Kolom `is_utama` bergantung pada **kedua** komponen kunci (kategori utama bagi dokumen tertentu) | ✔ 2NF |
| `dokumen_tag`              | (`dokumen_id`, `tag_id`)         | Tidak ada atribut bukan kunci selain `dibuat_pada` yang bergantung pada keduanya                 | ✔ 2NF |
| `peran_izin`               | (`peran_id`, `izin_id`)          | `diberikan_oleh` dan `dibuat_pada` bergantung pada kombinasi keduanya                            | ✔ 2NF |
| `pengguna_peran`           | (`pengguna_id`, `peran_id`)      | `ditetapkan_oleh` bergantung pada kombinasi                                                      | ✔ 2NF |
| `pengguna_unit_akses`      | (`pengguna_id`, `unit_kerja_id`) | `termasuk_bawahan` bergantung pada kombinasi                                                     | ✔ 2NF |
| `dokumen_statistik_harian` | (`dokumen_id`, `tanggal`)        | Seluruh penghitung bergantung pada kombinasi dokumen dan tanggal                                 | ✔ 2NF |
| `koleksi_pengguna`         | (`pengguna_id`, `dokumen_id`)    | `catatan` bergantung pada kombinasi                                                              | ✔ 2NF |

**Pelanggaran yang ditemukan dan koreksinya:**

Pada rancangan awal, tabel `dokumen` memakai kunci gabungan alami
(`jenis_peraturan`, `nomor`, `tahun`, `unit_kerja`). Dengan kunci demikian, terdapat ketergantungan
parsial nyata:

```
{jenis_peraturan} → bentuk_singkat, tingkat_hierarki, lingkup_penomoran
{unit_kerja}      → unit_kerja_induk, kepala_unit_kerja
{tahun}           → (tidak ada, aman)
```

`bentuk_singkat` bergantung hanya pada `jenis_peraturan`, bukan pada seluruh kunci — pelanggaran 2NF.

**Koreksi yang diterapkan:**

1. Pengenalan **kunci pengganti** (_surrogate key_) `id BIGINT AUTO_INCREMENT` pada `dokumen`,
   sehingga kunci utama menjadi tunggal dan ketergantungan parsial secara definisi tidak mungkin
   terjadi. Kombinasi alami dipertahankan sebagai _unique constraint_
   `uq_dokumen_identitas`.
2. Pemisahan atribut milik jenis peraturan ke tabel `jenis_peraturan`, dan atribut milik unit kerja
   ke tabel `unit_kerja`.

**Justifikasi penggunaan kunci pengganti** — bukan hanya demi kepatuhan bentuk normal:
(a) nomor peraturan dapat mengalami koreksi administratif, dan kunci alami yang berubah akan memaksa
pemutakhiran berantai pada seluruh tabel anak; (b) kunci gabungan empat kolom sebagai _foreign key_
pada 12 tabel anak akan memperbesar indeks secara signifikan; (c) URL dan tautan permanen
membutuhkan pengenal tunggal yang stabil.

---

### H.3.3 Bentuk Normal Ketiga (3NF)

**Syarat**: memenuhi 2NF, dan tidak ada atribut bukan kunci yang bergantung secara transitif pada
kunci utama melalui atribut bukan kunci lain.

**Ketergantungan transitif yang ditemukan pada tabel `dokumen` dan koreksinya:**

| No  | Ketergantungan Transitif                                                                           | Masalah                                                                                                 | Koreksi                                                                       |
| --- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 1   | `id` → `jenis_peraturan` → `bentuk_singkat`, `tingkat_hierarki`, `lingkup_penomoran`, `pola_nomor` | Nama jenis dan atributnya terulang pada setiap dokumen; perubahan nama jenis harus dilakukan berantai   | Tabel **`jenis_peraturan`**; `dokumen` hanya menyimpan `jenis_peraturan_id`   |
| 2   | `id` → `unit_kerja` → `unit_kerja_induk`, `kepala_unit_kerja`, `singkatan`, `email_unit`           | Idem; ditambah kebutuhan hierarki unit yang tidak mungkin diwakili satu kolom teks                      | Tabel **`unit_kerja`** dengan relasi rekursif `induk_id`                      |
| 3   | `id` → `status_keberlakuan` → `warna_status`, `deskripsi_status`, `is_berlaku_efektif`             | Kode warna dan atribut status terulang; perubahan penanda visual memerlukan migrasi bila memakai `ENUM` | Tabel **`status_dokumen`**                                                    |
| 4   | `id` → `dibuat_oleh` → `nama_penginput`, `email_penginput`, `unit_penginput`, `jabatan`            | Data pengguna terduplikasi pada setiap dokumen                                                          | Tabel **`pengguna`**; `dokumen` menyimpan `dibuat_oleh`                       |
| 5   | `id` → `diperiksa_oleh` → `nama_verifikator`, `email_verifikator`                                  | Idem                                                                                                    | _Foreign key_ `diperiksa_oleh` → `pengguna`                                   |
| 6   | `id` → `bidang_hukum` → `kode_bidang`, `deskripsi_bidang`                                          | Idem                                                                                                    | Tabel **`bidang_hukum`**                                                      |
| 7   | `id` → `jenis_relasi` → `nama_kebalikan`, `status_akibat`                                          | Aturan relasi tertanam dalam kode program                                                               | Tabel **`jenis_relasi`** dengan kolom `kode_kebalikan` dan `status_akibat_id` |

**Verifikasi 3NF pada tabel-tabel utama setelah dekomposisi:**

| Tabel             | Ketergantungan Fungsional                                                                                                                                                                                                      | Status                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| `dokumen`         | Seluruh atribut bukan kunci bergantung langsung dan hanya pada `id`. Kolom `nomor_normal` merupakan kolom terkomputasi dari `nomor` — bukan ketergantungan transitif, melainkan turunan deterministik yang dikelola basis data | ✔ 3NF                                 |
| `unit_kerja`      | `id` → seluruh atribut. `jalur` dan `kedalaman` merupakan turunan dari rantai `induk_id`; diperlakukan sebagai denormalisasi terkendali (§ H.7 butir 2)                                                                        | ✔ 3NF (dengan denormalisasi tercatat) |
| `jenis_peraturan` | `id` → seluruh atribut; `kode` dan `nama` merupakan kunci kandidat                                                                                                                                                             | ✔ BCNF                                |
| `status_dokumen`  | `id` → seluruh atribut; `kode` merupakan kunci kandidat                                                                                                                                                                        | ✔ BCNF                                |
| `bidang_hukum`    | `id` → seluruh atribut; `kode` dan `nama` kunci kandidat                                                                                                                                                                       | ✔ BCNF                                |
| `kategori`        | `id` → seluruh atribut; `kode` dan `slug` kunci kandidat. Kolom `jumlah_dokumen` merupakan penghitung tembolok (§ H.7 butir 1)                                                                                                 | ✔ 3NF                                 |
| `tag`             | `id` → seluruh atribut; `nama` dan `slug` kunci kandidat; `jumlah_pakai` penghitung tembolok                                                                                                                                   | ✔ 3NF                                 |
| `jenis_relasi`    | `id` → seluruh atribut; `kode` kunci kandidat                                                                                                                                                                                  | ✔ BCNF                                |
| `dokumen_berkas`  | `id` → seluruh atribut. `path` kunci kandidat. `jumlah_halaman`, `ukuran_bytes`, dan `mime_type` merupakan properti berkas fisik, bukan turunan atribut lain dalam tabel                                                       | ✔ 3NF                                 |
| `dokumen_relasi`  | `id` → seluruh atribut; (`dokumen_id`, `dokumen_terkait_id`, `jenis_relasi_id`) kunci kandidat                                                                                                                                 | ✔ BCNF                                |
| `pengguna`        | `id` → seluruh atribut; `email`, `nip_nidn`, `sso_subject` kunci kandidat                                                                                                                                                      | ✔ BCNF                                |
| `peran`           | `id` → seluruh atribut; `kode` dan `nama` kunci kandidat                                                                                                                                                                       | ✔ BCNF                                |
| `izin`            | `id` → seluruh atribut; `kode` kunci kandidat. `modul` merupakan **bagian** dari `kode` (segmen sebelum titik) — lihat catatan di bawah                                                                                        | ✔ 3NF (dengan denormalisasi tercatat) |
| `berita`          | `id` → seluruh atribut; `slug` kunci kandidat                                                                                                                                                                                  | ✔ BCNF                                |
| `pengaturan`      | `id` → seluruh atribut; `kunci` kunci kandidat                                                                                                                                                                                 | ✔ BCNF                                |
| `log_aktivitas`   | `id` → seluruh atribut. Kolom `pelaku_nama` dan `peran_saat_itu` merupakan cuplikan historis yang disengaja (§ H.7 butir 4)                                                                                                    | ✔ 3NF (dengan denormalisasi tercatat) |

**Catatan atas kolom `izin.modul`** — nilai `modul` dapat diturunkan dari `kode` (segmen sebelum
tanda titik), sehingga secara teoretis terdapat redundansi. Kolom ini dipertahankan karena:
(a) dipakai sebagai kunci pengurutan dan pengelompokan pada matriks izin, sehingga perlu terindeks;
(b) beberapa modul pada antarmuka menggabungkan beberapa prefiks kode (contoh modul "Konten"
mencakup `berita.*`, `halaman.*`, `banner.*`, `media.*`), sehingga pemetaan tidak selalu satu-satu.
Konsistensi dijaga melalui _seeder_ dan validasi pada lapisan aplikasi.

---

### H.3.4 Pemeriksaan BCNF

**Syarat BCNF**: untuk setiap ketergantungan fungsional nontrivial `X → Y`, `X` harus merupakan
_superkey_.

Seluruh tabel entitas memenuhi BCNF karena memakai kunci pengganti tunggal dengan _unique
constraint_ atas kunci kandidat alaminya. Tabel penghubung juga memenuhi BCNF karena kunci utama
gabungannya merupakan satu-satunya determinan.

**Kasus yang perlu ditelaah khusus — `dokumen_akses`:**

```
Kunci utama: id (pengganti)
Kunci kandidat: (dokumen_id, subjek_tipe, subjek_id, izin)
Ketergantungan: {dokumen_id, subjek_tipe, subjek_id, izin} → {dibuat_oleh, dibuat_pada}
```

Determinannya merupakan kunci kandidat (ditegakkan `uq_dokumen_akses`), sehingga **memenuhi BCNF**.
Namun tabel ini memiliki kelemahan berbeda dari persoalan bentuk normal: relasi polimorfik
menyebabkan `subjek_id` tidak dapat ditegakkan _foreign key_. Pembahasan lengkap pada § H.5.

**Kesimpulan**: seluruh 50 tabel memenuhi 3NF; 38 di antaranya memenuhi BCNF. Tabel yang berhenti
pada 3NF disebabkan oleh denormalisasi terkendali yang tercatat pada § H.7, bukan karena kekeliruan
rancangan.

---

### H.3.5 Pemeriksaan 4NF dan 5NF

**4NF** — melarang ketergantungan multinilai (_multivalued dependency_) independen dalam satu tabel.

Pemeriksaan pada relasi klasifikasi dokumen: satu dokumen memiliki banyak kategori **dan** banyak
kata kunci, dan keduanya saling independen. Bila keduanya disatukan dalam satu tabel
`dokumen_klasifikasi(dokumen_id, kategori_id, tag_id)`, akan terbentuk perkalian kartesius:
dokumen dengan 3 kategori dan 5 kata kunci menghasilkan 15 baris, bukan 8 — pelanggaran 4NF yang
menimbulkan redundansi dan anomali pemutakhiran.

**Rancangan ini memisahkan keduanya** menjadi `dokumen_kategori` dan `dokumen_tag`, sehingga
memenuhi 4NF. Pemisahan serupa diterapkan pada `berita_tag` dan `berita_dokumen`.

**5NF** — tidak ditemukan ketergantungan gabungan (_join dependency_) yang menuntut dekomposisi
lebih lanjut. Relasi tiga arah yang berpotensi bermasalah (dokumen–subjek–izin pada `dokumen_akses`)
bersifat tak terpisahkan secara semantik: izin `unduh` bagi unit kerja X atas dokumen Y merupakan
fakta tunggal yang tidak dapat direkonstruksi dari proyeksi berpasangan. Karena itu tabel tersebut
**tidak** didekomposisi lebih lanjut.

---

## H.4 Justifikasi Pemisahan Tiga Taksonomi

Sistem memiliki tiga struktur klasifikasi yang tampak serupa. Pemisahan ini merupakan keputusan
rancangan yang perlu dijelaskan, karena penggabungan akan tampak lebih "ternormalisasi" namun justru
menimbulkan persoalan.

| Aspek                         | `bidang_hukum`                          | `kategori`                                | `tag`                             |
| ----------------------------- | --------------------------------------- | ----------------------------------------- | --------------------------------- |
| Asal                          | Standar eksternal JDIHN                 | Taksonomi internal ITH                    | Bebas, tumbuh organik             |
| Struktur                      | Datar                                   | Berjenjang                                | Datar                             |
| Kardinalitas terhadap dokumen | 1:N (satu bidang per dokumen)           | M:N                                       | M:N                               |
| Kewenangan pengelolaan        | Superadmin (mengikuti standar nasional) | Superadmin                                | Admin (dapat menambah saat input) |
| Volume                        | 15–25 entri, stabil                     | 40–80 entri, jarang berubah               | Ratusan, tumbuh terus             |
| Tujuan                        | Interoperabilitas JDIHN                 | Navigasi portal dan pelaporan tata kelola | Pengindeksan pencarian            |
| Dipakai bersama dengan berita | Tidak                                   | Tidak                                     | **Ya**                            |

**Mengapa tidak digabung menjadi satu tabel taksonomi polimorfik** (pola `terms`/`taxonomy` seperti
pada beberapa CMS): (a) kardinalitasnya berbeda — `bidang_hukum` bersifat 1:N sehingga cukup sebagai
_foreign key_ pada `dokumen`, sementara dua lainnya M:N; (b) kewenangan pengelolaannya berbeda,
sehingga penyatuan menuntut logika otorisasi tambahan per jenis taksonomi; (c) pemisahan menghasilkan
kueri yang lebih sederhana dan indeks yang lebih efisien; (d) `bidang_hukum` terikat standar
eksternal dan tidak boleh bercampur dengan taksonomi internal yang bebas diubah.

Penggabungan akan menghasilkan satu tabel dengan kolom yang bermakna berbeda tergantung jenisnya —
bentuk ketergantungan kondisional yang justru melemahkan kualitas rancangan meskipun jumlah tabelnya
berkurang.

---

## H.5 Telaah Relasi Polimorfik

Dua tempat pada rancangan memakai pola polimorfik. Keduanya merupakan pengorbanan sadar terhadap
penegakan integritas di tingkat basis data.

### H.5.1 `dokumen_akses` (`subjek_tipe` + `subjek_id`)

| Aspek                                     | Uraian                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Kebutuhan**                             | Daftar akses dokumen terbatas dapat berisi peran, unit kerja, atau akun tertentu                                                                                                                                                                                                                                                                                       |
| **Alternatif 1 — tiga tabel terpisah**    | `dokumen_akses_peran`, `dokumen_akses_unit`, `dokumen_akses_pengguna`. **Kelebihan**: _foreign key_ penuh. **Kekurangan**: tiga tabel berstruktur identik; setiap kueri pemeriksaan akses memerlukan tiga `LEFT JOIN` atau `UNION`; penambahan jenis subjek baru menuntut tabel dan kode baru                                                                          |
| **Alternatif 2 — polimorfik** _(dipilih)_ | Satu tabel dengan kolom pembeda. **Kelebihan**: satu kueri pemeriksaan; penambahan jenis subjek tanpa perubahan skema. **Kekurangan**: `subjek_id` tanpa _foreign key_                                                                                                                                                                                                 |
| **Mitigasi**                              | (1) Validasi keberadaan subjek pada lapisan aplikasi saat penyimpanan; (2) _observer_ penghapusan `peran`, `unit_kerja`, dan `pengguna` membersihkan baris terkait; (3) tugas terjadwal mingguan memeriksa dan melaporkan baris bermasalah; (4) pemeriksaan akses bersifat _fail-closed_ — subjek yang tidak ditemukan diperlakukan sebagai tidak berhak, bukan berhak |
| **Volume**                                | Diperkirakan puluhan sampai ratusan baris; dampak integritas terbatas dan mudah diaudit                                                                                                                                                                                                                                                                                |

### H.5.2 `menu_item` (`tipe_target` + `target_id`)

Persoalan serupa dengan risiko lebih rendah, karena kegagalan integritas hanya menghasilkan tautan
mati, bukan kebocoran akses. Mitigasi: butir menu yang menunjuk entitas tidak ditemukan otomatis
dinonaktifkan dan dilaporkan pada dasbor administrasi.

**Prinsip yang dipegang** — pola polimorfik dibatasi pada dua tabel tersebut. Untuk 48 tabel lainnya,
seluruh relasi ditegakkan dengan _foreign key_ sesungguhnya. Pembatasan ini penting: penggunaan pola
polimorfik secara luas akan meniadakan manfaat integritas referensial basis data pada keseluruhan
sistem.

---

## H.6 Telaah Kolom Besar pada Tabel Inti

Tabel `dokumen` memuat dua kolom berukuran besar: `abstrak` (`MEDIUMTEXT`) dan `isi_teks`
(`LONGTEXT`, hasil ekstraksi PDF, dapat mencapai ratusan kilobita per dokumen).

**Pertanyaan rancangan**: haruskah dipisahkan ke tabel `dokumen_teks` berelasi 1:1?

| Aspek                        | Tetap pada `dokumen` _(dipilih untuk Fase 1)_                                                                                            | Dipisah ke `dokumen_teks`                |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Normalisasi                  | Sama-sama 3NF — pemisahan bukan persoalan bentuk normal, melainkan kinerja                                                               | Sama                                     |
| Kompleksitas kueri           | Lebih sederhana                                                                                                                          | Memerlukan `JOIN` atau pemuatan terpisah |
| Kinerja kueri daftar         | Aman **bila** kolom dikecualikan dari `SELECT`                                                                                           | Aman secara inheren                      |
| Risiko kesalahan pemrograman | Ada — satu `SELECT *` yang terlewat dapat memuat puluhan MB                                                                              | Rendah                                   |
| Ukuran baris InnoDB          | Kolom `TEXT`/`LONGTEXT` besar disimpan pada halaman luapan (_overflow page_), sehingga tidak memperbesar baris utama secara proporsional | Sama                                     |

**Keputusan**: kolom dipertahankan pada tabel `dokumen` untuk Fase 1, dengan tiga pengaman wajib:
(1) `isi_teks` masuk daftar `$hidden` pada model dan hanya dimuat eksplisit saat dibutuhkan;
(2) seluruh kueri daftar memakai `select()` eksplisit, bukan `SELECT *`; (3) pendeteksi kueri
bermasalah diaktifkan pada lingkungan pengembangan.

**Pemicu peninjauan ulang**: bila ukuran rata-rata `isi_teks` melampaui 500 KB, atau bila ditemukan
kueri daftar yang memuat kolom tersebut di produksi, kolom dipindahkan ke tabel `dokumen_teks`
berelasi 1:1. Pemindahan ini tidak memengaruhi relasi lain sehingga dapat dilakukan melalui satu
migrasi.

---

## H.7 Denormalisasi Terkendali

Penyimpangan berikut dilakukan secara sengaja. Setiap butir mencantumkan alasan, mekanisme
pemeliharaan konsistensi, dan cara pemulihan bila terjadi penyimpangan nilai.

| No  | Kolom                                                                                                                                                       | Jenis                                                    | Alasan                                                                                                                                                                                                             | Mekanisme Pemeliharaan                                                                                                                                          | Pemulihan                                                                                   |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 1   | `dokumen.jumlah_dilihat`, `dokumen.jumlah_diunduh`, `dokumen_berkas.jumlah_diunduh`, `kategori.jumlah_dokumen`, `tag.jumlah_pakai`, `berita.jumlah_dilihat` | Penghitung tembolok (_counter cache_)                    | Menghitung `COUNT(*)` atas tabel `unduhan` pada setiap tampilan halaman tidak dapat dipertahankan; tabel `unduhan` diproyeksikan mencapai ratusan ribu baris                                                       | Penambahan melalui penyangga Redis, dituliskan ke basis data setiap 5 menit oleh tugas terjadwal; _observer_ pada perubahan keterkaitan kategori dan kata kunci | Perintah `php artisan jdih:hitung-ulang-penghitung` menghitung ulang dari tabel sumber      |
| 2   | `unit_kerja.jalur`, `unit_kerja.kedalaman`, `kategori.jalur`, `kategori.kedalaman`                                                                          | Nilai turunan (_materialized path_)                      | Kueri "seluruh unit bawahan" dibutuhkan pada **setiap** permintaan Admin untuk penegakan cakupan data. Tanpa `jalur`, diperlukan CTE rekursif berulang                                                             | _Observer_ memutakhirkan `jalur` pada entitas dan seluruh turunannya setiap kali `induk_id` berubah, dalam satu transaksi                                       | Perintah `php artisan jdih:bangun-ulang-jalur`                                              |
| 3   | `dokumen.nomor_normal`                                                                                                                                      | Kolom terkomputasi tersimpan (_stored generated column_) | Pemeriksaan duplikasi harus kebal terhadap perbedaan spasi dan huruf kapital, dan harus dapat memakai indeks unik                                                                                                  | Dikelola sepenuhnya oleh basis data; tidak dapat menyimpang                                                                                                     | Tidak diperlukan                                                                            |
| 4   | `unduhan.peran_saat_unduh`, `log_aktivitas.pelaku_nama`, `log_aktivitas.peran_saat_itu`, `berita.penulis_nama_tampil`                                       | Cuplikan historis (_snapshot_)                           | Nilai harus mencerminkan keadaan **pada saat peristiwa terjadi**. Bila diturunkan melalui relasi, perubahan peran pengguna akan mengubah data statistik dan audit historis secara retroaktif — merusak nilai audit | Diisi sekali saat penulisan; tidak pernah diperbarui                                                                                                            | Tidak dapat dan tidak boleh dipulihkan dari relasi — justru itu tujuannya                   |
| 5   | `dokumen.teu`                                                                                                                                               | Nilai turunan yang dapat disunting                       | `teu` disusun otomatis dari beberapa kolom, namun kaidah penulisan T.E.U. memiliki pengecualian yang menuntut koreksi manual oleh pustakawan hukum                                                                 | Disusun otomatis saat penyimpanan bila kosong atau belum pernah disunting manual; penanda `teu_manual` mencegah penimpaan                                       | Penyusunan ulang massal melalui perintah artisan, dengan pengecualian baris bertanda manual |
| 6   | `dokumen.isi_teks`                                                                                                                                          | Data turunan dari berkas                                 | Hasil ekstraksi PDF; secara ketat merupakan duplikasi isi berkas                                                                                                                                                   | Dibuat ulang melalui antrean saat berkas berubah                                                                                                                | Perintah `php artisan jdih:ekstraksi-ulang`                                                 |
| 7   | `dokumen_statistik_harian`                                                                                                                                  | Tabel agregat                                            | Agregasi langsung atas `unduhan` untuk halaman statistik terlalu mahal                                                                                                                                             | Tugas terjadwal setiap jam                                                                                                                                      | Perhitungan ulang dari tabel `unduhan` selama datanya belum diringkas                       |
| 8   | `izin.modul`                                                                                                                                                | Nilai turunan sebagian                                   | Lihat catatan pada § H.3.3                                                                                                                                                                                         | _Seeder_ dan validasi aplikasi                                                                                                                                  | Pemutakhiran melalui _seeder_                                                               |

**Prinsip yang dipegang atas denormalisasi**

| No  | Prinsip                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------- |
| 1   | Sumber kebenaran selalu berupa data ternormalisasi; kolom denormalisasi berstatus turunan                     |
| 2   | Setiap kolom turunan memiliki perintah perhitungan ulang yang dapat dijalankan kapan saja                     |
| 3   | Kolom turunan tidak pernah menjadi satu-satunya sumber informasi untuk keputusan otorisasi                    |
| 4   | Penyimpangan nilai penghitung bersifat dapat ditoleransi (hanya memengaruhi tampilan statistik), bukan kritis |
| 5   | Cuplikan historis dikecualikan dari prinsip 1–2 karena memang tidak boleh disinkronkan ulang                  |

---

## H.8 Ringkasan Hasil Normalisasi

| Bentuk Normal | Status                            | Catatan                                                                        |
| ------------- | --------------------------------- | ------------------------------------------------------------------------------ |
| 1NF           | ✔ Terpenuhi seluruhnya            | 5 kolom multinilai pada UNF diuraikan menjadi 8 tabel                          |
| 2NF           | ✔ Terpenuhi seluruhnya            | Kunci pengganti pada seluruh tabel entitas; ketergantungan parsial dihilangkan |
| 3NF           | ✔ Terpenuhi seluruhnya (50 tabel) | 7 ketergantungan transitif diuraikan menjadi 6 tabel referensi                 |
| BCNF          | ✔ Terpenuhi pada 38 tabel         | 12 tabel berhenti pada 3NF karena denormalisasi terkendali yang tercatat       |
| 4NF           | ✔ Terpenuhi                       | Ketergantungan multinilai independen (kategori vs kata kunci) dipisahkan       |
| 5NF           | ✔ Terpenuhi                       | Tidak ditemukan ketergantungan gabungan yang menuntut dekomposisi              |

### H.8.1 Dampak Terukur Normalisasi

| Aspek                            | Sebelum (UNF)                               | Sesudah (3NF)                  |
| -------------------------------- | ------------------------------------------- | ------------------------------ |
| Jumlah tabel                     | 1                                           | 50                             |
| Kolom multinilai                 | 9                                           | 0                              |
| Redundansi nama jenis peraturan  | 1.500 pengulangan                           | 12 baris pada tabel referensi  |
| Redundansi data unit kerja       | 1.500 pengulangan                           | 25 baris pada tabel referensi  |
| Redundansi data pengguna         | 1.500 pengulangan                           | 200 baris pada tabel referensi |
| Perubahan nama unit kerja        | 1.500 operasi tulis, risiko tidak konsisten | 1 operasi tulis                |
| Penambahan jenis peraturan baru  | Tidak mungkin tanpa dokumen                 | 1 baris baru                   |
| Penyaringan berdasarkan kategori | Tidak dapat diandalkan (pencocokan teks)    | Kueri berindeks                |
| Rekapitulasi per unit kerja      | Tidak dapat dipercaya (variasi ejaan)       | Akurat                         |

### H.8.2 Perbandingan Kinerja yang Diantisipasi

| Operasi                          | Tanpa Normalisasi                                           | Dengan Normalisasi                      | Penanganan                                                               |
| -------------------------------- | ----------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------ |
| Tampilkan daftar 20 dokumen      | 1 kueri tanpa `JOIN`                                        | 1 kueri + 4 `JOIN`                      | _Eager loading_ + indeks komposit; selisih tidak berarti pada volume ini |
| Tampilkan detail satu dokumen    | 1 kueri                                                     | 1 kueri + 7 relasi                      | _Eager loading_; relasi jarang berubah sehingga di-_cache_               |
| Rekapitulasi per jenis peraturan | `GROUP BY` atas teks bebas, hasil tidak akurat              | `GROUP BY` atas kolom berindeks, akurat | Hasil di-_cache_ 15 menit                                                |
| Ubah nama unit kerja             | 1.500 baris terpengaruh                                     | 1 baris                                 | Keunggulan nyata normalisasi                                             |
| Cari dokumen per kategori        | Pencocokan teks pada kolom multinilai, tidak dapat diindeks | `JOIN` atas tabel penghubung berindeks  | Keunggulan nyata normalisasi                                             |

**Kesimpulan** — biaya tambahan normalisasi berupa operasi `JOIN` sepenuhnya tertangani melalui
strategi indeks, _eager loading_, dan _caching_ yang dirancang pada Bagian G § G.6. Sebaliknya,
manfaatnya — integritas data, kemampuan penyaringan yang dapat diandalkan, dan kemudahan
pemutakhiran data referensi — bersifat mendasar dan tidak dapat diperoleh melalui cara lain. Untuk
sistem dokumentasi hukum yang keakuratannya memiliki konsekuensi nyata, keandalan data merupakan
pertimbangan utama.

---

## H.9 Rekomendasi Praktik Pemeliharaan Skema

| No  | Rekomendasi                                                                                                                                                             |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Seluruh perubahan skema melalui berkas migrasi berversi yang dapat dibatalkan; tanpa perubahan manual di produksi (NFR-33)                                              |
| 2   | _Foreign key_ ditegakkan di basis data, bukan hanya di aplikasi — basis data adalah pertahanan terakhir integritas data                                                 |
| 3   | Aksi `ON DELETE` ditetapkan secara eksplisit pada setiap _foreign key_; tanpa mengandalkan nilai baku                                                                   |
| 4   | Data referensi dikelola melalui _seeder_ berversi, sehingga lingkungan pengembangan, pengujian, dan produksi konsisten                                                  |
| 5   | Penamaan _constraint_ mengikuti konvensi pada Bagian D § D.0, agar pesan galat basis data dapat dipahami                                                                |
| 6   | Tanpa penggunaan `ENUM` untuk nilai yang berpotensi bertambah; nilai demikian ditempatkan pada tabel referensi (diterapkan pada status keberlakuan dan jenis relasi)    |
| 7   | Kolom `ENUM` hanya dipakai untuk himpunan nilai yang terikat logika program dan tidak dapat bertambah tanpa perubahan kode (contoh `status_publikasi`, `tingkat_akses`) |
| 8   | Setiap indeks dibuat berdasarkan pola kueri nyata; penambahan indeks spekulatif dihindari karena memperlambat operasi tulis                                             |
| 9   | Peninjauan `slow_query_log` bulanan sebagai dasar penyesuaian indeks                                                                                                    |
| 10  | Tugas terjadwal mingguan memeriksa integritas relasi polimorfik dan melaporkan penyimpangan                                                                             |
| 11  | Setiap perintah perhitungan ulang nilai turunan (§ H.7) didokumentasikan dan diuji, bukan hanya ditulis                                                                 |
| 12  | Diagram ERD dimutakhirkan bersamaan dengan setiap migrasi yang mengubah relasi                                                                                          |

---

**Kembali ke** → [Indeks Dokumen](README.md)
