/** Fail without printing secret values. Checks tracked files, including the index. */
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { resolve } from 'node:path';

const git = process.env.GIT_BIN ?? 'git';
const result = spawnSync(git, ['ls-files', '-z'], { encoding: 'utf8', windowsHide: true });
if (result.status !== 0) throw new Error('Cannot enumerate tracked release files');
const files = result.stdout.split('\0').filter(Boolean);
const knownSecrets = new Set();
for (const path of ['.env.v2.local', 'backend/.env.identity.local', 'backend/.env.mail.local', 'frontend/.env']) {
  if (!existsSync(path)) continue;
  for (const [key, value] of Object.entries(parseEnv(readFileSync(path, 'utf8')))) {
    if (/(?:SECRET|PASSWORD|SESSION_KEY|PRIVATE_KEY)$/.test(key) && value.length >= 12)
      knownSecrets.add(value);
  }
}
const failures = [];
for (const path of files) {
  const reason = /(^|\/)\.env(?:\.|$)/.test(path) && !/\.example$/.test(path)
    ? 'private environment file'
    : /^(?:backend\/storage|frontend\/public\/uploads|storage|uploads|test-results|Hero_Sec)\//.test(path) ||
      /(?:^|\/)(?:[^/]+\.private\.[^/]+|tls\.key|[^/]+\.(?:p12|pfx))$/.test(path)
      ? 'private runtime/reference artifact' : undefined;
  if (reason) { failures.push({ path, reason }); continue; }
  if (!existsSync(resolve(path))) continue; // a tracked deletion is harmless
  const bytes = readFileSync(path);
  if (bytes.includes(0)) continue;
  const content = bytes.toString('utf8');
  if (/-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----/.test(content) ||
      /\b(?:gh[pousr]_[a-zA-Z0-9]{36,}|github_pat_[a-zA-Z0-9_]{70,}|GOCSPX-[a-zA-Z0-9_-]{24,}|(?:AKIA|ASIA)[A-Z0-9]{16})\b/.test(content))
    failures.push({ path, reason: 'credential/private-key signature' });
  if ([...knownSecrets].some(value => content.includes(value)))
    failures.push({ path, reason: 'matches a local private credential' });
}
if (failures.length) {
  for (const { path, reason } of failures) console.error(`FAIL ${path}: ${reason}`);
  process.exitCode = 1;
} else console.log(`Release file check passed: ${files.length} tracked files; no detected private artifacts or credentials.`);
