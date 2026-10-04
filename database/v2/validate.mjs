/**
 * Phase 1 database verification only. No NestJS/Drizzle import.
 * node database/v2/validate.mjs --static
 * node database/v2/validate.mjs
 *
 * Runtime uses Compose V2 or --local with DB_* from .env.v2.local (Node 22+).
 * Mutation tests use transactions and ROLLBACK (failed client closes/rolls back).
 * AUTO_INCREMENT counters may advance: tests guarantee row preservation, not gapless IDs.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { parseEnv } from 'node:util';

const directory = dirname(fileURLToPath(import.meta.url));
const root = resolve(directory, '../..');
const schema = readFileSync(resolve(directory, 'schema.sql'), 'utf8');
const names = [...schema.matchAll(/^CREATE TABLE (\w+)/gm)].map(m => m[1]).sort();
const expected = [
  'unit_kerja','pengguna','peran','izin','pengguna_peran','peran_izin','pengguna_izin',
  'sesi_pengguna','jenis_dokumen','kategori','tag','dokumen','dokumen_versi',
  'dokumen_versi_kategori','dokumen_versi_tag','dokumen_berkas','dokumen_relasi',
  'dokumen_akses_rahasia','dokumen_workflow','dokumen_status_hukum_riwayat',
  'template_surat','template_surat_versi','audit_log'
].sort();
const fks = [...schema.matchAll(/CONSTRAINT (\w+) FOREIGN KEY/g)].map(m => m[1]).sort();
const checks = [...schema.matchAll(/CONSTRAINT (\w+) CHECK/g)].map(m => m[1]).sort();
const unique = [...schema.matchAll(/UNIQUE KEY (\w+)/g)].map(m => m[1]).sort();
const indexes = [...schema.matchAll(/^ {2}(?:UNIQUE )?KEY (\w+)/gm)].map(m => m[1]).sort();
assert.deepEqual(names, expected);
assert.equal((schema.match(/ON DELETE RESTRICT ON UPDATE RESTRICT/g) ?? []).length, fks.length);
// Structural review of our deliberately regular DDL; not a MySQL syntax parser.
const structures = new Map();
for (const match of schema.matchAll(/CREATE TABLE (\w+) \(\n([\s\S]*?)\n\) ENGINE=InnoDB;/g)) {
  const columns = new Map([...match[2].matchAll(/^ {2}(\w+) (BIGINT UNSIGNED|INT UNSIGNED|SMALLINT UNSIGNED|TINYINT|VARCHAR\(\d+\)|BINARY\(\d+\)|DATETIME\(6\)|DATE|TEXT|JSON|BOOLEAN|ENUM)/gm)].map(m => [m[1],m[2]]));
  const keys = [...match[2].matchAll(/(?:PRIMARY KEY|(?:UNIQUE )?KEY \w+) \(([^)]+)\)/g)].map(m => m[1].split(',').map(c => c.trim()));
  const candidateKeys = [...match[2].matchAll(/(?:PRIMARY KEY|UNIQUE KEY \w+) \(([^)]+)\)/g)].map(m => m[1].split(',').map(c => c.trim()));
  if (/\bid BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY/.test(match[2])) {
    keys.push(['id']); candidateKeys.push(['id']);
  }
  structures.set(match[1], {columns,keys,candidateKeys});
}
assert.equal(structures.size,23);
for (const name of [...fks,...checks,...indexes]) assert.ok(name.length <= 64, 'Identifier too long: '+name);
assert.equal(new Set([...fks,...checks]).size, fks.length+checks.length, 'Duplicate constraint name');
const statements = [...schema.matchAll(/CREATE TABLE (\w+) \(\n([\s\S]*?)\n\) ENGINE=InnoDB;/g),
  ...schema.matchAll(/ALTER TABLE (\w+) ADD\n([\s\S]*?);/g)];
let reviewedForeignKeys = 0;
for (const match of statements) {
  const source = structures.get(match[1]);
  for (const relation of match[2].matchAll(/CONSTRAINT (\w+) FOREIGN KEY \(([^)]+)\) REFERENCES (\w+) \(([^)]+)\)/g)) {
    reviewedForeignKeys++;
    const sourceColumns=relation[2].split(',').map(c=>c.trim());
    const targetColumns=relation[4].split(',').map(c=>c.trim());
    const target=structures.get(relation[3]);
    assert.ok(target,relation[1]+': missing target');
    assert.equal(sourceColumns.length,targetColumns.length,relation[1]);
    sourceColumns.forEach((column,index)=>{
      assert.ok(source.columns.has(column),relation[1]+': missing source column');
      assert.ok(target.columns.has(targetColumns[index]),relation[1]+': missing target column');
      assert.equal(source.columns.get(column),target.columns.get(targetColumns[index]),relation[1]+': FK type mismatch');
    });
    assert.ok(source.keys.some(k=>sourceColumns.every((c,i)=>k[i]===c)),relation[1]+': missing child index');
    assert.ok(target.candidateKeys.some(k=>k.length===targetColumns.length && targetColumns.every((c,i)=>k[i]===c)),relation[1]+': missing explicit unique referenced key');
  }
}
assert.equal(reviewedForeignKeys, fks.length, 'Incomplete FK structural review');
// Reviewed V1 requirements: drafts may be incomplete; published history may not.
const versionDefinition = schema.match(/CREATE TABLE dokumen_versi \(\n([\s\S]*?)\n\) ENGINE=InnoDB;/)[1];
assert.match(versionDefinition, /pic VARCHAR\(255\) NULL/);
assert.match(versionDefinition, /tanggal_penetapan DATE NULL/);
assert.ok(!/\b(abstrak|tanggal_berlaku)\b/.test(versionDefinition));
assert.ok(!/FOREIGN KEY \([^)]*\bpic\b/.test(schema));
assert.match(versionDefinition, /ck_versi_publish_metadata CHECK \(status_workflow NOT IN \('TERBIT','DITARIK'\)/);
for (const field of ['nomor','pic']) {
  assert.ok(versionDefinition.includes(`${field} IS NOT NULL AND CHAR_LENGTH(TRIM(${field})) > 0`));
}
assert.ok(versionDefinition.includes('tanggal_penetapan IS NOT NULL'));
const sample = readFileSync(resolve(directory, 'sample.sql'), 'utf8');
// Parse only the literal VALUES fixtures for document versions; reject unknown syntax.
let sampleVersions = 0;
for (const insert of sample.matchAll(/INSERT INTO dokumen_versi\s+\(([^)]+)\)\s+VALUES\s+([\s\S]*?);/g)) {
  const columns = insert[1].split(',').map(c => c.trim());
  for (const tuple of insert[2].matchAll(/\(([^()]*)\)/g)) {
    const tokens = tuple[1].match(/'(?:[^']|'')*'|NULL|\d+/g);
    assert.equal(tokens.length, columns.length, 'Sample version column/value mismatch');
    const row = Object.fromEntries(columns.map((c,i) => [c, tokens[i] === 'NULL' ? null : tokens[i].replace(/^'|'$/g,'')]));
    if (['TERBIT','DITARIK'].includes(row.status_workflow)) {
      for (const field of ['judul','nomor','pic','tanggal_penetapan']) assert.ok(row[field]?.trim(), `Sample ${row.id}: missing ${field}`);
      assert.match(row.tanggal_penetapan, /^\d{4}-\d{2}-\d{2}$/);
    }
    sampleVersions++;
  }
}
assert.equal(sampleVersions,6,'All six version fixtures must be reviewed');
for (const file of ['schema.sql','seed.sql','sample.sql']) {
  const sql = readFileSync(resolve(directory, file), 'utf8').replace(/^--.*$/gm, '');
  assert.ok(sql.includes('USE jdih_ith_v2_dev;'), file + ': fixed V2 target missing');
  assert.ok(!/\b(?:DROP|TRUNCATE|REPLACE)\s+(?:DATABASE|TABLE|INTO)/i.test(sql), file + ': destructive SQL');
  assert.ok(!/\bUSE\s+[`]?jdih_ith[`;]/i.test(sql), file + ': legacy DB target');
}
console.log(JSON.stringify({
  static: 'PASS', tables: names.length, foreignKeys: fks.length, checks: checks.length,
  uniqueSecondary: unique.length, namedSecondaryIndexes: indexes.length,
  primaryKeys: (schema.match(/PRIMARY KEY/g) ?? []).length
}));
if (process.argv.includes('--static')) process.exit(0);

const local = process.argv.includes('--local');
let executable = 'docker';
let connectionEnv = process.env;
let args;
if (local) {
  const config = parseEnv(readFileSync(resolve(root,'.env.v2.local'),'utf8'));
  assert.equal(config.DB_HOST,'127.0.0.1','Local validation requires loopback');
  assert.equal(config.DB_NAME,'jdih_ith_v2_dev','Only the V2 database is allowed');
  assert.match(config.DB_PORT ?? '',/^\d+$/);
  assert.ok(Number(config.DB_PORT)>0 && Number(config.DB_PORT)<=65535);
  assert.ok(config.DB_USER && config.DB_PASSWORD,'Local V2 credentials required');
  executable = process.env.JDIH_V2_MYSQL_CLIENT || 'mysql';
  connectionEnv = {...process.env,MYSQL_PWD:config.DB_PASSWORD};
  args = ['--no-defaults','--protocol=TCP','--host='+config.DB_HOST,'--port='+config.DB_PORT,
    '--user='+config.DB_USER,'--database='+config.DB_NAME,'--connect-timeout=5',
    '--batch','--skip-column-names','--default-character-set=utf8mb4'];
} else {
  if (process.env.DOCKER_HOST || process.env.DOCKER_CONTEXT) {
    throw new Error('Unset Docker endpoint overrides; validation is local-only.');
  }
  const context = spawnSync('docker',['context','inspect','--format','{{.Endpoints.docker.Host}}'],{encoding:'utf8',timeout:10000});
  assert.ok(context.status === 0 && /^(npipe:\/\/|unix:\/\/)/.test(context.stdout.trim()),'Local Docker engine required');
  args = ['compose','-p','jdih-ith-v2-phase1','--env-file',resolve(root,'.env.v2.local'),
    '-f',resolve(root,'compose.v2.yaml'),'exec','-T','mysql-v2','sh','-c',
    'export MYSQL_PWD="$MYSQL_PASSWORD"; exec mysql --user="$MYSQL_USER" --database=jdih_ith_v2_dev --batch --skip-column-names --default-character-set=utf8mb4'];
}
function run(statement) {
  return spawnSync(executable,args,{
    cwd:root,env:connectionEnv,
    input:"SET time_zone = '+00:00'; SET SESSION sql_mode = 'STRICT_ALL_TABLES,ONLY_FULL_GROUP_BY,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';\n"+statement+'\n',
    encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024
  });
}
function query(statement) {
  const result = run(statement);
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  return result.stdout.replace(/\r\n/g,'\n').trim();
}
function list(statement) { return query(statement).split('\n').filter(Boolean).sort(); }
const identity = query('SELECT DATABASE(), VERSION(), @@port;');
assert.match(identity, /^jdih_ith_v2_dev\t8\.4\./);
assert.equal(query("SELECT COUNT(*) FROM audit_log WHERE request_id='phase1-sample'"), '1', 'Import sample first');
assert.deepEqual(list("SELECT table_name FROM information_schema.tables WHERE table_schema=DATABASE() AND table_type='BASE TABLE'"), expected);
for (const [kind, declared] of [['FOREIGN KEY',fks],['CHECK',checks],['UNIQUE',unique]]) {
  assert.deepEqual(list("SELECT constraint_name FROM information_schema.table_constraints WHERE table_schema=DATABASE() AND constraint_type='" + kind + "'"), declared, kind);
}
assert.equal(query("SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_schema=DATABASE() AND constraint_type='PRIMARY KEY'"), '23');
assert.equal(query("SELECT COUNT(*) FROM information_schema.referential_constraints WHERE constraint_schema=DATABASE() AND (delete_rule <> 'RESTRICT' OR update_rule <> 'RESTRICT')"), '0');
assert.equal(query("SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_schema=DATABASE() AND constraint_type='CHECK' AND enforced <> 'YES'"), '0');
const actualIndexes = list("SELECT DISTINCT index_name FROM information_schema.statistics WHERE table_schema=DATABASE() AND index_name <> 'PRIMARY'");
for (const index of indexes) assert.ok(actualIndexes.includes(index), 'Missing index: ' + index);

const counts = () => query(names.map(name => "SELECT '" + name + "', COUNT(*) FROM " + name).join(';'));
const before = counts();
let passed = 0;
function expectError(label, statement, code) {
  const result = run('START TRANSACTION;\n' + statement + ';\nROLLBACK;');
  assert.notEqual(result.status, 0, label + ': expected failure');
  assert.match(result.stderr, new RegExp('ERROR ' + code + ' \\('), label + ': ' + result.stderr);
  passed++;
  console.log('PASS reject: ' + label);
}
function expectValue(label, statement, expectedValue) {
  assert.equal(query('START TRANSACTION;\n' + statement + ';\nROLLBACK;'), expectedValue, label);
  passed++;
  console.log('PASS: ' + label);
}

// Unique identity, ownership, and references.
expectError('duplicate Google sub', "INSERT INTO pengguna(google_sub,email,nama) VALUES ('fixture:author','unique@example.invalid','Test')",1062);
expectError('email case-insensitive duplicate', "INSERT INTO pengguna(email,nama) VALUES ('AUTHOR@example.invalid','Test')",1062);
expectError('invalid user status', "UPDATE pengguna SET status='UNKNOWN' WHERE id=9004",1265);
expectError('rejection reason required', "UPDATE pengguna SET status='DITOLAK' WHERE id=9004",3819);
expectError('virtual visitor not persisted as role', "INSERT INTO peran(kode,nama) VALUES ('PENGUNJUNG','Test')",3819);
expectError('foreign unit missing', "UPDATE pengguna SET unit_kerja_id=999999999 WHERE id=9004",1452);
expectError('duplicate document slug', "UPDATE dokumen SET slug='simulasi-publik' WHERE id=902",1062);
expectError('cross-document pointer', "UPDATE dokumen SET current_published_version_id=9021 WHERE id=901",1452);
expectError('missing version pointer', "UPDATE dokumen SET current_published_version_id=999999999 WHERE id=901",1452);
expectError('duplicate document version', "INSERT INTO dokumen_versi(dokumen_id,nomor_versi,tingkat_akses,judul,created_by) VALUES (901,1,'publik','Test',9001)",1062);
expectError('zero version number', "UPDATE dokumen_versi SET nomor_versi=0 WHERE id=9012",3819);
expectError('removed access terbatas', "UPDATE dokumen_versi SET tingkat_akses='terbatas' WHERE id=9012",1265);
expectError('document workflow rejects DITOLAK', "UPDATE dokumen_versi SET status_workflow='DITOLAK' WHERE id=9012",1265);
expectError('invalid legal status', "UPDATE dokumen SET status_hukum='BELUM_BERLAKU' WHERE id=901",1265);
expectError('self approval', "UPDATE dokumen_versi SET verified_by=created_by,approved_at=UTC_TIMESTAMP(6),status_workflow='DISETUJUI' WHERE id=9012",3819);
expectError('approval identity required', "UPDATE dokumen_versi SET status_workflow='DISETUJUI' WHERE id=9012",3819);
expectError('publish metadata required', "UPDATE dokumen_versi SET verified_by=9002,approved_at=UTC_TIMESTAMP(6),status_workflow='TERBIT' WHERE id=9012",3819);
expectError('withdrawal reason required', "UPDATE dokumen_versi SET status_workflow='DITARIK',withdrawn_at=UTC_TIMESTAMP(6) WHERE id=9011",3819);
for (const [field,value] of [['pic','NULL'],['pic',"''"],['pic',"'   '"],['tanggal_penetapan','NULL'],['nomor','NULL'],['nomor',"'   '"],['judul',"'   '"]]) {
  expectError(`published ${field} rejects ${value}`, `UPDATE dokumen_versi SET ${field}=${value} WHERE id=9011`,3819);
}
expectError('publish incomplete draft even with approval and publisher', "UPDATE dokumen_versi SET verified_by=9002,approved_at=UTC_TIMESTAMP(6),published_by=9002,published_at=UTC_TIMESTAMP(6),status_workflow='TERBIT' WHERE id=9012",3819);
expectError('withdrawn history retains PIC', "UPDATE dokumen_versi SET status_workflow='DITARIK',withdrawn_at=UTC_TIMESTAMP(6),withdrawal_reason='Test',pic=NULL WHERE id=9011",3819);
const fileFields = '(dokumen_versi_id,jenis_berkas,storage_key,nama_asli,mime_type,size_bytes,checksum)';
expectError('second main file', "INSERT INTO dokumen_berkas " + fileFields + " VALUES (9011,'UTAMA','tests/main','test.pdf','application/pdf',1,UNHEX(SHA2('test',256)))",1062);
expectError('file version must exist', "INSERT INTO dokumen_berkas " + fileFields + " VALUES (999999999,'UTAMA','tests/orphan','test.pdf','application/pdf',1,UNHEX(SHA2('test',256)))",1452);
expectError('positive file size', "UPDATE dokumen_berkas SET size_bytes=0 WHERE dokumen_versi_id=9011 AND jenis_berkas='UTAMA'",3819);
expectError('invalid relation type', "UPDATE dokumen_relasi SET jenis_relasi='JUKNIS' WHERE source_version_id=9012",1265);
expectError('duplicate open grant', "INSERT INTO dokumen_akses_rahasia(dokumen_id,pengguna_id,granted_by,grant_reason) VALUES (903,9003,9002,'Test')",1062);
expectError('invalid grant expiry', "INSERT INTO dokumen_akses_rahasia(dokumen_id,pengguna_id,granted_by,grant_reason,granted_at,expires_at) VALUES (903,9004,9002,'Test','2026-01-02','2026-01-01')",3819);
expectError('revision note required', "INSERT INTO dokumen_workflow(dokumen_versi_id,status_asal,status_tujuan,action,actor_id) VALUES (9012,'DIAJUKAN','REVISI','RETURN',9002)",3819);
expectError('invalid history transition', "INSERT INTO dokumen_workflow(dokumen_versi_id,status_asal,status_tujuan,action,actor_id) VALUES (9012,'DRAF','TERBIT','PUBLISH',9002)",3819);
expectError('null origin cannot bypass transition check', "INSERT INTO dokumen_workflow(dokumen_versi_id,status_asal,status_tujuan,action,actor_id) VALUES (9012,NULL,'TERBIT','PUBLISH',9002)",3819);
expectError('cross-template pointer', "UPDATE template_surat SET current_version_id=9521 WHERE id=951",1452);
expectError('template access rejects RAHASIA', "UPDATE template_surat_versi SET tingkat_akses='RAHASIA' WHERE id=9512",1265);
expectError('only one ACTIVE template version', "UPDATE template_surat_versi SET status='ACTIVE',archived_at=NULL WHERE id=9511",1062);
expectError('template archive timestamp required', "UPDATE template_surat_versi SET status='ARCHIVED',archived_at=NULL WHERE id=9512",3819);
expectError('duplicate session hash', "INSERT INTO sesi_pengguna(pengguna_id,token_hash,expires_at) VALUES (9003,UNHEX(SHA2('fixture-token-not-for-login',256)),UTC_TIMESTAMP(6)+INTERVAL 1 DAY)",1062);
expectError('session expiry must follow creation', "INSERT INTO sesi_pengguna(pengguna_id,token_hash,created_at,expires_at) VALUES (9003,UNHEX(SHA2('test',256)),'2026-01-02','2026-01-01')",3819);
expectError('actor reference retained', "DELETE FROM pengguna WHERE id=9001",1451);
expectError('version history retained by references', "DELETE FROM dokumen_versi WHERE id=9011",1451);
expectError('referenced document cannot hard-delete', "DELETE FROM dokumen WHERE id=901",1451);

// Positive relational scenarios, without implementing any service/API.
expectValue('draft revision keeps prior public pointer', "SELECT current_published_version_id FROM dokumen WHERE id=901", '9011');
expectValue('multiple attachments', "SELECT COUNT(*) FROM dokumen_berkas WHERE dokumen_versi_id=9011 AND jenis_berkas='LAMPIRAN'", '2');
expectValue('draft legal relation has no automatic side effect', "SELECT status_hukum FROM dokumen WHERE id=902", 'BERLAKU');
expectValue('expired grant is excluded even without revocation',
  "INSERT INTO dokumen_akses_rahasia(dokumen_id,pengguna_id,granted_by,grant_reason,granted_at,expires_at) VALUES (903,9004,9002,'Test','2000-01-01','2000-01-02'); SELECT COUNT(*) FROM dokumen_akses_rahasia WHERE dokumen_id=903 AND pengguna_id=9004 AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at>UTC_TIMESTAMP(6))", '0');
expectValue('regrant retains revoked history',
  "UPDATE dokumen_akses_rahasia SET revoked_at=UTC_TIMESTAMP(6),revoked_by=9002,revoke_reason='Test' WHERE dokumen_id=903 AND pengguna_id=9003 AND revoked_at IS NULL; INSERT INTO dokumen_akses_rahasia(dokumen_id,pengguna_id,granted_by,grant_reason) VALUES (903,9003,9002,'Test'); SELECT COUNT(*) FROM dokumen_akses_rahasia WHERE dokumen_id=903 AND pengguna_id=9003", '3');
expectValue('same-owner publish pointer swap and preserved history',
  "UPDATE dokumen_versi SET pic='PIC Revisi Bebas',tanggal_penetapan='2026-03-01',verified_by=9002,approved_at=UTC_TIMESTAMP(6),published_by=9002,published_at=UTC_TIMESTAMP(6),status_workflow='TERBIT' WHERE id=9012; UPDATE dokumen_versi SET superseded_at=UTC_TIMESTAMP(6) WHERE id=9011; UPDATE dokumen SET current_published_version_id=9012 WHERE id=901; SELECT CONCAT(current_published_version_id,':',(SELECT COUNT(*) FROM dokumen_versi WHERE dokumen_id=901)) FROM dokumen WHERE id=901", '9012:2');
expectValue('pointer swap rollback kept old publication', "SELECT current_published_version_id FROM dokumen WHERE id=901", '9011');
expectValue('nullable audit actor', "INSERT INTO audit_log(actor_id,module,action,entity_type,request_id) VALUES(NULL,'test','TEST','test','phase1-test'); SELECT COUNT(*) FROM audit_log WHERE request_id='phase1-test'", '1');
expectValue('archived template history preserved', "SELECT CONCAT(t.current_version_id,':',v.status) FROM template_surat t JOIN template_surat_versi v ON v.id=9511 WHERE t.id=951", '9512:ARCHIVED');
expectValue('draft permits missing PIC and date', "SELECT COUNT(*) FROM dokumen_versi WHERE id=9012 AND pic IS NULL AND tanggal_penetapan IS NULL AND status_workflow='DRAF'",'1');
expectValue('PIC and date differ between versions', "SELECT COUNT(DISTINCT pic),COUNT(DISTINCT tanggal_penetapan) FROM dokumen_versi WHERE dokumen_id=904",'2\t2');
// These transactions demonstrate the required future service sequence, not DB triggers.
expectValue('withdraw current clears pointer without superseded fallback',
  "SELECT id INTO @locked_document FROM dokumen WHERE id=904 FOR UPDATE; UPDATE dokumen_versi SET status_workflow='DITARIK',withdrawn_at=UTC_TIMESTAMP(6),withdrawal_reason='Test withdrawal' WHERE id=9042; UPDATE dokumen SET current_published_version_id=NULL WHERE id=904 AND current_published_version_id=9042; SELECT CONCAT(current_published_version_id IS NULL,':',(SELECT COUNT(*) FROM dokumen_versi WHERE dokumen_id=904),':',(SELECT superseded_at IS NOT NULL FROM dokumen_versi WHERE id=9041),':',status_hukum) FROM dokumen WHERE id=904",'1:2:1:BERLAKU');
expectValue('withdrawal rollback restores current', "SELECT current_published_version_id FROM dokumen WHERE id=904",'9042');
expectValue('withdraw non-current does not clear newer pointer',
  "UPDATE dokumen_versi SET status_workflow='DITARIK',withdrawn_at=UTC_TIMESTAMP(6),withdrawal_reason='Test history' WHERE id=9041; UPDATE dokumen SET current_published_version_id=NULL WHERE id=904 AND current_published_version_id=9041; SELECT current_published_version_id FROM dokumen WHERE id=904",'9042');
expectError('expired unrevoked grant still holds unique slot', "INSERT INTO dokumen_akses_rahasia(dokumen_id,pengguna_id,granted_by,grant_reason) VALUES(903,9001,9002,'Regrant without closure')",1062);
expectValue('expired closure and regrant preserve history',
  "SELECT id INTO @locked_document FROM dokumen WHERE id=903 FOR UPDATE; SELECT id INTO @locked_user FROM pengguna WHERE id=9001 FOR UPDATE; UPDATE dokumen_akses_rahasia SET revoked_at=UTC_TIMESTAMP(6),revoked_by=9002,revoke_reason='Expired before regrant' WHERE dokumen_id=903 AND pengguna_id=9001 AND revoked_at IS NULL AND expires_at<=UTC_TIMESTAMP(6); INSERT INTO dokumen_akses_rahasia(dokumen_id,pengguna_id,granted_by,grant_reason) VALUES(903,9001,9002,'Regrant after expiry'); SELECT COUNT(*),SUM(revoked_at IS NULL AND (expires_at IS NULL OR expires_at>UTC_TIMESTAMP(6))) FROM dokumen_akses_rahasia WHERE dokumen_id=903 AND pengguna_id=9001",'2\t1');
assert.equal(counts(), before, 'Tests changed persistent row counts');
console.log(JSON.stringify({runtime:'PASS', mysql:identity, behaviouralTests:passed, persistentRowCountsUnchanged:true}));
