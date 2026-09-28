# G. REKOMENDASI TEKNIS PENGEMBANGAN

Portal JDIH ITH Parepare

---

## G.1 Arsitektur Sistem

### G.1.1 Pilihan Gaya Arsitektur

**Rekomendasi: Monolit Modular (_Modular Monolith_)** — bukan _microservices_.

| Pertimbangan                     | Alasan                                                                                                                              |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Ukuran domain                    | Satu domain kohesif (dokumentasi hukum), bukan kumpulan domain independen                                                           |
| Volume data dan beban            | ≤ 5.000 dokumen dan ≤ 300 pengguna bersamaan — satu proses aplikasi lebih dari cukup                                                |
| Kapasitas tim                    | Tim kecil (2–4 pengembang); _microservices_ menambah beban operasional tanpa manfaat sebanding                                      |
| Kemampuan pemeliharaan institusi | UPT TIK perguruan tinggi umumnya mengelola aplikasi monolit; _service mesh_ dan orkestrasi kontainer memperbesar risiko operasional |
| Jalur peningkatan                | Modularisasi internal yang disiplin memungkinkan pemisahan modul menjadi layanan terpisah di masa depan bila benar-benar diperlukan |

Batas modul internal yang wajib dijaga (setiap modul hanya berkomunikasi melalui antarmuka
_service_, bukan langsung ke model modul lain):

```
app/
├── Modul/
│   ├── Dokumen/          ← dokumen, berkas, relasi, alur kerja, riwayat
│   ├── Pencarian/        ← abstraksi mesin pencari, pengindeksan, kueri
│   ├── Otorisasi/        ← peran, izin, cakupan unit, policy
│   ├── Pengguna/         ← akun, autentikasi, 2FA, SSO
│   ├── MasterData/       ← unit kerja, jenis peraturan, kategori, tag, status
│   ├── Konten/           ← berita, halaman, banner, media, menu
│   ├── Statistik/        ← agregasi, laporan, dasbor
│   ├── Integrasi/        ← adaptor JDIHN, API publik, SSO
│   ├── Audit/            ← log aktivitas, log keamanan
│   └── Layanan/          ← layanan hukum (Fase 3)
└── Shared/               ← kontrak, DTO, event, utilitas lintas modul
```

### G.1.2 Diagram Arsitektur Penyebaran

```
                        ┌─────────────────────────────┐
     Pengguna ─────────▶ │  CDN / Cloudflare (opsional)│
     (peramban)          │  cache aset statis, WAF, TLS│
                        └──────────────┬──────────────┘
                                       ▼
                        ┌─────────────────────────────┐
                        │  Nginx (reverse proxy)      │
                        │  TLS, gzip/brotli, rate     │
                        │  limit, header keamanan     │
                        └──────────────┬──────────────┘
                                       ▼
        ┌──────────────────────────────────────────────────────────┐
        │  Aplikasi — Laravel 11 / PHP 8.3 (PHP-FPM)               │
        │  ┌────────────┬────────────┬────────────┬─────────────┐  │
        │  │ Web Routes │ API Routes │ Admin Panel│  Scheduler  │  │
        │  │ (Blade +   │ (JSON,     │ (Filament  │  (cron)     │  │
        │  │  Livewire) │  OpenAPI)  │  atau      │             │  │
        │  │            │            │  Livewire) │             │  │
        │  └────────────┴────────────┴────────────┴─────────────┘  │
        │  Middleware: Auth · RBAC Policy · Scope Unit · Rate Limit │
        │  Layer: Controller → Service → Repository → Model         │
        │  Event/Listener · Queue Job · Observer · Form Request     │
        └───┬──────────┬──────────┬──────────┬──────────┬──────────┘
            ▼          ▼          ▼          ▼          ▼
    ┌───────────┐┌──────────┐┌──────────┐┌────────┐┌────────────┐
    │ MySQL 8.0 ││  Redis   ││Meilisearch││ Object ││ Queue      │
    │ (metadata)││ cache,   ││ (indeks   ││Storage ││ Worker     │
    │ + replika ││ session, ││ pencarian)││(S3/    ││ (Horizon)  │
    │   baca    ││ queue    ││           ││ MinIO) ││            │
    └───────────┘└──────────┘└──────────┘└────────┘└────────────┘
            │                                            │
            ▼                                            ▼
    ┌───────────────┐                    ┌───────────────────────────┐
    │ Backup harian │                    │ Integrasi keluar:         │
    │ (offsite)     │                    │ • API JDIHN               │
    └───────────────┘                    │ • SMTP institusi          │
                                         │ • SSO ITH (OIDC/SAML)     │
                                         │ • Sentry (pemantauan)     │
                                         └───────────────────────────┘
```

---

## G.2 Tumpukan Teknologi (_Tech Stack_)

### G.2.1 Rekomendasi Utama

| Lapisan                | Teknologi                                                                     | Versi | Alasan Pemilihan                                                                                                                                                   |
| ---------------------- | ----------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Bahasa                 | PHP                                                                           | 8.3+  | Ekosistem terluas di lingkungan perguruan tinggi Indonesia; ketersediaan pengembang dan penyedia _hosting_ tinggi; biaya alih kelola rendah                        |
| _Framework_            | Laravel                                                                       | 11.x  | Ekosistem lengkap (ORM, migrasi, antrean, penjadwal, otorisasi, validasi); dokumentasi sangat baik; mempercepat pembangunan modul CRUD yang mendominasi sistem ini |
| Panel administrasi     | Filament 3 atau Livewire 3                                                    | —     | Filament mempercepat pembangunan panel admin 2–3× untuk 50 tabel; Livewire dipilih bila dibutuhkan kendali penuh atas antarmuka                                    |
| Antarmuka publik       | Blade + Tailwind CSS 3 + Alpine.js                                            | —     | Perenderan sisi peladen (SSR) penting untuk SEO dokumen hukum; tanpa beban _framework_ JavaScript besar                                                            |
| Basis data             | MySQL 8.0 / MariaDB 10.6+                                                     | —     | Paling lazim dan paling mudah didukung UPT TIK; mendukung CTE, _window function_, _generated column_, dan CHECK constraint                                         |
| Mesin pencari          | Meilisearch                                                                   | 1.x   | Ringan (satu biner), toleransi salah ketik bawaan, penyaring aspek, sinonim, dukungan bahasa Indonesia memadai; jauh lebih ringan daripada Elasticsearch           |
| _Cache_, sesi, antrean | Redis                                                                         | 7.x   | Satu komponen untuk tiga kebutuhan; mendukung Laravel Horizon                                                                                                      |
| Penyimpanan berkas     | Berkas lokal (Fase 1) → MinIO / S3 (Fase 2+)                                  | —     | Abstraksi `Storage` Laravel memungkinkan peralihan tanpa perubahan kode                                                                                            |
| Peladen web            | Nginx + PHP-FPM                                                               | —     | Standar industri; konfigurasi keamanan matang                                                                                                                      |
| Pemroses PDF           | `smalot/pdfparser` (ekstraksi teks), `poppler-utils` (`pdftotext`, `pdfinfo`) | —     | Ekstraksi teks dan pembacaan jumlah halaman                                                                                                                        |
| OCR                    | Tesseract OCR + `ocrmypdf` (Bahasa Indonesia)                                 | 5.x   | Membuat PDF hasil pindaian dapat dicari                                                                                                                            |
| Antivirus              | ClamAV                                                                        | —     | Pemindaian berkas unggahan (opsional namun dianjurkan)                                                                                                             |
| Pemantauan galat       | Sentry (_self-hosted_ atau berbayar)                                          | —     | Pelacakan galat produksi                                                                                                                                           |
| Kontainerisasi         | Docker + Docker Compose                                                       | —     | Konsistensi lingkungan pengembangan dan produksi                                                                                                                   |
| Pengujian              | PHPUnit / Pest + Laravel Dusk                                                 | —     | Pengujian unit, fitur, dan _end-to-end_                                                                                                                            |
| CI/CD                  | GitHub Actions atau GitLab CI                                                 | —     | Analisis statis, pengujian otomatis, penyebaran                                                                                                                    |

