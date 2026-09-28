-- =============================================================================
--  PORTAL JDIH ITH PAREPARE — SKEMA BASIS DATA
--  Jaringan Dokumentasi dan Informasi Hukum
--  Institut Teknologi Bacharuddin Jusuf Habibie, Parepare
-- =============================================================================
--  Versi         : 1.0
--  Tanggal       : 26 September 2026
--  DBMS          : MySQL 8.0.16+ (atau MariaDB 10.6+)
--  Engine        : InnoDB
--  Charset       : utf8mb4 / utf8mb4_unicode_ci
--  Zona waktu    : Seluruh DATETIME disimpan dalam UTC
--  Dokumentasi   : docs/04-struktur-basis-data.md
-- =============================================================================
--  Catatan:
--  - Urutan CREATE TABLE mengikuti ketergantungan foreign key.
--  - Seluruh FK memakai ON UPDATE CASCADE; ON DELETE mengikuti docs/03-erd.md.
--  - CHECK constraint memerlukan MySQL 8.0.16 atau lebih baru.
--  - Data referensi awal tersedia pada jdih_ith_seed.sql.
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET @OLD_SQL_MODE = @@SQL_MODE;
SET SQL_MODE = 'STRICT_ALL_TABLES,NO_ENGINE_SUBSTITUTION';

CREATE DATABASE IF NOT EXISTS `jdih_ith`
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_unicode_ci;
USE `jdih_ith`;


-- =============================================================================
--  SUBSISTEM 1 — MASTER DATA DAN REFERENSI
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. unit_kerja — struktur organisasi ITH secara berjenjang
-- -----------------------------------------------------------------------------
CREATE TABLE `unit_kerja` (
    `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `kode`            VARCHAR(20)     NOT NULL,
    `nama`            VARCHAR(150)    NOT NULL,
    `singkatan`       VARCHAR(30)         NULL,
    `jenis`           ENUM('institut','senat','rektorat','biro','fakultas','jurusan',
                           'prodi','lembaga','upt','satuan','unit','eksternal')
                                      NOT NULL DEFAULT 'unit',
    `induk_id`        BIGINT UNSIGNED     NULL,
    `jalur`           VARCHAR(255)    NOT NULL DEFAULT '',
    `kedalaman`       TINYINT UNSIGNED NOT NULL DEFAULT 0,
    `kepala_unit`     VARCHAR(150)        NULL,
    `email_unit`      VARCHAR(150)        NULL,
    `is_aktif`        BOOLEAN         NOT NULL DEFAULT TRUE,
    `urutan`          SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    `dibuat_pada`     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `diperbarui_pada` DATETIME            NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `uq_unit_kerja_kode` UNIQUE (`kode`),
    CONSTRAINT `fk_unit_kerja_induk` FOREIGN KEY (`induk_id`)
        REFERENCES `unit_kerja` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX `idx_unit_kerja_jalur`       (`jalur`),
    INDEX `idx_unit_kerja_induk`       (`induk_id`),
    INDEX `idx_unit_kerja_aktif_jenis` (`is_aktif`, `jenis`),
    INDEX `idx_unit_kerja_nama`        (`nama`)
) ENGINE = InnoDB COMMENT = 'Struktur organisasi ITH; jalur = materialized path';


-- -----------------------------------------------------------------------------
-- 2. status_dokumen — status keberlakuan peraturan
-- -----------------------------------------------------------------------------
CREATE TABLE `status_dokumen` (
    `id`                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `kode`               VARCHAR(30)  NOT NULL,
    `nama`               VARCHAR(60)  NOT NULL,
    `warna`              CHAR(7)      NOT NULL DEFAULT '#6B7280',
    `deskripsi`          VARCHAR(255)     NULL,
    `is_berlaku_efektif` BOOLEAN      NOT NULL DEFAULT FALSE,
    `is_sistem`          BOOLEAN      NOT NULL DEFAULT FALSE,
    `urutan`             SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    CONSTRAINT `uq_status_dokumen_kode` UNIQUE (`kode`),
    CONSTRAINT `ck_status_dokumen_warna`
        CHECK (`warna` REGEXP '^#[0-9A-Fa-f]{6}$')
) ENGINE = InnoDB COMMENT = 'Status keberlakuan: berlaku, diubah, dicabut, dll.';


-- -----------------------------------------------------------------------------
-- 3. bidang_hukum — klasifikasi bidang hukum standar JDIHN
-- -----------------------------------------------------------------------------
CREATE TABLE `bidang_hukum` (
    `id`        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `kode`      VARCHAR(30)  NOT NULL,
    `nama`      VARCHAR(120) NOT NULL,
    `deskripsi` VARCHAR(255)     NULL,
    `is_aktif`  BOOLEAN      NOT NULL DEFAULT TRUE,
    `urutan`    SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    CONSTRAINT `uq_bidang_hukum_kode` UNIQUE (`kode`),
    CONSTRAINT `uq_bidang_hukum_nama` UNIQUE (`nama`)
) ENGINE = InnoDB COMMENT = 'Klasifikasi bidang hukum sesuai standar JDIHN';


-- -----------------------------------------------------------------------------
-- 4. kategori — taksonomi klasifikasi internal ITH, berjenjang
-- -----------------------------------------------------------------------------
CREATE TABLE `kategori` (
    `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `kode`            VARCHAR(30)  NOT NULL,
    `nama`            VARCHAR(120) NOT NULL,
    `slug`            VARCHAR(140) NOT NULL,
    `induk_id`        BIGINT UNSIGNED  NULL,
    `jalur`           VARCHAR(255) NOT NULL DEFAULT '',
    `kedalaman`       TINYINT UNSIGNED NOT NULL DEFAULT 0,
    `deskripsi`       VARCHAR(255)     NULL,
    `ikon`            VARCHAR(60)      NULL,
    `jumlah_dokumen`  INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'penghitung tembolok',
    `is_aktif`        BOOLEAN      NOT NULL DEFAULT TRUE,
    `urutan`          SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    `dibuat_pada`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `diperbarui_pada` DATETIME         NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `uq_kategori_kode` UNIQUE (`kode`),
    CONSTRAINT `uq_kategori_slug` UNIQUE (`slug`),
    CONSTRAINT `fk_kategori_induk` FOREIGN KEY (`induk_id`)
        REFERENCES `kategori` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX `idx_kategori_jalur` (`jalur`),
    INDEX `idx_kategori_induk` (`induk_id`),
    INDEX `idx_kategori_aktif` (`is_aktif`, `urutan`)
) ENGINE = InnoDB COMMENT = 'Taksonomi klasifikasi internal ITH, berjenjang';


-- -----------------------------------------------------------------------------
-- 5. jenis_peraturan — jenis/bentuk produk hukum
-- -----------------------------------------------------------------------------
CREATE TABLE `jenis_peraturan` (
    `id`                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `kode`              VARCHAR(30)  NOT NULL,
    `nama`              VARCHAR(120) NOT NULL,
    `bentuk_singkat`    VARCHAR(40)      NULL,
    `lingkup`           ENUM('internal','eksternal') NOT NULL DEFAULT 'internal',
    `tingkat_hierarki`  TINYINT UNSIGNED NOT NULL DEFAULT 50,
    `lingkup_penomoran` ENUM('institut','unit') NOT NULL DEFAULT 'institut',
    `pola_nomor`        VARCHAR(100)     NULL,
    `deskripsi`         VARCHAR(255)     NULL,
    `is_aktif`          BOOLEAN      NOT NULL DEFAULT TRUE,
    `urutan`            SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    `dibuat_pada`       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `diperbarui_pada`   DATETIME         NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `uq_jenis_peraturan_kode` UNIQUE (`kode`),
    CONSTRAINT `uq_jenis_peraturan_nama` UNIQUE (`nama`),
    CONSTRAINT `ck_jenis_peraturan_hierarki`
        CHECK (`tingkat_hierarki` BETWEEN 1 AND 99),
    INDEX `idx_jenis_peraturan_lingkup` (`lingkup`, `is_aktif`, `urutan`)
) ENGINE = InnoDB COMMENT = 'Jenis produk hukum beserta hierarki dan lingkup penomoran';


-- -----------------------------------------------------------------------------
-- 6. jenis_relasi — jenis relasi antarperaturan
-- -----------------------------------------------------------------------------
CREATE TABLE `jenis_relasi` (
    `id`                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `kode`                VARCHAR(40) NOT NULL,
    `nama`                VARCHAR(80) NOT NULL COMMENT 'label arah aktif',
    `nama_kebalikan`      VARCHAR(80) NOT NULL COMMENT 'label arah pasif',
    `kode_kebalikan`      VARCHAR(40)     NULL,
    `is_simetris`         BOOLEAN     NOT NULL DEFAULT FALSE,
    `is_mengubah_status`  BOOLEAN     NOT NULL DEFAULT FALSE,
    `status_akibat_id`    BIGINT UNSIGNED NULL,
    `is_sistem`           BOOLEAN     NOT NULL DEFAULT FALSE,
    `urutan`              SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    CONSTRAINT `uq_jenis_relasi_kode` UNIQUE (`kode`),
    CONSTRAINT `fk_jenis_relasi_status_akibat` FOREIGN KEY (`status_akibat_id`)
        REFERENCES `status_dokumen` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `ck_jenis_relasi_status_akibat`
        CHECK (`is_mengubah_status` = FALSE OR `status_akibat_id` IS NOT NULL)
) ENGINE = InnoDB COMMENT = 'Jenis relasi antarperaturan + pemetaan kebalikan';


