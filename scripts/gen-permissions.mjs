#!/usr/bin/env node
/** Generate V2 permission contracts from the approved seed; never reads legacy SQL. */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';
const root = new URL('../', import.meta.url);
const sql = readFileSync(new URL('database/v2/seed.sql', root), 'utf8');
const block = sql.match(/INSERT INTO izin \(kode, nama, modul\) VALUES([\s\S]*?) AS incoming/);
if (!block) throw new Error('V2 permission block missing');
const rows = [...block[1].matchAll(/\('([^']+)', '([^']+)', '([^']+)'\)/g)].map((m) => ({
  kode: m[1],
  nama: m[2],
  modul: m[3],
}));
if (rows.length !== 26 || new Set(rows.map((r) => r.kode)).size !== rows.length)
  throw new Error('Unexpected V2 permission baseline');
const content = [
  '// Generated from database/v2/seed.sql by npm run gen:permissions. No role provisioning API.',
  "import { z } from 'zod';",
  'export const IZIN = {',
  ...rows.map(
    (r) => '  ' + r.kode.toUpperCase().replaceAll('.', '_') + ': ' + JSON.stringify(r.kode) + ',',
  ),
  '} as const;',
  'export const skemaIzin = z.enum(IZIN);',
  'export type KodeIzin = z.infer<typeof skemaIzin>;',
  'export const SEMUA_IZIN = Object.values(IZIN);',
  'export const MODUL_IZIN = ' +
    JSON.stringify([...new Set(rows.map((r) => r.modul))]) +
    ' as const;',
  'export type ModulIzin = (typeof MODUL_IZIN)[number];',
  '/** All writes and sensitive Secret reads; not a replacement for UI confirmation on every write. */',
  'export const IZIN_BERDAMPAK_TINGGI: readonly KodeIzin[] = SEMUA_IZIN.filter(i => ![IZIN.DOCUMENTS_READ_ADMIN, IZIN.USERS_READ, IZIN.DASHBOARD_READ, IZIN.AUDIT_READ].some(read => read === i));',
  'export interface MetaIzin { readonly kode: KodeIzin; readonly nama: string; readonly modul: ModulIzin }',
  'export const KATALOG_IZIN: readonly MetaIzin[] = ' + JSON.stringify(rows, null, 2) + ';',
  'export function cariIzin(kode: KodeIzin): MetaIzin | undefined { return KATALOG_IZIN.find(i => i.kode === kode); }',
  'export function adalahKodeIzin(nilai: unknown): nilai is KodeIzin { return skemaIzin.safeParse(nilai).success; }',
  '',
].join('\n');
const output = fileURLToPath(new URL('packages/shared/src/permissions.ts', root));
writeFileSync(output, await format(content, { ...(await resolveConfig(output)), parser: 'typescript' }));
console.log('Generated 26 V2 permissions.');
