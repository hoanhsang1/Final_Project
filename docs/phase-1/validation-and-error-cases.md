# Phase 1 — Validation & Error Cases

> Tài liệu thiết kế. Mã lỗi **đã có** trích từ
> `backend/PeopleService/src/main/java/com/mems/exception/ErrorCode.java` tại HEAD `cdd03b8`.
> Mã **đề xuất** (223x, 304x) chưa tồn tại; người dùng tự thêm vào enum khi triển khai.
> **Trạng thái quyết định:** `D-01`…`D-15` **đã được người dùng chốt** (xem sổ quyết định trong
> `subject-business-requirements.md`). Tài liệu không sửa source hay database.

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
| `code` | ≤ 50; **tuỳ chọn** (D-04 đã chốt); nếu có giá trị thì duy nhất trong org | `CODE_TOO_LONG` (3004), 409 `SUBJECT_CODE_EXISTS` khi trùng |
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
| `requiredSessions` | `@NotNull @Min(1) @Max(1000)` | `SESSION_COUNT_INVALID` (3047 đề xuất) |
| `theorySessions` | `@Min(0) @Max(1000)` | `SESSION_COUNT_INVALID` |
| `practiceSessions` | `@Min(0) @Max(1000)` | `SESSION_COUNT_INVALID` |
| `sessionMinutes` | `@NotNull @Min(1) @Max(600)` | `SESSION_MINUTES_INVALID` (3048 đề xuất) |
| `prerequisiteSubjectIds` | `@Size(max=50)`, nullable/rỗng; mỗi phần tử `@NotBlank @Size(max=36)`; **không chứa `subjectId`**, không trùng phần tử (service kiểm) | `PREREQUISITE_IDS_TOO_MANY` (3052 đề xuất), `PREREQUISITE_DUPLICATE` (3053 đề xuất), `ID_TOO_LONG`, `SUBJECT_PREREQUISITE_CYCLE` (tự tiên quyết coi là chu trình `[A,A]`) |
| `required` | Boolean, mặc định true | — |
| `note` | `@Size(max=500)` | `NOTE_TOO_LONG` (3019) |

Kiểm ở service (không chỉ bean validation):

- `theorySessions + practiceSessions = requiredSessions` là quy tắc kỹ thuật **tuỳ chọn**;
  D-03 **không** chốt bắt buộc, nên không trả `THEORY_PRACTICE_MISMATCH` như lỗi mặc định.
  Nếu tổ chức muốn bật, đó là cấu hình riêng, không phải rule Phase 1.
