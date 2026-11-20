# Phase 1 — Validation & Error Cases

> Tài liệu thiết kế. Mã lỗi **đã có** trích từ
> `backend/PeopleService/src/main/java/com/mems/exception/ErrorCode.java` tại HEAD `cdd03b8`.
> Mã **đề xuất** (223x, 304x) chưa tồn tại; người dùng tự thêm vào enum nếu chốt.
> Không sửa source trong tài liệu này.

---

## 1. Cơ chế lỗi hiện tại (không đổi)

`GlobalExceptionHandler` (PeopleService) trả `ApiResponse`:

```json
{ "success": false, "code": "<ERROR_CODE_NAME>", "message": "<mô tả>", "data": null }
```

| Nguồn | HTTP | `code` |
|---|---|---|
| `AppException(ErrorCode)` | theo `ErrorCode.status` | tên enum, ví dụ `SUBJECT_NOT_FOUND` |
| `@Valid` field error | 400 | `INVALID_KEY`, message ghép từ các field error |
| JSON không đọc được / vi phạm constraint | 400 | `VALIDATION_ERROR` |
| `AccessDeniedException` | 403 | `FORBIDDEN` |
| `DataIntegrityViolationException` | 409 | `CONFLICT` |
| Exception khác | 500 | `UNCATEGORIZED_EXCEPTION` |

DTO hiện dùng `message = "<ERROR_CODE_NAME>"` (ví dụ `@NotBlank(message = "NAME_REQUIRED")`),
nên FE nhận được tên mã trong message khi validate field.

**Lưu ý không nhất quán:** `ErrorCode.DESCRIPTION_TOO_LONG` ghi "at most 1000 characters"
nhưng `SubjectRequest.description` giới hạn 500. Đề xuất sửa message thành trung tính
("Description is too long") hoặc thống nhất 500 cho subject, 1000 cho curriculum.

---

## 2. Validation hiện có cho Subject

`SubjectRequest`:

| Trường | Ràng buộc | Mã |
|---|---|---|
| `code` | ≤ 50; hiện **không bắt buộc** | `CODE_TOO_LONG` (3004); nếu D-04 = bắt buộc thêm `CODE_REQUIRED` (3003) |
| `name` | `@NotBlank`, ≤ 200 | `NAME_REQUIRED` (3001), `NAME_TOO_LONG` (3002) |
| `description` | ≤ 500 | `DESCRIPTION_TOO_LONG` (3005) |

`SubjectStatusRequest`: `active` bắt buộc (boolean) — body thiếu/sai → `VALIDATION_ERROR`.

`SchoolClassRequest` (liên quan môn):

| Trường | Ràng buộc | Mã |
|---|---|---|
| `classCode` | `@NotBlank`, ≤ 100 | `CODE_REQUIRED`, `CODE_TOO_LONG` |
| `name` | `@NotBlank`, ≤ 200 | `NAME_REQUIRED`, `NAME_TOO_LONG` |
| `academicYear` | ≤ 50 | `ACADEMIC_YEAR_TOO_LONG` (3016) |
| `subjectId` | ≤ 36 | `ID_TOO_LONG` (3025) |
| `startDate/endDate` | `endDate >= startDate` | `VALIDATION_ERROR` |
| `status` | pattern `active|inactive|archived` | `STATUS_INVALID` (3015) — **lưu ý:** giá trị này không khớp trạng thái lớp thật (`CHUA_BAT_DAU`…); trường bị service bỏ qua khi tạo |

---

## 3. Validation đề xuất cho DTO mới

> Ghi dạng ràng buộc thiết kế, không phải code triển khai.

### 3.1. `CurriculumCreateRequest`

| Trường | Ràng buộc | Mã lỗi |
|---|---|---|
| `code` | `@NotBlank`, `@Size(max=50)`, trim, chuẩn hoá upper-case (đề xuất) | `CODE_REQUIRED`, `CODE_TOO_LONG` |
| `name` | `@NotBlank`, `@Size(max=200)` | `NAME_REQUIRED`, `NAME_TOO_LONG` |
| `description` | `@Size(max=1000)` | `DESCRIPTION_TOO_LONG` |
| `gradeLevel` | `@Size(max=50)` | `CODE_TOO_LONG` hoặc mã mới `GRADE_LEVEL_TOO_LONG` |
| `programCode` | `@Size(max=50)` | `CODE_TOO_LONG` |