### G.2.2 Alternatif yang Dipertimbangkan

| Alternatif                                              | Kelebihan                                                              | Kekurangan                                                                                                                                                          | Kesimpulan                                                                 |
| ------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **Laravel + Inertia.js + Vue 3**                        | Pengalaman pengguna panel admin lebih dinamis                          | SEO portal publik memerlukan SSR terpisah; kompleksitas _build_ bertambah                                                                                           | Layak bila tim menguasai Vue; SSR wajib untuk halaman publik               |
| **Next.js + NestJS (TypeScript)**                       | Satu bahasa lintas tumpukan; SSR/ISR bawaan                            | Beban operasional dua proses; ketersediaan pengembang PHP lebih tinggi di lingkungan kampus                                                                         | Tidak direkomendasikan untuk konteks ini                                   |
| **Django + PostgreSQL**                                 | Panel admin bawaan sangat kuat; pencarian penuh teks PostgreSQL unggul | Ekosistem PHP lebih dikenal tim kampus; alih kelola lebih sulit                                                                                                     | Alternatif kuat bila tim berlatar Python                                   |
| **CodeIgniter 4**                                       | Ringan, ambang belajar rendah                                          | Ekosistem lebih terbatas (tanpa antrean, penjadwal, dan otorisasi bawaan); sebagian besar harus dibangun sendiri                                                    | Tidak dianjurkan untuk sistem dengan 50 tabel dan RBAC berlapis            |
| **WordPress + plugin**                                  | Tercepat untuk dibangun                                                | Model data tidak sesuai (metadata hukum akan menjadi _post meta_ tanpa struktur); RBAC berlapis dan relasi antarperaturan sulit diwujudkan; permukaan keamanan luas | **Tidak layak**                                                            |
| **PostgreSQL** (menggantikan MySQL)                     | _Partial unique index_, FK pada tabel terpartisi, `tsvector`, `JSONB`  | Ketersediaan dukungan operasional lebih terbatas pada sebagian UPT TIK                                                                                              | **Dianjurkan bila UPT TIK sanggup memeliharanya** — lihat Bagian D § D.7.3 |
| **Elasticsearch/OpenSearch** (menggantikan Meilisearch) | Sangat kaya fitur, skala besar                                         | Konsumsi memori ≥ 2 GB, konfigurasi rumit; berlebihan untuk ≤ 5.000 dokumen                                                                                         | Tidak perlu pada skala ini                                                 |

### G.2.3 Kebutuhan Infrastruktur Minimum

| Lingkungan            | CPU    | RAM  | Penyimpanan | Catatan                                                  |
| --------------------- | ------ | ---- | ----------- | -------------------------------------------------------- |
| Pengembangan          | 2 vCPU | 4 GB | 40 GB       | Docker Compose                                           |
| Pengujian (_staging_) | 2 vCPU | 4 GB | 60 GB       | Cerminan produksi dengan data tersamarkan                |
| Produksi (tahun 1–2)  | 4 vCPU | 8 GB | 200 GB SSD  | Aplikasi + MySQL + Redis + Meilisearch pada satu peladen |
| Produksi (tahun 3+)   | 4 vCPU | 8 GB | 100 GB      | Aplikasi; basis data dan penyimpanan objek dipisahkan    |
| Basis data terpisah   | 2 vCPU | 8 GB | 100 GB SSD  | Bila pemisahan diterapkan                                |
| Cadangan luar lokasi  | —      | —    | ≥ 500 GB    | Retensi 30 salinan harian + 12 salinan bulanan           |

Alokasi RAM produksi tahun 1: PHP-FPM 2 GB · MySQL 3 GB · Meilisearch 1 GB · Redis 512 MB ·
sistem operasi dan cadangan 1,5 GB.

---

## G.3 Strategi Pencarian

### G.3.1 Arsitektur Pencarian Dua Lapis

```
Permintaan pencarian
        │
        ▼
┌───────────────────────────────┐
│ SearchService (antarmuka)     │
└───────┬───────────────┬───────┘
        │               │
   utama │               │ cadangan (bila utama gagal)
        ▼               ▼
┌───────────────┐  ┌─────────────────────────┐
│ Meilisearch   │  │ MySQL FULLTEXT + LIKE   │
│ • toleransi   │  │ • tanpa toleransi salah │
│   salah ketik │  │   ketik                 │
│ • facet count │  │ • penyaring tetap jalan │
│ • sinonim     │  │ • ditandai "mode        │
│ • highlight   │  │   terbatas" ke pengguna │
└───────────────┘  └─────────────────────────┘
```

Abstraksi `SearchService` wajib ada sejak awal agar (a) sistem tetap berfungsi ketika mesin pencari
mati, dan (b) penggantian mesin pencari di masa depan tidak menyentuh pengendali dan tampilan.

### G.3.2 Skema Indeks Meilisearch

```json
{
  "indexUid": "dokumen",
  "primaryKey": "id",
  "searchableAttributes": [
    "judul",
    "nomor_lengkap",
    "nomor",
    "abstrak",
    "kata_kunci",
    "jenis_peraturan",
    "penandatangan",
    "isi_teks"
  ],
  "filterableAttributes": [
    "jenis_peraturan_id",
    "tahun",
    "unit_kerja_id",
    "unit_jalur",
    "kategori_ids",
    "bidang_hukum_id",
    "status_dokumen_id",
    "tag_ids",
    "lingkup",
    "tingkat_akses",
    "status_publikasi",
    "tanggal_penetapan_ts"
  ],
  "sortableAttributes": ["tanggal_penetapan_ts", "tahun", "jumlah_diunduh", "judul"],
  "rankingRules": [
    "words",
    "typo",
    "proximity",
    "attribute",
    "sort",
    "exactness",
    "tanggal_penetapan_ts:desc"
  ],
  "displayedAttributes": [
    "id",
    "kode_dokumen",
    "slug",
    "judul",
    "nomor_lengkap",
    "tahun",
    "jenis_peraturan",
    "unit_kerja",
    "status_dokumen",
    "status_warna",
    "tingkat_akses",
    "tanggal_penetapan",
    "jumlah_berkas",
    "cuplikan"
  ],
  "stopWords": ["dan", "atau", "yang", "tentang", "dengan", "untuk", "pada", "dari"],
  "synonyms": {
    "sk": ["surat keputusan", "keputusan"],
    "perrek": ["peraturan rektor"],
    "keprek": ["keputusan rektor"],
    "se": ["surat edaran"],
    "permen": ["peraturan menteri"],
    "uu": ["undang-undang", "undang undang"],
    "pp": ["peraturan pemerintah"],
    "sop": ["standard operating procedure", "prosedur operasional standar"],
    "mou": ["memorandum of understanding", "kesepahaman"],
    "kkn": ["kuliah kerja nyata"],
    "ukt": ["uang kuliah tunggal"]
  },
  "typoTolerance": {
    "enabled": true,
    "minWordSizeForTypos": { "oneTypo": 5, "twoTypos": 9 },
    "disableOnAttributes": ["nomor", "nomor_lengkap"]
  },
  "pagination": { "maxTotalHits": 5000 }
}
```

