/**
 * ux-review/probe-heading-css.mjs — CHẨN ĐOÁN: `antd/dist/reset.css` có đang
 * đè kiểu Heading của Astryx không?
 *
 * `main.tsx` dòng 12 ghi "KHÔNG import antd/dist/reset.css nữa" nhưng dòng 28
 * vẫn import. Reset của antd KHÔNG nằm trong `@layer` nào, mà CSS không layer
 * luôn thắng CSS có layer → nghi ngờ nó đè `margin-bottom`/`font-weight` của
 * Heading Astryx.
 *
 * Chạy: & $node "ux-review\probe-heading-css.mjs"
 */

import { createRequire } from 'node:module';
const requireFromFrontend = createRequire('D:/Final_Project/frontend/package.json');
const { chromium } = requireFromFrontend('playwright');

const BASE = process.env.UX_BASE || 'http://127.0.0.1:5173';
const CHANNEL = process.env.UX_CHANNEL || 'msedge';

const browser = await chromium.launch({ channel: CHANNEL, headless: true });
const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: 'vi-VN' });
const page = await context.newPage();
// Trang đăng nhập đã port sang Astryx, không cần phiên → h1 là Heading của Astryx.
await page.goto(BASE + '/dang-nhap', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(600);

const result = await page.evaluate(() => {
  const h1 = document.querySelector('main h1') || document.querySelector('h1');
  const cs = h1 ? getComputedStyle(h1) : null;

  // Tìm rule `h1..h6` của antd reset trong các stylesheet đang áp.
  let antdResetRule = null;
  let resetSheetFound = false;
  for (const sheet of Array.from(document.styleSheets)) {
    let rules;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of Array.from(rules || [])) {
      const sel = rule.selectorText || '';
      if (/^h1,\s*h2,\s*h3/.test(sel.replace(/\s+/g, ' ').trim())) {
        antdResetRule = sel.replace(/\s+/g, ' ').trim() + ' { ' + (rule.style?.cssText || '').trim() + ' }';
      }
      // Sheet reset của antd cũng chứa rule `body { margin: 0 }` + `p { margin-bottom: 1em }`
      if (/^p$/.test(sel.trim()) && /margin-bottom:\s*1em/.test(rule.style?.cssText || '')) {
        resetSheetFound = true;
      }
    }
  }

  // Heading Astryx có tự khai trong layer không?
  let astryxHeadingRule = null;
  for (const sheet of Array.from(document.styleSheets)) {
    let rules;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of Array.from(rules || [])) {
      // CSSLayerBlockRule
      if (rule.constructor?.name === 'CSSLayerBlockRule' && /astryx/.test(rule.name || '')) {
        const found = Array.from(rule.cssRules || []).find((r) => /heading|h1|\.astryx-.*h1/i.test(r.selectorText || ''));
        if (found && !astryxHeadingRule) {
          astryxHeadingRule = (found.selectorText || '').slice(0, 120) + ' { ' + (found.style?.cssText || '').slice(0, 160) + ' }';
        }
      }
    }
  }

  return {
    h1Text: h1 ? h1.textContent.trim() : null,
    h1ClassName: h1 ? h1.className : null,
    computed: cs ? { fontSize: cs.fontSize, fontWeight: cs.fontWeight, marginBottom: cs.marginBottom, marginTop: cs.marginTop } : null,
    antdResetHeadingRulePresent: Boolean(antdResetRule),
    antdResetHeadingRule: antdResetRule,
    antdResetSheetFound: resetSheetFound,
    astryxHeadingRuleSample: astryxHeadingRule,
  };
});

console.log(JSON.stringify(result, null, 2));
await browser.close();
