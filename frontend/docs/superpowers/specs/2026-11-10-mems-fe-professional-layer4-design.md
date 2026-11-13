# MEMS FE — Lớp 4: `/to-chuc` + `/quan-tri` mẫu lõi (spec, đã duyệt ngầm theo chỉ đạo "tiếp tục")

> 2026-11-10. Tiếp sau L1–L3 (tsc/build/hồi quy xanh). **Chỉ presentation.**

## Mục tiêu
Áp `PageHeader` + state pattern nhất quán cho 4 trang đại diện:
- `/to-chuc`: `PositionsPage`, `DepartmentDetailPage`
- `/quan-tri`: `AccountsPage`, `AccountDetailPage`

## Bất biến (không đổi)
- Contract/API/DTO, route/guard/URL/IA. Không commit/push/merge.
- `vi_VN`, a11y (`role="alert"` lỗi, `aria-label` giữ), token-driven, reduced-motion, 5-state awareness.
- **PositionsPage:** `usePositionsPage`/query-mutation (create/update/remove), form/modal, `ownerErrorMessage`, `MSG_*`, empty+CTA, table/pagination, permission tags/labels.
- **AccountsPage:** `useAccountsPage` + URL params/sort/paging/filter, `adminKeys/options` query, D-24 collection 404 → "chờ backend" (khác lỗi khác), create mutation + map 409/403/404/NFR-REL-001, table `scroll.x`, aria-label, `queryClient.invalidateQueries(['accounts']/['audit-logs'])`.
- **AccountDetailPage (logic-sensitive):** `useAccountDetailQuery`/`useAccountAudit`, status/role/reset mutations + toàn bộ error mapping (409 tự đổi role, 400 password, 403/404 backend-pending, else fail) + `actionError`/modal, `ALLOWED_TARGETS`/`targetLabel`, item 404 → `Result 404` (khác collection), NFR-REL-001 (không báo thành công sai), invalidation `['accounts']/['audit-logs']`, breadcrumb/back `backToListPath`.
- **DepartmentDetailPage:** `useDepartmentDetail`/mutations (add/changePositions/remove) + temp password flow, loading skeleton, departmentsError/missing 404 Result, members error/empty/table, modals.

## Thay đổi (presentation-only)
- Thêm `PageHeader` (title/subtitle/breadcrumb/extra/children toolbar) thay header thủ công; bỏ link "Quay lại" rời nơi breadcrumb đã đủ (giữ hành vi điều hướng).
- Chuẩn hoá Alert lỗi: `role="alert"` + Retry/refetch giữ nguyên handler. Giữ `Skeleton`/`Spin`/`Empty`/`Result` semantics (item 404 ≠ collection 404 ở AccountsPage).
- Không thêm abstraction mới, không đổi copy nghiệp vụ/MSG keys.

## Xác minh
`npx tsc -b` exit 0; `npm run build` OK; vitest hồi quy (Login/AuthCard/PageHeader/ConsoleShell) xanh. Diff-check logic nhạy cảm (AccountsPage D-24 404, create error map; AccountDetail mutations/error/NFR-REL-001/targets/invalidation; DepartmentDetail mutations/temp flow). `router.test.tsx` pre-existing ngoài scope.