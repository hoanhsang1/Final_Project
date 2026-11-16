import { chromium } from 'playwright';
import path from 'node:path';

const outDir = path.resolve('../docs/.preview');

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1700, height: 1400 } });

await page.goto('https://app.diagrams.net/?splash=0&offline=0&noExitBtn=1', {
  waitUntil: 'domcontentloaded',
  timeout: 90000,
});
await page.waitForTimeout(8000);

console.log('title:', await page.title());
await page.screenshot({ path: path.join(outDir, 'probe0.png') });

const names = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button,[role=button],[role=menuitem],a')];
  const wanted = btns
    .map((b) => (b.getAttribute('aria-label') || b.textContent || '').trim())
    .filter((t) => t && t.length < 30);
  return {
    tabs: document.querySelectorAll('.geTab').length,
    inputs: [...document.querySelectorAll('input')].map((i) => i.type).slice(0, 30),
    labels: [...new Set(wanted)].slice(0, 80),
  };
});
console.log(JSON.stringify(names, null, 2));

await browser.close();
