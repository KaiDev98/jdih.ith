-- Patch untuk DB V2 yang sudah berjalan:
-- 1. Setiap versi dokumen boleh memiliki deskripsi singkat (opsional) agar
--    pembaca tahu isi dokumen sebelum membuka berkasnya.
-- 2. Alasan perubahan status hukum (Diubah/Dicabut) menjadi opsional. Alasan
--    otomatis lama "Dampak relasi hukum saat publikasi" dikosongkan karena
--    bukan alasan yang bermakna bagi pembaca.
SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;
SET time_zone = '+00:00';
USE jdih_ith_v2_dev;

ALTER TABLE dokumen_versi
  ADD COLUMN deskripsi VARCHAR(1000) NULL COMMENT 'Ringkasan isi dokumen; opsional' AFTER judul;

ALTER TABLE dokumen_status_hukum_riwayat DROP CHECK ck_hukum_alasan;
ALTER TABLE dokumen_status_hukum_riwayat MODIFY alasan VARCHAR(2000) NULL;
ALTER TABLE dokumen_status_hukum_riwayat
  ADD CONSTRAINT ck_hukum_alasan CHECK (alasan IS NULL OR CHAR_LENGTH(TRIM(alasan)) > 0);

UPDATE dokumen_status_hukum_riwayat
SET alasan = NULL
WHERE alasan = 'Dampak relasi hukum saat publikasi';
