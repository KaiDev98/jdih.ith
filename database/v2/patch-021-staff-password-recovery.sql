-- Penambahan non-destruktif untuk pemulihan password Dosen/Staf.
-- Jalankan pada database V2 yang sedang digunakan; tidak melakukan USE/reset.
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  pengguna_id BIGINT UNSIGNED NOT NULL,
  email VARCHAR(254) NOT NULL,
  token_hash BINARY(32) NOT NULL,
  password_fingerprint BINARY(32) NOT NULL,
  expires_at DATETIME(6) NOT NULL,
  used_at DATETIME(6) NULL,
  invalidated_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_password_reset_hash (token_hash),
  KEY idx_password_reset_user (pengguna_id,created_at),
  KEY idx_password_reset_expiry (expires_at),
  CONSTRAINT fk_password_reset_user FOREIGN KEY (pengguna_id) REFERENCES pengguna (id) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS password_reset_emails (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  token_id BIGINT UNSIGNED NOT NULL,
  jenis ENUM('RESET_LINK','PASSWORD_CHANGED') NOT NULL,
  token_cipher VARBINARY(256) NULL COMMENT 'AES-256-GCM; token mentah tidak disimpan',
  attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  next_attempt_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  lease_until DATETIME(6) NULL,
  sent_at DATETIME(6) NULL,
  cancelled_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_password_reset_email (token_id,jenis),
  KEY idx_password_reset_queue (sent_at,cancelled_at,next_attempt_at),
  CONSTRAINT fk_password_reset_email_token FOREIGN KEY (token_id) REFERENCES password_reset_tokens (id) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB;

INSERT INTO audit_log(actor_id,module,action,entity_type,entity_id,after_json,request_id)
SELECT NULL,'database','SCHEMA_UPDATE','schema',NULL,
  JSON_OBJECT('patch','021-staff-password-recovery'),UUID()
WHERE NOT EXISTS (
  SELECT 1 FROM audit_log WHERE module='database' AND action='SCHEMA_UPDATE'
    AND JSON_UNQUOTE(JSON_EXTRACT(after_json,'$.patch'))='021-staff-password-recovery'
);
