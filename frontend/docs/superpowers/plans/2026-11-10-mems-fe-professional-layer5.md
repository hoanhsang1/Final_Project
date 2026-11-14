# MEMS FE — Lớp 5 (/quan-tri org + module) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** `PageHeader` + state pattern (presentation-only) cho `AllOrganizationsPage`, `PendingOrganizationsPage`, `OrganizationDetailPage`, `ModuleCatalogPage`. Giữ nguyên logic.

**Spec:** `frontend/docs/superpowers/specs/2026-11-10-mems-fe-professional-layer5-design.md`.

## Global Constraints
- Không đổi contract/API/DTO, route/guard/URL/IA. Không commit/push/merge. `vi_VN`, a11y, token-driven, 5-state. Presentation-only.
- **AllOrganizationsPage giữ:** URL sort/filter/paging, collection 404 `D-20` (`ENDPOINT_CODE`) → "chờ backend", action matrix, suspend mutation + `handleSuspendError` (404/403/`SAVE_FAILED` NFR-REL-001) + `actionError` placement, invalidation/messages, `?from=to-chuc-tat-ca`.
- **OrganizationDetailPage giữ tuyệt đối:** approve/reject `handleMutationError` (409 warn+close+invalidate pending+detail; 404 actionError+close+invalidate detail; 403; else giữ modal NFR-REL-001) + onSuccess nav `backPath`/invalidate, suspend `handleSuspendError` (404 `D-21`/403/else) + onSuccess, `isAnyModalOpen`/`actionError`, `isPendingStatus`/status matrix, `ModuleConfigPanel editable={status!=='suspended'}`, `backToListPath`, render text thuần, modals. **Diff-verify.**
- **PendingOrganizationsPage giữ:** `usePendingOrganizations`, columns/nav, loading/empty/error.
- **ModuleCatalogPage giữ:** URL params + client filter, `CORE_MODULES`/read-only.

## File Map
- Modify: `src/pages/AllOrganizationsPage/AllOrganizationsPage.tsx`
- Modify: `src/pages/PendingOrganizationsPage/PendingOrganizationsPage.tsx`
- Modify: `src/pages/OrganizationDetailPage/OrganizationDetailPage.tsx`
- Modify: `src/pages/ModuleCatalogPage/ModuleCatalogPage.tsx`

---

### Task 1: `AllOrganizationsPage`
- [ ] **Step 1:** Add `PageHeader` (title/subtitle + children toolbar). `isEndpointMissing` branch dùng PageHeader + Alert giữ nguyên. `result.isError` giữ Alert (behavior giữ). Main: PageHeader+filters, `actionError` placement giữ, table/modal/suspend handlers giữ.
- [ ] **Step 2:** `npx tsc -b` → exit 0.

### Task 2: `PendingOrganizationsPage`
- [ ] **Step 1:** Add `PageHeader`. Error branch giữ Alert+retry. Loading/empty/table giữ.
- [ ] **Step 2:** `tsc -b` exit 0.

### Task 3: `OrganizationDetailPage` (logic bất biến)
- [ ] **Step 1:** Replace `Breadcrumb` thủ công bằng `PageHeader breadcrumb={[{title:MSG_ORG.LIST_TITLE,href:backPath},{title:organization.name}]}` + title+Tag status (đưa vào `extra` nhỏ hoặc subtitle; title chỉ text) + giữ cụm action buttons (approve/reject/suspend/history/back) ở khu vực action — có thể đặt vào `extra` hoặc ngay dưới header; **ưu tiên giữ logic/handlers nguyên vẹn, chỉ bọc presentation**. Giữ toàn bộ mutations/handlers/state/modals/cards/panel.
- [ ] **Step 2:** Diff-verify 409/404/403/`D-21`/`SAVE_FAILED`/NFR, `isAnyModalOpen`, `editable suspended`, invalidations `adminKeys`, `backToListPath`/nav.
- [ ] **Step 3:** `tsc -b` exit 0.

### Task 4: `ModuleCatalogPage`
- [ ] **Step 1:** Add `PageHeader` + toolbar children. Giữ query/filter/columns/error/loading/empty.
- [ ] **Step 2:** `tsc -b` exit 0.

### Task 5: Xác minh tổng
- [ ] **Step 1:** `tsc -b` exit 0; `npm run build` OK.
- [ ] **Step 2:** Vitest hồi quy: `LoginPage/AuthCard/RegisterPage/PageHeader/ConsoleShell` xanh. `router.test.tsx` ngoài scope.
- [ ] **Step 3:** Grep: AllOrgs `ENDPOINT_CODE 'D-20'`+`isEndpointMissing`+`SAVE_FAILED`; OrgDetail `ALREADY_REVIEWED` 409 path, `NOT_FOUND` 404 path, `msgBackendPending('D-21')`, `editable={organization.status !== 'suspended'}`, `isAnyModalOpen`. (skip commit)