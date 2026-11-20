# Phase 1 — REST API Contract

> Tài liệu thiết kế. Các endpoint **đã có** giữ nguyên hợp đồng hiện tại; endpoint mới là **đề xuất**.
> Người dùng tự triển khai. Không có code nào bị thay đổi bởi tài liệu này.
> Quy ước lỗi/validation: `validation-and-error-cases.md`. Mã quyền: `role-permission-matrix.md`.

---

## 1. Quy ước chung

### 1.1. Đường dẫn

| Lớp | Tiền tố |
|---|---|
| Gateway (FE gọi) | `/api/...` (StripPrefix=1) |
| PeopleService (service gọi trực tiếp) | không `/api` |
| Internal (service-to-service) | `/internal/...`, header `X-Internal-Api-Key` |

Gateway hiện **chỉ** có route `/api/subjects/**`; không có `/subjects` trần. Các route mới cần
được thêm vào `APIGateway/src/main/resources/application.yml` (người dùng tự làm).

### 1.2. Định dạng response

- **Thành công:** trả **raw DTO** (theo `SubjectController`, `SchoolClassController`).
- **Lỗi:** `ApiResponse` từ `GlobalExceptionHandler`:
  ```json
  { "success": false, "code": "SUBJECT_NOT_FOUND", "message": "Subject not found", "data": null }
  ```
- Danh sách có phân trang (theo `SchoolClassRepository.list`): `{ "items": [...], "total": 0, "page": 1, "size": 20 }`, `page` **1-based**.
- `orgId` luôn lấy từ JWT, **không** nhận từ client.
- Thời gian ISO-8601 (`Instant`).

### 1.3. Quy ước quyền trong tài liệu

Ký hiệu `P(subject.manage)` = `hasRole('OWNER') or hasAuthority('subject.manage')`.
Các mã có dấu ⚙ là **đề xuất**, chưa có trong catalog. Phương án tối thiểu dùng quyền hiện có
được ghi trong ngoặc.

### 1.4. Quyết định API cần chốt

**D-13 — Danh sách môn có phân trang hay không?**

| Phương án | Hợp đồng | Ưu | Nhược |
|---|---|---|---|
| A. Giữ mảng (hiện tại) | `GET /subjects` → `[SubjectResponse]` | Không phá FE | Không có `total`; org lớn tải chậm |
| B. Chuyển sang `{items,total,page,size}` | Giống `/classes` | Nhất quán, mở rộng tốt | Breaking change FE |
| C. Thêm `GET /subjects/page` | Endpoint mới | Không phá | Hai endpoint trùng chức năng |

**Đề xuất:** B nếu FE được cập nhật cùng đợt; nếu không, A + lọc `isActive` (không phân trang).

**NEEDS_USER_DECISION (D-13).**

---

## 2. Subject (Môn học)

### 2.1. Tổng hợp endpoint

| Method | Service path | Gateway path | Quyền | Trạng thái |
|---|---|---|---|---|
| GET | `/subjects` | `/api/subjects` | READ (*) | Đã có |
| GET | `/subjects/{id}` | `/api/subjects/{id}` | READ (*) | Đã có |
| POST | `/subjects` | `/api/subjects` | `P(subject.manage)` | Đã có |
| PUT | `/subjects/{id}` | `/api/subjects/{id}` | `P(subject.manage)` | Đã có |
| PATCH | `/subjects/{id}/status` | `/api/subjects/{id}/status` | `P(subject.manage)` | Đã có |
| GET | `/subjects/check-code` | `/api/subjects/check-code` | `P(subject.manage)` | **Đề xuất** |
| GET | `/subjects/{id}/usage` | `/api/subjects/{id}/usage` | `P(subject.view)` | **Đề xuất** |

(*) READ hiện tại = `OWNER` hoặc một trong `subject.view`, `subject.manage`, `class.view`,
`class.create`, `student.view`, `class.assign_teacher`, `class.teacher.reassign`.

