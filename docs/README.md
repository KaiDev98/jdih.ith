# Dokumentasi Aktif — JDIH ITH V2

Stack aktif: **NestJS + Next.js + TypeScript**. Sumber kebenaran desain terbaru
untuk seluruh implementasi baru adalah
[docs/CODEX_CONTEXT_JDIH_ITH_V2.md](CODEX_CONTEXT_JDIH_ITH_V2.md).

| Dokumen aktif | Tujuan |
| --- | --- |
| [AGENTS.md](../AGENTS.md) | Aturan kerja dan prioritas sumber kebenaran |
| [CODEX_START_HERE.md](../CODEX_START_HERE.md) | Panduan membaca context pack |
| [CODEX_CONTEXT_JDIH_ITH_V2.md](CODEX_CONTEXT_JDIH_ITH_V2.md) | Baseline desain dan aturan bisnis V2 |
| [CODEX_DECISIONS_JDIH_ITH_V2.yaml](CODEX_DECISIONS_JDIH_ITH_V2.yaml) | Ringkasan keputusan terstruktur |
| [CODEX_IMPLEMENTATION_PLAN.md](CODEX_IMPLEMENTATION_PLAN.md) | Rencana implementasi bertahap |
| [CODEX_AUDIT_V2.md](CODEX_AUDIT_V2.md) | Audit source, konflik legacy, batas Phase 0, dan usulan Phase 1/2 |
| [IDENTITY_SECURITY_V2.md](IDENTITY_SECURITY_V2.md) | Identity, sesi, CSRF, RBAC, dan policy akses |
| [CORE_BACKEND_V2.md](CORE_BACKEND_V2.md) | API domain, workflow, transaksi, dan audit |
| [PHASE4_FILES_SEARCH_TEMPLATES.md](PHASE4_FILES_SEARCH_TEMPLATES.md) | Storage privat, file, search, dan template |
| [FRONTEND_V2.md](FRONTEND_V2.md) | Rute publik dan panel administrasi |
| [DEPLOYMENT_V2.md](DEPLOYMENT_V2.md) | Production environment, Nginx, systemd, DB, storage, backup |
| [FINAL_ACCEPTANCE_V2.md](FINAL_ACCEPTANCE_V2.md) | Final acceptance, known limits, dan go-live checklist |

**Database 50 tabel lama adalah LEGACY SCHEMA / LEGACY REFERENCE, bukan target
final V2.** Phase 0 alignment, V2 physical schema/seed validation, Identity and
Security, Core Backend, Files/Search/Templates, and Frontend are implemented on
the current development branch. Phase 6 is deployment preparation and final
acceptance; no production deployment has been performed. Google live OIDC remains
pending, and CSP acceptance remains a production go-live gate. Runtime MySQL
ports are read from the selected environment; Compose's development port is not
a universal runtime assumption.

## Arsip desain sebelum V2

> **LEGACY DESIGN — BUKAN SUMBER KEBENARAN V2.** Seluruh bagian 1–7, tabel indeks,
> diagram, SQL, dan dokumen Word yang tercantum di bawah merupakan sejarah
> rancangan lama. Klaim validasi adalah hasil historis, bukan hasil pengujian V2.
> Rekomendasi Laravel/Blade/Livewire/Filament, termasuk diagram arsitektur di
> bagian 7, sudah digantikan oleh **NestJS + Next.js + TypeScript**.
> Baca konteks V2 di atas sebelum menggunakan kembali gagasan dari arsip ini.

# Dokumen Perancangan Sistem — Portal JDIH ITH Parepare (Legacy)

**Nama Sistem** : JDIH ITH — Jaringan Dokumentasi dan Informasi Hukum
**Institusi** : Institut Teknologi Bacharuddin Jusuf Habibie (ITH), Parepare, Sulawesi Selatan
**Domain usulan** : `jdih.ith.ac.id`
**Versi dokumen** : 1.0
**Tanggal** : 26 September 2026
**Status** : Rancangan untuk validasi pemangku kepentingan

---

## 1. Tujuan Dokumen

Dokumen ini merupakan _Software Requirement Specification_ (SRS) sekaligus _System Design Document_ (SDD)
untuk pembangunan Portal JDIH ITH Parepare. Dokumen disusun agar dapat dipakai langsung sebagai:

- dasar pengembangan sistem nyata (acuan tim _developer_, _database administrator_, dan _UI/UX designer_);
- lampiran teknis proposal pengadaan/pengembangan sistem informasi di lingkungan ITH;
- landasan penulisan proposal skripsi/tugas akhir bidang Sistem Informasi atau Rekayasa Perangkat Lunak.

