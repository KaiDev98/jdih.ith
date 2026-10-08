-- Patch untuk DB V2 yang sudah berjalan: jumlah orang yang melihat dan
-- mengunduh setiap produk hukum. Idempoten.
SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;
SET time_zone = '+00:00';
USE jdih_ith_v2_dev;

CREATE TABLE IF NOT EXISTS dokumen_statistik (
  dokumen_id BIGINT UNSIGNED NOT NULL,
  jumlah_lihat INT UNSIGNED NOT NULL DEFAULT 0,
  jumlah_unduh INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (dokumen_id),
  CONSTRAINT fk_statistik_dokumen FOREIGN KEY (dokumen_id) REFERENCES dokumen (id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;
