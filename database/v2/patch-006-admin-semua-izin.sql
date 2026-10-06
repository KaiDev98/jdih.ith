-- Patch untuk DB V2 yang sudah berjalan: Admin memperoleh semua izin
-- (verifikasi, status hukum, tarik/hapus dokumen, hapus akun). Akun Superadmin
-- tetap tidak dapat dihapus siapa pun. Superadmin tidak berubah. Idempoten.
SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;
SET time_zone = '+00:00';
USE jdih_ith_v2_dev;
START TRANSACTION;
INSERT INTO peran_izin (peran_id, izin_id)
SELECT p.id, i.id FROM peran p CROSS JOIN izin i
WHERE p.kode = 'ADMIN'
ON DUPLICATE KEY UPDATE izin_id = peran_izin.izin_id;
COMMIT;
