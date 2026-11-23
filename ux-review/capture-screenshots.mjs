/**
 * Chụp ảnh UI các trang FE (nhánh hiện tại) để người dùng kiểm tra sau.
 *
 * - Chạy với dev server FE tại http://127.0.0.1:5173 (Vite).
 * - BE không cần chạy: mọi API bị chặn bằng `page.route` (mock).
 * - Auth giả bằng JWT fake trong localStorage (`mems.accessToken/mems.refreshToken`).
 * - Ảnh lưu vào `ux-review/screenshots/` (tên rõ ràng theo vai trò/trang).
 *
 * Chạy (PowerShell, từ D:\Final_Project):
 *   $node = "D:\AI skill\SEO\.venv\Lib\site-packages\playwright\driver\node.exe"
 *   & $node "ux-review\capture-screenshots.mjs"
 */

import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';

const requireFromFrontend = createRequire('D:/Final_Project/frontend/package.json');
const { chromium } = requireFromFrontend('playwright');

const BASE = process.env.UX_BASE || 'http://127.0.0.1:5173';
const CHANNEL = process.env.UX_CHANNEL || 'msedge';
const OUT_DIR = path.resolve('D:/Final_Project/ux-review/screenshots');

/* ----------------------------- helpers: auth ------------------------------ */

function b64url(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

function fakeJwt(claims) {
  return `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url(claims)}.fake-signature`;
}

function tokenFor({ roles = [], permissions = [], username = 'user.demo', userId = 'u-001' } = {}) {
  return fakeJwt({
    sub: username,
    userId,
    username,
    roles,
    permissions,
    exp: Math.floor(Date.now() / 1000) + 3600,
  });
}

async function newContext(browser, auth) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'vi-VN',
  });
  if (auth) {
    const access = tokenFor(auth);
    await context.addInitScript(
      ([accessToken]) => {
        localStorage.setItem('mems.accessToken', accessToken);
        localStorage.setItem('mems.refreshToken', 'fake-refresh-token');
      },
      [access],
    );
  }
  return context;
}

/* ----------------------------- helpers: mock ------------------------------ */

function json(route, data, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json; charset=utf-8',
    body: JSON.stringify(data),
  });
}

function makePaged(items, page = 1, size = 10, total = items.length) {
  const pages = Math.max(1, Math.ceil(total / size));
  return { items, total, page, size, pages };
}

const NOW = '2026-04-10T08:30:00Z';

const MODULES = [
  { code: 'STUDENT_MANAGEMENT', name: 'Quản lý học viên' },
  { code: 'SCHEDULE_MANAGEMENT', name: 'Quản lý lịch học' },
  { code: 'FINANCE_MANAGEMENT', name: 'Quản lý tài chính' },
  { code: 'HR_MANAGEMENT', name: 'Quản lý nhân sự' },
];

const PENDING_ORGS = [
  {
    id: 'org-p1',
    orgName: 'Trường THPT Minh Khai',
    orgType: 'school',
    ownerUsername: 'minhkhai_owner',
    ownerEmail: 'owner@minhkhai.edu.vn',
    createdAt: NOW,
    status: 'pending',
  },
  {
    id: 'org-p2',
    orgName: 'Trung tâm Anh ngữ Sunrise',
    orgType: 'center',
    ownerUsername: 'sunrise_owner',
    ownerEmail: 'contact@sunrise.edu.vn',
    createdAt: '2026-04-09T03:15:00Z',
    status: 'pending',
  },
];

const ORG_DETAIL_ACTIVE = {
  id: 'org-a1',
  name: 'Trường THPT Nguyễn Du',
  orgType: 'school',
  status: 'active',
  ownerUsername: 'nguyendu_owner',
  ownerEmail: 'owner@nguyendu.edu.vn',
  ownerFullName: 'Nguyễn Văn An',
  phone: '0901234567',
  address: '12 Lê Lợi, Quận 1, TP.HCM',
  createdAt: '2026-03-01T02:00:00Z',
  approvedAt: '2026-03-02T04:00:00Z',
  modules: [
    { code: 'STUDENT_MANAGEMENT', name: 'Quản lý học viên', status: 'active' },
    { code: 'SCHEDULE_MANAGEMENT', name: 'Quản lý lịch học', status: 'active' },
  ],
};

