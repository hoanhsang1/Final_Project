# Phase 1 — REST API Contract

> Tài liệu thiết kế. Các endpoint **đã có** giữ nguyên hợp đồng hiện tại; endpoint mới là **đề xuất**.
> **Trạng thái quyết định:** `D-01`…`D-15` **đã được người dùng chốt**; xem sổ quyết định trong
> `subject-business-requirements.md`. Tài liệu này không thay đổi source hay database.
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
- Danh sách **có phân trang** dùng dạng `{ "items": [...], "total": 0, "page": 1, "size": 20 }`, `page` **1-based** (theo `SchoolClassRepository.list`). Áp cho lớp, curriculum; **không** áp cho `GET /subjects` (xem §1.4).
- `orgId` luôn lấy từ JWT, **không** nhận từ client.
- Thời gian ISO-8601 (`Instant`).

### 1.3. Quy ước quyền trong tài liệu

Ký hiệu `P(subject.manage)` = `hasRole('OWNER') or hasAuthority('subject.manage')`.
Mã có dấu ⚙ là **đề xuất**, **chưa có trong catalog thực tế**. D-14 đã chốt dùng
`curriculum.view`/`curriculum.manage` cho nhóm endpoint curriculum; người dùng tự thêm vào
`PermissionCatalog` + bundle + chức danh giáo vụ khi triển khai. Cho tới lúc đó, source vẫn chưa
có hai mã này — tài liệu không sửa catalog.

### 1.4. D-13 — Danh sách môn: ĐÃ CHỐT giữ mảng

**Trạng thái: CONFIRMED = A.** `GET /subjects` trả **mảng** `[SubjectResponse]`, không phân trang.

Căn cứ:

- `frontend/src/features/academic/api.ts`: `subjectsApi.list` khai báo `api.get<Subject[]>('/api/subjects')`
  ⇒ FE mong đợi mảng.
- `SubjectController.list` hiện trả `List<SubjectResponse>`.
- Yêu cầu: ưu tiên tương thích ngược, chọn **một** hợp đồng duy nhất.

Hệ quả: endpoint này **không** nhận `page`/`size`, **không** trả `{items,total,...}`. Nếu sau này cần
phân trang, đó là quyết định riêng (breaking change) kèm cập nhật FE.

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
| `isActive` | boolean | null | **Đề xuất (không bắt buộc)**: lọc true/false |

**Không có `page`/`size`** (D-13 = A, đã chốt).

Response (`200`):

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

`code` có thể là `null` với dữ liệu legacy. Lỗi: `400 VALIDATION_ERROR` (tham số sai kiểu),
`403 FORBIDDEN`.

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

`code` là **tuỳ chọn** (D-04); nếu gửi thì phải ≤ 50 và duy nhất trong tổ chức. Nếu bỏ trống,
bản ghi lưu `code = NULL` và vẫn hợp lệ (nhiều NULL cùng org được phép).

Validation: `name` required ≤ 200; `code` ≤ 50 (**không** required); `description` ≤ 500.

- 201 + `Location: /subjects/{id}` + `SubjectResponse`.
- 400: `NAME_REQUIRED`, `NAME_TOO_LONG`, `CODE_TOO_LONG`, `DESCRIPTION_TOO_LONG`.
- 409: `SUBJECT_CODE_EXISTS` (khi `code` có giá trị và trùng trong org) hoặc `CONFLICT`;
  trùng tên → `CONFLICT`.
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
- Chỉ là tiện ích cho FE; server vẫn phải pre-check + bắt `DuplicateKeyException`.

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
> **Quyền (D-14 đã chốt):** `curriculum.view` để đọc, `curriculum.manage` để ghi, scope
> **ORGANIZATION**, module guard `STUDENT_MANAGEMENT`. Giáo vụ được cấp qua **chức danh
> (position-based)**, không tự động gán cho mọi nhân viên. Hai mã này sẽ được người dùng thêm vào
> catalog khi triển khai; tài liệu **không** sửa catalog. Không trộn fallback `subject.view/manage`.

### 3.1. Tổng hợp

