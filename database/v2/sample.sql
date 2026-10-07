-- DEVELOPMENT FIXTURES ONLY. Run once after seed.sql; no REPLACE/IGNORE/upsert.
-- example.invalid identities and fixture:* Google subjects are deliberately
-- not usable Google accounts. No real personal data or application password.
-- File keys/checksums are illustrative metadata; no real PDF/DOCX is installed.
SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;
SET time_zone = '+00:00';
USE jdih_ith_v2_dev;
START TRANSACTION;

INSERT INTO unit_kerja (id, kode, nama) VALUES
  (9001, 'DEMO-A', 'Unit Simulasi A'), (9002, 'DEMO-B', 'Unit Simulasi B');

INSERT INTO pengguna (id, google_sub, email, nama, unit_kerja_id, status, verified_at) VALUES
  (9001, 'fixture:author', 'author@example.invalid', 'Akun Simulasi Penginput', 9001, 'AKTIF', '2026-01-01'),
  (9002, 'fixture:verifier', 'verifier@example.invalid', 'Akun Simulasi Verifikator', 9001, 'AKTIF', '2026-01-01'),
  (9003, 'fixture:staff', 'staff@example.invalid', 'Akun Simulasi Staf Lintas Unit', 9002, 'AKTIF', '2026-01-01'),
  (9004, 'fixture:pending', 'pending@example.invalid', 'Akun Simulasi Menunggu', 9002, 'MENUNGGU_VERIFIKASI', NULL);

UPDATE pengguna SET verified_by = 9002 WHERE id IN (9001,9003);
INSERT INTO pengguna_peran (pengguna_id, peran_id)
SELECT 9001, id FROM peran WHERE kode = 'ADMIN';
INSERT INTO pengguna_peran (pengguna_id, peran_id)
SELECT 9002, id FROM peran WHERE kode = 'SUPERADMIN';
INSERT INTO pengguna_peran (pengguna_id, peran_id)
SELECT u.id, p.id FROM pengguna u CROSS JOIN peran p
WHERE u.id IN (9003,9004) AND p.kode = 'DOSEN_STAF';

INSERT INTO tag (id, nama) VALUES (9001, 'simulasi'), (9002, 'phase-1');
INSERT INTO dokumen (id, kode_dokumen, slug, jenis_dokumen_id, created_by)
SELECT 901, 'DEMO-PUB', 'simulasi-publik', id, 9001 FROM jenis_dokumen WHERE kode = 'PERREK';
INSERT INTO dokumen (id, kode_dokumen, slug, jenis_dokumen_id, created_by)
SELECT 902, 'DEMO-INT', 'simulasi-internal', id, 9001 FROM jenis_dokumen WHERE kode = 'SOP';
INSERT INTO dokumen (id, kode_dokumen, slug, jenis_dokumen_id, created_by)
SELECT 903, 'DEMO-INT2', 'simulasi-internal-2', id, 9001 FROM jenis_dokumen WHERE kode = 'SKREK';
INSERT INTO dokumen (id, kode_dokumen, slug, jenis_dokumen_id, created_by)
SELECT 904, 'DEMO-HISTORY', 'simulasi-riwayat', id, 9001 FROM jenis_dokumen WHERE kode = 'SEREK';

INSERT INTO dokumen_versi
  (id, dokumen_id, nomor_versi, status_workflow, tingkat_akses, nomor, tahun, judul,
   pic, tanggal_penetapan, unit_kerja_id, created_by, verified_by, approved_at, published_by, published_at, superseded_at)
VALUES
  (9011,901,1,'TERBIT','publik','DEMO-01',2026,'Contoh Publik: versi lama tetap aktif','Bagian Hukum ITH','2026-01-01',9001,9001,9002,'2026-01-02',9002,'2026-01-03',NULL),
  (9021,902,1,'TERBIT','internal','DEMO-02',2026,'Contoh Internal: semua staf aktif','Bagian Hukum ITH','2026-01-01',9001,9001,9002,'2026-01-02',9002,'2026-01-03',NULL),
  (9031,903,1,'TERBIT','internal','DEMO-03',2026,'Contoh Internal kedua: hanya staf aktif','Penanggung Jawab Arsip ITH','2026-01-01',9001,9001,9002,'2026-01-02',9002,'2026-01-03',NULL),
  (9041,904,1,'TERBIT','publik','DEMO-04',2026,'Contoh Riwayat: versi superseded','Sekretariat Rektor','2026-01-01',9001,9001,9002,'2026-01-02',9002,'2026-01-03','2026-02-03'),
  (9042,904,2,'TERBIT','publik','DEMO-04',2026,'Contoh Riwayat: versi publik terkini','Koordinator Hukum','2026-02-01',9001,9001,9002,'2026-02-02',9002,'2026-02-03',NULL);

INSERT INTO dokumen_versi
  (id, dokumen_id, nomor_versi, status_workflow, tingkat_akses, nomor, tahun, judul, pic, tanggal_penetapan, unit_kerja_id, created_by)
VALUES
  (9012,901,2,'DRAF','publik','DEMO-01',2026,'Contoh Publik: revisi belum mengganti versi 1',NULL,NULL,9001,9001);

UPDATE dokumen_versi
SET created_at = CASE id WHEN 9042 THEN '2026-02-01' WHEN 9012 THEN '2026-01-04' ELSE '2026-01-01' END,
    updated_at = CASE id WHEN 9041 THEN '2026-02-03' WHEN 9042 THEN '2026-02-03' WHEN 9012 THEN '2026-01-04' ELSE '2026-01-03' END
WHERE dokumen_id IN (901,902,903,904);