- Mọi phần tử `prerequisiteSubjectIds` phải **là môn khác cùng curriculum** (không phải chỉ cùng
  org), khác `subjectId`, không trùng nhau, và không tạo chu trình.
  - Tự tiên quyết → 400 `SUBJECT_PREREQUISITE_CYCLE` (`path:[A,A]`).
  - Chu trình dài → 400 `SUBJECT_PREREQUISITE_CYCLE` (DFS ở service).
  - Phần tử trùng → 400 `PREREQUISITE_DUPLICATE`.
  - > 50 phần tử → 400 `PREREQUISITE_IDS_TOO_MANY`.
  - Tiên quyết trỏ ra ngoài curriculum → 404 `CURRICULUM_SUBJECT_NOT_FOUND`
    (FK tổ hợp tới `curriculum_subject(curriculum_id, subject_id, org_id)`; xem §6.5
    `database-schema.md`).
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
| `version` | `@NotNull @PositiveOrZero` (**`staff_profile.version`**, không phải `teacher_profile.version` — xem `api-contract.md` §5.2) | `VERSION_REQUIRED`, `VERSION_INVALID` |
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
| `SELF_APPROVAL_NOT_ALLOWED` | 2209 | 403 | Tự duyệt **yêu cầu đóng lớp** — không dùng cho chuyên môn giáo viên |

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
| `CLASS_SUBJECT_LEGACY_PROTECTED` | 2239 | 409 | Không xoá dòng `LEGACY` trùng `school_class.subject_id` (D-15 đã chốt) |
| `CLASS_SUBJECT_OPERATION_CONFLICT` | 2240 | 409 | Đổi môn chính vi phạm bất biến một-primary (đua/UNIQUE `primary_class_id`) hoặc `operationId` trùng nhưng khác nội dung |
| `TEACHER_SUBJECT_EXISTS` | 2233 | 409 | Giáo viên đã có môn |
| `TEACHER_SUBJECT_NOT_FOUND` | 2234 | 404 | Giáo viên chưa có môn |
| `TEACHER_SUBJECT_NOT_PENDING` | 2235 | 409 | **Không dùng ở Phase 1** (không có luồng duyệt — D-06a đã chốt). Chỉ khi Phase 2 bật duyệt |
| `TEACHER_SUBJECT_IN_USE` | 2236 | 409 | Thu hồi môn đang dạy, chưa xác nhận |
| `CURRICULUM_INACTIVE` | 2237 | 400 | Curriculum đã ngừng |
| `CURRICULUM_IN_USE` | 2238 | 409 | Xoá curriculum đang được lớp dùng — **chưa có API xoá curriculum ở Phase 1** (dùng ngừng) |
| `SUBJECT_IDS_REQUIRED` | 3043 | 400 | Danh sách môn rỗng |
| `SUBJECT_IDS_TOO_MANY` | 3044 | 400 | Quá 50 môn |
| `SUBJECT_ID_REQUIRED` | 3045 | 400 | Thiếu `subjectId` |
| `SESSION_COUNT_INVALID` | 3047 | 400 | Số buổi ≤ 0 hoặc > 1000 |
| `SESSION_MINUTES_INVALID` | 3048 | 400 | Thời lượng buổi ≤ 0 hoặc > 600 |
| `THEORY_PRACTICE_MISMATCH` | 3049 | 400 | LT + TH ≠ tổng — **quy tắc kỹ thuật tuỳ chọn**, D-03 không bắt buộc; mặc định không dùng |
| `SEQUENCE_INVALID` | 3050 | 400 | `sequenceNo` ngoài 1..1000 |
| `CURRICULUM_ID_REQUIRED` | 3051 | 400 | Thiếu `curriculumId` |
| `PREREQUISITE_IDS_TOO_MANY` | 3052 | 400 | `prerequisiteSubjectIds` quá 50 phần tử |
| `PREREQUISITE_DUPLICATE` | 3053 | 400 | `prerequisiteSubjectIds` có phần tử trùng |
| `REASON_TOO_LONG` | 3054 | 400 | `reason` khi đổi môn chính > 500 ký tự |

> Phase 2 nếu bật duyệt chuyên môn: **không** tái dùng `SELF_APPROVAL_NOT_ALLOWED` (mã 2209 gắn
> nghĩa đóng lớp); phải tạo mã riêng cho chuyên môn hoặc dùng `FORBIDDEN`. Phase 1 không có luồng này.

> Số 223x/304x chỉ là đề xuất; người dùng kiểm tra không trùng trước khi thêm vào
> `ErrorCode.java`. Không tự sửa enum.
> **Đã đối chiếu HEAD `cdd03b8`:** 22xx đang dùng đến `2221`, nên 2222–2240 trống; 30xx đang dùng
> đến `3042`, nên 3043–3054 trống. (`2220 CANCEL_STATE_CHANGED`, `2221 CLASS_APPROVER_NOT_ALLOWED`;
> `2240 CLASS_SUBJECT_OPERATION_CONFLICT` và `3054 REASON_TOO_LONG` là mã **mới** cho D-08/D-15.)
>
> **Phase 1 (D-06a đã chốt = không duyệt):** `TEACHER_SUBJECT_NOT_PENDING` **không** dùng.
> `SELF_APPROVAL_NOT_ALLOWED` (2209) **đã tồn tại** nhưng thuộc luồng đóng lớp, không dùng cho chuyên môn.
> `CLASS_SUBJECT_LEGACY_PROTECTED` **thuộc Phase 1** (D-15 đã chốt).

---