| Method | Service path | Gateway path | Quyền | Ghi chú |
|---|---|---|---|---|
| GET | `/curricula` | `/api/curricula` | `P(curriculum.view)` | `{items,total,page,size}` |
| POST | `/curricula` | `/api/curricula` | `P(curriculum.manage)` | 201 |
| GET | `/curricula/{id}` | `/api/curricula/{id}` | `P(curriculum.view)` | Kèm danh sách môn |
| PUT | `/curricula/{id}` | `/api/curricula/{id}` | `P(curriculum.manage)` | Body có `version` |
| PATCH | `/curricula/{id}/status` | `/api/curricula/{id}/status` | `P(curriculum.manage)` | `{active}` |
| GET | `/curricula/{id}/subjects` | `/api/curricula/{id}/subjects` | `P(curriculum.view)` | |
| POST | `/curricula/{id}/subjects` | `/api/curricula/{id}/subjects` | `P(curriculum.manage)` | Thêm 1 môn |
| PUT | `/curricula/{id}/subjects/{subjectId}` | `/api/curricula/{id}/subjects/{subjectId}` | `P(curriculum.manage)` | Sửa định nghĩa + tiên quyết |
| DELETE | `/curricula/{id}/subjects/{subjectId}` | `/api/curricula/{id}/subjects/{subjectId}` | `P(curriculum.manage)` | Xoá khỏi template |
| POST | `/curricula/{id}/clone` | `/api/curricula/{id}/clone` | `P(curriculum.manage)` | **Tuỳ chọn** |

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
      "requiredSessions": 60,
      "theorySessions": 45,
      "practiceSessions": 15,
      "sessionMinutes": 45,
      "prerequisiteSubjectIds": [],
      "required": true,
      "note": null
    },
    {
      "subjectId": "99999999-9999-4999-8999-999999999003",
      "subjectCode": "TIN",
      "subjectName": "Tin học",
      "sequenceNo": 2,
      "requiredSessions": 30,
      "theorySessions": 0,
      "practiceSessions": 30,
      "sessionMinutes": 90,
      "prerequisiteSubjectIds": [
        "99999999-9999-4999-8999-999999999001",
        "99999999-9999-4999-8999-999999999002"
      ],
      "required": true,
      "note": null
    }
  ],
  "createdAt": "2026-11-20T09:00:00Z",
  "updatedAt": null
}
```

- Không có `termNo` (không có mô hình học kỳ — D-02).
- `prerequisiteSubjectIds` là **mảng** (0..n), D-07.

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
**Đề xuất:** cho phép ngừng, trả kèm cảnh báo `classesUsingCurriculum`.

### 3.7. POST `/curricula/{id}/subjects`

```json
{
  "subjectId": "99999999-9999-4999-8999-999999999003",
  "sequenceNo": 3,
  "requiredSessions": 30,
  "theorySessions": 0,
  "practiceSessions": 30,
  "sessionMinutes": 90,
  "prerequisiteSubjectIds": [
    "99999999-9999-4999-8999-999999999001",
    "99999999-9999-4999-8999-999999999002"
  ],
  "required": true,
  "note": null
}
```

- 201 + `CurriculumSubjectResponse`.
- 400: `SUBJECT_INACTIVE` (môn đã ngừng), `SUBJECT_PREREQUISITE_CYCLE` (chu trình hoặc tự tiên
  quyết, kèm `path`), `PREREQUISITE_DUPLICATE` (mảng có phần tử trùng),
  `PREREQUISITE_IDS_TOO_MANY` (> 50), `VALIDATION_ERROR`/`SESSION_COUNT_INVALID`…
- 404: `SUBJECT_NOT_FOUND` (môn không có/khác org), `CURRICULUM_SUBJECT_NOT_FOUND` (tiên quyết
  không thuộc curriculum này).
- 409: `CURRICULUM_SUBJECT_DUPLICATE`, `CURRICULUM_SEQUENCE_DUPLICATE`.
- **Tiên quyết (D-07):**
  - `prerequisiteSubjectIds` là mảng **0..n**; mỗi phần tử phải là môn **đã có trong cùng
    curriculum**, khác `subjectId`, không trùng nhau.
  - Mọi phần tử hợp lệ được ghi thành các cạnh ở `curriculum_subject_prerequisite`.
  - Tự tiên quyết (`subjectId` nằm trong mảng) → 400 `SUBJECT_PREREQUISITE_CYCLE` với
    `path:[A,A]`.
  - Chu trình dài (A→B→A, A→B→C→A) kiểm bằng DFS ở service → 400 `SUBJECT_PREREQUISITE_CYCLE`.
  - Phase 1 **chỉ cảnh báo** khi môn tiên quyết chưa đạt; không chặn xếp lịch.

### 3.8. PUT `/curricula/{id}/subjects/{subjectId}`

Body như trên **không** có `subjectId`; có thể có `version` của curriculum.
Nếu `prerequisiteSubjectIds` được gửi, **thay toàn bộ** tập tiên quyết của môn (xoá cạnh cũ,
ghi cạnh mới) trong cùng transaction.

- 200 + `CurriculumSubjectResponse`; 404 `CURRICULUM_SUBJECT_NOT_FOUND`; 409 `DATA_CHANGED`.
- 400/404 tiên quyết như §3.7.

### 3.9. DELETE `/curricula/{id}/subjects/{subjectId}`

- 204 hoặc 200 + `{ "removed": true, "version": 4 }`.
- Service gỡ các cạnh tiên quyết liên quan trước khi xoá dòng.
- Nếu còn môn khác phụ thuộc và chưa xác nhận → 409 `CONFLICT` (FK RESTRICT bảo vệ).
- Không chặn bởi lớp đã snapshot.

### 3.10. POST `/curricula/{id}/clone` (tuỳ chọn)

```json
{ "code": "CT-K10-2027", "name": "Chương trình Khối 10 – 2027" }
```

Sao chép toàn bộ môn **và** cạnh tiên quyết (map subject id sang bản clone). 201 + curriculum mới.

---

## 4. Lớp – Môn (Class Subject)

> Đề xuất. Đọc: `class.view` (+ `subject.view`). Ghi: `class.edit` (phương án tối thiểu) hoặc
> ⚙`class.subject.manage`. Không thêm mã quyền mới cho đổi môn chính ở Phase 1.
> Mọi thao tác ghi đều kiểm trạng thái lớp và tăng `school_class.version`.
> Module guard `STUDENT_MANAGEMENT` (D-10).
>
> **D-08/D-15 (đã chốt):** `DANG_DIEN_RA` **không** đổi được curriculum/danh sách môn, nhưng **đổi
> được môn chính** qua §4.8 với ghi lịch sử. `DA_KET_THUC/DA_HUY/CLOSED` không dùng thao tác thường.

### 4.1. Tổng hợp

| Method | Service path | Gateway path | Quyền |
|---|---|---|---|
| GET | `/classes/{classId}/subjects` | `/api/classes/{classId}/subjects` | `class.view` |
| PUT | `/classes/{classId}/curriculum` | `/api/classes/{classId}/curriculum` | `class.edit` |
| POST | `/classes/{classId}/subjects` | `/api/classes/{classId}/subjects` | `class.edit` |
| PUT | `/classes/{classId}/subjects/{subjectId}` | `/api/classes/{classId}/subjects/{subjectId}` | `class.edit` |
| DELETE | `/classes/{classId}/subjects/{subjectId}` | `/api/classes/{classId}/subjects/{subjectId}` | `class.edit` |
| PUT | `/classes/{classId}/subjects/primary` | `/api/classes/{classId}/subjects/primary` | `class.edit` (endpoint **mới**, dùng quyền **đã có**, D-08/D-15) |
| GET | `/classes/{classId}/subject-history` | `/api/classes/{classId}/subject-history` | `class.view` (**mới**) |

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
      "sequenceNo": 1,
      "teacherId": "22222222-2222-4222-8222-222222222005",
      "teacherName": "Nguyễn Văn A",
      "requiredSessions": 60,
      "plannedSessions": 60,
      "theorySessions": 45,
      "practiceSessions": 15,
      "sessionMinutes": 45,
      "isPrimary": true,
      "status": "PLANNED",
      "note": null
    }
  ]
}
```

