-- Revisi 2026-10-25: DRAF/REVISI milik Superadmin dapat disetujui langsung.
-- Peran, kepemilikan, kelengkapan, izin dan checksum tetap diperiksa service.
-- Jalankan pada database V2 yang dipilih operator; tidak mengubah riwayat/data.
SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;
ALTER TABLE dokumen_workflow
  DROP CHECK ck_workflow_transition,
  ADD CONSTRAINT ck_workflow_transition CHECK (
    (action = 'CREATE' AND status_asal IS NULL AND status_tujuan = 'DRAF') OR
    (status_asal IS NOT NULL AND (
      (action = 'SUBMIT' AND status_asal IN ('DRAF','REVISI') AND status_tujuan = 'DIAJUKAN') OR
      (action = 'RETURN' AND status_asal = 'DIAJUKAN' AND status_tujuan = 'REVISI') OR
      (action = 'APPROVE' AND status_asal IN ('DRAF','REVISI','DIAJUKAN') AND status_tujuan = 'DISETUJUI') OR
      (action = 'PUBLISH' AND status_asal = 'DISETUJUI' AND status_tujuan = 'TERBIT') OR
      (action = 'WITHDRAW' AND status_asal = 'TERBIT' AND status_tujuan = 'DITARIK')
    ))
  );
INSERT INTO audit_log(actor_id,module,action,entity_type,entity_id,after_json,request_id)
SELECT NULL,'database','SCHEMA_UPDATE','schema',NULL,
  JSON_OBJECT('patch','020-superadmin-persetujuan-langsung','rule','SUPERADMIN own DRAF/REVISI -> DISETUJUI'),UUID()
WHERE NOT EXISTS (
  SELECT 1 FROM audit_log WHERE module='database' AND action='SCHEMA_UPDATE'
    AND JSON_UNQUOTE(JSON_EXTRACT(after_json,'$.patch'))='020-superadmin-persetujuan-langsung'
);