const ALL_ORGS_ITEMS = [
  {
    id: 'org-a1',
    name: 'Trường THPT Nguyễn Du',
    orgType: 'school',
    status: 'active',
    ownerEmail: 'owner@nguyendu.edu.vn',
    createdAt: '2026-03-01T02:00:00Z',
  },
  {
    id: 'org-p1',
    name: 'Trường THPT Minh Khai',
    orgType: 'school',
    status: 'pending',
    ownerEmail: 'owner@minhkhai.edu.vn',
    createdAt: NOW,
  },
  {
    id: 'org-s1',
    name: 'Trung tâm Luyện thi Sao Việt',
    orgType: 'center',
    status: 'suspended',
    ownerEmail: 'admin@saoviet.edu.vn',
    createdAt: '2026-02-20T07:00:00Z',
  },
  {
    id: 'org-r1',
    name: 'Trung tâm Tin học ABC',
    orgType: 'center',
    status: 'rejected',
    ownerEmail: 'abc@demo.edu.vn',
    createdAt: '2026-02-10T07:00:00Z',
  },
];

const ACCOUNTS = [
  {
    id: 'acc-001',
    username: 'nguyendu_owner',
    fullName: 'Nguyễn Văn An',
    email: 'owner@nguyendu.edu.vn',
    role: 'OWNER',
    status: 'active',
    organizationName: 'Trường THPT Nguyễn Du',
    organizationId: 'org-a1',
    createdAt: '2026-03-01T02:00:00Z',
    lastLoginAt: '2026-04-09T10:00:00Z',
  },
  {
    id: 'acc-002',
    username: 'hr_linh',
    fullName: 'Trần Thị Linh',
    email: 'linh@nguyendu.edu.vn',
    role: 'MANAGER',
    status: 'active',
    organizationName: 'Trường THPT Nguyễn Du',
    organizationId: 'org-a1',
    createdAt: '2026-03-05T02:00:00Z',
    lastLoginAt: '2026-04-08T09:00:00Z',
  },
  {
    id: 'acc-003',
    username: 'teacher_hung',
    fullName: 'Phạm Quốc Hùng',
    email: 'hung@nguyendu.edu.vn',
    role: 'TEACHER',
    status: 'locked',
    organizationName: 'Trường THPT Nguyễn Du',
    organizationId: 'org-a1',
    createdAt: '2026-03-06T02:00:00Z',
    lastLoginAt: null,
  },
];

const AUDIT_ITEMS = Array.from({ length: 12 }, (_, i) => ({
  id: `aud-${i + 1}`,
  actorId: i % 3 === 0 ? 'acc-admin' : 'acc-001',
  actorName: i % 3 === 0 ? 'Quản trị hệ thống' : 'Nguyễn Văn An',
  action: ['APPROVE_ORGANIZATION', 'REJECT_ORGANIZATION', 'UPDATE_MODULE', 'SUSPEND_ORGANIZATION', 'REACTIVATE_ORGANIZATION'][i % 5],
  entityType: 'ORGANIZATION',
  entityId: `org-a${(i % 3) + 1}`,
  entityName: ['Trường THPT Nguyễn Du', 'Trung tâm Sao Việt', 'Trường THPT Minh Khai'][i % 3],
  description: 'Thao tác quản trị mẫu để kiểm tra hiển thị nhật ký.',
  createdAt: new Date(Date.UTC(2026, 3, 10, 8, 0, 0) - i * 3600_000).toISOString(),
  metadata: null,
}));

