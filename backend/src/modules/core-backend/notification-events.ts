import type { PenggunaAktif } from '@jdih/shared';

/** Proyeksi aman untuk inbox, bukan akses baca ke endpoint/isi mentah audit. */
export function notificationEventScope(actor: PenggunaAktif) {
  const superadmin = actor.peran.includes('SUPERADMIN');
  const branches: string[] = [];
  const values: string[] = [];
  const select = (
    jenis: string,
    resource: string,
    request: string,
    document: string,
    version: string,
    title: string,
    action: string,
    note: string,
    from: string,
    where: string,
    params: string[] = [],
  ) => {
    branches.push(`SELECT CAST(a.id AS CHAR) id,'${jenis}' jenis,CAST(${resource} AS CHAR) resourceId,
      CAST(${request} AS CHAR) requestId,CAST(${document} AS CHAR) dokumenId,CAST(${version} AS CHAR) versionId,
      ${title} judul,${action} action,${note} catatan,CAST(a.created_at AS CHAR) createdAt
      FROM audit_log a ${from} WHERE ${where}`);
    values.push(...params);
  };
  const templateJoin =
    'JOIN template_surat_versi v ON v.id=a.entity_id JOIN template_surat t ON t.id=v.template_surat_id';
  if (superadmin && actor.izin.includes('templates.manage')) {
    select(
      'TEMPLATE',
      't.id',
      'NULL',
      'NULL',
      'v.id',
      't.nama',
      "'TEMPLATE_SUBMIT'",
      'NULL',
      templateJoin,
      "a.module='letter-templates' AND a.entity_type='template_surat_versi' AND a.action='CREATE_VERSION' AND t.deleted_at IS NULL AND v.status='PENDING_REVIEW'",
    );
  } else if (!superadmin) {
    select(
      'TEMPLATE',
      't.id',
      'NULL',
      'NULL',
      'v.id',
      't.nama',
      "CASE a.action WHEN 'APPROVE_VERSION' THEN 'TEMPLATE_APPROVE' WHEN 'REVOKE' THEN 'TEMPLATE_REVOKE' ELSE 'TEMPLATE_PUBLISH' END",
      "CASE WHEN a.action='REVOKE' THEN JSON_UNQUOTE(JSON_EXTRACT(a.after_json,'$.reason')) ELSE NULL END",
      templateJoin,
      "a.module='letter-templates' AND a.entity_type='template_surat_versi' AND a.action IN ('APPROVE_VERSION','PUBLISH_VERSION','REVOKE') AND t.created_by=? AND a.actor_id<>? AND JSON_EXTRACT(a.after_json,'$.requestId') IS NULL",
      [actor.id, actor.id],
    );
    select(
      'TEMPLATE',
      't.id',
      'NULL',
      'NULL',
      'NULL',
      't.nama',
      "CASE a.action WHEN 'DELETE' THEN 'TEMPLATE_DELETE' ELSE 'TEMPLATE_WITHDRAW' END",
      "JSON_UNQUOTE(JSON_EXTRACT(a.after_json,'$.reason'))",
      'JOIN template_surat t ON t.id=a.entity_id',
      "a.module='letter-templates' AND a.entity_type='template_surat' AND a.action IN ('DELETE','WITHDRAW') AND t.created_by=? AND a.actor_id<>? AND JSON_EXTRACT(a.after_json,'$.requestId') IS NULL",
      [actor.id, actor.id],
    );
    select(
      'DOCUMENT',
      'd.id',
      'NULL',
      'd.id',
      'v.id',
      'v.judul',
      'a.action',
      "JSON_UNQUOTE(JSON_EXTRACT(a.after_json,'$.reason'))",
      'JOIN dokumen_versi v ON v.id=a.entity_id JOIN dokumen d ON d.id=v.dokumen_id',
      "((a.module='workflow' AND a.action IN ('PUBLISH','WITHDRAW')) OR (a.module='legal-relations' AND a.action='REVOKE')) AND a.entity_type='dokumen_versi' AND d.created_by=? AND a.actor_id<>? AND JSON_EXTRACT(a.after_json,'$.requestId') IS NULL",
      [actor.id, actor.id],
    );
    select(
      'DOCUMENT',
      "CASE WHEN a.action='DELETE_PERMANENT' THEN a.entity_id ELSE JSON_UNQUOTE(JSON_EXTRACT(a.after_json,'$.targetId')) END",
      'NULL',
      'NULL',
      'NULL',
      "COALESCE(JSON_UNQUOTE(JSON_EXTRACT(a.before_json,'$.judul')),'Dokumen dihapus')",
      "CASE WHEN a.action='DELETE_PERMANENT' THEN 'DOCUMENT_DELETE' ELSE 'DOCUMENT_DRAFT_DELETE' END",
      'NULL',
      '',
      "a.module='documents' AND a.action IN ('DELETE_PERMANENT','DELETE_DRAFT') AND JSON_UNQUOTE(JSON_EXTRACT(a.before_json,'$.ownerId'))=? AND a.actor_id<>? AND JSON_EXTRACT(a.after_json,'$.requestId') IS NULL",
      [actor.id, actor.id],
    );
  }
  if (superadmin) {
    const template = actor.izin.includes('templates.manage') ? '1' : '0';
    const withdraw = actor.izin.includes('workflow.withdraw') ? '1' : '0';
    const remove = actor.izin.includes('documents.delete') ? '1' : '0';
    select(
      'REMOVAL',
      'r.resource_id',
      'r.id',
      'NULL',
      'r.version_id',
      'r.judul',
      "'REMOVAL_REQUEST'",
      'r.alasan',
      'JOIN permintaan_penghapusan r ON r.id=a.entity_id',
      `a.module='documents' AND a.entity_type='permintaan_penghapusan' AND a.action='REQUEST_REMOVAL' AND r.status='PENDING'
       AND ((r.sumber='TEMPLATE' AND ${template}=1) OR (r.sumber='DOCUMENT' AND ((r.jenis IN ('WITHDRAW','REVOKE') AND ${withdraw}=1) OR (r.jenis='DELETE' AND ${remove}=1))))`,
    );
    if (actor.izin.includes('users.read')) {
      select(
        'ACCOUNT',
        'u.id',
        'NULL',
        'NULL',
        'NULL',
        'u.nama',
        "'ACCOUNT_REGISTER'",
        'NULL',
        'JOIN pengguna u ON u.id=a.entity_id',
        "a.module='identity' AND a.entity_type='pengguna' AND a.action='REGISTER' AND u.status='MENUNGGU_VERIFIKASI' AND u.deleted_at IS NULL",
      );
    }
  } else {
    select(
      'REMOVAL',
      'r.resource_id',
      'r.id',
      'NULL',
      'r.version_id',
      'r.judul',
      "CASE a.action WHEN 'REMOVAL_APPROVED' THEN 'REMOVAL_APPROVE' ELSE 'REMOVAL_DECLINE' END",
      'r.catatan',
      'JOIN permintaan_penghapusan r ON r.id=a.entity_id',
      "a.module='documents' AND a.entity_type='permintaan_penghapusan' AND a.action IN ('REMOVAL_APPROVED','REMOVAL_DECLINED') AND r.requested_by=?",
      [actor.id],
    );
  }
  return { sql: branches.join(' UNION ALL '), values };
}
