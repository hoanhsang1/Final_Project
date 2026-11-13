# Sprint 4 — Bàn giao Frontend (giao diện quản lý giáo viên & lớp)

Tài liệu này đủ để FE dựng giao diện. Đặc tả request/response đầy đủ ở
[`sprint4-api.md`](sprint4-api.md).

---

## 1. Kết nối & xác thực

| Mục | Giá trị |
|---|---|
| Base URL (local qua gateway) | `http://localhost:8080` |
| Login | `POST /api/v1/auth/login` |
| Header | `Authorization: Bearer <accessToken>` |
| Token hết hạn | dùng `refreshToken` như luồng hiện có |

Request login:

```json
{ "username": "sample_hr", "password": "Sample@123456" }
```

Response: `{ accessToken, refreshToken, tokenType, expiresIn }`.

FE giải mã JWT để lấy:

```json
{
  "sub": "<userId>",
  "orgId": "...",
  "departmentId": "...",
  "role": "STAFF",
  "roles": ["STAFF"],
  "permissions": ["CLASS_VIEW", "CLASS_ASSIGN_TEACHER"]
}
```

Quy ước chung:

- `page` bắt đầu từ **1**, `size` 1–100 (mặc định 20).
- Không gửi `orgId` trong body/query — server lấy từ JWT.
- Mọi API có `version` phải gửi đúng version vừa đọc.
- Lỗi trả `{ "success": false, "code": "...", "message": "...", "data": null }`; riêng `SPECIALTY_MISMATCH` có danh sách lớp ở `data.classes`. Response thành công giữ nguyên shape cũ.
- Route giáo viên/chuyên môn/lớp dùng prefix `/api` (gateway bỏ prefix): `/api/teachers`, `/api/specialties`, `/api/classes`.
- Route nhân sự/chức vụ dùng path gốc: `/departments/...`, `/positions`, `/permissions`.

---

## 2. Danh sách màn hình

| # | Màn hình | API chính | Quyền xem |
|---|---|---|---|
| 1 | Danh sách giáo viên | `GET /api/teachers` | `OWNER`, `PEOPLE_VIEW`, `PEOPLE_EDIT` |
| 2 | Tạo nhân sự / giáo viên | `GET /positions`, `POST /departments/{id}/members` hoặc `POST /api/teachers` | `PEOPLE_EDIT` |
| 3 | Chi tiết & sửa giáo viên | `GET/PUT /api/teachers/{id}` | `PEOPLE_VIEW/PEOPLE_EDIT` |
| 4 | Danh mục chuyên môn (modal) | `GET/POST /api/specialties` | xem: `PEOPLE_VIEW/PEOPLE_EDIT/CLASS_ASSIGN_TEACHER`; tạo: `PEOPLE_EDIT` |
| 5 | Danh sách lớp | `GET /api/classes` | `CLASS_VIEW` |
| 6 | Chi tiết lớp | `GET /api/classes/{id}` | `CLASS_VIEW` |
| 7 | Gán giáo viên (modal trong chi tiết lớp) | `GET /api/teachers/assignable`, `PUT /api/classes/{id}/teacher` | `CLASS_ASSIGN_TEACHER` |
| 8 | Hủy lớp (modal) | `POST /api/classes/{id}/cancel` | `CLASS_CANCEL` |
| 9 | Đóng / duyệt / từ chối / mở lại | `POST /api/classes/{id}/close-requests...`, `/reopen` | xem mục 6 |
| 10 | Lịch sử trạng thái & sự kiện đóng | `GET /api/classes/{id}/status-logs`, `/close-events` | `CLASS_VIEW` |

---

## 3. Màn hình 1 — Danh sách giáo viên

**Bộ lọc**

- Ô tìm kiếm `q`: mã nhân sự hoặc họ tên (không dấu/hoa thường).
- Combobox chuyên môn `specialtyId` (lấy từ `GET /api/specialties`).
- Combobox trạng thái `teachingStatus`: `DANG_DAY`, `TAM_NGHI`, `NGHI_VIEC`.
- Phân trang `page`, `size`.

**Cột bảng**

| Cột | Field |
|---|---|
| Mã nhân sự | `staffCode` |
| Họ tên | `fullName` |
| Email | `email` |
| SĐT | `phone` |
| Chuyên môn | `specialties[].name` |
| Loại hợp đồng | `contractType` (`CO_HUU` / `THINH_GIANG` / null) |
| Trạng thái dạy | `teachingStatus` |
| Lớp đang phụ trách | `classCount`; nếu `noClass=true` hiển thị `classLabel` ("Chưa có lớp") |

