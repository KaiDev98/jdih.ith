-- Patch untuk DB V2 yang sudah berjalan: SOP Permohonan SK punya tempat sendiri.
--   1. Kolom dokumen.peruntukan menandai dokumen yang punya peruntukan khusus
--      di portal. PERMOHONAN_SK = SOP yang tampil di halaman "SOP Permohonan
--      SK" dan dikelola dari menu tersendiri di panel admin. Sebelumnya halaman
--      itu menebak dokumen dari judul SOP.
--   2. Dokumen SOP yang sudah ada dan salah satu versinya berjudul "Permohonan
--      SK" atau "Permohonan Surat Keputusan" ditandai otomatis, agar halaman
--      publik tetap menampilkan dokumen yang sama setelah patch.
-- Aman dijalankan ulang. Kolom bersifat tambahan (NULL untuk dokumen biasa).
SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;
SET time_zone = '+00:00';
USE jdih_ith_v2_dev;

-- ALTER TABLE tidak dapat dibatalkan dalam transaksi; idempoten lewat
-- information_schema agar patch boleh dijalankan ulang.
SET @kolom_ada := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dokumen' AND COLUMN_NAME = 'peruntukan'
);
SET @perintah := IF(
  @kolom_ada = 0,
  'ALTER TABLE dokumen ADD COLUMN peruntukan ENUM(''PERMOHONAN_SK'') NULL COMMENT ''Peruntukan khusus di portal; NULL = dokumen biasa'' AFTER jenis_dokumen_id, ADD KEY idx_dokumen_peruntukan (peruntukan, deleted_at)',
  'DO 0'
);
PREPARE langkah FROM @perintah;
EXECUTE langkah;
DEALLOCATE PREPARE langkah;

START TRANSACTION;

UPDATE dokumen d
JOIN jenis_dokumen j ON j.id = d.jenis_dokumen_id
SET d.peruntukan = 'PERMOHONAN_SK'
WHERE (j.kode = 'SOP' OR j.nama = 'SOP')
  AND d.peruntukan IS NULL
  AND d.deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM dokumen_versi v
    WHERE v.dokumen_id = d.id
      AND v.judul REGEXP 'permohonan[[:space:]]+(sk|surat[[:space:]]+keputusan)([^[:alnum:]]|$)'
  );

COMMIT;
