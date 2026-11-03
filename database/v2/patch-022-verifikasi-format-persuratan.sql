-- Admin mengunggah format/versi sebagai PENDING_REVIEW; hanya Superadmin
-- yang mengaktifkan versi setelah verifikasi. Aman dijalankan ulang pada DB V2.
SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;
SET time_zone = '+00:00';

SET @ddl = IF(
  (SELECT COLUMN_TYPE NOT LIKE '%''PENDING_REVIEW''%' FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='template_surat_versi' AND COLUMN_NAME='status'),
  'ALTER TABLE template_surat_versi MODIFY COLUMN status ENUM(''PENDING_REVIEW'',''ACTIVE'',''ARCHIVED'') NOT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl = IF(
  (SELECT IS_NULLABLE='NO' FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='template_surat_versi' AND COLUMN_NAME='activated_at'),
  'ALTER TABLE template_surat_versi MODIFY COLUMN activated_at DATETIME(6) NULL',
  'SELECT 1'
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl = IF(
  (SELECT COUNT(*)=0 FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='template_surat_versi' AND COLUMN_NAME='pending_slot'),
  'ALTER TABLE template_surat_versi ADD COLUMN pending_slot TINYINT GENERATED ALWAYS AS (CASE WHEN status = ''PENDING_REVIEW'' THEN 1 ELSE NULL END) STORED',
  'SELECT 1'
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl = IF(
  (SELECT COUNT(*)=0 FROM information_schema.STATISTICS
   WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='template_surat_versi' AND INDEX_NAME='uq_template_versi_pending'),
  'ALTER TABLE template_surat_versi ADD UNIQUE KEY uq_template_versi_pending (template_surat_id,pending_slot)',
  'SELECT 1'
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl = IF(
  (SELECT COUNT(*)>0 AND (SELECT COLUMN_TYPE NOT LIKE '%''APPROVED''%' FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='template_surat_versi' AND COLUMN_NAME='status') FROM information_schema.TABLE_CONSTRAINTS
   WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='template_surat_versi' AND CONSTRAINT_NAME='ck_template_versi_archive'),
  'ALTER TABLE template_surat_versi DROP CHECK ck_template_versi_archive',
  'SELECT 1'
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl = IF(
  (SELECT COUNT(*)=0 FROM information_schema.TABLE_CONSTRAINTS
   WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='template_surat_versi' AND CONSTRAINT_NAME='ck_template_versi_archive'),
  'ALTER TABLE template_surat_versi ADD CONSTRAINT ck_template_versi_archive CHECK ((status = ''PENDING_REVIEW'' AND activated_at IS NULL AND archived_at IS NULL) OR (status = ''ACTIVE'' AND activated_at IS NOT NULL AND archived_at IS NULL) OR (status = ''ARCHIVED'' AND archived_at IS NOT NULL AND (activated_at IS NULL OR archived_at >= activated_at)))',
  'SELECT 1'
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

INSERT INTO audit_log(actor_id,module,action,entity_type,entity_id,after_json,request_id)
SELECT NULL,'database','SCHEMA_UPDATE','schema',NULL,
  JSON_OBJECT('patch','022-verifikasi-format-persuratan','rule','Admin uploads require Superadmin verification'),UUID()
WHERE NOT EXISTS (
  SELECT 1 FROM audit_log WHERE module='database' AND action='SCHEMA_UPDATE'
    AND JSON_UNQUOTE(JSON_EXTRACT(after_json,'$.patch'))='022-verifikasi-format-persuratan'
);