### 2.2. GET `/subjects`

Query:

| Tham số | Kiểu | Mặc định | Ghi chú |
|---|---|---|---|
| `q` | string | null | Tìm theo tên; đề xuất tìm cả `code` |
| `includeInactive` | boolean | false | Chỉ có hiệu lực với OWNER/`subject.manage` |
| `isActive` | boolean | null | **Đề xuất**: lọc true/false (thay `includeInactive`) |
| `page` | int | 1 | Chỉ khi D-13 = B |
| `size` | int | 20 (max 100) | Chỉ khi D-13 = B |

Response D-13 = A:

```json
[
  {
    "id": "99999999-9999-4999-8999-999999999001",
    "code": "TOAN",
    "name": "Toán",
    "description": null,
    "active": true,
    "createdAt": "2026-11-06T19:20:52.868Z",
    "updatedAt": null
  }
]
```

Response D-13 = B:

```json
{ "items": [ { "id": "...", "code": "TOAN", "name": "Toán", "active": true } ],
  "total": 12, "page": 1, "size": 20 }
```

Lỗi: `400 VALIDATION_ERROR` (page/size sai), `403 FORBIDDEN`.

### 2.3. GET `/subjects/{id}`

- 200: `SubjectResponse` (như trên).
- 404: `SUBJECT_NOT_FOUND` (kể cả ID thuộc org khác).

### 2.4. POST `/subjects`

Request:

```json
{
  "code": "TOAN10",
  "name": "Toán 10",
  "description": "Toán lớp 10 – chương trình chuẩn"
}
```

Validation: `name` required ≤ 200; `code` ≤ 50 (required nếu D-04 = C); `description` ≤ 500.

- 201 + `Location: /subjects/{id}` + `SubjectResponse`.
- 400: `NAME_REQUIRED`, `NAME_TOO_LONG`, `CODE_REQUIRED` (nếu bắt buộc), `CODE_TOO_LONG`,
  `DESCRIPTION_TOO_LONG`.
- 409: `SUBJECT_CODE_EXISTS` (đề xuất) hoặc `CONFLICT`; trùng tên → `CONFLICT`.
- 403: `FORBIDDEN`.

### 2.5. PUT `/subjects/{id}`

Request như POST. Không có `version` (hiện tại); nếu muốn optimistic lock, thêm `version` và
trả `409 DATA_CHANGED` (đề xuất, không bắt buộc Phase 1).

- 200 + `SubjectResponse`.
- 404 `SUBJECT_NOT_FOUND`; 409 `CONFLICT`/`SUBJECT_CODE_EXISTS`.

### 2.6. PATCH `/subjects/{id}/status`

Request:

```json
{ "active": false }
```

- 200 + `SubjectResponse`.
- 404 `SUBJECT_NOT_FOUND`; 400 `VALIDATION_ERROR` (body sai).
- Audit: `SUBJECT_STATUS_CHANGED` + `classesUsingSubject`.

### 2.7. GET `/subjects/check-code` (đề xuất)

Query: `code` (required), `excludeId` (optional).

```json
{ "code": "TOAN10", "available": false, "existingId": "a1b2…0001" }
```

- 200 luôn trả kết quả; 400 `CODE_REQUIRED` nếu thiếu `code`.
- Không kiểm quyền đọc dữ liệu môn khác org (chỉ so trong org của JWT).

### 2.8. GET `/subjects/{id}/usage` (đề xuất)

```json
{
  "subjectId": "9999…9001",
  "classesUsingSubject": 3,
  "classes": [
    { "classId": "5555…5001", "classCode": "C001", "name": "Lớp 10A", "status": "DANG_DIEN_RA" }
  ]
}
```

Dùng trước khi ngừng môn. 404 `SUBJECT_NOT_FOUND`.

---

## 3. Curriculum (Chương trình đào tạo)

> Toàn bộ endpoint dưới đây là **đề xuất**, chưa có trong source.
> Quyền: `curriculum.view/manage` (⚙ đề xuất) hoặc fallback `subject.view/manage`.

