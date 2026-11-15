import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

// usage: node crop2.mjs <png> <x> <y> <w> <h> <scale> <out>
const [png, x, y, w, h, scale, out] = process.argv.slice(2);
const src = path.resolve(png);
const b64 = fs.readFileSync(src).toString('base64');

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
await page.setContent('<body></body>');
const dataUrl = await page.evaluate(
  async ({ b64, x, y, w, h, scale }) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + b64;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = w * scale;
    c.height = h * scale;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, x, y, w, h, 0, 0, w * scale, h * scale);
    return c.toDataURL('image/png');
  },
  { b64, x: Number(x), y: Number(y), w: Number(w), h: Number(h), scale: Number(scale) },
);
fs.writeFileSync(path.resolve(out), Buffer.from(dataUrl.split(',')[1], 'base64'));
await browser.close();
console.log('ok', out);
