# E. STRUKTUR HAK AKSES (ROLE & PERMISSION MATRIX)

Portal JDIH ITH Parepare

---

## E.1 Model Otorisasi

Sistem menerapkan **RBAC (_Role-Based Access Control_) dengan tiga lapisan pembatas** yang
dievaluasi secara berurutan pada setiap permintaan:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  LAPISAN 1 — IZIN FUNGSIONAL (apa yang boleh dilakukan)                 │
│  Sumber: peran → izin, ditambah/dikurangi izin langsung per akun        │
│  Pertanyaan: "Bolehkah peran ini melakukan aksi X?"                     │
│  Contoh: dokumen.terbitkan, pengguna.kelola, sistem.konfigurasi         │
└────────────────────────────────┬────────────────────────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  LAPISAN 2 — CAKUPAN DATA (data milik siapa yang boleh disentuh)        │
│  Sumber: pengguna.unit_kerja_id + pengguna_unit_akses + jalur hierarki  │
│  Pertanyaan: "Bolehkah aktor ini menyentuh data unit kerja Y?"          │
│  Contoh: Admin FTI hanya mengelola dokumen FTI dan unit bawahannya      │
└────────────────────────────────┬────────────────────────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  LAPISAN 3 — TINGKAT AKSES DOKUMEN (seberapa terbuka objeknya)          │
│  Sumber: dokumen.tingkat_akses + dokumen_akses + permintaan_akses       │
│  Pertanyaan: "Bolehkah aktor ini melihat/mengunduh dokumen Z?"          │
│  Contoh: dokumen "terbatas" hanya untuk unit kerja pada daftar akses    │
└─────────────────────────────────────────────────────────────────────────┘
```

**Prinsip yang dipegang**

| No  | Prinsip                   | Penerapan                                                      |
| --- | ------------------------- | -------------------------------------------------------------- |
| 1   | _Deny by default_         | Aksi tanpa izin eksplisit selalu ditolak                       |
| 2   | _Least privilege_         | Peran hanya memegang izin yang diperlukan untuk tugasnya       |
| 3   | _Segregation of duties_   | Penginput dokumen bukan penyetuju dokumen yang sama (BR-08)    |
| 4   | Penegakan di sisi peladen | Penyembunyian elemen antarmuka bukan kendali keamanan (NFR-13) |
| 5   | Izin sebagai data         | Perubahan kewenangan tanpa perubahan kode (FR-109)             |
| 6   | Kegagalan aman            | Bila evaluasi izin menemui galat, akses ditolak                |
| 7   | Auditabilitas             | Seluruh perubahan izin dan penolakan akses dicatat             |

---

## E.2 Definisi Peran

| Kode Peran   | Nama              | Tingkat | Cakupan Data                                                         |    2FA     |      Jumlah Izin       | Keterangan                                                                                                                                                                                             |
| ------------ | ----------------- | :-----: | -------------------------------------------------------------------- | :--------: | :--------------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `superadmin` | Superadmin        |    1    | **Seluruh institusi**                                                | **Wajib**  |       74 dari 76       | Administrator sistem; umumnya 2–3 akun dari unit pengelola hukum dan UPT TIK                                                                                                                           |
| `admin`      | Admin             |    2    | **Unit kerja sendiri** + unit bawahan + unit tambahan yang diberikan | Dianjurkan | 35 baku (+21 opsional) | Pengelola dokumentasi hukum pada unit kerja                                                                                                                                                            |
| `dosen_staf` | Dosen/Staf        |    3    | Tidak mengelola data                                                 |  Opsional  |           13           | Pengguna terautentikasi; konsumen dokumen internal                                                                                                                                                     |
| `pengunjung` | Pengunjung Publik |    4    | Tidak mengelola data                                                 |     —      |           2            | **Peran virtual**: tidak pernah ditetapkan ke akun mana pun. Berfungsi sebagai wadah deklarasi izin bagi permintaan tanpa autentikasi, sehingga kebijakan akses publik ikut terkelola dari satu tempat |

### E.2.1 Spesialisasi Peran Admin

Kebutuhan pemisahan tugas dipenuhi melalui **pemberian izin tambahan pada akun Admin tertentu**,
bukan melalui penambahan peran baru:

| Profil                | Izin tambahan di luar Admin baku                                                                                                  | Diperankan oleh                             |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| **Admin Verifikator** | `dokumen.verifikasi`, `dokumen.terbitkan`, `dokumen.tarik`, `dokumen.ubah_status`, `dokumen.ubah_akses`, `dokumen.operasi_massal` | Kepala/Koordinator unit pengelola hukum     |
| **Admin Konten**      | `berita.kelola`, `halaman.kelola`, `banner.kelola`, `tautan.kelola`, `faq.kelola`, `kontak.kelola`                                | Petugas kehumasan pada unit pengelola hukum |
| **Admin Unit**        | (izin Admin baku, tanpa tambahan)                                                                                                 | Petugas tata usaha fakultas/biro/lembaga    |

Superadmin dapat pula membuat **peran turunan** melalui UC-62 (contoh peran "Admin Fakultas" dengan
himpunan izin yang lebih sempit) tanpa perubahan kode. Empat peran pada § E.2 adalah peran sistem
(`is_sistem = 1`) yang tidak dapat dihapus.

---

## E.3 Daftar Izin (_Permission_)

Format kode: `modul.aksi`. Kolom **T** menandai izin berdampak tinggi (`is_berdampak_tinggi = 1`)
yang memicu peringatan konfirmasi saat diberikan kepada suatu peran.

### Modul `dokumen` (21 izin)

| Kode Izin                | Nama                                      |  T  | Keterangan                                                         |
| ------------------------ | ----------------------------------------- | :-: | ------------------------------------------------------------------ |
| `dokumen.lihat_publik`   | Melihat dokumen publik                    |     | Metadata dan berkas dokumen bertingkat akses publik                |
| `dokumen.unduh_publik`   | Mengunduh dokumen publik                  |     | —                                                                  |
| `dokumen.lihat_internal` | Melihat dokumen internal                  |     | Metadata dan berkas dokumen bertingkat akses internal              |
| `dokumen.unduh_internal` | Mengunduh dokumen internal                |     | —                                                                  |
| `dokumen.lihat_terbatas` | Melihat dokumen terbatas                  |     | Masih tunduk pada daftar akses per dokumen (Lapisan 3)             |
| `dokumen.unduh_terbatas` | Mengunduh dokumen terbatas                |     | Idem                                                               |
| `dokumen.lihat_rahasia`  | Melihat dokumen rahasia                   |  ✔  | Hanya Superadmin dan Admin pengelola dokumen tersebut              |
| `dokumen.lihat_admin`    | Melihat dokumen pada panel admin          |     | Termasuk dokumen berstatus draf, diajukan, dan ditarik             |
| `dokumen.buat`           | Membuat dokumen                           |     | —                                                                  |
| `dokumen.ubah`           | Mengubah metadata dokumen                 |     | —                                                                  |
| `dokumen.hapus`          | Menghapus dokumen (_soft delete_)         |     | —                                                                  |
| `dokumen.pulihkan`       | Memulihkan dokumen dari tempat sampah     |     | —                                                                  |
| `dokumen.hapus_permanen` | Menghapus dokumen secara permanen         |  ✔  | Hanya Superadmin; hanya setelah ≥ 30 hari di tempat sampah (BR-17) |
| `dokumen.unggah_berkas`  | Mengunggah dan mengelola berkas dokumen   |     | —                                                                  |
| `dokumen.hapus_berkas`   | Menghapus berkas dokumen                  |     | —                                                                  |
| `dokumen.kelola_relasi`  | Mengelola relasi antarperaturan           |     | —                                                                  |
| `dokumen.ubah_status`    | Mengubah status keberlakuan               |  ✔  | Berdampak pada keabsahan rujukan hukum                             |
| `dokumen.ubah_akses`     | Menetapkan tingkat akses dan daftar akses |  ✔  | Berdampak pada keterbukaan informasi                               |
| `dokumen.ajukan`         | Mengajukan dokumen untuk verifikasi       |     | —                                                                  |
| `dokumen.verifikasi`     | Memverifikasi dan menyetujui dokumen      |  ✔  | Pemisahan tugas berlaku (BR-08)                                    |
| `dokumen.terbitkan`      | Mempublikasikan dokumen                   |  ✔  | Membuat dokumen dapat diakses sesuai tingkat aksesnya              |

### Modul `dokumen` lanjutan (6 izin)

| Kode Izin                | Nama                                        |  T  | Keterangan                               |
| ------------------------ | ------------------------------------------- | :-: | ---------------------------------------- |
| `dokumen.tarik`          | Menarik dokumen terbit                      |  ✔  | —                                        |
| `dokumen.impor`          | Mengimpor metadata secara massal            |  ✔  | Berpotensi membuat banyak data sekaligus |
| `dokumen.ekspor`         | Mengekspor data dokumen                     |     | —                                        |
| `dokumen.operasi_massal` | Melakukan operasi massal atas dokumen       |  ✔  | —                                        |
| `dokumen.lihat_riwayat`  | Melihat riwayat perubahan dokumen           |     | —                                        |
| `dokumen.putuskan_akses` | Menyetujui/menolak permintaan akses dokumen |     | —                                        |

### Modul `akses_pribadi` (5 izin)

| Kode Izin             | Nama                                         |  T  | Keterangan |
| --------------------- | -------------------------------------------- | :-: | ---------- |
| `akses.minta`         | Mengajukan permintaan akses dokumen terbatas |     | —          |
| `akses.koleksi`       | Mengelola koleksi dokumen pribadi            |     | —          |
| `akses.riwayat_unduh` | Melihat riwayat unduhan pribadi              |     | —          |
| `profil.ubah`         | Mengubah profil pribadi                      |     | —          |
| `profil.ubah_sandi`   | Mengubah kata sandi sendiri                  |     | —          |

### Modul `konten` (9 izin)

| Kode Izin            | Nama                                      |  T  | Keterangan |
| -------------------- | ----------------------------------------- | :-: | ---------- |
| `berita.lihat_admin` | Melihat daftar berita pada panel admin    |     | —          |
| `berita.kelola`      | Membuat dan mengubah berita/artikel hukum |     | —          |
| `berita.terbitkan`   | Menerbitkan berita                        |     | —          |
| `berita.hapus`       | Menghapus berita                          |     | —          |
| `halaman.kelola`     | Mengelola halaman statis                  |     | —          |
| `banner.kelola`      | Mengelola banner dan pengumuman           |     | —          |
| `media.kelola`       | Mengelola pustaka media                   |     | —          |
| `tautan.kelola`      | Mengelola tautan terkait                  |     | —          |
| `faq.kelola`         | Mengelola daftar tanya-jawab              |     | —          |

### Modul `interaksi` (2 izin)

| Kode Izin       | Nama                                |  T  | Keterangan |
| --------------- | ----------------------------------- | :-: | ---------- |
| `kontak.lihat`  | Melihat pesan kontak masuk          |     | —          |
| `kontak.kelola` | Menanggapi dan menutup pesan kontak |     | —          |

### Modul `master` (8 izin)

| Kode Izin                | Nama                         |  T  | Keterangan                                |
| ------------------------ | ---------------------------- | :-: | ----------------------------------------- |
| `master.lihat`           | Melihat data master          |     | —                                         |
| `unit_kerja.kelola`      | Mengelola unit kerja         |  ✔  | Berdampak pada cakupan data seluruh Admin |
| `jenis_peraturan.kelola` | Mengelola jenis peraturan    |  ✔  | —                                         |
| `kategori.kelola`        | Mengelola kategori           |     | —                                         |
| `bidang_hukum.kelola`    | Mengelola bidang hukum       |     | —                                         |
| `tag.kelola`             | Mengelola kata kunci         |     | —                                         |
| `status.kelola`          | Mengelola status keberlakuan |  ✔  | —                                         |
| `jenis_relasi.kelola`    | Mengelola jenis relasi       |  ✔  | —                                         |

### Modul `pengguna` (7 izin)

| Kode Izin                 | Nama                                        |  T  | Keterangan               |
| ------------------------- | ------------------------------------------- | :-: | ------------------------ |
| `pengguna.lihat`          | Melihat daftar pengguna                     |     | —                        |
| `pengguna.kelola`         | Membuat dan mengubah akun pengguna          |  ✔  | —                        |
| `pengguna.hapus`          | Menghapus akun pengguna                     |  ✔  | —                        |
| `pengguna.reset_sandi`    | Menetapkan ulang kata sandi pengguna lain   |  ✔  | —                        |
| `pengguna.verifikasi`     | Memverifikasi pendaftaran akun              |     | —                        |
| `pengguna.tetapkan_peran` | Menetapkan peran kepada akun                |  ✔  | Jalur eskalasi hak akses |
| `pengguna.tetapkan_unit`  | Menetapkan unit kerja dan akses lintas unit |  ✔  | —                        |

### Modul `otorisasi` (3 izin)

| Kode Izin                | Nama                                        |  T  | Keterangan                       |
| ------------------------ | ------------------------------------------- | :-: | -------------------------------- |
| `peran.lihat`            | Melihat daftar peran dan izin               |     | —                                |
| `peran.kelola`           | Mengelola peran dan izinnya                 |  ✔  | Izin paling sensitif pada sistem |
| `izin.tetapkan_langsung` | Memberikan/mencabut izin langsung pada akun |  ✔  | —                                |

### Modul `sistem` (10 izin)

| Kode Izin              | Nama                                 |  T  | Keterangan                                          |
| ---------------------- | ------------------------------------ | :-: | --------------------------------------------------- |
| `panel.akses`          | Mengakses panel administrasi         |     | Izin gerbang; tanpa ini seluruh menu admin tertutup |
| `dasbor.lihat`         | Melihat dasbor statistik             |     | —                                                   |
| `laporan.lihat`        | Melihat dan mengekspor laporan       |     | —                                                   |
| `menu.kelola`          | Mengelola struktur menu navigasi     |     | —                                                   |
| `sistem.konfigurasi`   | Mengelola konfigurasi sistem         |  ✔  | —                                                   |
| `sistem.log_aktivitas` | Melihat log aktivitas                |  ✔  | Memuat data perubahan yang sensitif                 |
| `sistem.log_keamanan`  | Melihat log autentikasi dan keamanan |  ✔  | —                                                   |
| `sistem.cadangan`      | Mengelola pencadangan dan pemulihan  |  ✔  | —                                                   |
| `sistem.pemeliharaan`  | Mengaktifkan mode pemeliharaan       |  ✔  | —                                                   |
| `jdihn.kelola`         | Mengelola sinkronisasi JDIHN         |  ✔  | —                                                   |

### Modul `layanan` — opsional, Fase 3 (5 izin)

| Kode Izin               | Nama                                 |  T  | Keterangan |
| ----------------------- | ------------------------------------ | :-: | ---------- |
| `layanan.ajukan`        | Mengajukan permohonan layanan hukum  |     | —          |
| `layanan.lihat_sendiri` | Melihat permohonan sendiri           |     | —          |
| `layanan.kelola`        | Mengelola seluruh permohonan layanan |     | —          |
| `layanan.tugaskan`      | Menugaskan penelaah                  |     | —          |
| `layanan.master`        | Mengelola katalog jenis layanan      |  ✔  | —          |

**Total izin: 76** (71 inti + 5 modul layanan opsional). Daftar ini dimuat ke tabel `izin`
melalui [jdih_ith_seed.sql](../database/jdih_ith_seed.sql) § 8.

---

## E.4 Matriks Role & Permission

**Legenda**
`●` diizinkan penuh · `▲` diizinkan, dibatasi cakupan unit kerja (Lapisan 2) ·
`◆` diizinkan, dibatasi daftar akses per dokumen (Lapisan 3) ·
`○` tidak diberikan secara baku, dapat diberikan Superadmin ·
`—` tidak diizinkan (tidak dapat diberikan) · `⊘` dilarang secara struktural

|  No | Kode Izin                 | Pengunjung | Dosen/Staf | Admin | Admin Verifikator | Superadmin |
| --: | ------------------------- | :--------: | :--------: | :---: | :---------------: | :--------: |
|   1 | `dokumen.lihat_publik`    |     ●      |     ●      |   ●   |         ●         |     ●      |
|   2 | `dokumen.unduh_publik`    |     ●      |     ●      |   ●   |         ●         |     ●      |
|   3 | `dokumen.lihat_internal`  |     —      |     ●      |   ●   |         ●         |     ●      |
|   4 | `dokumen.unduh_internal`  |     —      |     ●      |   ●   |         ●         |     ●      |
|   5 | `dokumen.lihat_terbatas`  |     —      |     ◆      |   ◆   |         ◆         |     ●      |
|   6 | `dokumen.unduh_terbatas`  |     —      |     ◆      |   ◆   |         ◆         |     ●      |
|   7 | `dokumen.lihat_rahasia`   |     ⊘      |     —      |   ▲   |         ▲         |     ●      |
|   8 | `dokumen.lihat_admin`     |     —      |     —      |   ▲   |         ▲         |     ●      |
|   9 | `dokumen.buat`            |     —      |     —      |   ▲   |         ▲         |     ●      |
|  10 | `dokumen.ubah`            |     —      |     —      |   ▲   |         ▲         |     ●      |
|  11 | `dokumen.hapus`           |     —      |     —      |   ▲   |         ▲         |     ●      |
|  12 | `dokumen.pulihkan`        |     —      |     —      |   ▲   |         ▲         |     ●      |
|  13 | `dokumen.hapus_permanen`  |     ⊘      |     ⊘      |   ⊘   |         ⊘         |     ●      |
|  14 | `dokumen.unggah_berkas`   |     —      |     —      |   ▲   |         ▲         |     ●      |
|  15 | `dokumen.hapus_berkas`    |     —      |     —      |   ▲   |         ▲         |     ●      |
|  16 | `dokumen.kelola_relasi`   |     —      |     —      |   ▲   |         ▲         |     ●      |
|  17 | `dokumen.ubah_status`     |     —      |     —      |   ○   |         ▲         |     ●      |
|  18 | `dokumen.ubah_akses`      |     —      |     —      |   ○   |         ▲         |     ●      |
|  19 | `dokumen.ajukan`          |     —      |     —      |   ▲   |         ▲         |     ●      |
|  20 | `dokumen.verifikasi`      |     —      |     —      |   ○   |         ▲         |     ●      |
|  21 | `dokumen.terbitkan`       |     —      |     —      |   ○   |         ▲         |     ●      |
|  22 | `dokumen.tarik`           |     —      |     —      |   ○   |         ▲         |     ●      |
|  23 | `dokumen.impor`           |     —      |     —      |   ○   |         ○         |     ●      |
|  24 | `dokumen.ekspor`          |     —      |     —      |   ▲   |         ▲         |     ●      |
|  25 | `dokumen.operasi_massal`  |     —      |     —      |   ○   |         ▲         |     ●      |
|  26 | `dokumen.lihat_riwayat`   |     —      |     —      |   ▲   |         ▲         |     ●      |
|  27 | `dokumen.putuskan_akses`  |     —      |     —      |   ▲   |         ▲         |     ●      |
|  28 | `akses.minta`             |     —      |     ●      |   ●   |         ●         |     —      |
|  29 | `akses.koleksi`           |     —      |     ●      |   ●   |         ●         |     ●      |
|  30 | `akses.riwayat_unduh`     |     —      |     ●      |   ●   |         ●         |     ●      |
|  31 | `profil.ubah`             |     —      |     ●      |   ●   |         ●         |     ●      |
|  32 | `profil.ubah_sandi`       |     —      |     ●      |   ●   |         ●         |     ●      |
|  33 | `berita.lihat_admin`      |     —      |     —      |   ●   |         ●         |     ●      |
|  34 | `berita.kelola`           |     —      |     —      |   ○   |         ○         |     ●      |
|  35 | `berita.terbitkan`        |     —      |     —      |   ○   |         ○         |     ●      |
|  36 | `berita.hapus`            |     —      |     —      |   ○   |         ○         |     ●      |
|  37 | `halaman.kelola`          |     —      |     —      |   ○   |         ○         |     ●      |
|  38 | `banner.kelola`           |     —      |     —      |   ○   |         ○         |     ●      |
|  39 | `media.kelola`            |     —      |     —      |   ●   |         ●         |     ●      |
|  40 | `tautan.kelola`           |     —      |     —      |   ○   |         ○         |     ●      |
|  41 | `faq.kelola`              |     —      |     —      |   ○   |         ○         |     ●      |
|  42 | `kontak.lihat`            |     —      |     —      |   ○   |         ○         |     ●      |
|  43 | `kontak.kelola`           |     —      |     —      |   ○   |         ○         |     ●      |
|  44 | `master.lihat`            |     —      |     —      |   ●   |         ●         |     ●      |
|  45 | `unit_kerja.kelola`       |     —      |     —      |   —   |         —         |     ●      |
|  46 | `jenis_peraturan.kelola`  |     —      |     —      |   —   |         —         |     ●      |
|  47 | `kategori.kelola`         |     —      |     —      |   ○   |         ○         |     ●      |
|  48 | `bidang_hukum.kelola`     |     —      |     —      |   —   |         —         |     ●      |
|  49 | `tag.kelola`              |     —      |     —      |   ●   |         ●         |     ●      |
|  50 | `status.kelola`           |     —      |     —      |   —   |         —         |     ●      |
|  51 | `jenis_relasi.kelola`     |     —      |     —      |   —   |         —         |     ●      |
|  52 | `pengguna.lihat`          |     —      |     —      |   ▲   |         ▲         |     ●      |
|  53 | `pengguna.kelola`         |     —      |     —      |   —   |         —         |     ●      |
|  54 | `pengguna.hapus`          |     —      |     —      |   —   |         —         |     ●      |
|  55 | `pengguna.reset_sandi`    |     —      |     —      |   —   |         —         |     ●      |
|  56 | `pengguna.verifikasi`     |     —      |     —      |  ○▲   |        ○▲         |     ●      |
|  57 | `pengguna.tetapkan_peran` |     ⊘      |     ⊘      |   ⊘   |         ⊘         |     ●      |
|  58 | `pengguna.tetapkan_unit`  |     —      |     —      |   —   |         —         |     ●      |
|  59 | `peran.lihat`             |     —      |     —      |   ●   |         ●         |     ●      |
|  60 | `peran.kelola`            |     ⊘      |     ⊘      |   ⊘   |         ⊘         |     ●      |
|  61 | `izin.tetapkan_langsung`  |     ⊘      |     ⊘      |   ⊘   |         ⊘         |     ●      |
|  62 | `panel.akses`             |     —      |     —      |   ●   |         ●         |     ●      |
|  63 | `dasbor.lihat`            |     —      |     —      |   ▲   |         ▲         |     ●      |
|  64 | `laporan.lihat`           |     —      |     —      |   ▲   |         ▲         |     ●      |
|  65 | `menu.kelola`             |     —      |     —      |   —   |         —         |     ●      |
|  66 | `sistem.konfigurasi`      |     —      |     —      |   —   |         —         |     ●      |
|  67 | `sistem.log_aktivitas`    |     —      |     —      |  ○▲   |        ○▲         |     ●      |
|  68 | `sistem.log_keamanan`     |     —      |     —      |   —   |         —         |     ●      |
|  69 | `sistem.cadangan`         |     —      |     —      |   —   |         —         |     ●      |
|  70 | `sistem.pemeliharaan`     |     —      |     —      |   —   |         —         |     ●      |
|  71 | `jdihn.kelola`            |     —      |     —      |   —   |         —         |     ●      |
|  72 | `layanan.ajukan`          |     —      |     ●      |   ●   |         ●         |     —      |
|  73 | `layanan.lihat_sendiri`   |     —      |     ●      |   ●   |         ●         |     ●      |
|  74 | `layanan.kelola`          |     —      |     —      |   ○   |         ○         |     ●      |
|  75 | `layanan.tugaskan`        |     —      |     —      |   ○   |         ○         |     ●      |
|  76 | `layanan.master`          |     —      |     —      |   —   |         —         |     ●      |

**Rekapitulasi jumlah izin baku per peran**

| Peran             | Diberikan baku (●/▲/◆) | Dapat ditambahkan (○) | Tidak dapat diberikan (—/⊘) | Total |
| ----------------- | :--------------------: | :-------------------: | :-------------------------: | :---: |
| Pengunjung Publik |           2            |           0           |             74              |  76   |
| Dosen/Staf        |           13           |           0           |             63              |  76   |
| Admin             |           35           |          21           |             20              |  76   |
| Admin Verifikator |           41           |          15           |             20              |  76   |
| Superadmin        |           74           |           0           |              2              |  76   |

**Catatan atas dua izin yang tidak dimiliki Superadmin** — `akses.minta` dan `layanan.ajukan` tidak
relevan bagi Superadmin karena Superadmin sudah memiliki akses penuh ke seluruh dokumen dan
seluruh permohonan layanan; pemberian izin tersebut hanya akan menciptakan data tidak bermakna.

**Izin bertanda `⊘` (dilarang secara struktural)** — kelima izin ini (`dokumen.hapus_permanen`,
`pengguna.tetapkan_peran`, `peran.kelola`, `izin.tetapkan_langsung`, dan
`dokumen.lihat_rahasia` bagi Pengunjung) tidak dapat diberikan kepada peran selain Superadmin
**melalui antarmuka**, karena berpotensi menjadi jalur eskalasi hak akses. Pembatasan ini ditegakkan
di lapisan aplikasi melalui daftar putih izin yang dapat dikelola per tingkat peran.

---

## E.5 Algoritma Evaluasi Izin

Urutan evaluasi yang wajib diterapkan pada lapisan otorisasi:

```
fungsi bolehkah(aktor, kode_izin, objek = null):

  # ── LANGKAH 0: Keadaan akun ──────────────────────────────────────────
  1.  JIKA aktor tidak terautentikasi:
          himpunan_izin ← izin peran 'pengunjung'
      SELAIN ITU:
          JIKA aktor.status ≠ 'aktif'                 → TOLAK  (BR-29)
          JIKA aktor.dikunci_hingga > sekarang        → TOLAK
          JIKA peran aktor mewajibkan 2FA DAN belum aktif
                                                      → TOLAK (arahkan ke UC-25)
          himpunan_izin ← gabungan izin seluruh peran aktor

  # ── LANGKAH 1: Izin fungsional ───────────────────────────────────────
  2.  himpunan_izin ← himpunan_izin ∪ pengguna_izin(mode='berikan', masih berlaku)
  3.  himpunan_izin ← himpunan_izin \ pengguna_izin(mode='cabut',  masih berlaku)
  4.  JIKA kode_izin ∉ himpunan_izin                  → TOLAK
  5.  JIKA objek = null                               → IZINKAN   (izin global)

  # ── LANGKAH 2: Cakupan data ──────────────────────────────────────────
  6.  JIKA aktor berperan 'superadmin'                → lompat ke LANGKAH 3
  7.  JIKA peran aktor berlingkup unit (is_lingkup_unit = 1):
          unit_diizinkan ← {aktor.unit_kerja_id}
                         ∪ {unit pada pengguna_unit_akses}
                         ∪ {seluruh unit bawahan dari keduanya,
                            via unit_kerja.jalur LIKE '<jalur>%'}
          JIKA objek.unit_kerja_id ∉ unit_diizinkan   → TOLAK  (BR-15)

  # ── LANGKAH 3: Tingkat akses objek (khusus dokumen) ──────────────────
  8.  JIKA objek bukan dokumen                        → IZINKAN
  9.  JIKA aksi bersifat pengelolaan (buat/ubah/hapus/terbitkan/…)
                                                      → IZINKAN
                                                        (sudah lolos Lapisan 2)
  10. # aksi bersifat konsumsi (lihat/unduh):
      JIKA objek.status_publikasi ≠ 'terbit'
          DAN aktor tidak memegang 'dokumen.lihat_admin'
                                                      → TOLAK  (BR-09)
      PILIH objek.tingkat_akses:
        'publik'   → IZINKAN
        'internal' → JIKA aktor terautentikasi DAN aktif → IZINKAN
                     SELAIN ITU                          → TOLAK  (BR-11)
        'terbatas' → JIKA ADA dokumen_akses(objek) yang cocok dengan
                         {peran aktor} ∪ {unit aktor + bawahannya} ∪ {akun aktor}
                         DAN izinnya mencakup aksi ini  → IZINKAN
                     JIKA ADA permintaan_akses(objek, aktor)
                         status='disetujui'
                         DAN (berlaku_hingga IS NULL ATAU ≥ hari ini)
                                                       → IZINKAN
                     SELAIN ITU                        → TOLAK  (BR-12)
        'rahasia'  → JIKA aktor berperan 'superadmin'   → IZINKAN
                     JIKA aktor memegang 'dokumen.lihat_rahasia'
                         DAN objek.unit_kerja_id ∈ unit_diizinkan
                                                       → IZINKAN
                     SELAIN ITU                        → TOLAK  (BR-13)

  # ── Setiap TOLAK pada objek nyata dicatat pada log keamanan ──────────
