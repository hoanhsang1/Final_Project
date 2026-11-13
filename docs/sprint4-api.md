# MEMS – API Sprint 4 (PeopleService)

Tài liệu cho frontend: hồ sơ giáo viên, danh mục chuyên môn, gán giáo viên cho lớp, vòng đời trạng thái lớp và luồng đóng lớp có duyệt.

## 1. Địa chỉ và xác thực

| Môi trường | Base URL |
|---|---|
| Local (qua gateway) | `http://localhost:8080` |
| Local (gọi thẳng PeopleService) | `http://localhost:8082` |

Mọi request cần header:

```
Authorization: Bearer <JWT>
```

`orgId`, `userId`, `departmentId`, `role`, `permissions` lấy từ JWT. Client **không** gửi `orgId` trong body/query.

Các nhóm route mới đều đi qua gateway 8080:

| Route | Service đích | Ghi chú |
|---|---|---|
| `/teachers/**` | PeopleService | dùng với frontend hiện tại |
| `/specialties/**` | PeopleService | |
| `/classes/**` | PeopleService | route cũ, giữ nguyên |
| `/api/teachers/**`, `/api/specialties/**`, `/api/classes/**` | PeopleService | alias có prefix `/api` (gateway bỏ prefix) |

Địa chỉ service đọc từ biến môi trường, mặc định localhost:

```
IDENTITY_SERVICE_URL=http://localhost:8081
PEOPLE_SERVICE_URL=http://localhost:8082
TEACHER_ASSIGNMENT_MODULE_CODE=TEACHER_ASSIGNMENT
```

## 2. Quy tắc chung

- **Phân trang:** `page` bắt đầu từ 1, `size` 1–100 (mặc định 20). Response danh sách giáo viên có `items, total, page, size, pages`; danh sách lớp có `items, total, page, size`.
- **Tìm kiếm:** server-side, không phân biệt dấu tiếng Việt và hoa/thường (giáo viên, chuyên môn). Ký tự `%`, `_` được escape nên không gây lỗi.
- **Cắt khoảng trắng:** mọi trường text được trim trước khi lưu. Email lưu chữ thường.
- **Optimistic lock:** các API có trường `version` phải gửi đúng version đang đọc được. Bản ghi đã đổi → **409** `DATA_CHANGED` hoặc `STATUS_CHANGED`.
- **Quyền:** thiếu token → **401** `UNAUTHENTICATED`; thiếu quyền → **403** `FORBIDDEN`.
- **Module:** mọi API lớp (`GET /classes*`, `status-logs`, `close-events`, huỷ/đóng/mở lại) yêu cầu module `STUDENT_MANAGEMENT` đang bật; nếu tắt → **400** `MODULE_NOT_ENABLED` với message `Module STUDENT_MANAGEMENT is not enabled for organization`. `/teachers*` và `/specialties*` **không** kiểm tra module.
- **Định dạng lỗi:** mọi lỗi trả cùng một phong bì `{ "success": false, "code": "...", "message": "...", "data": null }`. `code` là tên mã lỗi (enum), `message` là câu tiếng Anh mô tả ngắn. Với `SPECIALTY_MISMATCH`, danh sách lớp nằm trong `data.classes` (FE đọc `response.data.classes`).
- **Lỗi validate:** mỗi ràng buộc trường trả `code` riêng (ví dụ `NAME_REQUIRED`, `CODE_TOO_LONG`, `VERSION_REQUIRED`) thay vì `VALIDATION_ERROR`; `message` vẫn là câu giải thích. Response thành công giữ nguyên shape cũ (không bọc phong bì).

### Bảng quyền

