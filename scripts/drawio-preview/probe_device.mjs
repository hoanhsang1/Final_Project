import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1760, height: 1500 } });
await page.goto('https://app.diagrams.net/?splash=0&offline=0&noExitBtn=1', {
  waitUntil: 'domcontentloaded',
  timeout: 90000,
});
await page.waitForTimeout(6000);

await page.getByRole('button', { name: 'File', exact: true }).first().click();
await page.waitForTimeout(500);
await page.getByText('Open from', { exact: true }).first().hover();
await page.waitForTimeout(600);

const items = page.locator('.mxPopupMenuItem', { hasText: 'Device...' });
console.log('device items:', await items.count());
for (let i = 0; i < await items.count(); i++) {
  console.log(i, await items.nth(i).isVisible(), await items.nth(i).boundingBox());
}

await items.last().click({ force: true });
await page.waitForTimeout(1500);
console.log('file inputs:', await page.evaluate(() => [...document.querySelectorAll('input[type=file]')].map((i) => i.outerHTML)));
await page.screenshot({ path: '../docs/.preview/after_device.png' });
await browser.close();