## 5. Kịch bản lỗi chi tiết

| ID | Kịch bản | HTTP | `code` | `data` (nếu có) | Test |
|---|---|---|---|---|---|
| E-01 | Tạo môn thiếu `name` | 400 | `INVALID_KEY` (message `NAME_REQUIRED`) | — | TC-SUB-002 |
| E-02 | Tạo môn `name` 201 ký tự | 400 | `INVALID_KEY` (`NAME_TOO_LONG`) | — | TC-SUB-003 |
| E-03 | Tạo môn trùng tên (khác dấu/hoa thường) | 409 | `CONFLICT` | — | TC-SUB-004 |
| E-04 | Tạo môn trùng mã (khi `code` có giá trị) | 409 | `SUBJECT_CODE_EXISTS` | `{existingId}` | TC-SUB-005 |
| E-05 | Sửa môn org khác | 404 | `SUBJECT_NOT_FOUND` | — | TC-SUB-013 |
| E-06 | Chọn môn inactive cho lớp mới | 404 hiện tại / 400 đề xuất | `SUBJECT_NOT_FOUND` → `SUBJECT_INACTIVE` | — | TC-CLS-004 |
| E-07 | Ngừng môn đang dạy | 200 | — (audit `classesUsingSubject`) | — | TC-SUB-010 |
| E-08 | Tạo curriculum trùng code | 409 | `CURRICULUM_CODE_EXISTS` | — | TC-CUR-002 |
| E-09 | Thêm môn trùng trong curriculum | 409 | `CURRICULUM_SUBJECT_DUPLICATE` | `{subjectId}` | TC-CUR-006 |
| E-10 | Thêm môn trùng `sequenceNo` | 409 | `CURRICULUM_SEQUENCE_DUPLICATE` | `{sequenceNo}` | TC-CUR-007 |
| E-11 | Tiên quyết A→B→A | 400 | `SUBJECT_PREREQUISITE_CYCLE` | `{path:[A,B,A]}` | TC-CUR-009 |
| E-12 | Tổng buổi ≠ LT+TH — **chỉ khi tổ chức bật quy tắc kỹ thuật tuỳ chọn** (D-03 không bắt buộc) | 400 | `THEORY_PRACTICE_MISMATCH` | — | TC-CUR-008 (tuỳ chọn) |
| E-13 | Áp curriculum cho lớp đang học | 409 | `CLASS_SUBJECT_LOCKED` (hoặc `CLASS_NOT_EDITABLE`) | — | TC-CLS-005 |
| E-14 | Áp curriculum khi version lệch | 409 | `DATA_CHANGED` | `{currentVersion}` | TC-CLS-006 |
| E-15 | Thêm môn đã có vào lớp | 409 | `CLASS_SUBJECT_EXISTS` | — | TC-CLS-010 |
| E-16 | Gán giáo viên không chuyên môn cho môn lớp | 409 | `SUBJECT_MISMATCH` | — | TC-CLS-014 |
| E-17 | Gán giáo viên `NGHI_VIEC` | 409 | `TEACHER_NOT_AVAILABLE` | — | TC-CLS-015 |
| E-18 | Giáo viên đã có môn | 409 | `TEACHER_SUBJECT_EXISTS` | — | TC-TCH-003 |
| E-19 | ~~Duyệt bản ghi~~ — **không tồn tại ở Phase 1** (D-06a = không duyệt) | — | — | — | (Phase 2) |
| E-20 | Thu hồi môn đang dạy, không xác nhận | 409 | `TEACHER_SUBJECT_IN_USE` | `{classes:[…]}` | TC-TCH-006 |
| E-21 | Người không có quyền gọi POST môn | 403 | `FORBIDDEN` | — | TC-RBAC-001 |
| E-22 | Module `STUDENT_MANAGEMENT` tắt (D-10) | 400 | `MODULE_NOT_ENABLED` | — | TC-RBAC-006 |
| E-23 | Token hết hạn | 401 | `UNAUTHENTICATED` | — | TC-SEC-001 |
| E-24 | DB lỗi khi đọc danh sách | 500 | `UNCATEGORIZED_EXCEPTION` | — | TC-SUB-016 |
| E-25 | `prerequisiteSubjectIds` chứa chính `subjectId` | 400 | `SUBJECT_PREREQUISITE_CYCLE` (`path:[A,A]`) | — | TC-CUR-010 |
| E-26 | Một phần tử tiên quyết là môn **không thuộc curriculum** (hoặc khác org) | 404 | `CURRICULUM_SUBJECT_NOT_FOUND` | — | TC-CUR-019 |
| E-27 | Xoá dòng `LEGACY` trùng `school_class.subject_id` qua API class-subject | 409 | `CLASS_SUBJECT_LEGACY_PROTECTED` | — | TC-CLS-019 |
| E-28 | `prerequisiteSubjectIds` có phần tử trùng | 400 | `PREREQUISITE_DUPLICATE` | `{duplicates:[…]}` | TC-CUR-022 |
| E-29 | `prerequisiteSubjectIds` quá 50 phần tử | 400 | `PREREQUISITE_IDS_TOO_MANY` | — | TC-CUR-023 |
| E-30 | Đổi môn chính khi lớp `DA_KET_THUC` | 409 | `CLASS_NOT_EDITABLE` | — | TC-CLS-023 |
| E-31 | Đổi môn chính sang môn inactive | 400 | `SUBJECT_INACTIVE` | — | TC-CLS-024 |
| E-32 | Đổi môn chính sang môn org khác | 404 | `SUBJECT_NOT_FOUND` | — | TC-CLS-033 |
| E-33 | `expectedVersion` lệch khi đổi môn chính | 409 | `DATA_CHANGED` | `{currentVersion}` | TC-CLS-031 |
| E-34 | Hai request đổi primary đồng thời → UNIQUE `primary_class_id` | 409 | `CLASS_SUBJECT_OPERATION_CONFLICT` | — | TC-CLS-032 |
| E-35 | `reason` 501 ký tự | 400 | `REASON_TOO_LONG` | — | TC-CLS-027 |
| E-36 | Xoá dòng primary qua `DELETE /classes/{id}/subjects/{subjectId}` | 409 | `CLASS_SUBJECT_LEGACY_PROTECTED` | — | TC-CLS-025 |
| E-37 | Ghi history lỗi (DB) → rollback cả `school_class`/`class_subject` | 500 | `UNCATEGORIZED_EXCEPTION` | — | TC-CLS-030 |
| E-38 | `PUT /classes/{id}` đổi `subjectId` nhưng bỏ qua history (giả lập code sai) | 200 | Có dòng `class_subject_history` + primary đồng bộ | — | TC-CLS-035 |
| E-39 | `DELETE /classes/{id}` khi lớp đã có `class_subject_history` | 409 | `CONFLICT` (2215, message "lớp có lịch sử môn") | — | TC-CLS-037 |
| E-40 | Đổi môn chính thiếu `reason`/`expectedVersion`/`operationId` | 400 | `VALIDATION_ERROR` | `{fields:[…]}` | TC-CLS-041 |
| E-41 | Cùng `operationId` nhưng payload chuẩn hoá khác | 409 | `CLASS_SUBJECT_OPERATION_CONFLICT` | — | TC-CLS-042 |
| E-42 | Retry cùng `operationId` + cùng payload sau khi thành công | 200 | Kết quả cũ, cùng `historyId` | — | TC-CLS-043 |
| E-43 | `PUT /classes/{id}` đổi `subjectId` nhưng thiếu `reason`/`operationId`/`version` | 400 | `VALIDATION_ERROR` | `{fields:[…]}` | TC-CLS-044 |

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
| Thay chuyên môn giáo viên | **`staff_profile.version`** | 409 `DATA_CHANGED` |
| Đổi môn chính (`PUT .../subjects/primary`) | `school_class.version` (`expectedVersion` **bắt buộc**) | 409 `DATA_CHANGED` |
| `PUT /classes/{id}` có đổi `subjectId` | `school_class.version` (`version` **bắt buộc** khi đổi) | 409 `DATA_CHANGED` |