**Catatan penting**

1. `typoTolerance` **dinonaktifkan** pada atribut `nomor` dan `nomor_lengkap` — kesalahan toleransi
   pada nomor peraturan menghasilkan hasil yang menyesatkan secara hukum.
2. `unit_jalur` disimpan sebagai atribut penyaring agar penelusuran unit kerja berjenjang dapat
   dilakukan dengan satu penyaring (`unit_jalur STARTS WITH "1/5"`), tanpa perlu mengirim daftar
   seluruh unit bawahan.
3. `isi_teks` ditempatkan **terakhir** pada `searchableAttributes` agar kecocokan pada judul dan
   nomor selalu berperingkat lebih tinggi daripada kecocokan pada isi naskah.
4. Dokumen bertingkat akses `rahasia` dan berstatus publikasi selain `terbit` **tidak pernah
   diindeks** pada indeks publik — penegakan BR-09 dan BR-13 di tingkat pengindeksan, bukan hanya
   di tingkat penyaring kueri. Indeks administrasi terpisah (`dokumen_admin`) dipakai untuk panel
   administrasi.

### G.3.3 Strategi Pengindeksan

| Peristiwa                                    | Tindakan                                                          | Mekanisme                           |
| -------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------- |
| Dokumen diterbitkan                          | Tambahkan ke indeks publik                                        | _Queue job_ dipicu _observer_       |
| Metadata dokumen berubah                     | Perbarui kedua indeks                                             | _Queue job_                         |
| Dokumen ditarik / dihapus                    | Hapus dari indeks publik                                          | _Queue job_                         |
| Tingkat akses menjadi `rahasia`              | Hapus dari indeks publik                                          | _Queue job_                         |
| Teks PDF selesai diekstraksi                 | Perbarui atribut `isi_teks`                                       | _Queue job_ berantai                |
| Data master berubah (nama unit kerja, jenis) | Indeks ulang dokumen terdampak                                    | _Queue job_ massal, dikelompokkan   |
| Pemeriksaan integritas                       | Bandingkan jumlah basis data vs indeks; indeks ulang bila selisih | Tugas terjadwal harian              |
| Pemulihan penuh                              | Indeks ulang seluruh dokumen                                      | Perintah `php artisan jdih:reindex` |

Kegagalan pengindeksan **tidak boleh** membatalkan operasi basis data (lihat UC-41 pengecualian E2).
Kegagalan masuk antrean percobaan ulang dan ditampilkan sebagai peringatan pada dasbor Superadmin.

### G.3.4 Cadangan MySQL FULLTEXT

```sql
-- Indeks FULLTEXT pada tabel dokumen (lihat Bagian D § D.2.1)
ALTER TABLE dokumen ADD FULLTEXT ft_dokumen_pencarian (judul, abstrak, isi_teks);

-- Kueri cadangan dengan peringkat relevansi
SELECT d.*,
       MATCH(d.judul, d.abstrak, d.isi_teks) AGAINST (:q IN NATURAL LANGUAGE MODE) AS skor
FROM dokumen d
WHERE d.status_publikasi = 'terbit'
  AND d.tingkat_akses <> 'rahasia'
  AND d.dihapus_pada IS NULL
  AND (MATCH(d.judul, d.abstrak, d.isi_teks) AGAINST (:q IN NATURAL LANGUAGE MODE)
       OR d.nomor_normal = UPPER(TRIM(:q))
       OR d.judul LIKE CONCAT('%', :q, '%'))
ORDER BY skor DESC, d.tanggal_penetapan DESC
LIMIT 20 OFFSET :offset;
```

Keterbatasan yang perlu disampaikan ke pengguna saat mode cadangan aktif: tanpa toleransi salah
ketik, tanpa sinonim, tanpa penyorotan potongan teks, dan jumlah penyaring aspek dihitung dengan
kueri agregasi terpisah yang lebih lambat.

---

## G.4 Strategi Penyimpanan Berkas

### G.4.1 Struktur dan Konvensi

```
storage/
└── dokumen/
    └── {tahun}/                       ← tahun penetapan dokumen
        └── {dokumen_id}/
            ├── {uuid}.pdf             ← nama simpan acak
            ├── {uuid}.pdf
            └── arsip/                 ← versi berkas yang telah diganti
                └── {uuid}.pdf
media/
└── {tahun}/{bulan}/
    ├── {uuid}.webp                    ← gambar asli (dikonversi)
    ├── {uuid}-thumb.webp              ← 320 px
    └── {uuid}-medium.webp             ← 800 px
impor/
└── {uuid}.xlsx
cadangan/
└── {tanggal}/
    ├── basisdata.sql.gz
    └── berkas.tar.gz
```

**Ketentuan wajib**

| No  | Ketentuan                                                                                        | Alasan                                                  |
| --- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| 1   | Berkas disimpan **di luar** _document root_ peladen web                                          | Mencegah akses langsung tanpa pemeriksaan izin (NFR-15) |
| 2   | Nama simpan berupa UUID, nama asli disimpan di basis data                                        | Mencegah penebakan jalur dan bentrokan nama             |
| 3   | Eksekusi skrip dinonaktifkan pada direktori penyimpanan                                          | Mitigasi unggahan berkas berbahaya                      |
| 4   | Jenis MIME diverifikasi dari isi berkas (_magic bytes_), bukan dari ekstensi atau _header_ klien | Mitigasi pemalsuan jenis berkas                         |
| 5   | Penyajian berkas selalu melalui pengendali atau URL bertanda tangan berumur ≤ 15 menit           | Penegakan otorisasi pada setiap permintaan (NFR-16)     |
| 6   | _Hash_ SHA-256 dihitung dan disimpan pada setiap unggahan                                        | Verifikasi integritas dan deteksi duplikasi             |
| 7   | Berkas yang diganti dipindahkan ke `arsip/`, tidak dihapus                                       | Ketertelusuran dokumen hukum                            |
| 8   | Ukuran maksimum dikonfigurasi (baku 25 MB), diselaraskan pada Nginx, PHP, dan aplikasi           | Mencegah galat yang membingungkan akibat batas berbeda  |

### G.4.2 Penyelarasan Batas Ukuran Unggahan

| Lapisan  | Parameter                               | Nilai  |
| -------- | --------------------------------------- | ------ |
| Nginx    | `client_max_body_size`                  | `30M`  |
| PHP      | `upload_max_filesize`                   | `25M`  |
| PHP      | `post_max_size`                         | `30M`  |
| PHP      | `max_execution_time`                    | `300`  |
| PHP      | `memory_limit`                          | `512M` |
| Aplikasi | `pengaturan['unggahan.ukuran_maks_mb']` | `25`   |