## 2. Struktur Dokumen

| Berkas                                                                                             | Bagian   | Isi                                                                                                                                                                                                                                          |
| -------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [01-analisis-kebutuhan.md](01-analisis-kebutuhan.md)                                               | **A**    | Latar belakang, ruang lingkup, pemangku kepentingan, 124 kebutuhan fungsional (FR), 41 kebutuhan non-fungsional (NFR), 32 aturan bisnis (BR), pemetaan metadata JDIHN                                                                        |
| [02-use-case.md](02-use-case.md)                                                                   | **B**    | Identifikasi aktor, 69 use case + 6 use case terinklusi, matriks aktor–use case, relasi `include`/`extend`/generalisasi, 9 skenario detail, sumber PlantUML                                                                                  |
| [03-erd.md](03-erd.md)                                                                             | **C**    | Daftar entitas, ERD konseptual & logis (Mermaid), penjelasan seluruh relasi beserta kardinalitas dan aksi referensial                                                                                                                        |
| [04-struktur-basis-data.md](04-struktur-basis-data.md)                                             | **D**    | 50 tabel: atribut, tipe data, _primary key_, _foreign key_, _unique_, _check_, indeks, strategi partisi, batasan DBMS, dan hasil pengujian skema                                                                                             |
| [05-role-permission.md](05-role-permission.md)                                                     | **E**    | 4 peran, 76 kode izin, matriks _role–permission_, algoritma evaluasi izin 3 lapis, model tingkat akses dokumen                                                                                                                               |
| [06-fitur-dan-menu.md](06-fitur-dan-menu.md)                                                       | **F**    | Rancangan fitur portal publik & panel admin, peta situs, struktur menu per peran, _wireframe_ tekstual                                                                                                                                       |
| [07-rekomendasi-teknis.md](07-rekomendasi-teknis.md)                                               | **G**    | Arsitektur, _tech stack_, strategi pencarian, keamanan, kinerja, integrasi JDIHN, pengujian, _deployment_, peta jalan, analisis risiko                                                                                                       |
| [08-normalisasi-basis-data.md](08-normalisasi-basis-data.md)                                       | **H**    | Analisis 1NF–3NF/BCNF, dekomposisi yang dilakukan, denormalisasi terkendali beserta justifikasi                                                                                                                                              |
| [../database/jdih_ith_schema.sql](../database/jdih_ith_schema.sql)                                 | **D**    | DDL lengkap: 50 tabel, 3 _view_, 85 FK, 38 _unique_, 33 _check_, 4 _trigger_ — **sudah diuji eksekusi**                                                                                                                                      |
| [../database/jdih_ith_seed.sql](../database/jdih_ith_seed.sql)                                     | **D**    | Data referensi awal: jenis peraturan, status keberlakuan, jenis relasi, bidang hukum, kategori, unit kerja, peran, 76 izin, konfigurasi — **sudah diuji eksekusi**                                                                           |
| [diagrams/README.md](diagrams/README.md)                                                           | **B, C** | **Indeks 12 diagram sistem di Whimsical** (use case, ERD, activity, sequence, state, arsitektur, peta situs) beserta tautan masing-masing                                                                                                    |
| [diagrams/use-case.puml](diagrams/use-case.puml)                                                   | **B**    | Sumber diagram _use case_ dan _state machine_ (PlantUML)                                                                                                                                                                                     |
| [diagrams/erd.mmd](diagrams/erd.mmd)                                                               | **C**    | Sumber peta relasi 50 entitas (Mermaid)                                                                                                                                                                                                      |
| [Uraian-Fitur-dan-Hak-Akses-Portal-JDIH-ITH.docx](Uraian-Fitur-dan-Hak-Akses-Portal-JDIH-ITH.docx) | **E, F** | **Dokumen Word siap edar** — uraian menyeluruh dari sudut pandang pengguna: 49 halaman publik, 52 butir menu admin, 95 fitur, seluruh tombol per peran, alur kerja lintas peran, dan matriks kemampuan Superadmin/Admin/Dosen-Staf/Mahasiswa |

## 3. Cara Membaca Diagram

- **Mermaid** (`.mmd`, blok `mermaid` di Markdown) — dirender otomatis oleh GitHub/GitLab,
  atau melalui ekstensi _Markdown Preview Mermaid Support_ di VS Code.
- **PlantUML** (`.puml`) — render melalui ekstensi _PlantUML_ di VS Code, atau salin ke
  <https://www.plantuml.com/plantuml>.

## 4. Status Validasi Skema

