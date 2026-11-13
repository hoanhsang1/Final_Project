# MEMS FE — Lớp 2 (Auth + Mẫu lõi + Motion) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle 4 trang Auth (xoá `loginFigma`, thống nhất shell qua `AuthCard` biến thể hero) và áp dụng mẫu lõi list/detail trên `ClassesPage` + `ClassDetailPage`, kèm `prefers-reduced-motion` và siết motion token ~150–200ms — app luôn chạy, không đổi contract/route/guard/IA/hành vi nghiệp vụ.

**Architecture:** Giữ Ant Design 5 + `ConfigProvider` token/components. (1) Tái lập nền token **blue enterprise Layer 1 đã duyệt** + motion token trong `src/theme.ts`; (2) global reduced-motion qua `src/index.css`; (3) mở rộng `AuthCard` tương thích ngược (`hero`, `variant='card'|'split'`) rồi migrate Login (giữ toàn bộ logic/redirect/NFR-REL-001/role-preview) và để Register/Forgot/Reset hưởng presentation; (4) refactor presentation-only `ClassesPage` (PageHeader+state pattern) và `ClassDetailPage` (detail header+state pattern) — tuyệt đối không chạm `version`/409-stale/invalidate/mutation/permission.

**Tech Stack:** React + Vite + TypeScript, Ant Design 5 (`antd@^5.29.3`, `ConfigProvider`, vi_VN), React Router, TanStack Query, Zustand, Vitest + RTL.

**Spec:** `frontend/docs/superpowers/specs/2026-11-09-mems-fe-professional-layer2-design.md` (phải đọc cùng plan).

## Global Constraints
- Không đổi contract/API/DTO; không đổi route/guard/URL/IA. Không đổi hành vi Sprint 4 (`version`, 409/`SPECIALITY_MISMATCH`, stale-409, NFR-REL-001: lỗi/timeout **không** báo thành công/không điều hướng sai).
- Giữ `vi_VN`. A11y: skip link `#noi-dung-chinh`, focus-visible, `aria-label`, `aria-current="page"`, `role="alert"` lỗi. 5-state awareness (loading/empty/error/success/no-permission) khi áp dụng.
- Theming chỉ qua token `ConfigProvider`/`theme.ts` + CSS biến/utility có chủ đích; **không** hardcode hex/px rải rác. Không Tailwind, không lib animation mới.
- Motion: 150–200ms, tinh tế; **tôn trọng `prefers-reduced-motion`**; không che lỗi/NFR-REL-001.
- **KHÔNG commit/push/merge/branch** (trừ khi user yêu cầu rõ). Layer 1 uncommitted + thay đổi sẵn có trong repo → không đụng file ngoài scope.
- App luôn chạy; verify sau mỗi lát cắt.

## Review Focus
- Auth regressions (dễ vỡ, chi phí cao): Login redirect (`SUPER_ADMIN→/quan-tri`, owner→`/to-chuc`, academic→`/dao-tao`, `rolePreviewPath`/notice), Login lỗi 401 → `role="alert"` + ở lại `/dang-nhap` + không authenticated (NFR-REL-001), submit chỉ `{username,password}`. Pin bằng `LoginPage.test.tsx`.
- Reset/Forgot contract: token lấy từ `?token=` (refresh vẫn dùng được), email chống dò (Forgot luôn hiện success message), hết hạn/thiếu token → không cho submit thành công. Pin bằng test hiện có (nếu có) + smoke; không đổi logic.
- ClassDetail stale/version (chi phí rất cao): mọi mutation vẫn gửi `version`; 409/stale → `message.error` + `invalidate`+`refetch` (không báo thành công). Refactor **presentation-only** — xác minh bằng đọc diff + `tsc`/build + giữ nguyên `doMut`/`handleError`.
- Reduced-motion: global `!important` chỉ trong media query; không làm ẩn `Alert role="alert"` hay trạng thái lỗi.
- `AuthCard` backward-compat: `variant='card'` mặc định, `activeTab` width semantics giữ → `AuthCard.test.tsx` + `RegisterPage.test.tsx` xanh.