### G.4.3 Alur Pemrosesan Berkas

```
Unggah berkas
  │
  ├─▶ [1] Validasi ukuran ────────────────────── gagal → tolak
  ├─▶ [2] Validasi MIME nyata (magic bytes) ──── gagal → tolak
  ├─▶ [3] Bersihkan nama berkas ─────────────────────────┐
  ├─▶ [4] Pindai antivirus (ClamAV) ──────────── gagal → karantina + notifikasi
  ├─▶ [5] Hitung hash SHA-256 ─────────────────── duplikat pada dokumen sama → tolak
  ├─▶ [6] Simpan ke penyimpanan (nama UUID) ─────────────┤
  ├─▶ [7] Simpan baris dokumen_berkas ───────────────────┤ (dalam satu transaksi;
  │                                                       │  kegagalan → hapus berkas)
  └─▶ [8] Antrean latar belakang:
          ├── baca jumlah halaman (pdfinfo)
          ├── ekstraksi teks (pdftotext / pdfparser)
          ├── bila teks kosong → OCR (ocrmypdf -l ind)
          ├── simpan ke dokumen.isi_teks
          └── perbarui indeks pencarian
```

---

## G.5 Keamanan

### G.5.1 Daftar Kendali Keamanan

| No  | Area              | Kendali                                                                                                                   | Verifikasi                                       |
| --- | ----------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| 1   | Autentikasi       | _Hashing_ Argon2id (atau bcrypt _cost_ ≥ 12); kata sandi minimal 10 karakter dengan pemeriksaan daftar bocor              | Uji kebijakan kata sandi                         |
| 2   | Autentikasi       | Pembatasan percobaan login (5 per 15 menit per akun dan per IP) + penguncian sementara                                    | Uji _brute force_                                |
| 3   | Autentikasi       | 2FA berbasis TOTP, diwajibkan bagi Superadmin                                                                             | Uji gerbang panel admin                          |
| 4   | Autentikasi       | Pesan galat login generik (mitigasi _user enumeration_)                                                                   | Tinjauan pesan galat                             |
| 5   | Sesi              | Kuki `HttpOnly`, `Secure`, `SameSite=Lax`; regenerasi ID sesi saat login; kedaluwarsa 120 menit                           | Pemeriksaan _header_                             |
| 6   | Otorisasi         | Pemeriksaan izin di sisi peladen pada **setiap** rute dan aksi, melalui _policy_ dan _middleware_                         | Pengujian otomatis 100% jalur otorisasi (NFR-31) |
| 7   | Otorisasi         | Cakupan unit kerja diterapkan sebagai _global query scope_, bukan kondisi manual per kueri                                | Tinjauan kode                                    |
| 8   | Otorisasi         | Pemeriksaan ganda pada unduhan: saat penerbitan URL dan saat berkas diminta                                               | Uji perubahan hak akses saat URL aktif           |
| 9   | Injeksi           | Seluruh kueri melalui ORM atau _prepared statement_; tanpa penggabungan string SQL                                        | Analisis statis + tinjauan kode                  |
| 10  | XSS               | _Escaping_ keluaran baku; isi HTML dari editor disanitasi dengan daftar putih tag (HTMLPurifier)                          | Uji muatan XSS pada editor berita                |
| 11  | CSRF              | _Token_ CSRF pada seluruh operasi tulis berbasis formulir                                                                 | Uji permintaan tanpa _token_                     |
| 12  | Unggahan          | Lihat § G.4.1 butir 1–8                                                                                                   | Uji unggahan berkas berbahaya                    |
| 13  | Pembatasan laju   | 60 permintaan/menit/IP pada API; 30 pencarian/menit/IP; 30 unduhan/jam/IP anonim; 5 pengiriman formulir kontak/jam/IP     | Uji beban                                        |
| 14  | _Header_ keamanan | CSP, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, HSTS | Pemeriksaan pemindai _header_                    |
| 15  | Transportasi      | HTTPS wajib; TLS 1.2+; pengalihan otomatis dari HTTP                                                                      | Uji SSL                                          |
| 16  | Rahasia           | Kredensial pada variabel lingkungan; nilai konfigurasi sensitif terenkripsi di basis data; tanpa rahasia pada repositori  | Pemindaian rahasia pada CI                       |
| 17  | Privasi           | Alamat IP di-_hash_ dengan garam pada seluruh log statistik                                                               | Tinjauan skema                                   |
| 18  | Audit             | Seluruh operasi tulis tercatat; log tidak dapat diubah melalui aplikasi; kolom sensitif disamarkan                        | Uji kelengkapan log                              |
| 19  | Ketergantungan    | Pemindaian kerentanan dependensi pada setiap _build_; pembaruan keamanan bulanan                                          | `composer audit` pada CI                         |
| 20  | Anti-bot          | CAPTCHA (Turnstile/reCAPTCHA) pada formulir kontak dan pendaftaran                                                        | Uji pengiriman otomatis                          |
| 21  | Uji penetrasi     | Uji dasar sebelum rilis; nol temuan Tinggi/Kritis (NFR-14)                                                                | Laporan uji penetrasi                            |
| 22  | Pemulihan         | Uji pemulihan cadangan setiap kuartal, bukan hanya pencadangan                                                            | Catatan hasil uji pemulihan                      |

### G.5.2 Pola Kode Otorisasi

Penegakan cakupan unit kerja sebaiknya diwujudkan sebagai _global scope_, agar tidak ada jalur kueri
yang terlewat:

```php
// app/Modul/Dokumen/Model/Dokumen.php
protected static function booted(): void
{
    static::addGlobalScope('cakupan_unit', function (Builder $query) {
        $aktor = auth()->user();

        // Tanpa autentikasi atau di luar panel admin → hanya dokumen terbit & publik
        if (! $aktor) {
            $query->where('status_publikasi', 'terbit')
                  ->where('tingkat_akses', '!=', 'rahasia');
            return;
        }

        // Superadmin melewati pembatasan cakupan
        if ($aktor->punyaPeran('superadmin')) {
            return;
        }

        // Peran berlingkup unit → batasi ke unit dalam cakupan
        if ($aktor->peranBerlingkupUnit()) {
            $jalurCakupan = $aktor->jalurUnitDalamCakupan();   // dari cache
            $query->whereIn('unit_kerja_id', $aktor->idUnitDalamCakupan());
        }
    });
}
```

Setiap aksi tetap diperiksa melalui _policy_ terpisah:

```php
// app/Modul/Dokumen/Policy/DokumenPolicy.php
public function terbitkan(Pengguna $aktor, Dokumen $dokumen): Response
{
    if (! $aktor->punyaIzin('dokumen.terbitkan')) {
        return Response::deny('Anda tidak memiliki izin menerbitkan dokumen.');
    }

    if (! $aktor->bolehMengelolaUnit($dokumen->unit_kerja_id)) {
        return Response::deny('Dokumen ini berada di luar cakupan unit kerja Anda.');
    }

    if ($dokumen->status_publikasi !== 'disetujui') {
        return Response::deny('Hanya dokumen berstatus "Disetujui" yang dapat diterbitkan.');
    }

    if (! $dokumen->berkas()->where('jenis_berkas', 'dokumen_utama')->exists()) {
        return Response::deny('Dokumen belum memiliki berkas naskah utama.');   // BR-04
    }

    return Response::allow();
}
```

