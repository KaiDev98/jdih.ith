-- Jalankan setelah patch-028. Tidak menghapus dokumen/berkas atau mengubah permintaan lama.
SET time_zone='+00:00';
ALTER TABLE permintaan_penghapusan MODIFY jenis ENUM('WITHDRAW','DELETE','REVOKE','DELETE_VERSION') NOT NULL;
INSERT INTO audit_log(actor_id,module,action,entity_type,entity_id,after_json,request_id)
SELECT NULL,'database','SCHEMA_UPDATE','schema',NULL,JSON_OBJECT('patch','029-hapus-versi-lama'),UUID()
WHERE NOT EXISTS (SELECT 1 FROM audit_log WHERE module='database' AND action='SCHEMA_UPDATE' AND JSON_UNQUOTE(JSON_EXTRACT(after_json,'$.patch'))='029-hapus-versi-lama');
