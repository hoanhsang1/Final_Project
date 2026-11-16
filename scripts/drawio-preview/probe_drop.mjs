import { chromium } from 'playwright';
import fs from 'node:fs';

const xml = fs.readFileSync('../docs/MEMS_so_do_chuc_nang_theo_vai_tro.drawio', 'utf8');

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1760, height: 1500 } });
await page.goto('https://app.diagrams.net/?splash=0&offline=0&noExitBtn=1', {
  waitUntil: 'domcontentloaded',
  timeout: 90000,
});
await page.waitForTimeout(6000);

const result = await page.evaluate(async (text) => {
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
  return { dropped: true, targets: targets.length };
}, xml);

console.log(result);
await page.waitForTimeout(5000);
console.log('title:', await page.title());
console.log(
  'tabs:',
  await page.evaluate(() =>
    [...document.querySelectorAll('.geTab')].map((t) => (t.textContent || '').trim()),
  ),
);
await page.screenshot({ path: '../docs/.preview/after_drop.png' });
await browser.close();