---

## G.6 Kinerja dan Skalabilitas

### G.6.1 Strategi Penyimpanan Sementara (_Caching_)

| Lapisan          | Objek                                                       | Masa Berlaku | Pembersihan                                |
| ---------------- | ----------------------------------------------------------- | ------------ | ------------------------------------------ |
| Peramban / CDN   | Aset statis (CSS, JS, gambar, font)                         | 1 tahun      | _Cache busting_ melalui _hash_ nama berkas |
| CDN              | Halaman detail dokumen publik                               | 10 menit     | Pembersihan saat dokumen berubah           |
| Aplikasi (Redis) | Data master (unit kerja, jenis peraturan, kategori, status) | 24 jam       | _Observer_ pada perubahan master           |
| Aplikasi (Redis) | Izin efektif per akun                                       | 30 menit     | Perubahan peran/izin/unit akses            |
| Aplikasi (Redis) | Struktur menu navigasi                                      | 24 jam       | Perubahan `menu_item`                      |
| Aplikasi (Redis) | Kartu rekapitulasi beranda dan statistik                    | 15 menit     | Tugas terjadwal + perubahan dokumen        |
| Aplikasi (Redis) | Relasi antarperaturan per dokumen                           | 1 jam        | Perubahan `dokumen_relasi`                 |
| Aplikasi (Redis) | Daftar kata kunci populer                                   | 1 jam        | Tugas terjadwal                            |
| Basis data       | _Query cache_ dinonaktifkan (dihapus pada MySQL 8)          | —            | Mengandalkan _buffer pool_                 |

### G.6.2 Penanganan Masalah Kinerja yang Diantisipasi

| Masalah                                          | Gejala                                            | Penanganan                                                                                                                                        |
| ------------------------------------------------ | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kueri N+1 pada daftar dokumen                    | 1 kueri daftar + N kueri jenis/unit/status        | _Eager loading_ wajib: `with(['jenisPeraturan','unitKerja','statusDokumen','berkasUtama'])`; pendeteksi N+1 diaktifkan di lingkungan pengembangan |
| Kolom `isi_teks` memberatkan daftar              | Muatan kueri membengkak sampai puluhan MB         | Kolom dikecualikan dari `SELECT` melalui `$hidden` dan pemuatan tertunda; daftar memakai `select()` eksplisit                                     |
| Penghitung unduhan memicu tulis pada tabel panas | Kunci baris pada `dokumen` saat unduhan bersamaan | Penambahan penghitung melalui antrean, dikelompokkan setiap 60 detik                                                                              |
| Agregasi statistik atas tabel `unduhan`          | Halaman statistik lambat seiring pertumbuhan data | Agregasi disimpan pada `dokumen_statistik_harian` melalui tugas terjadwal                                                                         |
| Pagination _offset_ besar                        | `OFFSET 10000` sangat lambat                      | Batas maksimum 5.000 hasil pada indeks; penelusuran mendalam diarahkan ke penyaring, bukan halaman ke-500                                         |
| Pemuatan pohon unit kerja/kategori               | Rekursi berulang                                  | _Materialized path_ (`jalur`) + _cache_ pohon utuh                                                                                                |
| Kueri relasi dua arah                            | Dua kueri per tampilan detail                     | Hasil gabungan di-_cache_ per dokumen                                                                                                             |
| Unggahan besar memblokir permintaan              | Waktu tunggu pengguna panjang                     | Pemrosesan pascaunggah (ekstraksi, OCR, pengindeksan) dipindah ke antrean                                                                         |
| Berkas PDF besar dialirkan melalui PHP           | Konsumsi memori tinggi                            | `X-Accel-Redirect` (Nginx) atau URL bertanda tangan langsung ke penyimpanan objek                                                                 |

### G.6.3 Jalur Peningkatan Kapasitas

| Pemicu                                 | Tindakan                                                                                                                                           |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Beban CPU aplikasi > 70% berkelanjutan | Tambah proses PHP-FPM; lanjut ke penskalaan horizontal aplikasi di belakang _load balancer_ (sesi sudah di Redis, sehingga tanpa _sticky session_) |
| Basis data menjadi hambatan            | Pisahkan MySQL ke peladen tersendiri; tambahkan replika baca untuk portal publik                                                                   |
| Penyimpanan berkas > 70% kapasitas     | Pindahkan ke MinIO/S3; abstraksi `Storage` membuat perpindahan tanpa perubahan kode                                                                |
| `unduhan` > 5 juta baris               | Terapkan partisi bulanan (Bagian D § D.2.10)                                                                                                       |
| `log_aktivitas` > 10 juta baris        | Partisi bulanan + arsip ke penyimpanan dingin setelah 3 tahun                                                                                      |
| Lalu lintas publik melonjak            | Aktifkan CDN dengan _cache_ halaman publik                                                                                                         |
| Meilisearch melampaui memori           | Tambah RAM, atau pindahkan ke instans terpisah                                                                                                     |

---

## G.7 Integrasi

### G.7.1 Integrasi JDIHN

Prinsip desain: **lapisan adaptor terisolasi**, karena spesifikasi antarmuka JDIHN berada di luar
kendali ITH dan dapat berubah (BT-02).

```
app/Modul/Integrasi/Jdihn/
├── Kontrak/
│   └── KlienJdihn.php            ← antarmuka (interface)
├── Klien/
│   ├── KlienJdihnHttp.php        ← implementasi nyata
│   └── KlienJdihnPalsu.php       ← implementasi untuk pengujian
├── Pemetaan/
│   └── PemetaMetadataJdihn.php   ← dokumen internal → skema JDIHN
├── Job/
│   ├── SinkronkanDokumen.php
│   └── SinkronkanUlangGagal.php
└── Konfigurasi/
    └── pemetaan-kode.php         ← padanan kode jenis/status internal ↔ JDIHN
```

**Langkah persiapan sebelum implementasi** (lihat butir verifikasi V-08):
(1) pendaftaran ITH sebagai anggota JDIHN; (2) perolehan spesifikasi antarmuka dan kredensial;
(3) penyusunan tabel padanan kode jenis peraturan dan status; (4) pengujian pada lingkungan uji
JDIHN bila tersedia.

**Ketahanan** — percobaan ulang dengan jeda meningkat (1, 5, 15, 60 menit, maksimal 5 kali);
kegagalan autentikasi menghentikan seluruh antrean dan memicu notifikasi darurat agar tidak terjadi
kegagalan berulang tanpa pengawasan; seluruh permintaan dan respons tercatat pada
`log_sinkronisasi_jdihn` untuk penelusuran masalah.

### G.7.2 Integrasi SSO Institusi

