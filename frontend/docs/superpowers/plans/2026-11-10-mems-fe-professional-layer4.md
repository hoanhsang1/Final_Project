# MEMS FE — Lớp 4 (/to-chuc + /quan-tri) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Áp `PageHeader` + state pattern (presentation-only) cho `PositionsPage`, `DepartmentDetailPage`, `AccountsPage`, `AccountDetailPage`. Giữ nguyên logic.

**Spec:** `frontend/docs/superpowers/specs/2026-11-10-mems-fe-professional-layer4-design.md`.

## Global Constraints
- Không đổi contract/API/DTO, route/guard/URL/IA. Không commit/push/merge.
- Giữ `vi_VN`, a11y (`role="alert"`), token-driven, 5-state. Presentation-only.
- **AccountsPage giữ:** `useAccountsPage`/URL sort+filter+paging, `adminKeys.options`, collection 404→"chờ backend", create mutation map 409/403/404/else + invalidation `['accounts']/['audit-logs']`, table/scroll/aria.
- **AccountDetailPage giữ tuyệt đối:** detail/audit queries, status/role/reset mutations + error maps (409 own role, 400, 403, 404 pending, else) + actionError/NFR-REL-001, `ALLOWED_TARGETS`/`targetLabel`, item 404→Result, invalidations, `backToListPath`. **Diff-verify.**
- **DepartmentDetailPage giữ:** `useDepartmentDetail` + add/changePositions/remove + temp password flow, loading/dept error/missing/member error/empty logic.
- **PositionsPage giữ:** `usePositionsPage` + create/update/remove + modal/form/empty+CTA/permissions table.

## File Map
- Modify: `src/pages/PositionsPage/PositionsPage.tsx`
- Modify: `src/pages/DepartmentDetailPage/DepartmentDetailPage.tsx`
- Modify: `src/pages/AccountsPage/AccountsPage.tsx`
- Modify: `src/pages/AccountDetailPage/AccountDetailPage.tsx`

---

### Task 1: `PositionsPage` — PageHeader + state
- [ ] **Step 1:** Add `PageHeader` (`title=MSG_POS.TITLE subtitle=MSG_POS.SUBTITLE extra=CREATE button` khi không empty). Giữ actionError/permissions/list Alerts (đã `role="alert"`), empty+CTA, table, modal + toàn bộ handlers/mutations.
- [ ] **Step 2:** `cd D:\Final_Project\frontend; npx tsc -b` → exit 0.

### Task 2: `DepartmentDetailPage` — PageHeader breadcrumb + state (giữ mutations/temp flow)
- [ ] **Step 1:** Add `PageHeader` breadcrumb `[{title:'Tổ chức',href:'/to-chuc'},{title:department.name}]` + title/description + extra (Thêm thành viên). Loading skeleton giữ. departmentsError/missing Result giữ (có nút Quay lại trong Alert/Result action vẫn ok). Giữ actionError/members error/empty/table + tất cả modal handlers/mutations/temp password.
- [ ] **Step 2:** `tsc -b` exit 0.

### Task 3: `AccountsPage` — PageHeader toolbar + D-24 404 giữ nguyên
- [ ] **Step 1:** Add `PageHeader` (`title/subtitle` + extra nút tạo + `children` toolbar filter). **Giữ nguyên** `isEndpointMissing` (collection 404) branch, `result.isError` branch, table `onChange` sort URL, create mutation map 409/403/404/else + invalidation, modal props.
- [ ] **Step 2:** `tsc -b` exit 0.

### Task 4: `AccountDetailPage` — PageHeader breadcrumb + giữ mutations/NFR-REL-001
- [ ] **Step 1:** Add `PageHeader` breadcrumb `[{title:MSG_ACC.LIST_TITLE,href:backPath},{title:account.username}]` + title/subtitle nhẹ + (không đưa action buttons vào extra để tránh phức tạp — giữ cụm nút trạng thái/đổi vai trò/reset phía dưới). **Giữ nguyên toàn bộ logic:** queries, `statusMutation/roleMutation/resetMutation` + error maps, `actionError`, `ALLOWED_TARGETS/targets`, item 404 Result vs error Alert, Descriptions, AuditLogTable, 3 modals + handlers/invalidation/success messages.
- [ ] **Step 2:** Diff-verify: `msgBackendPending` D-24/D-30/D-31, `CANNOT_CHANGE_OWN_ROLE` 409, NFR-REL-001 `STATUS_UPDATE_FAILED`, invalidations `['accounts']/['audit-logs']`.
- [ ] **Step 3:** `tsc -b` exit 0.

### Task 5: Xác minh tổng
- [ ] **Step 1:** `npx tsc -b` exit 0; `npm run build` OK.
- [ ] **Step 2:** Vitest hồi quy: `LoginPage/AuthCard/PageHeader/ConsoleShell` (và `RegisterPage` nếu muốn) xanh. `router.test.tsx` ngoài scope.
- [ ] **Step 3:** Grep xác nhận AccountDetail giữ `msgBackendPending('D-30')`/`D-31`/`D-24`, `CANNOT_CHANGE_OWN_ROLE`, `STATUS_UPDATE_FAILED`, `NFR-REL-001` comment path; AccountsPage giữ `isEndpointMissing`+`AdminApiError` 404 collection. (skip commit)