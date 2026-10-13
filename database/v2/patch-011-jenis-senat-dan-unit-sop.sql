-- Patch untuk DB V2 yang sudah berjalan:
--   1. Jenis produk hukum Senat: Peraturan Senat dan SK Senat, diurutkan
--      setelah produk Rektor dan sebelum SOP.
--   2. Kategori SOP baru: Bagian Hukum, SPI, dan Komisi Etik.
--   3. Unit kerja mengikuti kategori SOP: kode, nama, dan status aktifnya
--      disamakan. Unit lama yang bukan kategori SOP dinonaktifkan (tidak
--      dihapus, karena masih dirujuk akun dan versi dokumen).
-- Aman dijalankan ulang. Baris yang sudah ada (mis. kode atau nama yang telah
-- diubah Superadmin) tidak ditimpa.
SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;
SET time_zone = '+00:00';
USE jdih_ith_v2_dev;

START TRANSACTION;

INSERT INTO jenis_dokumen (kode, nama, urutan)
SELECT 'PERSEN', 'Peraturan Senat', 5 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM jenis_dokumen WHERE kode = 'PERSEN' OR nama = 'Peraturan Senat');

INSERT INTO jenis_dokumen (kode, nama, urutan)
SELECT 'SKSEN', 'SK Senat', 6 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM jenis_dokumen WHERE kode = 'SKSEN' OR nama = 'SK Senat');

UPDATE jenis_dokumen SET urutan = 7 WHERE (kode = 'SOP' OR nama = 'SOP') AND urutan < 7;

INSERT INTO kategori (kode, nama)
SELECT 'SOP-HUKUM', 'Bagian Hukum' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM kategori WHERE kode = 'SOP-HUKUM' OR nama = 'Bagian Hukum');

INSERT INTO kategori (kode, nama)
SELECT 'SOP-SPI', 'SPI' FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM kategori WHERE kode = 'SOP-SPI' OR nama IN ('SPI', 'Satuan Pengawas Internal')
);

INSERT INTO kategori (kode, nama)
SELECT 'SOP-KOMISI-ETIK', 'Komisi Etik' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM kategori WHERE kode = 'SOP-KOMISI-ETIK' OR nama = 'Komisi Etik');

UPDATE unit_kerja u
SET u.aktif = FALSE
WHERE NOT EXISTS (SELECT 1 FROM kategori k WHERE k.kode = u.kode);

INSERT INTO unit_kerja (kode, nama, aktif)
SELECT * FROM (SELECT kode, nama, aktif FROM kategori) AS k
ON DUPLICATE KEY UPDATE nama = k.nama, aktif = k.aktif, deleted_at = NULL;

COMMIT;
