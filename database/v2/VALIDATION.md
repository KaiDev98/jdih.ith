# Hasil Final Runtime Validation Phase 1 — 2026-10-04

Branch: niyato. HEAD: 5000a81db2d02d1b3704d45512aab2a5d36ca207.
Status: **PASS — import schema/seed/sample dan seluruh 61 skenario runtime**.
Tidak ada commit/push, binding Drizzle, backend/frontend, atau pekerjaan Phase 2.

## Environment dan import

- SELECT VERSION(): 8.4.11 (MySQL).
- SELECT @@port: 3308.
- SELECT DATABASE(): jdih_ith_v2_dev.
- Host 127.0.0.1; user jdih_v2_dev; secret berasal dari .env.v2.local yang diabaikan Git.
- Database sudah tersedia dan diverifikasi kosong (0 tabel) sebelum import.
- schema.sql: PASS, exit 0.
- seed.sql: PASS, exit 0.
- sample.sql: PASS, exit 0.
- Tidak memakai MySQL 26.7, MariaDB XAMPP, atau database legacy.

## Catalog aktual information_schema

| Objek | Jumlah |
| --- | ---: |
| Base tables | 23 |
| Primary keys | 23 |
| Foreign keys | 41 |
| CHECK (seluruhnya ENFORCED) | 33 |
| UNIQUE sekunder | 22 |
| Indeks non-unique sekunder | 48 |
| Seluruh indeks sekunder | 70 |
| Seluruh indeks termasuk PK | 93 |

Nama FK/CHECK/UNIQUE dan tabel dicocokkan dengan schema; seluruh indeks deklaratif
tersedia. Seluruh FK memakai DELETE/UPDATE RESTRICT. Fixture aktual: 4 dokumen,
6 versi, 8 berkas, 2 template, 3 versi template.

## Pengujian aktual

Command: node database/v2/validate.mjs --local (MySQL client 8.4 via
JDIH_V2_MYSQL_CLIENT). Exit 0; behaviouralTests=61;
persistentRowCountsUnchanged=true.

- Duplikasi email/google_sub ditolak.
- Nomor versi duplikat dan pointer lintas owner ditolak; draf tidak mengganti publik.
- File UTAMA kedua ditolak; dua lampiran diterima.
- Metadata publish nomor/PIC/tanggal wajib; draf boleh belum lengkap.
- Self-approval ditolak; approval/publish/withdrawal metadata dan workflow dicek.
- Grant terbuka duplikat ditolak; predicate expiry menolak grant kedaluwarsa.
- Penutupan expired + regrant berhasil dan history lama tetap ada.
- Template kedua ACTIVE ditolak; versi ARCHIVED tersimpan.
- Withdrawal current mengosongkan pointer tanpa fallback ke versi superseded;
  non-current withdrawal tidak mengosongkan pointer versi yang lebih baru.
- Legal status/relasi di luar enum ditolak; relasi draf tidak otomatis mengubah status.
- Session hash/expiry, FK history, nullable audit actor dan rollback juga lulus.

Semua mutasi pengujian di-rollback. Jumlah row sebelum/sesudah tetap sama;
AUTO_INCREMENT dapat memiliki gap. Withdrawal/regrant membuktikan urutan transaksi
SQL yang dirancang, bukan implementasi service/otorisasi atau uji concurrency aplikasi.

## Error, perubahan, dan batas lingkup

Tidak ada error SQL pada import maupun 61 skenario; schema/seed/sample tidak diubah.
Validator ditambah mode --local untuk DB_* dan DB_PORT konfigurabel, guard MySQL
8.4.x/database V2, strict mode per koneksi, serta normalisasi CRLF client Windows.
README diperbarui untuk penggunaan lokal. Tidak ada perubahan business rule.

Static validation juga PASS: 23 tabel/PK, 41 FK, 33 CHECK, 22 UNIQUE sekunder,
70 indeks sekunder. node --check dan pemeriksaan whitespace lulus.

Riwayat hambatan Docker dan kredensial dari percobaan sebelumnya sudah teratasi
melalui instance lokal ini. Hasil ini menggantikan status runtime PENDING sebelumnya.
Phase 1 siap diajukan untuk commit setelah persetujuan user; belum siap dianggap
implementasi aplikasi/production. Auth, policy akses, transaksi service, UI confirmation,
file fisik, dan concurrency tetap berada di luar Phase 1.