**Hành động**

- "Thêm nhân sự/giáo viên" — hiện khi có `PEOPLE_EDIT`.
- "Xem chi tiết" — mọi người có quyền xem.
- "Sửa" — hiện khi có `PEOPLE_EDIT`.

**Response mẫu**

```json
{
  "items": [{
    "userId": "user-1",
    "staffCode": "GV001",
    "fullName": "Nguyễn Văn An",
    "email": "an@example.com",
    "phone": "0901234567",
    "departmentId": "dept-1",
    "specialties": [{ "id": "sp-1", "name": "Toán" }],
    "contractType": "CO_HUU",
    "teachingStatus": "DANG_DAY",
    "classCount": 2,
    "noClass": false,
    "classLabel": null
  }],
  "total": 1, "page": 1, "size": 20, "pages": 1
}
```

Lưu ý: `noClass`, `classLabel` do server tính; FE **không tự tính lại**. Sau khi đổi giáo viên
của lớp, gọi lại danh sách để cập nhật nhãn.

---

## 4. Màn hình 2 — Tạo nhân sự / giáo viên

### 4.1. Xác định khi nào hiện khối giáo viên

1. Gọi `GET /positions`.
2. Mỗi chức vụ có `profileType`: `GENERAL` hoặc `TEACHER`.
3. Khi người dùng chọn **ít nhất một chức vụ `profileType='TEACHER'`**, hiện khối:
   - Mã nhân sự `staffCode` (bắt buộc)
   - Họ tên `fullName` (bắt buộc)
   - SĐT `phone` (bắt buộc)
   - Chuyên môn `teacherProfile.specialtyIds` (bắt buộc ≥ 1)
   - Loại hợp đồng `teacherProfile.contractType` (tùy chọn: `CO_HUU`, `THINH_GIANG`)
4. Chức vụ không phải TEACHER: giữ nguyên form nhân sự cũ, không gửi `teacherProfile`.

### 4.2. Hai cách tạo

**Cách A — tạo nhân sự trong phòng ban (form hiện có):**

```http
POST /departments/{departmentId}/members
```

```json
{
  "username": "gv.an",
  "email": "an@example.com",
  "role": "STAFF",
  "positionIds": ["pos-teacher"],
  "staffCode": "GV001",
  "fullName": "Nguyễn Văn An",
  "phone": "0901234567",
  "teacherProfile": {
    "specialtyIds": ["sp-1"],
    "contractType": "CO_HUU"
  }
}
```

**Cách B — tạo giáo viên trực tiếp:**

```http
POST /api/teachers
```

```json
{
  "departmentId": "dept-1",
  "username": "gv.an",
  "email": "an@example.com",
  "role": "STAFF",
  "positionIds": ["pos-teacher"],
  "staffCode": "GV001",
  "fullName": "Nguyễn Văn An",
  "phone": "0901234567",
  "teacherProfile": {
    "specialtyIds": ["sp-1"],
    "contractType": "CO_HUU"
  }
}
```

### 4.3. Sau khi tạo

Response `201` (cách B):

```json
{
  "userId": "user-1",
  "staffCode": "GV001",
  "fullName": "Nguyễn Văn An",
  "temporaryPassword": "Abc12345",
  "mustChangePassword": true
}
```

- Hiện modal thông báo mật khẩu tạm, nút "Sao chép".
- Cảnh báo người dùng phải đổi mật khẩu ở lần đăng nhập đầu.

### 4.4. Validate phía FE (khớp server)

| Trường | Quy tắc | Thông báo gợi ý |
|---|---|---|
| `staffCode` | bắt buộc, ≤ 50 ký tự | "Vui lòng nhập mã nhân sự" |
| `fullName` | bắt buộc, ≤ 200 ký tự | "Vui lòng nhập họ tên" |
| `phone` | bắt buộc, đúng định dạng SĐT | "Số điện thoại không hợp lệ" |
| `email` | bắt buộc, đúng email | "Email không hợp lệ" |
| `specialtyIds` | ≥ 1 | "Chọn ít nhất một chuyên môn" |
| `contractType` | rỗng hoặc `CO_HUU`/`THINH_GIANG` | — |
| `positionIds` | ≥ 1 chức vụ TEACHER | "Cần chọn chức vụ Giáo viên" |

Server tự trim khoảng trắng và chuyển email về chữ thường; FE vẫn nên trim trước khi gửi.