`isPrimary` là field **mới** (không phá FE). Khi `school_class.subject_id != NULL` phải có **đúng
một** phần tử `isPrimary=true` (bảo đảm bởi transaction/app; DB UNIQUE chỉ chặn nhiều hơn một); lớp
không có môn chính trả **không** phần tử `isPrimary=true`.
Lớp legacy **chưa có dòng `class_subject` nào**: trả 1 dòng suy từ `school_class.subject_id` với
`source=LEGACY`, `isPrimary=true`, có `subjectId/subjectName`, `sequenceNo=null`, các trường số
buổi/giáo viên lấy từ `school_class`. Nếu lớp đã có dòng `class_subject`, **không** trả thêm dòng
suy (tránh trùng); `teacherId` **không** fallback sang `school_class.teacher_id`.
Lỗi: 404 `CLASS_NOT_FOUND`; 403; 400 `MODULE_NOT_ENABLED`.

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
- `confirmReplace=true` bắt buộc nếu lớp đã có dòng `CURRICULUM` khác; nếu thiếu → 409 `CONFLICT`
  (dùng mã sẵn có, không thêm mã mới), message nêu rõ cần xác nhận thay thế.
- `keepManualSubjects=true` giữ dòng `MANUAL`; false xoá (cần xác nhận).
- 200 + response như 4.2 (version mới).
- 409: `CLASS_NOT_EDITABLE`, `DATA_CHANGED`, `CLASS_SUBJECT_LOCKED`, `CONFLICT` (thiếu `confirmReplace`).
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
- 409 `CLASS_SUBJECT_EXISTS`, `CLASS_NOT_EDITABLE`, `DATA_CHANGED`.
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
- **Không xoá `school_class.subject_id`.** D-15 **đã chốt**: không cho xoá dòng
  `class_subject.is_primary = 1` (và dòng `LEGACY` khớp `school_class.subject_id`) qua endpoint này
  → 409 `CLASS_SUBJECT_LEGACY_PROTECTED`. Muốn đổi môn chính dùng §4.8 (hoặc `PUT /classes/{classId}`
  có đổi `subjectId`, §4.7); service ghi history và đồng bộ trong một transaction.

