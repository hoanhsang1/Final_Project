# Tài liệu cần xác nhận (BE / nghiệp vụ / tích hợp) — FE MEMS

> **Bản làm việc trong repo.** Copy từ `D:\Đồ án tốt nghiệp\cần xác nhận\scope\xac-nhan-be-va-tich-hop-fe.md`; bản ngoài repo chỉ để nộp. Đọc cùng `docs/sync-permission-code-conflict.md`, `docs/sync-schema-gap.md`, `docs/scope-can-chot-xep-lich.md`.

- **Ngày tạo:** 19/11/2026
- **Phạm vi:** Các điểm FE đang chờ xác nhận từ phía BE/nghiệp vụ để tích hợp và hoàn thiện hành vi. FE đã xử lý theo contract/đặc tả hiện có và ưu tiên an toàn (không đổi logic nghiệp vụ/phân quyền/bảo mật, không gọi API thật ghi dữ liệu khi kiểm thử).
- **Trạng thái:** Cần xác nhận (chưa chốt).

## 1. Endpoint & contract API còn chờ BE hoàn thiện/triển khai

FE hiện đã có màn hình/luồng gọi tương ứng và xử lý trường hợp endpoint chưa sẵn sàng (ví dụ 404 collection → hiển thị trạng thái "chờ backend"/thông báo phù hợp, không retry gây 404 lặp). Cần xác nhận lộ trình, URL/method, request/response và mã lỗi thực tế khi BE triển khai.

| Mã/nhóm | Nội dung | Vị trí tham chiếu (FE) | Cần BE xác nhận |
|---|---|---|---|
| D-16 | Lưu cấu hình module tổ chức `PUT /organizations/{id}/modules` (tập đầy đủ module mong muốn) | `frontend/src/features/admin/adminApi.ts`, `frontend/src/pages/OrganizationDetailPage/ModuleConfigPanel.tsx` | Endpoint đã có chưa; contract request/response; mã lỗi (400/403/404/409…); quy tắc module lõi/bắt buộc. |
| D-20, D-20b | Danh sách tất cả tổ chức `GET /api/v1/organizations` và options `GET /api/v1/organizations/options` | `frontend/src/features/admin/adminApi.ts`, `frontend/src/pages/AllOrganizationsPage/*`, `frontend/src/pages/AccountsPage/AccountsPage.tsx` | Endpoint, tham số lọc/phân trang/sort, envelope phân trang, field trả về. |
| D-21 | Vô hiệu hoá/Kích hoạt lại tổ chức (C1) | `frontend/src/components/SuspendOrganizationModal/*`, luồng gọi liên quan trong admin API/pages | Endpoint/method/body, điều kiện trạng thái hợp lệ, mã lỗi và thông điệp. |
| D-22 | Nhật ký hệ thống `GET /api/v1/audit-logs` (lọc theo org/account/keyword/action/from/to, phân trang) | `frontend/src/features/admin/adminApi.ts`, `frontend/src/pages/AuditLogPage/*`, `frontend/src/pages/OrganizationAuditPage/*`, `frontend/src/pages/AccountDetailPage/use-account-audit.ts`, `frontend/src/components/AuditLogTable/AuditLogTable.tsx` | Endpoint, tham số lọc, envelope, schema item; tên hằng `action`, `target_type`, `entity_type` (nếu có), định dạng thời gian. |
| D-24, D-24c… | Danh sách/chi tiết/cập nhật trạng thái/vai trò tài khoản | `frontend/src/pages/AccountsPage/*`, `frontend/src/pages/AccountDetailPage/*`, `frontend/src/features/admin/types.ts` | Endpoint, field bắt buộc/tuỳ chọn (`full_name`, `last_login_at`, `organization_*`…), quy tắc đổi trạng thái/vai trò. |
| D-29, D-30, D-31 | Tạo tài khoản, đổi vai trò, đặt lại mật khẩu | `frontend/src/features/admin/adminApi.ts`, `frontend/src/components/AccountCreateModal/*`, `frontend/src/pages/AccountDetailPage/*` | Contract payload/response (username/password sinh phía BE hay sao), gửi email/mật khẩu tạm, mã lỗi trùng/không hợp lệ/không tìm thấy. |
| D-27 (C3) | Duyệt/từ chối tổ chức kèm `notifyEmail` | `frontend/src/features/admin/adminApi.ts`, `frontend/src/pages/OrganizationDetailPage/{Approve,Reject}OrganizationModal.tsx`, `frontend/src/pages/OrganizationDetailPage/OrganizationDetailPage.tsx` | BE có nhận và xử lý `notifyEmail` đúng như FE gửi (`approve`: `{notifyEmail}`, `reject`: `{reason, notifyEmail}`) không; hành vi khi gửi mail thất bại. |

