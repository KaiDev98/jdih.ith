-- Patch untuk DB V2 yang sudah berjalan: password lokal opsional untuk akun
-- Admin/Superadmin (di samping login Google). Disimpan sebagai hash scrypt.
SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;
SET time_zone = '+00:00';
USE jdih_ith_v2_dev;

ALTER TABLE pengguna
  ADD COLUMN password_hash VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NULL
    COMMENT 'scrypt; hanya Admin/Superadmin, opsional di samping login Google' AFTER avatar_url,
  ADD COLUMN password_diubah_at DATETIME(6) NULL AFTER password_hash;