### 4.7. PUT `/classes/{classId}` — đổi `subjectId` không được vòng qua history

Endpoint lớp hiện có (`SchoolClassController`) nhận `subjectId` trong body. D-15 yêu cầu:

- Nếu `subjectId` **không đổi** → hành vi hiện tại giữ nguyên.
- Nếu `subjectId` **thay đổi** → service **không** được chỉ `UPDATE school_class.subject_id`.
  Nó phải chạy **cùng luồng** với §4.8 (khoá lớp, ghi `class_subject_history`, đồng bộ
  `class_subject`), trong cùng transaction. Khi đó request **bắt buộc** có thêm:
  `reason` (≤ 500), `operationId`, và `version` (dùng làm `expectedVersion`, phải khớp
  `school_class.version`). Thiếu → 400; lệch version → 409 `DATA_CHANGED`; trùng `operationId` +
  payload khác → 409 `CLASS_SUBJECT_OPERATION_CONFLICT`. `changedBy` lấy từ JWT.
- Nếu lớp đã `DA_KET_THUC/DA_HUY/CLOSED` → 409 `CLASS_NOT_EDITABLE` như hiện tại, không ghi history.
- Response giữ nguyên `ClassResponse` hiện có (không thêm hợp đồng mới).

> Hệ quả bắt buộc khi code: `SchoolClassService.update` không được gọi thẳng
> `repository.save()` với `subjectId` mới; phải đi qua `PrimarySubjectChangeService` (tên do người
> dùng đặt) để tránh hai đường ghi lệch nhau.

### 4.8. PUT `/classes/{classId}/subjects/primary` (mới — D-08/D-15)

Request:

```json
{
  "subjectId": "99999999-9999-4999-8999-999999999002",
  "reason": "Điều chỉnh chuyên môn giữa kỳ",
  "expectedVersion": 4,
  "operationId": "6a0f0f1e-7a34-4b43-9b5f-1c5c1f7a9c11",
  "plannedSessions": 45,
  "sessionMinutes": 45
}
```

| Trường | Bắt buộc | Ghi chú |
|---|---|---|
| `subjectId` | **Có** | Môn mới; phải tồn tại, **active**, cùng org |
| `reason` | **Có** | 1..500 ký tự; thiếu → 400 `VALIDATION_ERROR`, > 500 → 400 `REASON_TOO_LONG` |
| `expectedVersion` | **Có** | Phải khớp `school_class.version`; lệch → 409 `DATA_CHANGED` |
| `operationId` | **Có** | UUID do client sinh, lưu vĩnh viễn trong history; UNIQUE `(org_id, operation_id)` |
| `plannedSessions`, `sessionMinutes` | Không | Chỉ dùng khi **tạo mới** dòng `class_subject`; bỏ qua nếu dòng đã tồn tại |

`changedBy` **không** nằm trong request — service lấy từ JWT.