### 3.2. `CurriculumUpdateRequest`

Như trên + `version` `@NotNull @PositiveOrZero` (`VERSION_REQUIRED` 3020, `VERSION_INVALID` 3021).

### 3.3. `CurriculumSubjectRequest` (thêm/sửa môn trong curriculum)

| Trường | Ràng buộc | Mã lỗi |
|---|---|---|
| `subjectId` | `@NotBlank`, `@Size(max=36)` (chỉ khi thêm) | `SUBJECT_ID_REQUIRED` (3045 đề xuất), `ID_TOO_LONG` |
| `sequenceNo` | `@NotNull @Min(1) @Max(1000)` | `SEQUENCE_INVALID` (3050 đề xuất) |
| `termNo` | `@Min(1) @Max(20)`, nullable | `TERM_INVALID` (3052 đề xuất) |
| `requiredSessions` | `@NotNull @Min(1) @Max(1000)` | `SESSION_COUNT_INVALID` (3047 đề xuất) |
| `theorySessions` | `@Min(0) @Max(1000)` | `SESSION_COUNT_INVALID` |
| `practiceSessions` | `@Min(0) @Max(1000)` | `SESSION_COUNT_INVALID` |
| `sessionMinutes` | `@NotNull @Min(1) @Max(600)` | `SESSION_MINUTES_INVALID` (3048 đề xuất) |
| `prerequisiteSubjectId` | `@Size(max=36)`, nullable, khác `subjectId` | `ID_TOO_LONG`, `SUBJECT_PREREQUISITE_CYCLE` |
| `required` | Boolean, mặc định true | — |
| `note` | `@Size(max=500)` | `NOTE_TOO_LONG` (3019) |

Kiểm ở service (không chỉ bean validation):

- `theorySessions + practiceSessions = requiredSessions` nếu chốt (D-03) →
  `THEORY_PRACTICE_MISMATCH` (3049 đề xuất).
- Tiên quyết tồn tại, active, cùng org, không tạo chu trình.
- Subject active, cùng org.

### 3.4. `ApplyCurriculumRequest`

| Trường | Ràng buộc | Mã |
|---|---|---|
| `curriculumId` | `@NotBlank @Size(max=36)` | `CURRICULUM_ID_REQUIRED` (3051 đề xuất), `ID_TOO_LONG` |
| `version` | `@NotNull @PositiveOrZero` | `VERSION_REQUIRED`, `VERSION_INVALID` |
| `confirmReplace` | boolean, mặc định false | — |
| `keepManualSubjects` | boolean, mặc định true | — |

### 3.5. `ClassSubjectRequest` (thêm/sửa)

| Trường | Ràng buộc | Mã |
|---|---|---|
| `subjectId` | `@NotBlank @Size(max=36)` (chỉ khi thêm) | `SUBJECT_ID_REQUIRED`, `ID_TOO_LONG` |
| `plannedSessions` | `@Min(1) @Max(1000)` | `SESSION_COUNT_INVALID` |
| `sessionMinutes` | `@Min(1) @Max(600)` | `SESSION_MINUTES_INVALID` |
| `teacherId` | `@Size(max=36)`, nullable | `ID_TOO_LONG` |
| `status` | pattern `PLANNED|ACTIVE|COMPLETED|CANCELLED` | `STATUS_INVALID` |
| `note` | `@Size(max=500)` | `NOTE_TOO_LONG` |
| `version` | `@NotNull @PositiveOrZero` | `VERSION_REQUIRED`, `VERSION_INVALID` |

### 3.6. `TeacherSubjectBulkRequest`