-- =============================================================================
--  SUBSISTEM 3 — PENGGUNA, PERAN, DAN OTORISASI
--  (didahulukan karena dirujuk oleh tabel dokumen dan konten)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 7. pengguna — akun pengguna sistem
-- -----------------------------------------------------------------------------
CREATE TABLE `pengguna` (
    `id`                       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `nama_lengkap`             VARCHAR(150) NOT NULL,
    `email`                    VARCHAR(190) NOT NULL,
    `nip_nidn`                 VARCHAR(30)      NULL,
    `kata_sandi`               VARCHAR(255) NOT NULL COMMENT 'hash Argon2id/bcrypt',
    `no_telepon`               VARCHAR(25)      NULL,
    `unit_kerja_id`            BIGINT UNSIGNED  NULL,
    `jabatan`                  VARCHAR(120)     NULL,
    `foto`                     VARCHAR(255)     NULL,
    `status`                   ENUM('menunggu_verifikasi','aktif','nonaktif','ditangguhkan')
                                            NOT NULL DEFAULT 'menunggu_verifikasi',
    `email_terverifikasi_pada` DATETIME         NULL,
    `is_2fa_aktif`             BOOLEAN      NOT NULL DEFAULT FALSE,
    `rahasia_2fa`              VARCHAR(255)     NULL COMMENT 'terenkripsi di aplikasi',
    `kode_pemulihan_2fa`       JSON             NULL,
    `jumlah_gagal_login`       TINYINT UNSIGNED NOT NULL DEFAULT 0,
    `dikunci_hingga`           DATETIME         NULL,
    `terakhir_login_pada`      DATETIME         NULL,
    `terakhir_login_ip`        VARCHAR(45)      NULL,
    `sumber_akun`              ENUM('lokal','sso') NOT NULL DEFAULT 'lokal',
    `sso_subject`              VARCHAR(190)     NULL,
    `preferensi`               JSON             NULL,
    `diverifikasi_oleh`        BIGINT UNSIGNED  NULL,
    `diverifikasi_pada`        DATETIME         NULL,
    `token_ingat`              VARCHAR(100)     NULL,
    `dibuat_oleh`              BIGINT UNSIGNED  NULL,
    `dibuat_pada`              DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `diperbarui_pada`          DATETIME         NULL ON UPDATE CURRENT_TIMESTAMP,
    `dihapus_pada`             DATETIME         NULL,
    PRIMARY KEY (`id`),
    CONSTRAINT `uq_pengguna_email` UNIQUE (`email`),
    CONSTRAINT `uq_pengguna_nip`   UNIQUE (`nip_nidn`),
    CONSTRAINT `uq_pengguna_sso`   UNIQUE (`sso_subject`),
    CONSTRAINT `fk_pengguna_unit` FOREIGN KEY (`unit_kerja_id`)
        REFERENCES `unit_kerja` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_pengguna_diverifikasi_oleh` FOREIGN KEY (`diverifikasi_oleh`)
        REFERENCES `pengguna` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_pengguna_dibuat_oleh` FOREIGN KEY (`dibuat_oleh`)
        REFERENCES `pengguna` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `ck_pengguna_email_format` CHECK (`email` LIKE '%_@_%._%'),
    INDEX `idx_pengguna_status_unit` (`status`, `unit_kerja_id`),
    INDEX `idx_pengguna_nama`        (`nama_lengkap`),
    INDEX `idx_pengguna_dihapus`     (`dihapus_pada`)
) ENGINE = InnoDB COMMENT = 'Akun pengguna; soft delete melalui dihapus_pada';


-- -----------------------------------------------------------------------------
-- 8. peran
-- -----------------------------------------------------------------------------
CREATE TABLE `peran` (
    `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `kode`             VARCHAR(40) NOT NULL,
    `nama`             VARCHAR(80) NOT NULL,
    `deskripsi`        VARCHAR(255)    NULL,
    `tingkat`          TINYINT UNSIGNED NOT NULL DEFAULT 9
                       COMMENT '1 = kewenangan tertinggi',
    `is_sistem`        BOOLEAN     NOT NULL DEFAULT FALSE,
    `is_anonim`        BOOLEAN     NOT NULL DEFAULT FALSE
                       COMMENT 'peran virtual untuk permintaan tanpa autentikasi',
    `is_wajib_2fa`     BOOLEAN     NOT NULL DEFAULT FALSE,
    `is_lingkup_unit`  BOOLEAN     NOT NULL DEFAULT FALSE,
    `dibuat_pada`      DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `diperbarui_pada`  DATETIME        NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `uq_peran_kode` UNIQUE (`kode`),
    CONSTRAINT `uq_peran_nama` UNIQUE (`nama`)
) ENGINE = InnoDB;


-- -----------------------------------------------------------------------------
-- 9. izin
-- -----------------------------------------------------------------------------
CREATE TABLE `izin` (
    `id`                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `kode`                  VARCHAR(60)  NOT NULL COMMENT 'format modul.aksi',
    `nama`                  VARCHAR(120) NOT NULL,
    `modul`                 VARCHAR(40)  NOT NULL,
    `deskripsi`             VARCHAR(255)     NULL,
    `is_berdampak_tinggi`   BOOLEAN      NOT NULL DEFAULT FALSE,
    `is_sistem`             BOOLEAN      NOT NULL DEFAULT TRUE,
    `urutan`                SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    CONSTRAINT `uq_izin_kode` UNIQUE (`kode`),
    CONSTRAINT `ck_izin_kode_format` CHECK (`kode` REGEXP '^[a-z_]+\\.[a-z_]+$'),
    INDEX `idx_izin_modul` (`modul`, `urutan`)
) ENGINE = InnoDB;


-- -----------------------------------------------------------------------------
-- 10. peran_izin
-- -----------------------------------------------------------------------------
CREATE TABLE `peran_izin` (
    `peran_id`       BIGINT UNSIGNED NOT NULL,
    `izin_id`        BIGINT UNSIGNED NOT NULL,
    `diberikan_oleh` BIGINT UNSIGNED     NULL,
    `dibuat_pada`    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`peran_id`, `izin_id`),
    CONSTRAINT `fk_peran_izin_peran` FOREIGN KEY (`peran_id`)
        REFERENCES `peran` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_peran_izin_izin` FOREIGN KEY (`izin_id`)
        REFERENCES `izin` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_peran_izin_pemberi` FOREIGN KEY (`diberikan_oleh`)
        REFERENCES `pengguna` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX `idx_peran_izin_izin` (`izin_id`)
) ENGINE = InnoDB;


-- -----------------------------------------------------------------------------
-- 11. pengguna_peran
-- -----------------------------------------------------------------------------
CREATE TABLE `pengguna_peran` (
    `pengguna_id`     BIGINT UNSIGNED NOT NULL,
    `peran_id`        BIGINT UNSIGNED NOT NULL,
    `ditetapkan_oleh` BIGINT UNSIGNED     NULL,
    `dibuat_pada`     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`pengguna_id`, `peran_id`),
    CONSTRAINT `fk_pengguna_peran_pengguna` FOREIGN KEY (`pengguna_id`)
        REFERENCES `pengguna` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_pengguna_peran_peran` FOREIGN KEY (`peran_id`)
        REFERENCES `peran` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_pengguna_peran_penetap` FOREIGN KEY (`ditetapkan_oleh`)
        REFERENCES `pengguna` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX `idx_pengguna_peran_peran` (`peran_id`)
) ENGINE = InnoDB;


-- -----------------------------------------------------------------------------
-- 12. pengguna_izin — pemberian/pencabutan izin langsung per akun
-- -----------------------------------------------------------------------------
CREATE TABLE `pengguna_izin` (
    `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `pengguna_id`     BIGINT UNSIGNED NOT NULL,
    `izin_id`         BIGINT UNSIGNED NOT NULL,
    `mode`            ENUM('berikan','cabut') NOT NULL DEFAULT 'berikan',
    `berlaku_hingga`  DATE                NULL,
    `alasan`          VARCHAR(255)        NULL,
    `ditetapkan_oleh` BIGINT UNSIGNED NOT NULL,
    `dibuat_pada`     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `uq_pengguna_izin`   UNIQUE (`pengguna_id`, `izin_id`),
    CONSTRAINT `fk_pengguna_izin_pengguna` FOREIGN KEY (`pengguna_id`)
        REFERENCES `pengguna` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_pengguna_izin_izin` FOREIGN KEY (`izin_id`)
        REFERENCES `izin` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_pengguna_izin_penetap` FOREIGN KEY (`ditetapkan_oleh`)
        REFERENCES `pengguna` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX `idx_pengguna_izin_berlaku` (`berlaku_hingga`)
) ENGINE = InnoDB;


-- -----------------------------------------------------------------------------
-- 13. pengguna_unit_akses — akses lintas unit kerja bagi Admin
-- -----------------------------------------------------------------------------
CREATE TABLE `pengguna_unit_akses` (
    `pengguna_id`      BIGINT UNSIGNED NOT NULL,
    `unit_kerja_id`    BIGINT UNSIGNED NOT NULL,
    `termasuk_bawahan` BOOLEAN         NOT NULL DEFAULT TRUE,
    `ditetapkan_oleh`  BIGINT UNSIGNED     NULL,
    `dibuat_pada`      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`pengguna_id`, `unit_kerja_id`),
    CONSTRAINT `fk_pengguna_unit_akses_pengguna` FOREIGN KEY (`pengguna_id`)
        REFERENCES `pengguna` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_pengguna_unit_akses_unit` FOREIGN KEY (`unit_kerja_id`)
        REFERENCES `unit_kerja` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_pengguna_unit_akses_penetap` FOREIGN KEY (`ditetapkan_oleh`)
        REFERENCES `pengguna` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX `idx_pengguna_unit_akses_unit` (`unit_kerja_id`)
) ENGINE = InnoDB;


-- -----------------------------------------------------------------------------
-- 14. token_reset_sandi
-- -----------------------------------------------------------------------------
CREATE TABLE `token_reset_sandi` (
    `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `pengguna_id`      BIGINT UNSIGNED NOT NULL,
    `token_hash`       CHAR(64)        NOT NULL,
    `kedaluwarsa_pada` DATETIME        NOT NULL,
    `dipakai_pada`     DATETIME            NULL,
    `ip_hash`          CHAR(64)            NULL,
    `dibuat_pada`      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `uq_token_reset_hash`    UNIQUE (`token_hash`),
    CONSTRAINT `fk_token_reset_pengguna` FOREIGN KEY (`pengguna_id`)
        REFERENCES `pengguna` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX `idx_token_reset_kedaluwarsa` (`kedaluwarsa_pada`)
) ENGINE = InnoDB;


-- -----------------------------------------------------------------------------
-- 15. tag — kata kunci/subjek (dipakai bersama dokumen dan berita)
-- -----------------------------------------------------------------------------
CREATE TABLE `tag` (
    `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `nama`         VARCHAR(80)  NOT NULL,
    `slug`         VARCHAR(100) NOT NULL,
    `jumlah_pakai` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'penghitung tembolok',
    `dibuat_oleh`  BIGINT UNSIGNED  NULL,
    `dibuat_pada`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `uq_tag_nama` UNIQUE (`nama`),
    CONSTRAINT `uq_tag_slug` UNIQUE (`slug`),
    CONSTRAINT `fk_tag_dibuat_oleh` FOREIGN KEY (`dibuat_oleh`)
        REFERENCES `pengguna` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX `idx_tag_populer` (`jumlah_pakai` DESC)
) ENGINE = InnoDB;