## File Map
- `src/theme.ts` — **modify**: tái lập token blue enterprise Layer 1 (#155EEF/#1849A9/#EFF4FF, neutral/semantic/border/shadow sạch, giữ exports `color/typeScale/themeToken/themeComponents/layoutBackground/cardStyle/fontFamily`) + siết motion (`motion`, `motionDurationFast/Mid/Slow` ~150–200ms) + tinh chỉnh component nhẹ nếu cần.
- `src/index.css` — **create**: `@media (prefers-reduced-motion: reduce)` tắt/giảm animation, transition, `scroll-behavior:auto`.
- `src/main.tsx` — **modify**: `import './index.css'` (sau reset antd) để áp reduced-motion global.
- `src/components/AuthCard/types.ts` — **modify** (tương thích ngược): thêm `hero?: ReactNode`, `variant?: 'card'|'split'`, `rightMaxWidth?: number`.
- `src/components/AuthCard/AuthCard.tsx` — **modify**: hỗ trợ `hero` thay left panel; `variant='split'` render full-viewport 2-cột (hero trái, `children` phải, không bọc `Card` nội bộ); `variant='card'` (mặc định) giữ hành vi hiện tại (centered, `Card` title/subtitle/children, width theo `activeTab`). Màu/bo góc token-driven.
- `src/components/AuthCard/AuthCard.test.tsx` — **modify/add**: giữ test width/tab hiện có xanh; thêm test nhỏ cho `variant='split'` render hero + children (không Card nội bộ) nếu cần.
- `src/pages/LoginPage/LoginPage.tsx` — **modify**: xoá `loginFigma`; dùng `AuthCard variant='split' hero={...}`; dời nội dung phải (breadcrumb, inner form card, support, role-preview, copyright) vào `children`/cấu trúc giữ nguyên; **giữ nguyên toàn bộ** state/mutation/redirect/NFR-REL-001/field name+rule+message/link/aria/tablist/role-preview.
- `src/pages/LoginPage/LoginPage.test.tsx` — **verify/modify tối thiểu**: phải xanh; chỉ chỉnh selector nếu tương đương ngữ nghĩa bị phá (ưu tiên không đổi).
- `src/pages/RegisterPage/RegisterPage.tsx`, `ForgotPasswordPage.tsx`, `ResetPasswordPage.tsx` — **modify tối thiểu (presentation)**: không đổi logic; chỉ chỉnh nhỏ nếu cần đồng bộ token/spacing (mục tiêu: test/flow không đổi).
- `src/pages/ClassesPage/ClassesPage.tsx` — **modify (presentation)**: dùng `PageHeader` + pattern state (no-permission `role/Alert`, error+retry, loading/empty) giữ `queryKey`/params/permission/columns/link/pagination/handlers.
- `src/pages/ClassDetailPage/ClassDetailPage.tsx` — **modify (presentation)**: header chi tiết (back+tiêu đề+tag+action) + state thống nhất; **không đổi** `doMut`/`version`/`handleError`/409-invalidate+refetch/mutation/modal/quyền/tab/data.

---

## Task 0: Baseline & an toàn

**Files:** (read-only) `src/router.test.tsx`, auth tests, `src/theme.ts`

- [ ] **Step 1: Ghi nhận baseline hiện tại (không “sửa” fail ngoài scope)**
  - Run: `cd D:\Final_Project\frontend; npx tsc -b` → Expected: exit 0.
  - Run: `npx vitest run src/pages/LoginPage/LoginPage.test.tsx src/components/AuthCard/AuthCard.test.tsx src/pages/RegisterPage/RegisterPage.test.tsx` → Expected: PASS (ghi lại kết quả thực tế). Nếu có test khác fail sẵn có ngoài scope, **không đụng**.
- [ ] **Step 2: (skip commit — not requested)**

---

## Task 1: Nền token blue enterprise (Layer 1 đã duyệt) + motion token

**Files:**
- Modify: `src/theme.ts`

**Interfaces (giữ tương thích):** exports vẫn tồn tại: `color`, `fontFamily`, `typeScale`, `themeToken: ThemeConfig['token']`, `themeComponents: ThemeConfig['components']`, `layoutBackground`, `cardStyle`. Call sites import các tên này.

- [ ] **Step 1: Viết/điều chỉnh kỳ vọng bằng kiểm chứng tĩnh + build (không có unit test riêng cho token)**
  - Xác định giá trị đích: `colorPrimary/#155EEF` (AA với trắng), `colorPrimaryActive/#1849A9`, `colorPrimaryBg/#EFF4FF` (brand soft), neutral canvas/surface/border sạch, `colorText` navy/neutral đậm (giữ AA), `fontFamily` giữ Inter stack. Motion: `token.motion = true`, `motionDurationFast≈0.1s (100ms)`, `motionDurationMid≈0.15s (150ms)`, `motionDurationSlow≈0.2s (200ms)` (tinh tế, trong khoảng 150–200ms cho mid/slow). (Kiểm tra key hợp lệ với antd 5.29.3 khi cài; nếu key khác, map tương đương.)
- [ ] **Step 2: Cập nhật `src/theme.ts`**
  - Thay block `color` sang blue enterprise (brand `#155EEF`, active `#1849A9`, hover `#2970FF` hoặc gần, soft `#EFF4FF`; text `#101828`/`#344054`, secondary `#475467`, canvas `#F8FAFC`/`#F9FAFB`, surface `#FFFFFF`, border `#EAECF0`, borderInput đủ 3:1, giữ semantic error/warning/success AA). Giữ `fontFamily`, `typeScale`.
  - Cập nhật `themeToken`: `colorPrimary/Active/Hover/Bg/Link`, text/border/bg từ `color`, thêm/đặt motion tokens (`motion`, `motionDurationFast/Mid/Slow`) giá trị 100/150/200ms (dạng `0.1s`/`0.15s`/`0.2s` theo antd). Giữ `controlHeight`/radius/heading scale hợp lý.
  - Cập nhật `themeComponents`: tham chiếu `color` mới (selectedBg/hover/activeShadow/Menu/Table focus), giữ style Odoo-clean. `Button/Input/Select/...` `controlHeight` nhất quán; shadows restrained.
  - Cập nhật `cardStyle` dùng `color.border` + shadow nhẹ.
- [ ] **Step 3: Verify**
  - Run: `npx tsc -b` → exit 0.
  - Run: `npx vitest run src/components/AuthCard/AuthCard.test.tsx src/pages/RegisterPage/RegisterPage.test.tsx` → PASS (token đổi không phá logic).
- [ ] **Step 4: (skip commit — not requested)**

---

## Task 2: Global `prefers-reduced-motion`

**Files:**
- Create: `src/index.css`
- Modify: `src/main.tsx` (thêm import)

- [ ] **Step 1: Tạo `src/index.css`**
  - Nội dung (chỉ trong media query; không che alert/lỗi):
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```
- [ ] **Step 2: Import trong `src/main.tsx`**
  - Thêm `import './index.css';` sau `import 'antd/dist/reset.css';` (để override chuyển động, không phá reset/token).
- [ ] **Step 3: Verify**
  - Run: `npx tsc -b` → exit 0. `npm run build` (có thể gộp Task 8, nhưng nên chạy sớm) → OK.
- [ ] **Step 4: (skip commit — not requested)**

---

## Task 3: `AuthCard` — hero + `variant` (tương thích ngược)

**Files:**
- Modify: `src/components/AuthCard/types.ts`
- Modify: `src/components/AuthCard/AuthCard.tsx`
- Modify/Test: `src/components/AuthCard/AuthCard.test.tsx`

**Interfaces (produces):**
```ts
export interface AuthCardProps {
  activeTab: AuthTab;
  title: string;
  subtitle: string;
  children: ReactNode;
  hero?: ReactNode;                 // thay left panel mặc định
  variant?: 'card' | 'split';       // default 'card' (giữ hành vi cũ)
  rightMaxWidth?: number;           // split: max-width cột phải (optional)
}
```
- `variant='card'|'undefined'`: hành vi hiện tại — centered 2-col responsive, left brand panel (hoặc `hero` nếu muốn về sau), right AntD `<Card>` với `title/subtitle/children`, `cardMaxWidth` theo `activeTab` (`register` 1120 else 840) — **giữ nguyên semantics** (AuthCard.test assert).
- `variant='split'`: full-viewport desktop 2-col, left = `hero` (render trực tiếp), right = `<main>` chứa `children` trực tiếp (không `<Card>` nội bộ), responsive về 1 cột (hero ẩn trên mobile như hiện tại hoặc ẩn — chọn đơn giản: ẩn hero < lg, giống behavior hiện). Dùng token (`theme.useToken()`), không hardcode brand hex.

- [ ] **Step 1: Cập nhật `types.ts`** với 3 prop optional như trên (giữ `title/subtitle` required để tương thích Register/Forgot/Reset/Login có thể truyền `''`).

- [ ] **Step 2: Thêm/điều chỉnh test trong `AuthCard.test.tsx` (TDD cho phần mới, giữ test cũ)**
  - Giữ 2 test hiện có (tab không render link, width register>login). Chúng phải vẫn PASS với default.
  - Thêm test: `variant="split"` + `hero={<div data-testid="hero">H</div>}` + children → `screen.getByTestId('hero')` in document và `screen.getByText('nội dung con')` in document; và (nếu dễ assert) không có `.ant-card` bọc children theo cách card-title/subtitle mặc định — *hoặc* chỉ assert hero/children render (tránh brittle). Ví dụ:
```tsx
it('variant split renders hero and children without the default titled Card', () => {
  render(<MemoryRouter><AuthCard activeTab="login" variant="split" title="" subtitle="" hero={<div>HERO</div>}><p>child</p></AuthCard></MemoryRouter>);
  expect(screen.getByText('HERO')).toBeInTheDocument();
  expect(screen.getByText('child')).toBeInTheDocument();
});
```
  - Run: `npx vitest run src/components/AuthCard/AuthCard.test.tsx` → Expected: FAIL trên test mới (chưa hỗ trợ split/hero), 2 test cũ vẫn có thể PASS/FAIL tùy refactor — mục tiêu cuối: cả 3 PASS.

- [ ] **Step 3: Implement `AuthCard.tsx`**
  - Destructure thêm `hero, variant = 'card', rightMaxWidth`.
  - Left panel: `const left = hero ?? <BrandPanel />` (tách panel brand hiện tại thành component/hàm nội bộ để tái dùng; giữ SVG/features nội dung).
  - `if (variant === 'split')`: render layout full-height 2-col (desktop `screens.lg`): left = `left` (panel scroll/fit, dùng token bg/border), right = container (padding token, overflow auto, maxWidth `rightMaxWidth` hoặc 100%) render `{children}`. Mobile: chỉ right (hoặc right full) — ẩn left như card. Dùng `token.colorBgLayout/colorBgContainer` (không hardcode hex).
  - `variant='card'`: giữ nguyên cấu trúc/logic hiện tại, chỉ thay left thành `left` (cho phép hero về sau) và đảm bảo dùng token; `cardMaxWidth`/activeTab behavior **không đổi**.
- [ ] **Step 4: Verify**
  - Run: `npx vitest run src/components/AuthCard/AuthCard.test.tsx src/pages/RegisterPage/RegisterPage.test.tsx` → PASS.
  - Run: `npx tsc -b` → exit 0.
- [ ] **Step 5: (skip commit — not requested)**

---

## Task 4: Register / Forgot / Reset — đồng bộ presentation (không đổi logic)

**Files:**
- Modify (tối thiểu, nếu cần): `src/pages/RegisterPage/RegisterPage.tsx`, `src/pages/ForgotPasswordPage/ForgotPasswordPage.tsx`, `src/pages/ResetPasswordPage/ResetPasswordPage.tsx`

**Ràng buộc:** Không đổi module-catalog query/mutation/payload/validation, không đổi chống dò email, không đổi token `useSearchParams`/hết hạn/confirm match, không đổi `role="alert"`/`Result`/NFR-REL-001, không đổi route/link. Mục tiêu: hưởng token/AuthCard mới; giữ test xanh.

- [ ] **Step 1: Review 3 file — chỉ thay presentation nếu có giá trị còn sót (spacing token hoá nhẹ)**
  - Chúng đã dùng `AuthCard` + antd components; đa số sẽ tự đẹp theo token mới. Tránh chỉnh sửa không cần.
- [ ] **Step 2: Verify**
  - Run: `npx vitest run src/pages/RegisterPage/RegisterPage.test.tsx src/components/AuthCard/AuthCard.test.tsx` → PASS.
  - Run: `npx tsc -b` → exit 0.
- [ ] **Step 3: (skip commit — not requested)**

---

## Task 5: LoginPage — migrate sang `AuthCard` hero, xoá `loginFigma` (giữ logic)

**Files:**
- Modify: `src/pages/LoginPage/LoginPage.tsx`
- Verify/Modify tối thiểu: `src/pages/LoginPage/LoginPage.test.tsx`

**Bảo toàn (không đổi):** imports/logic `login`, `useAuthStore().setSession`, `ROLES/rolePreviewPath/RoleButton`, redirect nhánh `SUPER_ADMIN`/`isOwnerRole`/`canAccessAcademicArea`/role/notice, `formError`+`notice` state, `handleSubmit` gửi `{ username: values.username, password: values.password }` (không `remember`), `Form.Item` name `username`/`password` + rule message `Vui lòng nhập tên đăng nhập`/`Vui lòng nhập mật khẩu`, `autoComplete`, `loginMutation.isPending` trên nút submit, link `/quen-mat-khau`, link `aria-label="Đăng ký tổ chức"` → `/dang-ky`, tablist `aria-label="Chọn loại tài khoản"`, khu text `xem thử theo vai trò` + `ROLES.map(RoleButton)`, heading `Đăng nhập` (level 1). `LoginPage.test.tsx` assert các điều trên → **phải xanh**.

- [ ] **Step 1: Chạy test Login (baseline xanh)**
  - Run: `npx vitest run src/pages/LoginPage/LoginPage.test.tsx` → PASS.

- [ ] **Step 2: Refactor `LoginPage.tsx` (presentation + composition, logic giữ nguyên)**
  - Xoá `const loginFigma = {...}` và mọi tham chiếu `loginFigma.*`. Dùng `theme.useToken()` + token (và giá trị dẫn xuất nhỏ cục bộ nếu cần, **không** đặt tên `loginFigma`, không hardcode brand hex sai hệ — dùng `token.colorPrimary/colorBgLayout/colorTextSecondary`).
  - Dựng `hero` (ReactNode) cho cột trái: tái hiện nội dung hero hiện tại (MEMS, “Chào mừng quay trở lại!”, 01/02/03, ảnh `loginIllustration` nếu còn phù hợp) nhưng màu nền/nhấn dùng palette enterprise token-driven (gradient navy/xanh theo token, bỏ cam/đỏ legacy). Ẩn hero mobile do `AuthCard split` xử lý (hoặc theo responsive).
  - Render `<AuthCard variant="split" activeTab="login" title="" subtitle="" hero={hero} rightMaxWidth={1014}>` (hoặc không giới hạn, theo layout hợp lý) với `children` là toàn bộ cột phải hiện tại: breadcrumb “Tài khoản / Đăng nhập”, inner card (logo M + H1 “Đăng nhập” + tablist + form + divider + link đăng ký + hộp hỗ trợ + khu role-preview), footer copyright. Giữ cấu trúc/selector tương đương để test không vỡ (nhãn, `role="button" name Đăng nhập`, link `aria-label="Đăng ký tổ chức"`, text `xem thử theo vai trò`, `getByLabelText` fields).
  - Style inner card/form dùng token (borderRadius/border/shadow từ `token`), không `loginFigma`.
- [ ] **Step 3: Verify Login contract**
  - Run: `npx vitest run src/pages/LoginPage/LoginPage.test.tsx` → PASS. Nếu fail do thay đổi markup không đáng có, chỉnh markup tối thiểu (giữ ngữ nghĩa/nhãn/link/flow), **không** đổi logic test trừ khi test lệ thuộc chi tiết presentation sai; ưu tiên giữ test.
  - Run: `npx vitest run src/components/AuthCard/AuthCard.test.tsx src/pages/RegisterPage/RegisterPage.test.tsx` → PASS.
  - Run: `npx tsc -b` → exit 0.
- [ ] **Step 4: (skip commit — not requested)**

---

## Task 6: `ClassesPage` — list template pattern (presentation)

**Files:**
- Modify: `src/pages/ClassesPage/ClassesPage.tsx`

**Giữ nguyên (không đổi):** `useQuery` key `['classes', { page, size, closeState, search }]`, `enabled: canView`, `canView = isOwner || permissions.includes('CLASS_VIEW')`, `fetchClasses` params, filter/search handlers (reset page), columns (link `/dao-tao/lop-hoc/${r.id}`), pagination/onTableChange, `sprint4ErrorMessage`, messages `MSG_CLASS/MSG_S4`.

- [ ] **Step 1: Refactor presentation**
  - Thay `Title level={3}` header bằng `PageHeader title={MSG_CLASS.TITLE}` (import `PageHeader`). Đưa filter (Select trạng thái đóng, `Input.Search`) vào `PageHeader` `children` (toolbar) hoặc ngay dưới header — giữ layout gọn, token gap.
  - No-permission: giữ `<Alert type="warning" showIcon message={MSG_S4.NO_PERMISSION} />` (bọc trong vùng nội dung; `PageHeader` có thể vẫn hiện title hoặc chỉ Alert — chọn nhất quán: hiện `PageHeader` + Alert). Đảm bảo không lộ dữ liệu (query đã `enabled: canView`).
  - Error: giữ `Alert` error + description `sprint4ErrorMessage` + nút retry `listQuery.refetch()` (NFR-REL-001).
  - Loading/empty/success: giữ `Table loading` + `locale.emptyText` + `dataSource`.
- [ ] **Step 2: Verify**
  - Run: `npx tsc -b` → exit 0.
  - Run: `npx vitest run src/pages/LoginPage/LoginPage.test.tsx src/components/AuthCard/AuthCard.test.tsx` → PASS (hồi quy nhanh; ClassesPage không có unit test riêng).
  - (Nếu có test ClassesPage về sau thì chạy; hiện không có.)
- [ ] **Step 3: (skip commit — not requested)**

---

## Task 7: `ClassDetailPage` — detail header + state pattern (presentation-only, nghiệp vụ bất biến)

**Files:**
- Modify: `src/pages/ClassDetailPage/ClassDetailPage.tsx`

**Bất biến tuyệt đối (kiểm bằng diff):** `doMut` vẫn đọc `detailQuery.data?.version` và ném `'Thiếu version'` nếu null, truyền `version` vào mọi action; `handleError` vẫn `message.error(sprint4ErrorMessage(e))` và khi `isStaleConflict(e) || status===409` vẫn `invalidate()` + `detailQuery.refetch()`; mọi `useMutation`/`useQuery` key/enabled/fn, mọi Modal `onOk/onFinish`/`confirmLoading`/form validate, mọi phân nhánh `can()`/`show*` theo `closeState`/`status`, bảng `status-logs`/`close-events`, `Tabs` items — **không đổi logic**.

- [ ] **Step 1: Refactor presentation**
  - Header: thay cụm top hiện tại bằng pattern thống nhất dùng `PageHeader` (title = `d.classCode || d.name || 'Lớp học'`/fallback; `extra` = nhóm action `Space` giữ nguyên điều kiện `showAssign/showRequestClose/...`; `subtitle`/tag closeState hiển thị cạnh title). Giữ nút “Quay lại” (`navigate('/dao-tao/lop-hoc')`) rõ ràng (trong extra hoặc breadcrumb).
  - Loading: giữ `<Spin tip={MSG_S4.LOADING} />` (hoặc tương đương), không render dữ liệu.
  - Error: giữ `Alert` + description + nút Retry (`detailQuery.refetch()`) + Quay lại. Not-found: giữ `Alert warning MSG_S4.NOT_FOUND`.
  - Nội dung (Descriptions/Tabs/Table/Modal): giữ nguyên cấu trúc/hành vi, chỉ chỉnh spacing/token nhẹ nếu cần.
- [ ] **Step 2: Verify nghiệp vụ không đổi + build**
  - Tự kiểm diff: `doMut`, `handleError`, mọi `version` truyền, mọi mutation fn, query keys, `show*`/`can()` — không thay đổi.
  - Run: `npx tsc -b` → exit 0.
- [ ] **Step 3: (skip commit — not requested)**

---

## Task 8: Xác minh tổng & ghi nhận

**Files:** (read-only trừ khi cần chỉnh nhỏ tương thích đã nêu)

- [ ] **Step 1: Typecheck + build**
  - Run: `cd D:\Final_Project\frontend; npx tsc -b` → exit 0.
  - Run: `npm run build` → exit 0 (chunk-size warning có thể còn, pre-existing).
- [ ] **Step 2: Test hồi quy (phạm vi chạm + auth)**
  - Run: `npx vitest run src/pages/LoginPage/LoginPage.test.tsx src/components/AuthCard/AuthCard.test.tsx src/pages/RegisterPage/RegisterPage.test.tsx` → PASS.
  - (Tuỳ chọn) `npx vitest run src/components/PageHeader/PageHeader.test.tsx src/components/ConsoleShell/ConsoleShell.test.tsx` → PASS.
  - Ghi rõ: **không** chạy/sửa `src/router.test.tsx` (fail pre-existing ngoài scope, lệch H1 LoginPage).
- [ ] **Step 3: Smoke checklist (thủ công khi chạy local)**
  - 4 trang auth render/đúng flow: Login redirect (nếu có env), lỗi 401 không điều hướng + alert; Register validate/module; Forgot thông báo trung tính; Reset dùng `?token=` + xử lý hết hạn/thiếu token.
  - `/dao-tao/lop-hoc` (nếu có quyền/route sẵn) filter/paging/link; `/dao-tao/lop-hoc/:id` render, action vẫn gửi version, 409 stale → refetch (khi BE sẵn).
  - DevTools reduced-motion → animation/transition giảm/tắt.
- [ ] **Step 4: (skip commit — not requested)** — không commit/push/merge.

---

## Self-Review (tác giả plan)
- **Spec coverage:** 4a (A3, 4 trang auth, xoá loginFigma, bảo toàn logic) → Task 3–5 (+4). 4b (ClassesPage list, ClassDetailPage detail, presentation-only) → Task 6–7. 4c (reduced-motion CSS + motion token 150–200ms) → Task 1–2. Nền token Layer 1 blue tái lập → Task 1. Bất biến (route/contract/version/409/NFR-REL-001/vi_VN/a11y) lặp trong Global Constraints + từng task.
- **Placeholder scan:** không `TBD`. Thuật toán thân hàm do dev viết bám interface/test/constraint (phù hợp skill). Giá trị token/motion nêu rõ; key motion antd xác nhận khi code (Task 1 Step 1).
- **Type/API consistency:** `AuthCardProps` mở rộng tương thích ngược (Task 3) dùng thống nhất ở Login/Register/Forgot/Reset. `PageHeader` dùng như hiện có (props `title/subtitle/breadcrumb/extra/children`). Logic Login/Classes/ClassDetail giữ nguyên signature hành vi.
- **Proportion:** plan định hướng bằng interface/ràng buộc/verify; không chép toàn bộ thân hàm lớn (Login/ClassDetail) — implementer bám file hiện tại + bất biến. Commit step bị vô hiệu theo yêu cầu người dùng.
- **Review Focus:** 5 mục gắn vào Login test, diff ClassDetail, reduced-motion scope, AuthCard/Register compat — đã liệt kê.