```

### E.5.1 Tabel Keputusan Ringkas Akses Dokumen

| Tingkat Akses | Pengunjung (anonim)                             | Dosen/Staf                                                 | Admin unit lain | Admin unit pemilik | Superadmin |
| ------------- | ----------------------------------------------- | ---------------------------------------------------------- | --------------- | ------------------ | ---------- |
| **publik**    | Metadata ✔ · Unduh ✔                            | ✔ · ✔                                                      | ✔ · ✔           | ✔ · ✔              | ✔ · ✔      |
| **internal**  | Metadata ✔ · Unduh ✘                            | ✔ · ✔                                                      | ✔ · ✔           | ✔ · ✔              | ✔ · ✔      |
| **terbatas**  | Metadata ✔ (judul, nomor, tahun saja) · Unduh ✘ | ✔ · hanya bila pada daftar akses atau permintaan disetujui | ✔ · idem        | ✔ · ✔              | ✔ · ✔      |
| **rahasia**   | Tidak muncul sama sekali                        | Tidak muncul                                               | Tidak muncul    | ✔ · ✔              | ✔ · ✔      |

**Catatan penting** — dokumen berstatus publikasi selain "terbit" **tidak pernah** muncul pada kanal
publik apa pun, termasuk indeks pencarian, `sitemap.xml`, umpan RSS, dan API publik, tanpa
memperhatikan tingkat aksesnya (BR-09).

---

## E.6 Cakupan Data per Peran

### E.6.1 Aturan Cakupan Unit Kerja

| Peran      | Cakupan Baca                                                                                                    | Cakupan Tulis                                                   |
| ---------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Pengunjung | Seluruh dokumen publik terbit                                                                                   | Tidak ada                                                       |
| Dosen/Staf | Seluruh dokumen publik dan internal terbit; dokumen terbatas sesuai hak                                         | Hanya data miliknya sendiri (profil, koleksi, permintaan akses) |
| Admin      | Dokumen unit kerja utama + unit bawahan + unit tambahan; seluruh dokumen publik/internal terbit sebagai pembaca | Dokumen dan berkas pada unit dalam cakupannya                   |
| Superadmin | Seluruh data                                                                                                    | Seluruh data                                                    |

### E.6.2 Contoh Penerapan Cakupan

Diberikan hierarki unit kerja:

```
Institut Teknologi B.J. Habibie          (id=1,  jalur=1)
├── Senat Institut                       (id=2,  jalur=1/2)
├── Biro Umum dan Keuangan               (id=3,  jalur=1/3)
│   └── Bagian Hukum dan Tata Laksana    (id=4,  jalur=1/3/4)
├── Fakultas Teknologi Industri          (id=5,  jalur=1/5)
│   ├── Jurusan Teknik Informatika       (id=6,  jalur=1/5/6)
│   └── Jurusan Teknik Mesin             (id=7,  jalur=1/5/7)
└── UPT Teknologi Informasi              (id=8,  jalur=1/8)
```

| Akun                  | Unit Utama       | `pengguna_unit_akses`                | Cakupan Tulis Efektif                                    |
| --------------------- | ---------------- | ------------------------------------ | -------------------------------------------------------- |
| Admin A               | Bagian Hukum (4) | —                                    | {4}                                                      |
| Admin B               | Fakultas TI (5)  | —                                    | {5, 6, 7} — turun ke jurusan melalui `jalur LIKE '1/5%'` |
| Admin C               | Jurusan TIF (6)  | —                                    | {6}                                                      |
| Admin D (verifikator) | Bagian Hukum (4) | Institut (1), `termasuk_bawahan = 1` | {1, 2, 3, 4, 5, 6, 7, 8} — seluruh institusi             |
| Superadmin            | Bagian Hukum (4) | —                                    | seluruh unit (Lapisan 2 dilewati)                        |

**Implementasi kueri cakupan** — daftar unit yang boleh disentuh dihitung sekali per sesi dan
disimpan pada _cache_, lalu diterapkan sebagai kondisi kueri:

```sql
SELECT d.* FROM dokumen d
WHERE d.dihapus_pada IS NULL
  AND d.unit_kerja_id IN (
        SELECT uk.id FROM unit_kerja uk
        WHERE uk.jalur LIKE '1/5%'     -- jalur unit dalam cakupan aktor
           OR uk.id IN (4)             -- unit tambahan tanpa pewarisan
      );