| Quyền | Dùng cho |
|---|---|
| `CLASS_VIEW` | xem lớp, học sinh trong lớp, lịch sử trạng thái, sự kiện đóng |
| `CLASS_CREATE` | tạo lớp |
| `CLASS_EDIT` | sửa lớp, thêm/gỡ học sinh |
| `CLASS_DELETE` | xoá mềm lớp |
| `CLASS_ASSIGN_TEACHER` | xem danh sách chọn giáo viên, gán/đổi giáo viên |
| `CLASS_CANCEL` | huỷ lớp |
| `CLASS_CLOSE_REQUEST` | gửi yêu cầu đóng lớp |
| `CLASS_CLOSE_APPROVE` | duyệt/từ chối yêu cầu đóng |
| `CLASS_REOPEN` | mở lại lớp đã đóng |
| `PEOPLE_VIEW` / `PEOPLE_EDIT` | xem/sửa hồ sơ giáo viên, danh mục chuyên môn |

`OWNER` được phép tất cả endpoint (trừ ràng buộc “không tự duyệt”).

## 3. Danh mục chuyên môn

### GET `/specialties?q=`

Quyền: `OWNER`, `PEOPLE_VIEW`, `PEOPLE_EDIT` hoặc `CLASS_ASSIGN_TEACHER`.

Trả về mảng chuyên môn còn hoạt động của tổ chức.

```json
[
  { "id": "sp-1", "name": "Toán" },
  { "id": "sp-2", "name": "Vật lý" }
]
```

### POST `/specialties`

Quyền: `OWNER` hoặc `PEOPLE_EDIT`. Tạo mới (không phân biệt dấu/hoa thường khi kiểm trùng).

```json
{ "name": "Toán" }
```

- **201** `{ "id": "sp-1", "name": "Toán" }`
- **409** `SPECIALTY_EXISTS`

## 4. Giáo viên

### POST `/teachers`

Quyền: `PEOPLE_EDIT`.

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

`positionIds` phải có ít nhất một chức vụ `profile_type='TEACHER'`.

- **201**
```json
{
  "userId": "user-1",
  "staffCode": "GV001",
  "fullName": "Nguyễn Văn An",
  "temporaryPassword": "Abc12345",
  "mustChangePassword": true
}
```
- **400** `INVALID_POSITION` (không có chức vụ giáo viên), `INVALID_SPECIALTY`
- **409** `CONFLICT` / `EMAIL_EXISTS`

### GET `/teachers?q=&specialtyId=&teachingStatus=&page=&size=`

Quyền: `OWNER`, `PEOPLE_VIEW` hoặc `PEOPLE_EDIT`.

- `q`: tìm theo mã nhân sự hoặc họ tên (không dấu/hoa thường).
- `specialtyId`: lọc theo một chuyên môn.
- `teachingStatus`: `DANG_DAY`, `TAM_NGHI`, `NGHI_VIEC`.
- Không phải OWNER: chỉ thấy giáo viên thuộc phòng ban trong JWT.

```json
{
  "items": [
    {
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
    }
  ],
  "total": 1,
  "page": 1,
  "size": 20,
  "pages": 1
}
```

`noClass=true` và `classLabel="Chưa có lớp"` khi `classCount=0`. Frontend hiển thị đúng nhãn này, không tự tính lại.

### GET `/teachers/assignable?q=&page=&size=`

Quyền: `OWNER` hoặc `CLASS_ASSIGN_TEACHER`.

Chỉ trả giáo viên `teachingStatus='DANG_DAY'` trong **toàn tổ chức** (không giới hạn phòng ban), dùng cho combobox gán lớp.

```json
{
  "items": [
    {
      "userId": "user-1",
      "staffCode": "GV001",
      "fullName": "Nguyễn Văn An",
      "specialties": [{ "id": "sp-1", "name": "Toán" }],
      "classCount": 2,
      "teachingStatus": "DANG_DAY"
    }
  ],
  "total": 1, "page": 1, "size": 20, "pages": 1
}
```

Giáo viên `TAM_NGHI`/`NGHI_VIEC` không xuất hiện trong danh sách này.

### GET `/teachers/{staffId}`

