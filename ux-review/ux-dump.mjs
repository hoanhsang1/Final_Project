/**
 * ux-review/ux-dump.mjs — "ảnh dạng chữ" của toàn bộ app MEMS (Giai đoạn 2).
 *
 * RÀNG BUỘC ĐÃ TUÂN THỦ:
 *  - Chỉ ĐỌC app; KHÔNG gọi API thật ghi dữ liệu. Mọi endpoint bị chặn bằng
 *    `page.route` (BE không chạy trên máy này).
 *  - Không cài thêm thư viện. Dùng `playwright` đã có trong frontend/node_modules.
 *  - Ghi UTF-8 vào `ux-review/dumps/`.
 *
 * Cách chạy (PowerShell, từ D:\Final_Project):
 *   $node = "D:\AI skill\SEO\.venv\Lib\site-packages\playwright\driver\node.exe"
 *   & $node "ux-review\ux-dump.mjs"
 *
 * Biến môi trường tuỳ chọn:
 *   UX_BASE      (mặc định http://127.0.0.1:5173)
 *   UX_CHANNEL   (mặc định msedge; đổi sang chrome nếu cần)
 *   UX_ONLY      lọc theo id kịch bản (khớp chuỗi con)
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

// `playwright` nằm trong frontend/node_modules → resolve từ đó (script ở repo root).
const requireFromFrontend = createRequire('D:/Final_Project/frontend/package.json');
const { chromium } = requireFromFrontend('playwright');

const BASE = process.env.UX_BASE || 'http://127.0.0.1:5173';
const CHANNEL = process.env.UX_CHANNEL || 'msedge';
const ONLY = process.env.UX_ONLY || '';
const OUT_DIR = 'D:/Final_Project/ux-review/dumps';

const VIEWPORTS = {
  desktop: { width: 1366, height: 768 },
  mobile: { width: 375, height: 667 },
  // Yêu cầu responsive chốt mốc nhỏ nhất 320px → đo riêng để có bằng chứng cứng.
  narrow: { width: 320, height: 640 },
};

/* ─────────────────────────── JWT giả (chỉ để UI đọc claim) ─────────────── */

function b64url(obj) {
  return Buffer.from(JSON.stringify(obj), 'utf8').toString('base64url');
}
function fakeJwt(claims) {
  return `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url(claims)}.fake-signature`;
}
function tokenFor(roles, permissions = [], username = 'nguoi.dung') {
  return fakeJwt({
    userId: '11111111-1111-4111-8111-111111111111',
    username,
    roles,
    permissions,
    exp: Math.floor(Date.now() / 1000) + 3600,
  });
}

const ROLE_SUPER_ADMIN = { roles: ['SUPER_ADMIN'], permissions: [], username: 'admin.he.thong' };
const ROLE_OWNER = { roles: ['OWNER'], permissions: [], username: 'chu.to.chuc' };
const ROLE_ACADEMIC = {
  roles: ['ACADEMIC_STAFF'],
  permissions: ['PEOPLE_VIEW', 'PEOPLE_EDIT', 'CLASS_VIEW', 'CLASS_CLOSE_APPROVE'],
  username: 'giao.vu',
};
const ROLE_TEACHER = { roles: ['TEACHER'], permissions: [], username: 'giao.vien' };

/* ─────────────────────────── Dữ liệu mẫu (theo DTO thật) ────────────────── */

const MODULES = [
  { code: 'STUDENT_MANAGEMENT', name: 'Quản lý sinh viên' },
  { code: 'CLASS_MANAGEMENT', name: 'Quản lý lớp học' },
  { code: 'SCHEDULE_MANAGEMENT', name: 'Quản lý thời khoá biểu' },
  { code: 'FACILITY_MANAGEMENT', name: 'Quản lý cơ sở vật chất' },
  { code: 'TEACHER_ASSIGNMENT', name: 'Phân công giáo viên' },
];

const PENDING_ORGS = [
  {
    id: 'org-p1',
    name: 'Trường THPT Nguyễn Du',
    org_type: 'school',
    status: 'pending',
    owner_username: 'nguyendu.owner',
    owner_email: 'owner@nguyendu.edu.vn',
  },
  {
    id: 'org-p2',
    name: 'Trung tâm Anh ngữ Sunrise',
    org_type: 'center',
    status: 'pending',
    owner_username: 'sunrise.owner',
    owner_email: 'owner@sunrise.vn',
  },
];

const ORG_LIST = [
  {
    id: 'org-1',
    name: 'Trường THPT Nguyễn Du',
    org_type: 'school',
    status: 'active',
    owner_username: 'nguyendu.owner',
    owner_email: 'owner@nguyendu.edu.vn',
    created_at: '2026-10-01T08:30:00',
  },
  {
    id: 'org-2',
    name: 'Trung tâm Anh ngữ Sunrise',
    org_type: 'center',
    status: 'pending',
    owner_username: 'sunrise.owner',
    owner_email: 'owner@sunrise.vn',
    created_at: '2026-10-05T14:10:00',
  },
  {
    id: 'org-3',
    name: 'Trường Tiểu học Bình Minh',
    org_type: 'school',
    status: 'suspended',
    owner_username: 'binhminh.owner',
    owner_email: 'owner@binhminh.edu.vn',
    created_at: '2026-09-20T09:00:00',
  },
];