---

## 5. Màn hình 3 — Chi tiết & sửa giáo viên

`GET /api/teachers/{userId}` trả:

- Thông tin: `staffCode`, `fullName`, `email`, `phone`, `departmentId`, `positionIds`.
- `specialties`, `contractType`, `teachingStatus`.
- `classes`: danh sách lớp đang phụ trách (`id`, `classCode`, `name`, `status`, `closeState`, `closeLabel`).
- `history`: lịch sử thay đổi (`action`, `actorUserId`, `createdAt`, `details.before/after`).
- `version`, `createdAt`, `updatedAt`.

**Form sửa** (`PUT /api/teachers/{userId}`):

```json
{
  "fullName": "Nguyễn Văn An",
  "email": "an@example.com",
  "phone": "0901234567",
  "specialtyIds": ["sp-1", "sp-2"],
  "contractType": "CO_HUU",
  "version": 2,
  "confirm": false
}
```

- `staffCode` **chỉ đọc**, không gửi lên.
- Gửi kèm `version` đang đọc.

### 5.1. Luồng `SPECIALTY_MISMATCH`

Nếu đổi chuyên môn làm lớp đang phụ trách lệch môn, server trả `409`:

```json
{
  "success": false,
  "code": "SPECIALTY_MISMATCH",
  "message": "Specialties no longer match the subject of assigned classes",
  "data": {
    "classes": [{ "id": "class-1", "name": "Lớp 10A" }]
  }
}
```

FE hiển thị modal:

> "Chuyên môn mới không còn khớp với môn của các lớp sau: Lớp 10A. Vẫn lưu?"

- Hủy → đóng modal, giữ form.
- Đồng ý → gọi lại **cùng payload** với `"confirm": true`.

### 5.2. Lịch sử

Tab "Lịch sử thay đổi" hiển thị `history` dạng timeline:

- `details` có dạng `{ "field": { "before": ..., "after": ... } }`.
- Trường hợp đổi chuyên môn: key `specialtyIds`, giá trị là mảng id trước/sau.

---

## 6. Màn hình 5–6 — Danh sách & chi tiết lớp

### 6.1. Danh sách lớp

`GET /api/classes?page=&size=&q=&status=&selectable=`

| Cột | Field |
|---|---|
| Mã lớp | `classCode` |
| Tên lớp | `name` |
| Năm học | `academicYear` |
| Thời gian | `startDate` → `endDate` |
| Trạng thái | `status` (nhãn mục 7) |
| Nhãn đóng | `closeState` (nhãn mục 7) |
| Giáo viên | `teacher.fullName` hoặc "Chưa phân công" |
| Sĩ số | `studentCount` |
| Thao tác | theo quyền |

- `selectable=true`: dùng cho dropdown chọn lớp; server đã loại lớp kết thúc/hủy/đã đóng.
- `status` lọc theo 4 giá trị mới (server vẫn nhận giá trị cũ).
- Mỗi item có `version` để gửi khi sửa/hủy/gán.

### 6.2. Chi tiết lớp

Hiển thị:

- Thông tin lớp + badge trạng thái + badge đóng.
- Khối "Giáo viên phụ trách": `teacher {id, code, fullName}` hoặc "Chưa phân công".
- Nút "Gán/Đổi giáo viên" khi có `CLASS_ASSIGN_TEACHER` **và** lớp chưa kết thúc/hủy/đóng.
- Tab "Lịch sử trạng thái" (`status-logs`) và "Sự kiện đóng" (`close-events`).

### 6.3. Modal gán giáo viên

1. Gọi `GET /api/teachers/assignable?q=&page=&size=` (chỉ giáo viên `DANG_DAY` toàn tổ chức).
2. Chọn giáo viên → `PUT /api/classes/{id}/teacher`:

```json
{ "teacherId": "user-1", "version": 3 }
```

3. Thành công: đóng modal, cập nhật lớp bằng response (version đã tăng 1).
4. Nếu `409 TEACHER_ASSIGNMENT_MODULE_ACTIVE`: hiện thông báo tổ chức đang dùng quy trình
   phân công của Epic 12, không cho gán trực tiếp.

### 6.4. Modal hủy lớp

Chỉ hiện khi `status` là `CHUA_BAT_DAU` hoặc `DANG_DIEN_RA` và `closeState='NONE'`.

```json
{ "reason": "Trùng lịch khai giảng", "version": 3 }
```