Khuyến nghị dùng `UPDATE ... WHERE id=? AND org_id=? AND version=?` và kiểm số dòng = 1;
không đọc-rồi-ghi không khoá khi thao tác làm thay đổi nhiều dòng (`class_subject`).

### 6.2. Khoá

- Lớp: dùng `SELECT ... FOR UPDATE` như `SchoolClassRepository.require(id, orgId, true)` trước khi
  thay `class_subject` để tránh hai người áp curriculum cùng lúc.
- Curriculum: khoá dòng cha khi sửa `curriculum_subject`.
- Giáo viên: khoá `staff_profile` (không phải `teacher_profile`) khi thay toàn bộ `teacher_subject`,
  vì `version` của hồ sơ giáo viên nằm trên `staff_profile.version`.

### 6.3. Đua unique

| Tình huống | Cơ chế | Lỗi trả |
|---|---|---|
| Hai request tạo cùng mã môn (khi cả hai có `code` khác NULL) | UNIQUE `(org_id, code)` (D-04 đã chốt; NULL cho phép nhiều) | `SUBJECT_CODE_EXISTS` (bắt `DuplicateKeyException`) |
| Hai request tạo cùng tên môn | UNIQUE `(org_id, name_unaccented)` | `CONFLICT` |
| Hai request thêm cùng môn vào curriculum | PK `(curriculum_id, subject_id)` | `CURRICULUM_SUBJECT_DUPLICATE` |
| Hai request thêm cùng môn vào lớp | PK `(class_id, subject_id)` | `CLASS_SUBJECT_EXISTS` |
| Hai request thêm cùng cạnh tiên quyết | PK `(curriculum_id, subject_id, prerequisite_subject_id)` | `PREREQUISITE_DUPLICATE` (hoặc `CONFLICT` nếu không map constraint) |
| Hai request gán cùng môn cho giáo viên | PK `(user_id, subject_id)` | `TEACHER_SUBJECT_EXISTS` |
| Hai request đổi primary cùng lớp | UNIQUE `(primary_class_id)` + khoá `school_class` | `CLASS_SUBJECT_OPERATION_CONFLICT` hoặc `DATA_CHANGED` |
| Hai request cùng `operationId` | UNIQUE `(org_id, operation_id)` | Trả kết quả cũ (idempotent), không tạo history thứ hai |