const ORG_DETAIL = {
  organization: {
    id: 'org-1',
    name: 'Trường THPT Nguyễn Du',
    org_type: 'school',
    status: 'pending',
    contact_email: 'lienhe@nguyendu.edu.vn',
    contact_phone: '028 1234 5678',
    created_at: '2026-10-01T08:30:00',
    approved_by: null,
    approved_at: null,
    rejection_reason: null,
  },
  owners: [
    { id: 'acc-o1', username: 'nguyendu.owner', email: 'owner@nguyendu.edu.vn', status: 'pending' },
  ],
  modules: [
    { code: 'STUDENT_MANAGEMENT', name: 'Quản lý sinh viên', status: 'requested' },
    { code: 'CLASS_MANAGEMENT', name: 'Quản lý lớp học', status: 'requested' },
  ],
};

const AUDIT_LOGS = [
  {
    id: 'a1',
    created_at: '2026-10-21T09:15:00',
    action: 'ORG_APPROVED',
    actor_username: 'admin.he.thong',
    target_type: 'ORGANIZATION',
    target_id: 'org-1',
    target_name: 'Trường THPT Nguyễn Du',
    description: 'Duyệt tổ chức',
  },
  {
    id: 'a2',
    created_at: '2026-10-21T10:02:00',
    action: 'ACCOUNT_STATUS_CHANGED',
    actor_username: 'admin.he.thong',
    target_type: 'ACCOUNT',
    target_id: 'acc-1',
    target_name: 'nguyendu.owner',
    description: 'Vô hiệu hoá tài khoản',
  },
];

const ACCOUNTS = [
  {
    id: 'acc-1',
    username: 'nguyendu.owner',
    email: 'owner@nguyendu.edu.vn',
    full_name: 'Trần Văn A',
    organization_id: 'org-1',
    organization_name: 'Trường THPT Nguyễn Du',
    role: 'ORG_OWNER',
    status: 'active',
    created_at: '2026-10-01T08:30:00',
    last_login_at: '2026-11-10T07:45:00',
  },
  {
    id: 'acc-2',
    username: 'giao.vu',
    email: 'giaovu@nguyendu.edu.vn',
    full_name: 'Lê Thị B',
    organization_id: 'org-1',
    organization_name: 'Trường THPT Nguyễn Du',
    role: 'ACADEMIC_STAFF',
    status: 'locked',
    created_at: '2026-10-02T09:00:00',
    last_login_at: null,
  },
];

const TEACHERS = [
  {
    userId: 't1',
    staffCode: 'GV001',
    fullName: 'Nguyễn Thị Mai',
    email: 'mai.nguyen@nguyendu.edu.vn',
    phone: '0901234567',
    departmentId: 'd1',
    specialties: [{ id: 'sp1', name: 'Toán' }],
    contractType: 'CO_HUU',
    teachingStatus: 'DANG_DAY',
    classCount: 3,
    noClass: false,
    classLabel: '3 lớp',
  },
  {
    userId: 't2',
    staffCode: 'GV002',
    fullName: 'Trần Văn Hùng',
    email: 'hung.tran@nguyendu.edu.vn',
    phone: '0907654321',
    departmentId: 'd1',
    specialties: [{ id: 'sp2', name: 'Vật lý' }],
    contractType: 'THINH_GIANG',
    teachingStatus: 'TAM_NGHI',
    classCount: 0,
    noClass: true,
    classLabel: 'Chưa có lớp',
  },
];

const TEACHER_DETAIL = {
  ...TEACHERS[0],
  positionIds: ['p1'],
  classes: [
    { id: 'c1', classCode: 'LH001', name: 'Toán 10A1', status: 'DANG_DIEN_RA', closeState: 'NONE' },
    { id: 'c2', classCode: 'LH002', name: 'Toán 10A2', status: 'CHUA_BAT_DAU', closeState: 'NONE' },
  ],
  history: [
    {
      action: 'UPDATE',
      actorName: 'Lê Thị B',
      createdAt: '2026-11-08T10:00:00',
      details: { specialtyIds: { before: ['sp1'], after: ['sp1', 'sp2'] } },
    },
  ],
  version: 3,
  createdAt: '2026-09-01T08:00:00',
  updatedAt: '2026-11-08T10:00:00',
};

const ASSIGNABLE = [
  { userId: 't1', staffCode: 'GV001', fullName: 'Nguyễn Thị Mai', teachingStatus: 'DANG_DAY' },
  { userId: 't3', staffCode: 'GV003', fullName: 'Phạm Văn Nam', teachingStatus: 'DANG_DAY' },
];

const CLASSES = [
  {
    id: 'c1',
    classCode: 'LH001',
    name: 'Toán 10A1',
    academicYear: '2026-2027',
    startDate: '2026-09-05',
    endDate: '2027-05-30',
    status: 'DANG_DIEN_RA',
    closeState: 'NONE',
    teacher: { id: 't1', code: 'GV001', fullName: 'Nguyễn Thị Mai' },
    studentCount: 32,
    version: 2,
  },
  {
    id: 'c2',
    classCode: 'LH002',
    name: 'Toán 10A2',
    academicYear: '2026-2027',
    startDate: '2026-09-05',
    endDate: '2027-05-30',
    status: 'CHUA_BAT_DAU',
    closeState: 'NONE',
    teacher: null,
    studentCount: 30,
    version: 1,
  },
  {
    id: 'c3',
    classCode: 'LH003',
    name: 'Lý 11B1',
    academicYear: '2026-2027',
    startDate: '2026-09-05',
    endDate: '2027-05-30',
    status: 'DANG_DIEN_RA',
    closeState: 'PENDING',
    teacher: { id: 't2', code: 'GV002', fullName: 'Trần Văn Hùng' },
    studentCount: 28,
    version: 4,
  },
];