### 3.1. Tổng hợp

| Method | Service path | Gateway path | Quyền | Ghi chú |
|---|---|---|---|---|
| GET | `/curricula` | `/api/curricula` | `P(curriculum.view)` / `subject.view` | `{items,total,page,size}` |
| POST | `/curricula` | `/api/curricula` | `P(curriculum.manage)` / `subject.manage` | 201 |
| GET | `/curricula/{id}` | `/api/curricula/{id}` | view | Kèm danh sách môn |
| PUT | `/curricula/{id}` | `/api/curricula/{id}` | manage | Body có `version` |
| PATCH | `/curricula/{id}/status` | `/api/curricula/{id}/status` | manage | `{active}` |
| GET | `/curricula/{id}/subjects` | `/api/curricula/{id}/subjects` | view | |
| POST | `/curricula/{id}/subjects` | `/api/curricula/{id}/subjects` | manage | Thêm 1 môn |
| PUT | `/curricula/{id}/subjects/{subjectId}` | `/api/curricula/{id}/subjects/{subjectId}` | manage | Sửa định nghĩa |
| DELETE | `/curricula/{id}/subjects/{subjectId}` | `/api/curricula/{id}/subjects/{subjectId}` | manage | Xoá khỏi template |
| POST | `/curricula/{id}/clone` | `/api/curricula/{id}/clone` | manage | **Tuỳ chọn** |

### 3.2. Response `CurriculumResponse`

```json
{
  "id": "c0000000-0000-4000-8000-000000000001",
  "code": "CT-K10-2026",
  "name": "Chương trình Khối 10 – 2026",
  "description": null,
  "gradeLevel": "K10",
  "programCode": null,
  "active": true,
  "version": 3,
  "subjects": [
    {
      "subjectId": "99999999-9999-4999-8999-999999999001",
      "subjectCode": "TOAN",
      "subjectName": "Toán",
      "sequenceNo": 1,
      "termNo": 1,
      "requiredSessions": 60,
      "theorySessions": 45,
      "practiceSessions": 15,
      "sessionMinutes": 45,
      "prerequisiteSubjectId": null,
      "required": true,
      "note": null
    }
  ],
  "createdAt": "2026-11-20T09:00:00Z",
  "updatedAt": null
}
```

### 3.3. GET `/curricula`

Query: `q`, `isActive`, `page` (1-based), `size` (≤100).

Response: `{items:[CurriculumSummary], total, page, size}` với `CurriculumSummary` bỏ `subjects`.

### 3.4. POST `/curricula`

```json
{
  "code": "CT-K10-2026",
  "name": "Chương trình Khối 10 – 2026",
  "description": "Áp dụng từ năm học 2026-2027",
  "gradeLevel": "K10",
  "programCode": null
}
```

- 201 + `Location`.
- 400: `CODE_REQUIRED`, `NAME_REQUIRED`, `NAME_TOO_LONG`, `CODE_TOO_LONG`.
- 409: `CURRICULUM_CODE_EXISTS` (đề xuất), trùng tên → `CONFLICT`.

### 3.5. PUT `/curricula/{id}`

```json
{
  "code": "CT-K10-2026",
  "name": "Chương trình Khối 10 – 2026 (rev.2)",
  "description": null,
  "gradeLevel": "K10",
  "programCode": null,
  "version": 3
}
```

- 200 + `CurriculumResponse`.
- 409 `DATA_CHANGED` nếu `version` lệch; 404 `CURRICULUM_NOT_FOUND`.

### 3.6. PATCH `/curricula/{id}/status`

`{ "active": false }` → 200. Ngừng curriculum không ảnh hưởng lớp đã áp dụng.
Không cho ngừng nếu còn lớp `CHUA_BAT_DAU` tham chiếu? **Đề xuất:** cho phép, nhưng cảnh báo
`classesUsingCurriculum`.