Hiện `DataIntegrityViolationException` trả chung `CONFLICT`; đề xuất map theo tên constraint
giống `SubjectRepository.duplicateSubject` để trả mã cụ thể.

### 6.4. Trạng thái thay đổi giữa chừng

- Lớp tự chuyển `CHUA_BAT_DAU → DANG_DIEN_RA` bởi `@Scheduled`: thao tác sửa `class_subject`
  phải kiểm lại trạng thái **sau khi khoá**; nếu không còn `CHUA_BAT_DAU` → 409
  `CLASS_SUBJECT_LOCKED`. Riêng đổi môn chính vẫn hợp lệ ở `DANG_DIEN_RA`; phải kiểm lại trạng
  thái sau khoá để chắc lớp chưa chuyển `DA_KET_THUC`.
- Đổi môn chính phải ghi history và cập nhật `school_class`/`class_subject` **trong một transaction**;
  nếu bước sau fail, history cũng rollback (không có "history mồ côi").
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
| `POST /curricula/{id}/subjects` | DTO + subject active/org + trùng cặp/thứ tự + mảng tiên quyết (tồn tại trong curriculum, không tự trỏ, không trùng, không chu trình) |
| `PUT /classes/{id}/curriculum` | lớp `CHUA_BAT_DAU` + curriculum active/org + version + confirm |
| `POST/PUT /classes/{id}/subjects` | lớp `CHUA_BAT_DAU` + subject active/org + teacher chuyên môn + version |
| `PUT /classes/{id}/subjects/primary` | lớp `CHUA_BAT_DAU`/`DANG_DIEN_RA` + subject active/org + `reason` ≤ 500 + `expectedVersion` + `operationId` (idempotent) |
| `GET /classes/{id}/subject-history` | `page`/`size` hợp lệ; lớp cùng org |
| `POST/PUT/DELETE /teachers/{id}/subjects` | teacher tồn tại/org + subject active/org + version (`staff_profile.version`); Phase 1 không có bước duyệt |
| Internal | key + `orgId` khớp dữ liệu |

