-- Preferensi kotak notifikasi per akun. Riwayat workflow dan audit tidak dihapus.
USE jdih_ith_v2_dev;
CREATE TABLE IF NOT EXISTS notifikasi_dihapus (
  pengguna_id BIGINT UNSIGNED NOT NULL,
  workflow_id BIGINT UNSIGNED NOT NULL,
  dihapus_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (pengguna_id, workflow_id),
  KEY idx_notifikasi_workflow (workflow_id),
  CONSTRAINT fk_notifikasi_pengguna FOREIGN KEY (pengguna_id) REFERENCES pengguna (id) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT fk_notifikasi_workflow FOREIGN KEY (workflow_id) REFERENCES dokumen_workflow (id) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB;