-- =============================================================================
--  SUBSISTEM 2 — DOKUMEN HUKUM
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 16. impor_batch — catatan proses impor massal
-- -----------------------------------------------------------------------------
CREATE TABLE `impor_batch` (
    `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `nama_berkas`      VARCHAR(255) NOT NULL,
    `path`             VARCHAR(500) NOT NULL,
    `mode`             ENUM('buat','perbarui') NOT NULL DEFAULT 'buat',
    `total_baris`      INT UNSIGNED NOT NULL DEFAULT 0,
    `jumlah_berhasil`  INT UNSIGNED NOT NULL DEFAULT 0,
    `jumlah_gagal`     INT UNSIGNED NOT NULL DEFAULT 0,
    `baris_terakhir`   INT UNSIGNED NOT NULL DEFAULT 0,
    `status`           ENUM('pravalidasi','menunggu','berjalan','selesai','gagal','dibatalkan')
                                    NOT NULL DEFAULT 'pravalidasi',
    `laporan`          JSON             NULL,
    `oleh_id`          BIGINT UNSIGNED NOT NULL,
    `dibuat_pada`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `diperbarui_pada`  DATETIME         NULL ON UPDATE CURRENT_TIMESTAMP,
    `selesai_pada`     DATETIME         NULL,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_impor_batch_oleh` FOREIGN KEY (`oleh_id`)
        REFERENCES `pengguna` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `ck_impor_batch_jumlah`
        CHECK (`jumlah_berhasil` + `jumlah_gagal` <= `total_baris`),
    INDEX `idx_impor_batch_status` (`status`, `dibuat_pada` DESC)
) ENGINE = InnoDB;


-- -----------------------------------------------------------------------------
-- 17. dokumen — TABEL INTI
-- -----------------------------------------------------------------------------
CREATE TABLE `dokumen` (
    `id`                       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `kode_dokumen`             VARCHAR(30)  NOT NULL COMMENT 'JDIH-ITH-2026-000123',
    `slug`                     VARCHAR(255) NOT NULL,

    -- Identitas peraturan
    `jenis_peraturan_id`       BIGINT UNSIGNED NOT NULL,
    `nomor`                    VARCHAR(100) NOT NULL,
    `nomor_normal`             VARCHAR(100) AS (
                                   UPPER(TRIM(REGEXP_REPLACE(`nomor`, '[[:space:]]+', ' ')))
                               ) STORED,
    `nomor_lengkap`            VARCHAR(255)     NULL,
    `tahun`                    SMALLINT UNSIGNED NOT NULL,
    `judul`                    VARCHAR(500) NOT NULL,
    `judul_singkat`            VARCHAR(255)     NULL,
    `teu`                      VARCHAR(500)     NULL COMMENT 'Tempat, Entitas, Uraian',
    `teu_manual`               BOOLEAN      NOT NULL DEFAULT FALSE,

    -- Tanggal
    `tempat_penetapan`         VARCHAR(100) NOT NULL DEFAULT 'Parepare',
    `tanggal_penetapan`        DATE         NOT NULL,
    `tanggal_pengundangan`     DATE             NULL,
    `tanggal_berlaku`          DATE             NULL,
    `tanggal_berakhir`         DATE             NULL,

    -- Penerbit dan penandatangan
    `penerbit`                 VARCHAR(255) NOT NULL
                               DEFAULT 'Institut Teknologi Bacharuddin Jusuf Habibie',
    `penandatangan`            VARCHAR(255)     NULL,
    `jabatan_penandatangan`    VARCHAR(150)     NULL,
    `sumber`                   VARCHAR(255)     NULL,

    -- Klasifikasi
    `unit_kerja_id`            BIGINT UNSIGNED NOT NULL,
    `bidang_hukum_id`          BIGINT UNSIGNED     NULL,
    `status_dokumen_id`        BIGINT UNSIGNED NOT NULL,
    `lingkup`                  ENUM('internal','eksternal') NOT NULL DEFAULT 'internal',

    -- Akses dan publikasi
    `tingkat_akses`            ENUM('publik','internal','terbatas','rahasia')
                                            NOT NULL DEFAULT 'publik',
    `status_publikasi`         ENUM('draf','diajukan','revisi','disetujui','terbit','ditarik')
                                            NOT NULL DEFAULT 'draf',

    -- Metadata pelengkap
    `bahasa`                   CHAR(2)      NOT NULL DEFAULT 'id',
    `deskripsi_fisik`          VARCHAR(255)     NULL,
    `nomor_panggil`            VARCHAR(50)      NULL,
    `lokasi_arsip`             VARCHAR(255)     NULL,
    `abstrak`                  MEDIUMTEXT       NULL,
    `catatan`                  TEXT             NULL,
    `isi_teks`                 LONGTEXT         NULL COMMENT 'hasil ekstraksi PDF/OCR',

    -- Penghitung tembolok
    `jumlah_dilihat`           INT UNSIGNED NOT NULL DEFAULT 0,
    `jumlah_diunduh`           INT UNSIGNED NOT NULL DEFAULT 0,
    `is_disorot`               BOOLEAN      NOT NULL DEFAULT FALSE,

    -- Alur kerja
    `diterbitkan_pada`         DATETIME         NULL,
    `dijadwalkan_terbit_pada`  DATETIME         NULL,
    `catatan_revisi`           TEXT             NULL,

    -- Integrasi JDIHN
    `sinkron_jdihn`            ENUM('belum','tertunda','terkirim','gagal')
                                            NOT NULL DEFAULT 'belum',
    `jdihn_id`                 VARCHAR(64)      NULL,
    `disinkron_pada`           DATETIME         NULL,

    -- Jejak
    `impor_batch_id`           BIGINT UNSIGNED     NULL,
    `versi`                    INT UNSIGNED NOT NULL DEFAULT 1
                               COMMENT 'optimistic locking + nomor versi metadata',
    `dibuat_oleh`              BIGINT UNSIGNED NOT NULL,
    `diperiksa_oleh`           BIGINT UNSIGNED     NULL,
    `diterbitkan_oleh`         BIGINT UNSIGNED     NULL,
    `diperbarui_oleh`          BIGINT UNSIGNED     NULL,
    `dibuat_pada`              DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `diperbarui_pada`          DATETIME         NULL ON UPDATE CURRENT_TIMESTAMP,
    `dihapus_pada`             DATETIME         NULL,

    PRIMARY KEY (`id`),
    CONSTRAINT `uq_dokumen_kode`    UNIQUE (`kode_dokumen`),
    CONSTRAINT `uq_dokumen_slug`    UNIQUE (`slug`),
    CONSTRAINT `uq_dokumen_identitas`
        UNIQUE (`jenis_peraturan_id`, `nomor_normal`, `tahun`, `unit_kerja_id`),

    CONSTRAINT `fk_dokumen_jenis` FOREIGN KEY (`jenis_peraturan_id`)
        REFERENCES `jenis_peraturan` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_dokumen_unit` FOREIGN KEY (`unit_kerja_id`)
        REFERENCES `unit_kerja` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_dokumen_bidang` FOREIGN KEY (`bidang_hukum_id`)
        REFERENCES `bidang_hukum` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_dokumen_status` FOREIGN KEY (`status_dokumen_id`)
        REFERENCES `status_dokumen` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_dokumen_impor` FOREIGN KEY (`impor_batch_id`)
        REFERENCES `impor_batch` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_dokumen_dibuat_oleh` FOREIGN KEY (`dibuat_oleh`)
        REFERENCES `pengguna` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_dokumen_diperiksa_oleh` FOREIGN KEY (`diperiksa_oleh`)
        REFERENCES `pengguna` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_dokumen_diterbitkan_oleh` FOREIGN KEY (`diterbitkan_oleh`)
        REFERENCES `pengguna` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_dokumen_diperbarui_oleh` FOREIGN KEY (`diperbarui_oleh`)
        REFERENCES `pengguna` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,

    CONSTRAINT `ck_dokumen_tahun` CHECK (`tahun` BETWEEN 1945 AND 2100),
    CONSTRAINT `ck_dokumen_tanggal_berlaku`
        CHECK (`tanggal_berlaku` IS NULL OR `tanggal_berlaku` >= `tanggal_penetapan`),
    CONSTRAINT `ck_dokumen_tanggal_berakhir`
        CHECK (`tanggal_berakhir` IS NULL OR `tanggal_berakhir` >= `tanggal_penetapan`),
    CONSTRAINT `ck_dokumen_terbit_wajib_waktu`
        CHECK (`status_publikasi` <> 'terbit' OR `diterbitkan_pada` IS NOT NULL),
    CONSTRAINT `ck_dokumen_bahasa` CHECK (`bahasa` REGEXP '^[a-z]{2}$'),

    INDEX `idx_dokumen_daftar_publik`
          (`status_publikasi`, `tingkat_akses`, `dihapus_pada`, `tanggal_penetapan` DESC),
    INDEX `idx_dokumen_jenis_tahun`    (`jenis_peraturan_id`, `tahun`, `status_publikasi`),
    INDEX `idx_dokumen_unit_status`    (`unit_kerja_id`, `status_publikasi`, `dihapus_pada`),
    INDEX `idx_dokumen_status_keberlakuan` (`status_dokumen_id`, `status_publikasi`),
    INDEX `idx_dokumen_bidang`         (`bidang_hukum_id`),
    INDEX `idx_dokumen_jadwal`         (`dijadwalkan_terbit_pada`),
    INDEX `idx_dokumen_sinkron`        (`sinkron_jdihn`, `tingkat_akses`),
    INDEX `idx_dokumen_populer`        (`jumlah_diunduh` DESC),
    INDEX `idx_dokumen_disorot`        (`is_disorot`, `diterbitkan_pada` DESC),
    INDEX `idx_dokumen_diterbitkan`    (`diterbitkan_pada` DESC),
    INDEX `idx_dokumen_dibuat_oleh`    (`dibuat_oleh`),
    FULLTEXT INDEX `ft_dokumen_pencarian` (`judul`, `abstrak`, `isi_teks`)
) ENGINE = InnoDB COMMENT = 'Tabel inti: satu produk hukum + metadata JDIHN';


