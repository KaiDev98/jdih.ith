# Pemulihan password Dosen/Staf

Implementasi 2026-10-30. Tautan Lupa password hanya pada login Dosen/Staf.
Login Admin/Superadmin tetap memakai jalur masing-masing.

## Aktivasi server

1. Untuk database V2 lama, jalankan `database/v2/patch-021-staff-password-recovery.sql`
   pada database tujuan yang telah diverifikasi. Jangan impor ulang schema/seed.
2. Isi environment server atau salin `backend/.env.mail.local.example` menjadi
   `backend/.env.mail.local`. File privat ini diabaikan Git. Set `MAIL_USER`,
   `MAIL_PASSWORD` (Password Aplikasi Google), `MAIL_FROM_ADDRESS` pengirim yang
   diizinkan; template memakai smtp.gmail.com:465 dengan TLS.
3. Google memerlukan Verifikasi 2 Langkah dan kebijakan akun yang mengizinkan
   Password Aplikasi. Jangan kirim password melalui chat atau memasukkannya ke Git.
4. Set `APP_URL` dan `CORS_ORIGIN` ke origin HTTPS portal produksi yang sama.
   Gunakan SESSION_KEY stabil dan rahasia. Perubahan key membatalkan isi antrean lama.
5. Dari root, jalankan `npm run mail:verify --workspace @jdih/api`.
   Perintah hanya menguji koneksi/autentikasi SMTP, tidak mengirim email.
6. Mulai ulang backend setelah environment diubah. Pastikan operator menguji
   permintaan/reset dengan akun Dosen/Staf yang dikuasainya sebelum peluncuran.

Kredensial Gmail belum diisi/terverifikasi pada pemeriksaan lokal. Pengujian
fungsional memakai SMTP loopback dan database uji terisolasi, bukan bukti bahwa
email Gmail sudah terkirim. Tanpa konfigurasi, formulir menjelaskan bahwa layanan
belum tersedia; tidak menampilkan pengiriman palsu.

## Aturan keamanan dan operasional

- Akun lokal DOSEN_STAF aktif/pending memenuhi syarat. Akun pengelola, campuran
  peran pengelola, nonaktif, ditolak dan akun Google-only tidak menerima tautan.
- Respons permintaan sama untuk akun yang ada maupun tidak. Batas HTTP 5 request
  per 15 menit/IP dan cooldown per akun 60 detik. Konfirmasi 10 per 15 menit/IP.
- Token acak 256 bit, berlaku 30 menit, sekali pakai; request baru membatalkan lama.
  Token pada fragment URL tidak masuk request/log/referrer HTTP. Token mentah tidak
  masuk audit/log/localStorage; hash SHA-256 disimpan, payload antrean AES-256-GCM.
- Reset memeriksa ulang email, peran, status dan fingerprint password di transaksi.
  Token, password baru, pencabutan semua sesi dan audit disimpan atomik. Reset
  tidak mengaktifkan akun pending dan tidak membuat sesi login otomatis.
- Worker backend membaca antrean setiap 5 detik, maksimal 5 job/tick; lease 120 detik,
  retry maksimal 5 kali dengan jeda bertingkat. Status SMTP accepted bukan jaminan
  inbox: periksa spam dan kebijakan pengirim. Email pemberitahuan dikirim setelah reset.
- Cipher dibersihkan setelah kirim/batal. Token kedaluwarsa lebih dari 7 hari dibuang
  beserta outbox, audit tetap dipertahankan. Jangan memakai mode log untuk produksi
  dengan menganggap email telah terkirim.

## Validasi

13 pengujian integrasi MySQL/HTTP/SMTP loopback mencakup reset sebenarnya,
pencabutan sesi, status pending, penolakan pengelola/Google-only, token palsu/
kedaluwarsa/terpakai, perubahan akun, race, kegagalan SMTP dan rollback audit.
Frontend menguji validasi, dialog, keadaan layanan, sukses/galat, dan pengiriman
berulang. Pemeriksaan workspace dan hasil build dicatat saat commit.

Referensi implementasi: [Nodemailer SMTP](https://nodemailer.com/smtp),
[OWASP Forgot Password](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html),
[Google App Passwords](https://support.google.com/accounts/answer/185833).
