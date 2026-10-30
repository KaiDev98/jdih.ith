/** Verifikasi SMTP: autentikasi saja, tidak mengirim email. */
import { readFileSync, existsSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { ConfigService } from '@nestjs/config';
import { konfigurasi } from '../src/config/configuration.js';
import { RecoveryMailService } from '../src/modules/identity/recovery-mail.service.js';
for (const path of ['.env.mail.local', '.env.identity.local', '../.env.v2.local']) {
  if (existsSync(path))
    for (const [name, value] of Object.entries(parseEnv(readFileSync(path, 'utf8'))))
      process.env[name] ??= value;
}
try {
  const mail = new RecoveryMailService(new ConfigService(konfigurasi()));
  mail.assertAvailable();
  await mail.verify();
  console.log('SMTP berhasil diverifikasi. Tidak ada email yang dikirim.');
} catch {
  console.error(
    'Verifikasi SMTP gagal. Periksa MAIL_HOST, MAIL_PORT, MAIL_USER, Password Aplikasi, alamat pengirim, dan kebijakan Google Workspace.',
  );
  process.exitCode = 1;
}