---

## 8. Acceptance Criteria (validation)

- AC-VAL-01: Mọi lỗi trả đúng `{success:false, code, message}`; không lộ stack trace.
- AC-VAL-02: Bean validation trả 400 với tên mã trong message; business rule trả mã riêng.
- AC-VAL-03: Version lệch trả 409 `DATA_CHANGED`, không ghi đè dữ liệu.
- AC-VAL-04: Tạo trùng mã/tên trả 409, không tạo bản ghi thứ hai; `code = NULL` nhiều bản ghi
  trong cùng org vẫn hợp lệ (D-04).
- AC-VAL-05: Truy cập chéo org trả 404, không lộ tồn tại.
- AC-VAL-06: DB lỗi trả 500, không trả danh sách rỗng giả thành công.
- AC-VAL-07: Mã lỗi mới (nếu thêm) không trùng số với enum hiện có.
- AC-VAL-08: Mọi phần tử `prerequisiteSubjectIds` không thuộc curriculum / tự trỏ / trùng / tạo
  chu trình bị chặn ở service (404/400), không ghi cạnh.
- AC-VAL-09: Lớp giữ dòng `LEGACY` khớp `school_class.subject_id`; xoá qua API class-subject trả
  409 `CLASS_SUBJECT_LEGACY_PROTECTED` (D-15 đã chốt).
- AC-VAL-10: Request không có trường học kỳ (`termNo`); nếu gửi trường lạ, bean validation bỏ qua
  hoặc `VALIDATION_ERROR` theo cấu hình Jackson — không có nhánh nghiệp vụ học kỳ.
- AC-VAL-11: Không áp đặt `theory + practice = required` như lỗi mặc định (D-03).
- AC-VAL-12: Đổi môn chính ở trạng thái không hợp lệ trả 409 `CLASS_NOT_EDITABLE`, không ghi history.
- AC-VAL-13: Lỗi giữa chừng khi đổi môn chính rollback **cả** history và cập nhật
  `school_class`/`class_subject`; không để dữ liệu nửa vời.
- AC-VAL-14: Retry cùng `operationId` không tạo history thứ hai và trả cùng `historyId`.
- AC-VAL-15: Không có endpoint/HTTP method nào sửa hoặc xoá `class_subject_history` ở Phase 1.
- AC-VAL-16: `DELETE /classes/{id}` khi lớp đã có history trả 409 `CONFLICT` (không phải 500 do FK).
- AC-VAL-17: Đổi môn chính thiếu `reason`/`expectedVersion`/`operationId` trả 400 `VALIDATION_ERROR`,
  không ghi history.
- AC-VAL-18: Cùng `operationId` + payload khác trả 409; cùng `operationId` + cùng payload trả kết quả
  cũ, không sinh history thứ hai.
- AC-VAL-19: `PUT /classes/{id}` đổi `subjectId` nhưng thiếu `reason`/`operationId`/`version` trả 400;
  có đủ thì đi qua luồng history, không bypass.
- AC-VAL-20: `school_class.subject_id = NULL` → không có primary; `subject_id != NULL` → đúng một
  primary khớp `subject_id`; DB UNIQUE chỉ chặn trường hợp nhiều hơn một.

---

## 9. Quyết định đã chốt và câu hỏi kỹ thuật

**Đã chốt:** D-01…D-15 (xem `subject-business-requirements.md`). Các điểm trực tiếp ảnh hưởng
tài liệu này:

