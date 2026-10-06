-- Patch untuk DB V2 yang sudah berjalan: menambah nomor telepon kantor yang dapat diubah Admin.
-- Idempoten; DB baru cukup memakai schema.sql + seed.sql terbaru.
SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;
SET time_zone = '+00:00';
USE jdih_ith_v2_dev;

CREATE TABLE IF NOT EXISTS kontak_kantor (
  id TINYINT UNSIGNED NOT NULL COMMENT 'Satu baris saja (id=1)',
  telepon VARCHAR(32) NOT NULL,
  updated_by BIGINT UNSIGNED NULL COMMENT 'NULL bila berasal dari seed',
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_kontak_updated_by (updated_by),
  CONSTRAINT ck_kontak_tunggal CHECK (id = 1),
  CONSTRAINT ck_kontak_isi CHECK (CHAR_LENGTH(TRIM(telepon)) > 0),
  CONSTRAINT fk_kontak_updated_by FOREIGN KEY (updated_by) REFERENCES pengguna (id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;

START TRANSACTION;
INSERT INTO izin (kode, nama, modul) VALUES ('contact.manage', 'Mengelola kontak kantor', 'settings') AS incoming
ON DUPLICATE KEY UPDATE nama = incoming.nama, modul = incoming.modul;
INSERT INTO peran_izin (peran_id, izin_id)
SELECT p.id, i.id FROM peran p CROSS JOIN izin i
WHERE p.kode IN ('SUPERADMIN', 'ADMIN') AND i.kode = 'contact.manage'
ON DUPLICATE KEY UPDATE izin_id = peran_izin.izin_id;
INSERT INTO kontak_kantor (id, telepon) VALUES (1, '+62 853-4088-9059') AS incoming
ON DUPLICATE KEY UPDATE id = kontak_kantor.id;
COMMIT;