const DEPARTMENTS = [
  { id: 'dep-1', name: 'Phòng Đào tạo', description: 'Quản lý chương trình và lịch học', createdAt: '2026-03-01T02:00:00Z' },
  { id: 'dep-2', name: 'Phòng Nhân sự', description: 'Tuyển dụng và hồ sơ nhân viên', createdAt: '2026-03-02T02:00:00Z' },
  { id: 'dep-3', name: 'Phòng Tài chính', description: null, createdAt: '2026-03-03T02:00:00Z' },
];

const POSITIONS = [
  {
    id: 'pos-1',
    name: 'Trưởng phòng Đào tạo',
    description: 'Chịu trách nhiệm điều phối giáo vụ',
    createdAt: '2026-03-01T02:00:00Z',
    permissions: ['PEOPLE_VIEW', 'PEOPLE_EDIT', 'CLASS_VIEW', 'CLASS_CREATE'],
    profileType: 'GENERAL',
  },
  {
    id: 'pos-2',
    name: 'Giáo viên bộ môn',
    description: 'Giảng dạy và quản lý lớp',
    createdAt: '2026-03-01T02:00:00Z',
    permissions: ['CLASS_VIEW'],
    profileType: 'TEACHER',
  },
];

const PERMISSIONS = [
  { code: 'PEOPLE_VIEW', description: 'Xem hồ sơ nhân sự' },
  { code: 'PEOPLE_EDIT', description: 'Chỉnh sửa hồ sơ nhân sự' },
  { code: 'CLASS_VIEW', description: 'Xem lớp học' },
  { code: 'CLASS_CREATE', description: 'Tạo lớp học' },
  { code: 'CLASS_EDIT', description: 'Chỉnh sửa lớp học' },
  { code: 'CLASS_ASSIGN_TEACHER', description: 'Phân công giáo viên' },
  { code: 'CLASS_CLOSE_REQUEST', description: 'Yêu cầu đóng lớp' },
  { code: 'CLASS_CLOSE_APPROVE', description: 'Duyệt/từ chối đóng lớp' },
  { code: 'CLASS_CANCEL', description: 'Hủy lớp' },
  { code: 'CLASS_REOPEN', description: 'Mở lại lớp' },
];

const MEMBERS_DEP1 = [
  { userId: 'u-m1', departmentId: 'dep-1', orgRole: 'MANAGER', positionIds: ['pos-1'], createdAt: '2026-03-10T02:00:00Z' },
  { userId: 'u-m2', departmentId: 'dep-1', orgRole: 'STAFF', positionIds: ['pos-2'], createdAt: '2026-03-11T02:00:00Z' },
];

const TEACHERS = [
  { userId: 't-1', employeeCode: 'GV001', fullName: 'Lê Minh Tuấn', specialtyNames: ['Toán', 'Vật lý'], teachingStatus: 'DANG_DAY', classCount: 3, noClass: false, classLabel: null },
  { userId: 't-2', employeeCode: 'GV002', fullName: 'Nguyễn Thu Hà', specialtyNames: ['Tiếng Anh'], teachingStatus: 'TAM_NGHI', classCount: 0, noClass: true, classLabel: 'Chưa có lớp' },
];

const TEACHER_DETAIL = {
  userId: 't-1',
  employeeCode: 'GV001',
  fullName: 'Lê Minh Tuấn',
  email: 'tuan@nguyendu.edu.vn',
  phone: '0912000111',
  teachingStatus: 'DANG_DAY',
  contractType: 'CO_HUU',
  specialties: [{ id: 'sp-1', name: 'Toán' }, { id: 'sp-2', name: 'Vật lý' }],
  departmentId: 'dep-1',
  departmentName: 'Phòng Đào tạo',
  positionId: 'pos-2',
  positionName: 'Giáo viên bộ môn',
  classes: [
    { id: 'c-1', name: 'Toán 10A', status: 'DANG_HOC' },
    { id: 'c-2', name: 'Vật lý 11B', status: 'SAP_KHAI_GIANG' },
  ],
  classCount: 2,
  noClass: false,
  classLabel: null,
};

