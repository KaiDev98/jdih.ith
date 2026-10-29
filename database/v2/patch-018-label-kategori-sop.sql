-- Revisi 2026-10-23: ubah nama tanpa mengganti ID atau kode kategori/unit.
-- Jalankan pada database V2 yang dipilih operator, setelah patch-017.
SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;
START TRANSACTION;
INSERT INTO audit_log(actor_id,module,action,entity_type,entity_id,before_json,after_json,request_id)
SELECT NULL,'master','UPDATE','kategori',id,JSON_OBJECT('nama',nama),
  JSON_OBJECT('nama',CASE kode WHEN 'SOP-KOMISI-ETIK' THEN 'Komisi Etik Kemahasiswaan' ELSE 'Laboratorium' END),UUID()
FROM kategori WHERE (kode='SOP-KOMISI-ETIK' AND nama<>'Komisi Etik Kemahasiswaan')
  OR (kode='SOP-LAB' AND nama<>'Laboratorium');
UPDATE kategori SET nama=CASE kode WHEN 'SOP-KOMISI-ETIK' THEN 'Komisi Etik Kemahasiswaan' ELSE 'Laboratorium' END
WHERE kode IN ('SOP-KOMISI-ETIK','SOP-LAB');
INSERT INTO audit_log(actor_id,module,action,entity_type,entity_id,before_json,after_json,request_id)
SELECT NULL,'master','UPDATE','unit_kerja',id,JSON_OBJECT('nama',nama),
  JSON_OBJECT('nama',CASE kode WHEN 'SOP-KOMISI-ETIK' THEN 'Komisi Etik Kemahasiswaan' ELSE 'Laboratorium' END),UUID()
FROM unit_kerja WHERE (kode='SOP-KOMISI-ETIK' AND nama<>'Komisi Etik Kemahasiswaan')
  OR (kode='SOP-LAB' AND nama<>'Laboratorium');
UPDATE unit_kerja SET nama=CASE kode WHEN 'SOP-KOMISI-ETIK' THEN 'Komisi Etik Kemahasiswaan' ELSE 'Laboratorium' END
WHERE kode IN ('SOP-KOMISI-ETIK','SOP-LAB');
COMMIT;
