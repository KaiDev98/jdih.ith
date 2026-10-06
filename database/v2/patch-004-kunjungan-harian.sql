-- Patch untuk DB V2 yang sudah berjalan: penghitung kunjungan harian portal
-- publik (hanya jumlah per tanggal WITA, tanpa data pribadi). Idempoten.
SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;
SET time_zone = '+00:00';
USE jdih_ith_v2_dev;

CREATE TABLE IF NOT EXISTS kunjungan_harian (
  tanggal DATE NOT NULL COMMENT 'Tanggal menurut WITA (Asia/Makassar)',
  jumlah INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Pengunjung unik per peramban per hari',
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (tanggal)
) ENGINE=InnoDB;