```

---

## E.7 Aturan Khusus dan Pengaman Tambahan

| No  | Aturan Pengaman                                                                              | Penerapan Teknis                                                                                                                                    |
| --- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Superadmin terakhir tidak dapat dihapus, dinonaktifkan, atau diturunkan perannya** (BR-27) | Pemeriksaan jumlah Superadmin aktif sebelum setiap operasi; ditolak bila hasilnya menjadi 0                                                         |
| 2   | **Pemisahan tugas pada verifikasi** (BR-08)                                                  | `dokumen.dibuat_oleh = aktor.id` → tombol setujui dinonaktifkan, kecuali `pengaturan['alur.izinkan_setujui_sendiri'] = true`                        |
| 3   | **Tidak ada eskalasi hak akses**                                                             | Peran hanya dapat mengelola akun dan peran dengan `tingkat` lebih besar (kewenangan lebih rendah) daripada dirinya                                  |
| 4   | **2FA wajib Superadmin**                                                                     | Gerbang pada _middleware_ panel administrasi: akses ditolak sampai 2FA aktif                                                                        |
| 5   | **Penurunan tingkat kerahasiaan terkendali** (BR-16)                                         | Perubahan `rahasia` → `publik` memerlukan izin `dokumen.verifikasi`; dicatat khusus pada log audit                                                  |
| 6   | **Penghapusan permanen berjeda** (BR-17)                                                     | Hanya untuk `dihapus_pada < sekarang - 30 hari`; memerlukan konfirmasi pengetikan nomor dokumen                                                     |
| 7   | **Peran dan izin sistem terlindungi**                                                        | `peran.is_sistem = 1` dan `izin.is_sistem = 1` tidak dapat dihapus; hanya keterkaitannya yang dapat diubah                                          |
| 8   | **Pembatasan laju per peran**                                                                | Pengunjung 30 unduhan/jam/IP; Dosen/Staf 200/jam; Admin tanpa batas praktis                                                                         |
| 9   | **Penolakan akses selalu tercatat**                                                          | Setiap hasil TOLAK atas objek nyata dicatat pada `log_aktivitas` dengan aksi `akses_ditolak`                                                        |
| 10  | **Pembersihan _cache_ izin**                                                                 | Perubahan pada `peran_izin`, `pengguna_peran`, `pengguna_izin`, atau `pengguna_unit_akses` membersihkan _cache_ izin akun terdampak secara langsung |
| 11  | **Pemeriksaan ganda pada unduhan**                                                           | Izin diperiksa dua kali: saat penerbitan URL bertanda tangan dan saat berkas diminta, agar perubahan hak akses berlaku langsung                     |
| 12  | **Penyamaran data sensitif pada log**                                                        | `kata_sandi`, `rahasia_2fa`, `token_*`, dan `kode_pemulihan_2fa` selalu disamarkan sebelum masuk `log_aktivitas`                                    |

---

## E.8 Pemetaan Izin ke Titik Akhir Aplikasi

Contoh penerapan izin pada rute aplikasi, sebagai acuan implementasi:

| Metode & Rute                          | Izin Diperlukan                        | Lapisan Aktif                   |
| -------------------------------------- | -------------------------------------- | ------------------------------- |
| `GET /`                                | `dokumen.lihat_publik`                 | 1                               |
| `GET /peraturan`                       | `dokumen.lihat_publik`                 | 1, 3 (penyaring hasil)          |
| `GET /peraturan/{slug}`                | `dokumen.lihat_publik`                 | 1, 3                            |
| `GET /peraturan/{slug}/unduh/{berkas}` | `dokumen.unduh_*` sesuai tingkat akses | 1, 3                            |
| `POST /permintaan-akses`               | `akses.minta`                          | 1                               |
| `GET /admin`                           | `panel.akses`                          | 1                               |
| `GET /admin/dokumen`                   | `dokumen.lihat_admin`                  | 1, 2                            |
| `POST /admin/dokumen`                  | `dokumen.buat`                         | 1, 2 (validasi `unit_kerja_id`) |
| `PUT /admin/dokumen/{id}`              | `dokumen.ubah`                         | 1, 2                            |
| `POST /admin/dokumen/{id}/ajukan`      | `dokumen.ajukan`                       | 1, 2                            |
| `POST /admin/dokumen/{id}/setujui`     | `dokumen.verifikasi`                   | 1, 2, + BR-08                   |
| `POST /admin/dokumen/{id}/terbitkan`   | `dokumen.terbitkan`                    | 1, 2, + BR-04, BR-05            |
| `DELETE /admin/dokumen/{id}`           | `dokumen.hapus`                        | 1, 2                            |
| `DELETE /admin/dokumen/{id}/permanen`  | `dokumen.hapus_permanen`               | 1, + BR-17                      |
| `POST /admin/dokumen/impor`            | `dokumen.impor`                        | 1, 2                            |
| `GET /admin/pengguna`                  | `pengguna.lihat`                       | 1, 2                            |
| `PUT /admin/pengguna/{id}/peran`       | `pengguna.tetapkan_peran`              | 1, + aturan tingkat peran       |
| `GET /admin/peran`                     | `peran.lihat`                          | 1                               |
| `PUT /admin/peran/{id}/izin`           | `peran.kelola`                         | 1, + daftar putih izin          |
| `GET /admin/pengaturan`                | `sistem.konfigurasi`                   | 1                               |
| `GET /admin/log-aktivitas`             | `sistem.log_aktivitas`                 | 1, 2                            |
| `POST /admin/jdihn/sinkron`            | `jdihn.kelola`                         | 1                               |
| `GET /api/v1/dokumen`                  | `dokumen.lihat_publik` (anonim)        | 1, 3 + pembatasan laju          |

---

**Lanjut ke** → [F. Rancangan Fitur dan Menu](06-fitur-dan-menu.md)