Berkas DDL dan data referensi **bukan rancangan di atas kertas** — keduanya telah dieksekusi pada
instans MariaDB 10.4.32 dan perilakunya diuji. Hasil: 50 tabel, 3 _view_, 85 _foreign key_,
38 _unique constraint_, 33 _check constraint_, dan 4 _trigger_ terbentuk tanpa galat; 15 pengujian
perilaku (deteksi duplikasi nomor, penolakan relasi ke diri sendiri, penurunan relasi dua arah,
penegakan tingkat akses, `CASCADE`/`RESTRICT`, dan pembatasan permintaan akses) berjalan sesuai
rancangan. Rincian pada [04-struktur-basis-data.md § D.8](04-struktur-basis-data.md#d8-hasil-pengujian-skema).

Pengujian tersebut juga mengungkap tiga batasan DBMS yang mengubah cara sebagian aturan ditegakkan —
terdokumentasi pada [§ D.0.1](04-struktur-basis-data.md#d01-batasan-dbms-yang-memengaruhi-rancangan).
Yang paling penting: **MySQL 8.0 dan MariaDB sama-sama melarang kolom `AUTO_INCREMENT` dirujuk dalam
`CHECK`**, sehingga aturan `induk_id <> id` pada tabel berjenjang diwujudkan melalui _trigger_ dan
validasi aplikasi, bukan _check constraint_.

## 5. Konvensi Penulisan

| Aspek                 | Konvensi                                                                           | Contoh                       |
| --------------------- | ---------------------------------------------------------------------------------- | ---------------------------- |
| Nama tabel            | Bahasa Indonesia, `snake_case`, bentuk tunggal                                     | `dokumen`, `unit_kerja`      |
| Nama tabel penghubung | `<induk>_<anak>`                                                                   | `dokumen_kategori`           |
| Nama kolom            | `snake_case`, tanpa prefiks nama tabel                                             | `judul`, `tanggal_penetapan` |
| _Foreign key_         | `<tabel_referensi>_id`                                                             | `jenis_peraturan_id`         |
| Kolom audit           | `dibuat_pada`, `diperbarui_pada`, `dihapus_pada`, `dibuat_oleh`, `diperbarui_oleh` | —                            |
| Kolom boolean         | prefiks `is_`                                                                      | `is_disorot`                 |
| Penomoran kebutuhan   | `FR-xxx`, `NFR-xxx`, `BR-xx`, `UC-xx`                                              | `FR-014`                     |

## 6. Catatan Verifikasi Data Institusional

Rancangan ini memakai asumsi atas beberapa data institusional yang **wajib diverifikasi** sebelum
implementasi. Rinciannya ada pada [01-analisis-kebutuhan.md § A.9](01-analisis-kebutuhan.md#a9-asumsi-batasan-dan-butir-verifikasi).
Butir utama: nomenklatura resmi unit kerja pada Organisasi dan Tata Kerja (OTK) ITH, daftar resmi
jenis produk hukum pada Statuta/Peraturan Rektor tentang tata naskah dinas, serta nomor peraturan
rujukan tingkat nasional.

---

## 7. Ringkasan Arsitektur (Sekilas)

```
                    ┌──────────────────────────────────────────┐
   Publik/Mahasiswa │  Portal Publik (SSR, SEO-friendly)       │
   (tanpa login) ──▶│  beranda · pencarian · detail · unduh    │
                    └───────────────┬──────────────────────────┘
                                    │
   Dosen/Staf ─────▶┌───────────────▼──────────────────────────┐
   (login)          │  Lapisan Aplikasi (Laravel 11/PHP 8.3)   │
                    │  Controller · Service · Policy (RBAC)    │
   Admin ──────────▶│  Repository · Event/Queue · Observer     │
   Superadmin ─────▶└──┬────────────┬─────────────┬────────────┘
                       │            │             │
              ┌────────▼───┐ ┌──────▼─────┐ ┌─────▼──────────┐
              │ MySQL 8.0  │ │ Meilisearch│ │ Object Storage │
              │ (metadata) │ │ (indeks)   │ │ (PDF/lampiran) │
              └────────────┘ └────────────┘ └────────────────┘
                       │
              ┌────────▼────────────────────────┐
              │ Redis (cache, session, queue)   │
              └─────────────────────────────────┘
                       │
              ┌────────▼────────────────────────┐
              │ Integrasi: API JDIHN · SSO ITH  │
              │ SMTP · Sitemap/RSS · API Publik │
              └─────────────────────────────────┘
```

Detail lengkap pada [07-rekomendasi-teknis.md](07-rekomendasi-teknis.md).