### 3.7. POST `/curricula/{id}/subjects`

```json
{
  "subjectId": "99999999-9999-4999-8999-999999999002",
  "sequenceNo": 2,
  "termNo": 1,
  "requiredSessions": 45,
  "theorySessions": 30,
  "practiceSessions": 15,
  "sessionMinutes": 45,
  "prerequisiteSubjectId": "99999999-9999-4999-8999-999999999001",
  "required": true,
  "note": null
}
```

- 201 + `CurriculumSubjectResponse`.
- 400: `SUBJECT_NOT_FOUND` (môn không có/inactive — đề xuất tách `SUBJECT_INACTIVE`),
  `SUBJECT_PREREQUISITE_CYCLE`, `VALIDATION_ERROR` (số buổi ≤ 0…).
- 409: `CURRICULUM_SUBJECT_DUPLICATE`, `CURRICULUM_SEQUENCE_DUPLICATE`.

### 3.8. PUT `/curricula/{id}/subjects/{subjectId}`

Body như trên **không** có `subjectId`; có thể có `version` của curriculum.
- 200 + `CurriculumSubjectResponse`; 404 `CURRICULUM_SUBJECT_NOT_FOUND`; 409 `DATA_CHANGED`.

### 3.9. DELETE `/curricula/{id}/subjects/{subjectId}`

- 204 hoặc 200 + `{ "removed": true, "version": 4 }`.
- 404 nếu không có; không chặn bởi lớp đã snapshot.

### 3.10. POST `/curricula/{id}/clone` (tuỳ chọn)

```json
{ "code": "CT-K10-2027", "name": "Chương trình Khối 10 – 2027" }
```

Sao chép toàn bộ môn. 201 + curriculum mới. Nếu không cần, bỏ endpoint này.

---

## 4. Lớp – Môn (Class Subject)

> Đề xuất. Đọc: `class.view` (+ `subject.view`). Ghi: `class.edit` (phương án tối thiểu) hoặc
> ⚙`class.subject.manage`.
> Mọi thao tác ghi đều kiểm trạng thái lớp và tăng `school_class.version`.

### 4.1. Tổng hợp

| Method | Service path | Gateway path | Quyền |
|---|---|---|---|
| GET | `/classes/{classId}/subjects` | `/api/classes/{classId}/subjects` | `class.view` |
| PUT | `/classes/{classId}/curriculum` | `/api/classes/{classId}/curriculum` | `class.edit` |
| POST | `/classes/{classId}/subjects` | `/api/classes/{classId}/subjects` | `class.edit` |
| PUT | `/classes/{classId}/subjects/{subjectId}` | `/api/classes/{classId}/subjects/{subjectId}` | `class.edit` |
| DELETE | `/classes/{classId}/subjects/{subjectId}` | `/api/classes/{classId}/subjects/{subjectId}` | `class.edit` |

### 4.2. GET `/classes/{classId}/subjects`

```json
{
  "classId": "55555555-5555-4555-8555-555555555001",
  "curriculumId": "c0000000-0000-4000-8000-000000000001",
  "version": 5,
  "subjects": [
    {
      "subjectId": "99999999-9999-4999-8999-999999999001",
      "subjectCode": "TOAN",
      "subjectName": "Toán",
      "subjectActive": true,
      "source": "CURRICULUM",
      "teacherId": "22222222-2222-4222-8222-222222222005",
      "teacherName": "Nguyễn Văn A",
      "requiredSessions": 60,
      "plannedSessions": 60,
      "theorySessions": 45,
      "practiceSessions": 15,
      "sessionMinutes": 45,
      "status": "PLANNED",
      "note": null
    }
  ]
}
```

Lớp legacy chưa backfill: trả 1 dòng suy từ `school_class.subject_id` với `source=LEGACY`.
Lỗi: 404 `CLASS_NOT_FOUND`; 403; 400 `MODULE_NOT_ENABLED` (nếu áp guard).

