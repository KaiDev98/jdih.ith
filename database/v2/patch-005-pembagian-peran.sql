-- Patch untuk DB V2 yang sudah berjalan: pembagian peran baru.
--   Admin      : membuat, mengunggah, dan memverifikasi dokumen
--                (workflow.return, workflow.approve, workflow.publish).
--   Superadmin : hanya mengetahui verifikasi (tanpa approve/return/publish);
--                mengubah, mencabut, dan menghapus dokumen; menghapus akun.
-- Idempoten; DB baru cukup memakai seed.sql terbaru.
SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;
SET time_zone = '+00:00';
USE jdih_ith_v2_dev;
START TRANSACTION;

INSERT INTO izin (kode, nama, modul) VALUES ('users.delete', 'Menghapus akun pengguna terdaftar', 'users') AS incoming
ON DUPLICATE KEY UPDATE nama = incoming.nama, modul = incoming.modul;

-- Admin memverifikasi.
INSERT INTO peran_izin (peran_id, izin_id)
SELECT p.id, i.id FROM peran p CROSS JOIN izin i
WHERE p.kode = 'ADMIN' AND i.kode IN ('workflow.return', 'workflow.approve', 'workflow.publish')
ON DUPLICATE KEY UPDATE izin_id = peran_izin.izin_id;
-- Admin tidak lagi menghapus dokumen atau mengubah status hukum (tugas Superadmin).
DELETE pi FROM peran_izin pi
JOIN peran p ON p.id = pi.peran_id JOIN izin i ON i.id = pi.izin_id
WHERE p.kode = 'ADMIN' AND i.kode IN ('documents.delete', 'legal.correct_status');

-- Superadmin: hapus akun; tidak lagi memverifikasi.
INSERT INTO peran_izin (peran_id, izin_id)
SELECT p.id, i.id FROM peran p CROSS JOIN izin i
WHERE p.kode = 'SUPERADMIN' AND i.kode = 'users.delete'
ON DUPLICATE KEY UPDATE izin_id = peran_izin.izin_id;
DELETE pi FROM peran_izin pi
JOIN peran p ON p.id = pi.peran_id JOIN izin i ON i.id = pi.izin_id
WHERE p.kode = 'SUPERADMIN' AND i.kode IN ('workflow.approve', 'workflow.return', 'workflow.publish');

COMMIT;
