import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1700, height: 1400 } });
await page.goto('https://app.diagrams.net/?splash=0&offline=0&noExitBtn=1', {
  waitUntil: 'domcontentloaded',
  timeout: 90000,
});
await page.waitForTimeout(6000);

await page.getByRole('button', { name: 'File', exact: true }).first().click();
await page.waitForTimeout(800);

const items = await page.evaluate(() => {
  const nodes = [...document.querySelectorAll('.geItem, [role=menuitem], .mxPopupMenuItem')];
  return nodes
    .filter((n) => n.offsetParent !== null)
    .map((n) => (n.textContent || '').trim())
    .filter(Boolean)
    .slice(0, 60);
});
console.log(JSON.stringify(items, null, 2));
await browser.close();
