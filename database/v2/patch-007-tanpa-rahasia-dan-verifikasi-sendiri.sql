-- Patch untuk DB V2 yang sudah berjalan:
-- 1. Tingkat akses Rahasia dihapus: versi Rahasia menjadi Internal (tetap
--    tertutup bagi publik) dan semua grant Rahasia aktif dicabut. Tabel
--    dokumen_akses_rahasia dipertahankan sebagai riwayat.
-- 2. Pembuat versi boleh menyetujui versinya sendiri (constraint dihapus).
SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;
SET time_zone = '+00:00';
USE jdih_ith_v2_dev;

START TRANSACTION;
UPDATE dokumen_versi SET tingkat_akses = 'internal' WHERE tingkat_akses = 'rahasia';
UPDATE dokumen_akses_rahasia
SET revoked_at = UTC_TIMESTAMP(6), revoke_reason = 'Tingkat akses Rahasia dihapus'
WHERE revoked_at IS NULL;
COMMIT;

ALTER TABLE dokumen_versi MODIFY tingkat_akses ENUM('publik','internal') NOT NULL;
ALTER TABLE dokumen_versi DROP CHECK ck_versi_self_approval;