| Trường | Ràng buộc | Mã |
|---|---|---|
| `subjectIds` | `@NotEmpty @Size(max=50)`; mỗi phần tử `@NotBlank @Size(max=36)` | `SUBJECT_IDS_REQUIRED` (3043), `SUBJECT_IDS_TOO_MANY` (3044), `SUBJECT_ID_REQUIRED`, `ID_TOO_LONG` |
| `version` | `@NotNull @PositiveOrZero` (teacher_profile.version) | `VERSION_REQUIRED`, `VERSION_INVALID` |
| `confirmRevokeInUse` | boolean, mặc định false | — |

---

## 4. Danh mục mã lỗi

### 4.1. Mã đã có (dùng lại)

| Mã | Số | HTTP | Khi nào |
|---|---|---|---|
| `FORBIDDEN` | 1004 | 403 | Thiếu quyền |
| `UNAUTHENTICATED` | 1003 | 401 | Thiếu/sai JWT |
| `VALIDATION_ERROR` | 1002 | 400 | Body sai định dạng, ngày sai |
| `INVALID_KEY` | 1001 | 400 | Bean validation field |
| `MODULE_NOT_ENABLED` | 2106 | 400 | Module tổ chức tắt (nếu áp D-10) |
| `SUBJECT_NOT_FOUND` | 2218 | 404 | Môn không tồn tại/khác org |
| `SUBJECT_MISMATCH` | 2219 | 409 | Giáo viên không dạy môn của lớp |
| `TEACHER_NOT_AVAILABLE` | 2210 | 409 | Giáo viên không `DANG_DAY` |
| `TEACHER_NOT_FOUND` | 2301 | 404 | Giáo viên không tồn tại |
| `INVALID_SPECIALTY` | 2302 | 400 | Chuyên môn không hợp lệ |
| `SPECIALTY_EXISTS` | 2303 | 409 | Trùng tên chuyên môn |
| `SPECIALTY_MISMATCH` | 2304 | 409 | Chuyên môn lệch lớp đang dạy |
| `CLASS_NOT_FOUND` | 2201 | 404 | Lớp không tồn tại |
| `CLASS_NOT_EDITABLE` | 2205 | 409 | Lớp kết thúc/huỷ/đóng |
| `DATA_CHANGED` | 2212 | 409 | Version lệch (lớp) |
| `STATUS_CHANGED` | 2207 | 409 | Trạng thái lớp đổi do tác vụ khác |
| `CONFLICT` | 2215 | 409 | Trùng dữ liệu chung |
| `NAME_REQUIRED` | 3001 | 400 | Thiếu tên |
| `NAME_TOO_LONG` | 3002 | 400 | Tên quá dài |
| `CODE_REQUIRED` | 3003 | 400 | Thiếu mã |
| `CODE_TOO_LONG` | 3004 | 400 | Mã quá dài |
| `DESCRIPTION_TOO_LONG` | 3005 | 400 | Mô tả quá dài |
| `NOTE_TOO_LONG` | 3019 | 400 | Ghi chú quá dài |
| `VERSION_REQUIRED` | 3020 | 400 | Thiếu version |
| `VERSION_INVALID` | 3021 | 400 | Version âm |
| `ID_TOO_LONG` | 3025 | 400 | ID quá 36 ký tự |
| `STATUS_INVALID` | 3015 | 400 | Trạng thái không hợp lệ |

### 4.2. Mã đề xuất (chưa tồn tại)

