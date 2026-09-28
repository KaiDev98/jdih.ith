# Modul Domain

Direktori ini menampung modul-modul fungsional API. Direktori sengaja dibiarkan
kosong pada tahap setup: yang sudah ditetapkan adalah **batas tanggung jawabnya**,
bukan isinya. Menentukan batas lebih dahulu mencegah modul saling menempel
sehingga sulit dipisahkan kemudian.

## Batas Modul yang Direncanakan

| Modul        | Tanggung jawab                                                                        | Tidak menjadi tanggung jawabnya                      |
| ------------ | ------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `auth`       | Masuk, keluar, token penyegar, 2FA, SSO, pemulihan kata sandi                         | Pengelolaan akun oleh Superadmin (ada di `pengguna`) |
| `otorisasi`  | Evaluasi izin tiga lapis, penjaga rute, penghitungan cakupan unit, cache izin         | Penyimpanan data peran (ada di `pengguna`)           |
| `pengguna`   | Akun, peran, izin langsung, akses lintas unit, verifikasi pendaftaran                 | Autentikasi (ada di `auth`)                          |
| `dokumen`    | Metadata, alur publikasi, relasi antarperaturan, status keberlakuan, riwayat          | Penyimpanan berkas fisik (ada di `berkas`)           |
| `berkas`     | Unggah, ekstraksi teks PDF, tautan bertanda tangan, penghitungan unduhan              | Metadata dokumen (ada di `dokumen`)                  |
| `akses`      | Daftar akses per dokumen, permintaan akses, keputusan, masa berlaku                   | Keputusan otorisasi umum (ada di `otorisasi`)        |
| `pencarian`  | Indeks, kueri, penyaring aspek, penghitungan hasil                                    | Kepemilikan data dokumen (ada di `dokumen`)          |
| `master`     | Unit kerja, jenis peraturan, kategori, bidang hukum, kata kunci, status, jenis relasi | —                                                    |
| `konten`     | Berita, artikel hukum, pengumuman, halaman statis, banner, media, tautan, FAQ         | —                                                    |
| `statistik`  | Agregasi, laporan, ekspor                                                             | Pencatatan peristiwa mentah (ada di `audit`)         |
| `audit`      | Log aktivitas, log keamanan, penyamaran data sensitif                                 | —                                                    |
| `jdihn`      | Antrean sinkronisasi, pemetaan metadata, percobaan ulang                              | —                                                    |
| `layanan`    | Permohonan layanan hukum, penugasan penelaah (Fase 3)                                 | —                                                    |
| `notifikasi` | Surel dan notifikasi dalam aplikasi                                                   | —                                                    |

## Aturan yang Berlaku di Seluruh Modul

1. **Satu modul, satu direktori.** Isinya: `*.module.ts`, `*.controller.ts`,
   `*.service.ts`, `*.repository.ts`, dan `dto/` bila perlu.

2. **DTO tidak didefinisikan di sini.** Bentuk masukan dan keluaran berada di
   `packages/shared` sebagai skema Zod, karena aplikasi web memakainya juga.
   Modul hanya mengimpor dan memakainya melalui `BadanZod`/`KueriZod`.

3. **Akses basis data melalui repositori, bukan langsung dari layanan.** Layanan
   memuat aturan bisnis; repositori memuat kueri. Batas ini yang memungkinkan
   aturan bisnis diuji tanpa menyalakan basis data.

4. **Cakupan unit kerja (Lapisan 2) diterapkan di repositori, bukan di pengendali.**
   Kondisi `unit_kerja_id IN (...)` ditambahkan pada setiap kueri yang menyentuh
   data berunit. Menaruhnya di pengendali berarti satu kueri yang lupa disaring
   sudah cukup membocorkan data unit lain.

5. **Setiap operasi tulis mencatat jejak audit.** Bukan sebagai pilihan, melainkan
   melalui pencegat atau observer, supaya tidak bergantung pada kedisiplinan
   penulis kode.

6. **Rute tertutup secara baku.** Penjaga global menolak setiap permintaan
   kecuali rutenya ditandai `@Publik()`. Rute baru yang lupa dilindungi akan
   gagal tertutup, bukan gagal terbuka.

## Rujukan

- Kebutuhan fungsional per modul: `docs/01-analisis-kebutuhan.md`
- Use case per modul: `docs/02-use-case.md`
- Model otorisasi tiga lapis: `docs/05-role-permission.md`
- Batas modul dan arsitektur: `docs/07-rekomendasi-teknis.md`