Quyền: `OWNER`, `PEOPLE_VIEW` hoặc `PEOPLE_EDIT`. `staffId` là `user_id` của nhân sự.

```json
{
  "userId": "user-1",
  "staffCode": "GV001",
  "fullName": "Nguyễn Văn An",
  "email": "an@example.com",
  "phone": "0901234567",
  "departmentId": "dept-1",
  "positionIds": ["pos-teacher"],
  "specialties": [{ "id": "sp-1", "name": "Toán" }],
  "contractType": "CO_HUU",
  "teachingStatus": "DANG_DAY",
  "classes": [
    {
      "id": "class-1",
      "classCode": "C001",
      "name": "Lớp 10A",
      "status": "DANG_DIEN_RA",
      "closeState": "PENDING",
      "closeLabel": "Chờ duyệt đóng"
    }
  ],
  "version": 2,
  "createdAt": "2026-11-01T08:00:00Z",
  "updatedAt": "2026-11-06T09:00:00Z",
  "classCount": 1,
  "noClass": false,
  "classLabel": null,
  "history": [
    {
      "id": "audit-1",
      "action": "TEACHER_UPDATED",
      "actorUserId": "user-owner",
      "actorName": "Nguyễn Văn Chủ",
      "createdAt": "2026-11-06T09:00:00Z",
      "details": {
        "phone": { "before": "0900000000", "after": "0901234567" }
      }
    }
  ]
}
```

- **404** `TEACHER_NOT_FOUND` (sai id hoặc khác tổ chức)
- **403** nếu giáo viên ngoài phòng ban của người gọi (trừ OWNER)

### PUT `/teachers/{staffId}`

Quyền: `PEOPLE_EDIT`.

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

Nếu đổi chuyên môn làm mất khớp với môn của lớp đang phụ trách và `confirm != true` → **409** `SPECIALTY_MISMATCH`:

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

Frontend hiển thị cảnh báo và gọi lại với `"confirm": true` nếu người dùng đồng ý.

- **409** `DATA_CHANGED` khi `version` cũ.

## 5. Nhân sự có khối giáo viên

### POST `/departments/{departmentId}/members`

Quyền: `OWNER` hoặc (`MANAGER` + `PEOPLE_EDIT`). Khi chọn chức vụ có `profile_type='TEACHER'`, body phải có `staffCode`, `fullName`, `phone`, `teacherProfile`.

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

Trả `201`:
```json
{
  "member": {
    "userId": "user-1", "username": "gv.an", "departmentId": "dept-1",
    "role": "STAFF", "appointedBy": "user-owner", "appointedAt": "2026-11-06T08:00:00Z",
    "positionIds": ["pos-teacher"], "permissions": ["PEOPLE_VIEW"]
  },
  "temporaryPassword": "Abc12345",
  "mustChangePassword": true
}
```

`PUT /departments/{departmentId}/members/{userId}/positions` từ chối (400 `VALIDATION_ERROR`, `positionIds`) nếu gán chức vụ giáo viên cho người chưa có hồ sơ giáo viên.

## 6. Lớp học

### GET `/classes?page=&size=&q=&status=&selectable=`

Quyền: `OWNER` hoặc `CLASS_VIEW`.

- `q`: tìm theo tên/mã lớp.
- `status`: `CHUA_BAT_DAU`, `DANG_DIEN_RA`, `DA_KET_THUC`, `DA_HUY` (nhận cả giá trị cũ `active/inactive/archived`).
- `selectable=true`: chỉ trả lớp còn dùng được (loại `DA_KET_THUC`, `DA_HUY`, `closeState='CLOSED'`). Dùng cho dropdown chọn lớp.
- Trước khi trả dữ liệu, server tự cập nhật trạng thái theo `startDate`/`endDate`.

