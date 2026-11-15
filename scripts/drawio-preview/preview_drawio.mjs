import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(new URL('../../frontend/package.json', import.meta.url));
const { chromium } = require('playwright');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const filePath = path.join(root, 'docs/MEMS_so_do_chuc_nang_theo_vai_tro.drawio');
const xml = fs.readFileSync(filePath, 'utf8');
const outDir = path.join(root, 'docs/.preview');
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1760, height: 1500 } });
await page.goto('https://app.diagrams.net/?splash=0&offline=0&noExitBtn=1', {
  waitUntil: 'domcontentloaded',
  timeout: 90000,
});
await page.waitForTimeout(6000);

await page.evaluate((text) => {
  const file = new File([text], 'MEMS.drawio', { type: 'application/xml' });
  const dt = new DataTransfer();
  dt.items.add(file);
  const targets = [
    document.querySelector('.geDiagramContainer'),
    document.querySelector('.geEditor'),
    document.body,
  ].filter(Boolean);
  for (const t of targets) {
    for (const type of ['dragenter', 'dragover', 'drop']) {
      t.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt }));
    }
  }
}, xml);

await page.waitForTimeout(5000);

const tabs = await page.evaluate(() =>
  [...document.querySelectorAll('.geTab')].map((t) => (t.textContent || '').trim()).filter(Boolean),
);
console.log('pages:', tabs.length);

for (let i = 0; i < tabs.length; i++) {
  const tab = page.locator('.geTab', { hasText: tabs[i] }).first();
  await tab.click({ force: true });
  await page.waitForTimeout(800);

  await page.getByRole('button', { name: 'View', exact: true }).first().click();
  await page.waitForTimeout(400);
  const fit = page.getByText('Fit Page', { exact: true }).first();
  if (await fit.count()) {
    await fit.click({ force: true });
  } else {
    await page.keyboard.press('Escape');
    await page.keyboard.press('Control+Shift+h');
  }
  await page.waitForTimeout(900);

  const target = (await page.locator('.geDiagramContainer').count())
    ? page.locator('.geDiagramContainer').first()
    : page.locator('.geEditor').first();
  const file = path.join(outDir, `page${i + 1}.png`);
  await target.screenshot({ path: file });
  console.log('saved', file, '|', tabs[i]);
}

await browser.close();
