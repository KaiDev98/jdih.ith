-- Jalankan setelah patch-022. Tidak mengubah versi terbit atau menghapus riwayat.
SET time_zone='+00:00';
SET @ddl = IF((SELECT COUNT(*)=0 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='template_surat_versi' AND COLUMN_NAME='verified_by'), 'ALTER TABLE template_surat_versi ADD COLUMN verified_by BIGINT UNSIGNED NULL, ADD KEY idx_template_versi_verifier (verified_by), ADD CONSTRAINT fk_template_versi_verifier FOREIGN KEY (verified_by) REFERENCES pengguna (id) ON DELETE RESTRICT ON UPDATE RESTRICT', 'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl = IF((SELECT COUNT(*)=0 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='template_surat_versi' AND COLUMN_NAME='approved_at'), 'ALTER TABLE template_surat_versi ADD COLUMN approved_at DATETIME(6) NULL', 'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

ALTER TABLE template_surat_versi MODIFY COLUMN status ENUM('PENDING_REVIEW','APPROVED','ACTIVE','ARCHIVED') NOT NULL;

ALTER TABLE template_surat_versi MODIFY COLUMN pending_slot TINYINT GENERATED ALWAYS AS (CASE WHEN status IN ('PENDING_REVIEW','APPROVED') THEN 1 ELSE NULL END) STORED;

ALTER TABLE template_surat_versi DROP CHECK ck_template_versi_archive;
ALTER TABLE template_surat_versi ADD CONSTRAINT ck_template_versi_archive CHECK (
  (status='PENDING_REVIEW' AND activated_at IS NULL AND archived_at IS NULL) OR
  (status='APPROVED' AND activated_at IS NULL AND archived_at IS NULL AND verified_by IS NOT NULL AND approved_at IS NOT NULL) OR
  (status='ACTIVE' AND activated_at IS NOT NULL AND archived_at IS NULL) OR
  (status='ARCHIVED' AND archived_at IS NOT NULL AND (activated_at IS NULL OR archived_at>=activated_at))
);

INSERT INTO audit_log(actor_id,module,action,entity_type,entity_id,after_json,request_id)
SELECT NULL,'database','SCHEMA_UPDATE','schema',NULL,JSON_OBJECT('patch','023-persetujuan-penerbitan-terpisah'),UUID()
WHERE NOT EXISTS (SELECT 1 FROM audit_log WHERE module='database' AND action='SCHEMA_UPDATE' AND JSON_UNQUOTE(JSON_EXTRACT(after_json,'$.patch'))='023-persetujuan-penerbitan-terpisah');