const CLASS_DETAIL = {
  ...CLASSES[0],
  cancelReason: null,
  closeRejectReason: null,
  closeRequestNote: null,
  createdAt: '2026-08-20T08:00:00',
  updatedAt: '2026-11-01T09:00:00',
};

const STATUS_LOGS = [
  {
    at: '2026-09-05T08:00:00',
    actorId: 'u1',
    actorName: 'Lê Thị B',
    fromStatus: null,
    toStatus: 'CHUA_BAT_DAU',
    reason: 'Tạo lớp',
  },
  {
    at: '2026-09-10T08:00:00',
    actorId: 'u1',
    actorName: 'Lê Thị B',
    fromStatus: 'CHUA_BAT_DAU',
    toStatus: 'DANG_DIEN_RA',
    reason: 'Bắt đầu học',
  },
];

const CLOSE_EVENTS = [
  {
    at: '2026-11-01T09:00:00',
    actorId: 'u1',
    actorName: 'Lê Thị B',
    action: 'REQUESTED',
    reason: 'Lớp kết thúc sớm',
  },
];

const POSITIONS = [
  { id: 'p1', name: 'Giáo viên', description: 'Giảng dạy', createdAt: '2026-09-01T08:00:00', permissions: ['PEOPLE_VIEW'] },
  { id: 'p2', name: 'Tổ trưởng', description: 'Quản lý tổ', createdAt: '2026-09-01T08:00:00', permissions: ['PEOPLE_VIEW', 'PEOPLE_EDIT'] },
];

const PERMISSIONS = [
  { code: 'PEOPLE_VIEW', description: 'Xem nhân sự' },
  { code: 'PEOPLE_EDIT', description: 'Sửa nhân sự' },
  { code: 'CLASS_VIEW', description: 'Xem lớp học' },
];

const DEPARTMENTS = [
  { id: 'd1', name: 'Tổ Toán', description: 'Tổ bộ môn Toán', createdAt: '2026-09-01T08:00:00' },
  { id: 'd2', name: 'Tổ Văn', description: null, createdAt: '2026-09-01T08:00:00' },
];

const MEMBERS = [
  { userId: 'u1', departmentId: 'd1', role: 'MANAGER', appointedBy: null, appointedAt: '2026-09-02T08:00:00', positionIds: ['p1'], permissions: ['PEOPLE_VIEW'] },
];

const LOGIN_OK = {
  accessToken: tokenFor(['SUPER_ADMIN']),
  refreshToken: 'fake-refresh-token',
  tokenType: 'Bearer',
  expiresIn: 900,
};

function paged(items) {
  return { items, total: items.length, page: 1, size: 20, pages: 1 };
}

/* ─────────────────────────── Bảng mock mặc định ─────────────────────────── */

const DEFAULT_MOCKS = [
  // Auth
  { method: 'POST', path: '/api/v1/auth/login', json: LOGIN_OK },
  { method: 'POST', path: '/api/v1/auth/refresh', json: LOGIN_OK },
  { method: 'POST', path: '/api/v1/auth/logout', status: 204 },
  { method: 'POST', path: '/api/v1/auth/register', status: 201, json: { organizationId: 'org-new', accountId: 'acc-new', organizationStatus: 'PENDING', accountStatus: 'PENDING', requestedModules: ['STUDENT_MANAGEMENT'] } },
  { method: 'POST', path: '/api/v1/auth/forgot-password', status: 202 },
  { method: 'POST', path: '/api/v1/auth/reset-password', status: 204 },
  // Admin
  { method: 'GET', path: '/api/v1/modules', json: MODULES },
  { method: 'GET', path: '/api/v1/organizations/pending', json: PENDING_ORGS },
  { method: 'GET', path: '/api/v1/organizations/options', json: ORG_LIST.map((o) => ({ id: o.id, name: o.name })) },
  { method: 'GET', path: '/api/v1/organizations', json: paged(ORG_LIST) },
  { method: 'GET', path: '/api/v1/organizations/:id', json: ORG_DETAIL },
  { method: 'GET', path: '/api/v1/audit-logs', json: paged(AUDIT_LOGS) },
  { method: 'GET', path: '/api/v1/accounts', json: paged(ACCOUNTS) },
  { method: 'GET', path: '/api/v1/accounts/:id', json: ACCOUNTS[0] },
  { method: 'POST', path: '/api/v1/accounts', status: 201, json: ACCOUNTS[0] },
  // Sprint 4 — thứ tự quan trọng: path cụ thể trước path có `:id`
  { method: 'GET', path: '/api/teachers/assignable', json: paged(ASSIGNABLE) },
  { method: 'GET', path: '/api/teachers/:id', json: TEACHER_DETAIL },
  { method: 'GET', path: '/api/teachers', json: paged(TEACHERS) },
  { method: 'GET', path: '/api/specialties', json: [{ id: 'sp1', name: 'Toán' }, { id: 'sp2', name: 'Vật lý' }] },
  { method: 'GET', path: '/api/classes/:id/status-logs', json: STATUS_LOGS },
  { method: 'GET', path: '/api/classes/:id/close-events', json: CLOSE_EVENTS },
  { method: 'GET', path: '/api/classes/:id', json: CLASS_DETAIL },
  { method: 'GET', path: '/api/classes', json: paged(CLASSES) },
  // Owner
  { method: 'GET', path: '/positions', json: POSITIONS },
  { method: 'GET', path: '/permissions', json: PERMISSIONS },
  { method: 'GET', path: '/departments/:id/members', json: MEMBERS },
  { method: 'GET', path: '/departments', json: DEPARTMENTS },
];

