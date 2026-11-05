-- Jalankan setelah patch-024. Tidak mengubah atau menghapus unggahan. Aman diulang.
SET time_zone='+00:00';
-- Preferensi notifikasi fitur baru per akun. Riwayat audit/workflow tidak dihapus.
CREATE TABLE IF NOT EXISTS notifikasi_event_dihapus (
  pengguna_id BIGINT UNSIGNED NOT NULL,
  audit_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (pengguna_id, audit_id),
  KEY idx_notifikasi_event_audit (audit_id),
  CONSTRAINT fk_notifikasi_event_user FOREIGN KEY (pengguna_id) REFERENCES pengguna (id) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT fk_notifikasi_event_audit FOREIGN KEY (audit_id) REFERENCES audit_log (id) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB;

INSERT INTO audit_log(actor_id,module,action,entity_type,entity_id,after_json,request_id)
SELECT NULL,'database','SCHEMA_UPDATE','schema',NULL,JSON_OBJECT('patch','025-notifikasi-fitur-panel'),UUID()
WHERE NOT EXISTS (SELECT 1 FROM audit_log WHERE module='database' AND action='SCHEMA_UPDATE' AND JSON_UNQUOTE(JSON_EXTRACT(after_json,'$.patch'))='025-notifikasi-fitur-panel');