### 4.3. PUT `/classes/{classId}/curriculum`

```json
{
  "curriculumId": "c0000000-0000-4000-8000-000000000001",
  "version": 5,
  "confirmReplace": true,
  "keepManualSubjects": true
}
```

- Điều kiện: lớp `CHUA_BAT_DAU`; curriculum active cùng org.
- `confirmReplace=true` bắt buộc nếu lớp đã có dòng `CURRICULUM` khác.
- `keepManualSubjects=true` giữ dòng `MANUAL`; false xoá (cần xác nhận).
- 200 + response như 4.2 (version mới).
- 409: `CLASS_NOT_EDITABLE`, `DATA_CHANGED`, `CLASS_SUBJECT_LOCKED` (đề xuất).
- 400: `CURRICULUM_NOT_FOUND`, `CURRICULUM_INACTIVE`.

### 4.4. POST `/classes/{classId}/subjects` (thêm thủ công)

```json
{
  "subjectId": "99999999-9999-4999-8999-999999999003",
  "plannedSessions": 30,
  "sessionMinutes": 90,
  "teacherId": "22222222-2222-4222-8222-222222222005",
  "version": 5,
  "note": "Bổ sung Tin học"
}
```

- 201 + response 4.2.
- 409 `CLASS_SUBJECT_EXISTS` (đề xuất), `CLASS_NOT_EDITABLE`, `DATA_CHANGED`.
- 400 `SUBJECT_NOT_FOUND`/`SUBJECT_INACTIVE`, `TEACHER_NOT_FOUND`, `SUBJECT_MISMATCH`
  (nếu gán `teacherId` mà không có chuyên môn).
- **Không** bắt buộc `teacherId`; nếu có, phải `DANG_DAY` + có `teacher_subject APPROVED`.

### 4.5. PUT `/classes/{classId}/subjects/{subjectId}`

Body:

```json
{
  "plannedSessions": 28,
  "sessionMinutes": 90,
  "teacherId": null,
  "status": "PLANNED",
  "note": "Giảm 2 buổi",
  "version": 6
}
```

- 200 + response 4.2.
- 409 `CLASS_NOT_EDITABLE`, `DATA_CHANGED`, `CLASS_SUBJECT_LOCKED`.
- 400 `SUBJECT_MISMATCH`, `TEACHER_NOT_AVAILABLE`.

### 4.6. DELETE `/classes/{classId}/subjects/{subjectId}`

- Chỉ lớp `CHUA_BAT_DAU`.
- 200 + response 4.2 (version mới) hoặc 204.
- 409 `CLASS_NOT_EDITABLE`, `CLASS_SUBJECT_LOCKED` nếu đã có buổi học (Phase 2 sẽ kiểm qua
  Schedule; Phase 1 dùng trạng thái lớp).
- Không xoá `school_class.subject_id` (legacy) — nếu xoá đúng môn chính, cần quyết định riêng.

---

## 5. Chuyên môn giáo viên (Teacher – Subject)

> Đọc: `employee.view`; ghi: `employee.edit` (tối thiểu) hoặc ⚙`teacher.expertise.manage`;
> duyệt: ⚙`teacher.expertise.approve`.

### 5.1. Tổng hợp

| Method | Service path | Gateway path | Quyền |
|---|---|---|---|
| GET | `/teachers/{staffId}/subjects` | `/api/teachers/{staffId}/subjects` | `employee.view` |
| POST | `/teachers/{staffId}/subjects` | `/api/teachers/{staffId}/subjects` | `employee.edit` |
| PUT | `/teachers/{staffId}/subjects` | `/api/teachers/{staffId}/subjects` | `employee.edit` |
| DELETE | `/teachers/{staffId}/subjects/{subjectId}` | `/api/teachers/{staffId}/subjects/{subjectId}` | `employee.edit` |
| POST | `/teachers/{staffId}/subjects/{subjectId}/approve` | `/api/teachers/{staffId}/subjects/{subjectId}/approve` | ⚙`teacher.expertise.approve` |
| POST | `/teachers/{staffId}/subjects/{subjectId}/reject` | `/api/teachers/{staffId}/subjects/{subjectId}/reject` | ⚙`teacher.expertise.approve` |
| GET | `/teachers/assignable?subjectId=` | `/api/teachers/assignable?subjectId=` | `class.assign_teacher` |
| GET | `/specialties/{id}/subjects` | `/api/specialties/{id}/subjects` | `employee.view` |
| PUT | `/specialties/{id}/subjects` | `/api/specialties/{id}/subjects` | `employee.edit` |