| Aspek                   | Ketentuan                                                                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Protokol                | OpenID Connect (dianjurkan) atau SAML 2.0, sesuai penyedia identitas ITH                                                                                      |
| Atribut wajib           | `email`, `name`, `sub` (pengenal tetap)                                                                                                                       |
| Atribut dianjurkan      | `nip`/`nidn`, `unit_kerja`/`department`, `employee_type`                                                                                                      |
| Pembuatan akun otomatis | Diizinkan dengan peran baku `dosen_staf` dan status `aktif`                                                                                                   |
| Pemetaan unit kerja     | Melalui tabel padanan kode unit penyedia identitas ↔ `unit_kerja.kode`; bila tidak dikenali, akun dibuat tanpa unit dan masuk antrean verifikasi              |
| Penetapan peran         | Peran `admin` dan `superadmin` **tidak pernah** diberikan otomatis melalui SSO; hanya oleh Superadmin (mencegah eskalasi hak akses melalui atribut eksternal) |
| Autentikasi lokal       | Tetap tersedia sebagai cadangan, khususnya untuk akun Superadmin, agar sistem tetap dapat diakses ketika SSO mati                                             |

### G.7.3 API Publik Baca-Saja

| Titik Akhir                              | Keterangan                                                                                                                     |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `GET /api/v1/dokumen`                    | Daftar dokumen publik terbit; parameter: `q`, `jenis`, `tahun`, `unit`, `kategori`, `status`, `halaman`, `per_halaman`, `urut` |
| `GET /api/v1/dokumen/{kode}`             | Detail satu dokumen beserta relasi dan daftar berkas                                                                           |
| `GET /api/v1/dokumen/{kode}/berkas/{id}` | Pengalihan ke URL unduh bertanda tangan                                                                                        |
| `GET /api/v1/master/jenis-peraturan`     | Daftar jenis peraturan                                                                                                         |
| `GET /api/v1/master/unit-kerja`          | Pohon unit kerja                                                                                                               |
| `GET /api/v1/master/kategori`            | Pohon kategori                                                                                                                 |
| `GET /api/v1/statistik`                  | Rekapitulasi statistik publik                                                                                                  |
| `GET /api/v1/informasi`                  | Daftar berita dan artikel hukum terbit                                                                                         |

Ketentuan: format JSON:API atau JSON sederhana yang konsisten; versi pada jalur URL; pembatasan
laju 60 permintaan/menit/IP; dokumentasi OpenAPI 3 tersedia pada `/api/dokumentasi`; **hanya**
menyajikan dokumen bertingkat akses `publik` dan berstatus `terbit`.

### G.7.4 SEO dan Penemuan Konten

| Elemen                  | Penerapan                                                                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `sitemap.xml`           | Dibuat otomatis dan dimutakhirkan saat dokumen diterbitkan atau ditarik; terpecah per 10.000 URL bila diperlukan                                             |
| Penanda terstruktur     | `schema.org/Legislation` pada halaman detail dokumen (`legislationIdentifier`, `legislationDate`, `legislationType`, `legislationJurisdiction`, `publisher`) |
| Metadata sosial         | Open Graph dan Twitter Card pada halaman dokumen dan berita                                                                                                  |
| URL kanonik             | Satu URL kanonik per dokumen; variasi penyaring memakai `rel="canonical"` ke halaman indeks                                                                  |
| Pengalihan              | Perubahan `slug` menghasilkan pengalihan 301 dari `slug` lama (NFR-37)                                                                                       |
| `robots.txt`            | Melarang perayapan `/admin`, `/akun`, dan URL berparameter pencarian                                                                                         |
| Perenderan sisi peladen | Seluruh halaman publik dirender di peladen — prasyarat agar dokumen hukum terindeks mesin pencari                                                            |

---

## G.8 Strategi Pengujian

| Tingkat         | Cakupan                                                                  | Perkakas                         | Target                                                    |
| --------------- | ------------------------------------------------------------------------ | -------------------------------- | --------------------------------------------------------- |
| Unit            | Logika _service_, validator, pemeta metadata, penghitung tenggat         | Pest/PHPUnit                     | ≥ 70% lapisan _service_                                   |
| Fitur/Integrasi | Rute, otorisasi, alur kerja publikasi, unggahan, impor                   | Pest + basis data uji            | **100% jalur otorisasi dan transisi alur kerja** (NFR-31) |
| Basis data      | _Constraint_, aksi referensial, kolom terkomputasi                       | Migrasi + pengujian _constraint_ | Seluruh _unique_ dan _check constraint_ diuji             |
| _End-to-end_    | Alur pengguna kritis: cari → detail → unduh; input → verifikasi → terbit | Laravel Dusk / Playwright        | 8–12 skenario utama                                       |
| Keamanan        | Otorisasi menyilang peran, unggahan berbahaya, muatan XSS/SQLi           | Pengujian manual + otomatis      | Nol temuan Tinggi/Kritis                                  |
| Kinerja         | Daftar dokumen, pencarian, unduhan bersamaan                             | k6 / Apache JMeter               | NFR-01 s.d. NFR-04 terpenuhi                              |
| Aksesibilitas   | Kontras, navigasi papan tuntas, ARIA                                     | axe DevTools + tinjauan manual   | WCAG 2.1 AA                                               |

**Skenario pengujian otorisasi yang wajib ada** (paling rawan kesalahan pada sistem ini):

1. Admin unit A mencoba mengubah dokumen unit B → 403.
2. Admin unit A mencoba mengubah dokumen unit bawahan A → diizinkan.
3. Dosen/Staf mengunduh dokumen `internal` → diizinkan; dokumen `terbatas` tanpa hak → ditolak.
4. Pengunjung anonim mengakses URL dokumen `rahasia` secara langsung → 404 (bukan 403, agar
   keberadaan dokumen tidak terungkap).
5. Dokumen `draf` diakses melalui URL publik → 404.
6. Verifikator menyetujui dokumen buatan sendiri → ditolak (BR-08).
7. Penerbitan dokumen tanpa berkas utama → ditolak (BR-04).
8. Penonaktifan Superadmin terakhir → ditolak (BR-27).
9. URL unduh bertanda tangan yang sudah kedaluwarsa → ditolak.
10. Hak akses dicabut saat URL bertanda tangan masih aktif → unduhan ditolak (pemeriksaan ganda).

---

## G.9 Penyebaran dan Operasional

### G.9.1 Lingkungan

| Lingkungan            | Tujuan                                       | Data                                              | Akses                       |
| --------------------- | -------------------------------------------- | ------------------------------------------------- | --------------------------- |
| Lokal                 | Pengembangan                                 | Data contoh (_seeder_)                            | Pengembang                  |
| Pengujian (_staging_) | Verifikasi sebelum rilis; pelatihan pengguna | Cerminan produksi dengan data pribadi tersamarkan | Tim + pemilik proses bisnis |
| Produksi              | Operasional                                  | Data nyata                                        | Publik + pengguna berwenang |

### G.9.2 Alur CI/CD

```
Push ke cabang ──▶ CI:
                   ├── Analisis statis (PHPStan level 5+, Larastan)
                   ├── Pemeriksaan gaya kode (Pint / PHP-CS-Fixer, PSR-12)
                   ├── Pengujian unit + fitur
                   ├── Pemindaian kerentanan dependensi (composer audit)
                   ├── Pemindaian rahasia pada kode
                   └── Kompilasi aset (Vite)
                            │
              gabung ke `main` ──▶ Penyebaran ke *staging* (otomatis)
                            │
                  persetujuan manual ──▶ Penyebaran ke produksi
                                          ├── Mode pemeliharaan aktif
                                          ├── php artisan migrate --force
                                          ├── Pembersihan & pembangunan *cache*
                                          ├── Muat ulang PHP-FPM & Horizon
                                          ├── Pemeriksaan kesehatan
                                          └── Mode pemeliharaan nonaktif
```

