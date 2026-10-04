import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import mysql from 'mysql2/promise';

const envPath = resolve(process.argv[2] ?? '.env.identity.test.local');
const scriptDir = dirname(fileURLToPath(import.meta.url));
const env = parseEnv(await readFile(envPath, 'utf8'));
if (env.DB_NAME !== 'jdih_ith_v2_test') throw new Error('Refusing non-test database');
if (!['127.0.0.1', 'localhost', '::1'].includes(env.DB_HOST ?? ''))
  throw new Error('Refusing non-local MySQL host');
if (!Number.isInteger(Number(env.DB_PORT)) || Number(env.DB_PORT) < 1)
  throw new Error('Invalid DB_PORT');

const connection = await mysql.createConnection({
  host: env.DB_HOST,
  port: Number(env.DB_PORT),
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  multipleStatements: true,
  connectTimeout: 5000,
});

try {
  const [rows] = await connection.query('SELECT VERSION() AS version, DATABASE() AS database_name');
  const { version, database_name: databaseName } = rows[0];
  console.log(`MySQL ${version}; database ${databaseName}`);
  if (!/^8\.4\./.test(String(version)) || databaseName !== 'jdih_ith_v2_test')
    throw new Error('Refusing to reset: runtime server/database did not match test target');

  await connection.query('SET FOREIGN_KEY_CHECKS=0');
  const [tables] = await connection.query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'");
  for (const row of tables) {
    const table = String(Object.values(row)[0]).replaceAll('`', '``');
    await connection.query(`DROP TABLE \`${table}\``);
  }
  await connection.query('SET FOREIGN_KEY_CHECKS=1');

  for (const [label, file] of [
    ['schema', '../../../database/v2/schema.sql'],
    ['seed', '../../../database/v2/seed.sql'],
  ]) {
    const source = await readFile(resolve(scriptDir, file), 'utf8');
    const sql = source.replace(/\bUSE\s+jdih_ith_v2_dev\s*;/gi, 'USE jdih_ith_v2_test;');
    if (/\bUSE\s+jdih_ith_v2_dev\b/i.test(sql) || !/\bUSE\s+jdih_ith_v2_test\s*;/i.test(sql))
      throw new Error(`Refusing ${label}: database USE directive was not safely rewritten`);
    await connection.query(sql);
    console.log(`${label} import: PASS`);
  }

  const [finalTables] = await connection.query('SHOW FULL TABLES WHERE Table_type = \'BASE TABLE\'');
  if (finalTables.length !== 23) throw new Error(`Expected 23 V2 tables, got ${finalTables.length}`);
  const [roles] = await connection.query('SELECT COUNT(*) AS total FROM peran');
  const [permissions] = await connection.query('SELECT COUNT(*) AS total FROM izin');
  if (Number(roles[0].total) !== 3 || Number(permissions[0].total) < 20)
    throw new Error('V2 seed verification failed');
  console.log(`Setup verified: ${finalTables.length} tables; ${roles[0].total} roles; ${permissions[0].total} permissions`);
} finally {
  await connection.end();
}