```json
{
  "items": [
    {
      "id": "class-1",
      "orgId": "org-1",
      "classCode": "C001",
      "name": "Lớp 10A",
      "academicYear": "2026-2027",
      "startDate": "2026-09-05",
      "endDate": "2027-05-30",
      "status": "DANG_DIEN_RA",
      "teacher": { "id": "user-1", "code": "GV001", "fullName": "Nguyễn Văn An" },
      "closeState": "NONE",
      "version": 3,
      "studentCount": 30,
      "createdBy": "user-owner",
      "createdAt": "2026-08-01T08:00:00Z",
      "updatedAt": "2026-09-05T00:05:00Z"
    }
  ],
  "total": 1, "page": 1, "size": 20
}
```

`teacher` là `null` khi lớp chưa có giáo viên.

### GET `/classes/{id}`

Quyền: `OWNER` hoặc `CLASS_VIEW`. Trả cùng cấu trúc một item ở trên, kèm 3 field lý do được suy ra từ log (không lưu cột riêng):

- `cancelReason`: `reason` của lần chuyển trạng thái `DA_HUY` gần nhất (`class_status_log`).
- `closeRequestNote`: ghi chú của yêu cầu đóng gần nhất (`class_close_event` action `REQUESTED`).
- `closeRejectReason`: lý do từ chối gần nhất (`class_close_event` action `REJECTED`).

Cả 3 là `null` khi chưa có dữ liệu tương ứng. Ba field này chỉ có ở endpoint chi tiết, danh sách trả `null` để tránh 3 subquery mỗi dòng.

- **404** `CLASS_NOT_FOUND`

### POST `/classes`

Quyền: `OWNER` hoặc `CLASS_CREATE`. Lớp mới luôn bắt đầu `CHUA_BAT_DAU` (trường `status` nếu gửi lên sẽ bị bỏ qua).

```json
{
  "classCode": "C001",
  "name": "Lớp 10A",
  "academicYear": "2026-2027",
  "startDate": "2026-09-05",
  "endDate": "2027-05-30"
}
```

- **201** trả về lớp vừa tạo.
- **409** `CONFLICT` nếu mã lớp trùng trong tổ chức.
- **400** `VALIDATION_ERROR` nếu `endDate < startDate`.

### PUT `/classes/{id}`

Quyền: `OWNER` hoặc `CLASS_EDIT`. **Không** đổi trạng thái ở endpoint này (dùng huỷ/job tự động).

```json
{
  "name": "Lớp 10A1",
  "academicYear": "2026-2027",
  "startDate": "2026-09-07",
  "endDate": "2027-05-30",
  "version": 3
}
```

- **409** `STATUS_CHANGED` khi `version` cũ hoặc trạng thái vừa bị đổi (ví dụ job tự chuyển).
- **409** `CLASS_NOT_EDITABLE` khi lớp `DA_KET_THUC`, `DA_HUY` hoặc `closeState='CLOSED'`.

### DELETE `/classes/{id}`

Quyền: `OWNER` hoặc `CLASS_DELETE`. Xoá mềm. **409** `CLASS_NOT_EMPTY` nếu còn học sinh.

### PUT `/classes/{id}/teacher`

Quyền: `OWNER` hoặc `CLASS_ASSIGN_TEACHER`.

```json
{ "teacherId": "user-1", "version": 3 }
```

`teacherId` là `user_id` (trùng `staffId` của `/teachers/{staffId}`).

- **200** trả về lớp sau khi gán, `teacher` đã cập nhật, `version` tăng 1.
- **409** `CLASS_NOT_ASSIGNABLE` – lớp đã kết thúc/bị huỷ/đã đóng.
- **409** `TEACHER_NOT_AVAILABLE` – giáo viên không `DANG_DAY` hoặc không còn chức vụ giáo viên.
- **404** `TEACHER_NOT_FOUND` – khác tổ chức.
- **409** `DATA_CHANGED` – sai `version`.
- **409** `TEACHER_ASSIGNMENT_MODULE_ACTIVE` – tổ chức đã bật module phân công giáo viên (Epic 12); dùng quy trình Epic 12 thay vì gán trực tiếp.

