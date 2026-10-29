/* global window, document, innerWidth */
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const root = resolve('test-results/performance-local');
const label = process.argv[2] ?? 'baseline';
if (!/^[a-z][a-z0-9-]*$/.test(label)) throw new Error('Invalid report label');
const marker = JSON.parse(await readFile(resolve(root, 'marker.json'), 'utf8'));
if (marker.data !== resolve(root, 'mysql-data') || marker.tlsPort !== 3443) throw new Error('Invalid target');
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const path of ['/', '/produk-hukum', '/produk-hukum/load-1']) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, ignoreHTTPSErrors: true });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.addInitScript(() => {
      window.__loadMetrics = { cls: 0, lcpMs: 0, longTasks: 0, longTaskMs: 0 };
      new PerformanceObserver(list => { for (const entry of list.getEntries()) window.__loadMetrics.lcpMs = entry.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver(list => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__loadMetrics.cls += entry.value; }).observe({ type: 'layout-shift', buffered: true });
      new PerformanceObserver(list => { for (const entry of list.getEntries()) { window.__loadMetrics.longTasks++; window.__loadMetrics.longTaskMs += entry.duration; } }).observe({ type: 'longtask', buffered: true });
    });
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 100, downloadThroughput: 1600000 / 8, uploadThroughput: 750000 / 8 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.goto('https://localhost:3443' + path);
    await page.getByRole('heading', { level: 1 }).waitFor();
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);
    const row = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      const resources = performance.getEntriesByType('resource');
      return { ...window.__loadMetrics, ttfbMs: navigation.responseStart - navigation.requestStart, fcpMs: performance.getEntriesByName('first-contentful-paint')[0]?.startTime, domContentLoadedMs: navigation.domContentLoadedEventEnd, transferredBytes: navigation.transferSize + resources.reduce((n, r) => n + r.transferSize, 0), scriptBytes: resources.filter(r => r.initiatorType === 'script').reduce((n, r) => n + r.encodedBodySize, 0), heroBytes: resources.filter(r => r.name.includes('_next/image')).reduce((n, r) => n + r.encodedBodySize, 0), pdfRequests: resources.filter(r => r.name.includes('/files/')).length, requests: resources.length + 1, overflow: document.documentElement.scrollWidth > innerWidth + 1 };
    });
    if (path === '/') await page.screenshot({ path: resolve(root, `${label}-home-mobile.png`), fullPage: true });
    if (path === '/produk-hukum/load-1' && label.startsWith('optimized')) {
      await page.locator('#pratinjau').scrollIntoViewIfNeeded();
      if (await page.evaluate(() => navigator.pdfViewerEnabled !== false)) {
        await page.getByTitle('Pratinjau uji-beban.pdf').waitFor();
        row.previewLoadedAfterScroll = true;
      } else {
        await page.getByText(/Peramban ini tidak dapat menampilkan PDF/).waitFor();
        row.nativePdfUnsupported = true;
      }
    }
    results.push({ path, ...row, errors });
    if (errors.length || row.overflow) process.exitCode = 1;
    if (label.startsWith('optimized') && path !== '/produk-hukum/load-1' && (row.heroBytes <= 0 || row.heroBytes > 200000)) process.exitCode = 1;
    console.log(JSON.stringify(results.at(-1)));
    await context.close();
  }
  await writeFile(resolve(root, `${label}-browser.json`), JSON.stringify({ label, profile: 'Chromium mobile 390x844, 4x CPU slowdown, 100ms RTT, 1.6 Mbps download, cold HTTP cache', results, notes: ['Synthetic local lab metrics; not field Core Web Vitals or INP.', 'Mobile network/CPU emulated on shared Windows test host.'] }, null, 2));
} finally { await browser.close(); }