const CLASSES = [
  { id: 'c-1', name: 'Toán 10A', status: 'DANG_HOC', closeRequestState: 'NONE', teacherName: 'Lê Minh Tuấn', startDate: '2026-03-01', endDate: '2026-06-30' },
  { id: 'c-2', name: 'Tiếng Anh 11B', status: 'SAP_KHAI_GIANG', closeRequestState: 'NONE', teacherName: null, startDate: '2026-05-01', endDate: '2026-08-30' },
  { id: 'c-3', name: 'Vật lý 12C', status: 'CHO_DONG', closeRequestState: 'PENDING', teacherName: 'Lê Minh Tuấn', startDate: '2026-01-01', endDate: '2026-04-01' },
];

const CLASS_DETAIL = {
  id: 'c-1',
  name: 'Toán 10A',
  status: 'DANG_HOC',
  closeRequestState: 'NONE',
  teacherId: 't-1',
  teacherName: 'Lê Minh Tuấn',
  specialtyId: 'sp-1',
  specialtyName: 'Toán',
  startDate: '2026-03-01',
  endDate: '2026-06-30',
  description: 'Lớp toán nâng cao khối 10',
  canAssignTeacher: true,
  canCancel: false,
  canRequestClose: true,
  canApproveClose: false,
  canRejectClose: false,
  canReopen: false,
};