Đổi giáo viên chỉ ghi nhận cho tương lai; không có buổi học nào bị sửa. Server **không** kiểm tra trùng lịch.

### POST `/classes/{id}/cancel`

Quyền: `OWNER` hoặc `CLASS_CANCEL`.

```json
{ "reason": "Trùng lịch khai giảng", "version": 3 }
```

Chỉ huỷ được từ `CHUA_BAT_DAU` hoặc `DANG_DIEN_RA`, và `closeState='NONE'`.

- **200** trả lớp với `status='DA_HUY'`.
- **400** `VALIDATION_ERROR` – lý do rỗng/chỉ khoảng trắng.
- **409** `CLASS_NOT_CANCELLABLE` – trạng thái/close state không cho huỷ.
- **409** `STATUS_CHANGED` – sai `version` hoặc lớp vừa tự đổi trạng thái.

### GET `/classes/{id}/status-logs`

Quyền: `OWNER` hoặc `CLASS_VIEW`.

```json
[
  {
    "id": "log-1",
    "classId": "class-1",
    "fromStatus": "CHUA_BAT_DAU",
    "toStatus": "DANG_DIEN_RA",
    "reason": "AUTO_START",
    "changedBy": null,
    "changedAt": "2026-09-05T00:05:00Z",
    "actorName": null
  },
  {
    "id": "log-2",
    "classId": "class-1",
    "fromStatus": "DANG_DIEN_RA",
    "toStatus": "DA_HUY",
    "reason": "Trùng lịch khai giảng",
    "changedBy": "user-owner",
    "changedAt": "2026-09-10T03:00:00Z",
    "actorName": "Nguyễn Văn Chủ"
  }
]
```

`changedBy=null` = hệ thống tự chuyển (`AUTO_START`, `AUTO_END`). `actorName` lấy từ `staff_profile.full_name`, `null` nếu người thực hiện không còn hồ sơ nhân sự.

### POST `/classes/{id}/close-requests`

Quyền: `OWNER` hoặc `CLASS_CLOSE_REQUEST`. Chỉ khi `closeState='NONE'` và trạng thái ≠ `DA_HUY`.

```json
{ "note": "Đã hết khoá học" }
```

- **200** trả lớp với `closeState='PENDING'`.
- **409** `CLASS_NOT_CLOSABLE` – lớp đã huỷ.
- **409** `CLOSE_STATE_CHANGED` – đã có yêu cầu/đã đóng.

### POST `/classes/{id}/close-requests/approve`

Quyền: `OWNER` hoặc `CLASS_CLOSE_APPROVE`. Không có body. Chỉ khi `PENDING`.

- **200** trả lớp với `closeState='CLOSED'`.
- **409** `CLOSE_STATE_CHANGED` – chưa `PENDING`.
- **403** `SELF_APPROVAL_NOT_ALLOWED` – người gửi yêu cầu tự duyệt.

### POST `/classes/{id}/close-requests/reject`

Quyền: `OWNER` hoặc `CLASS_CLOSE_APPROVE`. Chỉ khi `PENDING`.

```json
{ "reason": "Còn học sinh chưa hoàn thành" }
```

- **200** trả lớp với `closeState='NONE'`.
- **400** `VALIDATION_ERROR` – thiếu lý do.
- **409** `CLOSE_STATE_CHANGED`.

### POST `/classes/{id}/reopen`

Quyền: `OWNER` hoặc `CLASS_REOPEN`. Chỉ khi `closeState='CLOSED'`.

```json
{ "reason": "Mở lại để bổ sung hồ sơ" }
```

- **200** trả lớp với `closeState='NONE'`.
- **409** `CLOSE_STATE_CHANGED`.

### GET `/classes/{id}/close-events`

Quyền: `OWNER` hoặc `CLASS_VIEW`.

