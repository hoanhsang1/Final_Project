# MEMS FE — Lớp 5: `/quan-tri` tổ chức + module (spec, theo chỉ đạo "1")

> 2026-11-10. Tiếp sau L1–L4 (tsc/build/hồi quy xanh). **Chỉ presentation.**

## Mục tiêu
Áp `PageHeader` + state pattern nhất quán cho 4 trang `/quan-tri`:
- `AllOrganizationsPage`, `PendingOrganizationsPage`, `OrganizationDetailPage`, `ModuleCatalogPage`

## Bất biến (không đổi)
- Contract/API/DTO, route/guard/URL/IA. Không commit/push/merge.
- `vi_VN`, a11y (`role="alert"`/`aria-label`/`aria-current` giữ), token-driven, reduced-motion, 5-state awareness.
- **AllOrganizationsPage:** `useAllOrganizationsPage` + URL sort/filter/paging, collection 404 `D-20` → "chờ backend" (`isEndpointMissing`/`ENDPOINT_CODE`), ma trận action theo status (pending→null, suspended→reactivate, else→suspend), `useSuspendOrganization` + `handleSuspendError` (404/403/else NFR-REL-001 `MSG_ORG.SAVE_FAILED`) + `actionError` placement (modal open vs page), success messages, navigate detail `?from=to-chuc-tat-ca`.
- **PendingOrganizationsPage:** `usePendingOrganizations`, columns/sort locale `vi`, navigate detail, loading Skeleton/empty/error+retry. Không đổi query.
- **OrganizationDetailPage (logic-sensitive):** `useOrganizationDetail`/`adminKeys` invalidation, `approveOrganization`/`rejectOrganization` mutations + `handleMutationError` **409** (warning+close+invalidate pending+detail, no nav) / **404** (actionError+close+invalidate detail) / **403** / else (giữ modal, NFR-REL-001) + onSuccess navigate `backPath`, `suspendMutation` + `handleSuspendError` (404 `D-21`/403/else), `isAnyModalOpen`/`actionError` placement, `isPendingStatus`/ma trận nút, `ModuleConfigPanel editable={organization.status !== 'suspended'}` (C2/BR-04 context), `backToListPath`/`?from=`, breadcrumb→PageHeader breadcrumb, render text thuần (không `dangerouslySetInnerHTML`), modals.
- **ModuleCatalogPage:** `useModuleCatalogPage` URL params, client filter, core/optional `CORE_MODULES`/`MSG_MDL`, read-only, error+retry/loading/empty.

## Thay đổi (presentation-only)
- `PageHeader` (title/subtitle/breadcrumb/extra/children toolbar) thay header/Breadcrumb thủ công; giữ semantics state (Skeleton/Empty/Alert role/Result 404).
- Không thêm abstraction/copy logic mới.

## Xác minh
`npx tsc -b` exit 0; `npm run build` OK; vitest hồi quy xanh. Diff-check: AllOrgs `isEndpointMissing`+`D-20`+`SAVE_FAILED`/NFR; OrgDetail 409/404/403 handlers, `D-21`, `editable suspended`, `isAnyModalOpen`, invalidations, `backToListPath`. `router.test.tsx` ngoài scope.