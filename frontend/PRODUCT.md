# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Sivitas akademika ITH (dosen, staf, mahasiswa) yang perlu menemukan produk hukum tertentu
  dengan cepat: peraturan, SK, instruksi, surat edaran, atau SOP unit.
- Masyarakat umum, auditor, dan asesor akreditasi yang menilai keterbukaan produk hukum ITH.

Kedua kelompok dilayani seimbang: pencarian cepat tetap tugas utama, tetapi portal juga harus
terasa resmi dan representatif bagi institusi.

## Product Purpose

Portal JDIH (Jaringan Dokumentasi dan Informasi Hukum) Institut Teknologi Bacharuddin Jusuf
Habibie, Parepare. Menyediakan akses terstruktur ke produk hukum yang telah diterbitkan beserta
status keberlakuannya, serta format persuratan resmi yang dapat diunduh. Berhasil bila pengunjung
menemukan dokumen yang tepat, memahami statusnya, dan mengunduhnya tanpa bantuan.

## Positioning

Satu-satunya sumber resmi produk hukum ITH: setiap dokumen memiliki nomor, tahun penetapan,
status hukum (Berlaku, Diubah, Dicabut), dan PIC, dengan riwayat versi yang terjaga.

## Operating Context

- Jenis produk hukum: Peraturan Rektor, SK Rektor, Instruksi Rektor, Surat Edaran, SOP
  (SOP dibagi per unit: Jurusan Sains, TPI, Perpustakaan, TIK, Akademik & Kemahasiswaan, BMN,
  Kepegawaian, Keuangan, LPPM-PM, Lab, Senat; Komisi Etik
  tetap menjadi entri tersendiri).
- Pencarian berdasarkan kata kunci, tipe, tahun, kategori, dan status hukum.
- Kantor: R. Sub Bagian Umum, Kampus 1 ITH. Jam layanan Senin–Kamis 07.30–16.00 WITA,
  Jumat 07.30–16.30 WITA, Sabtu–Minggu libur.
- Diakses dari kampus maupun jaringan seluler.

## Capabilities and Constraints

- Stack: Next.js (App Router) + Tailwind CSS 4, backend NestJS, MySQL 8.
- Dokumen Internal dan Rahasia tidak boleh tersirat sama sekali di halaman publik: tidak ada
  teks, label, jumlah, atau galat yang mengisyaratkan keberadaannya.
- Tidak ada statistik publik, berita, banner, FAQ, atau layanan hukum di V1.
- Login hanya Google `@ith.ac.id`; tombol Masuk tidak dipromosikan kepada publik.

## Brand Commitments

- Logo ITH (`public/logo-ith.webp`: roda gigi biru, lingkaran hijau, segitiga oranye bertuliskan
  "ith") wajib dipakai.
- Palet warna tidak terikat; boleh dirancang ulang (pemilik proyek, 2026-10-06).
- Nada bahasa: Bahasa Indonesia resmi, lugas, tidak bergaya pemasaran.

## Evidence on Hand

- Produk hukum nyata dari API publik (judul, nomor, tahun, status, tipe). Saat ini masih data
  contoh di lingkungan pengembangan.
- Tidak ada foto kampus, testimoni, atau angka statistik resmi; jangan dikarang.

## Product Principles

1. Menemukan dokumen lebih penting daripada menampilkan dekorasi.
2. Status hukum selalu terbaca jelas di samping dokumen.
3. Resmi tanpa kaku: terasa sebagai lembaga, bukan template admin.
4. Hanya yang publik yang tampil; tidak ada yang menyiratkan konten tertutup.
5. Penyempurnaan visual mempertahankan desain yang sudah disukai pengguna:
   hero biru dengan foto kampus dan logo bulat, pencarian berbentuk pil, susunan
   kartu dokumen, panel SOP, Format Persuratan, serta footer. Perbaiki keterbacaan,
   jarak, fokus, area sentuh, dan transisi secara bertahap; jangan merombak layout,
   palet, atau gaya tipografi tanpa permintaan eksplisit (klarifikasi 2026-10-21).

## Accessibility & Inclusion

WCAG 2.1 AA: kontras teks, fokus terlihat, navigasi papan ketik, dan menghormati
`prefers-reduced-motion`.