/** Chọn mock: override trước, rồi tới mặc định; so khớp theo regex `:id`. */
function findMock(overrides, method, pathname) {
  for (const list of [overrides, DEFAULT_MOCKS]) {
    for (const m of list) {
      if (m.method !== method) continue;
      const rx = new RegExp('^' + m.path.replace(/:[^/]+/g, '[^/]+').replace(/\//g, '\\/') + '$');
      if (rx.test(pathname)) return m;
    }
  }
  return null;
}

const API_RE = /^\/api\/|\/departments(\/|$)|\/positions(\/|$)|\/permissions(\/|$)/;

/* ─────────────────────────── Hàm dump 1 trang ───────────────────────────── */

async function snapshot(page) {
  return page.evaluate(() => {
    const out = [];
    const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const trunc = (s, n = 100) => (s.length > n ? s.slice(0, n) + '…' : s);
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return false;
      const s = getComputedStyle(el);
      return s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity) !== 0;
    };
    const box = (el) => {
      const r = el.getBoundingClientRect();
      return `@${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}`;
    };
    const accName = (el) => {
      const aria = el.getAttribute('aria-label');
      if (aria) return norm(aria);
      const lb = el.getAttribute('aria-labelledby');
      if (lb) {
        const t = lb
          .split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent || '')
          .join(' ');
        if (norm(t)) return norm(t);
      }
      const tag = el.tagName.toLowerCase();
      if (tag === 'input' || tag === 'select' || tag === 'textarea') {
        if (el.id) {
          const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
          if (lbl) return norm(lbl.textContent);
        }
        const wrap = el.closest('label');
        if (wrap) return norm(wrap.textContent);
        if (el.getAttribute('placeholder')) return norm(el.getAttribute('placeholder'));
        return '';
      }
      return norm(el.textContent) || norm(el.getAttribute('title'));
    };

    // A. Cấu trúc (cây thụt lề)
    const STRUCT = /^(header|nav|main|aside|footer|section|article|form|dialog|h1|h2|h3|h4|h5|h6|table|ul|ol|button|a|input|select|textarea)$/;
    const struct = [];
    const walk = (el, depth) => {
      const tag = el.tagName.toLowerCase();
      const role = el.getAttribute('role');
      const interestingTag = STRUCT.test(tag);
      const interesting = interestingTag || role;
      let d = depth;
      if (interesting && visible(el)) {
        let label = '';
        if (/^h[1-6]$/.test(tag)) label = trunc(norm(el.textContent), 80);
        else if (tag === 'table')
          label = `[table ${el.querySelectorAll('thead th').length} cột, ${el.querySelectorAll('tbody tr').length} dòng]`;
        else if (tag === 'input' || tag === 'select' || tag === 'textarea')
          label = `(${el.getAttribute('type') || tag}) "${trunc(accName(el), 60)}"`;
        else label = trunc(accName(el), 70);
        // Bỏ nút "chỉ có role" mà rỗng nhãn (vd <span role="status"></span> trong Button).
        if (interestingTag || label) {
          struct.push(`${'  '.repeat(d)}<${tag}${role ? ` role="${role}"` : ''}> ${label} ${box(el)}`);
          if (tag === 'table') return;
          d += 1;
        }
      }
      for (const c of el.children) walk(c, d);
    };
    walk(document.body, 0);

    // B. Điều khiển tương tác (theo thứ tự trên→dưới, trái→phải)
    const interactive = Array.from(
      document.querySelectorAll(
        'button,a[href],input,select,textarea,[role="button"],[role="link"],[role="checkbox"],[role="radio"],[role="combobox"],[role="tab"],[role="switch"]',
      ),
    ).filter(visible);
    interactive.sort((a, b) => {
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      return ra.top - rb.top || ra.left - rb.left;
    });
    const controls = interactive.map((el) => {
      const tag = el.tagName.toLowerCase();
      let kind = tag;
      if (tag === 'input') kind = `input[${el.getAttribute('type') || 'text'}]`;
      const states = [];
      if (el.disabled || el.getAttribute('aria-disabled') === 'true') states.push('disabled');
      if (el.getAttribute('aria-required') === 'true') states.push('required');
      if (el.getAttribute('aria-expanded') !== null) states.push(`expanded=${el.getAttribute('aria-expanded')}`);
      if (el.getAttribute('aria-checked') !== null) states.push(`checked=${el.getAttribute('aria-checked')}`);
      if (el.checked === true) states.push('checked');
      return `- ${kind} "${trunc(accName(el), 80)}" ${box(el)}${states.length ? ' {' + states.join(',') + '}' : ''}`;
    });

    // C. Tiêu đề
    const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6'))
      .filter(visible)
      .map((h) => `- ${h.tagName.toLowerCase()}: ${trunc(norm(h.textContent), 100)}`);

    // D. Thông báo / trạng thái
    const notices = Array.from(
      document.querySelectorAll(
        '[role="alert"],[role="status"],.ant-alert,.ant-result,.ant-message-notice,.ant-notification-notice',
      ),
    )
      .filter(visible)
      .filter((el) => norm(el.textContent).length > 0)
      .map((el) => `- [${el.getAttribute('role') || el.className.split(' ')[0]}] ${trunc(norm(el.textContent), 160)}`);

    // E. Hộp thoại đang mở
    const dialogs = Array.from(document.querySelectorAll('dialog,[role="dialog"],.ant-modal'))
      .filter(visible)
      .map((el) => `- ${trunc(norm(el.textContent), 300)}`);

    // F. Tràn ngang — bằng chứng cho yêu cầu "không tràn ngang" (320/768/1024/1440).
    //    `scrollWidth > clientWidth` ở <html> nghĩa là CẢ TRANG phải cuộn ngang.
    //    Bảng rộng hơn khung nhưng nằm trong vùng `overflow-x:auto` thì KHÔNG tính
    //    là tràn trang — vì vậy ta chỉ liệt kê phần tử vượt viewport khi chính
    //    trang đã tràn.
    const de = document.documentElement;
    const overflowPx = de.scrollWidth - de.clientWidth;
    const vw = window.innerWidth;
    let overflowEls = [];
    if (overflowPx > 1) {
      overflowEls = Array.from(document.querySelectorAll('body *'))
        .filter(visible)
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
        .filter(({ r }) => r.right > vw + 1 || r.left < -1)
        .slice(0, 25)
        .map(({ el, r }) => {
          const tag = el.tagName.toLowerCase();
          const cls = (el.getAttribute('class') || '').split(' ').filter(Boolean).slice(0, 2).join('.');
          const id = el.id ? `#${el.id}` : '';
          const w = Math.round(r.width);
          const right = Math.round(r.right);
          return `- <${tag}${id}${cls ? '.' + cls : ''}> rộng ${w}px, mép phải ${right}px (viewport ${vw}px)`;
        });
    }

    return {
      title: document.title,
      htmlTheme: document.documentElement.getAttribute('data-astryx-theme') || document.documentElement.getAttribute('data-theme') || '(không có)',
      struct,
      controls,
      headings,
      notices,
      dialogs,
      text: norm(document.body.innerText),
      antdCount: document.querySelectorAll('[class^="ant-"]').length,
      overflowPx,
      vw,
      overflowEls,
    };
  });
}