```json
[
  { "id": "ev-1", "classId": "class-1", "action": "REQUESTED", "actorId": "user-manager", "actorName": "Trần Thị Quản Lý", "reason": "Đã hết khoá học", "note": "Đã hết khoá học", "createdAt": "2026-11-06T08:00:00Z" },
  { "id": "ev-2", "classId": "class-1", "action": "APPROVED", "actorId": "user-owner", "actorName": "Nguyễn Văn Chủ", "reason": null, "note": null, "createdAt": "2026-11-06T09:00:00Z" }
]
```

- `note`: chỉ có giá trị với action `REQUESTED` (ghi chú người gửi nhập). DB hiện dùng chung cột `reason`, response tách ra thành `note` để FE hiển thị đúng cột.
- `reason`: lý do của `REJECTED`/`REOPENED`; `null` với `REQUESTED`/`APPROVED`.
- `actorName`: `null` nếu người thực hiện không còn hồ sơ nhân sự.

### Học sinh trong lớp (đã có)

| Method | Path | Quyền |
|---|---|---|
| GET | `/classes/{id}/students` | `CLASS_VIEW` + `STUDENT_VIEW` |
| PUT | `/classes/{id}/students/{studentId}` | `CLASS_EDIT` |
| DELETE | `/classes/{id}/students/{studentId}` | `CLASS_EDIT` |

Ba API này bị chặn với lớp `DA_KET_THUC`, `DA_HUY`, `closeState='CLOSED'` (**409** `CLASS_NOT_EDITABLE`); vẫn xem được danh sách.

## 7. Trạng thái và nhãn hiển thị

### `status` (vòng đời lớp)

| Giá trị | Nhãn gợi ý | Cách chuyển |
|---|---|---|
| `CHUA_BAT_DAU` | Chưa bắt đầu | mặc định khi tạo |
| `DANG_DIEN_RA` | Đang diễn ra | tự động khi đến `startDate` |
| `DA_KET_THUC` | Đã kết thúc | tự động khi qua `endDate` |
| `DA_HUY` | Đã huỷ | API cancel |

Không chuyển ngược từ `DA_KET_THUC`/`DA_HUY`.

### `closeState` (nhãn đóng, độc lập với `status`)

| Giá trị | Nhãn gợi ý | Ý nghĩa |
|---|---|---|
| `NONE` | — | bình thường |
| `PENDING` | Chờ duyệt đóng | đã gửi yêu cầu, **vẫn sửa được** |
| `CLOSED` | Đã đóng | chỉ xem, chặn sửa/gán giáo viên/ghi danh |

Lớp có thể vừa `DANG_DIEN_RA` vừa `CLOSED`.

### Nhãn “Chưa có lớp”

`GET /teachers` trả sẵn `noClass` và `classLabel="Chưa có lớp"` khi `classCount=0`. Sau khi đổi giáo viên của lớp, gọi lại danh sách để nhãn cập nhật (server tính trực tiếp, không lưu).

## 8. Bảng mã lỗi