| Mã | Số | HTTP | Khi nào |
|---|---|---|---|
| `SUBJECT_CODE_EXISTS` | 2222 | 409 | Trùng mã môn trong org |
| `SUBJECT_INACTIVE` | 2223 | 400 | Môn đã ngừng, không chọn được |
| `CURRICULUM_NOT_FOUND` | 2224 | 404 | Curriculum không tồn tại/khác org |
| `CURRICULUM_CODE_EXISTS` | 2225 | 409 | Trùng mã curriculum |
| `CURRICULUM_SUBJECT_NOT_FOUND` | 2226 | 404 | Môn không có trong curriculum |
| `CURRICULUM_SUBJECT_DUPLICATE` | 2227 | 409 | Môn đã có trong curriculum |
| `CURRICULUM_SEQUENCE_DUPLICATE` | 2228 | 409 | Trùng `sequenceNo` |
| `SUBJECT_PREREQUISITE_CYCLE` | 2229 | 400 | Tiên quyết tạo chu trình |
| `CLASS_SUBJECT_EXISTS` | 2230 | 409 | Lớp đã có môn |
| `CLASS_SUBJECT_NOT_FOUND` | 2231 | 404 | Lớp không có môn |
| `CLASS_SUBJECT_LOCKED` | 2232 | 409 | Lớp đã bắt đầu, không sửa danh sách môn |
| `TEACHER_SUBJECT_EXISTS` | 2233 | 409 | Giáo viên đã có môn |
| `TEACHER_SUBJECT_NOT_FOUND` | 2234 | 404 | Giáo viên chưa có môn |
| `TEACHER_SUBJECT_NOT_PENDING` | 2235 | 409 | Duyệt bản ghi không `PENDING` |
| `TEACHER_SUBJECT_IN_USE` | 2236 | 409 | Thu hồi môn đang dạy, chưa xác nhận |
| `CURRICULUM_INACTIVE` | 2237 | 400 | Curriculum đã ngừng |
| `CURRICULUM_IN_USE` | 2238 | 409 | Xoá curriculum đang được lớp dùng |
| `SUBJECT_IDS_REQUIRED` | 3043 | 400 | Danh sách môn rỗng |
| `SUBJECT_IDS_TOO_MANY` | 3044 | 400 | Quá 50 môn |
| `SUBJECT_ID_REQUIRED` | 3045 | 400 | Thiếu `subjectId` |
| `SESSION_COUNT_INVALID` | 3047 | 400 | Số buổi ≤ 0 hoặc > 1000 |
| `SESSION_MINUTES_INVALID` | 3048 | 400 | Thời lượng buổi ≤ 0 hoặc > 600 |
| `THEORY_PRACTICE_MISMATCH` | 3049 | 400 | LT + TH ≠ tổng (nếu chốt) |
| `SEQUENCE_INVALID` | 3050 | 400 | `sequenceNo` ngoài 1..1000 |
| `CURRICULUM_ID_REQUIRED` | 3051 | 400 | Thiếu `curriculumId` |
| `TERM_INVALID` | 3052 | 400 | `termNo` ngoài 1..20 |
| `SELF_APPROVAL_NOT_ALLOWED` | 2209 | 403 | (đã có) tự duyệt chuyên môn — dùng lại nếu áp |

> Số 223x/304x chỉ là đề xuất; người dùng kiểm tra không trùng trước khi thêm vào
> `ErrorCode.java`. Không tự sửa enum.

---

## 5. Kịch bản lỗi chi tiết

