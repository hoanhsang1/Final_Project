# Kiểm toán & thiết kế: mượn/trả thiết bị (mục 8)

- Repo: `hoanhsang1/Final_Project`
- Nhánh kiểm toán: `fixFlowCreateEmployee`
- Commit tham chiếu: `afbd6f5` (2026-11-19)
- Phạm vi: chỉ đọc mã nguồn + SQL; **không** tạo migration, **không** thêm API, **không** chạy lệnh trên DB thật.
- Kết luận ngắn: hệ thống hiện **chưa có** nghiệp vụ mượn/trả thiết bị. Tài liệu này chỉ mô tả mô hình hiện tại, đề xuất thiết kế và liệt kê quyết định nghiệp vụ còn thiếu.

## 1. Mô hình hiện tại

### 1.1 Bảng dữ liệu (Facility DB)

| Bảng | Cột chính | Ý nghĩa |
| --- | --- | --- |
| `classroom` | `id, org_id, department_id, code, name, building, floor, capacity, room_type, status` | Phòng học; `department_id` thêm bởi migration 37 |
| `equipment` | `id, org_id, department_id, room_id, asset_code, name, equipment_type, purchase_date, status, deleted_at` | Sổ tài sản thiết bị; gắn phòng qua `room_id` (có thể NULL) |
| `equipment_status_log` | `equipment_id, incident_report_id, changed_by, old_status, new_status, reason, changed_at` | Lịch sử đổi trạng thái thiết bị |
| `incident_report` | `equipment_id, reported_by, description, photo_url, status, resolved_at` | Báo/xử lý sự cố thiết bị |

Trạng thái thiết bị (`equipment.status`): `in_use`, `broken`, `maintenance`, `in_storage`, `retired`.
Trạng thái sự cố (`incident_report.status`): `open`, `in_progress`, `resolved`, `unresolved`.

Không có bảng nào biểu diễn: người mượn, thời gian mượn, thời hạn trả, phiếu mượn, tình trạng lúc trả, quá hạn.

### 1.2 API hiện có

Tiền tố `/departments/{departmentId}/facilities` (FacilityService, gateway proxy):

| Endpoint | Quyền yêu cầu | Module |
| --- | --- | --- |
| `GET /` (legacy), `GET /rooms` | `facility.room.view` hoặc `facility.view` | `FACILITY_MANAGEMENT` (đọc) |
| `POST/PUT/DELETE /rooms...` | `facility.room.create/update/delete` hoặc `facility.manage` | `FACILITY_MANAGEMENT` (ghi) |
| `GET /equipment` | `facility.equipment.view`/`facility.view`/`facility.manage` | đọc |
| `POST/PUT/DELETE /equipment...` | `facility.equipment.create/update/delete` hoặc `facility.manage` | ghi |
| `GET /issues`, `POST /issues`, `POST /issues/{id}/resolve` | `facility.issue.report/resolve`, `facility.equipment.view`, `facility.manage` | đọc/ghi theo hành động |

Mọi truy vấn lọc `org_id` lấy từ JWT và `department_id` trên URL; quyền được kiểm bằng `actor.requireAnyPermissionIn(codes, departmentId)` nên phạm vi DEPARTMENT chỉ thấy dữ liệu phòng mình.

### 1.3 Quyền & vai trò hiện tại

| Mã quyền | Phạm vi | Ghi chú |
| --- | --- | --- |
| `facility.view`, `facility.manage` | ORGANIZATION, DEPARTMENT | Quyền gộp |
| `facility.room.view/create/update/delete` | ORGANIZATION, DEPARTMENT | Quản lý phòng |
| `facility.equipment.view/create/update/delete` | ORGANIZATION, DEPARTMENT | Quản lý thiết bị |
| `facility.issue.report`, `facility.issue.resolve` | ORGANIZATION, DEPARTMENT | Báo/xử lý sự cố |

Chức vụ mặc định: “Nhân viên cơ sở vật chất” (DEPARTMENT) giữ toàn bộ mã `facility.*`; “Quản trị viên tổ chức” giữ toàn bộ ở phạm vi ORGANIZATION. Giáo viên chỉ có quyền self (`class.self_view`, `schedule.self_view`) — **không có quyền thiết bị**, kể cả báo sự cố.

