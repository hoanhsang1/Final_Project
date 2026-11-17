# 00 — Bối cảnh & dấu hiệu "tạm / chưa làm"

> **Mục đích:** Trước khi review UX, ghi lại những thứ *có thể trông thừa/thiếu/lỗi* nhưng thực ra là **tạm, thử nghiệm, hoặc chưa tới sprint** — kèm bằng chứng `file:dòng`.
> **Cách làm:** chỉ đọc code + tài liệu (Giai đoạn 0), chưa chạy app.
> **Nguyên tắc:** không suy đoán ý định của team. Có bằng chứng → ghi bằng chứng; không có → để "Cần xác minh".

---

## 1. Bối cảnh dự án (tóm tắt)

- **MEMS** — Hệ thống Quản lý Giáo dục. Frontend: React 19 + TS + Vite + React Router 7 + TanStack Query + Zustand + Axios.
- **Phân vai** (`PROJECT_CONTEXT.md:12`): Nghĩa — Frontend · Sang — Backend · Bảo — BA · Vy — QA.
- **Đang trong quá trình chuyển UI:** từ **Ant Design 5** sang **`@astryxdesign/core@0.7.16`** (nhánh `feat/astryx-migration`). Đã port xong: auth (P2), component dùng chung (P3a), console shell (P3b), Giáo viên + Lớp học (P3c). **Còn nhiều trang vẫn dùng antd** → trạng thái "lai" (hybrid) có chủ đích.
- **Backend chưa chạy sẵn** trên máy → mọi review UI phải **giả lập API bằng `page.route`** (ràng buộc #4).
- **Sprint 4** vừa xong phần Giáo viên/Lớp học (khu `/dao-tao`).

---

## 2. Dấu hiệu "tạm / thử nghiệm / chưa làm" (kèm bằng chứng)

### 2.1 Demo & xem thử (đúng như prompt liệt kê)

| # | Thứ | Bằng chứng | Diễn giải |
|---|-----|-----------|-----------|
| D1 | Trang "Xem thử vai trò" `/xem-thu/:vaiTro` | `frontend/src/router.tsx:122-126`; `frontend/src/pages/RolePreviewPage/RolePreviewPage.tsx:16-17` ("chỉ dựng bố cục để xem trước, **KHÔNG xác thực**") | Nút/route dành cho demo, không phải luồng thật |
| D2 | RolePreviewPage = **màn tạm** thay trang chủ theo vai trò | `RolePreviewPage.tsx:14-15` ("Đây là màn hình **tạm** thay cho trang chủ theo vai trò (**Sprint sau sẽ dựng**)") | Chủ đích tạm; thiếu trang chủ thật là "chưa tới sprint" |

### 2.2 Trang còn dùng antd (chưa port) — trạng thái lai có chủ đích

Bằng chứng: `docs/ui-conventions.md:490` ("con vẫn có thể còn antd — đó là dạng **lai được phép** cho tới P4").

`grep "from 'antd'"` trong `frontend/src` → **37 file** (đã trừ trùng), gồm:

- **Khung/route:** `router.tsx` (`Spin` cho `RouteFallback`, dòng 1 & 63-80), `main.tsx` (`App`, `ConfigProvider`).
- **Guard:** `AdminGuard.tsx`, `OwnerGuard.tsx`, `AcademicGuard.tsx` (dùng `Result` antd cho 403).
- **Trang console quản trị (Sprint 2):** `OverviewPage`, `PendingOrganizationsPage`, `AllOrganizationsPage`, `OrganizationDetailPage` (+ `ApproveOrganizationModal`, `RejectOrganizationModal`, `ModuleConfigPanel`), `OrganizationAuditPage`, `ModuleCatalogPage`, `AccountsPage`, `AccountDetailPage`, `AuditLogPage`, `NotFoundPage`, `RolePreviewPage`.
- **Trang Owner (Sprint 3):** `DepartmentsPage`, `DepartmentDetailPage`, `PositionsPage`.
- **Trang Đào tạo (Sprint 4) còn antd:** `TeacherDetailPage`, `ClassDetailPage`.
- **Component dùng chung còn antd:** `AuditLogTable`, `TempPasswordModal`, `AccountCreateModal`, `AccountResetPasswordModal`, `AccountRoleModal`, `AccountStatusModal`, `DepartmentFormModal`, `PositionFormModal`, `MemberFormModal`, `MemberPositionsModal`, `SuspendOrganizationModal`.
- **Test còn antd:** `DepartmentsPage.test.tsx`, `OwnerGuard.test.tsx`.

> **Hệ quả cho review:** chênh lệch phong cách nút/bảng/thông báo giữa trang Astryx và trang antd **có thể là chủ đích** trong giai đoạn chuyển đổi → cân nhắc nhãn "Có thể là chủ đích" khi thấy lệch style, nhưng lệch **bố cục/luồng** thì vẫn review bình thường.

### 2.3 Chờ backend — endpoint chưa có (mã `D-xx`)

Bằng chứng: `docs/api.md:25-26` ("`PUT …/modules` — ⚠️ chưa có (`D-16`)"; "Endpoint chưa cài đặt — Console Super Admin mở rộng — ⚠️ `D-20`…`D-31`"); comment trong `adminApi.ts` + các `use-*.ts`.

| Mã | Endpoint / thứ chưa có | Bằng chứng FE | UI khi gặp |
|----|------------------------|---------------|-----------|
| `D-05` | BE chưa nhận body `reason` (approve/reject) | `adminApi.ts:107-109` | BE bỏ qua, vẫn 204 |
| `D-15` | cột `is_core` trong bảng `module` | `coreModules.ts:4`, `adminMessages.ts:223-225` | FE tự phân loại module lõi |
| `D-16` | `PUT /api/v1/organizations/{id}/modules` | `adminApi.ts:126` | "Tính năng đang chờ backend" |
| `D-19` | field mở rộng danh sách tổ chức | `AllOrganizationsPage.tsx:26,45` | hiện "—" khi thiếu |
| `D-20` | `GET /api/v1/organizations` | `AllOrganizationsPage.tsx:24`, `use-all-organizations.ts:40` | 404 → "Tính năng đang chờ backend" |
| `D-20b` | `GET /api/v1/organizations/options` | `adminApi.ts:193` | dropdown có thể rỗng |
| `D-21`/`D-21b` | suspend/reactivate tổ chức | `adminApi.ts:207,221` | chờ BE |
| `D-22` | `GET /api/v1/audit-logs` | `adminApi.ts:236` | "Tính năng đang chờ backend" |
| `D-24`/`D-24b`/`D-24c` | accounts list/detail/status | `AccountsPage.tsx:34`, `AccountDetailPage.tsx:87-91` | "Tính năng đang chờ backend" |
| `D-27` | BE chưa đọc `notifyEmail` | `adminApi.ts:88-91` | — |
| `D-29` | `POST /api/v1/accounts` | `adminApi.ts:300` | lỗi trong modal |
| `D-30` | `PATCH …/accounts/{id}/role` | `adminApi.ts:315` | lỗi trong modal |
| `D-31` | `POST …/accounts/{id}/reset-password` | `adminApi.ts:329` | lỗi trong modal |
| `D-32` | `POST /api/v1/auth/forgot-password` | `ForgotPasswordPage.tsx:27`, `authApi.ts:220` | banner "chức năng chưa sẵn sàng" |
| `D-33` | `POST /api/v1/auth/reset-password` | `ResetPasswordPage.tsx:32`, `authApi.ts:236` | "chức năng chưa sẵn sàng" |

Câu chữ chờ BE: `msgBackendPending(code)` → `"Tính năng đang chờ backend (D-nn)."` (`adminMessages.ts:393-399`).

### 2.4 Vai trò / tính năng chưa có màn hình

| # | Thứ | Bằng chứng | Diễn giải |
|---|-----|-----------|-----------|
| D3 | `ORG_ADMIN`, `FACILITY_STAFF` chưa có slug FE | `backendRoles.ts:24` (`// TODO(Sprint sau)`), `backendRoles.ts:11-13`, `roleLabels.ts:9` | Role map về `null` → LoginPage hiện "vai trò chưa có màn hình" (`LoginPage.tsx:51,90`) |
| D4 | `ModuleCatalogPage` **read-only** | `ModuleCatalogPage.tsx:38` ("BE chưa có API bật/tắt module toàn cục, nên màn này chỉ để…") | Thiếu nút bật/tắt = chưa tới sprint |

### 2.5 Mật khẩu tạm (hành vi cố ý, không phải lỗi)

- `TempPasswordModal.tsx:23-32`: `closable={false}`, `maskClosable={false}`, chỉ có 1 nút xác nhận — **cố ý** vì mật khẩu tạm chỉ hiện một lần (`docs/ui-conventions.md:390`). Tương tự dialog mật khẩu tạm ở `TeachersPage` (P3c-2).

---

## 3. Những chỗ grep **KHÔNG** thấy dấu hiệu

Để tránh gán nhãn sai "đây là tạm":

- Không có `console.log`, `debugger`, `HACK`, `TEMP`, `feature flag` trong `frontend/src`.
- `TODO`/`FIXME` trong `frontend/src`: **chỉ 1 chỗ** — `backendRoles.ts:24` (đã ghi ở D3). Không có TODO rải rác khác.
- Không có comment chứa `mock` trong code sản phẩm (chỉ có `vi.mock` trong file test).

---

## 4. Lệch giữa tài liệu và thực tế (cần lưu ý khi review)

| # | Tài liệu nói | Thực tế code | Bằng chứng |
|---|--------------|--------------|-----------|
| L1 | `PROJECT_CONTEXT.md` §2.3: UI = **Ant Design 5**; Form = **React Hook Form + Zod** | Đang chuyển sang **Astryx**; form tự viết **`useFormState`** (không RHF/Zod) | `PROJECT_CONTEXT.md:60-61` vs `frontend/src/hooks/useFormState.ts`, `RegisterPage.tsx:83` |
| L2 | `PROJECT_CONTEXT.md:67` "Mọi style qua token `ConfigProvider`" | Đã bỏ antd `ConfigProvider` cho trang port; dùng CSS var + `astryx-theme.ts` | `docs/ui-conventions.md:45` ("token antd cũ" cho trang **chưa** port) |
| L3 | `PROJECT_CONTEXT.md:5` cập nhật "2026-11-05 (draft)" | Nhiều mục đã lỗi thời sau Sprint 3–4 | — |

> **Kết luận:** `PROJECT_CONTEXT.md` **không** còn là nguồn chuẩn cho stack UI. Nguồn chuẩn hiện tại: `docs/ui-conventions.md` (v2) + `docs/api.md` + đặc tả Sprint.

---

## 5. Tài liệu nguồn đã dùng

- `PROJECT_CONTEXT.md` (ngữ cảnh tổng, có mục lỗi thời).
- `docs/api.md` (contract + mã `D-xx`/`Q-xx`).
- `docs/ui-conventions.md` (hợp đồng UI v2: 5 trạng thái, BR-04/BR-08/NFR-REL-001, trạng thái lai).
- `docs/bao-cao-be-sprint4-giao-vien-lop.md` (lỗi BE Sprint 4 — do FE ghi cho BE).
- Đặc tả Sprint: `D:\Đồ án tốt nghiệp\Tài liệu liên quan dự án\Sprint-van-hanh\Dac-ta\sprint4-fe-handoff.md` (ngoài repo, theo ngữ cảnh đã chốt).
- Code: `frontend/src/**`.

---

## 6. Câu hỏi cho team (từ Giai đoạn 0)

1. `/xem-thu/:vaiTro` và `RolePreviewPage` giữ tới sprint nào? Có nên ẩn khỏi người dùng thật ở bản phát hành không?
2. Trang chủ theo vai trò (thay `RolePreviewPage`) dự kiến ở sprint nào? Ở bản hoàn chỉnh, sau đăng nhập người dùng sẽ về đâu?
3. Các màn "Tính năng đang chờ backend" (`D-20`…`D-31`) — khi phát hành mà BE vẫn chưa xong thì ẩn menu hay giữ màn chờ?
4. `ModuleCatalogPage` read-only: có dự kiến cho bật/tắt module không?
5. `PROJECT_CONTEXT.md` §2.3 có nên cập nhật sang Astryx + `useFormState` không? (hiện gây hiểu nhầm cho người mới)

> Các mục "Cần xác minh" sẽ bổ sung sau khi chạy app thật (Giai đoạn 1–2).