- Lý do bắt buộc, trim khác rỗng.
- Thành công: cập nhật `status='DA_HUY'`.

### 6.5. Nút theo `closeState`

| `closeState` | Nút hiển thị | Điều kiện |
|---|---|---|
| `NONE` | "Yêu cầu đóng lớp" | có `CLASS_CLOSE_REQUEST`, lớp ≠ `DA_HUY` |
| `PENDING` | "Duyệt đóng" / "Từ chối" | có `CLASS_CLOSE_APPROVE`, **ẩn nếu người dùng là người gửi yêu cầu** |
| `CLOSED` | "Mở lại lớp" | có `CLASS_REOPEN` |

Ẩn nút tự duyệt: lấy sự kiện `REQUESTED` gần nhất từ `/close-events`, so `actorId` với `sub`
trong JWT.

- Yêu cầu đóng: `POST /api/classes/{id}/close-requests` body `{ "note": "..." }` (note tùy chọn).
- Duyệt: `POST /api/classes/{id}/close-requests/approve` không body.
- Từ chối: `POST /api/classes/{id}/close-requests/reject` body `{ "reason": "..." }`.
- Mở lại: `POST /api/classes/{id}/reopen` body `{ "reason": "..." }`.

Lớp `CLOSED`: toàn bộ form sửa, gán giáo viên, thêm/gỡ học sinh chuyển sang chỉ xem.

---

## 7. Nhãn hiển thị

### `status`

| Giá trị | Nhãn | Màu gợi ý |
|---|---|---|
| `CHUA_BAT_DAU` | Chưa bắt đầu | xám |
| `DANG_DIEN_RA` | Đang diễn ra | xanh dương |
| `DA_KET_THUC` | Đã kết thúc | xanh lá |
| `DA_HUY` | Đã hủy | đỏ |

### `closeState`

| Giá trị | Nhãn | Màu gợi ý |
|---|---|---|
| `NONE` | (không hiển thị) | — |
| `PENDING` | Chờ duyệt đóng | vàng |
| `CLOSED` | Đã đóng | xám đậm |

`status` và `closeState` độc lập: lớp có thể vừa "Đang diễn ra" vừa "Đã đóng".

### `teachingStatus`

| Giá trị | Nhãn |
|---|---|
| `DANG_DAY` | Đang dạy |
| `TAM_NGHI` | Tạm nghỉ |
| `NGHI_VIEC` | Nghỉ việc |

### `contractType`

| Giá trị | Nhãn |
|---|---|
| `CO_HUU` | Cơ hữu |
| `THINH_GIANG` | Thỉnh giảng |
| `null` | (để trống) |

---

## 8. Xử lý `version` và lỗi

### 8.1. Optimistic lock

Các API có `version`: sửa lớp, hủy lớp, gán giáo viên, sửa giáo viên.

- Luôn gửi `version` mới nhất vừa đọc.
- Gặp `409 DATA_CHANGED` / `STATUS_CHANGED`:
  - Hiện thông báo "Dữ liệu vừa được thay đổi bởi người khác".
  - Tải lại bản ghi, **không** tự gửi lại với version cũ.

### 8.2. Bảng lỗi cần xử lý