### 1.4 Giao diện hiện có

`frontend/src/features/facility/pages/facility-page.tsx` (phòng + thiết bị) và `facility-issues-page.tsx` (sự cố). Form thiết bị cho chọn phòng, mã tài sản, tên, loại, ngày mua, trạng thái. Không có màn hình mượn/trả, không có lịch sử người dùng thiết bị.

## 2. Khoảng trống so với yêu cầu mượn/trả

1. Không có thực thể phiếu mượn → không truy vết ai đang giữ thiết bị.
2. `equipment.status` không có trạng thái “đang cho mượn”; đổi sang `in_storage`/`in_use` không phân biệt được đang mượn hay đang đặt trong phòng.
3. `equipment_status_log` không có `requested_by`, `due_at`, `loan_id` nên không dựng được báo cáo quá hạn.
4. Không có quyền dành cho người mượn (giáo viên/nhân viên), nên nếu mở API mượn mà dùng `facility.manage` sẽ cấp quá rộng (vi phạm nguyên tắc không nới quyền để chạy UI).
5. Không có ràng buộc trùng lịch: hai phiếu có thể cùng giữ một thiết bị trong cùng khoảng thời gian.
6. Sự cố (`incident_report`) không liên kết được với phiếu mượn để quy trách nhiệm khi trả hỏng.

## 3. Thiết kế đề xuất (chưa triển khai)

### 3.1 Thực thể đề xuất

```
equipment_loan_request
  id, org_id, department_id, requested_by, purpose,
  start_at, due_at, status,   -- xem 3.2
  decided_by, decided_at, decision_note,
  checked_out_by, checked_out_at,
  returned_to, returned_at, return_condition, return_note,
  incident_report_id NULL,    -- khi trả hỏng/mất
  created_at, updated_at

equipment_loan_item
  id, loan_request_id, equipment_id,
  status,                     -- requested / approved / checked_out / returned / rejected
  returned_condition, note,
  UNIQUE (loan_request_id, equipment_id)
```

- Mỗi thiết bị là một bản ghi tài sản duy nhất (`asset_code` unique theo org) → **không cần cột số lượng**; mượn 3 máy chiếu là 3 dòng `equipment_loan_item` (nếu nghiệp vụ xác nhận mỗi tài sản một bản ghi).
- Gắn `department_id` theo phòng ban của người tạo để tái dùng mô hình scope hiện tại.
- Không thêm cột vào `equipment`; trạng thái “đang cho mượn” suy ra từ `equipment_loan_item.status = 'checked_out'` để tránh lệch dữ liệu.

### 3.2 Trạng thái phiếu

```
REQUESTED ──approve──> APPROVED ──checkout──> CHECKED_OUT ──checkin──> RETURNED
    │                      │                        │
    └──reject──> REJECTED  └──cancel──> CANCELLED    └──(quá due_at)──> OVERDUE (suy ra, không lưu)
```

- `OVERDUE` nên là trạng thái **tính toán** (`CHECKED_OUT` và `due_at < now`) để không cần job cập nhật.
- Trả một phần: cho phép `checkin` theo từng `equipment_loan_item`; phiếu chỉ `RETURNED` khi mọi item đã trả.
- Trả hỏng/mất: bắt buộc `return_condition ∈ {ok, damaged, lost}`; nếu `damaged|lost` thì tạo `incident_report` và liên kết `incident_report_id`, đồng thời cập nhật `equipment.status` tương ứng qua service hiện có.

### 3.3 Ma trận quyền đề xuất

| Hành động | Mã quyền mới (đề xuất) | Ai giữ mặc định | Phạm vi |
| --- | --- | --- | --- |
| Tạo phiếu mượn cho chính mình | `facility.equipment.loan.request` | Giáo viên, Nhân viên, Nhân viên CSVC | DEPARTMENT |
| Xem phiếu của mình | (dùng quyền trên) | người tạo | DEPARTMENT |
| Xem toàn bộ phiếu trong phòng | `facility.equipment.loan.view` | Trưởng phòng ban, Nhân viên CSVC | DEPARTMENT |
| Xem toàn bộ phiếu trong tổ chức | `facility.equipment.loan.view` | Quản trị viên tổ chức | ORGANIZATION |
| Duyệt/từ chối phiếu | `facility.equipment.loan.approve` | Nhân viên CSVC, Quản trị viên tổ chức | DEPARTMENT/ORGANIZATION |
| Bàn giao (checkout) | `facility.equipment.loan.manage` | Nhân viên CSVC | DEPARTMENT |
| Nhận trả (checkin) | `facility.equipment.loan.manage` | Nhân viên CSVC | DEPARTMENT |
| Huỷ phiếu chưa duyệt | (quyền request của người tạo) | người tạo | DEPARTMENT |

