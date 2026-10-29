-- Perubahan hak akses: Admin hanya mengelola dokumen yang ia buat sendiri;
-- Superadmin melakukan verifikasi dan seluruh pengaturan global.
-- Idempoten. Jalankan pada database V2 yang telah menjalankan patch sebelumnya.
SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;
SET time_zone = '+00:00';
USE jdih_ith_v2_dev;
START TRANSACTION;

DELETE pi FROM peran_izin pi
JOIN peran p ON p.id=pi.peran_id
WHERE p.kode='ADMIN';

INSERT INTO peran_izin (peran_id,izin_id)
SELECT p.id,i.id FROM peran p CROSS JOIN izin i
WHERE p.kode='ADMIN'
  AND i.kode IN (
    'dashboard.read',
    'documents.read_admin','documents.create','documents.edit',
    'documents.upload','documents.revise','workflow.submit',
    'legal.manage_relations'
  )
ON DUPLICATE KEY UPDATE izin_id=peran_izin.izin_id;

-- Remove earlier limited Superadmin grants, then grant the complete catalog.
INSERT INTO peran_izin (peran_id,izin_id)
SELECT p.id,i.id FROM peran p CROSS JOIN izin i
WHERE p.kode='SUPERADMIN'
ON DUPLICATE KEY UPDATE izin_id=peran_izin.izin_id;

COMMIT;