| HTTP | `code` | Thông báo FE |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body sai định dạng — hiển thị `message` |
| 400 | mã theo trường (vd `NAME_REQUIRED`, `CODE_TOO_LONG`) | Hiển thị lỗi tại trường tương ứng từ `message` |
| 400 | `MODULE_NOT_ENABLED` | "Tổ chức chưa bật module Quản lý sinh viên/lớp" |
| 400 | `INVALID_POSITION` | "Chức vụ đã chọn không phải Giáo viên" |
| 400 | `INVALID_SPECIALTY` | "Chuyên môn không hợp lệ hoặc không thuộc tổ chức" |
| 401 | `UNAUTHENTICATED` | Chuyển về đăng nhập |
| 403 | `FORBIDDEN` | "Bạn không có quyền thực hiện thao tác này" |
| 403 | `SELF_APPROVAL_NOT_ALLOWED` | "Bạn không thể tự duyệt yêu cầu của mình" |
| 404 | `TEACHER_NOT_FOUND` / `CLASS_NOT_FOUND` | "Không tìm thấy dữ liệu" |
| 409 | `EMAIL_EXISTS` | "Email đã được dùng bởi nhân sự khác" |
| 409 | `SPECIALTY_EXISTS` | "Chuyên môn đã tồn tại" |
| 409 | `CONFLICT` | "Mã đã tồn tại" |
| 409 | `DATA_CHANGED` | Tải lại hồ sơ giáo viên |
| 409 | `STATUS_CHANGED` | Tải lại lớp |
| 409 | `CLOSE_STATE_CHANGED` | Tải lại trạng thái đóng |
| 409 | `SPECIALTY_MISMATCH` | Mở modal xác nhận (mục 5.1) |
| 409 | `TEACHER_NOT_AVAILABLE` | "Giáo viên không còn đang dạy" |
| 409 | `CLASS_NOT_ASSIGNABLE` | "Lớp đã kết thúc/hủy/đóng, không thể gán" |
| 409 | `CLASS_NOT_EDITABLE` | "Lớp đang chỉ xem" |
| 409 | `CLASS_NOT_CANCELLABLE` | "Không thể hủy lớp ở trạng thái này" |
| 409 | `CLASS_NOT_CLOSABLE` | "Không thể yêu cầu đóng lớp đã hủy" |
| 409 | `TEACHER_ASSIGNMENT_MODULE_ACTIVE` | "Tổ chức dùng quy trình phân công Epic 12" |
| 500 | `UNCATEGORIZED_EXCEPTION` | "Có lỗi xảy ra, vui lòng thử lại" |
| 503 | `IDENTITY_UNAVAILABLE` | "Không kiểm tra được quyền, thử lại sau" |

---

## 9. Ẩn/hiện theo quyền

| Hành động | Quyền |
|---|---|
| Xem danh sách/chi tiết giáo viên | `PEOPLE_VIEW` hoặc `PEOPLE_EDIT` (OWNER luôn được) |
| Tạo/sửa giáo viên, tạo chuyên môn | `PEOPLE_EDIT` |
| Xem danh sách chuyên môn | `PEOPLE_VIEW` / `PEOPLE_EDIT` / `CLASS_ASSIGN_TEACHER` |
| Xem lớp | `CLASS_VIEW` |
| Tạo lớp | `CLASS_CREATE` |
| Sửa lớp / thêm-gỡ học sinh | `CLASS_EDIT` |
| Xóa lớp | `CLASS_DELETE` |
| Xem & gán giáo viên | `CLASS_ASSIGN_TEACHER` |
| Hủy lớp | `CLASS_CANCEL` |
| Yêu cầu đóng lớp | `CLASS_CLOSE_REQUEST` |
| Duyệt/từ chối đóng | `CLASS_CLOSE_APPROVE` |
| Mở lại lớp | `CLASS_REOPEN` |

Không có quyền → ẩn nút; nếu vẫn gọi API sẽ nhận 403.

---

## 10. Tài khoản mẫu để test giao diện

Mật khẩu chung: `Sample@123456`.

| Tài khoản | Vai trò | Dùng để test |
|---|---|---|
| `sample_owner` | OWNER | Toàn quyền |
| `sample_hr` | MANAGER | Tạo/sửa giáo viên, xem lớp; **không** hủy/duyệt lớp |
| `sample_academic` | STAFF | Tạo lớp, gán giáo viên, hủy lớp, gửi yêu cầu đóng |
| `sample_head` | STAFF | Duyệt đóng, mở lại lớp |
| `sample_teacher` | STAFF | Giáo viên `DANG_DAY` |
| `sample_teacher2` | STAFF | Giáo viên `TAM_NGHI` (không có trong assignable) |

---

## 11. Checklist nghiệm thu FE

- [ ] Danh sách giáo viên: tìm không dấu, lọc chuyên môn/trạng thái, phân trang.
- [ ] Hiện đúng "Chưa có lớp" khi `noClass=true`.
- [ ] Form tạo: hiện khối giáo viên khi chọn chức vụ `profileType='TEACHER'`.
- [ ] Sau khi tạo: hiện modal mật khẩu tạm.
- [ ] Sửa chuyên môn gây lệch môn: hiện modal danh sách lớp, gửi lại `confirm=true`.
- [ ] Sửa/hủy/gán với version cũ: hiện thông báo và tải lại, không ghi đè.
- [ ] Combobox gán giáo viên chỉ có giáo viên `DANG_DAY`.
- [ ] Nút đóng/mở lớp đổi theo `closeState` và quyền.
- [ ] Người gửi yêu cầu không thấy nút "Duyệt".
- [ ] Lớp `CLOSED`: form chỉ xem, ẩn nút sửa/gán.
- [ ] Hai tab lịch sử hiển thị đúng `status-logs` và `close-events`.