Nguyên tắc:
- Không tái dùng `facility.manage` cho người mượn (tránh cấp quyền sửa/xoá thiết bị).
- Người tạo không tự duyệt phiếu của mình (`SELF_APPROVAL_NOT_ALLOWED` như WF-03/WF-04).
- Mọi endpoint kiểm `FACILITY_MANAGEMENT` đang `active` để ghi, `readable` để đọc, và lọc `org_id` + `department_id`.

### 3.4 Kiểm tra nghiệp vụ khi triển khai

1. Thiết bị phải tồn tại, chưa xoá mềm, `status NOT IN ('broken','retired')`.
2. Không cho mượn chồng lấn: `CHECKED_OUT` hiện tại hoặc `APPROVED` có `start_at < due_at` giao khoảng với phiếu mới.
3. `start_at < due_at`, thời hạn tối đa (cần chốt, ví dụ 30 ngày).
4. Chỉ người tạo huỷ được khi `REQUESTED`; người duyệt không huỷ thay.
5. Checkin trước `start_at` bị chặn; checkin sau `due_at` ghi nhận trễ (cần chốt có phạt hay không).
6. Mọi thay đổi trạng thái ghi audit + `equipment_status_log` nếu có đổi `equipment.status`.
7. Thông báo: người mượn khi duyệt/từ chối/sắp hết hạn; CSVC khi có phiếu chờ duyệt — hiện chưa có hạ tầng email, chỉ có hộp duyệt trong app (mục 5).

## 4. Quyết định nghiệp vụ còn thiếu (cần chốt trước khi code)

| # | Câu hỏi | Ảnh hưởng |
| --- | --- | --- |
| D1 | Phiếu mượn có cần duyệt không, hay CSVC bàn giao trực tiếp? | Có/không state `APPROVED` và quyền `approve` |
| D2 | Ai được mượn: giáo viên, nhân viên, sinh viên? | Cấp quyền `loan.request` cho vai trò nào |
| D3 | Mượn thiết bị ngoài phòng ban mình có được không? | Thêm luồng phiếu liên phòng + quyền ORGANIZATION |
| D4 | Mỗi tài sản là một bản ghi hay có số lượng theo loại? | Thiết kế `equipment_loan_item` (đã giả định 1 tài sản/dòng) |
| D5 | Thời hạn mượn tối đa, có gia hạn không? | Ràng buộc `due_at`, trạng thái gia hạn |
| D6 | Quá hạn xử lý thế nào (chặn mượn tiếp, báo cáo, phạt)? | Báo cáo và quy tắc chặn |
| D7 | Trả hỏng/mất: có bồi thường, ai xác nhận? | Liên kết `incident_report`, quy trình xử lý |
| D8 | Có cần đặt trước (reserve) thiết bị cho lịch học không? | Thêm trạng thái `RESERVED` hoặc tích hợp ScheduleService |
| D9 | Ai nhận trả: CSVC phòng hay người bàn giao ban đầu? | Quyền checkin và ghi nhận người nhận |
| D10 | Thông báo qua kênh nào khi chưa có email? | Chỉ hộp duyệt trong app hay bổ sung hạ tầng mail |

## 5. Kết luận phạm vi

- Không tạo migration, không thêm endpoint, không sửa schema/seed trong lần kiểm toán này.
- Khi các quyết định D1–D10 được chốt, triển khai tối thiểu: 2 bảng mới (idempotent migration 47+), quyền mới trong `PermissionCatalog` + migration Identity, controller mới dưới `/departments/{departmentId}/facilities/loans`, cùng bộ test quyền theo phòng ban và chống tự duyệt.
