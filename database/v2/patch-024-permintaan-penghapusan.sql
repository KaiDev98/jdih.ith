-- Jalankan setelah patch-023; aman diulang, tidak menghapus data unggahan.
SET time_zone='+00:00';
-- Permintaan penarikan/penghapusan: snapshot resource tetap ada setelah penghapusan.
-- resource_id dan version_id sengaja tanpa FK, seperti entity_id pada audit_log.
CREATE TABLE IF NOT EXISTS permintaan_penghapusan (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  sumber ENUM('DOCUMENT','TEMPLATE') NOT NULL,
  resource_id BIGINT UNSIGNED NOT NULL,
  version_id BIGINT UNSIGNED NULL,
  judul VARCHAR(500) NOT NULL,
  jenis ENUM('WITHDRAW','DELETE') NOT NULL,
  alasan VARCHAR(1000) NOT NULL,
  status ENUM('PENDING','APPROVED','DECLINED','OBSOLETE') NOT NULL DEFAULT 'PENDING',
  requested_by BIGINT UNSIGNED NOT NULL,
  decided_by BIGINT UNSIGNED NULL,
  catatan VARCHAR(1000) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  decided_at DATETIME(6) NULL,
  pending_resource BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN status='PENDING' THEN resource_id ELSE NULL END) STORED,
  UNIQUE KEY uq_permintaan_pending (sumber,pending_resource),
  KEY idx_permintaan_inbox (status,id),
  KEY idx_permintaan_owner (requested_by,status,id),
  KEY idx_permintaan_resource (sumber,resource_id,id),
  KEY idx_permintaan_decider (decided_by),
  CONSTRAINT fk_permintaan_owner FOREIGN KEY (requested_by) REFERENCES pengguna (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_permintaan_decider FOREIGN KEY (decided_by) REFERENCES pengguna (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT ck_permintaan_reason CHECK (CHAR_LENGTH(TRIM(alasan))>0),
  CONSTRAINT ck_permintaan_decision CHECK (
    (status='PENDING' AND decided_by IS NULL AND decided_at IS NULL AND catatan IS NULL) OR
    (status<>'PENDING' AND decided_by IS NOT NULL AND decided_at IS NOT NULL AND catatan IS NOT NULL AND CHAR_LENGTH(TRIM(catatan))>0)
  )
) ENGINE=InnoDB;

INSERT INTO audit_log(actor_id,module,action,entity_type,entity_id,after_json,request_id)
SELECT NULL,'database','SCHEMA_UPDATE','schema',NULL,JSON_OBJECT('patch','024-permintaan-penghapusan'),UUID()
WHERE NOT EXISTS (SELECT 1 FROM audit_log WHERE module='database' AND action='SCHEMA_UPDATE' AND JSON_UNQUOTE(JSON_EXTRACT(after_json,'$.patch'))='024-permintaan-penghapusan');
