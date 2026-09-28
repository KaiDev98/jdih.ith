# Indeks Diagram Sistem — Portal JDIH ITH Parepare

Seluruh diagram tersedia dalam dua bentuk: **berkas Whimsical** (siap dibuka, disunting, dan
diekspor menjadi gambar) dan **berkas sumber teks** di direktori ini (PlantUML/Mermaid, dapat
di-_version control_).

**Folder Whimsical**: <https://whimsical.com/A8jUEKJGiQABYEyKdpAaa3>
_Diagram Sistem — Portal JDIH ITH Parepare_

---

## Daftar Diagram

| Kode | Diagram                                                     | Jenis               | Memvisualkan                                                                      | Tautan                                         |
| ---- | ----------------------------------------------------------- | ------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------- |
| D-01 | Use Case Diagram — Pengunjung Publik dan Dosen/Staf         | Use case            | [02-use-case.md](../02-use-case.md) PKG-1, PKG-2, PKG-3                           | <https://whimsical.com/4P9BxPC6wwmGjCoHNy8svw> |
| D-02 | Use Case Diagram — Admin, Admin Verifikator, dan Superadmin | Use case            | [02-use-case.md](../02-use-case.md) PKG-4, PKG-5, PKG-6                           | <https://whimsical.com/Aex1JY8ESJRyXGDazZhsuk> |
| D-03 | ERD — Subsistem Inti Dokumen Hukum                          | ERD (_crow's foot_) | [03-erd.md § C.3](../03-erd.md), [04 § D.2](../04-struktur-basis-data.md)         | <https://whimsical.com/7DqyBcFA2FtVsswxbMyzQF> |
| D-04 | ERD — Subsistem Pengguna, Peran, dan Otorisasi (RBAC)       | ERD (_crow's foot_) | [03-erd.md § C.4](../03-erd.md), [04 § D.3](../04-struktur-basis-data.md)         | <https://whimsical.com/XUPwHqxdCfymZr8gDo1fyf> |
| D-05 | ERD — Subsistem Konten, Sistem, dan Layanan Hukum           | ERD (_crow's foot_) | [03-erd.md § C.5–C.6](../03-erd.md), [04 § D.4–D.6](../04-struktur-basis-data.md) | <https://whimsical.com/K8CD3VK6ZJdwrofGk5qcVt> |
| D-06 | Activity Diagram — Input, Verifikasi, dan Publikasi Dokumen | Activity            | [02 § B.7.3–B.7.6](../02-use-case.md), BR-04…BR-08                                | <https://whimsical.com/QXFRMPm8ULvMyX1zSyYYXn> |
| D-07 | Flowchart — Algoritma Evaluasi Hak Akses 3 Lapis            | Flowchart           | [05-role-permission.md § E.5](../05-role-permission.md)                           | <https://whimsical.com/2AJKyZanRdbqbCNCXGJrHe> |
| D-08 | State Diagram — Status Publikasi dan Status Keberlakuan     | State machine       | BR-06, BR-21, BR-22, BR-23                                                        | <https://whimsical.com/3aU9nwjoELe2ur1iR3HC5u> |
| D-09 | Sequence Diagram — Unduh Dokumen Terbatas (UC-29)           | Sequence            | [02 § B.7.2](../02-use-case.md), [05 § E.5](../05-role-permission.md)             | <https://whimsical.com/KEVeq8oUXKaArYC4oXaYJ>  |
| D-10 | Sequence Diagram — Publikasi dan Sinkronisasi JDIHN         | Sequence            | [02 § B.7.6, § B.7.9](../02-use-case.md)                                          | <https://whimsical.com/EXmn786RK9AqJeUeuYA7N1> |
| D-11 | Diagram Arsitektur dan Deployment Sistem                    | Arsitektur          | [07-rekomendasi-teknis.md § G.1–G.2](../07-rekomendasi-teknis.md)                 | <https://whimsical.com/L4RxJN5NLR5io5XSJZqtM3> |
| D-12 | Struktur Navigasi dan Peta Situs                            | Mind map            | [06-fitur-dan-menu.md § F.1–F.4](../06-fitur-dan-menu.md)                         | <https://whimsical.com/CSMTX43CpzJ9n3eN8nQ7rA> |

---

## Berkas Sumber Teks di Direktori Ini

| Berkas                         | Isi                                                                                        | Cara Render                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| [use-case.puml](use-case.puml) | Use case diagram versi UML klasik (satu gambar utuh), ditambah dua _state machine diagram_ | Ekstensi PlantUML di VS Code, atau <https://www.plantuml.com/plantuml>              |
| [erd.mmd](erd.mmd)             | Peta relasi lengkap 50 entitas                                                             | Ekstensi _Markdown Preview Mermaid Support_ di VS Code, atau <https://mermaid.live> |

Berkas sumber teks berguna untuk dua hal yang tidak dapat dilakukan Whimsical: masuk ke _version
control_ bersama kode, dan dirender otomatis di CI atau pada tampilan repositori.

---

## Mengekspor Diagram untuk Laporan

Di Whimsical: buka berkas → menu **File → Export** → pilih **PNG** (resolusi 2× untuk cetak) atau
**PDF** (vektor, tidak pecah saat diperbesar). Untuk naskah skripsi/tugas akhir, PDF atau PNG 2×
memberi hasil terbaik.

---

## Catatan Penyuntingan

| Hal                                  | Keterangan                                                                                                                                                                                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Urutan partisipan pada D-09 dan D-10 | Ditentukan otomatis oleh Whimsical dan belum tentu urut logis (aktor → peramban → aplikasi → basis data). Menyeret kepala partisipan ke posisi yang diinginkan akan merapikan garis pesan                                                        |
| Notasi use case                      | Aktor digambarkan sebagai kotak berwarna, _use case_ sebagai kapsul. Garis tanpa panah = asosiasi aktor; garis putus-putus ungu = `«extend»`; garis putus-putus kuning = `«include»`; garis putus-putus berlabel "mewarisi" = generalisasi aktor |
| Notasi ERD                           | Memakai _crow's foot_: `                                                                                                                                                                                                                         |     | `tepat satu,`o | `nol atau satu,`o{`nol atau banyak,` | {` satu atau banyak. Setiap entitas mencantumkan PK, FK, dan UK |
| Sinkronisasi dengan dokumen          | Diagram dibuat dari Bagian A–H pada [../README.md](../README.md). Bila rancangan berubah, perbarui dokumen lebih dulu, lalu diagramnya                                                                                                           |