**Điều kiện:** `class.edit` + module `STUDENT_MANAGEMENT`; lớp cùng org; trạng thái
`CHUA_BAT_DAU` hoặc `DANG_DIEN_RA`; `subjectId` khác môn chính hiện tại.

**Ngữ nghĩa (một transaction):**

0. Tra `operation_id`: nếu đã tồn tại trong `(org_id, operation_id)` → so payload chuẩn hoá. Giống →
   trả **kết quả cũ** (200, cùng `historyId`), **không** mở transaction mới. Khác → 409
   `CLASS_SUBJECT_OPERATION_CONFLICT`.
1. Khoá `school_class` (`SELECT … FOR UPDATE`).
2. Kiểm trạng thái + `expectedVersion` (bắt buộc) khớp `school_class.version`.
3. Ghi `class_subject_history` (snapshot môn cũ + mã/tên + `old_source`, `old_teacher_id`, môn mới
   + mã/tên + `new_source`, `changed_by`, `changed_at`, `reason`, `operationId`). Lớp **legacy chưa
   có** dòng `class_subject`: `old_subject_id` = `school_class.subject_id`; mã/tên đọc từ `subject`
   **tại thời điểm đổi**; `old_teacher_id` = `school_class.teacher_id`; `old_source='LEGACY'`.
   Dòng mới tạo có `new_source='MANUAL'`; dòng tái dùng giữ `source` hiện có. Không tạo history rỗng.
4. `school_class.subject_id = subjectId`; `version + 1`.
5. `class_subject`:
   - môn mới **đã có** trong lớp → chỉ `is_primary = 1` (giữ `teacher_id`, sessions hiện có);
   - chưa có → insert `source='MANUAL'`, `is_primary=1`, `teacher_id=NULL`, sessions theo request
     hoặc default của môn;
   - dòng primary cũ → `is_primary = 0` (**không xoá**).
6. Audit `CLASS_PRIMARY_SUBJECT_CHANGED`.

**Không làm:** không áp lại curriculum; không đổi môn khác; không chép giáo viên; không xoá history.

Response `200`:

```json
{
  "classId": "55555555-5555-4555-8555-555555555002",
  "primarySubjectId": "99999999-9999-4999-8999-999999999002",
  "version": 5,
  "historyId": "h0000000-0000-4000-8000-000000000001",
  "history": {
    "oldSubjectId": "99999999-9999-4999-8999-999999999001",
    "oldSubjectCode": "TOAN10",
    "oldSubjectName": "Toán 10",
    "oldTeacherId": "22222222-2222-4222-8222-222222222005",
    "oldSource": "CURRICULUM",
    "newSubjectId": "99999999-9999-4999-8999-999999999002",
    "newSubjectCode": "LY10",
    "newSubjectName": "Vật lý 10",
    "newSource": "CURRICULUM",
    "changedBy": "11111111-1111-4111-8111-111111111111",
    "changedAt": "2026-11-20T09:15:00Z",
    "reason": "Điều chỉnh chuyên môn giữa kỳ",
    "operationId": "6a0f0f1e-7a34-4b43-9b5f-1c5c1f7a9c11"
  },
  "teacherAssigned": false
}
```

`teacherAssigned=false` phản ánh D-08: giáo viên mới phải gán riêng.

**Lỗi:**

| HTTP | Mã | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Thiếu `subjectId`/`reason`/`expectedVersion`/`operationId`; `operationId` sai định dạng |
| 400 | `REASON_TOO_LONG` | `reason` > 500 ký tự |
| 400 | `SUBJECT_INACTIVE` | Môn đã ngừng |
| 403 | `FORBIDDEN` | Thiếu `class.edit` |
| 404 | `CLASS_NOT_FOUND` / `SUBJECT_NOT_FOUND` | Lớp khác org/không tồn tại; môn không tồn tại hoặc khác org |
| 409 | `CLASS_NOT_EDITABLE` | Lớp `DA_KET_THUC`/`DA_HUY`/`CLOSED` |
| 409 | `CLASS_SUBJECT_OPERATION_CONFLICT` | Cùng `operationId` + payload **khác**; hoặc vi phạm UNIQUE `primary_class_id` do đua đồng thời |
| 409 | `DATA_CHANGED` | `expectedVersion` lệch `school_class.version` (xung đột cập nhật đồng thời) |
| 400 | `MODULE_NOT_ENABLED` | Module tắt |

