-- Jalankan setelah patch-027, sebelum API terbaru. Tidak mencabut/mengaktifkan data lama.
SET time_zone='+00:00';
-- Satu ALTER atomik; jika sudah lengkap, pengulangan tidak mengubah data.
SET @revocation_columns = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='template_surat_versi' AND column_name IN ('revoked_at','revoked_reason','revoked_by'));
SET @revocation_constraints = (SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_schema=DATABASE() AND table_name='template_surat_versi' AND constraint_name IN ('fk_template_versi_revoker','ck_template_revocation'));
SET @revocation_sql = IF(@revocation_columns=3 AND @revocation_constraints=2,'SELECT 1',
  'ALTER TABLE template_surat_versi ADD COLUMN revoked_at DATETIME(6) NULL, ADD COLUMN revoked_reason VARCHAR(1000) NULL, ADD COLUMN revoked_by BIGINT UNSIGNED NULL, ADD CONSTRAINT fk_template_versi_revoker FOREIGN KEY (revoked_by) REFERENCES pengguna(id) ON DELETE RESTRICT ON UPDATE RESTRICT, ADD CONSTRAINT ck_template_revocation CHECK ((revoked_at IS NULL AND revoked_reason IS NULL AND revoked_by IS NULL) OR (revoked_at IS NOT NULL AND revoked_reason IS NOT NULL AND CHAR_LENGTH(TRIM(revoked_reason))>0 AND revoked_by IS NOT NULL AND activated_at IS NOT NULL AND revoked_at>=activated_at AND status IN (''ACTIVE'',''ARCHIVED'')))');
PREPARE revocation_stmt FROM @revocation_sql;
EXECUTE revocation_stmt;
DEALLOCATE PREPARE revocation_stmt;

INSERT INTO audit_log(actor_id,module,action,entity_type,entity_id,after_json,request_id)
SELECT NULL,'database','SCHEMA_UPDATE','schema',NULL,JSON_OBJECT('patch','028-pencabutan-format-persuratan'),UUID()
WHERE NOT EXISTS (SELECT 1 FROM audit_log WHERE module='database' AND action='SCHEMA_UPDATE' AND JSON_UNQUOTE(JSON_EXTRACT(after_json,'$.patch'))='028-pencabutan-format-persuratan');