| ID | Kịch bản | HTTP | `code` | `data` (nếu có) | Test |
|---|---|---|---|---|---|
| E-01 | Tạo môn thiếu `name` | 400 | `INVALID_KEY` (message `NAME_REQUIRED`) | — | TC-SUB-002 |
| E-02 | Tạo môn `name` 201 ký tự | 400 | `INVALID_KEY` (`NAME_TOO_LONG`) | — | TC-SUB-003 |
| E-03 | Tạo môn trùng tên (khác dấu/hoa thường) | 409 | `CONFLICT` | — | TC-SUB-004 |
| E-04 | Tạo môn trùng mã (D-04 = UNIQUE) | 409 | `SUBJECT_CODE_EXISTS` | `{existingId}` | TC-SUB-005 |
| E-05 | Sửa môn org khác | 404 | `SUBJECT_NOT_FOUND` | — | TC-SUB-013 |
| E-06 | Chọn môn inactive cho lớp mới | 404 hiện tại / 400 đề xuất | `SUBJECT_NOT_FOUND` → `SUBJECT_INACTIVE` | — | TC-CLS-004 |
| E-07 | Ngừng môn đang dạy | 200 | — (audit `classesUsingSubject`) | — | TC-SUB-010 |
| E-08 | Tạo curriculum trùng code | 409 | `CURRICULUM_CODE_EXISTS` | — | TC-CUR-002 |
| E-09 | Thêm môn trùng trong curriculum | 409 | `CURRICULUM_SUBJECT_DUPLICATE` | `{subjectId}` | TC-CUR-005 |
| E-10 | Thêm môn trùng `sequenceNo` | 409 | `CURRICULUM_SEQUENCE_DUPLICATE` | `{sequenceNo}` | TC-CUR-006 |
| E-11 | Tiên quyết A→B→A | 400 | `SUBJECT_PREREQUISITE_CYCLE` | `{path:[A,B,A]}` | TC-CUR-007 |
| E-12 | Tổng buổi ≠ LT+TH | 400 | `THEORY_PRACTICE_MISMATCH` | — | TC-CUR-008 |
| E-13 | Áp curriculum cho lớp đang học | 409 | `CLASS_SUBJECT_LOCKED` (hoặc `CLASS_NOT_EDITABLE`) | — | TC-CLS-010 |
| E-14 | Áp curriculum khi version lệch | 409 | `DATA_CHANGED` | `{currentVersion}` | TC-CLS-011 |
| E-15 | Thêm môn đã có vào lớp | 409 | `CLASS_SUBJECT_EXISTS` | — | TC-CLS-013 |
| E-16 | Gán giáo viên không chuyên môn cho môn lớp | 409 | `SUBJECT_MISMATCH` | — | TC-CLS-014 |
| E-17 | Gán giáo viên `NGHI_VIEC` | 409 | `TEACHER_NOT_AVAILABLE` | — | TC-CLS-015 |
| E-18 | Giáo viên đã có môn | 409 | `TEACHER_SUBJECT_EXISTS` | — | TC-TCH-004 |
| E-19 | Duyệt bản ghi đã duyệt | 409 | `TEACHER_SUBJECT_NOT_PENDING` | — | TC-TCH-008 |
| E-20 | Thu hồi môn đang dạy, không xác nhận | 409 | `TEACHER_SUBJECT_IN_USE` | `{classes:[…]}` | TC-TCH-009 |
| E-21 | Người không có quyền gọi POST môn | 403 | `FORBIDDEN` | — | TC-RBAC-001 |
| E-22 | Module `STUDENT_MANAGEMENT` tắt (D-10) | 400 | `MODULE_NOT_ENABLED` | — | TC-RBAC-006 |
| E-23 | Token hết hạn | 401 | `UNAUTHENTICATED` | — | TC-SEC-001 |
| E-24 | DB lỗi khi đọc danh sách | 500 | `UNCATEGORIZED_EXCEPTION` | — | TC-SUB-016 |

Ví dụ body:

```json
{
  "success": false,
  "code": "CURRICULUM_SUBJECT_DUPLICATE",
  "message": "Môn đã có trong chương trình",
  "data": { "subjectId": "99999999-9999-4999-8999-999999999002" }
}
```

> `ApiResponse.failure(code, message)` hiện chỉ có 2 tham số (data = null). Muốn trả `data`,
> dùng overload 3 tham số — người dùng tự thêm ở handler/service nếu cần.

---

## 6. Kiểm tra đồng thời và tính toàn vẹn

### 6.1. Optimistic locking

| Thao tác | Version dùng | Khi lệch |
|---|---|---|
| Sửa curriculum | `curriculum.version` | 409 `DATA_CHANGED` |
| Sửa/xoá/thêm môn trong curriculum | `curriculum.version` | 409 `DATA_CHANGED` |
| Áp curriculum / sửa môn lớp | `school_class.version` | 409 `DATA_CHANGED` |
| Thay chuyên môn giáo viên | `teacher_profile.version` | 409 `DATA_CHANGED` |

Khuyến nghị dùng `UPDATE ... WHERE id=? AND org_id=? AND version=?` và kiểm số dòng = 1;
không đọc-rồi-ghi không khoá khi thao tác làm thay đổi nhiều dòng (`class_subject`).

### 6.2. Khoá

- Lớp: dùng `SELECT ... FOR UPDATE` như `SchoolClassRepository.require(id, orgId, true)` trước khi
  thay `class_subject` để tránh hai người áp curriculum cùng lúc.
- Curriculum: khoá dòng cha khi sửa `curriculum_subject`.
- Giáo viên: khoá `teacher_profile` khi thay toàn bộ `teacher_subject`.

