# MEMS FE — Lớp 3 (/dao-tao Teachers) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Áp pattern list/detail (PageHeader + state, presentation-only) cho `TeachersPage` và `TeacherDetailPage`, giữ nguyên toàn bộ logic/mutation/version/mismatch/stale.

**Architecture:** Chỉ thay presentation (header/state layout) dùng `PageHeader` + token; không đổi data flow. `TeacherDetailPage` là presentation-only refactor quanh logic hiện có (giữ nguyên block logic).

**Tech Stack:** React, AntD 5, TanStack Query, React Router, Vitest/RTL (hồi quy), Vite.

**Spec:** `frontend/docs/superpowers/specs/2026-11-10-mems-fe-professional-layer3-design.md`.

## Global Constraints
- Không đổi contract/API/DTO, route/guard/URL/IA. Không commit/push/merge.
- Giữ `vi_VN`, a11y (`role="alert"` lỗi), token-driven, reduced-motion. 5-state awareness.
- **TeachersPage giữ:** `queryKey ['teachers',{page,size,department,status,search}]`, filter reset page, link `/dao-tao/giao-vien/${id}` theo quyền, pagination, createTeacher/createSpecialty + invalidate `['teachers']/['specialties']`, form/payload/validate, `sprint4ErrorMessage`.
- **TeacherDetailPage giữ tuyệt đối:** `version: d.version` gửi lên, `isMismatchError`→confirm modal+`confirm:true`, `isStaleConflict`→`refetch`/reset (theo code hiện tại) + `message.error`, `canEdit`/form/payload/validate/invalidate — NFR-REL-001, không đổi logic.

## Review Focus
- TeacherDetail `version`/`SPECIALTY_MISMATCH`/stale conflict không đổi (diff-verify).
- TeachersPage queryKey/permission/link/invalidation không đổi.

## File Map
- Modify (presentation): `src/pages/TeachersPage/TeachersPage.tsx`
- Modify (presentation): `src/pages/TeacherDetailPage/TeacherDetailPage.tsx`

---

### Task 1: `TeachersPage` — PageHeader + list state pattern

**Files:** Modify `src/pages/TeachersPage/TeachersPage.tsx`

- [ ] **Step 1: Refactor presentation**
  - Thêm `import PageHeader from '../../components/PageHeader/PageHeader'`. Bỏ `Title` nếu không dùng.
  - Thay header thủ công bằng `<PageHeader title={MSG_TEACHER.TITLE} extra={<Space wrap>{canEdit && nút quản lý chuyên môn}{canEdit && nút tạo primary}</Space>}>` và đặt filter (Select department/status + Search) vào `children` toolbar (giữ handler reset page).
  - Giữ error `Alert` (thêm `role="alert"`) + Retry; giữ `Table` loading/empty/columns/link/pagination/onChange. Giữ nguyên 2 Modal + logic/mutation.
- [ ] **Step 2: Verify**
  - Run: `cd D:\Final_Project\frontend; npx tsc -b` → exit 0.
- [ ] **Step 3: (skip commit — not requested)**

### Task 2: `TeacherDetailPage` — PageHeader + detail state (logic bất biến)

**Files:** Modify `src/pages/TeacherDetailPage/TeacherDetailPage.tsx`

- [ ] **Step 1: Refactor presentation, giữ nguyên logic**
  - Thêm `import PageHeader`. Giữ nguyên toàn bộ: imports nghiệp vụ, state, queries, `useEffect` setFields, `saveMut` (mismatch+stale), `confirmMismatchMut`, `onSave` gửi `version: d.version`, permission/canEdit.
  - Loading: `Spin`. Error: `Alert role="alert"` + Retry + Quay lại. Not-found giữ.
  - Header: `<PageHeader breadcrumb={[{title:'Giáo viên',href:'/dao-tao/giao-vien'},{title:d.profile?.fullName||'Giáo viên'}]} title={...} extra={action buttons giữ điều kiện editing/canEdit/saveMut.isPending} />` (bỏ nút Quay lại rời vì breadcrumb có; hoặc giữ — chọn breadcrumb đủ, rõ).
  - Giữ nguyên Descriptions/Form/Modal mismatch (nội dung/handlers/confirmMut).
- [ ] **Step 2: Diff-verify bất biến**
  - Confirm `version: d.version` (2 nơi), `isMismatchError`→setMismatch, `isStaleConflict`→refetch/reset, `confirm:true` mutation, invalidate keys — không đổi.
- [ ] **Step 3: Verify**
  - Run: `npx tsc -b` → exit 0.
- [ ] **Step 4: (skip commit — not requested)**

### Task 3: Xác minh tổng
- [ ] **Step 1:** `npx tsc -b` exit 0; `npm run build` OK.
- [ ] **Step 2:** `npx vitest run src/pages/LoginPage/LoginPage.test.tsx src/components/AuthCard/AuthCard.test.tsx src/pages/RegisterPage/RegisterPage.test.tsx src/components/PageHeader/PageHeader.test.tsx src/components/ConsoleShell/ConsoleShell.test.tsx` → xanh. `router.test.tsx` ngoài scope.
- [ ] **Step 3:** grep xác nhận TeacherDetail giữ `version`/`isMismatchError`/`SPECIALTY_MISMATCH` confirm/`isStaleConflict`/refetch. (skip commit)