function urlPath(url) {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

async function installMocks(page) {
  await page.route(/.*/, async (route) => {
    const req = route.request();
    const url = req.url();
    const method = req.method().toUpperCase();

    // Let the app itself (Vite assets, HMR, etc.) pass through.
    if (!url.startsWith(BASE) || url.includes('/@') || url.includes('/node_modules/') || url.includes('/src/') || /\.(js|mjs|ts|tsx|css|png|jpg|jpeg|svg|ico|woff2?|map)(\?|$)/i.test(url)) {
      return route.continue();
    }

    // Only mock API-ish paths; let navigations (HTML documents) through.
    const p = urlPath(url);
    const isApi = p.startsWith('/api/') || p.startsWith('/departments') || p.startsWith('/positions') || p.startsWith('/permissions');
    if (!isApi) return route.continue();

    // ---- Admin / modules ----
    if (p === '/api/v1/modules' && method === 'GET') return json(route, MODULES);
    if (p === '/api/v1/organizations/pending' && method === 'GET') return json(route, PENDING_ORGS);
    if (p === '/api/v1/organizations/options' && method === 'GET') {
      return json(route, ALL_ORGS_ITEMS.map((o) => ({ id: o.id, name: o.name })));
    }
    if (p === '/api/v1/organizations' && method === 'GET') return json(route, makePaged(ALL_ORGS_ITEMS, 1, 10, ALL_ORGS_ITEMS.length));
    if (/^\/api\/v1\/organizations\/[^/]+\/audit/.test(p) && method === 'GET') {
      return json(route, makePaged(AUDIT_ITEMS.slice(0, 6), 1, 10, 6));
    }
    if (/^\/api\/v1\/organizations\/[^/]+\/modules/.test(p) && method === 'GET') {
      return json(route, ORG_DETAIL_ACTIVE.modules);
    }
    if (/^\/api\/v1\/organizations\/[^/]+$/.test(p) && method === 'GET') return json(route, ORG_DETAIL_ACTIVE);

    if (p === '/api/v1/audit-logs' && method === 'GET') return json(route, makePaged(AUDIT_ITEMS, 1, 10, 25));
    if (p === '/api/v1/accounts' && method === 'GET') return json(route, makePaged(ACCOUNTS, 1, 10, ACCOUNTS.length));
    if (/^\/api\/v1\/accounts\/[^/]+\/audit-logs/.test(p) && method === 'GET') {
      return json(route, makePaged(AUDIT_ITEMS.slice(0, 5), 1, 10, 5));
    }
    if (/^\/api\/v1\/accounts\/[^/]+$/.test(p) && method === 'GET') return json(route, ACCOUNTS[0]);

    // ---- Owner ----
    if (p === '/departments' && method === 'GET') return json(route, DEPARTMENTS);
    if (/^\/departments\/[^/]+\/members$/.test(p) && method === 'GET') return json(route, MEMBERS_DEP1);
    if (/^\/departments\/[^/]+$/.test(p) && method === 'GET') return json(route, DEPARTMENTS[0]);
    if (p === '/positions' && method === 'GET') return json(route, POSITIONS);
    if (p === '/permissions' && method === 'GET') return json(route, PERMISSIONS);

    // ---- Sprint 4 ----
    if (p === '/api/teachers/assignable' && method === 'GET') {
      return json(route, makePaged([{ userId: 't-1', employeeCode: 'GV001', fullName: 'Lê Minh Tuấn', teachingStatus: 'DANG_DAY', specialtyNames: ['Toán'] }], 1, 10, 1));
    }
    if (p === '/api/teachers' && method === 'GET') return json(route, makePaged(TEACHERS, 1, 10, TEACHERS.length));
    if (/^\/api\/teachers\/[^/]+$/.test(p) && method === 'GET') return json(route, TEACHER_DETAIL);
    if (p === '/api/specialties' && method === 'GET') return json(route, [{ id: 'sp-1', name: 'Toán' }, { id: 'sp-2', name: 'Vật lý' }, { id: 'sp-3', name: 'Tiếng Anh' }]);
    if (p === '/api/classes' && method === 'GET') return json(route, makePaged(CLASSES, 1, 10, CLASSES.length));
    if (/^\/api\/classes\/[^/]+\/status-logs$/.test(p) && method === 'GET') {
      return json(route, [{ fromStatus: 'SAP_KHAI_GIANG', toStatus: 'DANG_HOC', at: NOW, actorId: 'u-m1', note: 'Bắt đầu khai giảng' }]);
    }
    if (/^\/api\/classes\/[^/]+\/close-events$/.test(p) && method === 'GET') return json(route, []);
    if (/^\/api\/classes\/[^/]+$/.test(p) && method === 'GET') return json(route, CLASS_DETAIL);

    // Default: return empty success-ish payload to avoid blocking renders.
    if (method === 'GET') return json(route, Array.isArray(null) ? [] : {});
    return json(route, {});
  });
}

/* --------------------------- helpers: capture ----------------------------- */

async function capture(page, name, options = {}) {
  const file = path.join(OUT_DIR, `${name}.png`);
  await page.waitForTimeout(options.waitMs ?? 1200);
  // Try to wait for spinners to go away a bit, but don't hang forever.
  try {
    await page.waitForSelector('[aria-busy="true"]', { state: 'detached', timeout: 3000 });
  } catch {
    // ignore
  }
  await page.waitForTimeout(300);
  await page.screenshot({ path: file, fullPage: !!options.fullPage });
  console.log(`saved: ${path.relative('D:/Final_Project', file).replace(/\\/g, '/')}`);
}

async function gotoAndCapture(page, urlPath, name, options = {}) {
  await page.goto(`${BASE}${urlPath}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await capture(page, name, options);
}

/* -------------------------------- main ------------------------------------ */

async function run() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ channel: CHANNEL, headless: true });
  const summary = [];

  try {
    // 1) Public pages (no auth)
    {
      const context = await newContext(browser, null);
      const page = await context.newPage();
      await installMocks(page);
      await gotoAndCapture(page, '/dang-nhap', '01-public-login');
      await gotoAndCapture(page, '/dang-ky', '02-public-register');
      await gotoAndCapture(page, '/quen-mat-khau', '03-public-forgot-password');
      await gotoAndCapture(page, '/dat-lai-mat-khau', '04-public-reset-password-no-token');
      await gotoAndCapture(page, '/trang-khong-ton-tai', '05-public-not-found');
      summary.push('Public: login, register, forgot-password, reset-password(no token), 404');
      await context.close();
    }

    // 2) Admin console (SUPER_ADMIN)
    {
      const context = await newContext(browser, {
        roles: ['SUPER_ADMIN'],
        permissions: [],
        username: 'admin.hethong',
        userId: 'admin-1',
      });
      const page = await context.newPage();
      await installMocks(page);
      await gotoAndCapture(page, '/quan-tri', '10-admin-overview');
      await gotoAndCapture(page, '/quan-tri/to-chuc', '11-admin-pending-organizations');
      await gotoAndCapture(page, '/quan-tri/to-chuc/tat-ca', '12-admin-all-organizations');
      await gotoAndCapture(page, '/quan-tri/to-chuc/org-a1', '13-admin-organization-detail');
      await gotoAndCapture(page, '/quan-tri/to-chuc/org-a1/lich-su', '14-admin-organization-audit');
      await gotoAndCapture(page, '/quan-tri/tai-khoan', '15-admin-accounts');
      await gotoAndCapture(page, '/quan-tri/tai-khoan/acc-001', '16-admin-account-detail');
      await gotoAndCapture(page, '/quan-tri/nhat-ky', '17-admin-audit-log');
      await gotoAndCapture(page, '/quan-tri/module', '18-admin-modules');
      summary.push('Admin: overview, pending, all-orgs, org-detail, org-audit, accounts, account-detail, audit-log, modules');
      await context.close();
    }

    // 3) Owner console (OWNER) - /to-chuc
    {
      const context = await newContext(browser, {
        roles: ['OWNER'],
        permissions: [],
        username: 'chu.to.chuc',
        userId: 'owner-1',
      });
      const page = await context.newPage();
      await installMocks(page);
      // Index of /to-chuc is DepartmentsPage (owner "overview"/landing in this console)
      await gotoAndCapture(page, '/to-chuc', '20-owner-departments-overview');
      await gotoAndCapture(page, '/to-chuc/phong-ban/dep-1', '21-owner-department-detail');
      await gotoAndCapture(page, '/to-chuc/chuc-vu', '22-owner-positions-permissions');
      summary.push('Owner: departments(overview), department-detail, positions/quyền');
      await context.close();
    }

    // 4) Academic/teacher area (/dao-tao) - user with view permissions
    {
      const context = await newContext(browser, {
        roles: ['ACADEMIC_STAFF'],
        permissions: ['PEOPLE_VIEW', 'PEOPLE_EDIT', 'CLASS_VIEW', 'CLASS_CREATE', 'CLASS_EDIT', 'CLASS_ASSIGN_TEACHER', 'CLASS_CLOSE_REQUEST', 'CLASS_CLOSE_APPROVE'],
        username: 'giao.vu',
        userId: 'acad-1',
      });
      const page = await context.newPage();
      await installMocks(page);
      await gotoAndCapture(page, '/dao-tao/giao-vien', '30-academic-teachers');
      await gotoAndCapture(page, '/dao-tao/giao-vien/t-1', '31-academic-teacher-detail');
      await gotoAndCapture(page, '/dao-tao/lop-hoc', '32-academic-classes');
      await gotoAndCapture(page, '/dao-tao/lop-hoc/c-1', '33-academic-class-detail');
      summary.push('Academic/Đào tạo: teachers, teacher-detail, classes, class-detail');
      await context.close();
    }

    // 5) Role preview pages (public/auth preview screens)
    {
      const context = await newContext(browser, null);
      const page = await context.newPage();
      await installMocks(page);
      await gotoAndCapture(page, '/xem-thu/platform-admin', '40-role-preview-platform-admin');
      await gotoAndCapture(page, '/xem-thu/org-owner', '41-role-preview-org-owner');
      await gotoAndCapture(page, '/xem-thu/teacher', '42-role-preview-teacher');
      summary.push('Role preview: platform-admin, org-owner, teacher');
      await context.close();
    }

    console.log('\n=== DONE ===');
    console.log(`Output dir: ux-review/screenshots`);
    for (const line of summary) console.log(`- ${line}`);
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
