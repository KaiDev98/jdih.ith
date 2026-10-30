# Profil, lebar koleksi, dan kunjungan portal

Verifikasi 30 Oktober 2026 pada branch `nesta`.

## Isi dan tampilan

Profil menjelaskan ITH, awal pendirian/operasional, fungsi JDIH dan akses dokumen.
Sumber informasi institusi: [profil resmi ITH](https://ith.ac.id/about), diperiksa
30 Oktober 2026. Halaman menyertakan tautan sumber dan tidak menggunakan angka
mahasiswa, dosen atau program studi yang cepat berubah. Desain memakai tipografi
editorial, logo resmi, identitas institusi dan daftar tautan koleksi.

Area isi Format Persuratan, SOP Permohonan SK dan SOP biasa memiliki batas lebar
1680px, terpisah dari ukuran hero/footer. Susunan galeri empat kolom desktop,
dua tablet dan satu ponsel serta area gulir terbatas dipertahankan.

## Sumber angka kunjungan

Angka footer berasal dari `kunjungan_harian`, bukan konstanta, angka acak, atau
jumlah yang ditambah oleh frontend. Ringkasan dihitung di MySQL berdasarkan
tanggal WITA untuk hari, bulan, tahun dan total. GET hanya membaca; POST mencatat
peramban yang belum memiliki kuki tanggal hari tersebut. Bot/headless yang
dikenali tidak menambah hitungan. Tidak menyimpan IP atau identitas pengunjung.

Frontend berbagi request yang masih berjalan untuk mencegah POST ganda akibat
mount bersamaan/StrictMode. Web Locks, bila didukung, mengoordinasikan tab dan
memeriksa ulang penanda setelah memperoleh lock. Pada browser tanpa Web Locks,
kuki server tetap digunakan untuk mencegah penghitungan ulang kunjungan berikutnya.
Angka ini merupakan metrik peramban per hari; penghapusan kuki atau penggunaan
peramban berbeda dapat membuat kunjungan tercatat lagi.

Penanda lokal hanya ditulis setelah respons memenuhi shared schema. Hari
diperiksa ulang ketika memperbarui, sehingga tab yang terbuka melewati tengah
malam WITA dapat mencatat hari berikutnya. Pembaruan dilakukan ketika tab terlihat
dan setiap 30 detik; SSR mengambil data tanpa cache. Kegagalan menampilkan pesan
tidak tersedia atau mempertahankan angka terakhir yang benar-benar diterima,
disertai tombol coba lagi. Tidak ada fallback angka nol buatan.

## Pemeriksaan

- Typecheck seluruh workspace dan lint seluruh repo lulus.
- Build produksi frontend lulus; 20 skenario browser juga diulang dan lulus pada
  hasil build produksi.
- 239 tes frontend dan 353 tes backend lulus, termasuk integrasi MySQL.
- Tes frontend meliputi request bersamaan, pergantian hari WITA, lock antar tab,
  storage diblokir, respons tidak valid, retry, tab tersembunyi dan data terakhir.
- Tes backend memeriksa pengunjung berkuki, bot, kegagalan write, serta agregasi
  MySQL pada pergantian hari/bulan. Data integrasi berada di database uji terpisah
  dan fixture penghitung baru di-rollback.
- Browser: empat halaman pada lebar 320, 390, 768, 1440 dan 1920 piksel.
  Tidak ada overflow horizontal. Area koleksi berukuran 1680px pada layar 1920,
  sedangkan isi hero tetap 1280px. Galeri tetap empat kolom pada desktop.
- Ringkasan kunjungan nyata sebelum dan sesudah 20 kunjungan headless identik;
  browser QA tidak menambah angka footer.

Uji emulasi browser tidak menggantikan pemeriksaan perangkat fisik.
