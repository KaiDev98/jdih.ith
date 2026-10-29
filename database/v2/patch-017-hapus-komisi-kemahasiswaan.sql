-- Revisi permintaan user, 2026-10-21: hapus Komisi Kemahasiswaan dari SOP/unit.
-- Hanya entri baru yang belum dipakai; FK RESTRICT melindungi akun/dokumen/anak unit.
-- Jalankan dalam transaksi: bila ada referensi, rollback dan tinjau data terlebih dulu.
-- Komisi Etik serta Akademik & Kemahasiswaan tetap dipertahankan.
-- Target development V2; idempoten dan diaudit.
SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;
SET time_zone = '+00:00';
USE jdih_ith_v2_dev;
START TRANSACTION;

INSERT INTO audit_log (actor_id,module,action,entity_type,entity_id,before_json,after_json,request_id)
SELECT NULL,'master','DELETE','kategori',id,JSON_OBJECT('kode',kode,'nama',nama,'aktif',aktif),
       NULL,UUID()
FROM kategori WHERE kode='SOP-KOMISI-KEMAHASISWAAN';
DELETE FROM kategori WHERE kode='SOP-KOMISI-KEMAHASISWAAN';

INSERT INTO audit_log (actor_id,module,action,entity_type,entity_id,before_json,after_json,request_id)
SELECT NULL,'master','DELETE','unit_kerja',id,JSON_OBJECT('kode',kode,'nama',nama,'aktif',aktif),
       NULL,UUID()
FROM unit_kerja WHERE kode='SOP-KOMISI-KEMAHASISWAAN';
DELETE FROM unit_kerja WHERE kode='SOP-KOMISI-KEMAHASISWAAN';

COMMIT;