**Idempotency:**

- Cùng `operationId` + **cùng payload chuẩn hoá** (`subjectId`, `reason`, `plannedSessions`,
  `sessionMinutes`) → trả **200** với kết quả cũ (cùng `historyId`), **không** tạo history mới.
- Cùng `operationId` + payload **khác** → **409** `CLASS_SUBJECT_OPERATION_CONFLICT`.
- Transaction lỗi ở bất kỳ bước nào → rollback toàn bộ; **không** để history một phần, không để
  `school_class.subject_id` lệch primary.
- Retry sau khi transaction đã thành công → trả kết quả cũ, **không** sinh bản ghi thứ hai.

### 4.9. GET `/classes/{classId}/subject-history`

Query: `page` (mặc định 0), `size` (mặc định 20, tối đa 100). Sắp xếp `changed_at DESC`.

```json
{
  "items": [
    {
      "id": "h0000000-0000-4000-8000-000000000001",
      "classId": "55555555-5555-4555-8555-555555555002",
      "oldSubjectId": "99999999-9999-4999-8999-999999999001",
      "oldSubjectCode": "TOAN10",
      "oldSubjectName": "Toán 10",
      "oldTeacherId": "22222222-2222-4222-8222-222222222005",
      "oldSource": "CURRICULUM",
      "newSubjectId": "99999999-9999-4999-8999-999999999002",
      "newSubjectCode": "LY10",
      "newSubjectName": "Vật lý 10",
      "newSource": "CURRICULUM",
      "changedBy": "11111111-1111-4111-8111-111111111111",
      "changedAt": "2026-11-20T09:15:00Z",
      "reason": "Điều chỉnh chuyên môn giữa kỳ",
      "operationId": "6a0f0f1e-7a34-4b43-9b5f-1c5c1f7a9c11"
    }
  ],
  "total": 1,
  "page": 0,
  "size": 20
}
```

- Chỉ đọc; **không** có endpoint sửa/xoá history ở Phase 1.
- Trả snapshot đã lưu, **không** join lại `subject`/`staff_profile` để lấy tên hiện tại.
- 404 `CLASS_NOT_FOUND`; 403 `FORBIDDEN`; 400 `MODULE_NOT_ENABLED`.

### 4.10. `DELETE /classes/{classId}` (đã có) khi lớp đã có history

`class_subject_history` giữ lịch sử vĩnh viễn, nên **không** cho xoá cứng lớp đã có lịch sử:

- Nếu lớp **chưa có** dòng `class_subject_history` → giữ hành vi hiện tại (`204`, `class.delete`).
- Nếu lớp **đã có** → **409 `CONFLICT`** (2215) với message nêu rõ "lớp có lịch sử môn; dùng kết
  thúc/huỷ thay vì xoá". Không CASCADE history, không xoá history để xoá lớp.
- Lý do kỹ thuật: FK `fk_csh_class … ON DELETE RESTRICT`; nếu service không kiểm trước, DB ném lỗi
  FK và API trả 500 thay vì 409.
- Không thêm mã lỗi mới; dùng `CONFLICT` hiện có.

---

## 5. Chuyên môn giáo viên (Teacher – Subject)

> Đọc: `employee.view`; ghi: `employee.edit` (tối thiểu) hoặc ⚙`teacher.expertise.manage`.
> **Phase 1 KHÔNG có quy trình duyệt (D-06a đã chốt)** ⇒ **không có** endpoint approve/reject,
> không tạo `PENDING`, mọi dòng gán là `APPROVED`.

### 5.1. Tổng hợp

| Method | Service path | Gateway path | Quyền |
|---|---|---|---|
| GET | `/teachers/{staffId}/subjects` | `/api/teachers/{staffId}/subjects` | `employee.view` |
| POST | `/teachers/{staffId}/subjects` | `/api/teachers/{staffId}/subjects` | `employee.edit` |
| PUT | `/teachers/{staffId}/subjects` | `/api/teachers/{staffId}/subjects` | `employee.edit` |
| DELETE | `/teachers/{staffId}/subjects/{subjectId}` | `/api/teachers/{staffId}/subjects/{subjectId}` | `employee.edit` |
| GET | `/teachers/assignable?subjectId=` | `/api/teachers/assignable?subjectId=` | `class.assign_teacher` |
| GET | `/specialties/{id}/subjects` | `/api/specialties/{id}/subjects` | `employee.view` |
| PUT | `/specialties/{id}/subjects` | `/api/specialties/{id}/subjects` | `employee.edit` |