| HTTP | `code` | Ý nghĩa / khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | body không parse được, sai kiểu dữ liệu, tham số không hợp lệ |
| 400 | mã theo trường (vd `NAME_REQUIRED`, `CODE_TOO_LONG`, `VERSION_REQUIRED`) | thiếu/sai một trường cụ thể trong body; `message` giải thích trường đó |
| 400 | `INVALID_KEY` | message validate không map được sang mã lỗi (kèm `field: message`) |
| 400 | `MODULE_NOT_ENABLED` | module `STUDENT_MANAGEMENT` chưa bật cho tổ chức |
| 400 | `INVALID_POSITION` | không có chức vụ giáo viên |
| 400 | `INVALID_SPECIALTY` | chuyên môn không tồn tại/không hoạt động/khác tổ chức |
| 401 | `UNAUTHENTICATED` | thiếu/sai token |
| 403 | `FORBIDDEN` | thiếu quyền hoặc ngoài phòng ban |
| 403 | `SELF_APPROVAL_NOT_ALLOWED` | tự duyệt yêu cầu đóng của mình |
| 404 | `CLASS_NOT_FOUND` / `TEACHER_NOT_FOUND` / `STUDENT_NOT_FOUND` | không tồn tại hoặc khác tổ chức |
| 409 | `CONFLICT` | trùng mã lớp hoặc vi phạm ràng buộc dữ liệu |
| 409 | `EMAIL_EXISTS` / `SPECIALTY_EXISTS` | trùng email/chuyên môn trong tổ chức |
| 409 | `DATA_CHANGED` | sửa hồ sơ giáo viên với `version` cũ |
| 409 | `STATUS_CHANGED` | sửa/huỷ lớp với `version` cũ hoặc trạng thái vừa đổi |
| 409 | `CLOSE_STATE_CHANGED` | thao tác đóng/mở không đúng `closeState` hiện tại |
| 409 | `SPECIALTY_MISMATCH` | đổi chuyên môn làm mất khớp môn của lớp (danh sách ở `data.classes`) |
| 409 | `TEACHER_NOT_AVAILABLE` | giáo viên không `DANG_DAY` |
| 409 | `CLASS_NOT_ASSIGNABLE` | gán giáo viên cho lớp kết thúc/huỷ/đóng |
| 409 | `CLASS_NOT_EDITABLE` | sửa/ghi danh lớp kết thúc/huỷ/đóng |
| 409 | `CLASS_NOT_CANCELLABLE` | huỷ khi trạng thái/close state không cho phép |
| 409 | `CLASS_NOT_CLOSABLE` | yêu cầu đóng lớp `DA_HUY` |
| 409 | `CLASS_NOT_EMPTY` | xoá lớp còn học sinh |
| 409 | `STUDENT_ALREADY_IN_CLASS` | học sinh đã ở lớp khác |
| 409 | `TEACHER_ASSIGNMENT_MODULE_ACTIVE` | module phân công giáo viên Epic 12 đang bật |
| 503 | `IDENTITY_UNAVAILABLE` | không gọi được Identity khi kiểm tra module/quyền |
| 500 | `UNCATEGORIZED_EXCEPTION` | lỗi không mong đợi (message `Đã xảy ra lỗi hệ thống`) |

## 9. Luồng gợi ý cho frontend

1. **Tạo nhân sự:** chọn chức vụ → nếu chức vụ có `profile_type='TEACHER'` thì hiện khối giáo viên (mã nhân sự, họ tên, SĐT, chuyên môn, loại hợp đồng). Gửi kèm `teacherProfile`.
2. **Danh sách giáo viên:** hiển thị cột “Lớp đang phụ trách” từ `classCount`; bằng 0 thì hiện `classLabel` (“Chưa có lớp”).
3. **Sửa chuyên môn:** nếu nhận 409 `SPECIALTY_MISMATCH`, hiện danh sách lớp bị ảnh hưởng và hỏi xác nhận; gửi lại với `confirm=true`.
4. **Gán giáo viên:** combobox lấy từ `/teachers/assignable`; gửi `teacherId` + `version` hiện tại của lớp.
5. **Sửa/huỷ lớp:** luôn gửi `version` vừa đọc. Gặp 409 `STATUS_CHANGED`/`DATA_CHANGED` thì tải lại dữ liệu, không ghi đè.
6. **Đóng lớp:** hiện nút theo `closeState`:
   - `NONE` → “Yêu cầu đóng”
   - `PENDING` → “Duyệt” / “Từ chối” (ẩn nếu người dùng chính là người gửi)
   - `CLOSED` → “Mở lại”; toàn bộ form sửa/gán giáo viên chuyển sang chỉ xem
7. Lịch sử: `/status-logs` cho vòng đời trạng thái, `/close-events` cho quá trình đóng/mở.
