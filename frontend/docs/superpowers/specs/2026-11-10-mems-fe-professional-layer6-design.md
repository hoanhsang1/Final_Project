# MEMS FE — Lớp 6: Audit/history `/quan-tri` (spec, theo chỉ đạo "1")

> 2026-11-10. Tiếp sau L1–L5. **Chỉ presentation.**

## Mục tiêu
Áp `PageHeader` + state pattern cho 2 trang:
- `AuditLogPage` (`/quan-tri/nhat-ky`)
- `OrganizationAuditPage` (`/quan-tri/to-chuc/:id/lich-su`)

## Bất biến (không đổi)
- Contract/API/DTO, route/guard/URL/IA. Không commit/push/merge. `vi_VN`, a11y, token-driven, 5-state.
- **AuditLogPage:** `useAuditLogsPage`/URL params (q/action/from/to/page), collection 404 `D-22` → "chờ backend" (`isEndpointMissing`/`ENDPOINT_CODE`), filter controls (search/select/range) + handlers `updateParams`/`handleRangeChange`, `AuditLogTable` props (`query,page,pageSize,showTarget,onPaginationChange,emptyText,errorText`).
- **OrganizationAuditPage:** `useParams`/`useLocation`/`backToListPath` (giữ `?from=`), `useOrganizationDetail` (tên org, cached) + `useOrganizationAudit(orgId,page)`, local `page` state, collection 404 `D-22` → "chờ backend", `AuditLogTable` props.
- **Không đổi** component dùng chung `AuditLogTable`.

## Thay đổi (presentation-only)
- `PageHeader` thay header thủ công; OrgAudit dùng breadcrumb về `backPath`. Filter của AuditLog đặt trong `PageHeader children`.

## Xác minh
`npx tsc -b` exit 0; `npm run build` OK; vitest hồi quy xanh. Grep `D-22`/`isEndpointMissing`/handlers giữ nguyên. `router.test.tsx` ngoài scope.