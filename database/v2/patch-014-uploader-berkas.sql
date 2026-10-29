-- Catat pengunggah tiap berkas agar Admin hanya dapat mengganti/menghapus
-- berkas yang ia unggah sendiri. Berkas lama memakai pembuat versi sebagai
-- pemilik historis terbaik yang tersedia.
-- Idempoten untuk database V2 yang sudah berisi data.
SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;
SET time_zone = '+00:00';
USE jdih_ith_v2_dev;

SET @kolom_ada := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='dokumen_berkas' AND COLUMN_NAME='uploaded_by'
);
SET @perintah := IF(
  @kolom_ada=0,
  'ALTER TABLE dokumen_berkas ADD COLUMN uploaded_by BIGINT UNSIGNED NULL COMMENT ''Akun pengunggah berkas'' AFTER dokumen_versi_id',
  'DO 0'
);
PREPARE langkah FROM @perintah;
EXECUTE langkah;
DEALLOCATE PREPARE langkah;

UPDATE dokumen_berkas f
JOIN dokumen_versi v ON v.id=f.dokumen_versi_id
SET f.uploaded_by=v.created_by
WHERE f.uploaded_by IS NULL;

ALTER TABLE dokumen_berkas
  MODIFY COLUMN uploaded_by BIGINT UNSIGNED NOT NULL COMMENT 'Akun yang mengunggah berkas';

SET @indeks_ada := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='dokumen_berkas' AND INDEX_NAME='idx_berkas_uploader'
);
SET @perintah := IF(@indeks_ada=0,'ALTER TABLE dokumen_berkas ADD KEY idx_berkas_uploader (uploaded_by,id)','DO 0');
PREPARE langkah FROM @perintah;
EXECUTE langkah;
DEALLOCATE PREPARE langkah;

SET @fk_ada := (
  SELECT COUNT(*) FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='dokumen_berkas' AND CONSTRAINT_NAME='fk_berkas_uploader'
);
SET @perintah := IF(
  @fk_ada=0,
  'ALTER TABLE dokumen_berkas ADD CONSTRAINT fk_berkas_uploader FOREIGN KEY (uploaded_by) REFERENCES pengguna (id) ON DELETE RESTRICT ON UPDATE RESTRICT',
  'DO 0'
);
PREPARE langkah FROM @perintah;
EXECUTE langkah;
DEALLOCATE PREPARE langkah;