Ketentuan penyebaran: migrasi wajib bersifat maju-saja pada produksi dengan berkas pembatalan
tersedia; migrasi yang mengubah struktur tabel besar dijalankan pada jendela pemeliharaan; cadangan
basis data dibuat **sebelum** setiap penyebaran yang memuat migrasi.

### G.9.3 Tugas Terjadwal

| Jadwal         | Tugas                                                                                                            |
| -------------- | ---------------------------------------------------------------------------------------------------------------- |
| Setiap menit   | Pemroses antrean (Horizon), pemeriksaan penerbitan terjadwal                                                     |
| Setiap 5 menit | Pemutakhiran penghitung dilihat/diunduh dari penyangga Redis ke basis data                                       |
| Setiap jam     | Agregasi `dokumen_statistik_harian`, pemutakhiran daftar kata kunci populer                                      |
| Harian 01:00   | Pemutakhiran status keberlakuan otomatis (BR-22), penandaan permintaan akses kedaluwarsa                         |
| Harian 02:00   | Pencadangan basis data dan berkas; unggah ke lokasi luar                                                         |
| Harian 03:00   | Pemeriksaan integritas indeks pencarian; pengindeksan ulang bila selisih                                         |
| Harian 04:00   | Pemeriksaan integritas berkas (keberadaan berkas dan kecocokan _hash_)                                           |
| Harian 05:00   | Percobaan ulang sinkronisasi JDIHN yang gagal                                                                    |
| Mingguan       | Pemeriksaan integritas relasi polimorfik (`dokumen_akses`, `menu_item`); laporan metadata tidak lengkap ke Admin |
| Bulanan        | Pembuatan partisi bulan berikutnya; peringkasan log lama; laporan bulanan ke pimpinan                            |
| Kuartalan      | Pengingat uji pemulihan cadangan; pengingat peninjauan status keberlakuan (S-03)                                 |

### G.9.4 Pemantauan

| Aspek              | Perkakas                                          | Ambang Peringatan                                  |
| ------------------ | ------------------------------------------------- | -------------------------------------------------- |
| Ketersediaan       | Uptime Kuma / pemantau eksternal                  | Tidak dapat dijangkau > 2 menit                    |
| Galat aplikasi     | Sentry                                            | Tingkat galat > 1% permintaan                      |
| Kinerja            | Laravel Telescope (nonproduksi), log akses Nginx  | Persentil ke-95 > 2 detik                          |
| Antrean            | Laravel Horizon                                   | > 100 pekerjaan tertunda, atau ada pekerjaan gagal |
| Penyimpanan        | Skrip pemantauan sistem                           | Pemakaian > 80%                                    |
| Basis data         | `slow_query_log`, `SHOW PROCESSLIST`              | Kueri > 2 detik                                    |
| Cadangan           | Pemeriksaan keberadaan dan ukuran berkas cadangan | Cadangan gagal atau ukuran menyimpang > 20%        |
| Sertifikat TLS     | Pemantau kedaluwarsa                              | Kedaluwarsa < 14 hari                              |
| Sinkronisasi JDIHN | Dasbor internal                                   | > 5 dokumen berstatus gagal                        |

### G.9.5 Pencadangan dan Pemulihan

| Aspek         | Ketentuan                                                                  |
| ------------- | -------------------------------------------------------------------------- |
| Basis data    | `mysqldump` terkompresi harian; `binlog` aktif untuk pemulihan titik waktu |
| Berkas        | Sinkronisasi harian bertahap (_incremental_) ke lokasi luar                |
| Retensi       | 30 salinan harian, 12 salinan bulanan, 3 salinan tahunan                   |
| Lokasi        | Kaidah 3-2-1: 3 salinan, 2 media, 1 di luar lokasi                         |
| Enkripsi      | Berkas cadangan terenkripsi; kunci disimpan terpisah dari cadangan         |
| Uji pemulihan | **Kuartalan**, dengan pencatatan hasil dan durasi aktual                   |
| RPO / RTO     | ≤ 1 jam (dengan `binlog`) / ≤ 4 jam (NFR-09, NFR-10)                       |

---

## G.10 Peta Jalan Pengembangan

| Fase                | Durasi        | Lingkup                                                                                                                                                                                         | Keluaran                                                      |
| ------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| **0 — Persiapan**   | 2–3 pekan     | Validasi butir verifikasi V-01…V-10; finalisasi master data; pengumpulan identitas visual; penyiapan infrastruktur dan repositori                                                               | Dokumen master data tervalidasi; lingkungan pengembangan siap |
| **1 — Fondasi**     | 10–12 pekan   | Skema basis data; autentikasi dan RBAC berlapis; CRUD dokumen dan berkas; pencarian dasar; portal publik; halaman statis; berita; log audit; pencadangan                                        | Sistem dapat dioperasikan untuk katalogisasi dan akses publik |
| **2 — Pematangan**  | 8–10 pekan    | Alur kerja publikasi berjenjang; relasi dan riwayat peraturan; pencarian lanjutan berpenyaring aspek; ekstraksi teks dan OCR; statistik dan laporan; impor massal; notifikasi; pengelolaan menu | Sistem lengkap sesuai kebutuhan wajib dan penting             |
| **3 — Perluasan**   | 6–8 pekan     | Sinkronisasi JDIHN; SSO institusi; API publik; modul Layanan Hukum; penyempurnaan aksesibilitas dan pengalaman pengguna                                                                         | Interoperabilitas dan layanan tambahan                        |
| **4 — Operasional** | berkelanjutan | Migrasi data massal; pelatihan pengguna per peran; penyusunan buku manual; pemantauan; pemeliharaan; evaluasi berkala                                                                           | Sistem beroperasi penuh dan terpelihara                       |

**Total estimasi Fase 0–3: 26–33 pekan (± 7–8 bulan)** dengan tim 3 orang.

### G.10.1 Komposisi Tim yang Dianjurkan

| Peran                                  | Jumlah | Keterlibatan     | Tanggung Jawab Utama                               |
| -------------------------------------- | :----: | ---------------- | -------------------------------------------------- |
| Pengembang _backend_ (pemimpin teknis) |   1    | Penuh            | Arsitektur, basis data, otorisasi, integrasi       |
| Pengembang _full-stack_                |   1    | Penuh            | Panel administrasi, portal publik, antarmuka       |
| Perancang UI/UX                        |   1    | Paruh (Fase 0–2) | Sistem desain, alur pengguna, aksesibilitas        |
| Analis sistem / Pemilik proses bisnis  |   1    | Paruh            | Validasi kebutuhan, master data, penerimaan hasil  |
| Administrator sistem (UPT TIK)         |   1    | Paruh            | Infrastruktur, penyebaran, pencadangan, pemantauan |
| Penguji                                |   1    | Paruh (Fase 1–3) | Pengujian fungsional dan keamanan                  |

### G.10.2 Rencana Migrasi Data Awal

