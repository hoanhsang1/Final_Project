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
await page.waitForTimeout(800);
await page.screenshot({ path: '../docs/.preview/submenu.png' });

const items = await page.evaluate(() => {
  return [...document.querySelectorAll('.mxPopupMenuItem, .geItem, [role=menuitem]')]
    .filter((n) => n.offsetParent !== null)
    .map((n) => (n.textContent || '').trim())
    .filter(Boolean);
});
console.log(JSON.stringify(items, null, 2));
await browser.close();
