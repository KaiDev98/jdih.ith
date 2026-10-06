-- Patch untuk DB V2 yang sudah berjalan: kontak kantor menjadi daftar butir
-- (telepon dan surel) yang dapat ditambah, diubah, dan dihapus Admin.
-- Nomor telepon dari tabel lama kontak_kantor (patch-001) disalin. Tabel lama
-- tidak dihapus di sini; hapus manual setelah dipastikan tidak dipakai.
-- Idempoten; DB baru cukup memakai schema.sql + seed.sql terbaru.
SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;
SET time_zone = '+00:00';
USE jdih_ith_v2_dev;

CREATE TABLE IF NOT EXISTS kontak_kantor_butir (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  jenis ENUM('TELEPON','SUREL') NOT NULL,
  label VARCHAR(100) NULL,
  nilai VARCHAR(254) NOT NULL,
  urutan SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  updated_by BIGINT UNSIGNED NULL COMMENT 'NULL bila berasal dari seed',
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  KEY idx_kontak_butir_urutan (urutan, id),
  KEY idx_kontak_butir_updated_by (updated_by),
  CONSTRAINT ck_kontak_butir_nilai CHECK (CHAR_LENGTH(TRIM(nilai)) > 0),
  CONSTRAINT fk_kontak_butir_updated_by FOREIGN KEY (updated_by) REFERENCES pengguna (id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;

START TRANSACTION;
INSERT INTO kontak_kantor_butir (id, jenis, nilai, urutan)
SELECT 1, 'TELEPON', telepon, 1 FROM kontak_kantor WHERE id = 1
ON DUPLICATE KEY UPDATE id = kontak_kantor_butir.id;
INSERT INTO kontak_kantor_butir (id, jenis, nilai, urutan) VALUES (2, 'SUREL', 'humas@ith.ac.id', 2) AS incoming
ON DUPLICATE KEY UPDATE id = kontak_kantor_butir.id;
COMMIT;