> **Không có** `POST .../approve` và `POST .../reject` trong hợp đồng Phase 1. Đây là quyết định
> cuối (D-06a), không phải "tạm hoãn".

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
      "source": "SPECIALTY"
    }
  ]
}
```

`version` là **`staff_profile.version`** (không phải `teacher_profile.version`) — đúng theo
`TeacherRepository.requireTeacher` (`SELECT sp.version`) và `TeacherService.update`
(`staff.updateDetails(..., request.version())`). Dùng version này cho PUT/DELETE.
`approvedBy/approvedAt` không trả ở Phase 1 vì không có duyệt.

### 5.3. POST `/teachers/{staffId}/subjects`

```json
{ "subjectId": "99999999-9999-4999-8999-999999999004", "source": "MANUAL" }
```

- 201 + item với `status=APPROVED`.
- 409 `TEACHER_SUBJECT_EXISTS`; 400 `SUBJECT_NOT_FOUND`/`SUBJECT_INACTIVE`;
  409 `TEACHER_NOT_AVAILABLE` (nghỉ việc).
- Không tạo `PENDING`.

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
- `version` là `staff_profile.version`.
- 409 `DATA_CHANGED`; 409 `TEACHER_SUBJECT_IN_USE` nếu thu hồi môn đang dạy và
  `confirmRevokeInUse=false` (trả danh sách lớp bị ảnh hưởng trong `data`).
- Không xoá dòng; đặt `REVOKED`.

### 5.5. Không có approve/reject

Không có endpoint approve/reject trong Phase 1 (D-06a chốt = không duyệt). Không tạo `PENDING`,
không có quyền `teacher.expertise.approve`. Nếu Phase 2 bật duyệt, đó là thiết kế riêng kèm
catalog quyền, endpoint, mã lỗi và test mới.

### 5.6. GET `/teachers/assignable?subjectId=`

Mở rộng endpoint hiện có. Response giữ shape `assignable` hiện tại; chỉ thêm điều kiện
`teacher_subject APPROVED`. Không trả giáo viên không chuyên môn/nghỉ việc/khác org.

### 5.7. GET/PUT `/specialties/{id}/subjects`

GET:

```json
{ "specialtyId": "8888…0001", "subjectIds": ["9999…9001", "9999…9004"] }
```

PUT: `{ "subjectIds": [...] }` thay toàn bộ. 400 `SUBJECT_NOT_FOUND`; 400 `SUBJECT_INACTIVE`
nếu môn inactive.

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
| 400 | `VALIDATION_ERROR`, `INVALID_KEY`, `NAME_REQUIRED`, `CODE_REQUIRED` (curriculum), `REASON_TOO_LONG`, `SUBJECT_INACTIVE`, `CURRICULUM_INACTIVE`, `SUBJECT_PREREQUISITE_CYCLE`, `PREREQUISITE_DUPLICATE`, `PREREQUISITE_IDS_TOO_MANY`, `SESSION_COUNT_INVALID`. `THEORY_PRACTICE_MISMATCH` chỉ là quy tắc kỹ thuật **tuỳ chọn** — D-03 không bắt buộc tổng LT+TH |
| 401 | `UNAUTHENTICATED` |
| 403 | `FORBIDDEN`. `SELF_APPROVAL_NOT_ALLOWED` (2209) thuộc luồng đóng lớp, **không** dùng cho chuyên môn |
| 404 | `SUBJECT_NOT_FOUND`, `CLASS_NOT_FOUND`, `CURRICULUM_NOT_FOUND`, `CURRICULUM_SUBJECT_NOT_FOUND` (gồm tiên quyết ngoài curriculum), `TEACHER_NOT_FOUND`, `TEACHER_SUBJECT_NOT_FOUND` |
| 409 | `CONFLICT`, `SUBJECT_CODE_EXISTS`, `CURRICULUM_CODE_EXISTS`, `CURRICULUM_SUBJECT_DUPLICATE`, `CURRICULUM_SEQUENCE_DUPLICATE`, `CLASS_SUBJECT_EXISTS`, `CLASS_SUBJECT_LEGACY_PROTECTED`, `CLASS_SUBJECT_OPERATION_CONFLICT`, `CLASS_NOT_EDITABLE`, `DATA_CHANGED`, `TEACHER_SUBJECT_EXISTS`, `TEACHER_SUBJECT_IN_USE`, `SUBJECT_MISMATCH`, `TEACHER_NOT_AVAILABLE` |
| 500 | `UNCATEGORIZED_EXCEPTION` |

`TEACHER_SUBJECT_NOT_PENDING` **không** thuộc Phase 1 (không có luồng duyệt).

Chi tiết từng mã: `validation-and-error-cases.md`.

---

## 8. Tương thích ngược

| Thay đổi | Ảnh hưởng FE | Cách giảm |
|---|---|---|
| Thêm `curriculumId` vào response lớp | Không phá (field mới) | FE bỏ qua nếu chưa dùng |
| Thêm endpoint `/classes/{id}/subjects` | Không phá | |
| `GET /subjects` giữ mảng (D-13) | **Không phá FE** | Không đổi gì |
| `code` môn **tuỳ chọn** (D-04) | **Không phá FE** | FE **không** đánh dấu required; server chỉ unique khi có giá trị |
| `teachesSubject` đổi sang ID | Không đổi API | Cần backfill trước khi bật |
| Áp module guard cho Subject/Curriculum (D-10) | Tổ chức tắt module sẽ 400 `MODULE_NOT_ENABLED` | Thông báo; kiểm module bật |
| Không có API approve/reject chuyên môn (D-06a) | Không ảnh hưởng FE hiện tại (chưa có màn duyệt) | Nếu FE đã lỡ dựng màn duyệt, gỡ bỏ |
| Trường `prerequisiteSubjectIds` thay `prerequisiteSubjectId` | Chỉ ảnh hưởng FE mới (endpoint mới) | Theo hợp đồng dưới đây |
| Không có `termNo` | Chỉ ảnh hưởng FE mới | Theo hợp đồng dưới đây |
| Thêm `isPrimary` vào `GET /classes/{id}/subjects` | Không phá (field mới) | FE cũ bỏ qua |
| `PUT /classes/{id}` đổi `subjectId` nay ghi history | Không đổi request/response | Hành vi mới đúng D-15; FE không cần sửa |
| Endpoint mới `PUT .../subjects/primary`, `GET .../subject-history` | Thuần bổ sung | FE dùng khi cần |
| Lớp `DANG_DIEN_RA` đổi môn chính **được phép** (trước đây chặn) | Nới điều kiện, không phá | FE có thể bỏ disable nút nếu đã khoá |

---

## 9. Quyết định đã chốt và câu hỏi kỹ thuật

**Đã chốt:** D-01…D-15 (xem `subject-business-requirements.md`). Trong đó:

- D-04: `code` môn tuỳ chọn, unique khi có giá trị.
- D-06a: không duyệt chuyên môn, không endpoint approve/reject.
- D-07: nhiều tiên quyết qua mảng `prerequisiteSubjectIds`.
- D-08: `CHUA_BAT_DAU` đổi tự do; `DANG_DIEN_RA` chỉ đổi **môn chính** kèm history.
- D-14: `curriculum.view`/`curriculum.manage` (ORGANIZATION, position-based cho giáo vụ).
- D-15: `is_primary` (DB bảo đảm **tối đa** một primary/lớp; tối thiểu do transaction/app),
  `class_subject_history`, chặn xoá dòng primary, đồng bộ `school_class.subject_id` trong một
  transaction.
- `reason`, `expectedVersion`, `operationId` là **bắt buộc** ở §4.8; `operationId` lưu **vĩnh viễn**
  ở Phase 1 (không job dọn).

Câu hỏi kỹ thuật còn lại:

1. Có cần `GET /subjects/{id}/usage` không (tiện cho FE trước khi ngừng môn)?
2. Có cần `POST /curricula/{id}/clone` ở Phase 1 không?
3. `PUT /classes/{id}/subjects` thay toàn bộ hay chỉ dùng các endpoint item?
4. Khi thay curriculum, mặc định `keepManualSubjects=true` — giữ nguyên?
5. Internal API nào cần mở ngay cho Phase 2 (chỉ thiết kế, chưa code)?
6. `GET /classes/{id}/subject-history` có cần lọc theo khoảng thời gian/actor không?