| Tahap | Kegiatan                                                                                     | Keluaran                             |
| ----- | -------------------------------------------------------------------------------------------- | ------------------------------------ |
| 1     | Inventarisasi dokumen pada seluruh unit kerja memakai lembar kerja seragam                   | Daftar dokumen beserta lokasi berkas |
| 2     | Pemindaian dokumen yang belum berbentuk digital (resolusi ≥ 300 dpi, PDF)                    | Berkas PDF                           |
| 3     | Pengisian templat impor oleh masing-masing unit kerja                                        | Berkas XLSX per unit                 |
| 4     | Pravalidasi melalui fitur impor (mode _dry-run_), perbaikan berulang                         | Berkas XLSX bersih                   |
| 5     | Impor metadata dan pencocokan berkas PDF dari arsip ZIP                                      | Dokumen berstatus draf               |
| 6     | Kurasi metadata oleh unit pengelola hukum: abstrak, kategori, kata kunci, status keberlakuan | Dokumen siap diverifikasi            |
| 7     | Pemetaan relasi antarperaturan (dimulai dari peraturan yang masih berlaku)                   | Jaringan relasi terbentuk            |
| 8     | Verifikasi dan penerbitan bertahap, dimulai dari dokumen bertingkat akses publik             | Katalog terbit                       |
| 9     | Sinkronisasi awal ke JDIHN                                                                   | Metadata terkirim                    |

**Prioritas migrasi**: (1) Statuta dan peraturan organisasi; (2) peraturan akademik dan pedoman yang
berlaku; (3) Peraturan Rektor yang masih berlaku; (4) Keputusan Rektor yang bersifat mengatur;
(5) dokumen historis yang sudah dicabut (untuk kelengkapan ketertelusuran).

---

## G.11 Analisis Risiko

| Kode  | Risiko                                                                           | Kemungkinan |      Dampak       | Mitigasi                                                                                                                                                                                |
| ----- | -------------------------------------------------------------------------------- | :---------: | :---------------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RS-01 | Unit kerja tidak konsisten menyerahkan dokumen sehingga katalog tidak lengkap    |   Tinggi    |      Tinggi       | Penetapan kewajiban melalui Keputusan Rektor; penunjukan petugas per unit; dasbor kelengkapan per unit sebagai alat pemantauan pimpinan                                                 |
| RS-02 | Kualitas metadata rendah (judul tidak lengkap, status tidak dimutakhirkan)       |   Tinggi    |      Tinggi       | Validasi wajib saat penerbitan; senarai periksa verifikasi; antrean "metadata tidak lengkap"; peninjauan status per semester                                                            |
| RS-03 | Dokumen bersifat dikecualikan terpublikasi tanpa sengaja                         |   Sedang    | **Sangat tinggi** | Tingkat akses baku bukan `publik` pada konfigurasi awal; verifikasi berjenjang wajib; pengujian otorisasi menyilang peran; penurunan tingkat kerahasiaan memerlukan izin khusus (BR-16) |
| RS-04 | Spesifikasi antarmuka JDIHN berubah atau tidak tersedia                          |   Sedang    |      Sedang       | Lapisan adaptor terisolasi; kegagalan sinkronisasi tidak memengaruhi operasional portal                                                                                                 |
| RS-05 | Data institusional (unit kerja, jenis peraturan) berubah setelah sistem berjalan |   Sedang    |      Sedang       | Seluruh data tersebut berupa master data yang dapat dikelola; penonaktifan sebagai alternatif penghapusan; kode tidak dapat diubah setelah dipakai                                      |
| RS-06 | Ketergantungan pada satu pengembang (_bus factor_ = 1)                           |   Sedang    |      Tinggi       | Dokumentasi teknis wajib; tinjauan kode; penggunaan _framework_ populer; repositori dan kredensial dikuasai institusi, bukan individu                                                   |
| RS-07 | Berkas hilang atau rusak                                                         |   Rendah    | **Sangat tinggi** | Pencadangan 3-2-1; verifikasi _hash_ harian; berkas lama diarsipkan alih-alih dihapus; uji pemulihan kuartalan                                                                          |
| RS-08 | Kinerja menurun seiring pertumbuhan data                                         |   Sedang    |      Sedang       | Strategi indeks, _cache_, partisi, dan agregasi sudah dirancang sejak awal (§ G.6)                                                                                                      |
| RS-09 | Pengambilan data massal oleh pihak luar (_scraping_)                             |   Sedang    |      Rendah       | Pembatasan laju; CAPTCHA pada titik sensitif; API publik resmi sebagai jalur yang sah                                                                                                   |
| RS-10 | Rendahnya adopsi oleh pengguna internal                                          |   Sedang    |      Tinggi       | Pelatihan per peran; buku manual ringkas; sosialisasi melalui kanal resmi; penempatan tautan pada situs utama ITH dan sistem informasi akademik                                         |
| RS-11 | Kualitas OCR buruk pada dokumen hasil pindaian lama                              |   Tinggi    |      Rendah       | Pencarian tetap berfungsi melalui metadata; standar pemindaian ≥ 300 dpi; penandaan dokumen yang perlu pemindaian ulang                                                                 |
| RS-12 | Peladen tunggal menjadi titik kegagalan tunggal                                  |   Sedang    |      Tinggi       | Pencadangan teruji; prosedur pemulihan terdokumentasi; jalur peningkatan ke arsitektur terpisah sudah disiapkan (§ G.6.3)                                                               |
| RS-13 | Anggaran atau sumber daya berkurang di tengah pengembangan                       |   Sedang    |      Tinggi       | Pembagian fase yang tegas; setiap fase menghasilkan sistem yang dapat dioperasikan, bukan hasil setengah jadi                                                                           |
| RS-14 | Konflik nomor peraturan akibat penomoran manual di luar sistem                   |   Sedang    |      Sedang       | Pemeriksaan duplikasi berbasis `nomor_normal`; laporan anomali penomoran per jenis dan tahun                                                                                            |

---

## G.12 Indikator Keberhasilan Pascaimplementasi

| Indikator                                    | Sasaran                  | Periode Pengukuran     |
| -------------------------------------------- | ------------------------ | ---------------------- |
| Kelengkapan katalog produk hukum             | ≥ 95% (S-01)             | 12 bulan setelah rilis |
| Kepatuhan metadata wajib pada dokumen terbit | 100% (S-05)              | Bulanan                |
| Waktu proses draf → terbit                   | Median ≤ 3 hari kerja    | Bulanan                |
| Sesi penelusuran                             | ≥ 500/bulan (S-04)       | Bulanan                |
| Rasio pencarian tanpa hasil                  | ≤ 10%                    | Bulanan                |
| _Uptime_                                     | ≥ 99,5% (S-06)           | Bulanan                |
| Dokumen dengan status keberlakuan ditinjau   | 100% per semester (S-03) | Semesteran             |
| Dokumen publik tersinkronisasi ke JDIHN      | ≥ 95%                    | Kuartalan              |
| Insiden kebocoran dokumen dikecualikan       | 0                        | Berkelanjutan          |
| Keberhasilan uji pemulihan cadangan          | 100%                     | Kuartalan              |

---

**Lanjut ke** → [H. Normalisasi Basis Data](08-normalisasi-basis-data.md)