## 2. Dữ liệu, trường và quy ước cần khớp

| Hạng mục | Hiện trạng FE | Cần xác nhận |
|---|---|---|
| Audit log — action/target | FE định nghĩa nhãn theo Đặc tả Sprint 2 §4.3 (`ORG_APPROVED/REJECTED/...`, `ACCOUNT_CREATED/ROLE_CHANGED/PASSWORD_RESET`, target `ORGANIZATION/ACCOUNT`) nhưng ghi chú hợp đồng chưa có ở BE | Tên hằng/action và target/entity type **chốt cuối cùng** từ BE; có bổ sung action/entity nào khác không. |
| Lịch sử Sprint 4 — người thực hiện/thời điểm | FE chuẩn hoá linh hoạt: chấp nhận `at`/`createdAt`, `actorId`/`changedBy`, `actorName`/`actorUserId` để không phụ thuộc một phía | Shape chuẩn BE trả về (`at` hay `createdAt`, `actorId/changedBy`, có `actorName` không, có `note/reason` như đặc tả không). |
| Module code & module lõi | FE dùng `code` module từ API/dữ liệu tổ chức và tập module lõi cấu hình phía FE; danh mục module lấy từ API (không hardcode danh mục đăng ký) | Danh sách mã module chính thức, mã module lõi bắt buộc, và quy tắc hiển thị/tên module thống nhất với BE. |
| Thành viên/tài khoản — payload & role | Tạo tài khoản theo D-29 (email, full_name, role, organization_id; username/password do BE xử lý theo đặc tả). Một số màn owner/staff dùng payload theo flow hiện có | Payload/field bắt buộc cho tạo/sửa thành viên, giá trị role backend hợp lệ theo từng ngữ cảnh, ràng buộc email/username. |
| Duyệt/từ chối tổ chức — lý do | FE yêu cầu lý do khi từ chối và gửi `reason` đã trim kèm `notifyEmail` (theo Q-14/D-27 trong codebase) | Độ dài/validate `reason` phía BE, có bắt buộc `reason` trong mọi trường hợp từ chối không, có lưu/hiển thị lại lý do không. |

## 3. Quy tắc nghiệp vụ / phân quyền / bảo mật

| Hạng mục | Cần xác nhận |
|---|---|
| BR-04 (vô hiệu hoá/không "xoá") và các trạng thái chuyển đổi | Quy tắc chuyển trạng thái tổ chức/tài khoản/thực thể nào được phép theo từng vai trò; thông điệp/lỗi BE trả về. |
| Phân quyền theo vai trò/module | Ma trận quyền chính thức cho từng màn/endpoint (OWNER/ADMIN/SUPER_ADMIN/STAFF/teacher…), đặc biệt các endpoint mới (audit, accounts, org list/options). FE hiện dựa trên guard/permission sẵn có và không tự mở rộng quyền. |
| Email/thông báo | Khi nào gửi email (duyệt/từ chối/tạo tài khoản/đặt lại mật khẩu), nội dung/mẫu, và hành vi khi `notifyEmail=false` hoặc dịch vụ mail lỗi. |
| Bảo mật phiên/đăng nhập | Chính sách token/refresh/logout, CORS, và các header/ràng buộc bảo mật khi tích hợp qua gateway. (FE không thay đổi cơ chế hiện có.) |

## 4. Tích hợp & môi trường (thực hiện sau khi FE ổn định)

| Hạng mục | Cần xác nhận |
|---|---|
| CORS / Gateway / Base URL | Cấu hình CORS, routing gateway, base URL theo môi trường (dev/staging/prod), prefix `/api/v1` và các route đặc thù (`/departments`, `/positions`, `/permissions` vs `/api/...`) khớp thực tế triển khai. |
| Dữ liệu & kịch bản kiểm thử tích hợp | Tài khoản/môi trường test, dữ liệu seed, và kịch bản kiểm thử không ghi dữ liệu thật ngoài phạm vi cho phép. |
| Thời điểm tích hợp | FE sẽ tích hợp sau; cần lịch bàn giao/ổn định contract từ BE để nối từng nhóm endpoint (org, module, account, audit, sprint 4). |

## 5. Ghi chú
- Các mục trên được tổng hợp từ hiện trạng mã FE và đặc tả/tham chiếu có trong repo; mục nào chưa nêu rõ trong đặc tả được liệt kê để **xác nhận**, không suy đoán.
- Khi BE/nghiệp vụ chốt, FE sẽ cập nhật mapping/type/hiển thị tương ứng mà không thay đổi nguyên tắc: giữ UI tương tự, thông điệp tiếng Việt thân thiện, không lộ mã/kỹ thuật thô cho người dùng.
