-- Patch untuk DB V2 yang sudah berjalan: Admin dapat mengubah status hukum
-- (legal.correct_status) dan menghapus dokumen secara permanen (documents.delete).
-- Idempoten; DB baru cukup memakai seed.sql terbaru.
SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;
SET time_zone = '+00:00';
USE jdih_ith_v2_dev;
START TRANSACTION;
INSERT INTO izin (kode, nama, modul) VALUES ('documents.delete', 'Menghapus dokumen secara permanen', 'documents') AS incoming
ON DUPLICATE KEY UPDATE nama = incoming.nama, modul = incoming.modul;
INSERT INTO peran_izin (peran_id, izin_id)
SELECT p.id, i.id FROM peran p CROSS JOIN izin i
WHERE p.kode IN ('SUPERADMIN', 'ADMIN') AND i.kode IN ('documents.delete', 'legal.correct_status')
ON DUPLICATE KEY UPDATE izin_id = peran_izin.izin_id;
COMMIT;