### 5.2. GET `/teachers/{staffId}/subjects`

```json
{
  "userId": "22222222-2222-4222-8222-222222222005",
  "version": 16,
  "items": [
    {
      "subjectId": "99999999-9999-4999-8999-999999999001",
      "subjectCode": "TOAN",
      "subjectName": "Toán",
      "status": "APPROVED",
      "source": "SPECIALTY",
      "approvedBy": null,
      "approvedAt": null
    }
  ]
}
```

`version` là `teacher_profile.version` để dùng cho thao tác ghi.

### 5.3. POST `/teachers/{staffId}/subjects`

```json
{ "subjectId": "99999999-9999-4999-8999-999999999004", "source": "MANUAL" }
```

- 201 + item.
- 409 `TEACHER_SUBJECT_EXISTS`; 400 `SUBJECT_NOT_FOUND`/`SUBJECT_INACTIVE`;
  409 `TEACHER_NOT_AVAILABLE` (nghỉ việc).
- Nếu bật duyệt: `status=PENDING`; ngược lại `APPROVED`.

### 5.4. PUT `/teachers/{staffId}/subjects` (thay toàn bộ)

```json
{
  "subjectIds": ["99999999-9999-4999-8999-999999999001",
                 "99999999-9999-4999-8999-999999999004"],
  "version": 16,
  "confirmRevokeInUse": false
}
```

- 200 + 5.2.
- 409 `DATA_CHANGED`; 409 `TEACHER_SUBJECT_IN_USE` nếu thu hồi môn đang dạy và
  `confirmRevokeInUse=false` (trả danh sách lớp bị ảnh hưởng trong `data`).
- Không xoá dòng; đặt `REVOKED`.

### 5.5. POST approve / reject

`approve` body `{ "note": "..." }` (tuỳ chọn); `reject` body `{ "reason": "..." }` bắt buộc.

- 200 + item với `status=APPROVED/REVOKED`.
- 409 `TEACHER_SUBJECT_NOT_PENDING`; 403 `SELF_APPROVAL_NOT_ALLOWED` (nếu áp).

### 5.6. GET `/teachers/assignable?subjectId=`

Mở rộng endpoint hiện có. Response giữ shape `assignable` hiện tại; chỉ thêm điều kiện
`teacher_subject APPROVED`. Không trả giáo viên không chuyên môn/nghỉ việc/khác org.

### 5.7. GET/PUT `/specialties/{id}/subjects`

GET:

```json
{ "specialtyId": "8888…0001", "subjectIds": ["9999…9001", "9999…9004"] }
```

PUT: `{ "subjectIds": [...] }` thay toàn bộ. 400 `SUBJECT_NOT_FOUND`; 409 nếu môn inactive.

---

## 6. Internal API (service-to-service)

Header bắt buộc: `X-Internal-Api-Key`. Không dùng JWT người dùng.

| Method | Path | Mục đích |
|---|---|---|
| GET | `/internal/subjects?orgId=&ids=` | Schedule/Facility tra tên/mã môn |
| GET | `/internal/classes/{classId}/subjects?orgId=` | Schedule lấy danh sách môn + số buổi |
| GET | `/internal/teachers?orgId=&subjectId=&departmentId=` | Lấy giáo viên đủ chuyên môn, đang dạy |
| GET | `/internal/curricula/{id}?orgId=` | Phase 2 lấy định nghĩa chương trình |
| GET | `/internal/specialties/{id}/subjects?orgId=` | Đồng bộ ánh xạ chuyên môn |

