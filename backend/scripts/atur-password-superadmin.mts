/**
 * Atur password akun Superadmin dari server (bukan dari web), mis. untuk
 * password pertama atau bila Superadmin lupa password.
 *
 *   npm run superadmin:password -- superadmin@ith.ac.id
 *
 * Password diketik tanpa ditampilkan. Semua sesi akun itu dicabut dan
 * tindakan dicatat di audit (pelaku: sistem).
 */
import { existsSync, readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline';
import mysql from 'mysql2/promise';
import { skemaPasswordBaru } from '@jdih/shared';
import { hashPassword } from '../src/modules/identity/password.js';

function bacaEnv(...berkas: string[]) {
  const hasil: Record<string, string> = {};
  for (const f of berkas) {
    if (!existsSync(f)) continue;
    for (const baris of readFileSync(f, 'utf8').split(/\r?\n/)) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(baris);
      if (m && !(m[1]! in hasil)) hasil[m[1]!] = m[2]!.replace(/^['"]|['"]$/g, '');
    }
  }
  return hasil;
}

/** Tanya tanpa menampilkan ketikan. */
function tanyaRahasia(pertanyaan: string) {
  return new Promise<string>((selesai) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const tulisAsli = (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput;
    (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s: string) => {
      if (s.includes(pertanyaan)) tulisAsli.call(rl, s);
    };
    rl.question(pertanyaan, (jawab) => {
      rl.close();
      process.stdout.write('\n');
      selesai(jawab);
    });
  });
}

const email = (process.argv[2] ?? '').trim().toLowerCase();
if (!email.includes('@')) {
  console.error('Pakai: npm run superadmin:password -- email-superadmin@ith.ac.id');
  process.exit(1);
}
const env = { ...bacaEnv('.env.identity.local', '../.env.v2.local'), ...process.env };
const db = await mysql.createConnection({
  host: env.DB_HOST,
  port: Number(env.DB_PORT ?? 3306),
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  timezone: 'Z',
});
try {
  const [baris] = await db.execute<mysql.RowDataPacket[]>(
    "SELECT u.id FROM pengguna u JOIN pengguna_peran pp ON pp.pengguna_id=u.id JOIN peran p ON p.id=pp.peran_id WHERE u.email=? AND u.deleted_at IS NULL AND u.status='AKTIF' AND p.kode='SUPERADMIN' LIMIT 1",
    [email],
  );
  const id = baris[0]?.id as string | undefined;
  if (!id) throw new Error('Tidak ada akun Superadmin aktif dengan email itu.');
  const pertama = await tanyaRahasia('Password baru: ');
  const cek = skemaPasswordBaru.safeParse(pertama);
  if (!cek.success) throw new Error(cek.error.issues.map((i) => i.message).join('; '));
  if ((await tanyaRahasia('Ulangi password baru: ')) !== pertama) throw new Error('Password tidak sama.');
  const waktu = new Date().toISOString().slice(0, 23).replace('T', ' ');
  await db.beginTransaction();
  await db.execute('UPDATE pengguna SET password_hash=?,password_diubah_at=? WHERE id=?', [
    await hashPassword(pertama),
    waktu,
    id,
  ]);
  await db.execute('UPDATE sesi_pengguna SET revoked_at=? WHERE pengguna_id=? AND revoked_at IS NULL', [
    waktu,
    id,
  ]);
  await db.execute(
    "INSERT INTO audit_log(actor_id,module,action,entity_type,entity_id,before_json,after_json,request_id) VALUES(NULL,'identity','RESET_PASSWORD','pengguna',?,NULL,?,?)",
    [id, JSON.stringify({ status: 'AKTIF', alasan: 'diatur dari server (superadmin:password)' }), randomUUID()],
  );
  await db.commit();
  console.log(`Password Superadmin ${email} sudah diatur. Masuk lewat /masuk/superadmin.`);
} catch (e) {
  await db.rollback().catch(() => undefined);
  console.error('Gagal:', e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  await db.end();
}