UPDATE dokumen SET current_published_version_id = 9011 WHERE id = 901;
UPDATE dokumen SET current_published_version_id = 9021 WHERE id = 902;
UPDATE dokumen SET current_published_version_id = 9031 WHERE id = 903;
UPDATE dokumen SET current_published_version_id = 9042 WHERE id = 904;

INSERT INTO dokumen_berkas
  (dokumen_versi_id, jenis_berkas, storage_key, nama_asli, mime_type, size_bytes, checksum, urutan)
SELECT id, 'UTAMA', CONCAT('fixtures/documents/', id, '/utama.pdf'),
  'simulasi-utama.pdf', 'application/pdf', 6, UNHEX(SHA2('sample',256)), 0
FROM dokumen_versi WHERE dokumen_id IN (901,902,903,904);
INSERT INTO dokumen_berkas
  (dokumen_versi_id, jenis_berkas, storage_key, nama_asli, mime_type, size_bytes, checksum, urutan)
VALUES
  (9011,'LAMPIRAN','fixtures/documents/9011/lampiran-1.pdf','lampiran-1.pdf','application/pdf',6,UNHEX(SHA2('sample',256)),1),
  (9011,'LAMPIRAN','fixtures/documents/9011/lampiran-2.pdf','lampiran-2.pdf','application/pdf',6,UNHEX(SHA2('sample',256)),2);

INSERT INTO dokumen_versi_kategori (dokumen_versi_id, kategori_id)
SELECT 9021, id FROM kategori WHERE kode = 'SOP-KEUANGAN';
INSERT INTO dokumen_versi_tag (dokumen_versi_id, tag_id)
SELECT id, 9001 FROM dokumen_versi WHERE dokumen_id IN (901,902,903,904);

-- Draf 9012 sengaja belum memiliki PIC/tanggal: valid sebagai draf, tidak siap publish.
-- PIC v1/v2 dokumen 904 berbeda; nilai bebas, tidak menunjuk user/unit.

-- Draft relation has NO side effect: target 902 stays BERLAKU.
INSERT INTO dokumen_relasi (source_version_id, target_document_id, jenis_relasi, catatan)
VALUES (9012,902,'MENGUBAH','Simulasi usulan; belum dikonfirmasi atau diterbitkan');

INSERT INTO dokumen_workflow (dokumen_versi_id,status_asal,status_tujuan,action,actor_id,created_at)
SELECT id,NULL,'DRAF','CREATE',9001,created_at FROM dokumen_versi WHERE id IN (9011,9021,9031,9041,9042,9012);
INSERT INTO dokumen_workflow (dokumen_versi_id,status_asal,status_tujuan,action,actor_id,created_at)
SELECT id,'DRAF','DIAJUKAN','SUBMIT',9001,created_at + INTERVAL 12 HOUR FROM dokumen_versi WHERE id IN (9011,9021,9031,9041,9042);
INSERT INTO dokumen_workflow (dokumen_versi_id,status_asal,status_tujuan,action,actor_id,created_at)
SELECT id,'DIAJUKAN','DISETUJUI','APPROVE',9002,approved_at FROM dokumen_versi WHERE id IN (9011,9021,9031,9041,9042);
INSERT INTO dokumen_workflow (dokumen_versi_id,status_asal,status_tujuan,action,actor_id,created_at)
SELECT id,'DISETUJUI','TERBIT','PUBLISH',9002,published_at FROM dokumen_versi WHERE id IN (9011,9021,9031,9041,9042);

INSERT INTO dokumen_status_hukum_riwayat
  (dokumen_id,status_asal,status_tujuan,alasan,actor_id,confirmed_at)
SELECT id,NULL,'BERLAKU','Status awal fixture simulasi',9002,'2026-01-03'
FROM dokumen WHERE id IN (901,902,903,904);

INSERT INTO template_surat (id,slug,nama,created_by) VALUES
  (951,'simulasi-template-publik','Surat Tugas (Simulasi)',9001),
  (952,'simulasi-template-internal','Surat Undangan (Simulasi)',9001);
INSERT INTO template_surat_versi
  (id,template_surat_id,nomor_versi,tingkat_akses,status,storage_key,nama_asli,mime_type,size_bytes,checksum,created_by,activated_at,archived_at)
VALUES
  (9511,951,1,'PUBLIK','ARCHIVED','fixtures/templates/951/v1.docx','simulasi-v1.docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document',6,UNHEX(SHA2('sample',256)),9001,'2026-01-01','2026-02-01'),
  (9512,951,2,'PUBLIK','ACTIVE','fixtures/templates/951/v2.docx','simulasi-v2.docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document',6,UNHEX(SHA2('sample',256)),9001,'2026-02-01',NULL),
  (9521,952,1,'INTERNAL','ACTIVE','fixtures/templates/952/v1.docx','simulasi-internal.docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document',6,UNHEX(SHA2('sample',256)),9001,'2026-01-01',NULL);
UPDATE template_surat SET current_version_id = 9512 WHERE id = 951;
UPDATE template_surat SET current_version_id = 9521 WHERE id = 952;

INSERT INTO sesi_pengguna (pengguna_id,token_hash,expires_at)
VALUES (9003,UNHEX(SHA2('fixture-token-not-for-login',256)),UTC_TIMESTAMP(6) + INTERVAL 1 DAY);
INSERT INTO audit_log (actor_id,module,action,entity_type,entity_id,before_json,after_json,request_id)
VALUES (NULL,'development','LOAD_SAMPLE','fixture',NULL,NULL,
  JSON_OBJECT('synthetic',TRUE,'scope','Phase 1 isolated V2 database'),'phase1-sample');

COMMIT;