Ví dụ `/internal/classes/{classId}/subjects`:

```json
{
  "classId": "5555…5001",
  "orgId": "1111…1111",
  "curriculumId": "c000…0001",
  "subjects": [
    { "subjectId": "9999…9001", "subjectName": "Toán", "requiredSessions": 60,
      "plannedSessions": 60, "sessionMinutes": 45, "teacherId": "2222…0005" }
  ]
}
```

Lỗi: `401`/`403` nếu thiếu/sai key; 404 nếu lớp/org không khớp.

---

## 7. Bảng mã trạng thái & lỗi (tóm tắt)

| HTTP | Mã tiêu biểu |
|---|---|
| 200 | OK |
| 201 | Created (POST) |
| 204 | No Content (nếu dùng cho DELETE) |
| 400 | `VALIDATION_ERROR`, `INVALID_KEY`, `NAME_REQUIRED`, `CODE_REQUIRED`, `SUBJECT_INACTIVE`, `CURRICULUM_INACTIVE`, `SUBJECT_PREREQUISITE_CYCLE` |
| 401 | `UNAUTHENTICATED` |
| 403 | `FORBIDDEN`, `MODULE_NOT_ENABLED` (nếu guard), `SELF_APPROVAL_NOT_ALLOWED` |
| 404 | `SUBJECT_NOT_FOUND`, `CLASS_NOT_FOUND`, `CURRICULUM_NOT_FOUND`, `CURRICULUM_SUBJECT_NOT_FOUND`, `TEACHER_NOT_FOUND`, `TEACHER_SUBJECT_NOT_FOUND` |
| 409 | `CONFLICT`, `SUBJECT_CODE_EXISTS`, `CURRICULUM_CODE_EXISTS`, `CURRICULUM_SUBJECT_DUPLICATE`, `CURRICULUM_SEQUENCE_DUPLICATE`, `CLASS_SUBJECT_EXISTS`, `CLASS_NOT_EDITABLE`, `DATA_CHANGED`, `TEACHER_SUBJECT_EXISTS`, `TEACHER_SUBJECT_NOT_PENDING`, `TEACHER_SUBJECT_IN_USE`, `SUBJECT_MISMATCH`, `TEACHER_NOT_AVAILABLE` |
| 500 | `UNCATEGORIZED_EXCEPTION` |

Chi tiết từng mã: `validation-and-error-cases.md`.

---

## 8. Tương thích ngược

| Thay đổi | Ảnh hưởng FE | Cách giảm |
|---|---|---|
| Thêm `curriculumId` vào response lớp | Không phá (field mới) | FE bỏ qua nếu chưa dùng |
| Thêm endpoint `/classes/{id}/subjects` | Không phá | |
| Đổi `GET /subjects` sang phân trang (D-13) | **Phá** | Chỉ làm khi FE cập nhật; hoặc giữ A |
| Bắt buộc `code` (D-04) | **Phá** form tạo môn | Thông báo trước; FE đánh dấu required |
| `teachesSubject` đổi sang ID | Không đổi API | Cần backfill trước khi bật |
| Áp module guard cho Subject (D-10) | Tổ chức tắt module sẽ 403/400 | Thông báo; kiểm module bật |

---

## 9. Câu hỏi mở

1. D-13: giữ mảng hay chuyển phân trang?
2. Có cần `GET /subjects/{id}/usage` không?
3. Có cần clone curriculum không?
4. `PUT /classes/{id}/subjects` thay toàn bộ hay chỉ dùng các endpoint item?
5. Khi thay curriculum, mặc định giữ hay xoá môn `MANUAL`?
6. Có cần API approve/reject chuyên môn ngay Phase 1 không?
7. Internal API nào cần mở ngay cho Phase 2 (chỉ thiết kế, chưa code)?