### 6.3. Đua unique

| Tình huống | Cơ chế | Lỗi trả |
|---|---|---|
| Hai request tạo cùng mã môn | UNIQUE `(org_id, code)` | `SUBJECT_CODE_EXISTS` (bắt `DuplicateKeyException`) |
| Hai request tạo cùng tên môn | UNIQUE `(org_id, name_unaccented)` | `CONFLICT` |
| Hai request thêm cùng môn vào curriculum | PK `(curriculum_id, subject_id)` | `CURRICULUM_SUBJECT_DUPLICATE` |
| Hai request thêm cùng môn vào lớp | PK `(class_id, subject_id)` | `CLASS_SUBJECT_EXISTS` |
| Hai request gán cùng môn cho giáo viên | PK `(user_id, subject_id)` | `TEACHER_SUBJECT_EXISTS` |

Hiện `DataIntegrityViolationException` trả chung `CONFLICT`; đề xuất map theo tên constraint
giống `SubjectRepository.duplicateSubject` để trả mã cụ thể.

### 6.4. Trạng thái thay đổi giữa chừng

- Lớp tự chuyển `CHUA_BAT_DAU → DANG_DIEN_RA` bởi `@Scheduled`: thao tác sửa `class_subject`
  phải kiểm lại trạng thái **sau khi khoá**; nếu không còn `CHUA_BAT_DAU` → 409
  `CLASS_SUBJECT_LOCKED`.
- Môn bị ngừng giữa lúc áp curriculum: kiểm `subject.is_active` trong transaction; nếu đổi →
  400 `SUBJECT_INACTIVE`.
- Curriculum bị ngừng giữa lúc áp dụng: 400 `CURRICULUM_INACTIVE`.

---

## 7. Quy tắc validate theo endpoint

| Endpoint | Validate |
|---|---|
| `POST/PUT /subjects` | DTO + trùng mã/tên + org |
| `PATCH /subjects/{id}/status` | body boolean; tồn tại; org |
| `POST/PUT /curricula` | DTO + trùng code/tên + version |
| `POST /curricula/{id}/subjects` | DTO + subject active/org + trùng cặp/thứ tự + tiên quyết + LT/TH |
| `PUT /classes/{id}/curriculum` | lớp `CHUA_BAT_DAU` + curriculum active/org + version + confirm |
| `POST/PUT /classes/{id}/subjects` | lớp `CHUA_BAT_DAU` + subject active/org + teacher chuyên môn + version |
| `POST/PUT/DELETE /teachers/{id}/subjects` | teacher tồn tại/org + subject active/org + version + không tự duyệt |
| Internal | key + `orgId` khớp dữ liệu |

---

## 8. Acceptance Criteria (validation)

- AC-VAL-01: Mọi lỗi trả đúng `{success:false, code, message}`; không lộ stack trace.
- AC-VAL-02: Bean validation trả 400 với tên mã trong message; business rule trả mã riêng.
- AC-VAL-03: Version lệch trả 409 `DATA_CHANGED`, không ghi đè dữ liệu.
- AC-VAL-04: Tạo trùng mã/tên trả 409, không tạo bản ghi thứ hai.
- AC-VAL-05: Truy cập chéo org trả 404, không lộ tồn tại.
- AC-VAL-06: DB lỗi trả 500, không trả danh sách rỗng giả thành công.
- AC-VAL-07: Mã lỗi mới (nếu thêm) không trùng số với enum hiện có.

---

## 9. Câu hỏi mở

1. Có chấp nhận thêm các mã 2222–2238 và 3043–3052 không?
2. Có tách `SUBJECT_INACTIVE` khỏi `SUBJECT_NOT_FOUND` không?
3. `theory + practice = required` có bắt buộc không (D-03)?
4. `sessionMinutes` tối đa bao nhiêu là hợp lệ?
5. Có cần trả `data` chi tiết (danh sách lớp ảnh hưởng) trong lỗi 409 không?
6. Có áp `SELF_APPROVAL_NOT_ALLOWED` cho duyệt chuyên môn không?
