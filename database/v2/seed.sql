-- V2 master data only. No account, password, or Google identity is provisioned.
-- Run after schema.sql, only in the isolated Compose V2 database.
SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;
SET time_zone = '+00:00';
USE jdih_ith_v2_dev;
START TRANSACTION;

INSERT INTO peran (kode, nama) VALUES
  ('SUPERADMIN', 'Superadmin'), ('ADMIN', 'Admin'), ('DOSEN_STAF', 'Dosen/Staf') AS incoming
ON DUPLICATE KEY UPDATE nama = incoming.nama;

-- PENGUNJUNG is virtual, never assigned to an account.
-- No create/promote Admin or arbitrary role-management permission.
INSERT INTO izin (kode, nama, modul) VALUES
  ('documents.read_admin', 'Melihat dokumen administratif', 'documents'),
  ('documents.create', 'Membuat dokumen dan draf', 'documents'),
  ('documents.edit', 'Mengubah draf dan metadata', 'documents'),
  ('documents.upload', 'Mengunggah file dan lampiran', 'documents'),
  ('documents.revise', 'Membuat revisi baru', 'documents'),
  ('workflow.submit', 'Mengajukan versi', 'workflow'),
  ('workflow.return', 'Mengembalikan dengan catatan revisi', 'workflow'),
  ('workflow.approve', 'Menyetujui versi pihak lain', 'workflow'),
  ('workflow.publish', 'Menerbitkan dan mengonfirmasi dampak hukum', 'workflow'),
  ('workflow.withdraw', 'Menarik publikasi dengan alasan', 'workflow'),
  ('legal.manage_relations', 'Mengelola relasi pada draf', 'legal-relations'),
  ('legal.correct_status', 'Koreksi status hukum dengan audit', 'legal-relations'),
  ('users.read', 'Melihat akun dan antrean verifikasi', 'users'),
  ('users.approve', 'Menyetujui pendaftaran Dosen/Staf', 'users'),
  ('users.reject', 'Menolak pendaftaran dengan alasan', 'users'),
  ('users.set_status', 'Mengelola status akun', 'users'),
  ('units.manage', 'Mengelola unit dan resolusi unit manual', 'units'),
  ('master.manage', 'Mengelola jenis kategori dan tag', 'master'),
  ('secret.manage', 'Mengelola grant Rahasia', 'secret-access'),
  ('secret.read_admin', 'Akses Rahasia untuk administrasi', 'secret-access'),
  ('templates.manage', 'Mengelola versi Format Persuratan', 'letter-templates'),
  ('dashboard.read', 'Melihat dashboard administratif', 'dashboard'),
  ('audit.read', 'Melihat audit sesuai kewenangan', 'audit') AS incoming
ON DUPLICATE KEY UPDATE nama = incoming.nama, modul = incoming.modul;

-- Provision minimum ordinary Admin permissions. Verification remains additional.
INSERT INTO peran_izin (peran_id, izin_id)
SELECT p.id, i.id FROM peran p CROSS JOIN izin i
WHERE p.kode = 'ADMIN' AND i.kode IN (
  'documents.read_admin', 'documents.create', 'documents.edit', 'documents.upload',
  'documents.revise', 'workflow.submit', 'legal.manage_relations',
  'users.read', 'users.approve', 'users.reject', 'users.set_status',
  'units.manage', 'master.manage', 'secret.manage', 'secret.read_admin',
  'templates.manage', 'dashboard.read', 'audit.read'
)
ON DUPLICATE KEY UPDATE izin_id = peran_izin.izin_id;

INSERT INTO peran_izin (peran_id, izin_id)
SELECT p.id, i.id FROM peran p CROSS JOIN izin i WHERE p.kode = 'SUPERADMIN'
ON DUPLICATE KEY UPDATE izin_id = peran_izin.izin_id;

-- DOSEN_STAF access depends on active account + document policy, not a global
-- secret permission. Admin verifier permissions can be explicitly provisioned
-- through pengguna_izin by operations; no separate VERIFIER role is created.

INSERT INTO jenis_dokumen (kode, nama, urutan) VALUES
  ('PERREK', 'Peraturan Rektor', 1),
  ('SKREK', 'SK Rektor', 2),
  ('INSREK', 'Instruksi Rektor', 3),
  ('SEREK', 'Surat Edaran Rektor', 4),
  ('SOP', 'SOP', 5) AS incoming
ON DUPLICATE KEY UPDATE nama = incoming.nama, urutan = incoming.urutan;

INSERT INTO kategori (kode, nama) VALUES
  ('SOP-SAINS', 'Jurusan Sains'),
  ('SOP-TPI', 'Jurusan TPI'),
  ('SOP-PERPUSTAKAAN', 'Perpustakaan'),
  ('SOP-TIK', 'TIK'),
  ('SOP-AKADEMIK', 'Akademik & Kemahasiswaan'),
  ('SOP-BMN', 'BMN'),
  ('SOP-KEPEGAWAIAN', 'Kepegawaian'),
  ('SOP-KEUANGAN', 'Keuangan'),
  ('SOP-LPPM', 'LPPM') AS incoming
ON DUPLICATE KEY UPDATE nama = incoming.nama;

COMMIT;
