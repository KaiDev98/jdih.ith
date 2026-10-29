/* global document, innerWidth */
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium, webkit } = require(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const root = resolve('test-results/performance-local');
const marker = JSON.parse(await readFile(resolve(root, 'marker.json')));
assert.equal(marker.data, resolve(root, 'mysql-data'));
assert.equal(marker.tlsPort, 3443);
const sessions = JSON.parse(await readFile(resolve(root, 'sessions.private.json')));
const rows = [];
const detailOnly = process.argv.includes('--detail-only');
for (const [name, engine, options] of [['Chromium', chromium, {}], ['Edge', chromium, { channel: 'msedge' }], ['WebKit', webkit, {}]]) {
  const browser = await engine.launch({ headless: true, ...options });
  try {
    for (const width of [320, 1440]) {
      for (const role of detailOnly ? ['anonymous', 'DOSEN_STAF'] : ['anonymous', 'DOSEN_STAF', 'ADMIN', 'SUPERADMIN']) {
        const context = await browser.newContext({ viewport: { width, height: 900 }, ignoreHTTPSErrors: true, reducedMotion: 'reduce' });
        if (role !== 'anonymous') await context.addCookies([{ name: 'jdih_session', value: sessions.find(s => s.role === role).token, domain: 'localhost', path: '/', secure: true, httpOnly: true, sameSite: 'Lax' }]);
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
        const prefix = role === 'SUPERADMIN' ? '/superadmin' : '/admin';
        const paths = detailOnly ? ['/produk-hukum/load-1'] : ['ADMIN', 'SUPERADMIN'].includes(role)
          ? [prefix, prefix + '/dokumen/baru', prefix + '/dokumen/verifikasi']
          : role === 'DOSEN_STAF' ? ['/', '/produk-hukum', '/akun'] : ['/', '/produk-hukum', '/masuk/admin', '/masuk/superadmin', '/masuk'];
        for (const path of paths) {
          const response = await page.goto('https://localhost:3443' + path);
          await page.getByRole('heading', { level: 1 }).first().waitFor();
          await page.waitForLoadState('networkidle');
          if (detailOnly) {
            await page.locator('#pratinjau').scrollIntoViewIfNeeded();
            if (await page.evaluate(() => navigator.pdfViewerEnabled !== false))
              await page.getByTitle('Pratinjau uji-beban.pdf').waitFor({ state: 'attached' });
            else await page.getByText(/Peramban ini tidak dapat menampilkan PDF/).waitFor();
          }
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
          assert.equal(response.status(), 200, `${name} ${role} ${path}`);
          assert.equal(overflow, false, `Horizontal overflow ${name} ${width} ${path}`);
          assert.equal(errors.length, 0, `${name} ${role} ${path}: ${errors.join('; ')}`);
          rows.push({ browser: name, width, role, path, ok: true });
        }
        await context.close();
      }
    }
  } finally { await browser.close(); }
}
await writeFile(resolve(root, detailOnly ? 'detail-smoke.json' : 'smoke.json'), JSON.stringify({ date: new Date().toISOString(), checks: rows.length, rows }, null, 2));
console.log(`PASS ${rows.length} production page/role/viewport checks across Chromium, Edge and WebKit; no page errors, CSP errors or horizontal overflow.`);