/* ─────────────────────────── Kịch bản ───────────────────────────────────── */

const S = (o) => o;

const SCENARIOS = [
  /* ── Công khai ─────────────────────────────────────────────────────────── */
  S({ id: '01-login-default', name: 'Đăng nhập — mặc định', route: '/dang-nhap', mobile: true }),
  S({
    id: '02-login-sai-mat-khau',
    name: 'Đăng nhập — sai mật khẩu (401)',
    route: '/dang-nhap',
    mobile: true,
    mocks: [{ method: 'POST', path: '/api/v1/auth/login', status: 401, json: { success: false, message: 'Invalid username or password', data: null } }],
    action: async (p) => {
      const inputs = p.locator('input:visible');
      await inputs.nth(0).fill('sai.ten');
      await inputs.nth(1).fill('sai.mat.khau');
      await p.locator('button[type="submit"]').first().click();
    },
    settle: 1500,
  }),
  S({
    id: '03-login-vai-tro-chua-co-man',
    name: 'Đăng nhập — vai trò chưa có màn hình',
    route: '/dang-nhap',
    mocks: [{ method: 'POST', path: '/api/v1/auth/login', json: { ...LOGIN_OK, accessToken: tokenFor(['ORG_ADMIN']) } }],
    action: async (p) => {
      const inputs = p.locator('input:visible');
      await inputs.nth(0).fill('to.chuc.moi');
      await inputs.nth(1).fill('Matkhau@123');
      await p.locator('button[type="submit"]').first().click();
    },
    settle: 1500,
  }),
  S({ id: '04-register-default', name: 'Đăng ký tổ chức — mặc định', route: '/dang-ky', mobile: true }),
  S({
    id: '05-register-module-loi',
    name: 'Đăng ký — danh mục module lỗi (500)',
    route: '/dang-ky',
    mocks: [{ method: 'GET', path: '/api/v1/modules', status: 500, json: { message: 'boom' } }],
    settle: 1500,
  }),
  S({
    id: '06-register-module-rong',
    name: 'Đăng ký — danh mục module rỗng',
    route: '/dang-ky',
    mocks: [{ method: 'GET', path: '/api/v1/modules', json: [] }],
  }),
  S({ id: '07-quen-mat-khau', name: 'Quên mật khẩu — mặc định', route: '/quen-mat-khau', mobile: true }),
  S({
    id: '08-quen-mat-khau-chua-co',
    name: 'Quên mật khẩu — chức năng chưa sẵn sàng (404)',
    route: '/quen-mat-khau',
    mocks: [{ method: 'POST', path: '/api/v1/auth/forgot-password', status: 404, json: { message: 'not found' } }],
    action: async (p) => {
      await p.locator('input:visible').nth(0).fill('toi@truong.edu.vn');
      await p.locator('button[type="submit"]').first().click();
    },
    settle: 1500,
  }),
  S({ id: '09-dat-lai-mat-khau-thieu-token', name: 'Đặt lại mật khẩu — thiếu token', route: '/dat-lai-mat-khau', mobile: true }),
  S({
    id: '10-dat-lai-mat-khau-token-het-han',
    name: 'Đặt lại mật khẩu — token hết hạn (400)',
    route: '/dat-lai-mat-khau?token=het-han',
    mocks: [{ method: 'POST', path: '/api/v1/auth/reset-password', status: 400, json: { message: 'expired' } }],
    action: async (p) => {
      const inputs = p.locator('input:visible');
      await inputs.nth(0).fill('Matkhaumoi@123');
      await inputs.nth(1).fill('Matkhaumoi@123');
      await p.locator('button[type="submit"]').first().click();
    },
    settle: 1500,
  }),
  S({ id: '11-xem-thu-hop-le', name: 'Xem thử vai trò — hợp lệ (giáo viên)', route: '/xem-thu/teacher', mobile: true }),
  S({ id: '12-xem-thu-sai-slug', name: 'Xem thử vai trò — slug sai', route: '/xem-thu/khong-ton-tai' }),

  /* ── Khu quản trị (SUPER_ADMIN) ───────────────────────────────────────── */
  S({ id: '13-quan-tri-tong-quan', name: 'Quản trị — Tổng quan', route: '/quan-tri', role: ROLE_SUPER_ADMIN, mobile: true }),
  S({ id: '14-quan-tri-to-chuc-cho-duyet', name: 'Quản trị — Tổ chức chờ duyệt', route: '/quan-tri/to-chuc', role: ROLE_SUPER_ADMIN, mobile: true }),
  S({ id: '15-quan-tri-to-chuc-rong', name: 'Quản trị — Tổ chức chờ duyệt (rỗng)', route: '/quan-tri/to-chuc', role: ROLE_SUPER_ADMIN, mocks: [{ method: 'GET', path: '/api/v1/organizations/pending', json: [] }] }),
  S({ id: '16-quan-tri-tat-ca-to-chuc', name: 'Quản trị — Tất cả tổ chức', route: '/quan-tri/to-chuc/tat-ca', role: ROLE_SUPER_ADMIN, mobile: true }),
  S({
    id: '17-quan-tri-tat-ca-to-chuc-cho-be',
    name: 'Quản trị — Tất cả tổ chức (BE chưa có, 404)',
    route: '/quan-tri/to-chuc/tat-ca',
    role: ROLE_SUPER_ADMIN,
    mocks: [{ method: 'GET', path: '/api/v1/organizations', status: 404, json: { message: 'not found' } }],
    settle: 1500,
  }),
  S({ id: '18-quan-tri-chi-tiet-to-chuc', name: 'Quản trị — Chi tiết tổ chức', route: '/quan-tri/to-chuc/org-1', role: ROLE_SUPER_ADMIN, mobile: true }),
  S({ id: '19-quan-tri-lich-su-to-chuc', name: 'Quản trị — Lịch sử duyệt tổ chức', route: '/quan-tri/to-chuc/org-1/lich-su', role: ROLE_SUPER_ADMIN }),
  S({ id: '20-quan-tri-danh-muc-module', name: 'Quản trị — Danh mục module', route: '/quan-tri/module', role: ROLE_SUPER_ADMIN, mobile: true }),
  S({ id: '21-quan-tri-tai-khoan', name: 'Quản trị — Quản lý tài khoản', route: '/quan-tri/tai-khoan', role: ROLE_SUPER_ADMIN, mobile: true }),
  S({ id: '22-quan-tri-chi-tiet-tai-khoan', name: 'Quản trị — Chi tiết tài khoản', route: '/quan-tri/tai-khoan/acc-1', role: ROLE_SUPER_ADMIN }),
  S({ id: '23-quan-tri-nhat-ky', name: 'Quản trị — Nhật ký hệ thống', route: '/quan-tri/nhat-ky', role: ROLE_SUPER_ADMIN, mobile: true }),
  S({
    id: '24-quan-tri-tong-quan-loi',
    name: 'Quản trị — Tổng quan (lỗi 500)',
    route: '/quan-tri',
    role: ROLE_SUPER_ADMIN,
    mocks: [{ method: 'GET', path: '/api/v1/organizations/pending', status: 500, json: { message: 'boom' } }],
    settle: 1800,
  }),
  S({
    id: '25-quan-tri-tai-khoan-dang-tai',
    name: 'Quản trị — Tài khoản (đang tải)',
    route: '/quan-tri/tai-khoan',
    role: ROLE_SUPER_ADMIN,
    mocks: [{ method: 'GET', path: '/api/v1/accounts', kind: 'pending' }],
    settle: 700,
  }),

  /* ── Khu tổ chức (OWNER) ──────────────────────────────────────────────── */
  S({ id: '26-to-chuc-phong-ban', name: 'Tổ chức — Phòng ban', route: '/to-chuc', role: ROLE_OWNER, mobile: true }),
  S({ id: '27-to-chuc-phong-ban-rong', name: 'Tổ chức — Phòng ban (rỗng)', route: '/to-chuc', role: ROLE_OWNER, mocks: [{ method: 'GET', path: '/departments', json: [] }] }),
  S({ id: '28-to-chuc-chuc-vu', name: 'Tổ chức — Chức vụ', route: '/to-chuc/chuc-vu', role: ROLE_OWNER, mobile: true }),
  S({ id: '29-to-chuc-chi-tiet-phong-ban', name: 'Tổ chức — Chi tiết phòng ban', route: '/to-chuc/phong-ban/d1', role: ROLE_OWNER, mobile: true }),

  /* ── Khu đào tạo (ACADEMIC_STAFF) ─────────────────────────────────────── */
  S({ id: '30-dao-tao-giao-vien', name: 'Đào tạo — Giáo viên', route: '/dao-tao/giao-vien', role: ROLE_ACADEMIC, mobile: true }),
  S({ id: '31-dao-tao-giao-vien-rong', name: 'Đào tạo — Giáo viên (rỗng)', route: '/dao-tao/giao-vien', role: ROLE_ACADEMIC, mocks: [{ method: 'GET', path: '/api/teachers', json: paged([]) }] }),
  S({ id: '32-dao-tao-chi-tiet-giao-vien', name: 'Đào tạo — Chi tiết giáo viên', route: '/dao-tao/giao-vien/t1', role: ROLE_ACADEMIC, mobile: true }),
  S({ id: '33-dao-tao-lop-hoc', name: 'Đào tạo — Lớp học', route: '/dao-tao/lop-hoc', role: ROLE_ACADEMIC, mobile: true }),
  S({ id: '34-dao-tao-lop-hoc-rong', name: 'Đào tạo — Lớp học (rỗng)', route: '/dao-tao/lop-hoc', role: ROLE_ACADEMIC, mocks: [{ method: 'GET', path: '/api/classes', json: paged([]) }] }),
  S({ id: '35-dao-tao-chi-tiet-lop-hoc', name: 'Đào tạo — Chi tiết lớp học', route: '/dao-tao/lop-hoc/c1', role: ROLE_ACADEMIC, mobile: true }),
  S({
    id: '36-dao-tao-giao-vien-dang-tai',
    name: 'Đào tạo — Giáo viên (đang tải)',
    route: '/dao-tao/giao-vien',
    role: ROLE_ACADEMIC,
    mocks: [{ method: 'GET', path: '/api/teachers', kind: 'pending' }],
    settle: 700,
  }),

  /* ── Không đủ quyền (no-permission) ───────────────────────────────────── */
  S({ id: '37-403-quan-tri', name: 'Không đủ quyền — /quan-tri (giáo viên)', route: '/quan-tri', role: ROLE_TEACHER, mobile: true }),
  S({ id: '38-403-to-chuc', name: 'Không đủ quyền — /to-chuc (giáo viên)', route: '/to-chuc', role: ROLE_TEACHER }),
  S({ id: '39-403-dao-tao', name: 'Không đủ quyền — /dao-tao (giáo viên)', route: '/dao-tao', role: ROLE_TEACHER, mobile: true }),

  /* ── Chưa đăng nhập vào console → chuyển hướng ────────────────────────── */
  S({ id: '40-quan-tri-chua-dang-nhap', name: 'Chưa đăng nhập vào /quan-tri', route: '/quan-tri' }),

  /* ── 404 ──────────────────────────────────────────────────────────────── */
  S({ id: '41-khong-tim-thay', name: 'Không tìm thấy trang', route: '/khong-ton-tai', mobile: true }),
];

