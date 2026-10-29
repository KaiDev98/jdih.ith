-- Pembaruan kategori SOP dan unit kerja, 2026-10-21.
-- Nama LPPM berubah; ID/kode lama dipertahankan agar akun/dokumen tetap terhubung.
-- Lab, Senat, Komisi Kemahasiswaan ditambahkan tanpa menghapus Komisi Etik.
-- Hanya database development V2. Idempoten, seluruh perubahan diaudit.
SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;
SET time_zone = '+00:00';
USE jdih_ith_v2_dev;
START TRANSACTION;

INSERT INTO audit_log (actor_id,module,action,entity_type,entity_id,before_json,after_json,request_id)
SELECT NULL,'master','UPDATE','kategori',id,JSON_OBJECT('nama',nama),
       JSON_OBJECT('nama','LPPM-PM','kode',kode),UUID()
FROM kategori WHERE kode='SOP-LPPM' AND nama<>'LPPM-PM';
UPDATE kategori SET nama='LPPM-PM' WHERE kode='SOP-LPPM' AND nama<>'LPPM-PM';

INSERT INTO audit_log (actor_id,module,action,entity_type,entity_id,before_json,after_json,request_id)
SELECT NULL,'master','UPDATE','unit_kerja',id,JSON_OBJECT('nama',nama),
       JSON_OBJECT('nama','LPPM-PM','kode',kode),UUID()
FROM unit_kerja WHERE kode='SOP-LPPM' AND nama<>'LPPM-PM';
UPDATE unit_kerja SET nama='LPPM-PM' WHERE kode='SOP-LPPM' AND nama<>'LPPM-PM';

INSERT INTO kategori (kode,nama)
SELECT 'SOP-LAB','Lab' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM kategori WHERE kode='SOP-LAB' OR nama='Lab');
SET @patch016_created=ROW_COUNT();
INSERT INTO audit_log (actor_id,module,action,entity_type,entity_id,before_json,after_json,request_id)
SELECT NULL,'master','CREATE','kategori',id,NULL,JSON_OBJECT('kode',kode,'nama',nama),UUID()
FROM kategori WHERE kode='SOP-LAB' AND @patch016_created=1;

INSERT INTO unit_kerja (kode,nama,aktif)
SELECT k.kode,k.nama,k.aktif FROM kategori k
WHERE (k.kode='SOP-LAB' OR k.nama='Lab')
  AND NOT EXISTS (SELECT 1 FROM unit_kerja u WHERE u.kode=k.kode OR u.nama=k.nama);
SET @patch016_created=ROW_COUNT();
INSERT INTO audit_log (actor_id,module,action,entity_type,entity_id,before_json,after_json,request_id)
SELECT NULL,'master','CREATE','unit_kerja',u.id,NULL,JSON_OBJECT('kode',u.kode,'nama',u.nama),UUID()
FROM unit_kerja u JOIN kategori k ON k.kode=u.kode
WHERE (k.kode='SOP-LAB' OR k.nama='Lab') AND @patch016_created=1;

INSERT INTO kategori (kode,nama)
SELECT 'SOP-SENAT','Senat' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM kategori WHERE kode='SOP-SENAT' OR nama='Senat');
SET @patch016_created=ROW_COUNT();
INSERT INTO audit_log (actor_id,module,action,entity_type,entity_id,before_json,after_json,request_id)
SELECT NULL,'master','CREATE','kategori',id,NULL,JSON_OBJECT('kode',kode,'nama',nama),UUID()
FROM kategori WHERE kode='SOP-SENAT' AND @patch016_created=1;

INSERT INTO unit_kerja (kode,nama,aktif)
SELECT k.kode,k.nama,k.aktif FROM kategori k
WHERE (k.kode='SOP-SENAT' OR k.nama='Senat')
  AND NOT EXISTS (SELECT 1 FROM unit_kerja u WHERE u.kode=k.kode OR u.nama=k.nama);
SET @patch016_created=ROW_COUNT();
INSERT INTO audit_log (actor_id,module,action,entity_type,entity_id,before_json,after_json,request_id)
SELECT NULL,'master','CREATE','unit_kerja',u.id,NULL,JSON_OBJECT('kode',u.kode,'nama',u.nama),UUID()
FROM unit_kerja u JOIN kategori k ON k.kode=u.kode
WHERE (k.kode='SOP-SENAT' OR k.nama='Senat') AND @patch016_created=1;

INSERT INTO kategori (kode,nama)
SELECT 'SOP-KOMISI-KEMAHASISWAAN','Komisi Kemahasiswaan' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM kategori WHERE kode='SOP-KOMISI-KEMAHASISWAAN' OR nama='Komisi Kemahasiswaan');
SET @patch016_created=ROW_COUNT();
INSERT INTO audit_log (actor_id,module,action,entity_type,entity_id,before_json,after_json,request_id)
SELECT NULL,'master','CREATE','kategori',id,NULL,JSON_OBJECT('kode',kode,'nama',nama),UUID()
FROM kategori WHERE kode='SOP-KOMISI-KEMAHASISWAAN' AND @patch016_created=1;

INSERT INTO unit_kerja (kode,nama,aktif)
SELECT k.kode,k.nama,k.aktif FROM kategori k
WHERE (k.kode='SOP-KOMISI-KEMAHASISWAAN' OR k.nama='Komisi Kemahasiswaan')
  AND NOT EXISTS (SELECT 1 FROM unit_kerja u WHERE u.kode=k.kode OR u.nama=k.nama);
SET @patch016_created=ROW_COUNT();
INSERT INTO audit_log (actor_id,module,action,entity_type,entity_id,before_json,after_json,request_id)
SELECT NULL,'master','CREATE','unit_kerja',u.id,NULL,JSON_OBJECT('kode',u.kode,'nama',u.nama),UUID()
FROM unit_kerja u JOIN kategori k ON k.kode=u.kode
WHERE (k.kode='SOP-KOMISI-KEMAHASISWAAN' OR k.nama='Komisi Kemahasiswaan') AND @patch016_created=1;

COMMIT;