- D-04: `code` môn tuỳ chọn; UNIQUE `(org_id, code)` khi có giá trị, NULL hợp lệ.
- D-06a: không duyệt chuyên môn; `TEACHER_SUBJECT_NOT_PENDING` không dùng ở Phase 1.
- D-07: nhiều tiên quyết qua mảng; thêm mã `PREREQUISITE_DUPLICATE` / `PREREQUISITE_IDS_TOO_MANY`.
- D-03: không bắt buộc `theory + practice = required`.
- D-15: `CLASS_SUBJECT_LEGACY_PROTECTED` thuộc Phase 1.
- D-08/D-15: đổi môn chính khi `DANG_DIEN_RA` hợp lệ nhưng bắt buộc ghi history; `reason`,
  `expectedVersion`, `operationId` là **bắt buộc**; mã mới `CLASS_SUBJECT_OPERATION_CONFLICT` (2240)
  và `REASON_TOO_LONG` (3054); thiếu trường bắt buộc dùng `VALIDATION_ERROR` hiện có.
- D-09: fallback `school_class.teacher_id` **chỉ** khi lớp chưa có bản ghi `class_subject` tương ứng.

Câu hỏi kỹ thuật còn lại:

1. Có tách `SUBJECT_INACTIVE` khỏi `SUBJECT_NOT_FOUND` không? (Đề xuất: có.)
2. `sessionMinutes` tối đa 600 có phù hợp thực tế trường không?
3. Có cần trả `data` chi tiết (danh sách lớp ảnh hưởng) trong lỗi 409 không?
4. Có cần `@JsonIgnoreProperties(ignoreUnknown=false)` để chặn trường `termNo` còn sót từ FE cũ?

Đã chốt (không còn mở): mã 2222–2240/3043–3054 được dùng cho thiết kế này; người dùng xác nhận
khi sửa `ErrorCode.java`. `operationId` lưu **vĩnh viễn** ở Phase 1 (không dọn).

---

## 10. Cổng dữ liệu trước migration (không phải lỗi HTTP)

Đây **không** phải mã lỗi API và **không** thêm vào `ErrorCode.java`; chúng là nhãn trong
`migrations/51_52_precheck.sql` (phần B) quyết định 52 có được chạy hay không.

| Nhãn | Trường hợp | Hành động |
|---|---|---|
| `AUTO_BACKFILL_CANDIDATE` | `INSERT_LEGACY_ROW`: lớp có `subject_id`, chưa có dòng khớp, chưa primary · `MARK_EXACT_PRIMARY`: đã có dòng khớp, chưa primary | Backfill tự động (5a/5b) |
| `MANUAL_REVIEW` | `PRIMARY_SUBJECT_MISMATCH`: primary khác `school_class.subject_id` · `PRIMARY_WITHOUT_CLASS_SUBJECT`: `subject_id NULL` mà có primary | Không tự sửa; người dùng quyết định trước/sau migration |
| `BLOCK_MIGRATION` | `CS_ORPHAN_SUBJECT` · `CS_ORG_MISMATCH` · `CLASS_ORPHAN_SUBJECT` · `MULTI_PRIMARY` | Dừng; sửa dữ liệu rồi chạy lại pre-check |
| `NO_ACTION` | Primary khớp chính xác, hoặc lớp không có môn | Không làm gì |

- Migration 52 gọi `mems_m52_assert_backfill_safe` (orphan/org) và
  `mems_m52_assert_no_duplicate_primary` trước/sau backfill; vi phạm → `SIGNAL 45000`, dừng script.
- Sau migration, `51_52_postcheck.sql` mục 7 phải trả `BLOCK_MIGRATION = 0`,
  `AUTO_BACKFILL_CANDIDATE = 0`; mọi dòng `MANUAL_REVIEW` phải khớp danh sách đã chấp nhận trước đó.
- Backfill **không** tạo primary khi `school_class.subject_id IS NULL`, **không** ghi đè primary đang
  mâu thuẫn, **không** tạo trùng `(class_id, subject_id)`.
- Phạm vi phân loại/backfill là lớp `deleted_at IS NULL`; lớp đã xoá mềm không bị sửa và không được
  post-check 7a/7c/7d/7e đánh giá.

