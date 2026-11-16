import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

// usage: node crop.mjs <png> <x> <y> <w> <h> <scale> <out>
const [png, x, y, w, h, scale, out] = process.argv.slice(2);
const src = path.resolve(png);
const b64 = fs.readFileSync(src).toString('base64');

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({
  viewport: { width: Math.round(Number(w) * Number(scale)), height: Math.round(Number(h) * Number(scale)) },
});
await page.setContent(
  `<body style="margin:0;overflow:hidden"><img src="data:image/png;base64,${b64}" style="position:absolute;left:${-x * scale}px;top:${-y * scale}px;width:calc(100% * ${scale});transform-origin:0 0;image-rendering:auto"></body>`,
  { waitUntil: 'load' },
);
await page.waitForTimeout(300);
await page.screenshot({ path: path.resolve(out) });
await browser.close();
