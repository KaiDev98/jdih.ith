-- Semua Admin dapat mengelola seluruh Format Persuratan, tanpa batas kepemilikan.
-- Idempoten dan hanya menambah izin template; pembatasan fitur lain tetap berlaku.
SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;
SET time_zone = '+00:00';
USE jdih_ith_v2_dev;
START TRANSACTION;

INSERT INTO audit_log (actor_id,module,action,entity_type,entity_id,after_json,request_id)
SELECT NULL,'identity','GRANT_ROLE_PERMISSION','peran',p.id,
       JSON_OBJECT('permission','templates.manage','reason','Admin mengelola seluruh Format Persuratan'),UUID()
FROM peran p JOIN izin i ON i.kode='templates.manage'
WHERE p.kode='ADMIN' AND NOT EXISTS (
  SELECT 1 FROM peran_izin pi WHERE pi.peran_id=p.id AND pi.izin_id=i.id
);

INSERT INTO peran_izin (peran_id,izin_id)
SELECT p.id,i.id FROM peran p CROSS JOIN izin i
WHERE p.kode='ADMIN' AND i.kode='templates.manage'
ON DUPLICATE KEY UPDATE izin_id=peran_izin.izin_id;

COMMIT;
