/** Read/write bindings only. SQL-first: NEVER use these partial bindings for migrations/push.
 * Constraints/indexes/defaults remain in database/v2/schema.sql. Identity scope only. */
import {
  mysqlTable,
  customType,
  varchar,
  datetime,
  boolean,
  mysqlEnum,
  json,
} from 'drizzle-orm/mysql-core';
const idType = customType<{ data: string; driverData: string }>({
  dataType: () => 'bigint unsigned',
});
const binary32 = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => 'binary(32)' });

export const unit_kerja = mysqlTable('unit_kerja', {
  id: idType('id').notNull(),
  parent_id: idType('parent_id'),
  kode: varchar('kode', { length: 40 }).notNull(),
  nama: varchar('nama', { length: 200 }).notNull(),
  aktif: boolean('aktif').notNull(),
  deleted_at: datetime('deleted_at', { mode: 'string', fsp: 6 }),
  created_at: datetime('created_at', { mode: 'string', fsp: 6 }).notNull(),
  updated_at: datetime('updated_at', { mode: 'string', fsp: 6 }).notNull(),
});

export const pengguna = mysqlTable('pengguna', {
  id: idType('id').notNull(),
  google_sub: varchar('google_sub', { length: 255 }),
  email: varchar('email', { length: 254 }).notNull(),
  nama: varchar('nama', { length: 200 }).notNull(),
  avatar_url: varchar('avatar_url', { length: 2048 }),
  unit_kerja_id: idType('unit_kerja_id'),
  unit_manual: varchar('unit_manual', { length: 200 }),
  status: mysqlEnum('status', ['MENUNGGU_VERIFIKASI', 'AKTIF', 'DITOLAK', 'NONAKTIF']).notNull(),
  verified_at: datetime('verified_at', { mode: 'string', fsp: 6 }),
  verified_by: idType('verified_by'),
  rejection_reason: varchar('rejection_reason', { length: 1000 }),
  deleted_at: datetime('deleted_at', { mode: 'string', fsp: 6 }),
  created_at: datetime('created_at', { mode: 'string', fsp: 6 }).notNull(),
  updated_at: datetime('updated_at', { mode: 'string', fsp: 6 }).notNull(),
});

export const peran = mysqlTable('peran', {
  id: idType('id').notNull(),
  kode: varchar('kode', { length: 32 }).notNull(),
  nama: varchar('nama', { length: 100 }).notNull(),
  created_at: datetime('created_at', { mode: 'string', fsp: 6 }).notNull(),
});

export const izin = mysqlTable('izin', {
  id: idType('id').notNull(),
  kode: varchar('kode', { length: 100 }).notNull(),
  nama: varchar('nama', { length: 200 }).notNull(),
  modul: varchar('modul', { length: 50 }).notNull(),
  created_at: datetime('created_at', { mode: 'string', fsp: 6 }).notNull(),
});

export const pengguna_peran = mysqlTable('pengguna_peran', {
  pengguna_id: idType('pengguna_id').notNull(),
  peran_id: idType('peran_id').notNull(),
  assigned_by: idType('assigned_by'),
  created_at: datetime('created_at', { mode: 'string', fsp: 6 }).notNull(),
});

export const peran_izin = mysqlTable('peran_izin', {
  peran_id: idType('peran_id').notNull(),
  izin_id: idType('izin_id').notNull(),
  created_at: datetime('created_at', { mode: 'string', fsp: 6 }).notNull(),
});

export const pengguna_izin = mysqlTable('pengguna_izin', {
  pengguna_id: idType('pengguna_id').notNull(),
  izin_id: idType('izin_id').notNull(),
  efek: mysqlEnum('efek', ['ALLOW', 'DENY']).notNull(),
  alasan: varchar('alasan', { length: 1000 }).notNull(),
  granted_by: idType('granted_by').notNull(),
  created_at: datetime('created_at', { mode: 'string', fsp: 6 }).notNull(),
  updated_at: datetime('updated_at', { mode: 'string', fsp: 6 }).notNull(),
});

export const sesi_pengguna = mysqlTable('sesi_pengguna', {
  id: idType('id').notNull(),
  pengguna_id: idType('pengguna_id').notNull(),
  token_hash: binary32('token_hash').notNull(),
  user_agent: varchar('user_agent', { length: 1024 }),
  ip_hash: binary32('ip_hash'),
  expires_at: datetime('expires_at', { mode: 'string', fsp: 6 }).notNull(),
  last_used_at: datetime('last_used_at', { mode: 'string', fsp: 6 }),
  revoked_at: datetime('revoked_at', { mode: 'string', fsp: 6 }),
  created_at: datetime('created_at', { mode: 'string', fsp: 6 }).notNull(),
});

export const audit_log = mysqlTable('audit_log', {
  id: idType('id').notNull(),
  actor_id: idType('actor_id'),
  module: varchar('module', { length: 64 }).notNull(),
  action: varchar('action', { length: 100 }).notNull(),
  entity_type: varchar('entity_type', { length: 64 }).notNull(),
  entity_id: idType('entity_id'),
  before_json: json('before_json'),
  after_json: json('after_json'),
  request_id: varchar('request_id', { length: 128 }).notNull(),
  ip_hash: binary32('ip_hash'),
  user_agent: varchar('user_agent', { length: 1024 }),
  created_at: datetime('created_at', { mode: 'string', fsp: 6 }).notNull(),
});

export const dokumen_akses_rahasia = mysqlTable('dokumen_akses_rahasia', {
  id: idType('id').notNull(),
  dokumen_id: idType('dokumen_id').notNull(),
  pengguna_id: idType('pengguna_id').notNull(),
  granted_by: idType('granted_by').notNull(),
  granted_at: datetime('granted_at', { mode: 'string', fsp: 6 }).notNull(),
  expires_at: datetime('expires_at', { mode: 'string', fsp: 6 }),
  revoked_at: datetime('revoked_at', { mode: 'string', fsp: 6 }),
  revoked_by: idType('revoked_by'),
  grant_reason: varchar('grant_reason', { length: 1000 }).notNull(),
  revoke_reason: varchar('revoke_reason', { length: 1000 }),
});
