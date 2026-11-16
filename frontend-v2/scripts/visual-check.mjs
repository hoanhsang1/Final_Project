import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import path from 'node:path'

const require = createRequire('D:/User/documents/Final_Project/Final_Project/frontend/package.json')
const { chromium } = require('playwright')

const BASE = 'http://localhost:5174'
const OUT = path.resolve('docs/screenshots')
mkdirSync(OUT, { recursive: true })

const errors = []

async function newPage(browser, viewport) {
  const context = await browser.newContext({ viewport, locale: 'vi-VN' })
  const page = await context.newPage()
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`[console] ${message.text()}`)
  })
  page.on('pageerror', (error) => errors.push(`[pageerror] ${error.message}`))
  return { context, page }
}

async function login(page, username, password) {
  await page.goto(`${BASE}/dang-nhap`, { waitUntil: 'networkidle' })
  await page.getByLabel(/Tên đăng nhập/).fill(username)
  await page.getByLabel(/^Mật khẩu/).fill(password)
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await page.waitForURL((url) => !url.pathname.includes('dang-nhap'), { timeout: 15000 })
  await page.waitForTimeout(900)
}

const browser = process.env.CDP_URL
  ? await chromium.connectOverCDP(process.env.CDP_URL)
  : await chromium.launch({ channel: 'chrome', headless: true })

// Desktop owner flow
const owner = await newPage(browser, { width: 1440, height: 900 })
await owner.page.goto(`${BASE}/dang-nhap`, { waitUntil: 'networkidle' })
await owner.page.screenshot({ path: `${OUT}/01-login.png`, fullPage: true })
await login(owner.page, 'sample_owner', 'Sample@123456')
await owner.page.screenshot({ path: `${OUT}/02-owner-dashboard.png`, fullPage: true })

await owner.page.goto(`${BASE}/to-chuc/phong-ban`, { waitUntil: 'networkidle' })
await owner.page.waitForTimeout(700)
await owner.page.screenshot({ path: `${OUT}/03-departments.png`, fullPage: true })

await owner.page.goto(`${BASE}/to-chuc/nhan-su`, { waitUntil: 'networkidle' })
await owner.page.waitForTimeout(1800)
await owner.page.screenshot({ path: `${OUT}/04-employees.png`, fullPage: true })

const profileButton = owner.page.getByRole('button', { name: 'Hồ sơ' }).first()
if (await profileButton.count()) {
  await profileButton.click()
  await owner.page.waitForTimeout(1200)
  await owner.page.screenshot({ path: `${OUT}/05-employee-profile.png`, fullPage: false })
}

await owner.page.goto(`${BASE}/to-chuc/phong-ban/dept-1`, { waitUntil: 'networkidle' })
await owner.page.waitForTimeout(1500)
await owner.page.screenshot({ path: `${OUT}/06-department-detail.png`, fullPage: true })

await owner.context.close()

// Platform admin flow
const admin = await newPage(browser, { width: 1440, height: 900 })
await login(admin.page, 'platform_admin', '123456')
await admin.page.screenshot({ path: `${OUT}/07-platform-dashboard.png`, fullPage: true })

await admin.page.goto(`${BASE}/quan-tri/to-chuc`, { waitUntil: 'networkidle' })
await admin.page.waitForTimeout(900)
await admin.page.screenshot({ path: `${OUT}/08-organizations.png`, fullPage: true })
await admin.context.close()

// Mobile owner flow
const mobile = await newPage(browser, { width: 390, height: 844 })
await mobile.page.goto(`${BASE}/dang-nhap`, { waitUntil: 'networkidle' })
await mobile.page.screenshot({ path: `${OUT}/09-mobile-login.png`, fullPage: true })
await login(mobile.page, 'sample_hr', 'Sample@123456')
await mobile.page.screenshot({ path: `${OUT}/10-mobile-dashboard.png`, fullPage: true })
await mobile.context.close()

await browser.close()

console.log(`ERRORS=${errors.length}`)
for (const error of errors.slice(0, 20)) console.log(error)