-- -----------------------------------------------------------------------------
-- 18. dokumen_berkas
-- -----------------------------------------------------------------------------
CREATE TABLE `dokumen_berkas` (
    `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `dokumen_id`       BIGINT UNSIGNED NOT NULL,
    `jenis_berkas`     ENUM('dokumen_utama','lampiran','abstrak','naskah_akademik',
                            'terjemahan','dokumen_pencabut')
                                    NOT NULL DEFAULT 'dokumen_utama',
    `nama_asli`        VARCHAR(255) NOT NULL,
    `nama_simpan`      VARCHAR(100) NOT NULL,
    `path`             VARCHAR(500) NOT NULL,
    `disk`             VARCHAR(30)  NOT NULL DEFAULT 'lokal',
    `mime_type`        VARCHAR(100) NOT NULL,
    `ukuran_bytes`     BIGINT UNSIGNED NOT NULL,
    `jumlah_halaman`   SMALLINT UNSIGNED NULL,
    `hash_sha256`      CHAR(64)     NOT NULL,
    `urutan`           SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    `is_publik`        BOOLEAN      NOT NULL DEFAULT TRUE,
    `is_pratinjau`     BOOLEAN      NOT NULL DEFAULT TRUE,
    `is_versi_aktif`   BOOLEAN      NOT NULL DEFAULT TRUE,
    `jumlah_diunduh`   INT UNSIGNED NOT NULL DEFAULT 0,
    `status_ekstraksi` ENUM('menunggu','berhasil','gagal','tidak_perlu')
                                    NOT NULL DEFAULT 'menunggu',
    `keterangan`       VARCHAR(255)     NULL,
    `dibuat_oleh`      BIGINT UNSIGNED  NULL,
    `dibuat_pada`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `diperbarui_pada`  DATETIME         NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `uq_dokumen_berkas_path` UNIQUE (`path`),
    CONSTRAINT `fk_dokumen_berkas_dokumen` FOREIGN KEY (`dokumen_id`)
        REFERENCES `dokumen` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_dokumen_berkas_dibuat_oleh` FOREIGN KEY (`dibuat_oleh`)
        REFERENCES `pengguna` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `ck_dokumen_berkas_ukuran` CHECK (`ukuran_bytes` > 0),
    CONSTRAINT `ck_dokumen_berkas_hash`   CHECK (CHAR_LENGTH(`hash_sha256`) = 64),
    INDEX `idx_dokumen_berkas_dokumen`
          (`dokumen_id`, `jenis_berkas`, `is_versi_aktif`, `urutan`),
    INDEX `idx_dokumen_berkas_hash`      (`hash_sha256`),
    INDEX `idx_dokumen_berkas_ekstraksi` (`status_ekstraksi`)
) ENGINE = InnoDB;


-- -----------------------------------------------------------------------------
-- 19. dokumen_kategori
-- -----------------------------------------------------------------------------
CREATE TABLE `dokumen_kategori` (
    `dokumen_id`  BIGINT UNSIGNED NOT NULL,
    `kategori_id` BIGINT UNSIGNED NOT NULL,
    `is_utama`    BOOLEAN         NOT NULL DEFAULT FALSE,
    `dibuat_pada` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`dokumen_id`, `kategori_id`),
    CONSTRAINT `fk_dokumen_kategori_dokumen` FOREIGN KEY (`dokumen_id`)
        REFERENCES `dokumen` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_dokumen_kategori_kategori` FOREIGN KEY (`kategori_id`)
        REFERENCES `kategori` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX `idx_dokumen_kategori_kategori` (`kategori_id`)
) ENGINE = InnoDB;


-- -----------------------------------------------------------------------------
-- 20. dokumen_tag
-- -----------------------------------------------------------------------------
CREATE TABLE `dokumen_tag` (
    `dokumen_id`  BIGINT UNSIGNED NOT NULL,
    `tag_id`      BIGINT UNSIGNED NOT NULL,
    `dibuat_pada` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`dokumen_id`, `tag_id`),
    CONSTRAINT `fk_dokumen_tag_dokumen` FOREIGN KEY (`dokumen_id`)
        REFERENCES `dokumen` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_dokumen_tag_tag` FOREIGN KEY (`tag_id`)
        REFERENCES `tag` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX `idx_dokumen_tag_tag` (`tag_id`)
) ENGINE = InnoDB;


