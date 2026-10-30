# Verifikasi koleksi portal — 30 Oktober 2026

Perubahan ini memperbaiki filter navigasi publik dan tata letak koleksi. Tidak
ada perubahan skema, data dokumen, izin API, atau alur persetujuan.

## Bug daftar kosong

Sebelumnya, pencarian tanpa hasil lalu pemilihan jenis yang sama dari menu
mengubah URL, tetapi mempertahankan kata kunci lama dalam komponen. Berpindah
melalui beranda memasang ulang komponen sehingga hasil muncul kembali.

Filter kini membaca navigasi eksternal dari URL dan membedakannya dari perubahan
URL oleh formulir sendiri. Pengujian regresi mencakup jenis yang sama serta
riwayat Back/Forward. Reproduksi browser memakai data lokal yang sebenarnya:
Peraturan Rektor dan SOP kembali menampilkan satu dokumen setelah kata kunci
tanpa hasil dibersihkan melalui menu pada tahap audit awal, sebelum klarifikasi
pemisahan koleksi SOP di bawah.

## Klarifikasi pemisahan SOP

SOP biasa pada Produk Hukum dan SOP Permohonan SK adalah koleksi terpisah.
Pencarian/daftar umum, faset, tahun dan hitungan/dokumen terbaru beranda kini
menyaring `peruntukan IS NULL` sebelum count/pagination. Endpoint khusus SK
memakai `PERMOHONAN_SK`. Jenis master, data dan hak akses tidak diubah.

Data lokal yang diperiksa memiliki enam produk hukum biasa dan satu SOP
Permohonan SK publik; belum ada SOP biasa terbit. API umum/faset menghitung enam,
SOP biasa/beranda SOP nol, sedangkan koleksi SK tetap satu. Angka nol pada SOP
biasa ini mencerminkan data yang ada, bukan kegagalan navigasi.

Seluruh 351 tes backend, termasuk MySQL, lulus setelah perubahan. Regresi MySQL
menerbitkan SOP biasa dan SOP SK dengan jenis dasar/kata kunci sama pada database
uji terpisah, kemudian memeriksa pencarian, total, faset dan beranda untuk anonim,
pending, staf aktif dan Superadmin. Dua tes sitemap lulus untuk pagination kedua
koleksi dan gangguan salah satu sumber. Sitemap tetap memuat dokumen publik dari
kedua koleksi melalui endpoint masing-masing.

## Perilaku koleksi

- Format Persuratan dan SOP Permohonan SK memakai empat kolom desktop, dua
  kolom tablet, satu kolom ponsel, dan maksimal tiga baris terlihat di desktop.
- Area daftar bergulir sendiri, termasuk Produk Hukum di ponsel. Pemuatan
  lanjutan memiliki tombol alternatif, status loading, retry, dan pencegahan
  request ganda. Galat halaman lanjutan mempertahankan berkas yang sudah tampil.
- Seluruh kartu SOP merupakan satu tautan. Detail tetap memakai URL kanonis
  `/produk-hukum/[slug]`; parameter `asal=permohonan-sk` hanya menentukan tautan
  kembali. Pemeriksaan akses tetap dilakukan oleh API yang sama.
- Bantuan Pengajuan SK menjadi bilah ringkas dengan kontak dari data pengelola.
- Tombol kembali ke atas menggulir halaman dan area daftar dengan halus, atau
  langsung bila perangkat meminta pengurangan gerakan. Tombol tersembunyi tidak
  menerima fokus keyboard.

## Hasil pemeriksaan

- Typecheck frontend, lint seluruh repo, dan build produksi frontend lulus.
- Reproduksi navigasi Peraturan Rektor dan SOP juga lulus pada hasil build
  produksi, bukan hanya server pengembangan.
- Seluruh 43 berkas tes frontend lulus: 226 tes, termasuk sinkronisasi URL,
  pagination, deduplikasi, retry, pergantian sesi, dan tombol kembali ke atas.
- Browser Chrome: 12 skenario galeri, dua koleksi pada lebar 320, 390, 768,
  1024, 1440, dan 1920 piksel. Respons fixture hanya diberikan di browser;
  database pengembangan tidak diubah. Masing-masing koleksi memuat 12 → 24 → 36
  berkas, halaman 2/3 diminta sekali, tanpa overflow horizontal.
- Browser Chrome: Produk Hukum pada lebar 320, 390, 768, dan 1440 piksel;
  daftar terbatas, 15 → 30 hasil, pemuatan halaman berikutnya sekali, tombol
  kembali ke atas dan reduced motion lulus.
- Panel bantuan aktual setinggi sekitar 88 piksel pada desktop dan 216 piksel
  pada lebar 320 piksel. Klik permukaan kartu SOP, tautan kembali, dan URL
  kanonis tanpa parameter konteks telah diperiksa.

Emulasi browser ini tidak menggantikan pengujian pada perangkat fisik. Pengujian
keamanan dan backend lengkap sebelumnya dicatat terpisah pada laporan audit
rilis 30 Oktober 2026.