/* ─────────────────────────── Vòng chạy ─────────────────────────────────── */

function slug(s) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

async function run() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ channel: CHANNEL, headless: true });
  const index = [];
  const errors = [];

  const selected = SCENARIOS.filter((s) => !ONLY || s.id.includes(ONLY));
  console.log(`Chạy ${selected.length} kịch bản, channel=${CHANNEL}, base=${BASE}`);

  for (const sc of selected) {
    const viewports = sc.mobile ? ['desktop', 'mobile', 'narrow'] : ['desktop'];
    for (const vp of viewports) {
      const calls = [];
      const context = await browser.newContext({
        viewport: VIEWPORTS[vp],
        locale: 'vi-VN',
        timezoneId: 'Asia/Ho_Chi_Minh',
      });

      // Phiên giả: ghi token vào localStorage TRƯỚC khi app chạy.
      if (sc.role) {
        const at = tokenFor(sc.role.roles, sc.role.permissions, sc.role.username);
        await context.addInitScript(
          ([access, refresh]) => {
            localStorage.setItem('mems.accessToken', access);
            localStorage.setItem('mems.refreshToken', refresh);
          },
          [at, 'fake-refresh-token'],
        );
      } else {
        await context.addInitScript(() => {
          localStorage.removeItem('mems.accessToken');
          localStorage.removeItem('mems.refreshToken');
        });
      }

      const page = await context.newPage();
      page.on('pageerror', (e) => calls.push(`!! pageerror: ${String(e.message).slice(0, 200)}`));

      await page.route(
        (url) => API_RE.test(url.pathname),
        async (route, request) => {
          const url = new URL(request.url());
          const method = request.method();
          const spec = findMock(sc.mocks || [], method, url.pathname);
          if (!spec) {
            calls.push(`${method} ${url.pathname}${url.search} → (KHÔNG CÓ MOCK → chặn 501)`);
            await route.fulfill({ status: 501, contentType: 'application/json', body: JSON.stringify({ message: 'không có mock' }) });
            return;
          }
          if (spec.kind === 'pending') {
            calls.push(`${method} ${url.pathname}${url.search} → (treo — mô phỏng loading)`);
            return; // không fulfill → treo
          }
          const status = spec.status ?? 200;
          calls.push(`${method} ${url.pathname}${url.search} → ${status}`);
          if (status === 204) {
            await route.fulfill({ status: 204, body: '' });
            return;
          }
          await route.fulfill({
            status,
            contentType: 'application/json',
            body: JSON.stringify(spec.json ?? {}),
          });
        },
      );

      const file = path.join(OUT_DIR, `${sc.id}--${vp}.txt`);
      let body;
      try {
        await page.goto(BASE + sc.route, { waitUntil: 'domcontentloaded', timeout: 30000 });
        if (sc.action) await sc.action(page);
        await page.waitForTimeout(sc.settle ?? 900);
        // Chờ webfont (Inter) tải xong TRƯỚC khi đo: bề rộng nút phụ thuộc font, nếu
        // đo lúc font chưa sẵn sàng thì vài px lệch giữa các lần chạy (dump không ổn
        // định — ví dụ nút ở màn 403 nhảy 151↔156px).
        await page.evaluate(() => document.fonts.ready);
        const snap = await snapshot(page);
        body = [
          `# ${sc.id} — ${sc.name}`,
          `URL yêu cầu : ${sc.route}`,
          `URL thực tế  : ${page.url()}`,
          `Viewport     : ${vp} ${VIEWPORTS[vp].width}x${VIEWPORTS[vp].height}`,
          `Tiêu đề tab  : ${snap.title}`,
          `data-theme   : ${snap.htmlTheme}`,
          `Số phần tử antd (.ant-*) trên trang: ${snap.antdCount}`,
          snap.overflowPx > 1
            ? `Tràn ngang   : CÓ — cả trang rộng hơn viewport ${snap.overflowPx}px (scrollWidth > clientWidth)`
            : `Tràn ngang   : không (trang vừa khít viewport ${snap.vw}px)`,
          ...(snap.overflowPx > 1 && snap.overflowEls.length
            ? ['Phần tử vượt mép viewport:', ...snap.overflowEls]
            : []),
          '',
          `## API đã gọi (${calls.length})`,
          ...calls.map((c) => `- ${c}`),
          '',
          '## Cấu trúc (cây thụt lề, kèm toạ độ @x,y WxH)',
          ...snap.struct,
          '',
          '## Điều khiển tương tác (trên→dưới, trái→phải)',
          ...(snap.controls.length ? snap.controls : ['(không có)']),
          '',
          '## Tiêu đề (heading)',
          ...(snap.headings.length ? snap.headings : ['(không có)']),
          '',
          '## Thông báo / trạng thái',
          ...(snap.notices.length ? snap.notices : ['(không có)']),
          '',
          '## Hộp thoại đang mở',
          ...(snap.dialogs.length ? snap.dialogs : ['(không có)']),
          '',
          '## Toàn văn chữ hiển thị (innerText)',
          snap.text,
          '',
        ].join('\n');
      } catch (err) {
        body = `# ${sc.id} — ${sc.name}\n\nLỖI KHI DUMP: ${String(err)}\n\n## API đã gọi\n${calls.join('\n')}\n`;
        errors.push(`${sc.id}--${vp}: ${String(err).slice(0, 160)}`);
      }

      fs.writeFileSync(file, body, 'utf8');
      index.push({ id: sc.id, name: sc.name, route: sc.route, vp, file: path.basename(file), calls: calls.length, overflow: body.includes('Tràn ngang   : CÓ') });
      console.log(`  ✓ ${path.basename(file)} (${calls.length} API)`);
      await context.close();
    }
  }

  const idxLines = [
    '# Danh mục dump — ux-review/dumps/',
    '',
    `Tổng: ${index.length} file. Channel=${CHANNEL}, base=${BASE}.`,
    '',
    '| # | Kịch bản | Route | Viewport | File | Số API | Tràn ngang |',
    '|---|----------|-------|----------|------|--------|------------|',
    ...index.map((r, i) => `| ${i + 1} | ${r.name} | \`${r.route}\` | ${r.vp} | \`${r.file}\` | ${r.calls} | ${r.overflow ? 'CÓ' : '—'} |`),
    '',
  ];
  if (errors.length) {
    idxLines.push('## Lỗi khi dump', '', ...errors.map((e) => `- ${e}`), '');
  }
  fs.writeFileSync(path.join(OUT_DIR, '_index.md'), idxLines.join('\n'), 'utf8');

  await browser.close();
  console.log(`\nXong. ${index.length} file trong ${OUT_DIR}`);
  if (errors.length) console.log(`CẢNH BÁO: ${errors.length} file lỗi — xem _index.md`);
}

run().catch((e) => {
  console.error('LỖI CHẠY:', e);
  process.exit(1);
});