-- -----------------------------------------------------------------------------
-- 21. dokumen_relasi — relasi antarperaturan (disimpan satu arah)
-- -----------------------------------------------------------------------------
CREATE TABLE `dokumen_relasi` (
    `id`                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `dokumen_id`         BIGINT UNSIGNED NOT NULL COMMENT 'dokumen sumber/pelaku',
    `dokumen_terkait_id` BIGINT UNSIGNED NOT NULL COMMENT 'dokumen sasaran',
    `jenis_relasi_id`    BIGINT UNSIGNED NOT NULL,
    `keterangan`         VARCHAR(500)        NULL,
    `dibuat_oleh`        BIGINT UNSIGNED     NULL,
    `dibuat_pada`        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `uq_dokumen_relasi`
        UNIQUE (`dokumen_id`, `dokumen_terkait_id`, `jenis_relasi_id`),
    CONSTRAINT `fk_dokumen_relasi_dokumen` FOREIGN KEY (`dokumen_id`)
        REFERENCES `dokumen` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_dokumen_relasi_terkait` FOREIGN KEY (`dokumen_terkait_id`)
        REFERENCES `dokumen` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_dokumen_relasi_jenis` FOREIGN KEY (`jenis_relasi_id`)
        REFERENCES `jenis_relasi` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_dokumen_relasi_dibuat_oleh` FOREIGN KEY (`dibuat_oleh`)
        REFERENCES `pengguna` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `ck_dokumen_relasi_bukan_diri`
        CHECK (`dokumen_id` <> `dokumen_terkait_id`),
    INDEX `idx_dokumen_relasi_terkait` (`dokumen_terkait_id`, `jenis_relasi_id`)
) ENGINE = InnoDB;


-- -----------------------------------------------------------------------------
-- 22. dokumen_akses — daftar subjek berhak (dokumen tingkat akses 'terbatas')
--     Catatan: subjek_id bersifat polimorfik; tanpa FK (lihat docs/08 § H.5)
-- -----------------------------------------------------------------------------
CREATE TABLE `dokumen_akses` (
    `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `dokumen_id`   BIGINT UNSIGNED NOT NULL,
    `subjek_tipe`  ENUM('peran','unit_kerja','pengguna') NOT NULL,
    `subjek_id`    BIGINT UNSIGNED NOT NULL,
    `izin`         ENUM('lihat','unduh') NOT NULL DEFAULT 'unduh',
    `dibuat_oleh`  BIGINT UNSIGNED     NULL,
    `dibuat_pada`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `uq_dokumen_akses`
        UNIQUE (`dokumen_id`, `subjek_tipe`, `subjek_id`, `izin`),
    CONSTRAINT `fk_dokumen_akses_dokumen` FOREIGN KEY (`dokumen_id`)
        REFERENCES `dokumen` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_dokumen_akses_dibuat_oleh` FOREIGN KEY (`dibuat_oleh`)
        REFERENCES `pengguna` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX `idx_dokumen_akses_subjek` (`subjek_tipe`, `subjek_id`)
) ENGINE = InnoDB;


-- -----------------------------------------------------------------------------
-- 23. dokumen_alur — riwayat transisi status publikasi & keberlakuan
-- -----------------------------------------------------------------------------
CREATE TABLE `dokumen_alur` (
    `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `dokumen_id`       BIGINT UNSIGNED NOT NULL,
    `konteks`          ENUM('publikasi','keberlakuan') NOT NULL DEFAULT 'publikasi',
    `status_dari`      VARCHAR(40)      NULL,
    `status_ke`        VARCHAR(40)  NOT NULL,
    `aksi`             VARCHAR(50)  NOT NULL,
    `catatan`          TEXT             NULL,
    `dokumen_dasar_id` BIGINT UNSIGNED  NULL,
    `oleh_id`          BIGINT UNSIGNED  NULL,
    `oleh_sistem`      BOOLEAN      NOT NULL DEFAULT FALSE,
    `dibuat_pada`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_dokumen_alur_dokumen` FOREIGN KEY (`dokumen_id`)
        REFERENCES `dokumen` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_dokumen_alur_dasar` FOREIGN KEY (`dokumen_dasar_id`)
        REFERENCES `dokumen` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_dokumen_alur_oleh` FOREIGN KEY (`oleh_id`)
        REFERENCES `pengguna` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX `idx_dokumen_alur_dokumen` (`dokumen_id`, `konteks`, `dibuat_pada` DESC)
) ENGINE = InnoDB;


-- -----------------------------------------------------------------------------
-- 24. dokumen_riwayat — cuplikan versi metadata
-- -----------------------------------------------------------------------------
CREATE TABLE `dokumen_riwayat` (
    `id`                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `dokumen_id`          BIGINT UNSIGNED NOT NULL,
    `versi`               INT UNSIGNED NOT NULL,
    `cuplikan_metadata`   JSON         NOT NULL,
    `cuplikan_berkas`     JSON             NULL,
    `ringkasan_perubahan` VARCHAR(500)     NULL,
    `oleh_id`             BIGINT UNSIGNED  NULL,
    `dibuat_pada`         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `uq_dokumen_riwayat_versi` UNIQUE (`dokumen_id`, `versi`),
    CONSTRAINT `fk_dokumen_riwayat_dokumen` FOREIGN KEY (`dokumen_id`)
        REFERENCES `dokumen` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_dokumen_riwayat_oleh` FOREIGN KEY (`oleh_id`)
        REFERENCES `pengguna` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB;


-- -----------------------------------------------------------------------------
-- 25. dokumen_statistik_harian — agregat harian
-- -----------------------------------------------------------------------------
CREATE TABLE `dokumen_statistik_harian` (
    `dokumen_id`             BIGINT UNSIGNED NOT NULL,
    `tanggal`                DATE            NOT NULL,
    `jumlah_dilihat`         INT UNSIGNED    NOT NULL DEFAULT 0,
    `jumlah_diunduh`         INT UNSIGNED    NOT NULL DEFAULT 0,
    `jumlah_dilihat_anonim`  INT UNSIGNED    NOT NULL DEFAULT 0,
    `jumlah_diunduh_anonim`  INT UNSIGNED    NOT NULL DEFAULT 0,
    PRIMARY KEY (`dokumen_id`, `tanggal`),
    CONSTRAINT `fk_dokumen_statistik_dokumen` FOREIGN KEY (`dokumen_id`)
        REFERENCES `dokumen` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX `idx_dokumen_statistik_tanggal` (`tanggal`)
) ENGINE = InnoDB COMMENT = 'Agregat harian; mendukung INSERT .. ON DUPLICATE KEY UPDATE';


-- -----------------------------------------------------------------------------
-- 26. unduhan — catatan peristiwa unduhan
--     Kandidat partisi RANGE bulanan bila > 5 juta baris (lihat docs/04 § D.2.10)
-- -----------------------------------------------------------------------------
CREATE TABLE `unduhan` (
    `id`                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `dokumen_id`         BIGINT UNSIGNED NOT NULL,
    `dokumen_berkas_id`  BIGINT UNSIGNED     NULL,
    `pengguna_id`        BIGINT UNSIGNED     NULL COMMENT 'NULL = anonim',
    `peran_saat_unduh`   VARCHAR(30)     NOT NULL DEFAULT 'pengunjung',
    `ip_hash`            CHAR(64)        NOT NULL,
    `agen_ringkas`       VARCHAR(150)        NULL,
    `perujuk`            VARCHAR(255)        NULL,
    `dibuat_pada`        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_unduhan_dokumen` FOREIGN KEY (`dokumen_id`)
        REFERENCES `dokumen` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_unduhan_berkas` FOREIGN KEY (`dokumen_berkas_id`)
        REFERENCES `dokumen_berkas` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_unduhan_pengguna` FOREIGN KEY (`pengguna_id`)
        REFERENCES `pengguna` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX `idx_unduhan_dokumen_tanggal` (`dokumen_id`, `dibuat_pada`),
    INDEX `idx_unduhan_ip_waktu`        (`ip_hash`, `dibuat_pada`),
    INDEX `idx_unduhan_pengguna_waktu`  (`pengguna_id`, `dibuat_pada` DESC),
    INDEX `idx_unduhan_waktu`           (`dibuat_pada`)
) ENGINE = InnoDB;


-- -----------------------------------------------------------------------------
-- 27. permintaan_akses — pengajuan akses dokumen terbatas
-- -----------------------------------------------------------------------------
CREATE TABLE `permintaan_akses` (
    `id`                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `dokumen_id`        BIGINT UNSIGNED NOT NULL,
    `pengguna_id`       BIGINT UNSIGNED NOT NULL,
    `alasan`            TEXT            NOT NULL,
    `status`            ENUM('menunggu','disetujui','ditolak','kedaluwarsa')
                                        NOT NULL DEFAULT 'menunggu',
    `diputuskan_oleh`   BIGINT UNSIGNED     NULL,
    `catatan_keputusan` TEXT                NULL,
    `diputuskan_pada`   DATETIME            NULL,
    `berlaku_hingga`    DATE                NULL,
    -- Kunci parsial: hanya terisi saat status 'menunggu'. Karena MySQL
    -- memperlakukan NULL sebagai nilai berbeda pada indeks unik, kolom ini
    -- mencegah pengajuan ganda yang masih menunggu, namun tetap mengizinkan
    -- pengajuan ulang setelah permintaan sebelumnya ditolak atau kedaluwarsa.
    `kunci_menunggu`    VARCHAR(50) AS (
                            IF(`status` = 'menunggu',
                               CONCAT(`dokumen_id`, '-', `pengguna_id`),
                               NULL)
                        ) STORED,
    `dibuat_pada`       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `diperbarui_pada`   DATETIME            NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `uq_permintaan_akses_menunggu` UNIQUE (`kunci_menunggu`),
    CONSTRAINT `fk_permintaan_akses_dokumen` FOREIGN KEY (`dokumen_id`)
        REFERENCES `dokumen` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_permintaan_akses_pengguna` FOREIGN KEY (`pengguna_id`)
        REFERENCES `pengguna` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_permintaan_akses_pemutus` FOREIGN KEY (`diputuskan_oleh`)
        REFERENCES `pengguna` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `ck_permintaan_akses_keputusan`
        CHECK (`status` = 'menunggu' OR `diputuskan_pada` IS NOT NULL),
    INDEX `idx_permintaan_akses_status` (`status`, `dibuat_pada` DESC)
) ENGINE = InnoDB;


-- -----------------------------------------------------------------------------
-- 28. koleksi_pengguna — penanda dokumen pribadi
-- -----------------------------------------------------------------------------
CREATE TABLE `koleksi_pengguna` (
    `pengguna_id` BIGINT UNSIGNED NOT NULL,
    `dokumen_id`  BIGINT UNSIGNED NOT NULL,
    `catatan`     VARCHAR(255)        NULL,
    `dibuat_pada` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`pengguna_id`, `dokumen_id`),
    CONSTRAINT `fk_koleksi_pengguna_pengguna` FOREIGN KEY (`pengguna_id`)
        REFERENCES `pengguna` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_koleksi_pengguna_dokumen` FOREIGN KEY (`dokumen_id`)
        REFERENCES `dokumen` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX `idx_koleksi_dokumen` (`dokumen_id`)
) ENGINE = InnoDB;


-- -----------------------------------------------------------------------------
-- 29. log_sinkronisasi_jdihn
-- -----------------------------------------------------------------------------
CREATE TABLE `log_sinkronisasi_jdihn` (
    `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `dokumen_id`    BIGINT UNSIGNED NOT NULL,
    `arah`          ENUM('kirim','perbarui','hapus') NOT NULL DEFAULT 'kirim',
    `muatan`        JSON                NULL,
    `kode_respons`  SMALLINT UNSIGNED   NULL,
    `pesan_respons` TEXT                NULL,
    `status`        ENUM('berhasil','gagal') NOT NULL,
    `percobaan_ke`  TINYINT UNSIGNED NOT NULL DEFAULT 1,
    `durasi_ms`     INT UNSIGNED        NULL,
    `dibuat_pada`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_log_sinkronisasi_dokumen` FOREIGN KEY (`dokumen_id`)
        REFERENCES `dokumen` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX `idx_log_sinkronisasi_dokumen` (`dokumen_id`, `dibuat_pada` DESC),
    INDEX `idx_log_sinkronisasi_status`  (`status`, `dibuat_pada` DESC)
) ENGINE = InnoDB;


-- =============================================================================
--  SUBSISTEM 4 — KONTEN INFORMASI HUKUM
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 30. kategori_berita
-- -----------------------------------------------------------------------------
CREATE TABLE `kategori_berita` (
    `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `nama`            VARCHAR(100) NOT NULL,
    `slug`            VARCHAR(120) NOT NULL,
    `deskripsi`       VARCHAR(255)     NULL,
    `is_aktif`        BOOLEAN      NOT NULL DEFAULT TRUE,
    `urutan`          SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    `dibuat_pada`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `diperbarui_pada` DATETIME         NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `uq_kategori_berita_nama` UNIQUE (`nama`),
    CONSTRAINT `uq_kategori_berita_slug` UNIQUE (`slug`)
) ENGINE = InnoDB;


-- -----------------------------------------------------------------------------
-- 31. berita
-- -----------------------------------------------------------------------------
CREATE TABLE `berita` (
    `id`                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `judul`               VARCHAR(255) NOT NULL,
    `slug`                VARCHAR(275) NOT NULL,
    `tipe`                ENUM('berita','artikel_hukum','pengumuman','siaran_pers')
                                       NOT NULL DEFAULT 'berita',
    `kategori_berita_id`  BIGINT UNSIGNED  NULL,
    `ringkasan`           VARCHAR(500)     NULL,
    `isi`                 LONGTEXT     NOT NULL,
    `gambar_utama`        VARCHAR(255)     NULL,
    `sumber`              VARCHAR(255)     NULL,
    `penulis_id`          BIGINT UNSIGNED NOT NULL,
    `penulis_nama_tampil` VARCHAR(150)     NULL,
    `status`              ENUM('draf','ditinjau','terbit','arsip')
                                       NOT NULL DEFAULT 'draf',
    `diterbitkan_pada`    DATETIME         NULL,
    `jumlah_dilihat`      INT UNSIGNED NOT NULL DEFAULT 0,
    `is_disorot`          BOOLEAN      NOT NULL DEFAULT FALSE,
    `meta_judul`          VARCHAR(255)     NULL,
    `meta_deskripsi`      VARCHAR(500)     NULL,
    `dibuat_pada`         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `diperbarui_pada`     DATETIME         NULL ON UPDATE CURRENT_TIMESTAMP,
    `dihapus_pada`        DATETIME         NULL,
    PRIMARY KEY (`id`),
    CONSTRAINT `uq_berita_slug` UNIQUE (`slug`),
    CONSTRAINT `fk_berita_kategori` FOREIGN KEY (`kategori_berita_id`)
        REFERENCES `kategori_berita` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_berita_penulis` FOREIGN KEY (`penulis_id`)
        REFERENCES `pengguna` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `ck_berita_terbit_wajib_waktu`
        CHECK (`status` <> 'terbit' OR `diterbitkan_pada` IS NOT NULL),
    INDEX `idx_berita_daftar` (`status`, `tipe`, `diterbitkan_pada` DESC, `dihapus_pada`),
    INDEX `idx_berita_disorot` (`is_disorot`, `diterbitkan_pada` DESC),
    FULLTEXT INDEX `ft_berita_pencarian` (`judul`, `ringkasan`, `isi`)
) ENGINE = InnoDB;


-- -----------------------------------------------------------------------------
-- 32. berita_tag
-- -----------------------------------------------------------------------------
CREATE TABLE `berita_tag` (
    `berita_id` BIGINT UNSIGNED NOT NULL,
    `tag_id`    BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (`berita_id`, `tag_id`),
    CONSTRAINT `fk_berita_tag_berita` FOREIGN KEY (`berita_id`)
        REFERENCES `berita` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_berita_tag_tag` FOREIGN KEY (`tag_id`)
        REFERENCES `tag` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX `idx_berita_tag_tag` (`tag_id`)
) ENGINE = InnoDB;


-- -----------------------------------------------------------------------------
-- 33. berita_dokumen — berita merujuk dokumen peraturan
-- -----------------------------------------------------------------------------
CREATE TABLE `berita_dokumen` (
    `berita_id`  BIGINT UNSIGNED NOT NULL,
    `dokumen_id` BIGINT UNSIGNED NOT NULL,
    `keterangan` VARCHAR(255)        NULL,
    PRIMARY KEY (`berita_id`, `dokumen_id`),
    CONSTRAINT `fk_berita_dokumen_berita` FOREIGN KEY (`berita_id`)
        REFERENCES `berita` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_berita_dokumen_dokumen` FOREIGN KEY (`dokumen_id`)
        REFERENCES `dokumen` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX `idx_berita_dokumen_dokumen` (`dokumen_id`)
) ENGINE = InnoDB;


-- -----------------------------------------------------------------------------
-- 34. halaman — halaman statis berjenjang
-- -----------------------------------------------------------------------------
CREATE TABLE `halaman` (
    `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `judul`           VARCHAR(200) NOT NULL,
    `slug`            VARCHAR(220) NOT NULL,
    `isi`             LONGTEXT         NULL,
    `induk_id`        BIGINT UNSIGNED  NULL,
    `templat`         VARCHAR(50)  NOT NULL DEFAULT 'baku',
    `status`          ENUM('draf','terbit') NOT NULL DEFAULT 'draf',
    `is_sistem`       BOOLEAN      NOT NULL DEFAULT FALSE,
    `urutan`          SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    `meta_judul`      VARCHAR(255)     NULL,
    `meta_deskripsi`  VARCHAR(500)     NULL,
    `disusun_oleh`    BIGINT UNSIGNED  NULL,
    `dibuat_pada`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `diperbarui_pada` DATETIME         NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `uq_halaman_slug` UNIQUE (`slug`),
    CONSTRAINT `fk_halaman_induk` FOREIGN KEY (`induk_id`)
        REFERENCES `halaman` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_halaman_penyusun` FOREIGN KEY (`disusun_oleh`)
        REFERENCES `pengguna` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX `idx_halaman_status` (`status`, `urutan`),
    INDEX `idx_halaman_induk`  (`induk_id`)
) ENGINE = InnoDB;


-- -----------------------------------------------------------------------------
-- 35. menu
-- -----------------------------------------------------------------------------
CREATE TABLE `menu` (
    `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `kode`            VARCHAR(40) NOT NULL,
    `nama`            VARCHAR(80) NOT NULL,
    `lokasi`          ENUM('header','footer','sidebar','kaki_kolom_1','kaki_kolom_2')
                                  NOT NULL DEFAULT 'header',
    `dibuat_pada`     DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `diperbarui_pada` DATETIME        NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `uq_menu_kode` UNIQUE (`kode`)
) ENGINE = InnoDB;


-- -----------------------------------------------------------------------------
-- 36. menu_item — butir menu berjenjang (target polimorfik, tanpa FK)
-- -----------------------------------------------------------------------------
CREATE TABLE `menu_item` (
    `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `menu_id`         BIGINT UNSIGNED NOT NULL,
    `induk_id`        BIGINT UNSIGNED     NULL,
    `label`           VARCHAR(100)    NOT NULL,
    `tipe_target`     ENUM('beranda','halaman','jenis_peraturan','kategori',
                           'berita','url','pencarian') NOT NULL DEFAULT 'url',
    `target_id`       BIGINT UNSIGNED     NULL,
    `url`             VARCHAR(500)        NULL,
    `ikon`            VARCHAR(60)         NULL,
    `target_jendela`  ENUM('sama','baru') NOT NULL DEFAULT 'sama',
    `is_aktif`        BOOLEAN         NOT NULL DEFAULT TRUE,
    `urutan`          SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    `dibuat_pada`     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `diperbarui_pada` DATETIME            NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_menu_item_menu` FOREIGN KEY (`menu_id`)
        REFERENCES `menu` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_menu_item_induk` FOREIGN KEY (`induk_id`)
        REFERENCES `menu_item` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `ck_menu_item_target`
        CHECK (`tipe_target` <> 'url' OR `url` IS NOT NULL),
    INDEX `idx_menu_item_susunan` (`menu_id`, `induk_id`, `urutan`),
    INDEX `idx_menu_item_aktif`   (`is_aktif`)
) ENGINE = InnoDB;


-- -----------------------------------------------------------------------------
-- 37. banner
-- -----------------------------------------------------------------------------
CREATE TABLE `banner` (
    `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `judul`           VARCHAR(200) NOT NULL,
    `subjudul`        VARCHAR(300)     NULL,
    `gambar`          VARCHAR(255) NOT NULL,
    `gambar_seluler`  VARCHAR(255)     NULL,
    `tautan`          VARCHAR(500)     NULL,
    `label_tombol`    VARCHAR(50)      NULL,
    `tanggal_mulai`   DATE             NULL,
    `tanggal_selesai` DATE             NULL,
    `is_aktif`        BOOLEAN      NOT NULL DEFAULT TRUE,
    `urutan`          SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    `dibuat_oleh`     BIGINT UNSIGNED  NULL,
    `dibuat_pada`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `diperbarui_pada` DATETIME         NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_banner_dibuat_oleh` FOREIGN KEY (`dibuat_oleh`)
        REFERENCES `pengguna` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `ck_banner_periode`
        CHECK (`tanggal_selesai` IS NULL OR `tanggal_mulai` IS NULL
               OR `tanggal_selesai` >= `tanggal_mulai`),
    INDEX `idx_banner_tampil` (`is_aktif`, `tanggal_mulai`, `tanggal_selesai`, `urutan`)
) ENGINE = InnoDB;


-- -----------------------------------------------------------------------------
-- 38. media — pustaka berkas media
-- -----------------------------------------------------------------------------
CREATE TABLE `media` (
    `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `nama_asli`       VARCHAR(255) NOT NULL,
    `nama_simpan`     VARCHAR(100) NOT NULL,
    `path`            VARCHAR(500) NOT NULL,
    `disk`            VARCHAR(30)  NOT NULL DEFAULT 'lokal',
    `mime_type`       VARCHAR(100) NOT NULL,
    `ukuran_bytes`    BIGINT UNSIGNED NOT NULL,
    `lebar`           SMALLINT UNSIGNED NULL,
    `tinggi`          SMALLINT UNSIGNED NULL,
    `teks_alternatif` VARCHAR(255)     NULL,
    `folder`          VARCHAR(100)     NULL,
    `hash_sha256`     CHAR(64)         NULL,
    `diunggah_oleh`   BIGINT UNSIGNED  NULL,
    `dibuat_pada`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `uq_media_path` UNIQUE (`path`),
    CONSTRAINT `fk_media_pengunggah` FOREIGN KEY (`diunggah_oleh`)
        REFERENCES `pengguna` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `ck_media_ukuran` CHECK (`ukuran_bytes` > 0),
    INDEX `idx_media_folder` (`folder`, `dibuat_pada` DESC),
    INDEX `idx_media_hash`   (`hash_sha256`)
) ENGINE = InnoDB;


-- -----------------------------------------------------------------------------
-- 39. tautan_terkait
-- -----------------------------------------------------------------------------
CREATE TABLE `tautan_terkait` (
    `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `nama`            VARCHAR(150) NOT NULL,
    `url`             VARCHAR(500) NOT NULL,
    `logo`            VARCHAR(255)     NULL,
    `kelompok`        ENUM('jdihn','kementerian','perguruan_tinggi','internal','lainnya')
                                   NOT NULL DEFAULT 'lainnya',
    `deskripsi`       VARCHAR(255)     NULL,
    `is_aktif`        BOOLEAN      NOT NULL DEFAULT TRUE,
    `urutan`          SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    `dibuat_pada`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `diperbarui_pada` DATETIME         NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `uq_tautan_terkait_url` UNIQUE (`url`),
    INDEX `idx_tautan_terkait_kelompok` (`kelompok`, `is_aktif`, `urutan`)
) ENGINE = InnoDB;


-- -----------------------------------------------------------------------------
-- 40. faq
-- -----------------------------------------------------------------------------
CREATE TABLE `faq` (
    `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `pertanyaan`      VARCHAR(500) NOT NULL,
    `jawaban`         TEXT         NOT NULL,
    `kelompok`        VARCHAR(60)      NULL,
    `is_aktif`        BOOLEAN      NOT NULL DEFAULT TRUE,
    `urutan`          SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    `dibuat_pada`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `diperbarui_pada` DATETIME         NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_faq_kelompok` (`kelompok`, `is_aktif`, `urutan`)
) ENGINE = InnoDB;


-- =============================================================================
--  SUBSISTEM 5 & 6 — INTERAKSI PUBLIK, SISTEM, AUDIT, NOTIFIKASI
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 41. pesan_kontak
-- -----------------------------------------------------------------------------
CREATE TABLE `pesan_kontak` (
    `id`                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `nama`               VARCHAR(150) NOT NULL,
    `email`              VARCHAR(190) NOT NULL,
    `no_telepon`         VARCHAR(25)      NULL,
    `subjek`             VARCHAR(255) NOT NULL,
    `pesan`              TEXT         NOT NULL,
    `status`             ENUM('baru','diproses','selesai','spam')
                                      NOT NULL DEFAULT 'baru',
    `ditangani_oleh`     BIGINT UNSIGNED  NULL,
    `catatan_penanganan` TEXT             NULL,
    `ditangani_pada`     DATETIME         NULL,
    `ip_hash`            CHAR(64)     NOT NULL,
    `dibuat_pada`        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_pesan_kontak_penangan` FOREIGN KEY (`ditangani_oleh`)
        REFERENCES `pengguna` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX `idx_pesan_kontak_status`   (`status`, `dibuat_pada` DESC),
    INDEX `idx_pesan_kontak_ip_waktu` (`ip_hash`, `dibuat_pada`),
    INDEX `idx_pesan_kontak_email`    (`email`)
) ENGINE = InnoDB;


-- -----------------------------------------------------------------------------
-- 42. log_pencarian
-- -----------------------------------------------------------------------------
CREATE TABLE `log_pencarian` (
    `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `kata_kunci`   VARCHAR(255)     NULL,
    `filter`       JSON             NULL,
    `jumlah_hasil` INT UNSIGNED NOT NULL DEFAULT 0,
    `pengguna_id`  BIGINT UNSIGNED  NULL,
    `ip_hash`      CHAR(64)         NULL,
    `dibuat_pada`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_log_pencarian_pengguna` FOREIGN KEY (`pengguna_id`)
        REFERENCES `pengguna` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX `idx_log_pencarian_kata`  (`kata_kunci`, `dibuat_pada`),
    INDEX `idx_log_pencarian_waktu` (`dibuat_pada`)
) ENGINE = InnoDB COMMENT = 'Retensi 12 bulan; diringkas menjadi kata kunci populer';


-- -----------------------------------------------------------------------------
-- 43. pengaturan — konfigurasi sistem kunci-nilai bertipe
-- -----------------------------------------------------------------------------
CREATE TABLE `pengaturan` (
    `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `kunci`            VARCHAR(100) NOT NULL,
    `nilai`            TEXT             NULL,
    `tipe`             ENUM('teks','angka','boolean','json','berkas','teks_panjang')
                                    NOT NULL DEFAULT 'teks',
    `grup`             VARCHAR(40)  NOT NULL DEFAULT 'umum',
    `label`            VARCHAR(150) NOT NULL,
    `deskripsi`        VARCHAR(255)     NULL,
    `is_publik`        BOOLEAN      NOT NULL DEFAULT FALSE,
    `is_terenkripsi`   BOOLEAN      NOT NULL DEFAULT FALSE,
    `urutan`           SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    `diperbarui_oleh`  BIGINT UNSIGNED  NULL,
    `diperbarui_pada`  DATETIME         NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `uq_pengaturan_kunci` UNIQUE (`kunci`),
    CONSTRAINT `fk_pengaturan_pengubah` FOREIGN KEY (`diperbarui_oleh`)
        REFERENCES `pengguna` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX `idx_pengaturan_grup` (`grup`, `urutan`)
) ENGINE = InnoDB;


-- -----------------------------------------------------------------------------
-- 44. log_aktivitas — jejak audit (tanpa UPDATE/DELETE melalui aplikasi)
--     Kandidat partisi RANGE bulanan bila > 10 juta baris
-- -----------------------------------------------------------------------------
CREATE TABLE `log_aktivitas` (
    `id`             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `pengguna_id`    BIGINT UNSIGNED  NULL,
    `pelaku_nama`    VARCHAR(150)     NULL COMMENT 'cuplikan historis',
    `peran_saat_itu` VARCHAR(40)      NULL COMMENT 'cuplikan historis',
    `aksi`           VARCHAR(50)  NOT NULL,
    `entitas`        VARCHAR(60)  NOT NULL,
    `entitas_id`     BIGINT UNSIGNED  NULL,
    `deskripsi`      VARCHAR(500)     NULL,
    `data_lama`      JSON             NULL COMMENT 'kolom sensitif disamarkan',
    `data_baru`      JSON             NULL COMMENT 'kolom sensitif disamarkan',
    `ip_hash`        CHAR(64)         NULL,
    `agen_ringkas`   VARCHAR(150)     NULL,
    `dibuat_pada`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_log_aktivitas_pengguna` FOREIGN KEY (`pengguna_id`)
        REFERENCES `pengguna` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX `idx_log_aktivitas_entitas` (`entitas`, `entitas_id`, `dibuat_pada` DESC),
    INDEX `idx_log_aktivitas_pelaku`  (`pengguna_id`, `dibuat_pada` DESC),
    INDEX `idx_log_aktivitas_aksi`    (`aksi`, `dibuat_pada` DESC),
    INDEX `idx_log_aktivitas_waktu`   (`dibuat_pada`)
) ENGINE = InnoDB;


-- -----------------------------------------------------------------------------
-- 45. log_autentikasi
-- -----------------------------------------------------------------------------
CREATE TABLE `log_autentikasi` (
    `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `pengguna_id`  BIGINT UNSIGNED  NULL,
    `email_dicoba` VARCHAR(190)     NULL,
    `aksi`         ENUM('login_berhasil','login_gagal','logout','terkunci',
                        'reset_diminta','reset_berhasil','2fa_gagal','2fa_berhasil')
                                NOT NULL,
    `keterangan`   VARCHAR(255)     NULL,
    `ip_hash`      CHAR(64)     NOT NULL,
    `agen_ringkas` VARCHAR(150)     NULL,
    `dibuat_pada`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_log_autentikasi_pengguna` FOREIGN KEY (`pengguna_id`)
        REFERENCES `pengguna` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX `idx_log_autentikasi_email` (`email_dicoba`, `dibuat_pada`),
    INDEX `idx_log_autentikasi_ip`    (`ip_hash`, `dibuat_pada`),
    INDEX `idx_log_autentikasi_aksi`  (`aksi`, `dibuat_pada` DESC)
) ENGINE = InnoDB;


-- -----------------------------------------------------------------------------
-- 46. notifikasi
-- -----------------------------------------------------------------------------
CREATE TABLE `notifikasi` (
    `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `pengguna_id` BIGINT UNSIGNED NOT NULL,
    `tipe`        VARCHAR(50)  NOT NULL,
    `judul`       VARCHAR(200) NOT NULL,
    `pesan`       VARCHAR(500) NOT NULL,
    `tautan`      VARCHAR(500)     NULL,
    `entitas`     VARCHAR(60)      NULL,
    `entitas_id`  BIGINT UNSIGNED  NULL,
    `dibaca_pada` DATETIME         NULL,
    `dibuat_pada` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_notifikasi_pengguna` FOREIGN KEY (`pengguna_id`)
        REFERENCES `pengguna` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX `idx_notifikasi_penerima` (`pengguna_id`, `dibaca_pada`, `dibuat_pada` DESC)
) ENGINE = InnoDB;


-- =============================================================================
--  SUBSISTEM 7 — LAYANAN HUKUM (OPSIONAL, FASE 3)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 47. layanan_hukum
-- -----------------------------------------------------------------------------
CREATE TABLE `layanan_hukum` (
    `id`                       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `kode`                     VARCHAR(30)  NOT NULL,
    `nama`                     VARCHAR(150) NOT NULL,
    `deskripsi`                TEXT             NULL,
    `sla_hari`                 SMALLINT UNSIGNED NOT NULL DEFAULT 14,
    `definisi_formulir`        JSON             NULL,
    `unit_penanggung_jawab_id` BIGINT UNSIGNED  NULL,
    `is_aktif`                 BOOLEAN      NOT NULL DEFAULT TRUE,
    `urutan`                   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    `dibuat_pada`              DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `diperbarui_pada`          DATETIME         NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `uq_layanan_hukum_kode` UNIQUE (`kode`),
    CONSTRAINT `fk_layanan_hukum_unit` FOREIGN KEY (`unit_penanggung_jawab_id`)
        REFERENCES `unit_kerja` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `ck_layanan_hukum_sla` CHECK (`sla_hari` BETWEEN 1 AND 365)
) ENGINE = InnoDB;


-- -----------------------------------------------------------------------------
-- 48. permintaan_layanan
-- -----------------------------------------------------------------------------
CREATE TABLE `permintaan_layanan` (
    `id`                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `nomor_tiket`        VARCHAR(30)  NOT NULL COMMENT 'LYN-2026-000045',
    `layanan_hukum_id`   BIGINT UNSIGNED NOT NULL,
    `pemohon_id`         BIGINT UNSIGNED NOT NULL,
    `unit_kerja_id`      BIGINT UNSIGNED NOT NULL,
    `judul`              VARCHAR(255) NOT NULL,
    `uraian`             TEXT         NOT NULL,
    `data_formulir`      JSON             NULL,
    `status`             ENUM('baru','ditelaah','butuh_info','selesai','ditolak','dibatalkan')
                                      NOT NULL DEFAULT 'baru',
    `prioritas`          ENUM('rendah','normal','tinggi','segera')
                                      NOT NULL DEFAULT 'normal',
    `ditugaskan_ke`      BIGINT UNSIGNED  NULL,
    `tenggat`            DATE             NULL,
    `hasil_telaah`       TEXT             NULL,
    `dokumen_hasil_id`   BIGINT UNSIGNED  NULL,
    `diselesaikan_pada`  DATETIME         NULL,
    `dibuat_pada`        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `diperbarui_pada`    DATETIME         NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `uq_permintaan_layanan_tiket` UNIQUE (`nomor_tiket`),
    CONSTRAINT `fk_permintaan_layanan_layanan` FOREIGN KEY (`layanan_hukum_id`)
        REFERENCES `layanan_hukum` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_permintaan_layanan_pemohon` FOREIGN KEY (`pemohon_id`)
        REFERENCES `pengguna` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_permintaan_layanan_unit` FOREIGN KEY (`unit_kerja_id`)
        REFERENCES `unit_kerja` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_permintaan_layanan_penelaah` FOREIGN KEY (`ditugaskan_ke`)
        REFERENCES `pengguna` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_permintaan_layanan_dokumen` FOREIGN KEY (`dokumen_hasil_id`)
        REFERENCES `dokumen` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `ck_permintaan_layanan_selesai`
        CHECK (`status` <> 'selesai' OR `diselesaikan_pada` IS NOT NULL),
    INDEX `idx_permintaan_layanan_status`  (`status`, `tenggat`),
    INDEX `idx_permintaan_layanan_pemohon` (`pemohon_id`, `dibuat_pada` DESC),
    INDEX `idx_permintaan_layanan_penelaah` (`ditugaskan_ke`, `status`)
) ENGINE = InnoDB;


-- -----------------------------------------------------------------------------
-- 49. permintaan_layanan_berkas
-- -----------------------------------------------------------------------------
CREATE TABLE `permintaan_layanan_berkas` (
    `id`                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `permintaan_layanan_id` BIGINT UNSIGNED NOT NULL,
    `jenis`                 ENUM('lampiran_pemohon','hasil_telaah','dokumen_pendukung')
                                         NOT NULL DEFAULT 'lampiran_pemohon',
    `nama_asli`             VARCHAR(255) NOT NULL,
    `path`                  VARCHAR(500) NOT NULL,
    `disk`                  VARCHAR(30)  NOT NULL DEFAULT 'lokal',
    `mime_type`             VARCHAR(100) NOT NULL,
    `ukuran_bytes`          BIGINT UNSIGNED NOT NULL,
    `hash_sha256`           CHAR(64)     NOT NULL,
    `diunggah_oleh`         BIGINT UNSIGNED  NULL,
    `dibuat_pada`           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `uq_permintaan_layanan_berkas_path` UNIQUE (`path`),
    CONSTRAINT `fk_pl_berkas_permintaan` FOREIGN KEY (`permintaan_layanan_id`)
        REFERENCES `permintaan_layanan` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_pl_berkas_pengunggah` FOREIGN KEY (`diunggah_oleh`)
        REFERENCES `pengguna` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `ck_pl_berkas_ukuran` CHECK (`ukuran_bytes` > 0),
    INDEX `idx_pl_berkas_permintaan` (`permintaan_layanan_id`, `jenis`)
) ENGINE = InnoDB;


-- -----------------------------------------------------------------------------
-- 50. permintaan_layanan_log
-- -----------------------------------------------------------------------------
CREATE TABLE `permintaan_layanan_log` (
    `id`                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `permintaan_layanan_id` BIGINT UNSIGNED NOT NULL,
    `status_dari`           VARCHAR(30)      NULL,
    `status_ke`             VARCHAR(30)  NOT NULL,
    `aksi`                  VARCHAR(50)  NOT NULL,
    `catatan`               TEXT             NULL,
    `is_terlihat_pemohon`   BOOLEAN      NOT NULL DEFAULT TRUE,
    `oleh_id`               BIGINT UNSIGNED  NULL,
    `dibuat_pada`           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_pl_log_permintaan` FOREIGN KEY (`permintaan_layanan_id`)
        REFERENCES `permintaan_layanan` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_pl_log_oleh` FOREIGN KEY (`oleh_id`)
        REFERENCES `pengguna` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX `idx_pl_log_permintaan` (`permintaan_layanan_id`, `dibuat_pada` DESC)
) ENGINE = InnoDB;


-- =============================================================================
--  TRIGGER — PENCEGAHAN SIMPUL INDUK MENUNJUK DIRI SENDIRI
-- =============================================================================
--  Catatan penting: MySQL 8.0 DAN MariaDB sama-sama MELARANG kolom
--  AUTO_INCREMENT dirujuk di dalam CHECK constraint (MySQL: "AUTO_INCREMENT
--  columns are not permitted in CHECK constraints"; MariaDB: error 1901).
--  Karena itu aturan "induk_id <> id" TIDAK dapat diwujudkan sebagai CHECK dan
--  diganti dengan trigger di bawah untuk dua tabel hierarki yang menopang
--  penegakan cakupan akses (unit_kerja) dan navigasi katalog (kategori).
--
--  Trigger hanya menangkap referensi diri LANGSUNG (A -> A). Deteksi siklus
--  yang lebih panjang (A -> B -> A) tetap menjadi tanggung jawab lapisan
--  aplikasi, yang juga memelihara kolom `jalur` (materialized path) dan karena
--  itu harus menelusuri rantai induk pada setiap perubahan `induk_id`.
--  Untuk `halaman` dan `menu_item`, validasi sepenuhnya di lapisan aplikasi
--  karena dampak siklus di sana hanya berupa kegagalan perenderan navigasi.
-- =============================================================================

DELIMITER $$

CREATE TRIGGER `trg_unit_kerja_induk_bi` BEFORE INSERT ON `unit_kerja`
FOR EACH ROW
BEGIN
    IF NEW.`induk_id` IS NOT NULL AND NEW.`induk_id` = NEW.`id` THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Unit kerja tidak boleh menjadi induk bagi dirinya sendiri.';
    END IF;
END$$

CREATE TRIGGER `trg_unit_kerja_induk_bu` BEFORE UPDATE ON `unit_kerja`
FOR EACH ROW
BEGIN
    IF NEW.`induk_id` IS NOT NULL AND NEW.`induk_id` = NEW.`id` THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Unit kerja tidak boleh menjadi induk bagi dirinya sendiri.';
    END IF;
END$$

CREATE TRIGGER `trg_kategori_induk_bi` BEFORE INSERT ON `kategori`
FOR EACH ROW
BEGIN
    IF NEW.`induk_id` IS NOT NULL AND NEW.`induk_id` = NEW.`id` THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Kategori tidak boleh menjadi induk bagi dirinya sendiri.';
    END IF;
END$$

CREATE TRIGGER `trg_kategori_induk_bu` BEFORE UPDATE ON `kategori`
FOR EACH ROW
BEGIN
    IF NEW.`induk_id` IS NOT NULL AND NEW.`induk_id` = NEW.`id` THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Kategori tidak boleh menjadi induk bagi dirinya sendiri.';
    END IF;
END$$

DELIMITER ;


-- =============================================================================
--  TAMPILAN BANTU (VIEW)
-- =============================================================================

-- Dokumen yang tampil pada kanal publik (penegakan BR-09 dan BR-13 di satu tempat)
CREATE OR REPLACE VIEW `v_dokumen_publik` AS
SELECT d.`id`, d.`kode_dokumen`, d.`slug`, d.`judul`, d.`nomor`, d.`nomor_lengkap`,
       d.`tahun`, d.`tanggal_penetapan`, d.`tingkat_akses`, d.`abstrak`,
       d.`jumlah_dilihat`, d.`jumlah_diunduh`, d.`diterbitkan_pada`, d.`is_disorot`,
       jp.`nama` AS `jenis_peraturan`, jp.`bentuk_singkat`,
       uk.`nama` AS `unit_kerja`, uk.`jalur` AS `unit_jalur`,
       sd.`nama` AS `status_keberlakuan`, sd.`warna` AS `status_warna`,
       bh.`nama` AS `bidang_hukum`
FROM `dokumen` d
JOIN `jenis_peraturan` jp ON jp.`id` = d.`jenis_peraturan_id`
JOIN `unit_kerja`      uk ON uk.`id` = d.`unit_kerja_id`
JOIN `status_dokumen`  sd ON sd.`id` = d.`status_dokumen_id`
LEFT JOIN `bidang_hukum` bh ON bh.`id` = d.`bidang_hukum_id`
WHERE d.`status_publikasi` = 'terbit'
  AND d.`tingkat_akses` <> 'rahasia'
  AND d.`dihapus_pada` IS NULL;


-- Relasi antarperaturan dua arah (arah aktif + arah pasif diturunkan)
CREATE OR REPLACE VIEW `v_dokumen_relasi_dua_arah` AS
SELECT dr.`dokumen_id`               AS `dokumen_id`,
       dr.`dokumen_terkait_id`       AS `dokumen_lain_id`,
       jr.`nama`                     AS `label_relasi`,
       jr.`urutan`                   AS `urutan`,
       'aktif'                       AS `arah`,
       dr.`keterangan`
FROM `dokumen_relasi` dr
JOIN `jenis_relasi` jr ON jr.`id` = dr.`jenis_relasi_id`
UNION ALL
SELECT dr.`dokumen_terkait_id`       AS `dokumen_id`,
       dr.`dokumen_id`               AS `dokumen_lain_id`,
       jr.`nama_kebalikan`           AS `label_relasi`,
       jr.`urutan`                   AS `urutan`,
       'pasif'                       AS `arah`,
       dr.`keterangan`
FROM `dokumen_relasi` dr
JOIN `jenis_relasi` jr ON jr.`id` = dr.`jenis_relasi_id`
WHERE jr.`is_simetris` = FALSE;


-- Rekapitulasi dokumen per unit kerja (untuk dasbor dan laporan)
CREATE OR REPLACE VIEW `v_rekap_dokumen_unit` AS
SELECT uk.`id`   AS `unit_kerja_id`,
       uk.`nama` AS `unit_kerja`,
       uk.`jalur`,
       COUNT(d.`id`)                                                    AS `total`,
       SUM(d.`status_publikasi` = 'terbit')                             AS `terbit`,
       SUM(d.`status_publikasi` = 'draf')                               AS `draf`,
       SUM(d.`status_publikasi` = 'diajukan')                           AS `menunggu_verifikasi`,
       SUM(d.`status_publikasi` = 'revisi')                             AS `perlu_revisi`,
       SUM(d.`tingkat_akses`    = 'publik'  AND d.`status_publikasi` = 'terbit') AS `publik`,
       SUM(d.`jumlah_diunduh`)                                          AS `total_unduhan`
FROM `unit_kerja` uk
LEFT JOIN `dokumen` d ON d.`unit_kerja_id` = uk.`id` AND d.`dihapus_pada` IS NULL
GROUP BY uk.`id`, uk.`nama`, uk.`jalur`;


-- =============================================================================
--  CATATAN IMPLEMENTASI LANJUTAN
-- =============================================================================
--  1. Partisi tabel `unduhan` dan `log_aktivitas` diterapkan hanya bila volume
--     melampaui ambang pada docs/04 § D.7.2. MySQL tidak mendukung FOREIGN KEY
--     pada tabel terpartisi — FK pada tabel tersebut harus DIHAPUS terlebih
--     dahulu dan integritasnya berpindah ke lapisan aplikasi. Pertimbangkan
--     PostgreSQL bila partisi diperlukan sejak awal (docs/04 § D.7.3).
--
--  2. Keunikan nomor peraturan tingkat institusi (BR-02) tidak sepenuhnya dapat
--     ditegakkan di MySQL karena tidak tersedia partial unique index. Penegakan
--     tambahan WAJIB ada di lapisan aplikasi untuk jenis peraturan dengan
--     lingkup_penomoran = 'institut'.
--
--  3. Kolom `subjek_id` pada `dokumen_akses` dan `target_id` pada `menu_item`
--     bersifat polimorfik tanpa FK. Sediakan tugas terjadwal mingguan untuk
--     memeriksa integritasnya (docs/08 § H.5).
--
--  4. Aktifkan binary log untuk pemulihan titik waktu (RPO <= 1 jam).
--
--  5. Nilai yang dianjurkan pada my.cnf produksi (RAM 8 GB):
--       innodb_buffer_pool_size      = 3G
--       innodb_log_file_size         = 512M
--       innodb_flush_log_at_trx_commit= 1
--       max_connections              = 200
--       slow_query_log               = ON
--       long_query_time              = 2
--       ft_min_word_len / innodb_ft_min_token_size = 2
-- =============================================================================

SET SQL_MODE = @OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS = 1;

-- Selesai. Jalankan jdih_ith_seed.sql untuk memuat data referensi awal.
