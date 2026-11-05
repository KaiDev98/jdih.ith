-- Jalankan setelah patch-025 dan sebelum API terbaru. Tidak menghapus dokumen/riwayat.
-- DROP dan ADD pada ALTER yang sama, aman diulang tanpa celah validasi.
SET time_zone='+00:00';
ALTER TABLE permintaan_penghapusan
  DROP CHECK ck_permintaan_decision,
  ADD CONSTRAINT ck_permintaan_decision CHECK (
    (status='PENDING' AND decided_by IS NULL AND decided_at IS NULL AND catatan IS NULL) OR
    (status<>'PENDING' AND decided_by IS NOT NULL AND decided_at IS NOT NULL AND (catatan IS NULL OR CHAR_LENGTH(TRIM(catatan))>0))
  );

INSERT INTO audit_log(actor_id,module,action,entity_type,entity_id,after_json,request_id)
SELECT NULL,'database','SCHEMA_UPDATE','schema',NULL,JSON_OBJECT('patch','026-catatan-keputusan-opsional'),UUID()
WHERE NOT EXISTS (SELECT 1 FROM audit_log WHERE module='database' AND action='SCHEMA_UPDATE' AND JSON_UNQUOTE(JSON_EXTRACT(after_json,'$.patch'))='026-catatan-keputusan-opsional');
