-- JDIH ITH V2 / Phase 1: proposal physical schema. MySQL 8.4 LTS.
-- LOCAL DEVELOPMENT ONLY. Fixed target matches compose.v2.yaml.
-- No DROP, no legacy import, no Drizzle binding. Run once on an EMPTY V2 database.
-- All FK use RESTRICT: never cascade deletion through versions/history/audit.
-- UTC DATETIME(6); constraints complement, not replace, future service authorization.
SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;
SET time_zone = '+00:00';
SET SESSION sql_mode = 'STRICT_ALL_TABLES,ONLY_FULL_GROUP_BY,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';
USE jdih_ith_v2_dev;

CREATE TABLE unit_kerja (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  parent_id BIGINT UNSIGNED NULL,
  kode VARCHAR(40) NOT NULL,
  nama VARCHAR(200) NOT NULL,
  aktif BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  UNIQUE KEY uq_unit_kode (kode),
  KEY idx_unit_parent (parent_id),
  CONSTRAINT ck_unit_aktif CHECK (aktif IN (0,1)),
  CONSTRAINT fk_unit_parent FOREIGN KEY (parent_id) REFERENCES unit_kerja (id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE pengguna (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  google_sub VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NULL COMMENT 'NULL hanya untuk pre-provisioning; bind setelah verifikasi Google',
  email VARCHAR(254) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  nama VARCHAR(200) NOT NULL,
  avatar_url VARCHAR(2048) NULL,
  password_hash VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NULL COMMENT 'scrypt; hanya Admin/Superadmin, opsional di samping login Google',
  password_diubah_at DATETIME(6) NULL,
  unit_kerja_id BIGINT UNSIGNED NULL,
  unit_manual VARCHAR(200) NULL,
  status ENUM('MENUNGGU_VERIFIKASI','AKTIF','DITOLAK','NONAKTIF') NOT NULL DEFAULT 'MENUNGGU_VERIFIKASI',
  verified_at DATETIME(6) NULL,
  verified_by BIGINT UNSIGNED NULL,
  rejection_reason VARCHAR(1000) NULL,
  deleted_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  UNIQUE KEY uq_pengguna_google_sub (google_sub),
  UNIQUE KEY uq_pengguna_email (email),
  KEY idx_pengguna_status (status, deleted_at, created_at),
  KEY idx_pengguna_unit (unit_kerja_id, status),
  KEY idx_pengguna_verifier (verified_by),
  CONSTRAINT ck_pengguna_email CHECK (email = TRIM(email) AND CHAR_LENGTH(email) > 3),
  CONSTRAINT ck_pengguna_sub CHECK (google_sub IS NULL OR CHAR_LENGTH(TRIM(google_sub)) > 0),
  CONSTRAINT ck_pengguna_rejection CHECK (status <> 'DITOLAK' OR (rejection_reason IS NOT NULL AND CHAR_LENGTH(TRIM(rejection_reason)) > 0)),
  CONSTRAINT fk_pengguna_unit FOREIGN KEY (unit_kerja_id) REFERENCES unit_kerja (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_pengguna_verifier FOREIGN KEY (verified_by) REFERENCES pengguna (id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE peran (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  kode VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  nama VARCHAR(100) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY uq_peran_kode (kode),
  CONSTRAINT ck_peran_kode CHECK (kode IN ('SUPERADMIN','ADMIN','DOSEN_STAF'))
) ENGINE=InnoDB;

CREATE TABLE izin (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  kode VARCHAR(100) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  nama VARCHAR(200) NOT NULL,
  modul VARCHAR(50) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY uq_izin_kode (kode),
  KEY idx_izin_modul (modul)
) ENGINE=InnoDB;

CREATE TABLE pengguna_peran (
  pengguna_id BIGINT UNSIGNED NOT NULL,
  peran_id BIGINT UNSIGNED NOT NULL,
  assigned_by BIGINT UNSIGNED NULL COMMENT 'NULL untuk provisioning operations; wajib audit',
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (pengguna_id, peran_id),
  KEY idx_pengguna_peran_role (peran_id),
  KEY idx_pengguna_peran_actor (assigned_by),
  CONSTRAINT fk_pengguna_peran_user FOREIGN KEY (pengguna_id) REFERENCES pengguna (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_pengguna_peran_role FOREIGN KEY (peran_id) REFERENCES peran (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_pengguna_peran_actor FOREIGN KEY (assigned_by) REFERENCES pengguna (id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE peran_izin (
  peran_id BIGINT UNSIGNED NOT NULL,
  izin_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (peran_id, izin_id),
  KEY idx_peran_izin_permission (izin_id),
  CONSTRAINT fk_peran_izin_role FOREIGN KEY (peran_id) REFERENCES peran (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_peran_izin_permission FOREIGN KEY (izin_id) REFERENCES izin (id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE pengguna_izin (
  pengguna_id BIGINT UNSIGNED NOT NULL,
  izin_id BIGINT UNSIGNED NOT NULL,
  efek ENUM('ALLOW','DENY') NOT NULL,
  alasan VARCHAR(1000) NOT NULL,
  granted_by BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (pengguna_id, izin_id),
  KEY idx_pengguna_izin_permission (izin_id),
  KEY idx_pengguna_izin_actor (granted_by),
  CONSTRAINT ck_pengguna_izin_alasan CHECK (CHAR_LENGTH(TRIM(alasan)) > 0),
  CONSTRAINT fk_pengguna_izin_user FOREIGN KEY (pengguna_id) REFERENCES pengguna (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_pengguna_izin_permission FOREIGN KEY (izin_id) REFERENCES izin (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_pengguna_izin_actor FOREIGN KEY (granted_by) REFERENCES pengguna (id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE sesi_pengguna (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  pengguna_id BIGINT UNSIGNED NOT NULL,
  token_hash BINARY(32) NOT NULL COMMENT 'SHA-256 token acak berentropi tinggi; bukan raw token',
  user_agent VARCHAR(1024) NULL,
  ip_hash BINARY(32) NULL COMMENT 'HMAC-SHA-256 IP dengan secret server',
  expires_at DATETIME(6) NOT NULL,
  last_used_at DATETIME(6) NULL,
  revoked_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY uq_sesi_token (token_hash),
  KEY idx_sesi_user (pengguna_id, revoked_at, expires_at),
  KEY idx_sesi_expiry (expires_at),
  CONSTRAINT ck_sesi_expiry CHECK (expires_at > created_at),
  CONSTRAINT ck_sesi_revoked CHECK (revoked_at IS NULL OR revoked_at >= created_at),
  CONSTRAINT ck_sesi_last_used CHECK (last_used_at IS NULL OR last_used_at >= created_at),
  CONSTRAINT fk_sesi_user FOREIGN KEY (pengguna_id) REFERENCES pengguna (id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE jenis_dokumen (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  kode VARCHAR(40) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  nama VARCHAR(150) NOT NULL,
  urutan SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  aktif BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  UNIQUE KEY uq_jenis_kode (kode),
  CONSTRAINT ck_jenis_aktif CHECK (aktif IN (0,1))
) ENGINE=InnoDB;

CREATE TABLE kategori (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  kode VARCHAR(60) NOT NULL,
  nama VARCHAR(150) NOT NULL,
  aktif BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  UNIQUE KEY uq_kategori_kode (kode),
  KEY idx_kategori_nama (nama),
  CONSTRAINT ck_kategori_aktif CHECK (aktif IN (0,1))
) ENGINE=InnoDB;

CREATE TABLE tag (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(100) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY uq_tag_nama (nama),
  CONSTRAINT ck_tag_nama CHECK (CHAR_LENGTH(TRIM(nama)) > 0)
) ENGINE=InnoDB;

CREATE TABLE dokumen (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  kode_dokumen VARCHAR(64) NOT NULL,
  slug VARCHAR(191) NOT NULL,
  jenis_dokumen_id BIGINT UNSIGNED NOT NULL,
  status_hukum ENUM('BERLAKU','DIUBAH','DICABUT') NOT NULL DEFAULT 'BERLAKU',
  current_published_version_id BIGINT UNSIGNED NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  deleted_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  UNIQUE KEY uq_dokumen_kode (kode_dokumen),
  UNIQUE KEY uq_dokumen_slug (slug),
  KEY idx_dokumen_jenis (jenis_dokumen_id, deleted_at),
  KEY idx_dokumen_hukum (status_hukum, deleted_at),
  KEY idx_dokumen_current (current_published_version_id, id),
  KEY idx_dokumen_author (created_by),
  CONSTRAINT fk_dokumen_jenis FOREIGN KEY (jenis_dokumen_id) REFERENCES jenis_dokumen (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_dokumen_author FOREIGN KEY (created_by) REFERENCES pengguna (id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE dokumen_versi (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  dokumen_id BIGINT UNSIGNED NOT NULL,
  nomor_versi INT UNSIGNED NOT NULL,
  status_workflow ENUM('DRAF','DIAJUKAN','REVISI','DISETUJUI','TERBIT','DITARIK') NOT NULL DEFAULT 'DRAF',
  tingkat_akses ENUM('publik','internal') NOT NULL,
  nomor VARCHAR(100) NULL COMMENT 'Boleh belum lengkap saat DRAF; wajib saat publish',
  tahun SMALLINT UNSIGNED NULL,
  judul VARCHAR(500) NOT NULL,
  deskripsi VARCHAR(1000) NULL COMMENT 'Ringkasan isi dokumen; opsional',
  pic VARCHAR(255) NULL COMMENT 'Free text versioned; wajib saat publish; bukan FK',
  unit_kerja_id BIGINT UNSIGNED NULL,
  tanggal_penetapan DATE NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  verified_by BIGINT UNSIGNED NULL,
  approved_at DATETIME(6) NULL,
  published_by BIGINT UNSIGNED NULL,
  published_at DATETIME(6) NULL,
  superseded_at DATETIME(6) NULL,
  withdrawn_at DATETIME(6) NULL,
  withdrawal_reason VARCHAR(1000) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  UNIQUE KEY uq_versi_nomor (dokumen_id, nomor_versi),
  UNIQUE KEY uq_versi_owner (id, dokumen_id),
  KEY idx_versi_workflow (status_workflow, updated_at),
  KEY idx_versi_visibility (status_workflow, tingkat_akses, published_at, id),
  KEY idx_versi_nomor_tahun (nomor, tahun),
  KEY idx_versi_tahun (tahun, dokumen_id),
  KEY idx_versi_judul (judul(191)),
  KEY idx_versi_unit (unit_kerja_id, status_workflow),
  KEY idx_versi_author (created_by),
  KEY idx_versi_verifier (verified_by),
  KEY idx_versi_publisher (published_by),
  CONSTRAINT ck_versi_nomor CHECK (nomor_versi > 0),
  CONSTRAINT ck_versi_tahun CHECK (tahun IS NULL OR tahun BETWEEN 1000 AND 9999),
  CONSTRAINT ck_versi_judul CHECK (CHAR_LENGTH(TRIM(judul)) > 0),
  CONSTRAINT ck_versi_publish_metadata CHECK (status_workflow NOT IN ('TERBIT','DITARIK') OR (
    nomor IS NOT NULL AND CHAR_LENGTH(TRIM(nomor)) > 0 AND
    pic IS NOT NULL AND CHAR_LENGTH(TRIM(pic)) > 0 AND tanggal_penetapan IS NOT NULL
  )),
  CONSTRAINT ck_versi_approval CHECK (status_workflow NOT IN ('DISETUJUI','TERBIT','DITARIK') OR (verified_by IS NOT NULL AND approved_at IS NOT NULL)),
  CONSTRAINT ck_versi_published CHECK (status_workflow NOT IN ('TERBIT','DITARIK') OR (published_at IS NOT NULL AND published_by IS NOT NULL)),
  CONSTRAINT ck_versi_superseded CHECK (superseded_at IS NULL OR (published_at IS NOT NULL AND superseded_at >= published_at)),
  CONSTRAINT ck_versi_withdrawal CHECK (status_workflow <> 'DITARIK' OR (withdrawn_at IS NOT NULL AND withdrawal_reason IS NOT NULL AND CHAR_LENGTH(TRIM(withdrawal_reason)) > 0)),
  CONSTRAINT fk_versi_document FOREIGN KEY (dokumen_id) REFERENCES dokumen (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_versi_unit FOREIGN KEY (unit_kerja_id) REFERENCES unit_kerja (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_versi_author FOREIGN KEY (created_by) REFERENCES pengguna (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_versi_verifier FOREIGN KEY (verified_by) REFERENCES pengguna (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_versi_publisher FOREIGN KEY (published_by) REFERENCES pengguna (id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE dokumen_versi_kategori (
  dokumen_versi_id BIGINT UNSIGNED NOT NULL,
  kategori_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (dokumen_versi_id, kategori_id),
  KEY idx_versi_kategori_reverse (kategori_id, dokumen_versi_id),
  CONSTRAINT fk_vk_version FOREIGN KEY (dokumen_versi_id) REFERENCES dokumen_versi (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_vk_category FOREIGN KEY (kategori_id) REFERENCES kategori (id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE dokumen_versi_tag (
  dokumen_versi_id BIGINT UNSIGNED NOT NULL,
  tag_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (dokumen_versi_id, tag_id),
  KEY idx_versi_tag_reverse (tag_id, dokumen_versi_id),
  CONSTRAINT fk_vt_version FOREIGN KEY (dokumen_versi_id) REFERENCES dokumen_versi (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_vt_tag FOREIGN KEY (tag_id) REFERENCES tag (id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE dokumen_berkas (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  dokumen_versi_id BIGINT UNSIGNED NOT NULL,
  jenis_berkas ENUM('UTAMA','LAMPIRAN') NOT NULL,
  judul VARCHAR(255) NULL,
  storage_key VARCHAR(512) COLLATE utf8mb4_bin NOT NULL,
  nama_asli VARCHAR(255) NOT NULL,
  mime_type VARCHAR(150) CHARACTER SET ascii NOT NULL,
  size_bytes BIGINT UNSIGNED NOT NULL,
  checksum BINARY(32) NOT NULL COMMENT 'SHA-256 isi file',
  urutan INT UNSIGNED NOT NULL DEFAULT 0,
  main_slot TINYINT GENERATED ALWAYS AS (CASE WHEN jenis_berkas = 'UTAMA' THEN 1 ELSE NULL END) STORED,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY uq_berkas_storage (storage_key),
  UNIQUE KEY uq_berkas_main (dokumen_versi_id, main_slot),
  KEY idx_berkas_order (dokumen_versi_id, urutan, id),
  CONSTRAINT ck_berkas_size CHECK (size_bytes > 0),
  CONSTRAINT fk_berkas_version FOREIGN KEY (dokumen_versi_id) REFERENCES dokumen_versi (id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE dokumen_relasi (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  source_version_id BIGINT UNSIGNED NOT NULL,
  target_document_id BIGINT UNSIGNED NOT NULL,
  jenis_relasi ENUM('MENGUBAH','MENCABUT','DASAR_HUKUM','TERKAIT') NOT NULL,
  catatan VARCHAR(2000) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY uq_relasi (source_version_id, target_document_id, jenis_relasi),
  KEY idx_relasi_target (target_document_id, jenis_relasi),
  CONSTRAINT fk_relasi_source FOREIGN KEY (source_version_id) REFERENCES dokumen_versi (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_relasi_target FOREIGN KEY (target_document_id) REFERENCES dokumen (id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;

-- Tidak dipakai lagi sejak tingkat akses Rahasia dihapus (patch-007); dipertahankan
-- agar riwayat lama tetap ada. Aman dihapus setelah dipastikan tidak diperlukan.
CREATE TABLE dokumen_akses_rahasia (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  dokumen_id BIGINT UNSIGNED NOT NULL,
  pengguna_id BIGINT UNSIGNED NOT NULL,
  granted_by BIGINT UNSIGNED NOT NULL,
  granted_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  expires_at DATETIME(6) NULL,
  revoked_at DATETIME(6) NULL,
  revoked_by BIGINT UNSIGNED NULL COMMENT 'NULL diperbolehkan untuk penutupan expired oleh sistem',
  grant_reason VARCHAR(1000) NOT NULL,
  revoke_reason VARCHAR(1000) NULL,
  active_slot TINYINT GENERATED ALWAYS AS (CASE WHEN revoked_at IS NULL THEN 1 ELSE NULL END) STORED,
  UNIQUE KEY uq_secret_open_grant (dokumen_id, pengguna_id, active_slot),
  KEY idx_secret_user (pengguna_id, revoked_at, expires_at, dokumen_id),
  KEY idx_secret_expiry (expires_at, revoked_at),
  KEY idx_secret_grant_actor (granted_by),
  KEY idx_secret_revoke_actor (revoked_by),
  CONSTRAINT ck_secret_expiry CHECK (expires_at IS NULL OR expires_at > granted_at),
  CONSTRAINT ck_secret_revoke CHECK (revoked_at IS NULL OR (revoked_at >= granted_at AND revoke_reason IS NOT NULL AND CHAR_LENGTH(TRIM(revoke_reason)) > 0)),
  CONSTRAINT ck_secret_reason CHECK (CHAR_LENGTH(TRIM(grant_reason)) > 0),
  CONSTRAINT fk_secret_document FOREIGN KEY (dokumen_id) REFERENCES dokumen (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_secret_user FOREIGN KEY (pengguna_id) REFERENCES pengguna (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_secret_granted_by FOREIGN KEY (granted_by) REFERENCES pengguna (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_secret_revoked_by FOREIGN KEY (revoked_by) REFERENCES pengguna (id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE dokumen_workflow (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  dokumen_versi_id BIGINT UNSIGNED NOT NULL,
  status_asal ENUM('DRAF','DIAJUKAN','REVISI','DISETUJUI','TERBIT','DITARIK') NULL,
  status_tujuan ENUM('DRAF','DIAJUKAN','REVISI','DISETUJUI','TERBIT','DITARIK') NOT NULL,
  action ENUM('CREATE','SUBMIT','RETURN','APPROVE','PUBLISH','WITHDRAW') NOT NULL,
  catatan VARCHAR(2000) NULL,
  actor_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  KEY idx_workflow_version (dokumen_versi_id, created_at, id),
  KEY idx_workflow_actor (actor_id, created_at),
  CONSTRAINT ck_workflow_note CHECK (action NOT IN ('RETURN','WITHDRAW') OR (catatan IS NOT NULL AND CHAR_LENGTH(TRIM(catatan)) > 0)),
  CONSTRAINT ck_workflow_transition CHECK (
    (action = 'CREATE' AND status_asal IS NULL AND status_tujuan = 'DRAF') OR
    (status_asal IS NOT NULL AND (
      (action = 'SUBMIT' AND status_asal IN ('DRAF','REVISI') AND status_tujuan = 'DIAJUKAN') OR
      (action = 'RETURN' AND status_asal = 'DIAJUKAN' AND status_tujuan = 'REVISI') OR
      (action = 'APPROVE' AND status_asal = 'DIAJUKAN' AND status_tujuan = 'DISETUJUI') OR
      (action = 'PUBLISH' AND status_asal = 'DISETUJUI' AND status_tujuan = 'TERBIT') OR
      (action = 'WITHDRAW' AND status_asal = 'TERBIT' AND status_tujuan = 'DITARIK')
    ))
  ),
  CONSTRAINT fk_workflow_version FOREIGN KEY (dokumen_versi_id) REFERENCES dokumen_versi (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_workflow_actor FOREIGN KEY (actor_id) REFERENCES pengguna (id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE dokumen_status_hukum_riwayat (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  dokumen_id BIGINT UNSIGNED NOT NULL,
  status_asal ENUM('BERLAKU','DIUBAH','DICABUT') NULL,
  status_tujuan ENUM('BERLAKU','DIUBAH','DICABUT') NOT NULL,
  source_version_id BIGINT UNSIGNED NULL COMMENT 'Versi sumber dampak; NULL untuk koreksi eksplisit',
  alasan VARCHAR(2000) NULL COMMENT 'Opsional; NULL bila tidak ada keterangan',
  actor_id BIGINT UNSIGNED NOT NULL,
  confirmed_at DATETIME(6) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  KEY idx_hukum_document (dokumen_id, created_at, id),
  KEY idx_hukum_source (source_version_id),
  KEY idx_hukum_actor (actor_id, created_at),
  CONSTRAINT ck_hukum_alasan CHECK (alasan IS NULL OR CHAR_LENGTH(TRIM(alasan)) > 0),
  CONSTRAINT fk_hukum_document FOREIGN KEY (dokumen_id) REFERENCES dokumen (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_hukum_source FOREIGN KEY (source_version_id) REFERENCES dokumen_versi (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_hukum_actor FOREIGN KEY (actor_id) REFERENCES pengguna (id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE template_surat (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(191) NOT NULL,
  nama VARCHAR(200) NOT NULL,
  deskripsi TEXT NULL,
  current_version_id BIGINT UNSIGNED NULL,
  aktif BOOLEAN NOT NULL DEFAULT TRUE,
  created_by BIGINT UNSIGNED NOT NULL,
  deleted_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  UNIQUE KEY uq_template_slug (slug),
  KEY idx_template_current (current_version_id, id),
  KEY idx_template_active (aktif, deleted_at),
  KEY idx_template_author (created_by),
  CONSTRAINT ck_template_aktif CHECK (aktif IN (0,1)),
  CONSTRAINT fk_template_author FOREIGN KEY (created_by) REFERENCES pengguna (id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE template_surat_versi (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  template_surat_id BIGINT UNSIGNED NOT NULL,
  nomor_versi INT UNSIGNED NOT NULL,
  tingkat_akses ENUM('PUBLIK','INTERNAL') NOT NULL,
  status ENUM('ACTIVE','ARCHIVED') NOT NULL,
  storage_key VARCHAR(512) COLLATE utf8mb4_bin NOT NULL,
  nama_asli VARCHAR(255) NOT NULL,
  mime_type VARCHAR(150) CHARACTER SET ascii NOT NULL,
  size_bytes BIGINT UNSIGNED NOT NULL,
  checksum BINARY(32) NOT NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  activated_at DATETIME(6) NOT NULL,
  archived_at DATETIME(6) NULL,
  active_slot TINYINT GENERATED ALWAYS AS (CASE WHEN status = 'ACTIVE' THEN 1 ELSE NULL END) STORED,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY uq_template_versi_nomor (template_surat_id, nomor_versi),
  UNIQUE KEY uq_template_versi_owner (id, template_surat_id),
  UNIQUE KEY uq_template_versi_active (template_surat_id, active_slot),
  UNIQUE KEY uq_template_versi_storage (storage_key),
  KEY idx_template_visibility (status, tingkat_akses, activated_at),
  KEY idx_template_versi_author (created_by),
  CONSTRAINT ck_template_versi_nomor CHECK (nomor_versi > 0),
  CONSTRAINT ck_template_versi_size CHECK (size_bytes > 0),
  CONSTRAINT ck_template_versi_archive CHECK (
    (status = 'ACTIVE' AND archived_at IS NULL) OR
    (status = 'ARCHIVED' AND archived_at IS NOT NULL AND archived_at >= activated_at)
  ),
  CONSTRAINT fk_template_versi_owner FOREIGN KEY (template_surat_id) REFERENCES template_surat (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_template_versi_author FOREIGN KEY (created_by) REFERENCES pengguna (id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;

-- Kontak kantor (telepon dan surel) yang tampil di portal publik; dikelola Admin.
CREATE TABLE kontak_kantor_butir (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  jenis ENUM('TELEPON','SUREL') NOT NULL,
  label VARCHAR(100) NULL,
  nilai VARCHAR(254) NOT NULL,
  urutan SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  updated_by BIGINT UNSIGNED NULL COMMENT 'NULL bila berasal dari seed',
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  KEY idx_kontak_butir_urutan (urutan, id),
  KEY idx_kontak_butir_updated_by (updated_by),
  CONSTRAINT ck_kontak_butir_nilai CHECK (CHAR_LENGTH(TRIM(nilai)) > 0),
  CONSTRAINT fk_kontak_butir_updated_by FOREIGN KEY (updated_by) REFERENCES pengguna (id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;

-- Jumlah kunjungan portal publik per hari (tanpa data pribadi), untuk footer.
CREATE TABLE kunjungan_harian (
  tanggal DATE NOT NULL COMMENT 'Tanggal menurut WITA (Asia/Makassar)',
  jumlah INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Pengunjung unik per peramban per hari',
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (tanggal)
) ENGINE=InnoDB;

-- Jumlah orang yang melihat dan mengunduh setiap produk hukum (tanpa data
-- pribadi). Satu peramban dihitung sekali per dokumen per hari WITA.
CREATE TABLE dokumen_statistik (
  dokumen_id BIGINT UNSIGNED NOT NULL,
  jumlah_lihat INT UNSIGNED NOT NULL DEFAULT 0,
  jumlah_unduh INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (dokumen_id),
  CONSTRAINT fk_statistik_dokumen FOREIGN KEY (dokumen_id) REFERENCES dokumen (id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE audit_log (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  actor_id BIGINT UNSIGNED NULL COMMENT 'NULL untuk system/anonymous/operations',
  module VARCHAR(64) NOT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(64) NOT NULL,
  entity_id BIGINT UNSIGNED NULL COMMENT 'Polimorfik; tidak memakai FK domain',
  before_json JSON NULL,
  after_json JSON NULL,
  request_id VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  ip_hash BINARY(32) NULL,
  user_agent VARCHAR(1024) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  KEY idx_audit_actor_date (actor_id, created_at, id),
  KEY idx_audit_entity_date (entity_type, entity_id, created_at, id),
  KEY idx_audit_date (created_at, id),
  KEY idx_audit_request (request_id),
  CONSTRAINT ck_audit_action CHECK (CHAR_LENGTH(TRIM(action)) > 0),
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_id) REFERENCES pengguna (id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;

-- Close the cycles only after both parent and version tables exist.
-- Explicit composite UNIQUE parent keys avoid nonstandard InnoDB FK references.
ALTER TABLE dokumen ADD
  CONSTRAINT fk_dokumen_current_owner FOREIGN KEY (current_published_version_id, id) REFERENCES dokumen_versi (id, dokumen_id) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE template_surat ADD
  CONSTRAINT fk_template_current_owner FOREIGN KEY (current_version_id, id) REFERENCES template_surat_versi (id, template_surat_id) ON DELETE RESTRICT ON UPDATE RESTRICT;
